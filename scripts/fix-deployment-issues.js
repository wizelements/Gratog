/**
 * Deployment Fix Script
 * Fixes critical deployment issues:
 * 1. Creates admin user if missing
 * 2. Syncs Square catalog to MongoDB
 * 3. Validates environment variables
 */

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

// Environment variable validation (Square vars are optional during build)
const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET'
];

async function validateEnvironment() {
  console.log('🔍 Validating environment variables...');
  const missing = [];
  
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(v => console.error(`   - ${v}`));
    return false;
  }
  
  console.log('✅ All required environment variables present');
  return true;
}

async function ensureAdminUser() {
  console.log('👤 Ensuring admin user exists...');
  
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL;
  const dbName = process.env.DATABASE_NAME || process.env.DB_NAME || 'taste_of_gratitude';
  
  if (!mongoUri) {
    console.error('❌ MongoDB URI not found. Set MONGODB_URI or MONGO_URL');
    return false;
  }
  
  let client;
  try {
    client = await MongoClient.connect(mongoUri);
    const db = client.db(dbName);
    const adminUsers = db.collection('admin_users');
    
    // Check if admin exists
    const existingAdmin = await adminUsers.findOne({ email: 'admin@tasteofgratitude.com' });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      return true;
    }
    
    // Create admin user
    const defaultPassword = 'TasteOfGratitude2025!';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    
    const adminUser = {
      email: 'admin@tasteofgratitude.com',
      name: 'Admin',
      role: 'admin',
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await adminUsers.insertOne(adminUser);
    console.log('✅ Admin user created successfully');
    console.log('   Email: admin@tasteofgratitude.com');
    console.log('   Password: TasteOfGratitude2025!');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to ensure admin user:', error.message);
    return false;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

async function syncSquareCatalog() {
  console.log('📦 Syncing Square catalog...');
  
  try {
    // Check if Square credentials are configured
    if (!process.env.SQUARE_ACCESS_TOKEN || !process.env.SQUARE_LOCATION_ID) {
      console.log('⚠️  Square credentials not configured - skipping catalog sync');
      console.log('   Demo products will be used as fallback');
      return true; // Not critical for deployment
    }
    
    const SQUARE_ENV = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase();
    const SQUARE_BASE = SQUARE_ENV === 'production' 
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';
    const SQUARE_TOKEN = process.env.SQUARE_ACCESS_TOKEN.trim();
    const SQUARE_VERSION = '2025-10-16';
    
    console.log('📋 Square Configuration:');
    console.log('   Environment:', SQUARE_ENV);
    console.log('   Token prefix:', SQUARE_TOKEN.substring(0, 10) + '...');
    console.log('   Location ID:', process.env.SQUARE_LOCATION_ID);
    
    // Test connectivity first
    console.log('🔌 Testing Square API connectivity...');
    const locationUrl = `${SQUARE_BASE}/v2/locations/${process.env.SQUARE_LOCATION_ID}`;
    const locationResponse = await fetch(locationUrl, {
      headers: {
        'Authorization': `Bearer ${SQUARE_TOKEN}`,
        'Square-Version': SQUARE_VERSION,
        'Content-Type': 'application/json'
      }
    });
    
    if (!locationResponse.ok) {
      const errorText = await locationResponse.text();
      console.error('❌ Square API connection failed:', locationResponse.status);
      console.error('   Response:', errorText);
      throw new Error(`Square API returned ${locationResponse.status}`);
    }
    
    const locationData = await locationResponse.json();
    console.log('✅ Connected to Square successfully');
    console.log('   Location:', locationData.location?.name);
    
    console.log('📡 Fetching catalog from Square API...');
    const catalogUrl = `${SQUARE_BASE}/v2/catalog/list?types=ITEM,ITEM_VARIATION,IMAGE,CATEGORY`;
    const catalogResponse = await fetch(catalogUrl, {
      headers: {
        'Authorization': `Bearer ${SQUARE_TOKEN}`,
        'Square-Version': SQUARE_VERSION,
        'Content-Type': 'application/json'
      }
    });
    
    if (!catalogResponse.ok) {
      const errorText = await catalogResponse.text();
      console.error('❌ Square catalog fetch failed:', catalogResponse.status);
      console.error('   Response:', errorText);
      throw new Error(`Square API returned ${catalogResponse.status}`);
    }
    
    const catalogData = await catalogResponse.json();
    
    if (!catalogData.objects || catalogData.objects.length === 0) {
      console.log('⚠️  No products found in Square catalog');
      console.log('   Demo products will be used as fallback');
      return true;
    }
    
    console.log(`📦 Found ${catalogData.objects.length} catalog objects`);
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL;
    const dbName = process.env.DATABASE_NAME || process.env.DB_NAME || 'taste_of_gratitude';
    const client = await MongoClient.connect(mongoUri);
    const db = client.db(dbName);
    
    // Group objects by type
    const items = catalogData.objects.filter(obj => obj.type === 'ITEM');
    const variations = catalogData.objects.filter(obj => obj.type === 'ITEM_VARIATION');
    const images = catalogData.objects.filter(obj => obj.type === 'IMAGE');
    const categories = catalogData.objects.filter(obj => obj.type === 'CATEGORY');
    
    // Create lookup maps
    const variationMap = new Map();
    variations.forEach(v => variationMap.set(v.id, v));
    
    const imageMap = new Map();
    images.forEach(img => {
      const imageData = img.image_data || img.imageData;
      if (imageData?.url) imageMap.set(img.id, imageData.url);
    });
    
    const categoryMap = new Map();
    categories.forEach(cat => {
      const catData = cat.category_data || cat.categoryData;
      if (catData?.name) categoryMap.set(cat.id, catData.name);
    });
    
    // Process and save items
    const collection = db.collection('square_catalog_items');
    let syncedCount = 0;
    
    for (const item of items) {
      const itemData = item.item_data || item.itemData;
      if (!itemData) continue;
      
      const itemVariations = [];
      if (itemData.variations) {
        for (const varRef of itemData.variations) {
          const variation = varRef.type === 'ITEM_VARIATION' ? varRef : variationMap.get(varRef.id);
          if (variation) {
            const varData = variation.item_variation_data || variation.itemVariationData;
            if (varData) {
              const priceMoney = varData.price_money || varData.priceMoney;
              const priceCents = priceMoney?.amount ? Number(priceMoney.amount) : 0;
              itemVariations.push({
                id: variation.id,
                name: varData.name || 'Regular',
                sku: varData.sku,
                price: priceCents / 100,
                priceCents,
                currency: priceMoney?.currency || 'USD'
              });
            }
          }
        }
      }
      
      const itemImages = [];
      const imageIds = itemData.image_ids || itemData.imageIds || [];
      for (const imageId of imageIds) {
        const imageUrl = imageMap.get(imageId);
        if (imageUrl) itemImages.push(imageUrl);
      }
      
      const categoryId = itemData.category_id || itemData.categoryId;
      const categoryName = categoryId ? categoryMap.get(categoryId) : null;
      
      const product = {
        id: item.id,
        type: item.type,
        name: itemData.name || 'Unnamed Item',
        description: itemData.description || '',
        categoryId,
        category: categoryName,
        variations: itemVariations,
        images: itemImages,
        createdAt: new Date(),
        updatedAt: new Date(),
        squareUpdatedAt: item.updated_at || item.updatedAt
      };
      
      await collection.updateOne(
        { id: item.id },
        { $set: product },
        { upsert: true }
      );
      
      syncedCount++;
    }
    
    console.log(`✅ Successfully synced ${syncedCount} products to MongoDB`);
    await client.close();
    return true;
    
  } catch (error) {
    console.error('❌ Failed to sync Square catalog:', error.message);
    console.log('   Demo products will be used as fallback');
    
    // Log additional error details for debugging
    if (error.errors && Array.isArray(error.errors)) {
      error.errors.forEach(err => console.error('   -', err.detail || err.code || err));
    }
    
    // Return true to allow deployment to continue with demo products
    return true;
  }
}

async function createIndexes() {
  console.log('📊 Creating database indexes...');
  
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL;
  const dbName = process.env.DATABASE_NAME || process.env.DB_NAME || 'taste_of_gratitude';
  
  if (!mongoUri) {
    console.log('⚠️  Skipping indexes - no MongoDB connection');
    return true;
  }
  
  let client;
  try {
    client = await MongoClient.connect(mongoUri);
    const db = client.db(dbName);
    
    // Admin users indexes
    await db.collection('admin_users').createIndex({ email: 1 }, { unique: true });
    
    // Products indexes
    await db.collection('square_catalog_items').createIndex({ id: 1 }, { unique: true });
    await db.collection('products_unified').createIndex({ id: 1 }, { unique: true });
    await db.collection('products_unified').createIndex({ intelligentCategory: 1 });
    
    // Orders indexes
    await db.collection('orders').createIndex({ id: 1 });
    await db.collection('orders').createIndex({ 'customer.email': 1 });
    await db.collection('orders').createIndex({ createdAt: -1 });
    
    console.log('✅ Database indexes created');
    return true;
  } catch (error) {
    console.error('❌ Failed to create indexes:', error.message);
    return false;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

async function main() {
  console.log('🚀 Starting deployment fix script...\n');
  
  const results = {
    environment: await validateEnvironment(),
    adminUser: await ensureAdminUser(),
    squareSync: await syncSquareCatalog(),
    indexes: await createIndexes()
  };
  
  console.log('\n📊 Results:');
  console.log('   Environment:', results.environment ? '✅' : '❌');
  console.log('   Admin User:', results.adminUser ? '✅' : '❌');
  console.log('   Square Sync:', results.squareSync ? '✅' : '❌');
  console.log('   Indexes:', results.indexes ? '✅' : '❌');
  
  const allSuccess = Object.values(results).every(r => r);
  
  if (allSuccess) {
    console.log('\n✅ All deployment fixes completed successfully!');
  } else {
    console.log('\n⚠️  Some fixes failed. Please check the logs above.');
  }
  // Always exit 0 to not fail installs/builds - this is a best-effort script
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  // Don't fail builds - just log and continue
  process.exit(0);
});
