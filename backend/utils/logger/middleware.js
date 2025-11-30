/**
 * Express Middleware for Logging
 */

import { v4 as uuidv4 } from "uuid";

// Request logging middleware
export function requestLogger(logger, performanceMonitor) {
  return (req, res, next) => {
    // Generate correlation ID
    req.correlationId = req.get("x-correlation-id") || uuidv4();
    res.setHeader("x-correlation-id", req.correlationId);

    const start = Date.now();

    res.on("finish", () => {
      const duration = Date.now() - start;

      logger.info(`${req.method} ${req.path}`, {
        type: "request",
        correlationId: req.correlationId,
        request: {
          method: req.method,
          url: req.originalUrl || req.url,
          path: req.path,
          query: req.query,
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get("user-agent"),
        },
        response: {
          statusCode: res.statusCode,
          duration,
        },
      });

      // Record performance metrics
      if (performanceMonitor) {
        performanceMonitor.recordRequest(req, res, duration);
      }
    });

    next();
  };
}

// Error logging middleware
export function errorLogger(logger) {
  return (err, req, res, next) => {
    logger.error("Request error", {
      type: "error",
      correlationId: req.correlationId,
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack,
        code: err.code,
      },
      request: {
        method: req.method,
        url: req.originalUrl || req.url,
        path: req.path,
        query: req.query,
        body: req.body,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get("user-agent"),
      },
    });

    next(err);
  };
}

// 404 handler
export function notFoundHandler(logger) {
  return (req, res) => {
    logger.warn(`404 - Route not found: ${req.method} ${req.path}`, {
      correlationId: req.correlationId,
      request: {
        method: req.method,
        path: req.path,
        url: req.originalUrl || req.url,
        query: req.query,
        body: req.body,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      },
    });

    res.status(404).json({
      error: "Not Found",
      path: req.path,
      correlationId: req.correlationId,
    });
  };
}

// Final error handler
export function errorHandler(logger) {
  return (err, req, res, next) => {
    const status = err.status || err.statusCode || 500;

    logger.error("Unhandled error", {
      type: "error",
      correlationId: req.correlationId,
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack,
      },
      request: {
        method: req.method,
        path: req.path,
        url: req.originalUrl || req.url,
        query: req.query,
        body: req.body,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get("user-agent"),
      },
    });

    res.status(status).json({
      error: status >= 500 ? "Internal Server Error" : err.name || "Error",
      message:
        process.env.NODE_ENV === "production" && status >= 500
          ? "An unexpected error occurred"
          : err.message,
      correlationId: req.correlationId,
    });
  };
}
