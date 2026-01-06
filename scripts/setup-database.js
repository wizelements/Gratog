#!/usr/bin/env node

/**
 * Production Database Setup Script
 * Sets up MongoDB collections and indexes for optimal performance
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'taste_of_gratitude_prod';

async function setupDatabase() {
  console.log('🚀 Setting up production database...');
  console.log(`Connecting to: ${MONGO_URL}`);
  
  const client = new MongoClient(MONGO_URL);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    
    // 1. Create collections if they don't exist
    const collections = ['products', 'orders', 'customers', 'coupons', 'analytics'];
    
    for (const collectionName of collections) {
      try {
        await db.createCollection(collectionName);
        console.log(`✅ Created collection: ${collectionName}`);
      } catch (error) {
        if (error.codeName === 'NamespaceExists') {
          console.log(`ℹ️  Collection exists: ${collectionName}`);
        } else {
          throw error;
        }
      }
    }
    
    // 2. Create indexes for performance
    console.log('📈 Creating database indexes...');
    
    // Products indexes
    await db.collection('products').createIndex({ id: 1 }, { unique: true });
    await db.collection('products').createIndex({ name: 1 });
    await db.collection('products').createIndex({ category: 1 });
    await db.collection('products').createIndex({ stock: 1 });
    await db.collection('products').createIndex({ createdAt: -1 });
    console.log('✅ Products indexes created');
    
    // Orders indexes
    await db.collection('orders').createIndex({ id: 1 }, { unique: true });
    await db.collection('orders').createIndex({ 'customer.email': 1 });
    await db.collection('orders').createIndex({ status: 1 });
    await db.collection('orders').createIndex({ createdAt: -1 });
    await db.collection('orders').createIndex({ paymentId: 1 });
    await db.collection('orders').createIndex({ fulfillmentType: 1 });
    console.log('✅ Orders indexes created');
    
    // Customers indexes
    await db.collection('customers').createIndex({ email: 1 }, { unique: true });
    await db.collection('customers').createIndex({ phone: 1 });
    await db.collection('customers').createIndex({ createdAt: -1 });
    console.log('✅ Customers indexes created');
    
    // Coupons indexes
    await db.collection('coupons').createIndex({ id: 1 }, { unique: true });
    await db.collection('coupons').createIndex({ code: 1 }, { unique: true });
    await db.collection('coupons').createIndex({ customerEmail: 1 });
    await db.collection('coupons').createIndex({ isUsed: 1 });
    await db.collection('coupons').createIndex({ expiresAt: 1 });
    await db.collection('coupons').createIndex({ createdAt: -1 });
    await db.collection('coupons').createIndex({ type: 1 });
    console.log('✅ Coupons indexes created');
    
    // Analytics indexes
    await db.collection('analytics').createIndex({ date: -1 });
    await db.collection('analytics').createIndex({ event: 1 });
    await db.collection('analytics').createIndex({ userId: 1 });
    console.log('✅ Analytics indexes created');
    
    // 3. Insert default admin user if it doesn't exist
    console.log('👤 Setting up admin user...');
    
    const adminEmail = process.env.ADMIN_DEFAULT_EMAIL || 'admin@tasteofgratitude.net';
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'TasteOfGratitude2024!';
    
    const existingAdmin = await db.collection('users').findOne({ email: adminEmail });
    
    if (!existingAdmin) {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      
      await db.collection('users').insertOne({
        id: `admin_${Date.now()}`,
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        name: 'Admin User',
        createdAt: new Date().toISOString(),
        isActive: true,
        permissions: ['all']
      });
      
      console.log('✅ Default admin user created');
      console.log(`📧 Email: ${adminEmail}`);
      console.log(`🔑 Password: ${adminPassword}`);
    } else {
      console.log('ℹ️  Admin user already exists');
    }
    
    // 4. Set up initial product data if needed
    console.log('📦 Checking product data...');
    
    const productCount = await db.collection('products').countDocuments();
    
    if (productCount === 0) {
      console.log('📦 Inserting default products...');
      
      const defaultProducts = [
        {
          id: 'elderberry-moss',
          name: 'Elderberry Sea Moss',
          subtitle: 'Immune Support Blend',
          description: 'Premium sea moss gel infused with elderberry for natural immune system support.',
          price: 3600, // $36.00 in cents
          category: 'sea-moss',
          size: '16 oz jar',
          stock: 25,
          lowStockThreshold: 5,
          ingredients: ['Sea Moss', 'Elderberry', 'Spring Water', 'Natural Flavors'],
          benefits: ['Immune Support', 'Rich in Minerals', 'Antioxidant Properties'],
          image: '/images/products/elderberry-moss.jpg',
          featured: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'healing-soursop',
          name: 'Healing Soursop',
          subtitle: 'Digestive Wellness',
          description: 'Soothing soursop blend for digestive health and overall wellness.',
          price: 3400, // $34.00 in cents
          category: 'wellness',
          size: '16 oz jar',
          stock: 20,
          lowStockThreshold: 5,
          ingredients: ['Sea Moss', 'Soursop', 'Spring Water', 'Organic Honey'],
          benefits: ['Digestive Health', 'Anti-inflammatory', 'Natural Healing'],
          image: '/images/products/healing-soursop.jpg',
          featured: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'grateful-guardian',
          name: 'Grateful Guardian',
          subtitle: 'Daily Protection',
          description: 'Our signature blend for daily wellness and protection.',
          price: 3200, // $32.00 in cents
          category: 'signature',
          size: '16 oz jar',
          stock: 30,
          lowStockThreshold: 8,
          ingredients: ['Sea Moss', 'Turmeric', 'Ginger', 'Spring Water'],
          benefits: ['Daily Wellness', 'Anti-inflammatory', 'Energy Boost'],
          image: '/images/products/grateful-guardian.jpg',
          featured: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'golden-glow',
          name: 'Golden Glow Gel',
          subtitle: 'Beauty & Vitality',
          description: 'Radiant beauty blend with turmeric and collagen-supporting nutrients.',
          price: 3800, // $38.00 in cents
          category: 'beauty',
          size: '16 oz jar',
          stock: 18,
          lowStockThreshold: 5,
          ingredients: ['Sea Moss', 'Turmeric', 'Collagen Peptides', 'Spring Water'],
          benefits: ['Skin Health', 'Natural Glow', 'Anti-aging'],
          image: '/images/products/golden-glow.jpg',
          featured: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      
      await db.collection('products').insertMany(defaultProducts);
      console.log('✅ Default products inserted');
    } else {
      console.log(`ℹ️  Found ${productCount} products in database`);
    }
    
    // 5. Create TTL index for expired coupons (auto-cleanup)
    await db.collection('coupons').createIndex(
      { expiresAt: 1 }, 
      { expireAfterSeconds: 0 }
    );
    console.log('✅ TTL index created for coupon expiry');
    
    // 6. Database statistics
    console.log('\n📊 Database Statistics:');
    const stats = await db.stats();
    console.log(`📁 Database: ${stats.db}`);
    console.log(`📦 Collections: ${stats.collections}`);
    console.log(`📄 Documents: ${stats.objects}`);
    console.log(`💾 Data Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`🗂️  Index Size: ${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`);
    
    console.log('\n✅ Database setup completed successfully!');
    console.log('\n🎯 Next Steps:');
    console.log('1. Configure production environment variables');
    console.log('2. Set up SSL certificates');
    console.log('3. Configure reverse proxy');
    console.log('4. Set up monitoring and backups');
    console.log('5. Update Square credentials for production');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔐 Database connection closed');
  }
}

// Run the setup
if (require.main === module) {
  setupDatabase().catch(error => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });
}

module.exports = { setupDatabase };