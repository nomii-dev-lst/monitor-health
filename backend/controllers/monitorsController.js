import { MonitorRepository } from '../repositories/index.js';
import SchedulerService from '../services/schedulerService.js';
import logger from '../utils/logger.js';

export async function getMonitors(req, res) {
  try {
    // Get monitors for current user only
    const monitors = await MonitorRepository.findByUserId(req.user.id);

    // Add uptime percentage to each monitor
    const monitorsWithStats = monitors.map((monitor) => ({
      ...monitor,
      uptimePercentage: MonitorRepository.calculateUptimePercentage(monitor),
    }));

    res.json({
      success: true,
      monitors: monitorsWithStats,
    });
  } catch (error) {
    logger.error('Error fetching monitors', {
      type: 'monitor',
      action: 'fetch_all',
      userId: req.user.id,
      error: {
        name: error.name,
        message: error.message,
      },
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monitors',
    });
  }
}

export async function getMonitorById(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid monitor ID',
      });
    }

    const monitor = await MonitorRepository.findByIdWithStats(id);

    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found',
      });
    }

    // Verify monitor belongs to current user
    if (monitor.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    logger.debug('Monitor fetched', {
      type: 'monitor',
      action: 'fetch_single',
      userId: req.user.id,
      monitor: {
        id: monitor.id,
        name: monitor.name,
        url: monitor.url,
        type: monitor.type,
        enabled: monitor.enabled,
      },
    });

    res.json({
      success: true,
      monitor,
    });
  } catch (error) {
    logger.error('Error fetching monitor', {
      type: 'monitor',
      action: 'fetch_single',
      userId: req.user.id,
      monitorId: req.params.id,
      error: {
        name: error.name,
        message: error.message,
      },
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monitor',
    });
  }
}

export async function createMonitor(req, res) {
  try {
    const {
      name,
      url,
      authType,
      authConfig,
      validationRules,
      checkInterval,
      alertEmails,
      enabled,
      collectionId,
    } = req.body;

    if (!name || !url) {
      return res.status(400).json({
        success: false,
        message: 'Name and URL are required',
      });
    }

    const nextCheckTime = new Date();
    nextCheckTime.setMinutes(
      nextCheckTime.getMinutes() + (checkInterval || 30),
    );

    const monitor = await MonitorRepository.create({
      userId: req.user.id, // Add current user ID
      collectionId: collectionId || null,
      name,
      url,
      authType: authType || 'none',
      authConfig: authConfig || {},
      validationRules: validationRules || { statusCode: 200 },
      checkInterval: checkInterval || 30,
      alertEmails: alertEmails || [],
      enabled: enabled !== undefined ? enabled : true,
      nextCheckTime,
    });

    res.status(201).json({
      success: true,
      monitor,
      message: 'Monitor created successfully',
    });
  } catch (error) {
    logger.error('Error creating monitor', {
      type: 'monitor',
      action: 'create',
      userId: req.user.id,
      monitorData: req.body,
      error: {
        name: error.name,
        message: error.message,
      },
    });
    res.status(500).json({
      success: false,
      message: 'Failed to create monitor',
    });
  }
}

export async function updateMonitor(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid monitor ID',
      });
    }

    const {
      name,
      url,
      authType,
      authConfig,
      validationRules,
      checkInterval,
      alertEmails,
      enabled,
      collectionId,
    } = req.body;

    const monitor = await MonitorRepository.findById(id);

    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found',
      });
    }

    // Verify monitor belongs to current user
    if (monitor.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const updates = {};
    if (name !== undefined) {
      updates.name = name;
    }
    if (url !== undefined) {
      if (!url || url.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'URL cannot be empty',
        });
      }
      updates.url = url.trim();
    }
    if (authType !== undefined) {
      updates.authType = authType;
    }
    if (authConfig !== undefined) {
      updates.authConfig = authConfig;
    }
    if (validationRules !== undefined) {
      updates.validationRules = validationRules;
    }
    if (alertEmails !== undefined) {
      updates.alertEmails = alertEmails;
    }
    if (enabled !== undefined) {
      updates.enabled = enabled;
    }
    if (collectionId !== undefined) {
      updates.collectionId = collectionId;
    }

    if (
      checkInterval !== undefined &&
      checkInterval !== monitor.checkInterval
    ) {
      updates.checkInterval = checkInterval;
      const nextCheckTime = new Date();
      nextCheckTime.setMinutes(nextCheckTime.getMinutes() + checkInterval);
      updates.nextCheckTime = nextCheckTime;
    }

    const updatedMonitor = await MonitorRepository.updateById(id, updates);

    res.json({
      success: true,
      monitor: updatedMonitor,
      message: 'Monitor updated successfully',
    });
  } catch (error) {
    logger.error('Error updating monitor', {
      type: 'monitor',
      action: 'update',
      userId: req.user.id,
      monitorId: req.params.id,
      error: {
        name: error.name,
        message: error.message,
      },
    });
    res.status(500).json({
      success: false,
      message: 'Failed to update monitor',
    });
  }
}

export async function deleteMonitor(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid monitor ID',
      });
    }

    // Verify monitor belongs to current user
    const monitor = await MonitorRepository.findById(id);
    if (monitor && monitor.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const deleted = await MonitorRepository.deleteById(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found',
      });
    }

    res.json({
      success: true,
      message: 'Monitor deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting monitor', {
      type: 'monitor',
      action: 'delete',
      userId: req.user.id,
      monitorId: req.params.id,
      error: {
        name: error.name,
        message: error.message,
      },
    });
    res.status(500).json({
      success: false,
      message: 'Failed to delete monitor',
    });
  }
}

export async function triggerMonitorCheck(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid monitor ID',
      });
    }

    const monitor = await MonitorRepository.findById(id);

    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found',
      });
    }

    // Verify monitor belongs to current user
    if (monitor.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const checkResult = await SchedulerService.triggerManualCheck(monitor);

    res.json({
      success: true,
      checkResult,
      message: 'Check executed successfully',
    });
  } catch (error) {
    logger.error('Error executing manual check', {
      type: 'monitor',
      action: 'manual_check',
      userId: req.user.id,
      monitorId: req.params.id,
      error: {
        name: error.name,
        message: error.message,
      },
    });
    res.status(500).json({
      success: false,
      message: 'Failed to execute check',
      error: error.message,
    });
  }
}
