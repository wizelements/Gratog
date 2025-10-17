#!/usr/bin/env node
/**
 * Square Catalog Sync Script (JavaScript version)
 * 
 * Syncs Square Catalog data to local database/cache
 * Run with: node scripts/syncCatalog.js
 */

// Load environment variables
require('dotenv').config();

const { SquareClient, SquareEnvironment } = require('square');
const { MongoClient } = require('mongodb');

// Initialize Square client
const square = new SquareClient({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: process.env.SQUARE_ENVIRONMENT === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
});

const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID;

// MongoDB connection
async function connectToDatabase() {
  const client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  const db = client.db(process.env.DB_NAME || 'taste_of_gratitude');
  return { client, db };
}

// Convert cents to dollars
function fromCents(priceMoney) {
  if (!priceMoney?.amount) return 0;
  const amount = typeof priceMoney.amount === 'bigint' ? Number(priceMoney.amount) : priceMoney.amount;
  return amount / 100;
}

class CatalogSync {
  constructor() {
    this.stats = {
      items: 0,
      variations: 0,
      images: 0,
      errors: 0
    };
  }

  async sync() {
    console.log('🔄 Starting Square Catalog sync...');
    
    try {
      // Validate configuration
      if (!process.env.SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) {
        throw new Error('Missing Square configuration. Please check SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID environment variables.');
      }

      console.log('📋 Square Configuration:');
      console.log('  Environment:', process.env.SQUARE_ENVIRONMENT || 'sandbox');
      console.log('  Location ID:', SQUARE_LOCATION_ID);
      
      const { client: mongoClient, db } = await connectToDatabase();
      
      const objects = [];
      let cursor = undefined;
      let page = 0;

      // Test Square API connectivity first
      try {
        console.log('🔌 Testing Square API connectivity...');
        const testResponse = await square.locationsApi.retrieveLocation({
          locationId: SQUARE_LOCATION_ID
        });
        console.log('✅ Connected to Square successfully');
        console.log('   Location:', testResponse.result.location?.name);
      } catch (error) {
        console.error('❌ Square API connection failed:', error.message);
        throw new Error('Cannot connect to Square API. Please check your credentials.');
      }

      // Paginate through all catalog objects
      do {
        page++;
        console.log(`📄 Fetching page ${page}${cursor ? ` (cursor: ${cursor.substring(0, 10)}...)` : ''}`);
        
        const { result } = await square.catalogApi.listCatalog({
          cursor,
          types: ['ITEM', 'ITEM_VARIATION', 'CATEGORY', 'IMAGE']
        });
        
        if (result.objects) {
          objects.push(...result.objects);
          console.log(`   Found ${result.objects.length} objects`);
        }
        
        cursor = result.cursor;
      } while (cursor);

      console.log(`📦 Total objects retrieved: ${objects.length}`);
      
      if (objects.length === 0) {
        console.warn('⚠️  No catalog objects found. This might indicate:');
        console.warn('   - Empty catalog in Square');
        console.warn('   - Invalid credentials');
        console.warn('   - Location has no items');
        mongoClient.close();
        return;
      }
      
      // Group objects by type
      const items = objects.filter(obj => obj.type === 'ITEM');
      const variations = objects.filter(obj => obj.type === 'ITEM_VARIATION');
      const categories = objects.filter(obj => obj.type === 'CATEGORY');
      const images = objects.filter(obj => obj.type === 'IMAGE');
      
      console.log(`📊 Items: ${items.length}, Variations: ${variations.length}, Categories: ${categories.length}, Images: ${images.length}`);
      
      // Create variation lookup map
      const variationMap = new Map();
      variations.forEach(v => {
        variationMap.set(v.id, v);
      });
      
      // Create image lookup map
      const imageMap = new Map();
      images.forEach(img => {
        imageMap.set(img.id, img.imageData?.url);
      });
      
      // Process items and their variations
      const syncedItems = [];
      
      for (const item of items) {
        try {
          const syncedItem = this.processItem(item, variationMap, imageMap);
          if (syncedItem) {
            syncedItems.push(syncedItem);
            this.stats.items++;
          }
        } catch (error) {
          console.error(`❌ Failed to process item ${item.id}:`, error.message);
          this.stats.errors++;
        }
      }
      
      // Save to database
      await this.saveCatalogData(db, syncedItems, categories);
      
      console.log('✅ Catalog sync completed');
      console.log(`📈 Stats: ${this.stats.items} items, ${this.stats.variations} variations, ${this.stats.images} images, ${this.stats.errors} errors`);
      
      mongoClient.close();
      
    } catch (error) {
      console.error('💥 Catalog sync failed:', error.message);
      console.error('Full error:', error);
      throw error;
    }
  }

