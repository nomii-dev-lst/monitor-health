import { getDb, schema } from '../db/index.js';
import { MonitorRepository } from '../repositories/index.js';
import { gte, inArray, and } from 'drizzle-orm';
import logger from '../utils/logger.js';

const { checkResults } = schema;

export async function getDashboardSummary(req, res) {
  try {
    const userId = req.user.id;
    const monitors = await MonitorRepository.findByUserId(userId);

    const totalMonitors = monitors.length;
    const upMonitors = monitors.filter(m => m.status === 'up').length;
    const downMonitors = monitors.filter(m => m.status === 'down').length;
    const enabledMonitors = monitors.filter(m => m.enabled).length;

    const since = new Date();
    since.setHours(since.getHours() - 24);

    const monitorIds = monitors.map(m => m.id);
    let recentChecks = [];

    if (monitorIds.length > 0) {
      const db = getDb();
      recentChecks = await db
        .select()
        .from(checkResults)
        .where(
          and(
            gte(checkResults.checkedAt, since),
            inArray(checkResults.monitorId, monitorIds)
          )
        );
    }

    const totalChecks = recentChecks.length;
    const successfulChecks = recentChecks.filter(c => c.status === 'success').length;
    const failedChecks = recentChecks.filter(c => c.status === 'failure').length;

    res.json({
      success: true,
      summary: {
        totalMonitors,
        upMonitors,
        downMonitors,
        enabledMonitors,
        last24Hours: {
          totalChecks,
          successfulChecks,
          failedChecks,
          uptimePercentage: totalChecks > 0
            ? ((successfulChecks / totalChecks) * 100).toFixed(2)
            : 0
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching dashboard summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard summary'
    });
  }
}
