/**
 * Database client wrapper
 * Re-exports from db-optimized for backward compatibility
 */

import { connectToDatabase } from './db-optimized';

/**
 * Get database instance
 * @returns {Promise<import('mongodb').Db>}
 */
export async function getDB() {
  const { db } = await connectToDatabase();
  return db;
}

/**
 * Get MongoDB client
 * @returns {Promise<{client: import('mongodb').MongoClient, db: import('mongodb').Db}>}
 */
export async function getClient() {
  return connectToDatabase();
}

export { connectToDatabase };
