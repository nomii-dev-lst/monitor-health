import axios from 'axios';
import { Monitor, CheckResult, Alert } from '../models/index.js';
import AuthService from './authService.js';
import EmailService from './emailService.js';
import { ResponseValidator } from '../utils/validator.js';
import logger from '../utils/logger.js';

/**
 * Core monitoring service
 * Performs health checks, validates responses, saves results, triggers alerts
 */

export class MonitorService {
  
  /**
   * Execute a health check for a monitor
   * @param {String|Object} monitorId - Monitor ID or Monitor document
   * @returns {Object} Check result
   */
  static async executeCheck(monitorId) {
    let monitor;
    
    // Fetch monitor if ID is provided
    if (typeof monitorId === 'string') {
      monitor = await Monitor.findById(monitorId);
      if (!monitor) {
        throw new Error(`Monitor not found: ${monitorId}`);
      }
    } else {
      monitor = monitorId;
    }

    logger.info(`Executing check for monitor: ${monitor.name}`);

    const startTime = Date.now();
    let checkResult = {
      monitorId: monitor._id,
      status: 'failure',
      httpStatus: null,
      latency: 0,
      errorMessage: null,
      validationErrors: [],
      responseData: null,
      checkedAt: new Date()
    };

    try {
      // Step 1: Authenticate if required
      const authData = await AuthService.authenticate(monitor);

      // Step 2: Make HTTP request
      const response = await axios({
        method: 'GET',
        url: monitor.url,
        headers: {
          ...authData.headers,
          'User-Agent': 'MonitorHealth/1.0',
          ...(authData.cookies && { 'Cookie': authData.cookies })
        },
        timeout: 30000, // 30 seconds
        validateStatus: () => true // Accept any status code
      });

      const endTime = Date.now();
      checkResult.latency = endTime - startTime;
      checkResult.httpStatus = response.status;

      // Store sample response (truncated)
      checkResult.responseData = JSON.stringify(response.data).substring(0, 500);

      // Step 3: Validate response
      const validation = ResponseValidator.validate(response, monitor.validationRules);
      
      if (validation.isValid) {
        checkResult.status = 'success';
        checkResult.errorMessage = null;
      } else {
        checkResult.status = 'failure';
        checkResult.validationErrors = validation.errors;
        checkResult.errorMessage = `Validation failed: ${validation.errors.join(', ')}`;
      }

    } catch (error) {
      const endTime = Date.now();
      checkResult.latency = endTime - startTime;
      checkResult.status = 'failure';
      checkResult.errorMessage = error.message;
      
      if (error.response) {
        checkResult.httpStatus = error.response.status;
        checkResult.responseData = JSON.stringify(error.response.data).substring(0, 500);
      } else if (error.code) {
        checkResult.errorMessage = `${error.code}: ${error.message}`;
      }

      logger.error(`Check failed for ${monitor.name}:`, error.message);
    }

    // Step 4: Save check result
    const savedResult = await CheckResult.create(checkResult);

    // Step 5: Update monitor statistics
    await this.updateMonitorStats(monitor, checkResult);

    // Step 6: Handle alerts
    await this.handleAlerts(monitor, checkResult);

    logger.info(`Check completed for ${monitor.name}: ${checkResult.status} (${checkResult.latency}ms)`);

    return savedResult;
  }

  /**
   * Update monitor statistics after a check
   * @param {Object} monitor 
   * @param {Object} checkResult 
   */
  static async updateMonitorStats(monitor, checkResult) {
    const previousStatus = monitor.status;
    const newStatus = checkResult.status === 'success' ? 'up' : 'down';

    const updates = {
      status: newStatus,
      lastCheckTime: checkResult.checkedAt,
      lastLatency: checkResult.latency,
      totalChecks: monitor.totalChecks + 1,
      successfulChecks: checkResult.status === 'success' 
        ? monitor.successfulChecks + 1 
        : monitor.successfulChecks
    };

    // Update consecutive failures
    if (checkResult.status === 'failure') {
      updates.consecutiveFailures = monitor.consecutiveFailures + 1;
    } else {
      updates.consecutiveFailures = 0;
    }

    // Calculate next check time
    const nextCheck = new Date(checkResult.checkedAt);
    nextCheck.setMinutes(nextCheck.getMinutes() + monitor.checkInterval);
    updates.nextCheckTime = nextCheck;

    await Monitor.findByIdAndUpdate(monitor._id, updates);

    // Return status change info for alerts
    return {
      previousStatus,
      newStatus,
      statusChanged: previousStatus !== newStatus
    };
  }

