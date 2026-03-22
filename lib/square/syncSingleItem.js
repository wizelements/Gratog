/**
 * Sync a single Square catalog item by object ID (ESM Module)
 * Used by webhook handler on `catalog.version.updated` events
 */

import { logger } from '@/lib/logger';
import { extractSquareVisibilityFlags } from '../square-visibility.js';
import { enrichProductWithIngredients } from '../ingredient-taxonomy.js';
import { autoCategorizProduct } from './syncToUnified.js';

const SQUARE_VERSION = '2025-10-16';

function getSquareConfig() {
  const environment = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase() === 'production'
    ? 'production'
    : 'sandbox';
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

  let json = {};
  if (text) {
    try {
      json = JSON.parse(text);
    } catch (error) {
      const parseError = new Error('Square API returned a non-JSON response');
      parseError.cause = error;
      parseError.raw = text.slice(0, 200);
      throw parseError;
    }
  }

  if (!response.ok) {
    const error = new Error(json?.errors?.[0]?.detail || `Square ${response.status}`);
    error.status = response.status;
    error.errors = json?.errors;
    throw error;
  }

  return json;
}

function fromCents(priceMoney) {
  if (!priceMoney?.amount) return 0;
  const amount = typeof priceMoney.amount === 'bigint' ? Number(priceMoney.amount) : priceMoney.amount;
  return amount / 100;
}

