/**
 * Database Test Setup
 * Runs before all database integration tests
 */

import { beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/test_db';

beforeAll(async () => {
  console.log(`Database tests connecting to: ${MONGODB_URI.replace(/\/\/.*@/, '//***@')}`);
  
  try {
    client = await MongoClient.connect(MONGODB_URI);
    db = client.db();
    console.log('✅ Database connection established');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw new Error(
      `Cannot connect to MongoDB at ${MONGODB_URI}. ` +
      'Make sure MongoDB is running before running database tests.'
    );
  }
});

beforeEach(async () => {
  // Clean up test collections before each test
  if (db) {
    const collections = await db.listCollections().toArray();
    for (const collection of collections) {
      // Only clean test-prefixed collections to be safe
      if (collection.name.startsWith('test_')) {
        await db.collection(collection.name).deleteMany({});
      }
    }
  }
});

afterAll(async () => {
  if (client) {
    await client.close();
    console.log('Database connection closed');
  }
});

// Export for use in tests
export function getDb(): Db {
  if (!db) {
    throw new Error('Database not initialized. Run tests with vitest.db.config.ts');
  }
  return db;
}

export function getClient(): MongoClient {
  if (!client) {
    throw new Error('Database client not initialized');
  }
  return client;
}
