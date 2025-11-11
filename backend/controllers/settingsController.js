import { SettingsRepository } from '../repositories/index.js';
import EmailService from '../services/emailService.js';

export async function sendTestEmail(req, res) {
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
}

export async function getAllSettings(req, res) {
  try {
    const settings = await SettingsRepository.findAll();

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
}

export async function getSettingByKey(req, res) {
  try {
    const { key } = req.params;
    const setting = await SettingsRepository.findByKey(key);

    res.json({
      success: true,
      setting: setting || null
    });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch setting'
    });
  }
}

export async function updateSetting(req, res) {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Value is required'
      });
    }

    // Prevent storing SMTP settings in database (use .env only)
    if (key === 'smtp') {
      return res.status(400).json({
        success: false,
        message: 'SMTP settings must be configured via backend .env file'
      });
    }

    const setting = await SettingsRepository.upsert(key, value, description || '');

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
}
