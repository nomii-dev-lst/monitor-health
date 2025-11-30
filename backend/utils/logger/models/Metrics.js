/**
 * MongoDB Metrics Model
 * Stores historical performance metrics for trend analysis
 */

import mongoose from "mongoose";

// Get TTL days from environment or use default (90 days for metrics)
const metricsTtlDays = parseInt(process.env.METRICS_TTL_DAYS || "90");
const metricsTtlSeconds = metricsTtlDays * 24 * 60 * 60;

const metricsSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
      // TTL index: automatically delete metrics after expiration
      expire: metricsTtlSeconds,
    },
    reportPeriod: {
      type: String,
      enum: ["minute", "hour", "day"],
      default: "minute",
      index: true,
    },
    global: {
      totalRequests: {
        type: Number,
        default: 0,
      },
      totalErrors: {
        type: Number,
        default: 0,
      },
      totalDuration: {
        type: Number,
        default: 0,
      },
      avgResponseTime: {
        type: Number,
        default: 0,
      },
      errorRate: {
        type: Number,
        default: 0,
      },
      slowRequests: {
        type: Number,
        default: 0,
      },
    },
    endpoints: [
      {
        endpoint: String,
        requestCount: Number,
        errorCount: Number,
        totalDuration: Number,
        minDuration: Number,
        maxDuration: Number,
        avgResponseTime: Number,
        errorRate: Number,
      },
    ],
    app: {
      name: String,
      version: String,
      environment: String,
      hostname: String,
      pid: Number,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
metricsSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: metricsTtlSeconds }
);
metricsSchema.index({ reportPeriod: 1, timestamp: -1 });
metricsSchema.index({ "app.name": 1, timestamp: -1 });

// Static methods
metricsSchema.statics.saveMetrics = function (metricsData) {
  return this.create(metricsData);
};

metricsSchema.statics.getMetricsRange = function (
  startDate,
  endDate,
  reportPeriod = "minute"
) {
  return this.find({
    timestamp: { $gte: startDate, $lte: endDate },
    reportPeriod,
  }).sort({ timestamp: -1 });
};

metricsSchema.statics.getLatestMetrics = function (
  limit = 10,
  reportPeriod = "minute"
) {
  return this.find({ reportPeriod }).sort({ timestamp: -1 }).limit(limit);
};

metricsSchema.statics.getAverageMetrics = function (
  hours = 1,
  reportPeriod = "minute"
) {
  const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate },
        reportPeriod,
      },
    },
    {
      $group: {
        _id: null,
        avgResponseTime: { $avg: "$global.avgResponseTime" },
        avgErrorRate: { $avg: "$global.errorRate" },
        totalRequests: { $sum: "$global.totalRequests" },
        totalErrors: { $sum: "$global.totalErrors" },
        maxSlowRequests: { $max: "$global.slowRequests" },
      },
    },
  ]);
};

export default mongoose.model("Metrics", metricsSchema);
