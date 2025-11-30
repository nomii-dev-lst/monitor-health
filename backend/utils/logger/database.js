/**
 * Database Transport and Connection
 */

import mongoose from "mongoose";
import Transport from "winston-transport";
import Log from "./models/Log.js";
import { configDotenv } from "dotenv";

configDotenv();

// Database connection state
let connectionState = {
  isConnected: false,
  isConnecting: false,
};

// Monitor mongoose connection events
mongoose.connection.on("connected", () => {
  connectionState.isConnected = true;
  connectionState.isConnecting = false;
});

mongoose.connection.on("disconnected", () => {
  connectionState.isConnected = false;
});

mongoose.connection.on("error", (err) => {
  connectionState.isConnected = false;
  console.error("Database error:", err.message);
});

export async function connectDatabase(uri) {
  if (connectionState.isConnected) {
    return true;
  }

  if (connectionState.isConnecting) {
    return false;
  }

  connectionState.isConnecting = true;

  try {
    const connectionUri = uri || process.env.MONGODB_URI;

    await mongoose.connect(connectionUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    connectionState.isConnected = true;
    connectionState.isConnecting = false;
    return true;
  } catch (error) {
    connectionState.isConnecting = false;
    connectionState.isConnected = false;
    console.error("Database connection failed:", error.message);
    return false;
  }
}

export function getDatabaseStatus() {
  return {
    isConnected: connectionState.isConnected,
    readyState: mongoose.connection.readyState,
    readyStateText:
      ["disconnected", "connected", "connecting", "disconnecting"][
        mongoose.connection.readyState
      ] || "unknown",
  };
}

// Custom Winston Transport for MongoDB
export class DatabaseTransport extends Transport {
  constructor(opts = {}) {
    super(opts);
    this.batchSize = opts.batchSize || 100;
    this.batchInterval = opts.batchInterval || 5000;
    this.queue = [];
    this.timer = null;
    this.isProcessing = false;

    // Configurable queue limits
    this.maxQueueSize =
      opts.maxQueueSize || parseInt(process.env.LOG_QUEUE_MAX_SIZE || "10000");
    this.queueWarningThreshold =
      opts.queueWarningThreshold ||
      parseInt(process.env.LOG_QUEUE_WARNING_THRESHOLD || "7500");
    this.queueCriticalThreshold =
      opts.queueCriticalThreshold ||
      parseInt(process.env.LOG_QUEUE_CRITICAL_THRESHOLD || "9000");

    // Track warnings to avoid spam
    this.warningLogged = false;
    this.criticalLogged = false;

    this.startBatchProcessor();
  }

  log(info, callback) {
    setImmediate(() => this.emit("logged", info));

    // Prepare log entry
    const logEntry = {
      level: info.level,
      message: info.message,
      timestamp: new Date(info.timestamp || Date.now()),
      type: info.type || "application",
      correlationId: info.correlationId,
      app: info.app,
      request: info.request,
      response: info.response,
      error: info.error,
      system: info.system,
      performance: info.performance,
      metadata: info.metadata,
    };

    this.queue.push(logEntry);

    // Monitor queue size and log warnings
    this.checkQueueHealth();

    // Process immediately if batch size reached
    if (this.queue.length >= this.batchSize) {
      this.processBatch();
    }

    callback();
  }

  checkQueueHealth() {
    const queueSize = this.queue.length;

    // Critical threshold - queue is almost full
    if (queueSize >= this.queueCriticalThreshold && !this.criticalLogged) {
      console.error(
        `[CRITICAL] Log queue critical: ${queueSize}/${this.maxQueueSize} logs buffered. Database may be unavailable.`
      );
      this.criticalLogged = true;
      this.warningLogged = true;
    }
    // Warning threshold - queue is getting full
    else if (queueSize >= this.queueWarningThreshold && !this.warningLogged) {
      console.warn(
        `[WARNING] Log queue warning: ${queueSize}/${this.maxQueueSize} logs buffered. Database may be slow.`
      );
      this.warningLogged = true;
    }
    // Queue recovered
    else if (queueSize < this.queueWarningThreshold) {
      if (this.warningLogged || this.criticalLogged) {
        console.log(
          `[INFO] Log queue recovered: ${queueSize}/${this.maxQueueSize} logs buffered.`
        );
      }
      this.warningLogged = false;
      this.criticalLogged = false;
    }
  }

  startBatchProcessor() {
    this.timer = setInterval(() => {
      if (this.queue.length > 0) {
        this.processBatch();
      }
    }, this.batchInterval);
  }

  async processBatch() {
    // Check if already processing
    if (this.isProcessing) {
      return;
    }

    // Check if there are logs to process
    if (this.queue.length === 0) {
      return;
    }

    // Check database connection
    if (!connectionState.isConnected) {
      // Keep logs in queue but limit size to prevent memory issues
      if (this.queue.length > this.maxQueueSize) {
        const droppedCount = this.queue.length - this.maxQueueSize;
        console.error(
          `[ERROR] Dropping ${droppedCount} logs due to queue overflow (DB disconnected). Max queue size: ${this.maxQueueSize}`
        );
        this.queue = this.queue.slice(-this.maxQueueSize);
      }
      return;
    }

    this.isProcessing = true;
    const batch = this.queue.splice(0, this.batchSize);

    try {
      await Log.insertMany(batch, { ordered: false });
    } catch (error) {
      console.error("Failed to save logs to database:", error.message);

      // If it's a connection error, put logs back in queue
      if (
        error.name === "MongoNetworkError" ||
        error.name === "MongoTimeoutError"
      ) {
        this.queue.unshift(...batch);

        // Limit queue size with warning
        if (this.queue.length > this.maxQueueSize) {
          const droppedCount = this.queue.length - this.maxQueueSize;
          console.error(
            `[ERROR] Dropping ${droppedCount} logs due to queue overflow. Max queue size: ${this.maxQueueSize}`
          );
          this.queue = this.queue.slice(-this.maxQueueSize);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  async close() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    // Process remaining logs
    let attempts = 0;
    while (this.queue.length > 0 && attempts < 10) {
      await this.processBatch();
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }
  }
}
