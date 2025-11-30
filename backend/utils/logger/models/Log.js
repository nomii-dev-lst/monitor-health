/**
 * MongoDB Log Model
 * Stores all application logs with indexing and TTL
 */

import mongoose from "mongoose";

// Get TTL days from environment or use default (30 days)
const ttlDays = parseInt(process.env.LOG_TTL_DAYS || "30");
const ttlSeconds = ttlDays * 24 * 60 * 60;

const logSchema = new mongoose.Schema(
  {
    level: {
      type: String,
      required: true,
      enum: ["error", "warn", "info", "debug", "trace"],
      index: true,
    },
    message: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      // TTL index: automatically delete documents after ttlSeconds
      expire: ttlSeconds,
    },
    type: {
      type: String,
      enum: ["application", "system", "performance", "error", "request"],
      default: "application",
      index: true,
    },
    correlationId: {
      type: String,
      index: true,
    },
    app: {
      name: String,
      version: String,
      environment: String,
      hostname: String,
      pid: Number,
    },
    request: {
      method: String,
      url: String,
      path: String,
      query: mongoose.Schema.Types.Mixed,
      headers: mongoose.Schema.Types.Mixed,
      ip: String,
      userAgent: String,
    },
    response: {
      statusCode: Number,
      duration: Number,
    },
    error: {
      name: String,
      message: String,
      stack: String,
      code: String,
    },
    system: {
      cpu: Number,
      memory: mongoose.Schema.Types.Mixed,
      disk: mongoose.Schema.Types.Mixed,
      uptime: Number,
    },
    performance: {
      endpoint: String,
      avgResponseTime: Number,
      requestCount: Number,
      errorCount: Number,
      errorRate: Number,
    },
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

// Indexes
logSchema.index({ level: 1, timestamp: -1 });
logSchema.index({ type: 1, timestamp: -1 });
logSchema.index({ correlationId: 1, timestamp: -1 });

// TTL Index: automatically delete documents after expiration
// MongoDB runs the TTL monitor every 60 seconds
logSchema.index({ timestamp: 1 }, { expireAfterSeconds: ttlSeconds });

// Static methods
logSchema.statics.findErrors = function (limit = 100) {
  return this.find({ level: "error" }).sort({ timestamp: -1 }).limit(limit);
};

logSchema.statics.findByCorrelationId = function (correlationId) {
  return this.find({ correlationId }).sort({ timestamp: 1 });
};

export default mongoose.model("Log", logSchema);
