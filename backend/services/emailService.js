import nodemailer from 'nodemailer';
import { SettingsRepository } from '../repositories/index.js';
import logger from '../utils/logger.js';

/**
 * Email Service for sending alert notifications
 *
 * Supports multiple SMTP providers:
 * - Mailtrap (recommended for testing)
 * - Gmail
 * - SendGrid
 * - AWS SES
 * - Custom SMTP servers
 *
 * Configuration is loaded from backend .env file only
 */

class EmailService {
  constructor() {
    this.transporter = null;
    this.fromAddress = null;
    this.isConfigured = false;
    this.lastError = null;
  }

  /**
   * Initialize email transporter with SMTP settings from .env
   * @returns {Promise<boolean>} Success status
   */
  async initializeTransporter() {
    try {
      logger.info('Initializing email service...');

      // Load configuration from environment variables only
      if (
        !process.env.SMTP_HOST ||
        !process.env.SMTP_PORT ||
        !process.env.SMTP_USER ||
        !process.env.SMTP_PASS
      ) {
        logger.warn(
          'SMTP not configured in .env file. Email alerts are disabled.',
        );
        logger.info(
          'Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in backend .env file.',
        );
        this.isConfigured = false;
        return false;
      }

      logger.info('Using SMTP configuration from environment variables');
      const config = {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        from: process.env.SMTP_FROM || 'noreply@monitorhealth.com',
        rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false',
      };

      // Validate required fields
      if (
        !config.host ||
        !config.port ||
        !config.auth?.user ||
        !config.auth?.pass ||
        !config.from
      ) {
        logger.error(
          'Incomplete SMTP configuration. Required fields: host, port, auth.user, auth.pass, from',
        );
        this.isConfigured = false;
        return false;
      }

      // Log configuration (without password)
      logger.info(
        `Configuring SMTP: ${config.host}:${config.port} (secure: ${config.secure})`,
      );
      logger.info(`SMTP User: ${config.auth.user}`);
      logger.info(`From Address: ${config.from}`);

      // Create transporter with configuration
      this.transporter = nodemailer.createTransport({
        host: config.host,
        port: parseInt(config.port),
        secure: config.secure || false, // true for 465, false for other ports
        auth: {
          user: config.auth.user,
          pass: config.auth.pass,
        },
        // Additional options for better compatibility
        tls: {
          rejectUnauthorized: config.rejectUnauthorized !== false, // Allow self-signed certs if specified
        },
        connectionTimeout: 30000, // 30 seconds (increased from 10)
        greetingTimeout: 30000,
        socketTimeout: 30000,
        // Debug mode for troubleshooting
        debug: process.env.NODE_ENV === 'development',
        logger: process.env.NODE_ENV === 'development',
      });

      this.fromAddress = config.from;

      // Verify SMTP connection
      try {
        logger.info('Verifying SMTP connection...');
        await this.transporter.verify();
        logger.info('✅ Email service initialized successfully');
        logger.info(`📧 SMTP Host: ${config.host}:${config.port}`);
        logger.info(`📤 From Address: ${this.fromAddress}`);
        this.isConfigured = true;
        this.lastError = null;
        return true;
      } catch (verifyError) {
        logger.error('❌ SMTP verification failed:', verifyError.message);

        // Provide helpful error messages
        if (
          verifyError.code === 'ETIMEDOUT' ||
          verifyError.message.includes('timeout')
        ) {
          logger.error('Connection timeout - possible causes:');
          logger.error('  1. Firewall blocking outbound SMTP');
          logger.error('  2. Incorrect host or port');
          logger.error('  3. Network connectivity issues');
        } else if (
          verifyError.code === 'EAUTH' ||
          verifyError.message.includes('authentication')
        ) {
          logger.error('Authentication failed - check username and password');
        } else if (verifyError.code === 'ECONNREFUSED') {
          logger.error(
            'Connection refused - SMTP server may be down or unreachable',
          );
        }

        logger.error('Please check your SMTP credentials in backend .env file');
        this.transporter = null;
        this.isConfigured = false;
        this.lastError = verifyError.message;
        return false;
      }
    } catch (error) {
      logger.error('Failed to initialize email service:', error.message);
      this.transporter = null;
      this.isConfigured = false;
      this.lastError = error.message;
      return false;
    }
  }

