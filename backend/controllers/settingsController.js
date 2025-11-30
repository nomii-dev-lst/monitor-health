import { SettingsRepository } from '../repositories/index.js';
import logger from '../utils/logger.js';

export async function getAllSettings(req, res) {
  try {
    const settings = await SettingsRepository.findAll();

    const settingsObj = {};
    settings.forEach((setting) => {
      settingsObj[setting.key] = setting.value;
    });

    res.json({
      success: true,
      settings: settingsObj,
    });
  } catch (error) {
    logger.error('Error fetching settings', {
      type: 'settings',
      action: 'fetch_all',
      userId: req.user.id,
      error: {
        name: error.name,
        message: error.message,
      },
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
    });
  }
}

export async function getSettingByKey(req, res) {
  try {
    const { key } = req.params;
    const setting = await SettingsRepository.findByKey(key);

    res.json({
      success: true,
      setting: setting || null,
    });
  } catch (error) {
    logger.error('Error fetching setting', {
      type: 'settings',
      action: 'fetch_single',
      userId: req.user.id,
      settingKey: req.params.key,
      error: {
        name: error.name,
        message: error.message,
      },
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch setting',
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
        message: 'Value is required',
      });
    }

    // Prevent storing SMTP settings in database (use .env only)
    if (key === 'smtp') {
      return res.status(400).json({
        success: false,
        message: 'SMTP settings must be configured via backend .env file',
      });
    }

    const setting = await SettingsRepository.upsert(
      key,
      value,
      description || '',
    );

    res.json({
      success: true,
      setting,
      message: 'Setting updated successfully',
    });
  } catch (error) {
    logger.error('Error updating setting', {
      type: 'settings',
      action: 'update',
      userId: req.user.id,
      settingKey: req.params.key,
      error: {
        name: error.name,
        message: error.message,
      },
    });
    res.status(500).json({
      success: false,
      message: 'Failed to update setting',
    });
  }
}
