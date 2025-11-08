#!/usr/bin/env node

/**
 * Initialize Admin User Script
 * Creates the default admin user in MongoDB
 * 
 * Usage:
 *   node scripts/init-admin-user.js
 * 
 * Requires environment variables:
 *   MONGODB_URI - MongoDB connection string
 *   DATABASE_NAME - Database name (default: taste_of_gratitude)
 */

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const ADMIN_EMAIL = 'admin@tasteofgratitude.com';
const ADMIN_PASSWORD = 'TasteOfGratitude2025!';
const ADMIN_NAME = 'Admin User';

async function initAdminUser() {
  let client;
  
  try {
    console.log('🔄 Initializing admin user...');
    
    // Validate environment
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('❌ MONGODB_URI environment variable is required');
    }
    
    const dbName = process.env.DATABASE_NAME || 'taste_of_gratitude';
    
    console.log(`📡 Connecting to MongoDB...`);
    client = await MongoClient.connect(mongoUri);
    const db = client.db(dbName);
    
    // Check if admin already exists
    const existingAdmin = await db.collection('admin_users').findOne({ 
      email: ADMIN_EMAIL.toLowerCase() 
    });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists:', ADMIN_EMAIL);
      console.log('   You can log in with the existing credentials');
      return;
    }
    
    // Hash password
    console.log('🔐 Hashing password...');
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    
    // Create admin user
    console.log('👤 Creating admin user...');
    const adminUser = {
      email: ADMIN_EMAIL.toLowerCase(),
      passwordHash,
      name: ADMIN_NAME,
      role: 'admin',
      createdAt: new Date(),
      isActive: true,
      mustChangePassword: true
    };
    
    await db.collection('admin_users').insertOne(adminUser);
    
    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('📝 Login Credentials:');
    console.log('   Email:', ADMIN_EMAIL);
    console.log('   Password:', ADMIN_PASSWORD);
    console.log('');
    console.log('⚠️  IMPORTANT: Change this password after first login!');
    
  } catch (error) {
    console.error('❌ Failed to initialize admin user:', error.message);
    console.error('');
    console.error('Troubleshooting:');
    console.error('1. Make sure MONGODB_URI is set in your environment');
    console.error('2. Verify MongoDB connection string is correct');
    console.error('3. Check that the database is accessible');
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('📡 MongoDB connection closed');
    }
  }
}

// Run the script
initAdminUser();
