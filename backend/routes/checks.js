import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getMonitorChecks,
  getMonitorStats,
  getMonitorChart
} from '../controllers/checksController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/checks/:monitorId
 * Get check history for a monitor
 * Query params: limit (default: 50), offset (default: 0)
 */
router.get('/:monitorId', getMonitorChecks);

/**
 * GET /api/checks/:monitorId/stats
 * Get uptime and latency statistics for a monitor
 * Query params: hours (default: 24)
 */
router.get('/:monitorId/stats', getMonitorStats);

/**
 * GET /api/checks/:monitorId/chart
 * Get time-series data for charts
 * Query params: hours (default: 24), interval (default: 60 minutes)
 */
router.get('/:monitorId/chart', getMonitorChart);

export default router;
