#!/usr/bin/env node
/**
 * Square Catalog Sync Script
 * 
 * Syncs Square Catalog data to local database/cache
 * Run with: npx ts-node scripts/syncCatalog.ts
 */

import { square } from '@/lib/square';
import { connectToDatabase } from '@/lib/db-optimized';
import { fromCents } from '@/lib/money';

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
  priceCents: number; // cents for exact calculations
  currency: string;
  trackQuantity: boolean;
  inventoryAlertThreshold?: number;
}

class CatalogSync {
  private db: any;
  private stats = {
    items: 0,
    variations: 0,
    images: 0,
    errors: 0
  };

  async initialize() {
    const { db } = await connectToDatabase();
    this.db = db;
  }

  async sync() {
    console.log('🔄 Starting Square Catalog sync...');
    
    try {
      await this.initialize();
      
      const objects: any[] = [];
      let cursor: string | undefined;
      let page = 0;

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
      const syncedItems: SyncedCatalogItem[] = [];
      
      for (const item of items) {
        try {
          const syncedItem = await this.processItem(item, variationMap, imageMap);
          if (syncedItem) {
            syncedItems.push(syncedItem);
            this.stats.items++;
          }
        } catch (error) {
          console.error(`❌ Failed to process item ${item.id}:`, error);
          this.stats.errors++;
        }
      }
      
      // Save to database
      await this.saveCatalogData(syncedItems, categories);
      
      console.log('✅ Catalog sync completed');
      console.log(`📈 Stats: ${this.stats.items} items, ${this.stats.variations} variations, ${this.stats.images} images, ${this.stats.errors} errors`);
      
    } catch (error) {
      console.error('💥 Catalog sync failed:', error);
      throw error;
    }
  }

  private async processItem(item: any, variationMap: Map<string, any>, imageMap: Map<string, string>): Promise<SyncedCatalogItem | null> {
    const itemData = item.itemData;
    if (!itemData) return null;

    // Get variations for this item
    const itemVariations: SyncedVariation[] = [];
    
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
    const itemImages: string[] = [];
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

  private processVariation(variation: any): SyncedVariation | null {
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

  private async saveCatalogData(items: SyncedCatalogItem[], categories: any[]) {
    console.log('💾 Saving catalog data to database...');
    
    try {
      // Clear existing catalog data
      await this.db.collection('square_catalog_items').deleteMany({});
      await this.db.collection('square_catalog_categories').deleteMany({});
      
      // Insert items
      if (items.length > 0) {
        await this.db.collection('square_catalog_items').insertMany(items);
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
        await this.db.collection('square_catalog_categories').insertMany(processedCategories);
        console.log(`✅ Saved ${processedCategories.length} categories`);
      }
      
      // Create indexes for fast lookups
      await this.db.collection('square_catalog_items').createIndex({ id: 1 }, { unique: true });
      await this.db.collection('square_catalog_items').createIndex({ 'variations.id': 1 });
      await this.db.collection('square_catalog_categories').createIndex({ id: 1 }, { unique: true });
      
      // Save sync metadata
      await this.db.collection('square_sync_metadata').replaceOne(
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
      
    } catch (error) {
      console.error('💥 Failed to save catalog data:', error);
      throw error;
    }
  }

  async getLocalCatalogItem(itemId: string) {
    if (!this.db) await this.initialize();
    return await this.db.collection('square_catalog_items').findOne({ id: itemId });
  }

  async getLocalCatalogVariation(variationId: string) {
    if (!this.db) await this.initialize();
    return await this.db.collection('square_catalog_items').findOne(
      { 'variations.id': variationId },
      { projection: { variations: { $elemMatch: { id: variationId } } } }
    );
  }

  async searchLocalCatalog(query: string, limit = 20) {
    if (!this.db) await this.initialize();
    return await this.db.collection('square_catalog_items')
      .find(
        { 
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } }
          ]
        },
        { limit }
      )
      .toArray();
  }
}

// Export for use in other modules
export const catalogSync = new CatalogSync();

// CLI execution
async function main() {
  if (require.main === module) {
    try {
      await catalogSync.sync();
      process.exit(0);
    } catch (error) {
      console.error('💥 Sync failed:', error);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  main();
}