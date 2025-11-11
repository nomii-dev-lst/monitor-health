import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  sendTestEmail,
  getAllSettings,
  getSettingByKey,
  updateSetting
} from '../controllers/settingsController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * POST /api/settings/test-email
 * Send a test email to verify SMTP configuration
 * IMPORTANT: This must come BEFORE /:key route
 */
router.post('/test-email', sendTestEmail);

/**
 * GET /api/settings
 * Get all settings
 */
router.get('/', getAllSettings);

/**
 * GET /api/settings/:key
 * Get a specific setting by key
 */
router.get('/:key', getSettingByKey);

/**
 * PUT /api/settings/:key
 * Update a specific setting
 */
router.put('/:key', updateSetting);

export default router;
