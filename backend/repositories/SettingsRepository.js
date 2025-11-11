import { eq, and } from 'drizzle-orm';
import { getDb, schema } from '../db/index.js';

const { settings } = schema;

/**
 * Settings repository - data access layer for application settings
 */
export class SettingsRepository {

  /**
   * Create a new setting
   * @param {Object} settingData - Setting data
   * @returns {Object} Created setting
   */
  static async create(settingData) {
    const db = getDb();

    const [setting] = await db.insert(settings).values({
      key: settingData.key,
      value: settingData.value,
      description: settingData.description || ''
    }).returning();

    return setting;
  }

  /**
   * Find single setting matching filters (Mongoose compatibility)
   * @param {Object} filters - Equality filters (supports key only)
   * @returns {Object|null} Setting or null
   */
  static async findOne(filters = {}) {
    const db = getDb();

    const entries = Object.entries(filters).filter(([, value]) => value !== undefined);

    if (entries.length === 0) {
      throw new Error('SettingsRepository.findOne requires at least one filter');
    }

    const conditions = entries.map(([field, value]) => {
      const column = settings[field];
      if (!column) {
        throw new Error(`Unsupported filter field for findOne: ${field}`);
      }
      return eq(column, value);
    });

    let query = db.select().from(settings);

    if (conditions.length === 1) {
      query = query.where(conditions[0]);
    } else {
      query = query.where(and(...conditions));
    }

    const [setting] = await query.limit(1);
    return setting || null;
  }

  /**
   * Find setting by key
   * @param {String} key - Setting key
   * @returns {Object|null} Setting or null
   */
  static async findByKey(key) {
    const db = getDb();
    const [setting] = await db.select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);
    return setting || null;
  }

  /**
   * Get setting value by key
   * @param {String} key - Setting key
   * @returns {*} Setting value or null
   */
  static async getValue(key) {
    const setting = await this.findByKey(key);
    return setting ? setting.value : null;
  }

  /**
   * Find all settings
   * @returns {Array} Array of settings
   */
  static async findAll() {
    const db = getDb();
    return await db.select().from(settings);
  }

  /**
   * Update or create setting (upsert)
   * @param {String} key - Setting key
   * @param {*} value - Setting value
   * @param {String} description - Setting description
   * @returns {Object} Setting object
   */
  static async upsert(key, value, description = '') {
    const db = getDb();

    const existing = await this.findByKey(key);

    if (existing) {
      // Update existing setting
      const [updated] = await db.update(settings)
        .set({
          value,
          description,
          updatedAt: new Date()
        })
        .where(eq(settings.key, key))
        .returning();
      return updated;
    } else {
      // Create new setting
      return await this.create({ key, value, description });
    }
  }

  /**
   * Update setting by key
   * @param {String} key - Setting key
   * @param {Object} updates - Fields to update
   * @returns {Object|null} Updated setting or null
   */
  static async updateByKey(key, updates) {
    const db = getDb();

    updates.updatedAt = new Date();

    const [setting] = await db.update(settings)
      .set(updates)
      .where(eq(settings.key, key))
      .returning();

    return setting || null;
  }

  /**
   * Delete setting by key
   * @param {String} key - Setting key
   * @returns {Boolean} True if deleted, false otherwise
   */
  static async deleteByKey(key) {
    const db = getDb();
    const result = await db.delete(settings)
      .where(eq(settings.key, key))
      .returning();
    return result.length > 0;
  }
}

export default SettingsRepository;
