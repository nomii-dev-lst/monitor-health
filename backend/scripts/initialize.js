import { User, Settings } from '../models/index.js';
import logger from '../utils/logger.js';

/**
 * Initialize application on first run
 * Creates default admin user and settings
 */

export async function initializeApp() {
  try {
    // Create default admin user if no users exist
    const userCount = await User.countDocuments();
    
    if (userCount === 0) {
      const defaultAdmin = await User.create({
        username: process.env.DEFAULT_ADMIN_USERNAME || 'admin',
        password: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
        email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com',
        role: 'admin'
      });

      logger.info(`✓ Default admin user created: ${defaultAdmin.username}`);
      logger.warn(`⚠ Please change default password after first login!`);
    }

    // Create default SMTP settings if not exist
    const smtpSettings = await Settings.findOne({ key: 'smtp' });
    
    if (!smtpSettings) {
      await Settings.create({
        key: 'smtp',
        value: {
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASS || ''
          },
          from: process.env.SMTP_FROM || 'noreply@monitorhealth.com'
        },
        description: 'SMTP email configuration'
      });

      logger.info('✓ Default SMTP settings created');
    }

    // Create default alert settings
    const alertSettings = await Settings.findOne({ key: 'alerts' });
    
    if (!alertSettings) {
      await Settings.create({
        key: 'alerts',
        value: {
          suppressionTime: 300, // seconds (5 minutes)
          retryCount: 3,
          enabled: true
        },
        description: 'Alert configuration'
      });

      logger.info('✓ Default alert settings created');
    }

    logger.info('✓ Application initialized successfully');

  } catch (error) {
    logger.error('Failed to initialize application:', error);
    throw error;
  }
}

export default initializeApp;
