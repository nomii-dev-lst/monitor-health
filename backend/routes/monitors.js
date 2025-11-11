import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getMonitors,
  getMonitorById,
  createMonitor,
  updateMonitor,
  deleteMonitor,
  triggerMonitorCheck
} from '../controllers/monitorsController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/monitors
 * Get all monitors with their current status
 */
router.get('/', getMonitors);

/**
 * GET /api/monitors/:id
 * Get single monitor by ID
 */
router.get('/:id', getMonitorById);

/**
 * POST /api/monitors
 * Create a new monitor
 */
router.post('/', createMonitor);

/**
 * PUT /api/monitors/:id
 * Update a monitor
 */
router.put('/:id', updateMonitor);

/**
 * DELETE /api/monitors/:id
 * Delete a monitor
 */
router.delete('/:id', deleteMonitor);

/**
 * POST /api/monitors/:id/check
 * Manually trigger a check for a monitor
 */
router.post('/:id/check', triggerMonitorCheck);

export default router;