  processItem(item, variationMap, imageMap) {
    const itemData = item.itemData;
    if (!itemData) return null;

    // Get variations for this item
    const itemVariations = [];
    
    if (itemData.variations) {
      for (const varRef of itemData.variations) {
        const variation = variationMap.get(varRef.id);
        if (variation) {
          const syncedVar = this.processVariation(variation);
          if (syncedVar) {
            itemVariations.push(syncedVar);
            this.stats.variations++;
          }
        }
      }
    }
    
    // Get images for this item
    const itemImages = [];
    if (itemData.imageIds) {
      for (const imageId of itemData.imageIds) {
        const imageUrl = imageMap.get(imageId);
        if (imageUrl) {
          itemImages.push(imageUrl);
          this.stats.images++;
        }
      }
    }

    return {
      id: item.id,
      type: item.type,
      name: itemData.name || 'Unnamed Item',
      description: itemData.description,
      categoryId: itemData.categoryId,
      variations: itemVariations,
      images: itemImages,
      createdAt: new Date(),
      updatedAt: new Date(),
      squareUpdatedAt: item.updatedAt
    };
  }

  processVariation(variation) {
    const varData = variation.itemVariationData;
    if (!varData) return null;

    const priceMoney = varData.priceMoney;
    const priceCents = priceMoney?.amount ? Number(priceMoney.amount) : 0;
    
    return {
      id: variation.id,
      name: varData.name,
      sku: varData.sku,
      price: fromCents(priceMoney),
      priceCents,
      currency: priceMoney?.currency || 'USD',
      trackQuantity: varData.trackQuantity || false,
      inventoryAlertThreshold: varData.inventoryAlertThreshold
    };
  }

  async saveCatalogData(db, items, categories) {
    console.log('💾 Saving catalog data to database...');
    
    try {
      // Clear existing catalog data
      await db.collection('square_catalog_items').deleteMany({});
      await db.collection('square_catalog_categories').deleteMany({});
      console.log('   Cleared existing data');
      
      // Insert items
      if (items.length > 0) {
        await db.collection('square_catalog_items').insertMany(items);
        console.log(`✅ Saved ${items.length} items`);
      }
      
      // Process and insert categories
      const processedCategories = categories.map(cat => ({
        id: cat.id,
        type: cat.type,
        name: cat.categoryData?.name || 'Unnamed Category',
        createdAt: new Date(),
        updatedAt: new Date(),
        squareUpdatedAt: cat.updatedAt
      }));
      
      if (processedCategories.length > 0) {
        await db.collection('square_catalog_categories').insertMany(processedCategories);
        console.log(`✅ Saved ${processedCategories.length} categories`);
      }
      
      // Create indexes for fast lookups
      await db.collection('square_catalog_items').createIndex({ id: 1 }, { unique: true });
      await db.collection('square_catalog_items').createIndex({ 'variations.id': 1 });
      await db.collection('square_catalog_categories').createIndex({ id: 1 }, { unique: true });
      console.log('   Created database indexes');
      
      // Save sync metadata
      await db.collection('square_sync_metadata').replaceOne(
        { type: 'catalog_sync' },
        {
          type: 'catalog_sync',
          lastSyncAt: new Date(),
          stats: this.stats,
          itemCount: items.length,
          categoryCount: processedCategories.length
        },
        { upsert: true }
      );
      console.log('   Saved sync metadata');
      
    } catch (error) {
      console.error('💥 Failed to save catalog data:', error);
      throw error;
    }
  }
}

// CLI execution
async function main() {
  try {
    const catalogSync = new CatalogSync();
    await catalogSync.sync();
    console.log('🎉 Sync completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Sync failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { CatalogSync };