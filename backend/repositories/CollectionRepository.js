import { getDb } from '../db/index.js';
import { collections, monitors } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Repository for collection-related database operations
 */
class CollectionRepository {
  /**
   * Create a new collection
   * @param {Object} collectionData - Collection data (userId, name, description, color)
   * @returns {Promise<Object>} Created collection
   */
  async create(collectionData) {
    const db = getDb();
    const [collection] = await db
      .insert(collections)
      .values({
        userId: collectionData.userId,
        name: collectionData.name,
        description: collectionData.description || null,
        color: collectionData.color || '#3B82F6',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return collection;
  }

  /**
   * Find collection by ID
   * @param {number} id - Collection ID
   * @returns {Promise<Object|null>} Collection or null
   */
  async findById(id) {
    const db = getDb();
    const [collection] = await db
      .select()
      .from(collections)
      .where(eq(collections.id, id))
      .limit(1);

    return collection || null;
  }

  /**
   * Find all collections for a user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Array of collections
   */
  async findByUserId(userId) {
    const db = getDb();
    const result = await db
      .select()
      .from(collections)
      .where(eq(collections.userId, userId))
      .orderBy(collections.name);

    return result;
  }

  /**
   * Update a collection
   * @param {number} id - Collection ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated collection
   */
  async update(id, updateData) {
    const db = getDb();
    const [updated] = await db
      .update(collections)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(collections.id, id))
      .returning();

    return updated;
  }

  /**
   * Delete a collection (CASCADE deletes all monitors in collection)
   * @param {number} id - Collection ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    const db = getDb();
    const result = await db.delete(collections).where(eq(collections.id, id));

    return result.rowCount > 0;
  }

  /**
   * Get all monitors in a collection
   * @param {number} collectionId - Collection ID
   * @returns {Promise<Array>} Array of monitors
   */
  async getMonitorsInCollection(collectionId) {
    const db = getDb();
    const result = await db
      .select()
      .from(monitors)
      .where(eq(monitors.collectionId, collectionId))
      .orderBy(monitors.name);

    return result;
  }

  /**
   * Get collection with aggregated statistics
   * @param {number} collectionId - Collection ID
   * @returns {Promise<Object>} Collection with stats
   */
  async getCollectionWithStats(collectionId) {
    const db = getDb();
    const collection = await this.findById(collectionId);
    if (!collection) {
      return null;
    }

    // Get aggregated statistics for all monitors in the collection
    const [stats] = await db
      .select({
        totalMonitors: sql`COUNT(*)::int`,
        activeMonitors: sql`COUNT(*) FILTER (WHERE ${monitors.enabled} = true)::int`,
        upMonitors: sql`COUNT(*) FILTER (WHERE ${monitors.status} = 'up')::int`,
        downMonitors: sql`COUNT(*) FILTER (WHERE ${monitors.status} = 'down')::int`,
        pendingMonitors: sql`COUNT(*) FILTER (WHERE ${monitors.status} = 'pending')::int`,
        avgLatency: sql`COALESCE(AVG(${monitors.lastLatency}) FILTER (WHERE ${monitors.lastLatency} IS NOT NULL), 0)::int`,
        totalChecks: sql`COALESCE(SUM(${monitors.totalChecks}), 0)::int`,
        successfulChecks: sql`COALESCE(SUM(${monitors.successfulChecks}), 0)::int`,
      })
      .from(monitors)
      .where(eq(monitors.collectionId, collectionId));

    // Calculate uptime percentage
    const uptimePercentage =
      stats.totalChecks > 0
        ? ((stats.successfulChecks / stats.totalChecks) * 100).toFixed(2)
        : 0;

    return {
      ...collection,
      stats: {
        ...stats,
        uptimePercentage: parseFloat(uptimePercentage),
      },
    };
  }

  /**
   * Get all collections for a user with statistics
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Array of collections with stats
   */
  async findByUserIdWithStats(userId) {
    const userCollections = await this.findByUserId(userId);

    // Get stats for each collection
    const collectionsWithStats = await Promise.all(
      userCollections.map(async (collection) => {
        const collectionWithStats = await this.getCollectionWithStats(
          collection.id,
        );
        return collectionWithStats;
      }),
    );

    return collectionsWithStats;
  }

  /**
   * Count monitors in a collection
   * @param {number} collectionId - Collection ID
   * @returns {Promise<number>} Monitor count
   */
  async countMonitors(collectionId) {
    const db = getDb();
    const [result] = await db
      .select({
        count: sql`COUNT(*)::int`,
      })
      .from(monitors)
      .where(eq(monitors.collectionId, collectionId));

    return result.count;
  }

  /**
   * Move monitor to a collection
   * @param {number} monitorId - Monitor ID
   * @param {number|null} collectionId - Collection ID or null for uncollected
   * @returns {Promise<Object>} Updated monitor
   */
  async moveMonitorToCollection(monitorId, collectionId) {
    const db = getDb();
    const [updated] = await db
      .update(monitors)
      .set({
        collectionId: collectionId,
        updatedAt: new Date(),
      })
      .where(eq(monitors.id, monitorId))
      .returning();

    return updated;
  }

  /**
   * Check if collection belongs to user
   * @param {number} collectionId - Collection ID
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} Ownership status
   */
  async belongsToUser(collectionId, userId) {
    const db = getDb();
    const [collection] = await db
      .select()
      .from(collections)
      .where(
        and(eq(collections.id, collectionId), eq(collections.userId, userId)),
      )
      .limit(1);

    return !!collection;
  }
}

export default new CollectionRepository();
