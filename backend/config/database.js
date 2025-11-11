import { connectDatabase as connectPostgres } from '../db/index.js';

/**
 * Connect to PostgreSQL database
 * Re-export for backward compatibility
 */
export async function connectDatabase() {
  return await connectPostgres();
}
