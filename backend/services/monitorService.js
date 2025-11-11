import axios from 'axios';
import { URL } from 'url';
import {
  MonitorRepository,
  CheckResultRepository,
  AlertRepository,
  SettingsRepository,
} from '../repositories/index.js';
import AuthService from './authService.js';
import EmailService from './emailService.js';
import sseService from './sseService.js';
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

    // Fetch monitor if ID is provided (number or string)
    if (typeof monitorId === 'string' || typeof monitorId === 'number') {
      const id =
        typeof monitorId === 'string' ? parseInt(monitorId) : monitorId;
      monitor = await MonitorRepository.findById(id);
      if (!monitor) {
        throw new Error(`Monitor not found: ${monitorId}`);
      }
    } else {
      // Assume it's a monitor document
      monitor = monitorId;
    }

    logger.info(
      `Executing check for monitor: ${monitor.name} (ID: ${monitor.id})`,
    );

    logger.info(`Monitor URL: "${monitor.url || '(undefined)'}"`);

    // Early validation - check if URL exists
    if (!monitor.url || monitor.url.trim() === '') {
      logger.error(`Monitor "${monitor.name}" has no URL configured!`);
      throw new Error(
        'Monitor URL is not configured. Please edit the monitor and add a valid URL.',
      );
    }

    const startTime = Date.now();
    const checkResult = {
      monitorId: monitor.id,
      status: 'failure',
      httpStatus: null,
      latency: 0,
      errorMessage: null,
      validationErrors: [],
      responseData: null,
      checkedAt: new Date(),
    };

    try {
      // Step 1: Sanitize and validate URL
      const sanitizedUrl = (monitor.url || '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // remove zero-width/invisible chars
        .trim();
      try {
        // throws if invalid

        new URL(sanitizedUrl);
      } catch (e) {
        throw new Error(`Invalid URL: ${sanitizedUrl || '(empty)'} ${e}`);
      }

      // Step 2: Authenticate if required
      const authData = await AuthService.authenticate(monitor);

      // Step 3: Make HTTP request
      const response = await axios({
        method: 'GET',
        url: sanitizedUrl,
        headers: {
          ...authData.headers,
          'User-Agent': 'MonitorHealth/1.0',
          ...(authData.cookies && { Cookie: authData.cookies }),
        },
        timeout: process.env.REQUEST_TIMEOUT || 30000,
        validateStatus: () => true, // Accept any status code
      });

      const endTime = Date.now();
      checkResult.latency = endTime - startTime;
      checkResult.httpStatus = response.status;

      // Store response data (truncated to 2000 chars for storage)
      const responseStr = JSON.stringify(response.data);
      checkResult.responseData = responseStr.substring(0, 2000);

      // Store response metadata
      checkResult.responseMetadata = {
        statusText: response.statusText,
        contentType: response.headers?.['content-type'] || 'unknown',
        contentLength: response.headers?.['content-length'] || 'unknown',
        server: response.headers?.['server'] || 'unknown',
        date: response.headers?.['date'] || new Date().toISOString(),
        responseSize: responseStr.length,
      };

      logger.info(
        `Response received: HTTP ${response.status}, ${response.data ? typeof response.data : 'null'} type, ${responseStr.length} chars`,
      );

      // Step 3: Validate response
      const validation = ResponseValidator.validate(
        response,
        monitor.validationRules,
      );

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

      // Enhanced error details
      if (error.response) {
        // HTTP error response (4xx, 5xx)
        checkResult.httpStatus = error.response.status;
        checkResult.responseData = JSON.stringify(
          error.response.data,
        ).substring(0, 2000);

        const contentType =
          error.response.headers?.['content-type'] || 'unknown';
        const server = error.response.headers?.['server'] || 'unknown';
        const bodyPreview =
          typeof error.response.data === 'string'
            ? error.response.data.substring(0, 200).replace(/\s+/g, ' ').trim()
            : JSON.stringify(error.response.data).substring(0, 200);

        checkResult.errorMessage =
          `HTTP ${error.response.status} ${error.response.statusText}. ` +
          `Server: ${server}, Content-Type: ${contentType}. ` +
          `Response: ${bodyPreview}${error.response.data?.length > 200 ? '...' : ''}`;

        checkResult.validationErrors = [
          `Status: ${error.response.status} ${error.response.statusText}`,
          `Server: ${server}`,
          `Content-Type: ${contentType}`,
          `Response preview: ${bodyPreview}`,
        ];
      } else if (error.code) {
        // Network/connection error
        checkResult.errorMessage = `${error.code}: ${error.message}`;
        checkResult.validationErrors = [
          `Error Code: ${error.code}`,
          `Message: ${error.message}`,
          error.syscall ? `System Call: ${error.syscall}` : null,
          error.address
            ? `Address: ${error.address}:${error.port || 'N/A'}`
            : null,
        ].filter(Boolean);
      } else {
        // Other errors
        checkResult.errorMessage = error.message;
        checkResult.validationErrors = [error.message];
      }

      logger.error(
        `Check failed for ${monitor?.name || monitor?.id || 'unknown'}:`,
        error.message,
      );
    }

    // Step 4: Save check result
    const savedResult = await CheckResultRepository.create(checkResult);

    // Step 5: Update monitor statistics
    await this.updateMonitorStats(monitor, checkResult);

    // Step 6: Handle alerts
    await this.handleAlerts(monitor, checkResult);

    // Step 7: Emit real-time log event via SSE (only to monitor owner)
    sseService.emitLog(monitor.userId, {
      id: savedResult.id,
      monitorId: monitor.id,
      monitorName: monitor.name,
      monitorUrl: monitor.url,
      status: checkResult.status,
      httpStatus: checkResult.httpStatus,
      latency: checkResult.latency,
      errorMessage: checkResult.errorMessage,
      validationErrors: checkResult.validationErrors,
      responseData: checkResult.responseData,
      responseMetadata: checkResult.responseMetadata,
      checkedAt: checkResult.checkedAt,
    });

    // Step 8: Calculate and emit updated stats via SSE (only to monitor owner)
    await this.calculateAndEmitStats(monitor.userId);

    logger.info(
      `Check completed for ${monitor.name}: ${checkResult.status} (${checkResult.latency}ms)`,
    );

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

    // Safeguard against undefined/NaN numeric fields on legacy docs
    const prevTotalChecks =
      typeof monitor.totalChecks === 'number' && !isNaN(monitor.totalChecks)
        ? monitor.totalChecks
        : 0;
    const prevSuccessfulChecks =
      typeof monitor.successfulChecks === 'number' &&
      !isNaN(monitor.successfulChecks)
        ? monitor.successfulChecks
        : 0;
    const prevConsecutiveFailures =
      typeof monitor.consecutiveFailures === 'number' &&
      !isNaN(monitor.consecutiveFailures)
        ? monitor.consecutiveFailures
        : 0;

    const updates = {
      status: newStatus,
      lastCheckTime: checkResult.checkedAt,
      lastLatency: checkResult.latency,
      totalChecks: prevTotalChecks + 1,
      successfulChecks:
        checkResult.status === 'success'
          ? prevSuccessfulChecks + 1
          : prevSuccessfulChecks,
    };

    // Update consecutive failures
    if (checkResult.status === 'failure') {
      updates.consecutiveFailures = prevConsecutiveFailures + 1;
    } else {
      updates.consecutiveFailures = 0;
    }

    // Do not overwrite nextCheckTime here; the scheduler pre-schedules the next run
    // based on the start time to keep cadence close to the configured interval.

    await MonitorRepository.updateStats(monitor.id, {
      status: updates.status,
      lastCheckTime: updates.lastCheckTime,
      lastLatency: updates.lastLatency,
      consecutiveFailures: updates.consecutiveFailures,
      isSuccess: checkResult.status === 'success',
    });

    // Return status change info for alerts
    return {
      previousStatus,
      newStatus,
      statusChanged: previousStatus !== newStatus,
    };
  }

  /**
   * Handle alert triggering based on status changes
   * ONLY sends alerts for monitor failures (not recoveries by default)
   * @param {Object} monitor
   * @param {Object} checkResult
   */
  static async handleAlerts(monitor, checkResult) {
    const currentStatus = monitor.status;
    const newStatus = checkResult.status === 'success' ? 'up' : 'down';

    // Check if status changed
    const statusChanged =
      currentStatus !== newStatus && currentStatus !== 'pending';

    if (!statusChanged) {
      return; // No alert needed - status hasn't changed
    }

    // Get alert recipients - use monitor emails or default from settings
    let recipients = monitor.alertEmails || [];

    // If no recipients on monitor, check for default alert email in settings
    if (recipients.length === 0) {
      try {
        const defaultEmailSetting =
          await SettingsRepository.findByKey('defaultAlertEmail');
        if (defaultEmailSetting && defaultEmailSetting.value) {
          recipients = [defaultEmailSetting.value];
          logger.info(`Using default alert email for monitor: ${monitor.name}`);
        }
      } catch (error) {
        logger.error('Error fetching default alert email:', error.message);
      }
    }

    // Don't send alerts if no email recipients configured
    if (recipients.length === 0) {
      logger.warn(
        `⚠️  No alert emails configured for monitor: ${monitor.name}`,
      );
      logger.info(
        'Configure alert emails in monitor settings or set a default email in Settings page',
      );
      return;
    }

    // Temporarily update monitor object with recipients for email service
    const monitorWithRecipients = { ...monitor, alertEmails: recipients };

    let alertType = null;
    let emailSent = false;
    let emailError = null;

    // FAILURE ALERT - Monitor went DOWN
    if (currentStatus === 'up' && newStatus === 'down') {
      alertType = 'failure';
      logger.warn(`🔴 Monitor FAILED: ${monitor.name}`);

      try {
        await EmailService.sendFailureAlert(monitorWithRecipients, checkResult);
        emailSent = true;
        logger.info(`✅ Failure alert email sent for monitor: ${monitor.name}`);
      } catch (error) {
        emailError = error.message;
        logger.error(
          `❌ Failed to send failure alert email for ${monitor.name}:`,
          error.message,
        );
      }
    }
    // RECOVERY ALERT - Monitor came back UP (optional)
    else if (currentStatus === 'down' && newStatus === 'up') {
      alertType = 'recovery';
      logger.info(`🟢 Monitor RECOVERED: ${monitor.name}`);

      try {
        // Recovery alerts are optional and controlled by email service
        await EmailService.sendRecoveryAlert(
          monitorWithRecipients,
          checkResult,
        );
        emailSent = true;
        logger.info(
          `✅ Recovery alert email sent for monitor: ${monitor.name}`,
        );
      } catch (error) {
        emailError = error.message;
        // Don't log as error since recovery alerts are optional
        logger.info(
          `Recovery alert not sent for ${monitor.name}: ${error.message}`,
        );
      }
    }

    // Log alert in database for audit trail
    if (alertType) {
      try {
        await AlertRepository.create({
          monitorId: monitor.id,
          alertType,
          message: checkResult.errorMessage || 'Monitor status changed',
          recipients: recipients,
          emailSent,
          emailError,
          sentAt: new Date(),
        });
      } catch (error) {
        logger.error('Failed to log alert in database:', error.message);
      }
    }
  }

  /**
   * Get monitor uptime statistics for a time period
   * @param {String} monitorId
   * @param {Number} hours - Time period in hours (default: 24)
   * @returns {Object} Statistics
   */
  static async getMonitorStats(monitorId, hours = 24) {
    const id = typeof monitorId === 'string' ? parseInt(monitorId) : monitorId;
    return await CheckResultRepository.getStats(id, hours);
  }

  /**
   * Get recent check results for a monitor
   * @param {String} monitorId
   * @param {Number} limit
   * @returns {Array} Check results
   */
  static async getRecentChecks(monitorId, limit = 50) {
    const id = typeof monitorId === 'string' ? parseInt(monitorId) : monitorId;
    return await CheckResultRepository.findRecent(id, limit);
  }

  /**
   * Calculate log statistics for a specific user and emit via SSE
   * @param {Number} userId - User ID to calculate stats for
   * @param {Number} hours - Time period in hours (default: 24)
   */
  static async calculateAndEmitStats(userId, hours = 24) {
    try {
      const { getDb, schema } = await import('../db/index.js');
      const { gte, and, inArray } = await import('drizzle-orm');
      const { MonitorRepository } = await import('../repositories/index.js');
      const db = getDb();
      const { checkResults } = schema;

      // Get user's monitor IDs
      const userMonitors = await MonitorRepository.findByUserId(userId);
      const monitorIds = userMonitors.map((m) => m.id);

      if (monitorIds.length === 0) {
        // No monitors for this user, emit empty stats
        sseService.emitStats(userId, {
          period: `${hours}h`,
          totalChecks: 0,
          successfulChecks: 0,
          failedChecks: 0,
          successRate: '0',
          avgLatency: 0,
        });
        return;
      }

      const since = new Date();
      since.setHours(since.getHours() - hours);

      // Only get check results for user's monitors
      const recentLogs = await db
        .select()
        .from(checkResults)
        .where(
          and(
            inArray(checkResults.monitorId, monitorIds),
            gte(checkResults.checkedAt, since),
          ),
        );

      const totalChecks = recentLogs.length;
      const successfulChecks = recentLogs.filter(
        (log) => log.status === 'success',
      ).length;
      const failedChecks = recentLogs.filter(
        (log) => log.status === 'failure',
      ).length;

      const latencies = recentLogs
        .filter((log) => log.status === 'success' && log.latency)
        .map((log) => log.latency);

      const avgLatency =
        latencies.length > 0
          ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
          : 0;

      const stats = {
        period: `${hours}h`,
        totalChecks,
        successfulChecks,
        failedChecks,
        successRate:
          totalChecks > 0
            ? ((successfulChecks / totalChecks) * 100).toFixed(2)
            : '0',
        avgLatency,
      };

      // Emit stats via SSE (only to this user)
      sseService.emitStats(userId, stats);

      return stats;
    } catch (error) {
      logger.error('Failed to calculate and emit stats:', error);
    }
  }

}

export default MonitorService;
