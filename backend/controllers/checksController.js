import { count } from 'drizzle-orm';
import { getDb, schema } from '../db/index.js';
import MonitorService from '../services/monitorService.js';
import { MonitorRepository } from '../repositories/index.js';
import logger from '../utils/logger.js';

const { checkResults } = schema;

export async function getMonitorChecks(req, res) {
  try {
    const monitorId = parseInt(req.params.monitorId);
    if (isNaN(monitorId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid monitor ID',
      });
    }

    // Verify monitor belongs to current user
    const monitor = await MonitorRepository.findById(monitorId);
    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found',
      });
    }
    if (monitor.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const db = getDb();
    const { eq, desc } = await import('drizzle-orm');

    const checks = await db
      .select()
      .from(checkResults)
      .where(eq(checkResults.monitorId, monitorId))
      .orderBy(desc(checkResults.checkedAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: count() })
      .from(checkResults)
      .where(eq(checkResults.monitorId, monitorId));

    res.json({
      success: true,
      checks,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    logger.error('Error fetching check history', {
      type: 'check',
      action: 'fetch_history',
      monitorId: req.params.monitorId,
      userId: req.user.id,
      error: {
        name: error.name,
        message: error.message,
      },
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch check history',
    });
  }
}

export async function getMonitorStats(req, res) {
  try {
    const monitorId = parseInt(req.params.monitorId);
    if (isNaN(monitorId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid monitor ID',
      });
    }

    // Verify monitor belongs to current user
    const monitor = await MonitorRepository.findById(monitorId);
    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found',
      });
    }
    if (monitor.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const hours = parseInt(req.query.hours) || 24;

    const stats = await MonitorService.getMonitorStats(monitorId, hours);

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error('Error fetching monitor stats', {
      type: 'check',
      action: 'fetch_stats',
      monitorId: req.params.monitorId,
      userId: req.user.id,
      error: {
        name: error.name,
        message: error.message,
      },
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monitor statistics',
    });
  }
}

export async function getMonitorChart(req, res) {
  try {
    const monitorId = parseInt(req.params.monitorId);
    if (isNaN(monitorId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid monitor ID',
      });
    }

    // Verify monitor belongs to current user
    const monitor = await MonitorRepository.findById(monitorId);
    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found',
      });
    }
    if (monitor.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const hours = parseInt(req.query.hours) || 24;

    const since = new Date();
    since.setHours(since.getHours() - hours);

    const db = getDb();
    const { eq, gte, and, asc } = await import('drizzle-orm');

    const checks = await db
      .select()
      .from(checkResults)
      .where(
        and(
          eq(checkResults.monitorId, monitorId),
          gte(checkResults.checkedAt, since),
        ),
      )
      .orderBy(asc(checkResults.checkedAt));

    const chartData = checks.map((check) => ({
      timestamp: check.checkedAt,
      latency: check.latency,
      status: check.status,
      httpStatus: check.httpStatus,
    }));

    res.json({
      success: true,
      data: chartData,
    });
  } catch (error) {
    logger.error('Error fetching chart data', {
      type: 'check',
      action: 'fetch_chart_data',
      monitorId: req.params.monitorId,
      userId: req.user.id,
      error: {
        name: error.name,
        message: error.message,
      },
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chart data',
    });
  }
}
