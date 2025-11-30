/**
 * System and Performance Monitoring
 */

import os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import Metrics from "./models/Metrics.js";

const execAsync = promisify(exec);

// System Monitoring
export class SystemMonitor {
  constructor(logger, interval = 60000) {
    this.logger = logger;
    this.interval = interval;
    this.timer = null;
    this.startTime = Date.now();
  }

  start() {
    this.timer = setInterval(() => this.collect(), this.interval);
  }

  async collect() {
    try {
      const metrics = {
        cpu: await this.getCPU(),
        memory: this.getMemory(),
        disk: await this.getDisk(),
        uptime: this.getUptime(),
      };

      this.logger.info("System metrics", {
        type: "system",
        system: metrics,
      });

      return metrics;
    } catch (error) {
      this.logger.error("System monitoring error", { error: error.message });
      return null;
    }
  }

  async getCPU() {
    return new Promise((resolve) => {
      const start = this.cpuAverage();
      setTimeout(() => {
        const end = this.cpuAverage();
        const idleDiff = end.idle - start.idle;
        const totalDiff = end.total - start.total;
        const usage = 100 - ~~((100 * idleDiff) / totalDiff);
        resolve({ usage, cores: os.cpus().length });
      }, 100);
    });
  }

  cpuAverage() {
    const cpus = os.cpus();
    let totalIdle = 0,
      totalTick = 0;

    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    return {
      idle: totalIdle / cpus.length,
      total: totalTick / cpus.length,
    };
  }