  /**
   * Handle alert triggering based on status changes
   * @param {Object} monitor 
   * @param {Object} checkResult 
   */
  static async handleAlerts(monitor, checkResult) {
    const currentStatus = monitor.status;
    const newStatus = checkResult.status === 'success' ? 'up' : 'down';

    // Check if status changed
    const statusChanged = currentStatus !== newStatus && currentStatus !== 'pending';

    if (!statusChanged) {
      return; // No alert needed
    }

    // Don't send alerts if no email recipients configured
    if (!monitor.alertEmails || monitor.alertEmails.length === 0) {
      logger.warn(`No alert emails configured for monitor: ${monitor.name}`);
      return;
    }

    let alertType = null;
    let emailSent = false;
    let emailError = null;

    if (currentStatus === 'up' && newStatus === 'down') {
      // Failure alert
      alertType = 'failure';
      try {
        await EmailService.sendFailureAlert(monitor, checkResult);
        emailSent = true;
        logger.info(`Failure alert sent for monitor: ${monitor.name}`);
      } catch (error) {
        emailError = error.message;
        logger.error(`Failed to send failure alert for ${monitor.name}:`, error.message);
      }
    } else if (currentStatus === 'down' && newStatus === 'up') {
      // Recovery alert
      alertType = 'recovery';
      try {
        await EmailService.sendRecoveryAlert(monitor, checkResult);
        emailSent = true;
        logger.info(`Recovery alert sent for monitor: ${monitor.name}`);
      } catch (error) {
        emailError = error.message;
        logger.error(`Failed to send recovery alert for ${monitor.name}:`, error.message);
      }
    }

    if (alertType) {
      // Log alert in database
      await Alert.create({
        monitorId: monitor._id,
        alertType,
        message: checkResult.errorMessage || 'Monitor status changed',
        recipients: monitor.alertEmails,
        emailSent,
        emailError,
        sentAt: new Date()
      });
    }
  }

  /**
   * Get monitor uptime statistics for a time period
   * @param {String} monitorId 
   * @param {Number} hours - Time period in hours (default: 24)
   * @returns {Object} Statistics
   */
  static async getMonitorStats(monitorId, hours = 24) {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const checks = await CheckResult.find({
      monitorId,
      checkedAt: { $gte: since }
    }).sort({ checkedAt: -1 });

    const total = checks.length;
    const successful = checks.filter(c => c.status === 'success').length;
    const failed = checks.filter(c => c.status === 'failure').length;
    
    const uptimePercentage = total > 0 ? ((successful / total) * 100).toFixed(2) : 0;
    
    const latencies = checks
      .filter(c => c.status === 'success')
      .map(c => c.latency);
    
    const avgLatency = latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0;
    
    const minLatency = latencies.length > 0 ? Math.min(...latencies) : 0;
    const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;

    return {
      period: `${hours}h`,
      totalChecks: total,
      successfulChecks: successful,
      failedChecks: failed,
      uptimePercentage: parseFloat(uptimePercentage),
      avgLatency,
      minLatency,
      maxLatency
    };
  }

  /**
   * Get recent check results for a monitor
   * @param {String} monitorId 
   * @param {Number} limit 
   * @returns {Array} Check results
   */
  static async getRecentChecks(monitorId, limit = 50) {
    return await CheckResult.find({ monitorId })
      .sort({ checkedAt: -1 })
      .limit(limit);
  }
}

export default MonitorService;
