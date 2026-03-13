/**
 * Sync Square catalog products to unified collection (ESM Module)
 * Extracted from scripts/sync-to-unified.js for serverless compatibility
 */

import { logger } from '@/lib/logger';
import { connectToDatabase } from '../db-optimized.js';
import { enrichProductWithIngredients } from '../ingredient-taxonomy.js';
import { syncInventoryWithCatalog } from '../custom-inventory.js';
import { extractSquareVisibilityFlags } from '../square-visibility.js';

/**
 * Auto-categorize products based on name and description
 */
export function autoCategorizProduct(product) {
  const name = (product.name || '').toLowerCase();
  const desc = (product.description || '').toLowerCase();
  const text = `${name} ${desc}`;
  
  if (product.category) {
    const squareCat = product.category.toLowerCase();
    if (squareCat.includes('gel')) return 'gel';
    if (squareCat.includes('lemonade')) return 'lemonade';
    if (squareCat.includes('shot')) return 'shot';
    if (squareCat.includes('juice')) return 'juice';
    if (squareCat.includes('freebie')) return 'freebie';
    if (squareCat.includes('seasonal')) return 'seasonal';
  }
  
  if (name.includes('freebie')) return 'freebie';
  if (name.includes(' gel') || name.endsWith('gel')) return 'gel';
  if (name.includes('lemonade') || name.includes('zinger')) return 'lemonade';
  if (name.includes(' shot') || name.endsWith('shot')) return 'shot';
  
  if (name.includes('pineapple') || name.includes('strawberry') || 
      name.includes('blueberry') || name.includes('peach') ||
      name.includes('apple') || name.includes('cranberry') ||
      name.includes('melon') || name.includes('mango') ||
      name.includes('basil') || name.includes('rhubarb') ||
      name.includes('horchata') || name.includes('bliss')) {
    return 'juice';
  }
  
  if (name.includes('grateful') || name.includes('gratitude') || 
      name.includes('glow') || name.includes('moss') ||
      name.includes('lotus') || name.includes('tide') ||
      name.includes('aura') || name.includes('harmony') ||
      name.includes('kissed') || name.includes('rejuvenate') ||
      name.includes('mint') || name.includes('defense') ||
      name.includes('vibe') || name.includes('bloom')) {
    return 'gel';
  }
  
  return 'other';
}

