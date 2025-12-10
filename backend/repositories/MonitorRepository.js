import { eq, and, lte, desc, asc } from 'drizzle-orm';
import { getDb, getSql, schema } from '../db/index.js';

const { monitors } = schema;

/**
 * Monitor repository - data access layer for monitors
 */
export class MonitorRepository {
  /**
   * Create a new monitor
   * @param {Object} monitorData - Monitor data
   * @returns {Object} Created monitor
   */
  static async create(monitorData) {
    const db = getDb();

    const [monitor] = await db
      .insert(monitors)
      .values({
        userId: monitorData.userId,
        collectionId: monitorData.collectionId || null,
        name: monitorData.name,
        url: monitorData.url,
        authType: monitorData.authType || 'none',
        authConfig: monitorData.authConfig || {},
        validationRules: monitorData.validationRules || { statusCode: 200 },
        checkInterval: monitorData.checkInterval || 30,
        alertEmails: monitorData.alertEmails || [],
        enabled: monitorData.enabled !== undefined ? monitorData.enabled : true,
        status: monitorData.status || 'pending',
        nextCheckTime: monitorData.nextCheckTime || null,
        lastCheckTime: monitorData.lastCheckTime || null,
        lastLatency: monitorData.lastLatency || null,
        consecutiveFailures: monitorData.consecutiveFailures || 0,
        totalChecks: monitorData.totalChecks || 0,
        successfulChecks: monitorData.successfulChecks || 0,
      })
      .returning();

    return monitor;
  }

  /**
   * Find monitor by ID
   * @param {Number} id - Monitor ID
   * @returns {Object|null} Monitor object or null
   */
  static async findById(id) {
    const db = getDb();
    const [monitor] = await db
      .select()
      .from(monitors)
      .where(eq(monitors.id, id))
      .limit(1);
    return monitor || null;
  }

  /**
   * Find all monitors
   * @param {Object} options - Query options
   * @returns {Array} Array of monitors
   */
  static async findAll(options = {}) {
    const db = getDb();
    let query = db.select().from(monitors);

    // Apply sorting
    if (options.sortBy) {
      const sortField = monitors[options.sortBy];
      if (sortField) {
        query =
          options.sortOrder === 'asc'
            ? query.orderBy(asc(sortField))
            : query.orderBy(desc(sortField));
      }
    } else {
      // Default sort by createdAt descending
      query = query.orderBy(desc(monitors.createdAt));
    }

    return await query;
  }

  /**
   * Find monitors that need to be checked
   * @param {Array<Number>} userIds - Optional array of user IDs to filter by
   * @returns {Array} Array of monitors
   */
  static async findDueForCheck(userIds = null) {
    const db = getDb();
    const now = new Date();

    const conditions = [
      eq(monitors.enabled, true),
      lte(monitors.nextCheckTime, now),
    ];

    // If userIds provided, filter by those users
    if (userIds && userIds.length > 0) {
      const { inArray } = await import('drizzle-orm');
      conditions.push(inArray(monitors.userId, userIds));
    }

    return await db
      .select()
      .from(monitors)
      .where(and(...conditions))
      .orderBy(asc(monitors.nextCheckTime));
  }

  /**
   * Find enabled monitors
   * @returns {Array} Array of enabled monitors
   */
  static async findEnabled() {
    const db = getDb();
    return await db
      .select()
      .from(monitors)
      .where(eq(monitors.enabled, true))
      .orderBy(desc(monitors.createdAt));
  }

  /**
   * Find monitors by user ID
   * @param {Number} userId - User ID
   * @returns {Array} Array of monitors
   */
  static async findByUserId(userId) {
    const db = getDb();
    return await db
      .select()
      .from(monitors)
      .where(eq(monitors.userId, userId))
      .orderBy(desc(monitors.createdAt));
  }

