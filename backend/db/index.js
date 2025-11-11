import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

/**
 * PostgreSQL connection and Drizzle ORM setup
 */

let db = null;
let sql = null;
let handlersRegistered = false;

/**
 * Get or create database connection
 * @returns {Object} Drizzle database instance
 */
export function getDb() {
  if (!db) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return db;
}

/**
 * Connect to Neon PostgreSQL database
 */
export async function connectDatabase() {
  try {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    // Create postgres.js connection
    // For Neon, use connection pooling with pgBouncer
    sql = postgres(connectionString, {
      max: 10, // Maximum number of connections in the pool
      idle_timeout: 20,
      connect_timeout: 10
    });

    // Create Drizzle instance
    db = drizzle(sql, { schema });

    // Test connection
    await sql`SELECT 1`;

    console.log('✓ PostgreSQL connected successfully');
    console.log(`✓ Connected to: ${connectionString.split('@')[1]?.split('/')[0] || 'database'}`);

    // Graceful shutdown - register handlers only once
    if (!handlersRegistered) {
      const handleShutdown = async (signal) => {
        console.log(`\n${signal} received, closing database connection...`);
        await closeDatabase();
        console.log('PostgreSQL connection closed due to app termination');
        process.exit(0);
      };

      process.on('SIGINT', () => handleShutdown('SIGINT'));
      process.on('SIGTERM', () => handleShutdown('SIGTERM'));
      handlersRegistered = true;
    }

    return db;

  } catch (error) {
    console.error('Failed to connect to PostgreSQL:', error);
    console.error('Connection string format should be: postgresql://user:password@host/database');
    process.exit(1);
  }
}

/**
 * Close database connection
 */
export async function closeDatabase() {
  if (sql) {
    await sql.end();
    db = null;
    sql = null;
  }
}

/**
 * Get raw SQL client for advanced operations
 */
export function getSql() {
  if (!sql) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return sql;
}

/**
 * Export schema for use in queries
 */
export { schema };
