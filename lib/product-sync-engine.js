/**
 * Unified Product Sync Engine
 * Bi-directional sync between Admin Panel and Customer Frontend
 */

import { logger } from '@/lib/logger';
import { connectToDatabase } from './db-optimized';
import { enrichProductWithIngredients, categorizeBIngredients } from './ingredient-taxonomy';

// Unified collection name
export const UNIFIED_PRODUCTS_COLLECTION = 'unified_products';
export const SYNC_LOG_COLLECTION = 'product_sync_log';

/**
 * Sync product from Square catalog to unified collection
 */
export async function syncProductToUnified(squareProduct) {
  try {
    const { db } = await connectToDatabase();
    
    // Enrich with ingredient intelligence
    const enrichedProduct = enrichProductWithIngredients(squareProduct);
    
    // Generate slug if not present
    const slug = squareProduct.slug || squareProduct.name
      ?.toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    
    // Extract price from variations if not at top level
    const primaryVariation = squareProduct.variations?.[0] || {};
    const price = squareProduct.price || primaryVariation.price || 0;
    const priceCents = squareProduct.priceCents || primaryVariation.priceCents || (price * 100);
    
    // Create unified product structure
    const unifiedProduct = {
      // Core identifiers
      id: squareProduct.id,
      squareId: squareProduct.id,
      slug: slug,
      
      // Basic info
      name: squareProduct.name,
      description: squareProduct.description,
      
      // Pricing (extract from variations if needed)
      price: price,
      priceCents: priceCents,
      currency: 'USD',
      
      // Categories
      category: squareProduct.category,
      intelligentCategory: enrichedProduct.intelligentCategory,
      tags: enrichedProduct.tags,
      
      // Ingredients & Benefits
      ingredients: enrichedProduct.ingredients,
      benefitStory: enrichedProduct.benefitStory,
      ingredientIcons: enrichedProduct.ingredientIcons,
      categoryData: enrichedProduct.categoryData,
      
      // Images
      image: squareProduct.image,
      images: squareProduct.images || [],
      
      // Inventory
      inStock: squareProduct.inStock,
      variations: squareProduct.variations,
      
      // Square integration
      squareData: squareProduct.squareData,
      
      // Metadata
      source: 'square_sync',
      syncedAt: new Date(),
      updatedAt: new Date(),
      createdAt: squareProduct.createdAt || new Date()
    };
    
    // Upsert to unified collection
    await db.collection(UNIFIED_PRODUCTS_COLLECTION).updateOne(
      { id: squareProduct.id },
      { $set: unifiedProduct },
      { upsert: true }
    );
    
    // Log sync
    await logSync({
      productId: squareProduct.id,
      productName: squareProduct.name,
      action: 'square_to_unified',
      status: 'success'
    });
    
    return unifiedProduct;
  } catch (error) {
    logger.error('Sync', 'Sync to unified failed:', error);
    await logSync({
      productId: squareProduct.id,
      action: 'square_to_unified',
      status: 'error',
      error: error.message
    });
    throw error;
  }
}

/**
 * Sync all products from Square catalog
 */
export async function syncAllSquareProducts() {
  try {
    const { db } = await connectToDatabase();
    
    // Get all products from Square catalog
    const squareProducts = await db.collection('square_catalog_items')
      .find({})
      .toArray();
    
    logger.info('Sync', `🔄 Syncing ${squareProducts.length} products to unified collection...`);
    
    const results = {
      success: 0,
      failed: 0,
      total: squareProducts.length
    };
    
    for (const product of squareProducts) {
      try {
        await syncProductToUnified(product);
        results.success++;
      } catch (error) {
        results.failed++;
        logger.error('Sync', `Failed to sync product ${product.id}:`, error);
      }
    }
    
    logger.info('Sync', `✅ Sync complete: ${results.success} success, ${results.failed} failed`);
    
    return results;
  } catch (error) {
    logger.error('Sync', 'Sync all products failed:', error);
    throw error;
  }
}

/**
 * Get products from unified collection with intelligent filtering
 * @throws {Error} Re-throws database errors so callers can handle appropriately
 */
