import { desc, count, eq } from 'drizzle-orm';
import { getDb, schema } from '../db/index.js';

const { checkResults, monitors } = schema;

export async function getLogs(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const userId = req.user.id; // Get current user ID

    const db = getDb();

    // Only fetch logs from monitors belonging to the current user
    const logs = await db
      .select({
        id: checkResults.id,
        monitorId: checkResults.monitorId,
        monitorName: monitors.name,
        monitorUrl: monitors.url,
        status: checkResults.status,
        httpStatus: checkResults.httpStatus,
        latency: checkResults.latency,
        errorMessage: checkResults.errorMessage,
        validationErrors: checkResults.validationErrors,
        responseData: checkResults.responseData,
        responseMetadata: checkResults.responseMetadata,
        checkedAt: checkResults.checkedAt
      })
      .from(checkResults)
      .innerJoin(monitors, eq(checkResults.monitorId, monitors.id))
      .where(eq(monitors.userId, userId))
      .orderBy(desc(checkResults.checkedAt))
      .limit(limit)
      .offset(offset);

    // Count only logs from user's monitors
    const [{ total }] = await db
      .select({ total: count() })
      .from(checkResults)
      .innerJoin(monitors, eq(checkResults.monitorId, monitors.id))
      .where(eq(monitors.userId, userId));

    res.json({
      success: true,
      logs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch logs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

export async function getLogStats(req, res) {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const userId = req.user.id; // Get current user ID
    const db = getDb();
    const { gte, and } = await import('drizzle-orm');

    const since = new Date();
    since.setHours(since.getHours() - hours);

    // Only fetch logs from monitors belonging to the current user
    const recentLogs = await db
      .select({
        id: checkResults.id,
        status: checkResults.status,
        latency: checkResults.latency,
        checkedAt: checkResults.checkedAt
      })
      .from(checkResults)
      .innerJoin(monitors, eq(checkResults.monitorId, monitors.id))
      .where(and(
        eq(monitors.userId, userId),
        gte(checkResults.checkedAt, since)
      ));

    const totalChecks = recentLogs.length;
    const successfulChecks = recentLogs.filter(log => log.status === 'success').length;
    const failedChecks = recentLogs.filter(log => log.status === 'failure').length;

    const latencies = recentLogs
      .filter(log => log.status === 'success' && log.latency)
      .map(log => log.latency);

    const avgLatency = latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0;

    res.json({
      success: true,
      stats: {
        period: `${hours}h`,
        totalChecks,
        successfulChecks,
        failedChecks,
        successRate: totalChecks > 0
          ? ((successfulChecks / totalChecks) * 100).toFixed(2)
          : 0,
        avgLatency
      }
    });
  } catch (error) {
    console.error('Error fetching log stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch log statistics'
    });
  }
}
