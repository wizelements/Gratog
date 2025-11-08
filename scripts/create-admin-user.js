#!/usr/bin/env node

/**
 * Create Admin User Script
 * Creates the default admin user in MongoDB
 */

const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

async function createAdminUser() {
  console.log('🔐 Creating admin user...\n');

  try {
    // Get MongoDB connection
    const mongoUri = process.env.MONGODB_URI;
    const dbName = process.env.DATABASE_NAME || 'taste_of_gratitude';

    if (!mongoUri) {
      console.error('❌ MONGODB_URI not set in environment');
      process.exit(1);
    }

    console.log('📡 Connecting to MongoDB...');
    const client = new MongoClient(mongoUri);
    await client.connect();
    const db = client.db(dbName);

    console.log('✅ Connected to database:', dbName);

    // Get credentials from environment or use defaults
    const adminEmail = process.env.ADMIN_DEFAULT_EMAIL || 'admin@tasteofgratitude.com';
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'TasteOfGratitude2025!';

    console.log('\n📋 Admin credentials:');
    console.log('   Email:', adminEmail);
    console.log('   Password:', adminPassword);

    // Check if admin already exists
    const existingAdmin = await db.collection('users').findOne({ 
      email: adminEmail.toLowerCase() 
    });

    if (existingAdmin) {
      console.log('\n⚠️  Admin user already exists!');
      console.log('   Email:', existingAdmin.email);
      console.log('   Created:', existingAdmin.createdAt);
      
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        rl.question('\nUpdate password? (y/N): ', resolve);
      });
      rl.close();

      if (answer.toLowerCase() !== 'y') {
        console.log('\n✅ Keeping existing admin user');
        await client.close();
        return;
      }

      // Update password
      console.log('\n🔄 Updating admin password...');
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      
      await db.collection('users').updateOne(
        { email: adminEmail.toLowerCase() },
        {
          $set: {
            passwordHash: hashedPassword,
            password: hashedPassword, // Also set 'password' field for compatibility
            updatedAt: new Date()
          }
        }
      );

      console.log('✅ Admin password updated successfully!\n');
    } else {
      // Create new admin user
      console.log('\n🔨 Creating new admin user...');
      
      const hashedPassword = await bcrypt.hash(adminPassword, 12);

      await db.collection('users').insertOne({
        email: adminEmail.toLowerCase(),
        passwordHash: hashedPassword,
        password: hashedPassword, // Also set 'password' field for compatibility
        name: 'Admin User',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      });

      console.log('✅ Admin user created successfully!\n');
    }

    // Verify creation
    const admin = await db.collection('users').findOne({ 
      email: adminEmail.toLowerCase() 
    });

    console.log('✅ Verification:');
    console.log('   Email:', admin.email);
    console.log('   Role:', admin.role);
    console.log('   Has password hash:', !!admin.passwordHash);
    console.log('   Created:', admin.createdAt);

    console.log('\n🎉 Admin user setup complete!');
    console.log('\n📌 Login at: https://gratog.vercel.app/admin/login');
    console.log('   Email:', adminEmail);
    console.log('   Password:', adminPassword);

    await client.close();
  } catch (error) {
    console.error('\n❌ Error creating admin user:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  createAdminUser();
}

module.exports = { createAdminUser };
