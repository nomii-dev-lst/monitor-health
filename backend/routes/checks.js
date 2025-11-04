import express from 'express';
import { CheckResult } from '../models/index.js';
import { authenticateToken } from '../middleware/auth.js';
import MonitorService from '../services/monitorService.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/checks/:monitorId
 * Get check history for a monitor
 * Query params: limit (default: 50), offset (default: 0)
 */
router.get('/:monitorId', async (req, res) => {
  try {
    const { monitorId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const checks = await CheckResult.find({ monitorId })
      .sort({ checkedAt: -1 })
      .skip(offset)
      .limit(limit);

    const totalCount = await CheckResult.countDocuments({ monitorId });

    res.json({
      success: true,
      checks,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });
  } catch (error) {
    console.error('Error fetching check history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch check history'
    });
  }
});

/**
 * GET /api/checks/:monitorId/stats
 * Get uptime and latency statistics for a monitor
 * Query params: hours (default: 24)
 */
router.get('/:monitorId/stats', async (req, res) => {
  try {
    const { monitorId } = req.params;
    const hours = parseInt(req.query.hours) || 24;

    const stats = await MonitorService.getMonitorStats(monitorId, hours);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching monitor stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monitor statistics'
    });
  }
});

/**
 * GET /api/checks/:monitorId/chart
 * Get time-series data for charts
 * Query params: hours (default: 24), interval (default: 60 minutes)
 */
router.get('/:monitorId/chart', async (req, res) => {
  try {
    const { monitorId } = req.params;
    const hours = parseInt(req.query.hours) || 24;

    const since = new Date();
    since.setHours(since.getHours() - hours);

    const checks = await CheckResult.find({
      monitorId,
      checkedAt: { $gte: since }
    }).sort({ checkedAt: 1 });

    // Format data for charts
    const chartData = checks.map(check => ({
      timestamp: check.checkedAt,
      latency: check.latency,
      status: check.status,
      httpStatus: check.httpStatus
    }));

    res.json({
      success: true,
      data: chartData
    });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chart data'
    });
  }
});

export default router;
