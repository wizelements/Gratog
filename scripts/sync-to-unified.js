/**
 * Sync Square catalog products to unified collection
 */

const { connectToDatabase } = require('../lib/db-optimized');
const { enrichProductWithIngredients } = require('../lib/ingredient-taxonomy');

/**
 * Auto-categorize products based on name and description
 */
function autoCategorizProduct(product) {
  const name = (product.name || '').toLowerCase();
  const desc = (product.description || '').toLowerCase();
  const text = `${name} ${desc}`;
  
  // Use Square category if available
  if (product.category) {
    // Map Square category names to our categories
    const squareCat = product.category.toLowerCase();
    if (squareCat.includes('gel')) return 'gel';
    if (squareCat.includes('lemonade')) return 'lemonade';
    if (squareCat.includes('shot')) return 'shot';
    if (squareCat.includes('juice')) return 'juice';
    if (squareCat.includes('freebie')) return 'freebie';
    if (squareCat.includes('seasonal')) return 'seasonal';
  }
  
  // Priority 1: Freebies
  if (name.includes('freebie')) return 'freebie';
  
  // Priority 2: Explicit category keywords
  if (name.includes(' gel') || name.endsWith('gel')) return 'gel';
  if (name.includes('lemonade') || name.includes('zinger')) return 'lemonade';
  if (name.includes(' shot') || name.endsWith('shot')) return 'shot';
  
  // Priority 3: Juice products (flavored drinks without "lemonade" in name)
  if (name.includes('pineapple') || name.includes('strawberry') || 
      name.includes('blueberry') || name.includes('peach') ||
      name.includes('apple') || name.includes('cranberry') ||
      name.includes('melon') || name.includes('mango') ||
      name.includes('basil') || name.includes('rhubarb') ||
      name.includes('horchata') || name.includes('bliss')) {
    return 'juice';
  }
  
  // Priority 4: Sea moss gels (common gel product names)
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

async function syncToUnified(returnResults = false) {
  try {
    console.log('🔄 Starting sync to unified collection...');
    
    const { db } = await connectToDatabase();
    
    // Get all Square catalog items
    const squareProducts = await db.collection('square_catalog_items')
      .find({})
      .toArray();
    
    console.log(`📦 Found ${squareProducts.length} Square products`);
    
    let synced = 0;
    let errors = 0;
    
    for (const product of squareProducts) {
      try {
        // Check if this product has a manual category override from admin
        const existingProduct = await db.collection('unified_products')
          .findOne({ id: product.id });
        
        const hasManualOverride = existingProduct?.manualCategoryOverride === true;
        
        // Enrich with ingredient intelligence FIRST
        const enrichedProduct = enrichProductWithIngredients(product);
        
        // Use intelligent category from ingredient analysis
        // BUT respect manual overrides from admin
        let intelligentCategory = enrichedProduct.intelligentCategory;
        if (hasManualOverride && existingProduct.intelligentCategory) {
          intelligentCategory = existingProduct.intelligentCategory;
          console.log(`  ⚠️  Using manual category override for ${product.name}: ${intelligentCategory}`);
        }
        
        const simpleAutoCategory = autoCategorizProduct(product);
        
        // Generate slug
        const slug = product.name
          ?.toLowerCase()
          .trim()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
        
        // Get price from first variation
        const primaryVariation = product.variations?.[0] || {};
        const price = product.price || primaryVariation.price || 0;
        const priceCents = product.priceCents || primaryVariation.priceCents || (price * 100);
        
        // Create unified product structure
        const unifiedProduct = {
          // Core identifiers
          id: product.id,
          squareId: product.id,
          slug: slug,
          
          // Basic info
          name: product.name,
          description: product.description || `Premium ${product.name}`,
          
          // Pricing
          price: price,
          priceCents: priceCents,
          currency: 'USD',
          
          // Categories - prioritize ingredient-based intelligence
          category: intelligentCategory,
          squareCategory: product.category,
          squareCategoryId: product.categoryId,
          intelligentCategory: intelligentCategory,
          fallbackCategory: simpleAutoCategory,
          manualCategoryOverride: hasManualOverride || existingProduct?.manualCategoryOverride || false,
          tags: enrichedProduct.tags,
          
          // Ingredients & Benefits
          ingredients: enrichedProduct.ingredients,
          benefitStory: enrichedProduct.benefitStory,
          ingredientIcons: enrichedProduct.ingredientIcons,
          categoryData: enrichedProduct.categoryData,
          
          // Images - ensure we have Square images
          image: product.images?.[0] || null,
          images: product.images || [],
          
          // Inventory
          inStock: true,
          variations: product.variations || [],
          
          // Square integration
          squareData: {
            catalogObjectId: product.id,
            variationId: primaryVariation.id,
            categoryId: product.categoryId
          },
          
          // Metadata
          source: 'square_sync',
          syncedAt: new Date(),
          updatedAt: new Date(),
          createdAt: new Date()
        };
        
        // Upsert to unified collection
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
    
    // Verify images
    const withImages = await db.collection('unified_products')
      .countDocuments({ 'images.0': { $exists: true } });
    
    console.log(`\n📸 Products with images: ${withImages}/${synced}`);
    
    // Return results for programmatic use
    return { success: synced, failed: errors, total: squareProducts.length };
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    
    if (returnResults) {
      return { success: 0, failed: 0, total: 0, error: error.message };
    }
    
    process.exit(1);
  }
}

// Export for programmatic use
module.exports = { syncToUnified, autoCategorizProduct };

// Run if executed directly
if (require.main === module) {
  syncToUnified();
}
