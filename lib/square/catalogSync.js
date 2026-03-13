/**
 * Square Catalog Sync (ESM Module for Vercel Serverless)
 * Extracted from scripts/syncCatalog.js for serverless compatibility
 */

import { extractSquareVisibilityFlags } from '../square-visibility.js';

const DEBUG = process.env.DEBUG === 'true' || process.env.VERBOSE === 'true';
const debug = (...args) => { if (DEBUG) console.log('[CATALOG-SYNC]', ...args); };

const SQUARE_VERSION = '2025-10-16';

function getSquareEnvironment() {
  return (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase() === 'production'
    ? 'production'
    : 'sandbox';
}

function getSquareConfig() {
  const environment = getSquareEnvironment();
  return {
    environment,
    baseUrl: environment === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com',
    token: (process.env.SQUARE_ACCESS_TOKEN || '').trim(),
    locationId: (process.env.SQUARE_LOCATION_ID || '').trim() || null
  };
}

function validateSquareToken(token) {
  if (!token) {
    throw new Error('Missing Square configuration: SQUARE_ACCESS_TOKEN is not set');
  }

  if (token.startsWith('sq0csp-')) {
    throw new Error(
      'SQUARE_ACCESS_TOKEN is a Client Secret (sq0csp-). Use a Square Access Token (EAAA... or sq0atp-...) instead.'
    );
  }
}

function parseSquareJson(text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    const parseError = new Error('Square API returned a non-JSON response');
    parseError.cause = error;
    parseError.raw = text.slice(0, 200);
    throw parseError;
  }
}

async function squareFetch(config, path, options = {}) {
  const url = `${config.baseUrl}${path}`;
  const headers = {
    'Authorization': `Bearer ${config.token}`,
    'Square-Version': SQUARE_VERSION,
    'Content-Type': 'application/json',
    ...options.headers
  };

  const response = await fetch(url, { ...options, headers });
  const text = await response.text();
  const json = parseSquareJson(text);
  
  if (!response.ok) {
    const error = new Error(json?.errors?.[0]?.detail || `Square ${response.status}`);
    error.status = response.status;
    error.errors = json?.errors;
    throw error;
  }
  
  return json;
}

async function resolvePrimaryLocationId(config) {
  if (config.locationId) {
    try {
      await squareFetch(config, `/v2/locations/${config.locationId}`);
      return config.locationId;
    } catch (error) {
      if (error.status !== 404 && error.status !== 403) {
        throw error;
      }
      debug('⚠️ Configured location is not accessible; falling back to active locations');
    }
  }

  const locationsResponse = await squareFetch(config, '/v2/locations');
  const activeLocation = (locationsResponse.locations || []).find(
    (location) => (location.status || '').toUpperCase() === 'ACTIVE'
  );

  if (!activeLocation?.id) {
    throw new Error('No active Square location found for connectivity check');
  }

  return activeLocation.id;
}

function fromCents(priceMoney) {
  if (!priceMoney?.amount) return 0;
  const amount = typeof priceMoney.amount === 'bigint' ? Number(priceMoney.amount) : priceMoney.amount;
  return amount / 100;
}

export class CatalogSync {
  constructor() {
    this.stats = {
      items: 0,
      variations: 0,
      images: 0,
      errors: 0
    };
    this.environment = null;
    this.locationId = null;
  }

