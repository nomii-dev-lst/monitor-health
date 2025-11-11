import { MonitorRepository } from '../repositories/index.js';
import SchedulerService from '../services/schedulerService.js';

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
    console.error('Error fetching monitors:', error);
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

    console.log('Monitor fetched:', {
      id: monitor.id,
      name: monitor.name,
      url: monitor.url,
      urlType: typeof monitor.url,
      urlLength: monitor.url ? monitor.url.length : 0,
    });

    res.json({
      success: true,
      monitor,
    });
  } catch (error) {
    console.error('Error fetching monitor:', error);
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
    console.error('Error creating monitor:', error);
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
    console.error('Error updating monitor:', error);
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
    console.error('Error deleting monitor:', error);
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
    console.error('Error executing check:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute check',
      error: error.message,
    });
  }
}
