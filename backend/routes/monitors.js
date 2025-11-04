import express from 'express';
import { Monitor } from '../models/index.js';
import { authenticateToken } from '../middleware/auth.js';
import MonitorService from '../services/monitorService.js';
import SchedulerService from '../services/schedulerService.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/monitors
 * Get all monitors with their current status
 */
router.get('/', async (req, res) => {
  try {
    const monitors = await Monitor.find().sort({ createdAt: -1 });

    // Calculate uptime percentage for each
    const monitorsWithStats = monitors.map(monitor => ({
      ...monitor.toObject(),
      uptimePercentage: monitor.totalChecks > 0 
        ? ((monitor.successfulChecks / monitor.totalChecks) * 100).toFixed(2)
        : 0
    }));

    res.json({
      success: true,
      monitors: monitorsWithStats
    });
  } catch (error) {
    console.error('Error fetching monitors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monitors'
    });
  }
});

/**
 * GET /api/monitors/:id
 * Get single monitor by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const monitor = await Monitor.findById(req.params.id);

    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found'
      });
    }

    res.json({
      success: true,
      monitor
    });
  } catch (error) {
    console.error('Error fetching monitor:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monitor'
    });
  }
});

/**
 * POST /api/monitors
 * Create a new monitor
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      url,
      authType,
      authConfig,
      validationRules,
      checkInterval,
      alertEmails,
      enabled
    } = req.body;

    // Validation
    if (!name || !url) {
      return res.status(400).json({
        success: false,
        message: 'Name and URL are required'
      });
    }

    // Calculate first check time
    const nextCheckTime = new Date();
    nextCheckTime.setMinutes(nextCheckTime.getMinutes() + (checkInterval || 30));

    const monitor = await Monitor.create({
      name,
      url,
      authType: authType || 'none',
      authConfig: authConfig || {},
      validationRules: validationRules || { statusCode: 200 },
      checkInterval: checkInterval || 30,
      alertEmails: alertEmails || [],
      enabled: enabled !== undefined ? enabled : true,
      nextCheckTime
    });

    res.status(201).json({
      success: true,
      monitor,
      message: 'Monitor created successfully'
    });
  } catch (error) {
    console.error('Error creating monitor:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create monitor'
    });
  }
});

/**
 * PUT /api/monitors/:id
 * Update a monitor
 */
router.put('/:id', async (req, res) => {
  try {
    const {
      name,
      url,
      authType,
      authConfig,
      validationRules,
      checkInterval,
      alertEmails,
      enabled
    } = req.body;

    const monitor = await Monitor.findById(req.params.id);

    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found'
      });
    }

    // Update fields
    if (name !== undefined) monitor.name = name;
    if (url !== undefined) monitor.url = url;
    if (authType !== undefined) monitor.authType = authType;
    if (authConfig !== undefined) monitor.authConfig = authConfig;
    if (validationRules !== undefined) monitor.validationRules = validationRules;
    if (alertEmails !== undefined) monitor.alertEmails = alertEmails;
    if (enabled !== undefined) monitor.enabled = enabled;
    
    // If check interval changed, recalculate next check time
    if (checkInterval !== undefined && checkInterval !== monitor.checkInterval) {
      monitor.checkInterval = checkInterval;
      const nextCheckTime = new Date();
      nextCheckTime.setMinutes(nextCheckTime.getMinutes() + checkInterval);
      monitor.nextCheckTime = nextCheckTime;
    }

    await monitor.save();

    res.json({
      success: true,
      monitor,
      message: 'Monitor updated successfully'
    });
  } catch (error) {
    console.error('Error updating monitor:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update monitor'
    });
  }
});

/**
 * DELETE /api/monitors/:id
 * Delete a monitor
 */
router.delete('/:id', async (req, res) => {
  try {
    const monitor = await Monitor.findByIdAndDelete(req.params.id);

    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found'
      });
    }

    res.json({
      success: true,
      message: 'Monitor deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting monitor:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete monitor'
    });
  }
});

/**
 * POST /api/monitors/:id/check
 * Manually trigger a check for a monitor
 */
router.post('/:id/check', async (req, res) => {
  try {
    const monitor = await Monitor.findById(req.params.id);

    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found'
      });
    }

    // Trigger manual check
    const checkResult = await SchedulerService.triggerManualCheck(monitor._id);

    res.json({
      success: true,
      checkResult,
      message: 'Check executed successfully'
    });
  } catch (error) {
    console.error('Error executing check:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute check',
      error: error.message
    });
  }
});

export default router;