function processVariation(variation) {
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

function processItem(item, relatedObjects) {
  const itemData = item.item_data || item.itemData;
  if (!itemData) return null;

  const imageMap = new Map();
  const categoryMap = new Map();

  if (relatedObjects) {
    for (const obj of relatedObjects) {
      if (obj.type === 'IMAGE') {
        const imageData = obj.image_data || obj.imageData;
        if (imageData?.url) imageMap.set(obj.id, imageData.url);
      }
      if (obj.type === 'CATEGORY') {
        const catData = obj.category_data || obj.categoryData;
        if (catData?.name) categoryMap.set(obj.id, catData.name);
      }
    }
  }

  const itemVariations = [];
  if (itemData.variations) {
    for (const varRef of itemData.variations) {
      const syncedVar = processVariation(varRef);
      if (syncedVar) itemVariations.push(syncedVar);
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
    categoryId,
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

async function handleCategoryObject(db, object) {
  const catData = object.category_data || object.categoryData;
  const category = {
    id: object.id,
    type: object.type,
    name: catData?.name || 'Unnamed Category',
    updatedAt: new Date(),
    squareUpdatedAt: object.updated_at || object.updatedAt
  };

  await db.collection('square_catalog_categories').updateOne(
    { id: object.id },
    { $set: category, $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  );

  logger.info('SyncSingleItem', `📂 Updated category: ${category.name} (${object.id})`);
  return { success: true, itemId: object.id, name: category.name, type: 'CATEGORY' };
}

async function handleImageObject(db, object) {
  const imageData = object.image_data || object.imageData;
  const image = {
    id: object.id,
    type: object.type,
    url: imageData?.url || null,
    name: imageData?.name || null,
    updatedAt: new Date(),
    squareUpdatedAt: object.updated_at || object.updatedAt
  };

  await db.collection('square_catalog_images').updateOne(
    { id: object.id },
    { $set: image, $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  );

  logger.info('SyncSingleItem', `🖼️ Updated image: ${object.id}`);
  return { success: true, itemId: object.id, name: image.name, type: 'IMAGE' };
}

export async function syncSingleCatalogItem(db, objectId) {
  logger.info('SyncSingleItem', `🔄 Syncing single catalog object: ${objectId}`);

  const config = getSquareConfig();
  validateSquareToken(config.token);

  const result = await squareFetch(
    config,
    `/v2/catalog/object/${objectId}?include_related_objects=true`
  );

  const object = result.object;
  if (!object) {
    throw new Error(`Catalog object not found: ${objectId}`);
  }

  const relatedObjects = result.related_objects || [];

  if (object.type === 'CATEGORY') {
    return handleCategoryObject(db, object);
  }

  if (object.type === 'IMAGE') {
    return handleImageObject(db, object);
  }

  if (object.type !== 'ITEM') {
    logger.info('SyncSingleItem', `⏭️ Skipping unsupported object type: ${object.type} (${objectId})`);
    return { success: true, itemId: objectId, name: null, type: object.type, skipped: true };
  }

  const processedItem = processItem(object, relatedObjects);
  if (!processedItem) {
    throw new Error(`Failed to process item data for: ${objectId}`);
  }

  await db.collection('square_catalog_items').updateOne(
    { id: processedItem.id },
    { $set: { ...processedItem, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  );

  logger.info('SyncSingleItem', `💾 Upserted square_catalog_items: ${processedItem.name}`);

  const existingProduct = await db.collection('unified_products').findOne({ id: processedItem.id });
  const hasManualOverride = existingProduct?.manualCategoryOverride === true;

  const enrichedProduct = enrichProductWithIngredients(processedItem);

  let intelligentCategory = enrichedProduct.intelligentCategory;
  if (hasManualOverride && existingProduct.intelligentCategory) {
    intelligentCategory = existingProduct.intelligentCategory;
    logger.info('SyncSingleItem', `⚠️ Using manual category override for ${processedItem.name}: ${intelligentCategory}`);
  }

  const simpleAutoCategory = autoCategorizProduct(processedItem);

  const slug = processedItem.name
    ?.toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  const primaryVariation = processedItem.variations?.[0] || {};
  const price = processedItem.price || primaryVariation.price || 0;
  const priceCents = processedItem.priceCents || primaryVariation.priceCents || (price * 100);
  const visibility = extractSquareVisibilityFlags(processedItem);

  const unifiedProduct = {
    id: processedItem.id,
    squareId: processedItem.id,
    slug,
    name: processedItem.name,
    description: processedItem.description || `Premium ${processedItem.name}`,
    price,
    priceCents,
    currency: 'USD',
    category: intelligentCategory,
    squareCategory: processedItem.category,
    squareCategoryId: processedItem.categoryId,
    intelligentCategory,
    fallbackCategory: simpleAutoCategory,
    manualCategoryOverride: hasManualOverride || existingProduct?.manualCategoryOverride || false,
    tags: enrichedProduct.tags,
    ingredients: enrichedProduct.ingredients,
    benefitStory: enrichedProduct.benefitStory,
    ingredientIcons: enrichedProduct.ingredientIcons,
    categoryData: enrichedProduct.categoryData,
    image: processedItem.images?.[0] || null,
    images: processedItem.images || [],
    squareIsArchived: visibility.squareIsArchived,
    squareEcomVisibility: visibility.squareEcomVisibility,
    squareEcomAvailable: visibility.squareEcomAvailable,
    squareChannels: visibility.squareChannels,
    squarePresentAtAllLocations: visibility.squarePresentAtAllLocations,
    squarePresentAtLocationIds: visibility.squarePresentAtLocationIds,
    squareAbsentAtLocationIds: visibility.squareAbsentAtLocationIds,
    inStock: true,
    variations: processedItem.variations || [],
    squareData: {
      catalogObjectId: processedItem.id,
      variationId: primaryVariation.id,
      categoryId: processedItem.categoryId,
      isArchived: visibility.squareIsArchived,
      ecomVisibility: visibility.squareEcomVisibility,
      ecomAvailable: visibility.squareEcomAvailable,
      channels: visibility.squareChannels,
      presentAtAllLocations: visibility.squarePresentAtAllLocations,
      presentAtLocationIds: visibility.squarePresentAtLocationIds,
      absentAtLocationIds: visibility.squareAbsentAtLocationIds
    },
    source: 'square_webhook_sync',
    syncedAt: new Date(),
    updatedAt: new Date()
  };

  await db.collection('unified_products').updateOne(
    { id: processedItem.id },
    { $set: unifiedProduct, $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  );

  logger.info('SyncSingleItem', `✅ Synced to unified_products: ${processedItem.name}`);

  return { success: true, itemId: objectId, name: processedItem.name };
}
