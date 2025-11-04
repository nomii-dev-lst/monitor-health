import nodemailer from 'nodemailer';
import { Settings } from '../models/index.js';
import logger from '../utils/logger.js';

/**
 * Email service for sending alert notifications via SMTP
 */

export class EmailService {
  static transporter = null;

  /**
   * Initialize email transporter with settings from database
   */
  static async initializeTransporter() {
    try {
      // Fetch SMTP settings from database
      const smtpSettings = await Settings.findOne({ key: 'smtp' });
      
      let config;
      
      if (smtpSettings && smtpSettings.value) {
        config = smtpSettings.value;
      } else {
        // Fallback to environment variables
        config = {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          },
          from: process.env.SMTP_FROM || 'noreply@monitorhealth.com'
        };
      }

      this.transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.auth
      });

      this.fromAddress = config.from;

      // Verify connection
      await this.transporter.verify();
      logger.info('Email service initialized successfully');
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize email service:', error.message);
      this.transporter = null;
      return false;
    }
  }

  /**
   * Send failure alert email
   * @param {Object} monitor - Monitor document
   * @param {Object} checkResult - Check result document
   */
  static async sendFailureAlert(monitor, checkResult) {
    const subject = `🔴 Monitor Alert: "${monitor.name}" is DOWN`;
    
    const message = `
Monitor: ${monitor.name}
URL: ${monitor.url}
Status: FAILURE
Time: ${new Date(checkResult.checkedAt).toLocaleString()}

Error Details:
${checkResult.errorMessage || 'Unknown error'}

HTTP Status: ${checkResult.httpStatus || 'N/A'}
Latency: ${checkResult.latency}ms

Validation Errors:
${checkResult.validationErrors && checkResult.validationErrors.length > 0 
  ? checkResult.validationErrors.join('\n') 
  : 'None'}

---
This is an automated alert from MonitorHealth.
    `.trim();

    return await this.sendEmail(monitor.alertEmails, subject, message);
  }

  /**
   * Send recovery alert email
   * @param {Object} monitor - Monitor document
   * @param {Object} checkResult - Check result document
   */
  static async sendRecoveryAlert(monitor, checkResult) {
    const subject = `🟢 Monitor Recovered: "${monitor.name}" is UP`;
    
    const message = `
Monitor: ${monitor.name}
URL: ${monitor.url}
Status: RECOVERED
Time: ${new Date(checkResult.checkedAt).toLocaleString()}

The service is now responding successfully.

HTTP Status: ${checkResult.httpStatus}
Latency: ${checkResult.latency}ms

---
This is an automated alert from MonitorHealth.
    `.trim();

    return await this.sendEmail(monitor.alertEmails, subject, message);
  }

  /**
   * Send email via SMTP
   * @param {Array} recipients - Array of email addresses
   * @param {String} subject 
   * @param {String} message 
   */
  static async sendEmail(recipients, subject, message) {
    if (!this.transporter) {
      await this.initializeTransporter();
    }

    if (!this.transporter) {
      throw new Error('Email transporter not initialized');
    }

    if (!recipients || recipients.length === 0) {
      logger.warn('No recipients specified for email');
      return false;
    }

    try {
      const mailOptions = {
        from: this.fromAddress,
        to: recipients.join(', '),
        subject: subject,
        text: message
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent to ${recipients.join(', ')}: ${info.messageId}`);
      
      return true;
    } catch (error) {
      logger.error('Failed to send email:', error.message);
      throw error;
    }
  }

  /**
   * Test email configuration
   * @param {String} testEmail - Email address to send test to
   */
  static async sendTestEmail(testEmail) {
    const subject = 'MonitorHealth - Test Email';
    const message = 'This is a test email from MonitorHealth. Your SMTP configuration is working correctly!';
    
    return await this.sendEmail([testEmail], subject, message);
  }
}

export default EmailService;