export async function getUnifiedProducts(filters = {}) {
  try {
    const { db } = await connectToDatabase();
    
    const query = {};
    
    // Category filter
    if (filters.category) {
      query.intelligentCategory = filters.category;
    }
    
    // Tag filter
    if (filters.tag) {
      query.tags = filters.tag;
    }
    
    // Ingredient filter
    if (filters.ingredient) {
      query['ingredients.name'] = filters.ingredient;
    }
    
    // Search filter
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { tags: { $regex: filters.search, $options: 'i' } }
      ];
    }
    
    const products = await db.collection(UNIFIED_PRODUCTS_COLLECTION)
      .find(query)
      .sort({ name: 1 })
      .toArray();
    
    logger.debug('Sync', `Found ${products.length} products in unified collection`);
    
    return products;
  } catch (error) {
    logger.error('Sync', 'Get unified products failed:', {
      error: error.message,
      stack: error.stack,
      filters
    });
    // Re-throw so callers can distinguish DB errors from empty results
    error.isDbError = true;
    throw error;
  }
}

/**
 * Update product in unified collection (from admin)
 */
export async function updateUnifiedProduct(productId, updates) {
  try {
    const { db } = await connectToDatabase();
    
    // If ingredients or name changed, re-enrich
    if (updates.name || updates.description || updates.ingredients) {
      const currentProduct = await db.collection(UNIFIED_PRODUCTS_COLLECTION)
        .findOne({ id: productId });
      
      if (currentProduct) {
        const merged = { ...currentProduct, ...updates };
        const enriched = enrichProductWithIngredients(merged);
        
        updates.intelligentCategory = enriched.intelligentCategory;
        updates.tags = enriched.tags;
        updates.benefitStory = enriched.benefitStory;
        updates.ingredientIcons = enriched.ingredientIcons;
      }
    }
    
    // Add update timestamp
    updates.updatedAt = new Date();
    updates.source = 'admin_update';
    
    // Update in unified collection
    const result = await db.collection(UNIFIED_PRODUCTS_COLLECTION).updateOne(
      { id: productId },
      { $set: updates }
    );
    
    // Log sync
    await logSync({
      productId,
      action: 'admin_update',
      status: 'success',
      updates: Object.keys(updates)
    });
    
    // Trigger frontend cache invalidation
    await triggerCacheInvalidation(productId);
    
    return result;
  } catch (error) {
    logger.error('Sync', 'Update unified product failed:', error);
    await logSync({
      productId,
      action: 'admin_update',
      status: 'error',
      error: error.message
    });
    throw error;
  }
}

/**
 * Log sync operations
 */
async function logSync(logEntry) {
  try {
    const { db } = await connectToDatabase();
    
    await db.collection(SYNC_LOG_COLLECTION).insertOne({
      ...logEntry,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Sync', 'Failed to log sync:', error);
  }
}

/**
 * Trigger cache invalidation for frontend
 */
async function triggerCacheInvalidation(productId) {
  // Dispatch custom event for cache invalidation
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('productUpdated', {
      detail: { productId }
    }));
  }
  
  // In production, this would trigger ISR revalidation
  // For now, we rely on natural cache expiration
}

/**
 * Get sync statistics
 */
export async function getSyncStats() {
  try {
    const { db } = await connectToDatabase();
    
    const [totalProducts, squareProducts, recentSyncs] = await Promise.all([
      db.collection(UNIFIED_PRODUCTS_COLLECTION).countDocuments(),
      db.collection('square_catalog_items').countDocuments(),
      db.collection(SYNC_LOG_COLLECTION)
        .find({})
        .sort({ timestamp: -1 })
        .limit(10)
        .toArray()
    ]);
    
    const syncedToday = await db.collection(SYNC_LOG_COLLECTION).countDocuments({
      timestamp: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });
    
    return {
      totalProducts,
      squareProducts,
      syncedToday,
      lastSync: recentSyncs[0]?.timestamp || null,
      recentSyncs
    };
  } catch (error) {
    logger.error('Sync', 'Get sync stats failed:', error);
    throw error;
  }
}

/**
 * Initialize unified products collection (run once)
 */
export async function initializeUnifiedProducts() {
  try {
    const { db } = await connectToDatabase();
    
    // Create indexes
    await db.collection(UNIFIED_PRODUCTS_COLLECTION).createIndex({ id: 1 }, { unique: true });
    await db.collection(UNIFIED_PRODUCTS_COLLECTION).createIndex({ intelligentCategory: 1 });
    await db.collection(UNIFIED_PRODUCTS_COLLECTION).createIndex({ tags: 1 });
    await db.collection(UNIFIED_PRODUCTS_COLLECTION).createIndex({ 'ingredients.name': 1 });
    await db.collection(UNIFIED_PRODUCTS_COLLECTION).createIndex({ syncedAt: -1 });
    
    logger.info('Sync', '✅ Unified products collection initialized');
    
    // Sync all products
    await syncAllSquareProducts();
    
    return true;
  } catch (error) {
    logger.error('Sync', 'Initialize unified products failed:', error);
    throw error;
  }
}
