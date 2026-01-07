/**
 * Create database indexes for email system
 * Run with: node scripts/create-email-indexes.js
 */

import { MongoClient } from 'mongodb';

const MONGO_URL = process.env.MONGODB_URI || process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || 'taste_of_gratitude';

async function createIndexes() {
  if (!MONGO_URL) {
    console.error('❌ MONGODB_URI or MONGO_URL not set');
    process.exit(1);
  }

  const client = new MongoClient(MONGO_URL);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    
    console.log('📊 Creating email system indexes...\n');

    // Campaigns collection
    console.log('Creating campaigns indexes...');
    await db.collection('campaigns').createIndex({ id: 1 }, { unique: true });
    await db.collection('campaigns').createIndex({ status: 1 });
    await db.collection('campaigns').createIndex({ createdBy: 1 });
    await db.collection('campaigns').createIndex({ createdAt: -1 });
    await db.collection('campaigns').createIndex({ scheduledFor: 1 }, { sparse: true });
    // Compound index for cron job atomic claiming
    await db.collection('campaigns').createIndex({ status: 1, scheduledFor: 1 });
    await db.collection('campaigns').createIndex({ status: 1, lastAttemptAt: 1 });
    console.log('✅ campaigns indexes created');

    // Email sends collection
    console.log('Creating email_sends indexes...');
    await db.collection('email_sends').createIndex({ id: 1 }, { unique: true });
    await db.collection('email_sends').createIndex({ campaignId: 1 });
    await db.collection('email_sends').createIndex({ userId: 1 });
    await db.collection('email_sends').createIndex({ email: 1 });
    await db.collection('email_sends').createIndex({ status: 1 });
    await db.collection('email_sends').createIndex({ resendId: 1 }, { sparse: true });
    await db.collection('email_sends').createIndex({ sentAt: -1 });
    console.log('✅ email_sends indexes created');

    // Email logs collection
    console.log('Creating email_logs indexes...');
    await db.collection('email_logs').createIndex({ id: 1 }, { unique: true });
    await db.collection('email_logs').createIndex({ to: 1 });
    await db.collection('email_logs').createIndex({ userId: 1 });
    await db.collection('email_logs').createIndex({ emailType: 1 });
    await db.collection('email_logs').createIndex({ status: 1 });
    await db.collection('email_logs').createIndex({ resendId: 1 }, { sparse: true });
    await db.collection('email_logs').createIndex({ createdAt: -1 });
    console.log('✅ email_logs indexes created');

    // Email queue collection  
    console.log('Creating email_queue indexes...');
    await db.collection('email_queue').createIndex({ status: 1, scheduledFor: 1 });
    await db.collection('email_queue').createIndex({ 'recipient.email': 1 });
    await db.collection('email_queue').createIndex({ quizId: 1 }, { sparse: true });
    await db.collection('email_queue').createIndex({ createdAt: -1 });
    console.log('✅ email_queue indexes created');

    // Users collection (email preferences)
    console.log('Creating users email indexes...');
    await db.collection('users').createIndex({ 'emailPreferences.marketing': 1 });
    console.log('✅ users email indexes created');

    // Orders collection (for segmentation)
    console.log('Creating orders indexes for segmentation...');
    await db.collection('orders').createIndex({ userId: 1 });
    await db.collection('orders').createIndex({ createdAt: -1 });
    await db.collection('orders').createIndex({ status: 1 });
    console.log('✅ orders indexes created');

    console.log('\n✅ All email system indexes created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

createIndexes();