export async function syncToUnified(returnResults = false) {
  try {
    logger.info('Sync', '🔄 Starting sync to unified collection...');
    
    const { db } = await connectToDatabase();
    
    const squareProducts = await db.collection('square_catalog_items')
      .find({})
      .toArray();
    
    logger.info('Sync', `📦 Found ${squareProducts.length} Square products`);
    
    let synced = 0;
    let errors = 0;
    let reconciledDeleted = 0;
    let inventorySync = { synced: 0, pruned: 0 };

    const squareIds = squareProducts
      .map((product) => product?.id)
      .filter(Boolean);
    
    for (const product of squareProducts) {
      try {
        const existingProduct = await db.collection('unified_products')
          .findOne({ id: product.id });
        
        const hasManualOverride = existingProduct?.manualCategoryOverride === true;
        
        const enrichedProduct = enrichProductWithIngredients(product);
        
        let intelligentCategory = enrichedProduct.intelligentCategory;
        if (hasManualOverride && existingProduct.intelligentCategory) {
          intelligentCategory = existingProduct.intelligentCategory;
          logger.info('Sync', `  ⚠️  Using manual category override for ${product.name}: ${intelligentCategory}`);
        }
        
        const simpleAutoCategory = autoCategorizProduct(product);
        
        const slug = product.name
          ?.toLowerCase()
          .trim()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
        
        const primaryVariation = product.variations?.[0] || {};
        const price = product.price || primaryVariation.price || 0;
        const priceCents = product.priceCents || primaryVariation.priceCents || (price * 100);
        const visibility = extractSquareVisibilityFlags(product);
        
        const unifiedProduct = {
          id: product.id,
          squareId: product.id,
          slug: slug,
          name: product.name,
          description: product.description || `Premium ${product.name}`,
          price: price,
          priceCents: priceCents,
          currency: 'USD',
          category: intelligentCategory,
          squareCategory: product.category,
          squareCategoryId: product.categoryId,
          intelligentCategory: intelligentCategory,
          fallbackCategory: simpleAutoCategory,
          manualCategoryOverride: hasManualOverride || existingProduct?.manualCategoryOverride || false,
          tags: enrichedProduct.tags,
          ingredients: enrichedProduct.ingredients,
          benefitStory: enrichedProduct.benefitStory,
          ingredientIcons: enrichedProduct.ingredientIcons,
          categoryData: enrichedProduct.categoryData,
          image: product.images?.[0] || null,
          images: product.images || [],
          squareIsArchived: visibility.squareIsArchived,
          squareEcomVisibility: visibility.squareEcomVisibility,
          squareEcomAvailable: visibility.squareEcomAvailable,
          squareChannels: visibility.squareChannels,
          squarePresentAtAllLocations: visibility.squarePresentAtAllLocations,
          squarePresentAtLocationIds: visibility.squarePresentAtLocationIds,
          squareAbsentAtLocationIds: visibility.squareAbsentAtLocationIds,
          inStock: true,
          variations: product.variations || [],
          squareData: {
            catalogObjectId: product.id,
            variationId: primaryVariation.id,
            categoryId: product.categoryId,
            isArchived: visibility.squareIsArchived,
            ecomVisibility: visibility.squareEcomVisibility,
            ecomAvailable: visibility.squareEcomAvailable,
            channels: visibility.squareChannels,
            presentAtAllLocations: visibility.squarePresentAtAllLocations,
            presentAtLocationIds: visibility.squarePresentAtLocationIds,
            absentAtLocationIds: visibility.squareAbsentAtLocationIds
          },
          source: 'square_sync',
          syncedAt: new Date(),
          updatedAt: new Date(),
          createdAt: new Date()
        };
        
        await db.collection('unified_products').updateOne(
          { id: product.id },
          { $set: unifiedProduct },
          { upsert: true }
        );
        
        synced++;
        logger.debug('Sync', `✅ ${synced}/${squareProducts.length} - ${product.name}`);
        
      } catch (error) {
        errors++;
        logger.error('Sync', `❌ Failed to sync ${product.name}:`, error);
      }
    }

    // Strict reconciliation: unified_products should exactly mirror Square products.
    const staleFilter = squareIds.length > 0
      ? { id: { $nin: squareIds } }
      : {};

    const reconcileResult = await db.collection('unified_products').deleteMany(staleFilter);
    reconciledDeleted = reconcileResult.deletedCount || 0;

    // Keep first-party inventory collection in lockstep with product catalog.
    inventorySync = await syncInventoryWithCatalog(db, squareProducts, {
      pruneMissing: true,
      source: 'square_catalog_sync',
    });
    
    logger.info('Sync', `\n✅ Sync complete!`);
    logger.info('Sync', `   Synced: ${synced}`);
    logger.info('Sync', `   Errors: ${errors}`);
    logger.info('Sync', `   Reconciled deletions: ${reconciledDeleted}`);
    logger.info('Sync', `   Total: ${squareProducts.length}`);
    logger.info('Sync', `   Inventory synced: ${inventorySync.synced}, pruned: ${inventorySync.pruned}`);
    
    const withImages = await db.collection('unified_products')
      .countDocuments({ 'images.0': { $exists: true } });
    
    logger.info('Sync', `\n📸 Products with images: ${withImages}/${synced}`);
    
    return {
      success: synced,
      failed: errors,
      total: squareProducts.length,
      reconciledDeleted,
      inventory: inventorySync,
    };
    
  } catch (error) {
    logger.error('Sync', '❌ Sync failed:', error);
    
    if (returnResults) {
      return { success: 0, failed: 0, total: 0, error: error.message };
    }
    
    throw error;
  }
}
