#!/usr/bin/env node
/**
 * Square Catalog Sync Script
 * 
 * Syncs Square Catalog data to local database/cache
 * Run with: node scripts/syncCatalog.ts
 */

import { getSquareClient } from '../lib/square';
import { connectToDatabase } from '../lib/db-optimized';
import { fromCents } from '../lib/money';

interface SyncedCatalogItem {
  id: string;
  type: string;
  name: string;
  description?: string;
  categoryId?: string;
  variations: SyncedVariation[];
  images?: string[];
  createdAt: Date;
  updatedAt: Date;
  squareUpdatedAt?: string;
}

interface SyncedVariation {
  id: string;
  name?: string;
  sku?: string;
  price: number; // USD dollars
  priceCents: number; // Cents
  currency: string;
}

interface SyncedCategory {
  id: string;
  name: string;
  type: string;
}

interface SyncStats {
  itemsCount: number;
  variationsCount: number;
  categoriesCount: number;
  imagesCount: number;
  syncedAt: Date;
}

async function syncSquareCatalog() {
  console.log('🔄 Starting Square Catalog Sync...\n');
  
  try {
    // Connect to database
    console.log('📦 Connecting to database...');
    const { db } = await connectToDatabase();
    
    // Get Square client
    console.log('🔌 Initializing Square client...');
    const square = getSquareClient();
    
    // Collections
    const itemsCollection = db.collection('square_catalog_items');
    const categoriesCollection = db.collection('square_catalog_categories');
    const metadataCollection = db.collection('square_sync_metadata');
    
    // Fetch all catalog items from Square
    console.log('📥 Fetching catalog from Square API...');
    
    const allItems: any[] = [];
    const allCategories: any[] = [];
    let cursor: string | undefined;
    let fetchCount = 0;
    
    do {
      fetchCount++;
      console.log(`   Fetching batch ${fetchCount}${cursor ? ' (cursor: ' + cursor.substring(0, 10) + '...)' : ''}`);
      
      try {
        const { result } = await square.catalog.listCatalog({
          cursor,
          types: 'ITEM,CATEGORY',
          limit: 100
        }) as any;
        
        if (result.objects) {
          result.objects.forEach((obj: any) => {
            if (obj.type === 'ITEM') {
              allItems.push(obj);
            } else if (obj.type === 'CATEGORY') {
              allCategories.push(obj);
            }
          });
        }
        
        cursor = result.cursor;
        
        console.log(`   ✓ Batch ${fetchCount}: ${result.objects?.length || 0} objects`);
      } catch (error: any) {
        console.error(`   ✗ Batch ${fetchCount} failed:`, error.message);
        break;
      }
    } while (cursor);
    
    console.log(`\n✓ Fetched ${allItems.length} items and ${allCategories.length} categories\n`);
    
    // Process and sync items
    console.log('💾 Syncing items to database...');
    
    const syncedItems: SyncedCatalogItem[] = [];
    let variationsCount = 0;
    let imagesCount = 0;
    
    for (const item of allItems) {
      const variations: SyncedVariation[] = [];
      
      // Process variations
      if (item.itemData?.variations) {
        for (const variation of item.itemData.variations) {
          const priceMoney = variation.itemVariationData?.priceMoney;
          const priceAmount = priceMoney?.amount;
          const priceCents = priceAmount ? Number(priceAmount) : 0;
          const priceDollars = fromCents({ amount: BigInt(priceCents), currency: 'USD' });
          
          variations.push({
            id: variation.id,
            name: variation.itemVariationData?.name || '',
            sku: variation.itemVariationData?.sku,
            price: priceDollars,
            priceCents,
            currency: priceMoney?.currency || 'USD'
          });
          
          variationsCount++;
        }
      }
      
      // Process images
      const images: string[] = [];
      if (item.itemData?.imageIds) {
        imagesCount += item.itemData.imageIds.length;
      }
      
      syncedItems.push({
        id: item.id,
        type: item.type,
        name: item.itemData?.name || 'Unnamed Item',
        description: item.itemData?.description,
        categoryId: item.itemData?.categoryId,
        variations,
        images,
        createdAt: new Date(item.createdAt || Date.now()),
        updatedAt: new Date(item.updatedAt || Date.now()),
        squareUpdatedAt: item.updatedAt
      });
    }
    
    // Sync categories
    console.log('📁 Syncing categories to database...');
    
    const syncedCategories: SyncedCategory[] = allCategories.map(cat => ({
      id: cat.id,
      name: cat.categoryData?.name || 'Unnamed Category',
      type: cat.type
    }));
    
    // Clear and insert
    console.log('🗑️  Clearing old data...');
    await itemsCollection.deleteMany({});
    await categoriesCollection.deleteMany({});
    
    console.log('💾 Inserting new data...');
    if (syncedItems.length > 0) {
      await itemsCollection.insertMany(syncedItems as any);
    }
    if (syncedCategories.length > 0) {
      await categoriesCollection.insertMany(syncedCategories as any);
    }
    
    // Store sync metadata
    const syncStats: SyncStats = {
      itemsCount: syncedItems.length,
      variationsCount,
      categoriesCount: syncedCategories.length,
      imagesCount,
      syncedAt: new Date()
    };
    
    await metadataCollection.updateOne(
      { _id: 'latest' },
      { $set: syncStats },
      { upsert: true }
    );
    
    // Create indexes for fast lookups
    console.log('📑 Creating indexes...');
    await itemsCollection.createIndex({ id: 1 }, { unique: true });
    await itemsCollection.createIndex({ 'variations.id': 1 });
    await categoriesCollection.createIndex({ id: 1 }, { unique: true });
    
    // Final summary
    console.log('\n' + '═'.repeat(60));
    console.log('✅ Sync Complete!');
    console.log('═'.repeat(60));
    console.log(`📊 Items synced: ${syncStats.itemsCount}`);
    console.log(`📊 Variations synced: ${syncStats.variationsCount}`);
    console.log(`📊 Categories synced: ${syncStats.categoriesCount}`);
    console.log(`📊 Images found: ${syncStats.imagesCount}`);
    console.log(`📊 Synced at: ${syncStats.syncedAt.toISOString()}`);
    console.log('\n✨ Catalog is now up to date!\n');
    
    process.exit(0);
    
  } catch (error: any) {
    console.error('\n❌ Sync Failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run sync
syncSquareCatalog();
