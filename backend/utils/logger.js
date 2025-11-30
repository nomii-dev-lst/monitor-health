/**
 * Production Logger with All Features
 * - File rotation (size & time-based)
 * - Database persistence (MongoDB)
 * - System monitoring (CPU, memory, disk, uptime)
 * - Performance monitoring (response times, error rates)
 * - Correlation IDs
 * - Request/Error logging middleware
 */

import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import os from "os";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import {
  connectDatabase,
  DatabaseTransport,
  getDatabaseStatus,
} from "./logger/database.js";
import { SystemMonitor, PerformanceMonitor } from "./logger/monitoring.js";
import {
  requestLogger,
  errorLogger,
  notFoundHandler,
  errorHandler,
} from "./logger/middleware.js";
import Log from "./logger/models/Log.js";
import Metrics from "./logger/models/Metrics.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const config = {
  logLevel: process.env.LOG_LEVEL || "info",
  logDir: path.join(__dirname, "../logs"),
  database: {
    enabled: process.env.ENABLE_DB_LOGGING !== "false",
    uri: process.env.MONGODB_URI || "mongodb://localhost:27017/app-logs",
  },
  monitoring: {
    system: process.env.ENABLE_SYSTEM_MONITORING !== "false",
    performance: process.env.ENABLE_PERFORMANCE_MONITORING !== "false",
    interval: parseInt(process.env.MONITOR_INTERVAL || "60000"),
  },
  app: {
    name: process.env.APP_NAME || "express-app",
    version: process.env.APP_VERSION || "1.0.0",
    environment: process.env.NODE_ENV || "development",
    hostname: os.hostname(),
    pid: process.pid,
  },
};

// Custom log levels
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    trace: 4,
  },
};

// Log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const color =
      {
        error: "\x1b[31m",
        warn: "\x1b[33m",
        info: "\x1b[36m",
        debug: "\x1b[90m",
        trace: "\x1b[35m",
      }[level] || "";
    const reset = "\x1b[0m";

    let log = `${timestamp} ${color}[${level.toUpperCase()}]${reset}: ${message}`;

    const metaKeys = Object.keys(meta).filter(
      (k) =>
        !["app", "splat", "timestamp", "level", "message"].includes(k) &&
        !k.startsWith("Symbol(")
    );

    if (metaKeys.length > 0) {
      const cleanMeta = {};
      metaKeys.forEach((k) => (cleanMeta[k] = meta[k]));
      log += ` ${JSON.stringify(cleanMeta)}`;
    }

    return log;
  })
);

// Create transports
const consoleTransport = new winston.transports.Console({
  format: logFormat,
});

const appFileTransport = new DailyRotateFile({
  filename: path.join(config.logDir, "app-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  maxSize: "20m",
  maxFiles: "14d",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  options: { flags: "a" },
});

const errorFileTransport = new winston.transports.File({
  filename: path.join(
    config.logDir,
    `error-${new Date().toISOString().split("T")[0]}.log`
  ),
  level: "error",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
});

// Add error handlers to prevent crashes
[consoleTransport, appFileTransport, errorFileTransport].forEach(
  (transport) => {
    transport.on("error", (error) => {
      console.error("Transport error (non-fatal):", error.message);
    });
  }
);

const transports = [consoleTransport, appFileTransport, errorFileTransport];

// Create logger
const logger = winston.createLogger({
  level: config.logLevel,
  levels: customLevels.levels,
  format: winston.format.json(),
  defaultMeta: { app: config.app },
  transports,
  exitOnError: false,
});

// Ensure log directory exists
if (!fs.existsSync(config.logDir)) {
  fs.mkdirSync(config.logDir, { recursive: true });
}

// Process-level error handlers
process.on("uncaughtException", (error) => {
  const logEntry = {
    level: "error",
    message: `uncaughtException: ${error.message}`,
    timestamp: new Date().toISOString(),
    exception: true,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    app: config.app,
  };

  try {
    const logLine = JSON.stringify(logEntry) + "\n";
    fs.appendFileSync(path.join(config.logDir, "exceptions.log"), logLine);
  } catch (fsError) {
    console.error("Failed to write to exceptions.log:", fsError.message);
  }

  try {
    logger.error("Uncaught Exception", logEntry);
  } catch (logError) {
    console.error("Failed to log through winston:", logError.message);
  }
});

process.on("unhandledRejection", (reason, promise) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));

  const logEntry = {
    level: "error",
    message: `unhandledRejection: ${error.message}`,
    timestamp: new Date().toISOString(),
    rejection: true,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    promise: promise.toString(),
    app: config.app,
  };

  try {
    const logLine = JSON.stringify(logEntry) + "\n";
    fs.appendFileSync(path.join(config.logDir, "rejections.log"), logLine);
  } catch (fsError) {
    console.error("Failed to write to rejections.log:", fsError.message);
  }

  try {
    logger.error("Unhandled Rejection", logEntry);
  } catch (logError) {
    console.error("Failed to log through winston:", logError.message);
  }
});

