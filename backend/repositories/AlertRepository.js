import { eq, desc } from 'drizzle-orm';
import { getDb, schema } from '../db/index.js';

const { alerts } = schema;

/**
 * Alert repository - data access layer for alerts
 */
export class AlertRepository {
  /**
   * Create a new alert
   * @param {Object} alertData - Alert data
   * @returns {Object} Created alert
   */
  static async create(alertData) {
    const db = getDb();

    const [alert] = await db
      .insert(alerts)
      .values({
        monitorId: alertData.monitorId,
        alertType: alertData.alertType,
        message: alertData.message,
        recipients: alertData.recipients,
        emailSent: alertData.emailSent || false,
        emailError: alertData.emailError || null,
        sentAt: alertData.sentAt || new Date(),
      })
      .returning();

    return alert;
  }

  /**
   * Find alert by ID
   * @param {Number} id - Alert ID
   * @returns {Object|null} Alert or null
   */
  static async findById(id) {
    const db = getDb();
    const [alert] = await db
      .select()
      .from(alerts)
      .where(eq(alerts.id, id))
      .limit(1);
    return alert || null;
  }

  /**
   * Find alerts by monitor ID
   * @param {Number} monitorId - Monitor ID
   * @param {Object} options - Query options
   * @returns {Array} Array of alerts
   */
  static async findByMonitorId(monitorId, options = {}) {
    const db = getDb();
    let query = db.select().from(alerts).where(eq(alerts.monitorId, monitorId));

    // Apply sorting (default: most recent first)
    query = query.orderBy(desc(alerts.sentAt));

    // Apply limit
    if (options.limit) {
      query = query.limit(options.limit);
    }

    return await query;
  }

  /**
   * Find alerts by type
   * @param {String} alertType - Alert type (failure, recovery)
   * @param {Object} options - Query options
   * @returns {Array} Array of alerts
   */
  static async findByType(alertType, options = {}) {
    const db = getDb();
    let query = db.select().from(alerts).where(eq(alerts.alertType, alertType));

    // Apply sorting (default: most recent first)
    query = query.orderBy(desc(alerts.sentAt));

    // Apply limit
    if (options.limit) {
      query = query.limit(options.limit);
    }

    return await query;
  }

  /**
   * Find recent alerts
   * @param {Number} limit - Number of alerts to return
   * @returns {Array} Array of alerts
   */
  static async findRecent(limit = 50) {
    const db = getDb();
    return await db
      .select()
      .from(alerts)
      .orderBy(desc(alerts.sentAt))
      .limit(limit);
  }

  /**
   * Find failed email alerts (for retry)
   * @param {Number} limit - Number of alerts to return
   * @returns {Array} Array of alerts
   */
  static async findFailedEmails(limit = 50) {
    const db = getDb();
    return await db
      .select()
      .from(alerts)
      .where(eq(alerts.emailSent, false))
      .orderBy(desc(alerts.sentAt))
      .limit(limit);
  }

  /**
   * Update alert by ID
   * @param {Number} id - Alert ID
   * @param {Object} updates - Fields to update
   * @returns {Object|null} Updated alert or null
   */
  static async updateById(id, updates) {
    const db = getDb();

    const [alert] = await db
      .update(alerts)
      .set(updates)
      .where(eq(alerts.id, id))
      .returning();

    return alert || null;
  }

  /**
   * Delete alerts by monitor ID
   * @param {Number} monitorId - Monitor ID
   * @returns {Number} Number of deleted records
   */
  static async deleteByMonitorId(monitorId) {
    const db = getDb();
    const result = await db
      .delete(alerts)
      .where(eq(alerts.monitorId, monitorId))
      .returning();
    return result.length;
  }
}

export default AlertRepository;