  /**
   * Check if email service is properly configured
   * @returns {boolean}
   */
  isReady() {
    return this.isConfigured && this.transporter !== null;
  }

  /**
   * Get service status
   * @returns {Object}
   */
  getStatus() {
    return {
      configured: this.isConfigured,
      ready: this.isReady(),
      fromAddress: this.fromAddress,
      lastError: this.lastError,
    };
  }

  /**
   * Send failure alert email (ONLY for monitor failures)
   * @param {Object} monitor - Monitor object
   * @param {Object} checkResult - Check result object
   * @returns {Promise<boolean>}
   */
  async sendFailureAlert(monitor, checkResult) {
    if (!this.isReady()) {
      logger.warn('Email service not configured. Skipping failure alert.');
      return false;
    }

    try {
      const subject = `🔴 ALERT: "${monitor.name}" is DOWN`;

      const htmlContent = this._generateFailureEmailHTML(monitor, checkResult);
      const textContent = this._generateFailureEmailText(monitor, checkResult);

      const recipients = this._getRecipients(monitor);

      if (recipients.length === 0) {
        logger.warn(`No recipients configured for monitor: ${monitor.name}`);
        return false;
      }

      await this._sendEmail(recipients, subject, textContent, htmlContent);

      logger.info(`✅ Failure alert sent for monitor: ${monitor.name}`);
      return true;
    } catch (error) {
      logger.error(
        `Failed to send failure alert for ${monitor.name}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Send recovery alert email (optional - can be disabled)
   * @param {Object} monitor - Monitor object
   * @param {Object} checkResult - Check result object
   * @returns {Promise<boolean>}
   */
  async sendRecoveryAlert(monitor, checkResult) {
    if (!this.isReady()) {
      logger.warn('Email service not configured. Skipping recovery alert.');
      return false;
    }

    try {
      // Check if recovery alerts are enabled (optional setting)
      const sendRecoveryAlerts = await this._shouldSendRecoveryAlerts();

      if (!sendRecoveryAlerts) {
        logger.info(
          `Recovery alerts disabled. Skipping for monitor: ${monitor.name}`,
        );
        return false;
      }

      const subject = `🟢 RECOVERED: "${monitor.name}" is UP`;

      const htmlContent = this._generateRecoveryEmailHTML(monitor, checkResult);
      const textContent = this._generateRecoveryEmailText(monitor, checkResult);

      const recipients = this._getRecipients(monitor);

      if (recipients.length === 0) {
        logger.warn(`No recipients configured for monitor: ${monitor.name}`);
        return false;
      }

      await this._sendEmail(recipients, subject, textContent, htmlContent);

      logger.info(`✅ Recovery alert sent for monitor: ${monitor.name}`);
      return true;
    } catch (error) {
      logger.error(
        `Failed to send recovery alert for ${monitor.name}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Send test email to verify SMTP configuration
   * @param {string} testEmail - Email address to send test to
   * @returns {Promise<boolean>}
   */
  async sendTestEmail(testEmail) {
    if (!this.transporter) {
      await this.initializeTransporter();
    }

    if (!this.isReady()) {
      throw new Error(
        'Email service is not configured. Please configure SMTP settings first.',
      );
    }

    const subject = '✅ MonitorHealth - SMTP Test Successful';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; border-radius: 5px; text-align: center; }
          .content { background: #f9fafb; padding: 20px; border-radius: 5px; margin-top: 20px; }
          .success { color: #10b981; font-size: 48px; text-align: center; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 SMTP Configuration Test</h1>
          </div>
          <div class="content">
            <div class="success">✅</div>
            <h2 style="text-align: center;">Success!</h2>
            <p>Your SMTP configuration is working correctly. MonitorHealth can now send email alerts.</p>
            <p><strong>Configuration Details:</strong></p>
            <ul>
              <li>From Address: ${this.fromAddress}</li>
              <li>Test Email: ${testEmail}</li>
              <li>Timestamp: ${new Date().toLocaleString()}</li>
            </ul>
            <p>You will receive email alerts when your monitors fail.</p>
          </div>
          <div class="footer">
            <p>This is an automated test email from MonitorHealth</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
MonitorHealth - SMTP Test Successful

✅ Your SMTP configuration is working correctly!

Configuration Details:
- From Address: ${this.fromAddress}
- Test Email: ${testEmail}
- Timestamp: ${new Date().toLocaleString()}

You will receive email alerts when your monitors fail.

---
This is an automated test email from MonitorHealth
    `.trim();

    await this._sendEmail([testEmail], subject, textContent, htmlContent);

    logger.info(`✅ Test email sent successfully to: ${testEmail}`);
    return true;
  }

  /**
   * Get recipients for a monitor
   * @private
   * @param {Object} monitor
   * @returns {Array<string>}
   */
  _getRecipients(monitor) {
    let recipients = [];

    // Use monitor-specific emails if configured
    if (monitor.alertEmails && monitor.alertEmails.length > 0) {
      recipients = monitor.alertEmails;
    }

    return recipients.filter((email) => email && email.trim() !== '');
  }

  /**
   * Check if recovery alerts should be sent
   * @private
   * @returns {Promise<boolean>}
   */
  async _shouldSendRecoveryAlerts() {
    try {
      const setting = await SettingsRepository.findByKey('sendRecoveryAlerts');
      return setting?.value !== false; // Default to true if not set
    } catch (error) {
      logger.error('Failed to check recovery alerts setting:', error);
      return true; // Default to true on error
    }
  }

  /**
   * Generate HTML email content for failure alert
   * @private
   */
  _generateFailureEmailHTML(monitor, checkResult) {
    const metadata = checkResult.responseMetadata || {};

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ef4444; color: white; padding: 20px; border-radius: 5px; }
          .content { background: #f9fafb; padding: 20px; border-radius: 5px; margin-top: 20px; }
          .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .label { font-weight: bold; color: #6b7280; }
          .value { color: #111827; }
          .error-box { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 15px 0; border-radius: 4px; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          .status-badge { display: inline-block; padding: 5px 10px; border-radius: 4px; font-weight: bold; }
          .status-down { background: #fee2e2; color: #991b1b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔴 Monitor Alert: DOWN</h1>
            <h2 style="margin: 10px 0 0 0;">${monitor.name}</h2>
          </div>
          
          <div class="content">
            <div class="info-row">
              <span class="label">Monitor:</span>
              <span class="value">${monitor.name}</span>
            </div>
            <div class="info-row">
              <span class="label">URL:</span>
              <span class="value">${monitor.url}</span>
            </div>
            <div class="info-row">
              <span class="label">Status:</span>
              <span class="value"><span class="status-badge status-down">DOWN</span></span>
            </div>
            <div class="info-row">
              <span class="label">Time:</span>
              <span class="value">${new Date(checkResult.checkedAt).toLocaleString()}</span>
            </div>
            <div class="info-row">
              <span class="label">HTTP Status:</span>
              <span class="value">${checkResult.httpStatus || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Latency:</span>
              <span class="value">${checkResult.latency}ms</span>
            </div>
            
            ${
              metadata.server
                ? `
            <div class="info-row">
              <span class="label">Server:</span>
              <span class="value">${metadata.server}</span>
            </div>
            `
                : ''
            }
            
            <div class="error-box">
              <h3 style="margin-top: 0; color: #991b1b;">Error Details:</h3>
              <p>${checkResult.errorMessage || 'Unknown error'}</p>
              
              ${
                checkResult.validationErrors &&
                checkResult.validationErrors.length > 0
                  ? `
                <h4>Validation Errors:</h4>
                <ul>
                  ${checkResult.validationErrors.map((err) => `<li>${err}</li>`).join('')}
                </ul>
              `
                  : ''
              }
            </div>
            
            ${
              checkResult.responseData
                ? `
              <div style="margin-top: 15px;">
                <h4>Response Preview:</h4>
                <pre style="background: #1f2937; color: #f3f4f6; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 12px;">${checkResult.responseData.substring(0, 500)}${checkResult.responseData.length > 500 ? '...' : ''}</pre>
              </div>
            `
                : ''
            }
          </div>
          
          <div class="footer">
            <p>This is an automated alert from MonitorHealth</p>
            <p>You are receiving this because you are subscribed to alerts for this monitor</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text email content for failure alert
   * @private
   */
  _generateFailureEmailText(monitor, checkResult) {
    const metadata = checkResult.responseMetadata || {};

    return `
🔴 MONITOR ALERT: DOWN

Monitor: ${monitor.name}
URL: ${monitor.url}
Status: FAILURE
Time: ${new Date(checkResult.checkedAt).toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ERROR DETAILS:
${checkResult.errorMessage || 'Unknown error'}

HTTP Status: ${checkResult.httpStatus || 'N/A'}
Latency: ${checkResult.latency}ms
${metadata.server ? `Server: ${metadata.server}` : ''}
${metadata.contentType ? `Content-Type: ${metadata.contentType}` : ''}

${
  checkResult.validationErrors && checkResult.validationErrors.length > 0
    ? `
VALIDATION ERRORS:
${checkResult.validationErrors.map((err, i) => `${i + 1}. ${err}`).join('\n')}
`
    : ''
}

${
  checkResult.responseData
    ? `
RESPONSE PREVIEW:
${checkResult.responseData.substring(0, 300)}${checkResult.responseData.length > 300 ? '...' : ''}
`
    : ''
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is an automated alert from MonitorHealth.
You are receiving this because you are subscribed to alerts for this monitor.
    `.trim();
  }

  /**
   * Generate HTML email content for recovery alert
   * @private
   */
  _generateRecoveryEmailHTML(monitor, checkResult) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; border-radius: 5px; }
          .content { background: #f9fafb; padding: 20px; border-radius: 5px; margin-top: 20px; }
          .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .label { font-weight: bold; color: #6b7280; }
          .value { color: #111827; }
          .success-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 15px 0; border-radius: 4px; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          .status-badge { display: inline-block; padding: 5px 10px; border-radius: 4px; font-weight: bold; }
          .status-up { background: #d1fae5; color: #065f46; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🟢 Monitor Recovered: UP</h1>
            <h2 style="margin: 10px 0 0 0;">${monitor.name}</h2>
          </div>
          
          <div class="content">
            <div class="success-box">
              <h3 style="margin-top: 0; color: #065f46;">✅ Service Recovered</h3>
              <p>The monitor is now responding successfully.</p>
            </div>
            
            <div class="info-row">
              <span class="label">Monitor:</span>
              <span class="value">${monitor.name}</span>
            </div>
            <div class="info-row">
              <span class="label">URL:</span>
              <span class="value">${monitor.url}</span>
            </div>
            <div class="info-row">
              <span class="label">Status:</span>
              <span class="value"><span class="status-badge status-up">UP</span></span>
            </div>
            <div class="info-row">
              <span class="label">Recovery Time:</span>
              <span class="value">${new Date(checkResult.checkedAt).toLocaleString()}</span>
            </div>
            <div class="info-row">
              <span class="label">HTTP Status:</span>
              <span class="value">${checkResult.httpStatus}</span>
            </div>
            <div class="info-row">
              <span class="label">Latency:</span>
              <span class="value">${checkResult.latency}ms</span>
            </div>
          </div>
          
          <div class="footer">
            <p>This is an automated alert from MonitorHealth</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text email content for recovery alert
   * @private
   */
  _generateRecoveryEmailText(monitor, checkResult) {
    return `
🟢 MONITOR RECOVERED: UP

Monitor: ${monitor.name}
URL: ${monitor.url}
Status: RECOVERED
Time: ${new Date(checkResult.checkedAt).toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ The service is now responding successfully.

HTTP Status: ${checkResult.httpStatus}
Latency: ${checkResult.latency}ms

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is an automated alert from MonitorHealth.
    `.trim();
  }

  /**
   * Send email via SMTP
   * @private
   * @param {Array<string>} recipients
   * @param {string} subject
   * @param {string} textContent
   * @param {string} htmlContent
   * @returns {Promise<void>}
   */
  async _sendEmail(recipients, subject, textContent, htmlContent) {
    if (!this.transporter) {
      throw new Error('Email transporter not initialized');
    }

    if (!recipients || recipients.length === 0) {
      throw new Error('No recipients specified');
    }

    const mailOptions = {
      from: this.fromAddress,
      to: recipients.join(', '),
      subject: subject,
      text: textContent,
      html: htmlContent,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(
        `📧 Email sent to ${recipients.join(', ')}: ${info.messageId}`,
      );
      return info;
    } catch (error) {
      logger.error('Failed to send email:', error.message);
      throw error;
    }
  }
}

// Export singleton instance
const emailService = new EmailService();
export default emailService;
