// scripts/ensure-indexes.ts
// Run: npx tsx scripts/ensure-indexes.ts
import { MongoClient } from 'mongodb';

const MONGO_URL = process.env.MONGODB_URI || process.env.MONGO_URL;

async function ensureIndexes() {
  if (!MONGO_URL) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  const client = await MongoClient.connect(MONGO_URL);
  const db = client.db();

  console.log('Creating indexes...');

  // Users collection
  await db.collection('users').createIndex({ email: 1 }, { unique: true, background: true });
  console.log('  ✅ users.email (unique)');
  
  await db.collection('users').createIndex({ id: 1 }, { unique: true, background: true });
  console.log('  ✅ users.id (unique)');

  // Admin users
  await db.collection('admin_users').createIndex({ email: 1 }, { unique: true, background: true });
  console.log('  ✅ admin_users.email (unique)');
  
  await db.collection('admin_users').createIndex({ id: 1 }, { unique: true, background: true });
  console.log('  ✅ admin_users.id (unique)');

  // Rewards
  await db.collection('rewards').createIndex({ userId: 1 }, { unique: true, background: true });
  console.log('  ✅ rewards.userId (unique)');

  // Challenges
  await db.collection('challenges').createIndex({ userId: 1 }, { unique: true, background: true });
  console.log('  ✅ challenges.userId (unique)');

  // Password resets
  await db.collection('password_resets').createIndex({ tokenHash: 1 }, { background: true });
  console.log('  ✅ password_resets.tokenHash');
  
  await db.collection('password_resets').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, background: true });
  console.log('  ✅ password_resets.expiresAt (TTL)');

  // User preferences
  await db.collection('user_preferences').createIndex({ userId: 1 }, { unique: true, background: true });
  console.log('  ✅ user_preferences.userId (unique)');

  // Orders (for user lookups)
  await db.collection('marketorders').createIndex({ customerEmail: 1, createdAt: -1 }, { background: true });
  console.log('  ✅ marketorders.customerEmail+createdAt');
  
  await db.collection('marketorders').createIndex({ userId: 1, createdAt: -1 }, { background: true });
  console.log('  ✅ marketorders.userId+createdAt');

  console.log('\nAll indexes created successfully!');
  await client.close();
}

ensureIndexes().catch(err => { console.error(err); process.exit(1); });
