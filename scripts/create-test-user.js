#!/usr/bin/env node

/**
 * Create a test user for development/testing
 * Usage: 
 *   npm run create:test-user
 *   MONGODB_URI=mongodb://user:pass@host/db npm run create:test-user
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function createTestUser() {
  let client;
  try {
    const mongoUrl = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017';
    console.log(`Connecting to MongoDB: ${mongoUrl.replace(/mongodb:\/\/.*@/, 'mongodb://***:***@').substring(0, 50)}...`);

    client = new MongoClient(mongoUrl);
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();
    const usersCollection = db.collection('users');

    // Check if test user already exists
    const existingUser = await usersCollection.findOne({ email: 'test@example.com' });
    if (existingUser) {
      console.log('ℹ️  Test user already exists');
      console.log(`Email: ${existingUser.email}`);
      console.log(`ID: ${existingUser.id}`);
      console.log(`Phone: ${existingUser.phone}`);
      await client.close();
      process.exit(0);
    }

    // Create new test user
    const passwordHash = await bcrypt.hash('TestPass123!', 12);
    
    const testUser = {
      id: uuidv4(),
      name: 'Test User',
      email: 'test@example.com',
      passwordHash,
      phone: '(404) 555-0123',
      joinedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await usersCollection.insertOne(testUser);

    // Also initialize rewards and challenge
    const rewardsCollection = db.collection('rewards');
    const challengesCollection = db.collection('challenges');

    const reward = {
      id: uuidv4(),
      userId: testUser.id,
      points: 0,
      lifetimePoints: 0,
      history: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const challenge = {
      id: uuidv4(),
      userId: testUser.id,
      streakDays: 0,
      lastCheckIn: null,
      totalCheckIns: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await rewardsCollection.insertOne(reward);
    await challengesCollection.insertOne(challenge);

    console.log('\n✅ Test user created successfully\n');
    console.log('Email:    test@example.com');
    console.log('Password: TestPass123!');
    console.log(`User ID:  ${testUser.id}`);
    console.log(`Phone:    ${testUser.phone}`);
    console.log('\nYou can now use these credentials to log in during development.\n');

    await client.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating test user:', error.message);
    
    if (error.message.includes('ECONNREFUSED') || error.message.includes('connect')) {
      console.log('\n⚠️  MongoDB is not running or not accessible.');
      console.log('\nTo use this script, you need to:\n');
      console.log('1. Set your MONGODB_URI environment variable:');
      console.log('   export MONGODB_URI="mongodb+srv://user:password@cluster.mongodb.net/dbname"');
      console.log('\n2. Then run:');
      console.log('   npm run create:test-user\n');
      console.log('Or in one command:');
      console.log('   MONGODB_URI="your-connection-string" npm run create:test-user\n');
    }
    
    if (client) await client.close();
    process.exit(1);
  }
}

createTestUser();