// Monitoring instances
let systemMonitor = null;
let performanceMonitor = null;
let dbTransport = null;

// Initialize function
export async function initLogger(app) {
  try {
    // Connect to database
    if (config.database.enabled) {
      const connected = await connectDatabase(config.database.uri);
      if (connected) {
        dbTransport = new DatabaseTransport({
          level: config.logLevel,
          batchSize: 100,
          batchInterval: 5000,
        });

        dbTransport.on("error", (error) => {
          logger.error("Database transport error", { error: error.message });
        });

        logger.add(dbTransport);
      }
    }

    // Start system monitoring
    if (config.monitoring.system) {
      systemMonitor = new SystemMonitor(logger, config.monitoring.interval);
      systemMonitor.start();
    }

    // Start performance monitoring
    if (config.monitoring.performance) {
      performanceMonitor = new PerformanceMonitor(logger);
      performanceMonitor.start(config.monitoring.interval);
    }

    // Add middleware if app provided
    if (app) {
      app.use(requestLogger(logger, performanceMonitor));
    }

    logger.info("Logger initialized", {
      logLevel: config.logLevel,
      database: config.database.enabled,
      systemMonitoring: config.monitoring.system,
      performanceMonitoring: config.monitoring.performance,
    });

    return logger;
  } catch (error) {
    console.error("Logger initialization failed:", error);
    throw error;
  }
}

// Middleware exports
export function getMiddleware() {
  return {
    request: requestLogger(logger, performanceMonitor),
    error: errorLogger(logger),
    notFound: notFoundHandler(logger),
    errorHandler: errorHandler(logger),
  };
}

// Metrics exports
export function getSystemMetrics() {
  return systemMonitor ? systemMonitor.collect() : null;
}

export function getPerformanceMetrics() {
  return performanceMonitor ? performanceMonitor.getMetrics() : null;
}

export function getDatabaseConnectionStatus() {
  return getDatabaseStatus();
}

// Database query helpers
export async function getLogModel() {
  return Log;
}

export async function findErrors(limit = 100) {
  return Log.findErrors(limit);
}

export async function findByCorrelationId(correlationId) {
  return Log.findByCorrelationId(correlationId);
}

// Metrics query helpers
export async function getMetricsModel() {
  return Metrics;
}

export async function getHistoricalMetrics(limit = 60) {
  return performanceMonitor
    ? performanceMonitor.getHistoricalMetrics(limit)
    : null;
}

export async function getMetricsTrend(hours = 1) {
  return performanceMonitor ? performanceMonitor.getMetricsTrend(hours) : null;
}

export async function getMetricsFromDatabase(
  startDate,
  endDate,
  reportPeriod = "minute"
) {
  return Metrics.getMetricsRange(startDate, endDate, reportPeriod);
}

export async function getLatestMetricsFromDatabase(
  limit = 10,
  reportPeriod = "minute"
) {
  return Metrics.getLatestMetrics(limit, reportPeriod);
}

export async function getAverageMetricsFromDatabase(
  hours = 1,
  reportPeriod = "minute"
) {
  return Metrics.getAverageMetrics(hours, reportPeriod);
}

// Graceful shutdown
export async function closeLogger() {
  if (systemMonitor) systemMonitor.stop();
  if (performanceMonitor) performanceMonitor.stop();
  if (dbTransport) dbTransport.close();

  return new Promise((resolve) => {
    logger.on("finish", resolve);
    logger.end();
  });
}

// Shutdown handlers
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  await closeLogger();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully");
  await closeLogger();
  process.exit(0);
});

export default logger;