  getMemory() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    return {
      total: Math.round(total / 1024 / 1024),
      used: Math.round(used / 1024 / 1024),
      free: Math.round(free / 1024 / 1024),
      percentage: Math.round((used / total) * 100),
    };
  }

  async getDisk() {
    try {
      const { stdout } = await execAsync("df -k /");
      const lines = stdout.trim().split("\n");
      if (lines.length < 2) return null;

      const parts = lines[1].split(/\s+/);
      const total = parseInt(parts[1]) * 1024;
      const used = parseInt(parts[2]) * 1024;
      const free = parseInt(parts[3]) * 1024;

      return {
        total: Math.round(total / 1024 / 1024),
        used: Math.round(used / 1024 / 1024),
        free: Math.round(free / 1024 / 1024),
        percentage: Math.round((used / total) * 100),
      };
    } catch (error) {
      return null;
    }
  }

  getUptime() {
    return {
      system: Math.round(os.uptime()),
      process: Math.round((Date.now() - this.startTime) / 1000),
    };
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

// Performance Monitoring
export class PerformanceMonitor {
  constructor(logger) {
    this.logger = logger;
    this.metrics = new Map();
    this.globalMetrics = {
      totalRequests: 0,
      totalErrors: 0,
      totalDuration: 0,
      slowRequests: 0,
    };
    this.slowThreshold = 1000; // ms
    this.reportInterval = null;

    // Historical metrics storage
    this.historicalMetrics = [];
    this.maxHistoricalRecords = parseInt(
      process.env.METRICS_MAX_RECORDS || "1440"
    ); // 24 hours at 1-min intervals
    this.enablePersistence = process.env.ENABLE_METRICS_PERSISTENCE !== "false";

    // App info for metrics
    this.appInfo = {
      name: process.env.APP_NAME || "express-app",
      version: process.env.APP_VERSION || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      hostname: os.hostname(),
      pid: process.pid,
    };
  }

  start(interval = 60000) {
    this.reportInterval = setInterval(() => this.report(), interval);
  }

  recordRequest(req, res, duration) {
    const endpoint = this.normalizeEndpoint(req.path);
    const isError = res.statusCode >= 400;
    const isSlow = duration >= this.slowThreshold;

    // Global metrics
    this.globalMetrics.totalRequests++;
    this.globalMetrics.totalDuration += duration;
    if (isError) this.globalMetrics.totalErrors++;
    if (isSlow) this.globalMetrics.slowRequests++;

    // Endpoint metrics
    if (!this.metrics.has(endpoint)) {
      this.metrics.set(endpoint, {
        requestCount: 0,
        errorCount: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
      });
    }

    const endpointMetrics = this.metrics.get(endpoint);
    endpointMetrics.requestCount++;
    endpointMetrics.totalDuration += duration;
    endpointMetrics.minDuration = Math.min(
      endpointMetrics.minDuration,
      duration
    );
    endpointMetrics.maxDuration = Math.max(
      endpointMetrics.maxDuration,
      duration
    );
    if (isError) endpointMetrics.errorCount++;

    // Log slow requests
    if (isSlow) {
      this.logger.warn("Slow request detected", {
        type: "performance",
        correlationId: req.correlationId,
        request: { method: req.method, path: req.path },
        response: { statusCode: res.statusCode, duration },
      });
    }
  }

  normalizeEndpoint(path) {
    return path
      .replace(/\/\d+/g, "/:id")
      .replace(
        /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        "/:uuid"
      );
  }

  report() {
    if (this.globalMetrics.totalRequests === 0) return;

    const avgResponseTime =
      this.globalMetrics.totalDuration / this.globalMetrics.totalRequests;
    const errorRate =
      (this.globalMetrics.totalErrors / this.globalMetrics.totalRequests) * 100;

    // Create metrics snapshot
    const metricsSnapshot = {
      timestamp: new Date(),
      reportPeriod: "minute",
      global: {
        totalRequests: this.globalMetrics.totalRequests,
        totalErrors: this.globalMetrics.totalErrors,
        totalDuration: this.globalMetrics.totalDuration,
        avgResponseTime: Math.round(avgResponseTime),
        errorRate: Math.round(errorRate * 100) / 100,
        slowRequests: this.globalMetrics.slowRequests,
      },
      endpoints: Array.from(this.metrics.entries()).map(
        ([endpoint, metrics]) => ({
          endpoint,
          requestCount: metrics.requestCount,
          errorCount: metrics.errorCount,
          totalDuration: metrics.totalDuration,
          minDuration: metrics.minDuration,
          maxDuration: metrics.maxDuration,
          avgResponseTime: Math.round(
            metrics.totalDuration / metrics.requestCount
          ),
          errorRate:
            Math.round((metrics.errorCount / metrics.requestCount) * 10000) /
            100,
        })
      ),
      app: this.appInfo,
    };

    // Log metrics
    this.logger.info("Performance metrics", {
      type: "performance",
      performance: metricsSnapshot.global,
    });

    // Store in memory for historical access
    this.historicalMetrics.push(metricsSnapshot);
    if (this.historicalMetrics.length > this.maxHistoricalRecords) {
      this.historicalMetrics.shift();
    }

    // Persist to database if enabled
    if (this.enablePersistence) {
      this.persistMetrics(metricsSnapshot).catch((error) => {
        this.logger.error("Failed to persist metrics", {
          error: error.message,
        });
      });
    }

    // Reset for next cycle
    this.globalMetrics = {
      totalRequests: 0,
      totalErrors: 0,
      totalDuration: 0,
      slowRequests: 0,
    };
    this.metrics.clear();
  }

  async persistMetrics(metricsSnapshot) {
    try {
      await Metrics.saveMetrics(metricsSnapshot);
    } catch (error) {
      console.error("Failed to save metrics to database:", error.message);
    }
  }

  getMetrics() {
    return {
      global: this.globalMetrics,
      endpoints: Array.from(this.metrics.entries()).map(
        ([endpoint, metrics]) => ({
          endpoint,
          ...metrics,
          avgResponseTime: Math.round(
            metrics.totalDuration / metrics.requestCount
          ),
        })
      ),
    };
  }

  getHistoricalMetrics(limit = 60) {
    return this.historicalMetrics.slice(-limit);
  }

  getMetricsTrend(hours = 1) {
    const now = Date.now();
    const timeWindow = hours * 60 * 60 * 1000;
    const filtered = this.historicalMetrics.filter(
      (m) => now - new Date(m.timestamp).getTime() <= timeWindow
    );

    if (filtered.length === 0) return null;

    const avgResponseTimes = filtered.map((m) => m.global.avgResponseTime);
    const errorRates = filtered.map((m) => m.global.errorRate);
    const requestCounts = filtered.map((m) => m.global.totalRequests);

    return {
      period: `${hours} hour(s)`,
      samples: filtered.length,
      avgResponseTime: {
        min: Math.min(...avgResponseTimes),
        max: Math.max(...avgResponseTimes),
        avg: Math.round(
          avgResponseTimes.reduce((a, b) => a + b, 0) / avgResponseTimes.length
        ),
      },
      errorRate: {
        min: Math.min(...errorRates),
        max: Math.max(...errorRates),
        avg:
          Math.round(
            (errorRates.reduce((a, b) => a + b, 0) / errorRates.length) * 100
          ) / 100,
      },
      totalRequests: requestCounts.reduce((a, b) => a + b, 0),
    };
  }

  stop() {
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
      this.report();
      this.reportInterval = null;
    }
  }
}
