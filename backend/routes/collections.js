import express from 'express';
import collectionsController from '../controllers/collectionsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/collections
 * @desc    Get all collections for authenticated user
 * @access  Private
 */
router.get('/', collectionsController.getAll);

/**
 * @route   GET /api/collections/:id
 * @desc    Get a single collection by ID with stats
 * @access  Private
 */
router.get('/:id', collectionsController.getById);

/**
 * @route   POST /api/collections
 * @desc    Create a new collection
 * @access  Private
 */
router.post('/', collectionsController.create);

/**
 * @route   PUT /api/collections/:id
 * @desc    Update a collection
 * @access  Private
 */
router.put('/:id', collectionsController.update);

/**
 * @route   DELETE /api/collections/:id
 * @desc    Delete a collection (CASCADE deletes all monitors)
 * @access  Private
 */
router.delete('/:id', collectionsController.delete);

/**
 * @route   GET /api/collections/:id/monitors
 * @desc    Get all monitors in a collection
 * @access  Private
 */
router.get('/:id/monitors', collectionsController.getMonitors);

/**
 * @route   POST /api/collections/:id/check-all
 * @desc    Trigger health checks for all monitors in collection (parallel)
 * @access  Private
 */
router.post('/:id/check-all', collectionsController.checkAll);

/**
 * @route   POST /api/collections/:id/monitors
 * @desc    Add a monitor to a collection
 * @access  Private
 */
router.post('/:id/monitors', collectionsController.addMonitor);

/**
 * @route   DELETE /api/collections/:id/monitors/:monitorId
 * @desc    Remove a monitor from a collection
 * @access  Private
 */
router.delete('/:id/monitors/:monitorId', collectionsController.removeMonitor);

export default router;
