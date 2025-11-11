import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getDashboardSummary } from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/summary', authenticateToken, getDashboardSummary);

export default router;
