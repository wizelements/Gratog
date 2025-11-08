/**
 * Sync Square catalog products to unified collection (ESM Module)
 * Extracted from scripts/sync-to-unified.js for serverless compatibility
 */

import { connectToDatabase } from '../db-optimized.js';
import { enrichProductWithIngredients } from '../ingredient-taxonomy.js';

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
    console.log('🔄 Starting sync to unified collection...');
    
    const { db } = await connectToDatabase();
    
    const squareProducts = await db.collection('square_catalog_items')
      .find({})
      .toArray();
    
    console.log(`📦 Found ${squareProducts.length} Square products`);
    
    let synced = 0;
    let errors = 0;
    
    for (const product of squareProducts) {
      try {
        const existingProduct = await db.collection('unified_products')
          .findOne({ id: product.id });
        
        const hasManualOverride = existingProduct?.manualCategoryOverride === true;
        
        const enrichedProduct = enrichProductWithIngredients(product);
        
        let intelligentCategory = enrichedProduct.intelligentCategory;
        if (hasManualOverride && existingProduct.intelligentCategory) {
          intelligentCategory = existingProduct.intelligentCategory;
          console.log(`  ⚠️  Using manual category override for ${product.name}: ${intelligentCategory}`);
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
          inStock: true,
          variations: product.variations || [],
          squareData: {
            catalogObjectId: product.id,
            variationId: primaryVariation.id,
            categoryId: product.categoryId
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
        console.log(`✅ ${synced}/${squareProducts.length} - ${product.name}`);
        
      } catch (error) {
        errors++;
        console.error(`❌ Failed to sync ${product.name}:`, error.message);
      }
    }
    
    console.log(`\n✅ Sync complete!`);
    console.log(`   Synced: ${synced}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Total: ${squareProducts.length}`);
    
    const withImages = await db.collection('unified_products')
      .countDocuments({ 'images.0': { $exists: true } });
    
    console.log(`\n📸 Products with images: ${withImages}/${synced}`);
    
    return { success: synced, failed: errors, total: squareProducts.length };
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    
    if (returnResults) {
      return { success: 0, failed: 0, total: 0, error: error.message };
    }
    
    throw error;
  }
}
