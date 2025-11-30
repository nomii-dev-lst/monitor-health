import cron from 'node-cron';
import pLimit from 'p-limit';
import { MonitorRepository } from '../repositories/index.js';
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
   * NOTE: Monitors are only initialized when users log in
   */
  static start() {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    // Run every minute
    this.cronJob = cron.schedule('* * * * *', async () => {
      await this.checkScheduledMonitors();
    });

    this.isRunning = true;
    logger.info('Scheduler service started (interval: 1 minute)');
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
      const monitors = await MonitorRepository.findEnabled();

      for (const monitor of monitors) {
        if (!monitor.nextCheckTime) {
          // Schedule first check
          const nextCheck = new Date();

          if (monitor.lastCheckTime) {
            // If monitor was checked before, schedule based on last check
            nextCheck.setTime(
              monitor.lastCheckTime.getTime() +
                monitor.checkInterval * 60 * 1000,
            );
          } else {
            // If never checked, schedule for immediate check
            nextCheck.setMinutes(nextCheck.getMinutes() + 1);
          }

          await MonitorRepository.updateById(monitor.id, {
            nextCheckTime: nextCheck,
          });

          logger.info(
            `Initialized monitor "${monitor.name}" - next check at ${nextCheck.toLocaleString()}`,
          );
        }
      }

      logger.info(`Initialized ${monitors.length} monitors`);
    } catch (error) {
      logger.error('Failed to initialize monitors:', error.message);
    }
  }

  /**
   * Check which monitors are due for a health check and execute them
   * Only checks monitors for currently logged-in users
   */
  /**
   * Check which monitors are due for a health check and execute them
   * Runs for all enabled monitors regardless of user login status
   */
  static async checkScheduledMonitors() {
    try {
      // Find all enabled monitors that are due for a check (no user filtering)
      const dueMonitors = await MonitorRepository.findDueForCheck();

      if (dueMonitors.length === 0) {
        return; // No monitors due
      }

      logger.info(`Found ${dueMonitors.length} monitor(s) due for check`);

      // Execute checks with concurrency limit to prevent overwhelming the system
      const limit = pLimit(10); // Max 10 concurrent monitor checks

      const checkPromises = dueMonitors.map((monitor) =>
        limit(() => this.executeMonitorCheck(monitor)),
      );

      await Promise.allSettled(checkPromises);

      logger.debug(`Completed ${dueMonitors.length} monitor check(s)`);
    } catch (error) {
      logger.error('Error in scheduler:', error.message);
    }
  }

  /**
   * Execute a single monitor check
   * @param {Object} monitor - Monitor document
   */
  static async executeMonitorCheck(monitor) {
    const startTime = Date.now();

    try {
      // Calculate next check time BEFORE executing to maintain accurate intervals
      // Base it on the current nextCheckTime to avoid drift from check execution time
      const nextCheck = new Date(monitor.nextCheckTime || new Date());
      nextCheck.setMinutes(nextCheck.getMinutes() + monitor.checkInterval);

      // Update nextCheckTime immediately to prevent duplicate checks
      await MonitorRepository.updateById(monitor.id, {
        nextCheckTime: nextCheck,
      });

      // Execute the check (can take time, but won't affect next interval)
      await MonitorService.executeCheck(monitor);

      const duration = Date.now() - startTime;
      logger.debug(
        `Monitor "${monitor.name}" check completed in ${duration}ms`,
      );
    } catch (error) {
      logger.error(
        `Failed to execute check for monitor ${monitor.name}:`,
        error.message,
      );

      // On error, still schedule next check to avoid getting stuck
      // But add a small delay to prevent rapid retries on persistent failures
      const nextCheck = new Date();
      const retryDelay = Math.min(monitor.checkInterval, 5); // Max 5 min delay
      nextCheck.setMinutes(nextCheck.getMinutes() + retryDelay);

      try {
        await MonitorRepository.updateById(monitor.id, {
          nextCheckTime: nextCheck,
        });
      } catch (updateError) {
        logger.error(
          `Failed to update nextCheckTime for monitor ${monitor.name}:`,
          updateError.message,
        );
      }
    }
  }

  /**
   * Manually trigger a check for a specific monitor
   * @param {String|Object} monitorIdOrDoc - Monitor ID string or monitor document
   * @returns {Object} Check result
   */
  static async triggerManualCheck(monitorIdOrDoc) {
    const identifier =
      typeof monitorIdOrDoc === 'string' ? monitorIdOrDoc : monitorIdOrDoc.id;
    logger.info(`Manual check triggered for monitor: ${identifier}`);
    return await MonitorService.executeCheck(monitorIdOrDoc);
  }

  /**
   * Get scheduler status
   * @returns {Object}
   */
  static getStatus() {
    return {
      isRunning: this.isRunning,
      cronExpression: '* * * * *',
      description: 'Runs every 1 minute',
    };
  }
}

export default SchedulerService;
