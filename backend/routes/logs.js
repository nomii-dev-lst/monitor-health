import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getLogs,
  getLogStats
} from '../controllers/logsController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/logs
 * Get recent check results across all monitors
 * Query params: limit (default: 100), offset (default: 0)
 */
router.get('/', getLogs);

/**
 * GET /api/logs/stats
 * Get statistics about recent checks
 */
router.get('/stats', getLogStats);

export default router;
