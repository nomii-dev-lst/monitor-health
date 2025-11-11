/* eslint-disable no-unused-vars */
import { eq, and, sql } from 'drizzle-orm';
import { getDb, schema } from '../db/index.js';
import bcrypt from 'bcryptjs';

const { users } = schema;

/**
 * User repository - data access layer for users
 */
export class UserRepository {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Object} Created user
   */
  static async create(userData) {
    const db = getDb();

    // Hash password before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    const [user] = await db
      .insert(users)
      .values({
        username: userData.username.toLowerCase().trim(),
        password: hashedPassword,
        email: userData.email.toLowerCase().trim(),
        role: userData.role || 'admin',
        refreshToken: userData.refreshToken || null,
      })
      .returning();

    // Remove password from returned object
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Find user by ID
   * @param {Number} id - User ID
   * @returns {Object|null} User object or null
   */
  static async findById(id) {
    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (user) {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return null;
  }

  /**
   * Find user by ID (with password for authentication)
   * @param {Number} id - User ID
   * @returns {Object|null} User object with password
   */
  static async findByIdWithPassword(id) {
    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user || null;
  }

  /**
   * Find user by username
   * @param {String} username - Username
   * @returns {Object|null} User object or null
   */
  static async findByUsername(username) {
    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username.toLowerCase().trim()))
      .limit(1);
    return user || null;
  }

  /**
   * Find user by email
   * @param {String} email - Email
   * @returns {Object|null} User object or null
   */
  static async findByEmail(email) {
    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);
    return user || null;
  }

  /**
   * Find all users
   * @returns {Array} Array of users
   */
  static async findAll() {
    const db = getDb();
    const allUsers = await db.select().from(users);

    // Remove passwords
    return allUsers.map((user) => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  /**
   * Count documents matching optional filters (Mongoose compatibility)
   * @param {Object} [filters={}] - Equality filters
   * @returns {Number} Count of matching users
   */
  static async countDocuments(filters = {}) {
    const db = getDb();

    let query = db.select({ count: sql`count(*)` }).from(users);

    const entries = Object.entries(filters).filter(
      ([, value]) => value !== undefined,
    );

    if (entries.length > 0) {
      const conditions = entries.map(([field, value]) => {
        const column = users[field];
        if (!column) {
          throw new Error(
            `Unsupported filter field for countDocuments: ${field}`,
          );
        }
        return eq(column, value);
      });

      if (conditions.length === 1) {
        query = query.where(conditions[0]);
      } else if (conditions.length > 1) {
        query = query.where(and(...conditions));
      }
    }

    const [result] = await query;
    return Number(result?.count || 0);
  }

  /**
   * Update user by ID
   * @param {Number} id - User ID
   * @param {Object} updates - Fields to update
   * @returns {Object|null} Updated user or null
   */
  static async updateById(id, updates) {
    const db = getDb();

    // If password is being updated, hash it
    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(updates.password, salt);
    }

    // Add updatedAt timestamp
    updates.updatedAt = new Date();

    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();

    if (user) {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return null;
  }

  /**
   * Delete user by ID
   * @param {Number} id - User ID
   * @returns {Boolean} True if deleted, false otherwise
   */
  static async deleteById(id) {
    const db = getDb();
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  /**
   * Compare password with hashed password
   * @param {String} candidatePassword - Plain text password
   * @param {String} hashedPassword - Hashed password from database
   * @returns {Boolean} True if passwords match
   */
  static async comparePassword(candidatePassword, hashedPassword) {
    return await bcrypt.compare(candidatePassword, hashedPassword);
  }

  /**
   * Update refresh token
   * @param {Number} id - User ID
   * @param {String} refreshToken - New refresh token
   * @returns {Object|null} Updated user or null
   */
  static async updateRefreshToken(id, refreshToken) {
    return await this.updateById(id, { refreshToken });
  }
}

export default UserRepository;
