import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { getDb, schema } from '../db/index.js';
import { getSql } from '../db/index.js';

const { checkResults } = schema;

/**
 * CheckResult repository - data access layer for check results
 */
export class CheckResultRepository {
  /**
   * Create a new check result
   * @param {Object} resultData - Check result data
   * @returns {Object} Created check result
   */
  static async create(resultData) {
    const sqlClient = getSql();

    // Use raw SQL to properly handle JSONB fields
    // This is a workaround for Drizzle JSONB serialization issues
    const [result] = await sqlClient`
      INSERT INTO check_results (
        monitor_id,
        status,
        http_status,
        latency,
        error_message,
        validation_errors,
        response_data,
        response_metadata,
        checked_at
      ) VALUES (
        ${resultData.monitorId},
        ${resultData.status},
        ${resultData.httpStatus || null},
        ${resultData.latency},
        ${resultData.errorMessage || null},
        ${sqlClient.json(resultData.validationErrors || [])},
        ${resultData.responseData || null},
        ${resultData.responseMetadata ? sqlClient.json(resultData.responseMetadata) : null},
        ${resultData.checkedAt || new Date()}
      )
      RETURNING *
    `;

    return result;
  }

  /**
   * Find check result by ID
   * @param {Number} id - Check result ID
   * @returns {Object|null} Check result or null
   */
  static async findById(id) {
    const db = getDb();
    const [result] = await db
      .select()
      .from(checkResults)
      .where(eq(checkResults.id, id))
      .limit(1);
    return result || null;
  }

  /**
   * Find check results by monitor ID
   * @param {Number} monitorId - Monitor ID
   * @param {Object} options - Query options
   * @returns {Array} Array of check results
   */
  static async findByMonitorId(monitorId, options = {}) {
    const db = getDb();
    let query = db
      .select()
      .from(checkResults)
      .where(eq(checkResults.monitorId, monitorId));

    // Apply date range filter
    if (options.startDate && options.endDate) {
      query = query.where(
        and(
          eq(checkResults.monitorId, monitorId),
          gte(checkResults.checkedAt, options.startDate),
          lte(checkResults.checkedAt, options.endDate),
        ),
      );
    } else if (options.startDate) {
      query = query.where(
        and(
          eq(checkResults.monitorId, monitorId),
          gte(checkResults.checkedAt, options.startDate),
        ),
      );
    }

    // Apply sorting (default: most recent first)
    query = query.orderBy(desc(checkResults.checkedAt));

    // Apply limit
    if (options.limit) {
      query = query.limit(options.limit);
    }

    return await query;
  }

  /**
   * Find recent check results for a monitor
   * @param {Number} monitorId - Monitor ID
   * @param {Number} limit - Number of results to return
   * @returns {Array} Array of check results
   */
  static async findRecent(monitorId, limit = 50) {
    return await this.findByMonitorId(monitorId, { limit });
  }

  /**
   * Find check results within a time period
   * @param {Number} monitorId - Monitor ID
   * @param {Number} hours - Number of hours to look back
   * @returns {Array} Array of check results
   */
  static async findByTimePeriod(monitorId, hours = 24) {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);

    return await this.findByMonitorId(monitorId, { startDate });
  }

  /**
   * Get statistics for a monitor over a time period
   * @param {Number} monitorId - Monitor ID
   * @param {Number} hours - Time period in hours (default: 24)
   * @returns {Object} Statistics
   */
  static async getStats(monitorId, hours = 24) {
    const checks = await this.findByTimePeriod(monitorId, hours);

    const total = checks.length;
    const successful = checks.filter((c) => c.status === 'success').length;
    const failed = checks.filter((c) => c.status === 'failure').length;

    const uptimePercentage =
      total > 0 ? parseFloat(((successful / total) * 100).toFixed(2)) : 0;

    const latencies = checks
      .filter((c) => c.status === 'success' && c.latency)
      .map((c) => c.latency);

    const avgLatency =
      latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0;

    const minLatency = latencies.length > 0 ? Math.min(...latencies) : 0;
    const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;

    return {
      period: `${hours}h`,
      totalChecks: total,
      successfulChecks: successful,
      failedChecks: failed,
      uptimePercentage,
      avgLatency,
      minLatency,
      maxLatency,
    };
  }

  /**
   * Delete check results by monitor ID
   * @param {Number} monitorId - Monitor ID
   * @returns {Number} Number of deleted records
   */
  static async deleteByMonitorId(monitorId) {
    const db = getDb();
    const result = await db
      .delete(checkResults)
      .where(eq(checkResults.monitorId, monitorId))
      .returning();
    return result.length;
  }

  /**
   * Delete old check results (cleanup)
   * @param {Number} daysToKeep - Number of days of results to keep
   * @returns {Number} Number of deleted records
   */
  static async deleteOld(daysToKeep = 30) {
    const db = getDb();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await db
      .delete(checkResults)
      .where(lte(checkResults.checkedAt, cutoffDate))
      .returning();

    return result.length;
  }
}

export default CheckResultRepository;