  /**
   * Find monitors by collection ID
   * @param {Number} collectionId - Collection ID
   * @returns {Array} Array of monitors
   */
  static async findByCollectionId(collectionId) {
    const db = getDb();
    return await db
      .select()
      .from(monitors)
      .where(eq(monitors.collectionId, collectionId))
      .orderBy(desc(monitors.createdAt));
  }

  /**
   * Find uncollected monitors by user ID
   * @param {Number} userId - User ID
   * @returns {Array} Array of monitors without collection
   */
  static async findUncollectedByUserId(userId) {
    const db = getDb();
    const { isNull } = await import('drizzle-orm');
    return await db
      .select()
      .from(monitors)
      .where(and(eq(monitors.userId, userId), isNull(monitors.collectionId)))
      .orderBy(desc(monitors.createdAt));
  }

  /**
   * Find enabled monitors by user ID
   * @param {Number} userId - User ID
   * @returns {Array} Array of enabled monitors
   */
  static async findEnabledByUserId(userId) {
    const db = getDb();
    return await db
      .select()
      .from(monitors)
      .where(and(eq(monitors.userId, userId), eq(monitors.enabled, true)))
      .orderBy(desc(monitors.createdAt));
  }

  /**
   * Update monitor by ID
   * @param {Number} id - Monitor ID
   * @param {Object} updates - Fields to update
   * @returns {Object|null} Updated monitor or null
   */
  static async updateById(id, updates) {
    const db = getDb();

    // Add updatedAt timestamp
    updates.updatedAt = new Date();

    const [monitor] = await db
      .update(monitors)
      .set(updates)
      .where(eq(monitors.id, id))
      .returning();

    return monitor || null;
  }

  /**
   * Delete monitor by ID
   * @param {Number} id - Monitor ID
   * @returns {Boolean} True if deleted, false otherwise
   */
  static async deleteById(id) {
    const db = getDb();
    const result = await db
      .delete(monitors)
      .where(eq(monitors.id, id))
      .returning();
    return result.length > 0;
  }

  /**
   * Update monitor statistics after a check
   * @param {Number} id - Monitor ID
   * @param {Object} stats - Statistics to update
   * @returns {Object|null} Updated monitor
   */
  static async updateStats(id, stats) {
    const sqlClient = getSql();

    // Use raw SQL to avoid serialization issues
    const [monitor] = await sqlClient`
      UPDATE monitors
      SET 
        status = ${stats.status},
        last_check_time = ${stats.lastCheckTime},
        last_latency = ${stats.lastLatency},
        consecutive_failures = ${stats.consecutiveFailures},
        total_checks = total_checks + 1,
        successful_checks = ${stats.isSuccess ? sqlClient`successful_checks + 1` : sqlClient`successful_checks`},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    return monitor || null;
  }

  /**
   * Calculate uptime percentage for a monitor
   * @param {Object} monitor - Monitor object
   * @returns {Number} Uptime percentage
   */
  static calculateUptimePercentage(monitor) {
    if (!monitor.totalChecks || monitor.totalChecks === 0) {
      return 0;
    }
    return parseFloat(
      ((monitor.successfulChecks / monitor.totalChecks) * 100).toFixed(2),
    );
  }

  /**
   * Get monitor with uptime percentage
   * @param {Number} id - Monitor ID
   * @returns {Object|null} Monitor with uptimePercentage field
   */
  static async findByIdWithStats(id) {
    const monitor = await this.findById(id);
    if (!monitor) {
      return null;
    }

    return {
      ...monitor,
      uptimePercentage: this.calculateUptimePercentage(monitor),
    };
  }

  /**
   * Get all monitors with uptime percentages
   * @returns {Array} Array of monitors with uptimePercentage
   */
  static async findAllWithStats() {
    const allMonitors = await this.findAll();

    return allMonitors.map((monitor) => ({
      ...monitor,
      uptimePercentage: this.calculateUptimePercentage(monitor),
    }));
  }
}

export default MonitorRepository;
