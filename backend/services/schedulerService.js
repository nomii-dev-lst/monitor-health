import cron from 'node-cron';
import { Monitor } from '../models/index.js';
import MonitorService from './monitorService.js';
import logger from '../utils/logger.js';

/**
 * Scheduler service for running periodic health checks
 * Uses node-cron to check monitors at their configured intervals
 */

export class SchedulerService {
  static cronJob = null;
  static isRunning = false;

  /**
   * Start the scheduler
   * Runs every minute to check which monitors need to be checked
   */
  static start() {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    logger.info('Starting scheduler service...');

    // Initialize next check times for all monitors on startup
    this.initializeMonitors();

    // Run every minute
    this.cronJob = cron.schedule('* * * * *', async () => {
      await this.checkScheduledMonitors();
    });

    this.isRunning = true;
    logger.info('✓ Scheduler service started (runs every 1 minute)');
  }

  /**
   * Stop the scheduler
   */
  static stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.isRunning = false;
    logger.info('Scheduler service stopped');
  }

  /**
   * Initialize monitors on startup
   * Calculate nextCheckTime for monitors that don't have one
   */
  static async initializeMonitors() {
    try {
      const monitors = await Monitor.find({ enabled: true });

      for (const monitor of monitors) {
        if (!monitor.nextCheckTime) {
          // Schedule first check
          const nextCheck = new Date();
          
          if (monitor.lastCheckTime) {
            // If monitor was checked before, schedule based on last check
            nextCheck.setTime(monitor.lastCheckTime.getTime() + monitor.checkInterval * 60 * 1000);
          } else {
            // If never checked, schedule for immediate check
            nextCheck.setMinutes(nextCheck.getMinutes() + 1);
          }

          monitor.nextCheckTime = nextCheck;
          await monitor.save();

          logger.info(`Initialized monitor "${monitor.name}" - next check at ${nextCheck.toLocaleString()}`);
        }
      }

      logger.info(`Initialized ${monitors.length} monitors`);
    } catch (error) {
      logger.error('Failed to initialize monitors:', error.message);
    }
  }

  /**
   * Check which monitors are due for a health check and execute them
   */
  static async checkScheduledMonitors() {
    try {
      const now = new Date();

      // Find all enabled monitors that are due for a check
      const dueMonitors = await Monitor.find({
        enabled: true,
        nextCheckTime: { $lte: now }
      });

      if (dueMonitors.length === 0) {
        return; // No monitors due
      }

      logger.info(`Found ${dueMonitors.length} monitor(s) due for check`);

      // Execute checks in parallel (with reasonable concurrency)
      const checkPromises = dueMonitors.map(monitor => 
        this.executeMonitorCheck(monitor)
      );

      await Promise.allSettled(checkPromises);

    } catch (error) {
      logger.error('Error in scheduler:', error.message);
    }
  }

  /**
   * Execute a single monitor check
   * @param {Object} monitor - Monitor document
   */
  static async executeMonitorCheck(monitor) {
    try {
      // Update nextCheckTime immediately to prevent duplicate checks
      const nextCheck = new Date();
      nextCheck.setMinutes(nextCheck.getMinutes() + monitor.checkInterval);
      
      await Monitor.findByIdAndUpdate(monitor._id, {
        nextCheckTime: nextCheck
      });

      // Execute the check
      await MonitorService.executeCheck(monitor);

    } catch (error) {
      logger.error(`Failed to execute check for monitor ${monitor.name}:`, error.message);
      
      // Even on error, schedule next check to avoid getting stuck
      const nextCheck = new Date();
      nextCheck.setMinutes(nextCheck.getMinutes() + monitor.checkInterval);
      
      await Monitor.findByIdAndUpdate(monitor._id, {
        nextCheckTime: nextCheck
      });
    }
  }

  /**
   * Manually trigger a check for a specific monitor
   * @param {String} monitorId 
   * @returns {Object} Check result
   */
  static async triggerManualCheck(monitorId) {
    logger.info(`Manual check triggered for monitor: ${monitorId}`);
    return await MonitorService.executeCheck(monitorId);
  }

  /**
   * Get scheduler status
   * @returns {Object}
   */
  static getStatus() {
    return {
      isRunning: this.isRunning,
      cronExpression: '* * * * *',
      description: 'Runs every 1 minute'
    };
  }
}

export default SchedulerService;