  async sync({ db }) {
    debug('🔄 Starting Square Catalog sync...');
    
    try {
      const squareConfig = getSquareConfig();
      validateSquareToken(squareConfig.token);

      this.environment = squareConfig.environment;
      this.locationId = await resolvePrimaryLocationId(squareConfig);

      debug('📋 Square Configuration:');
      debug('  Environment:', this.environment);
      debug('  Location ID:', this.locationId);
      
      const objects = [];
      let cursor = undefined;
      let page = 0;

      // Test connectivity
      try {
        debug('🔌 Testing Square API connectivity...');
        const testResponse = await squareFetch(squareConfig, `/v2/locations/${this.locationId}`);
        debug('✅ Connected to Square successfully');
        debug('   Location:', testResponse.location?.name);
      } catch (error) {
        console.error('❌ Square API connection failed:', error.message);
        throw new Error('Cannot connect to Square API');
      }

      // Paginate through catalog
      do {
        page++;
        debug(`📄 Fetching page ${page}${cursor ? ` (cursor: ${cursor.substring(0, 10)}...)` : ''}`);
        
        const types = ['ITEM', 'ITEM_VARIATION', 'CATEGORY', 'IMAGE'].join(',');
        const path = `/v2/catalog/list?types=${types}${cursor ? `&cursor=${cursor}` : ''}`;
        const result = await squareFetch(squareConfig, path);
        
        if (result.objects) {
          objects.push(...result.objects);
          debug(`   Found ${result.objects.length} objects`);
        }
        
        cursor = result.cursor;
      } while (cursor);

      debug(`📦 Total objects retrieved: ${objects.length}`);
      
      if (objects.length === 0) {
        console.warn('⚠️  No catalog objects found');
        return this.stats;
      }
      
      // Group objects
      const items = objects.filter(obj => obj.type === 'ITEM');
      const variations = objects.filter(obj => obj.type === 'ITEM_VARIATION');
      const categories = objects.filter(obj => obj.type === 'CATEGORY');
      const images = objects.filter(obj => obj.type === 'IMAGE');
      
      debug(`📊 Items: ${items.length}, Variations: ${variations.length}, Categories: ${categories.length}, Images: ${images.length}`);
      
      // Create lookups
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
      
      // Process items
      const syncedItems = [];
      
      for (const item of items) {
        try {
          const syncedItem = this.processItem(item, variationMap, imageMap, categoryMap);
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
      
      debug('✅ Catalog sync completed');
      debug(`📈 Stats: ${this.stats.items} items, ${this.stats.variations} variations, ${this.stats.images} images, ${this.stats.errors} errors`);
      
      return this.stats;
      
    } catch (error) {
      console.error('💥 Catalog sync failed:', error.message);
      throw error;
    }
  }

  processItem(item, variationMap, imageMap, categoryMap) {
    const itemData = item.item_data || item.itemData;
    if (!itemData) return null;

    const itemVariations = [];
    
    if (itemData.variations) {
      for (const varRef of itemData.variations) {
        const variation = varRef.type === 'ITEM_VARIATION' ? varRef : variationMap.get(varRef.id);
        if (variation) {
          const syncedVar = this.processVariation(variation);
          if (syncedVar) {
            itemVariations.push(syncedVar);
            this.stats.variations++;
          }
        }
      }
    }
    
    const itemImages = [];
    const imageIds = itemData.image_ids || itemData.imageIds || [];
    if (imageIds.length > 0) {
      for (const imageId of imageIds) {
        const imageUrl = imageMap.get(imageId);
        if (imageUrl) {
          itemImages.push(imageUrl);
          this.stats.images++;
        }
      }
    }

    const categoryId = itemData.category_id || itemData.categoryId;
    const categoryName = categoryId ? categoryMap.get(categoryId) : null;
    const visibility = extractSquareVisibilityFlags({
      squareIsArchived: itemData.is_archived ?? itemData.isArchived,
      squareEcomVisibility: itemData.ecom_visibility ?? itemData.ecomVisibility,
      squareEcomAvailable: itemData.ecom_available ?? itemData.ecomAvailable,
      squareChannels: itemData.channels ?? item.channels,
      squarePresentAtAllLocations: item.present_at_all_locations ?? item.presentAtAllLocations,
      squarePresentAtLocationIds: item.present_at_location_ids ?? item.presentAtLocationIds,
      squareAbsentAtLocationIds: item.absent_at_location_ids ?? item.absentAtLocationIds
    });

    return {
      id: item.id,
      type: item.type,
      name: itemData.name || 'Unnamed Item',
      description: itemData.description,
      categoryId: categoryId,
      category: categoryName,
      squareIsArchived: visibility.squareIsArchived,
      squareEcomVisibility: visibility.squareEcomVisibility,
      squareEcomAvailable: visibility.squareEcomAvailable,
      squareChannels: visibility.squareChannels,
      squarePresentAtAllLocations: visibility.squarePresentAtAllLocations,
      squarePresentAtLocationIds: visibility.squarePresentAtLocationIds,
      squareAbsentAtLocationIds: visibility.squareAbsentAtLocationIds,
      variations: itemVariations,
      images: itemImages,
      createdAt: new Date(),
      updatedAt: new Date(),
      squareUpdatedAt: item.updated_at || item.updatedAt
    };
  }

  processVariation(variation) {
    const varData = variation.item_variation_data || variation.itemVariationData;
    if (!varData) return null;

    const priceMoney = varData.price_money || varData.priceMoney;
    const priceCents = priceMoney?.amount ? Number(priceMoney.amount) : 0;
    
    return {
      id: variation.id,
      name: varData.name,
      sku: varData.sku,
      price: fromCents(priceMoney),
      priceCents,
      currency: priceMoney?.currency || 'USD',
      trackQuantity: varData.track_quantity || varData.trackQuantity || false,
      inventoryAlertThreshold: varData.inventory_alert_threshold || varData.inventoryAlertThreshold
    };
  }

  async saveCatalogData(db, items, categories) {
    debug('💾 Saving catalog data to database...');
    
    try {
      await db.collection('square_catalog_items').deleteMany({});
      await db.collection('square_catalog_categories').deleteMany({});
      debug('   Cleared existing data');
      
      if (items.length > 0) {
        await db.collection('square_catalog_items').insertMany(items);
        debug(`✅ Saved ${items.length} items`);
      }
      
      const processedCategories = categories.map(cat => ({
        id: cat.id,
        type: cat.type,
        name: (cat.category_data || cat.categoryData)?.name || 'Unnamed Category',
        createdAt: new Date(),
        updatedAt: new Date(),
        squareUpdatedAt: cat.updated_at || cat.updatedAt
      }));
      
      if (processedCategories.length > 0) {
        await db.collection('square_catalog_categories').insertMany(processedCategories);
        debug(`✅ Saved ${processedCategories.length} categories`);
      }
      
      await db.collection('square_catalog_items').createIndex({ id: 1 }, { unique: true });
      await db.collection('square_catalog_items').createIndex({ 'variations.id': 1 });
      await db.collection('square_catalog_categories').createIndex({ id: 1 }, { unique: true });
      debug('   Created database indexes');
      
      await db.collection('square_sync_metadata').replaceOne(
        { type: 'catalog_sync' },
        {
          type: 'catalog_sync',
          lastSyncAt: new Date(),
          stats: this.stats,
          itemCount: items.length,
          categoryCount: processedCategories.length,
          environment: this.environment || getSquareEnvironment(),
          locationId: this.locationId || null
        },
        { upsert: true }
      );
      debug('   Saved sync metadata');
      
    } catch (error) {
      console.error('💥 Failed to save catalog data:', error);
      throw error;
    }
  }
}

export async function syncSquareCatalog(db) {
  const catalogSync = new CatalogSync();
  return await catalogSync.sync({ db });
}
