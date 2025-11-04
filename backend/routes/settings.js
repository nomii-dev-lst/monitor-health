import express from 'express';
import { Settings } from '../models/index.js';
import { authenticateToken } from '../middleware/auth.js';
import EmailService from '../services/emailService.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/settings
 * Get all settings
 */
router.get('/', async (req, res) => {
  try {
    const settings = await Settings.find();

    // Convert to key-value object
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });

    res.json({
      success: true,
      settings: settingsObj
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings'
    });
  }
});

/**
 * PUT /api/settings/:key
 * Update a specific setting
 */
router.put('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Value is required'
      });
    }

    const setting = await Settings.findOneAndUpdate(
      { key },
      { value, description: description || '' },
      { upsert: true, new: true }
    );

    // If SMTP settings updated, reinitialize email service
    if (key === 'smtp') {
      await EmailService.initializeTransporter();
    }

    res.json({
      success: true,
      setting,
      message: 'Setting updated successfully'
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update setting'
    });
  }
});

/**
 * POST /api/settings/test-email
 * Send a test email to verify SMTP configuration
 */
router.post('/test-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      });
    }

    await EmailService.sendTestEmail(email);

    res.json({
      success: true,
      message: 'Test email sent successfully'
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message
    });
  }
});

/**
 * GET /api/settings/smtp
 * Get SMTP settings (without exposing password)
 */
router.get('/smtp', async (req, res) => {
  try {
    const smtpSettings = await Settings.findOne({ key: 'smtp' });

    if (!smtpSettings) {
      return res.json({
        success: true,
        smtp: null
      });
    }

    // Don't expose password
    const safeSettings = { ...smtpSettings.value };
    if (safeSettings.auth && safeSettings.auth.pass) {
      safeSettings.auth.pass = '********';
    }

    res.json({
      success: true,
      smtp: safeSettings
    });
  } catch (error) {
    console.error('Error fetching SMTP settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SMTP settings'
    });
  }
});

export default router;
