import { MonitorRepository } from '../repositories/index.js';
import logger from '../utils/logger.js';

/**
 * User Session Service
 * Tracks logged-in users and manages their monitor sessions
 */

export class UserSessionService {
  // Set of currently logged-in user IDs
  static activeUsers = new Set();

  /**
   * Register a user login and start their monitors
   * @param {Number} userId - User ID
   */
  /**
   * Register a user login
   * @param {Number} userId - User ID
   */
  static async login(userId) {
    try {
      if (this.activeUsers.has(userId)) {
        logger.info(`User ${userId} already has an active session`);
        return;
      }

      // Add user to active sessions (for tracking and SSE notifications)
      this.activeUsers.add(userId);
      logger.info(`User ${userId} session started`);

      // Note: Monitors now run in background regardless of login status
    } catch (error) {
      logger.error(`Failed to register login for user ${userId}:`, error);
    }
  }

  /**
   * Register a user logout
   * @param {Number} userId - User ID
   */
  static async logout(userId) {
    try {
      if (!this.activeUsers.has(userId)) {
        logger.info(`User ${userId} has no active session`);
        return;
      }

      // Remove user from active sessions
      this.activeUsers.delete(userId);
      logger.info(`User ${userId} session ended`);

      // Note: Monitors continue running in background
    } catch (error) {
      logger.error(`Failed to register logout for user ${userId}:`, error);
    }
  }

  /**
   * Initialize monitors for a specific user
   * @param {Number} userId - User ID
   */
  static async initializeUserMonitors(userId) {
    try {
      const monitors = await MonitorRepository.findEnabledByUserId(userId);

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

          logger.debug(
            `Monitor "${monitor.name}" scheduled for ${nextCheck.toISOString()}`,
          );
        }
      }

      if (monitors.length > 0) {
        logger.info(
          `${monitors.length} monitor(s) activated for user ${userId}`,
        );
      }
    } catch (error) {
      logger.error(
        `Failed to initialize monitors for user ${userId}:`,
        error.message,
      );
    }
  }

  /**
   * Stop monitors for a specific user
   * @param {Number} userId - User ID
   */
  static async stopUserMonitors(userId) {
    try {
      const monitors = await MonitorRepository.findByUserId(userId);

      for (const monitor of monitors) {
        // Clear nextCheckTime to prevent further checks
        await MonitorRepository.updateById(monitor.id, { nextCheckTime: null });
      }

      logger.info(`Stopped ${monitors.length} monitors for user ${userId}`);
    } catch (error) {
      logger.error(
        `Failed to stop monitors for user ${userId}:`,
        error.message,
      );
    }
  }

  /**
   * Check if a user is currently logged in
   * @param {Number} userId - User ID
   * @returns {Boolean}
   */
  static isUserActive(userId) {
    return this.activeUsers.has(userId);
  }

  /**
   * Get all active user IDs
   * @returns {Array<Number>}
   */
  static getActiveUsers() {
    return Array.from(this.activeUsers);
  }

  /**
   * Get count of active users
   * @returns {Number}
   */
  static getActiveUserCount() {
    return this.activeUsers.size;
  }

  /**
   * Clear all active sessions (for server restart)
   */
  static clearAllSessions() {
    this.activeUsers.clear();
    logger.info('All user sessions cleared');
  }
}

export default UserSessionService;
