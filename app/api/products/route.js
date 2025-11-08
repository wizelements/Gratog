import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { getUnifiedProducts } from '@/lib/product-sync-engine';
import { getCategoriesWithCounts } from '@/lib/ingredient-taxonomy';
import { getDemoProducts, getDemoCategories } from '@/lib/demo-products';

/**
 * GET /api/products
 * Fetch products from unified collection with intelligent categorization
 * Query params:
 *   - unified: true/false (default: true) - use unified collection or legacy Square catalog
 *   - category: filter by category
 *   - tag: filter by tag
 *   - ingredient: filter by ingredient
 *   - search: search query
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const useUnified = searchParams.get('unified') !== 'false'; // Default to unified
    
    if (useUnified) {
      // Use intelligent unified collection with ingredient data
      const filters = {
        category: searchParams.get('category'),
        tag: searchParams.get('tag'),
        ingredient: searchParams.get('ingredient'),
        search: searchParams.get('search')
      };
      
      // Remove null filters
      Object.keys(filters).forEach(key => {
        if (!filters[key]) delete filters[key];
      });
      
      const products = await getUnifiedProducts(filters);
      const categories = getCategoriesWithCounts(products);
      
      // If no products found, use demo products as fallback
      if (products.length === 0) {
        console.log('⚠️ No products in unified collection, using demo products as fallback');
        const demoProducts = getDemoProducts(filters);
        const demoCategories = getDemoCategories();
        
        return NextResponse.json({
          success: true,
          products: demoProducts,
          categories: demoCategories,
          count: demoProducts.length,
          source: 'demo_fallback',
          filters,
          message: 'Using demo products - Square catalog sync may be pending'
        });
      }
      
      console.log(`✅ Products API: Returning ${products.length} products from unified collection (intelligent)`);
      
      return NextResponse.json({
        success: true,
        products,
        categories,
        count: products.length,
        source: 'unified_intelligent',
        filters
      });
    }
    
    // Fallback to original Square catalog (legacy mode)
    const { db } = await connectToDatabase();
    
    // Fetch all synced catalog items from MongoDB
    const items = await db.collection('square_catalog_items')
      .find({})
      .sort({ name: 1 })
      .toArray();
    
    // Transform Square catalog format to app format
    const products = items.map(item => {
      // Get first variation for pricing (most items have one variation)
      const mainVariation = item.variations && item.variations.length > 0 
        ? item.variations[0] 
        : null;
      
      // Determine category from Square categoryId or item name
      let category = 'other';
      if (item.name.toLowerCase().includes('gel')) category = 'gel';
      else if (item.name.toLowerCase().includes('lemonade') || item.name.toLowerCase().includes('zinger')) category = 'lemonade';
      else if (item.name.toLowerCase().includes('shot')) category = 'shot';
      else if (item.name.toLowerCase().includes('juice')) category = 'juice';
      
      // Generate slug from product name
      const slug = item.name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      
      return {
        id: item.id,
        slug: slug,
        variationId: mainVariation?.id,
        name: item.name,
        description: item.description || `Premium ${item.name}`,
        price: mainVariation?.price || 0,
        priceCents: mainVariation?.priceCents || 0,
        category,
        image: item.images && item.images.length > 0 ? item.images[0] : '/images/sea-moss-default.svg',
        images: item.images || [],
        inStock: true,
        variations: item.variations || [],
        squareData: {
          catalogObjectId: item.id,
          variationId: mainVariation?.id,
          categoryId: item.categoryId
        }
      };
    });
    
    console.log(`✅ Products API: Returning ${products.length} products from Square catalog (legacy)`);
    
    return NextResponse.json({
      success: true,
      products,
      count: products.length,
      source: 'square_catalog_sync',
      lastSync: items.length > 0 ? items[0].updatedAt : null
    });
    
  } catch (error) {
    console.error('❌ Failed to fetch products:', error);
    
    // Use demo products as ultimate fallback
    console.log('🔄 Using demo products due to error');
    const demoProducts = getDemoProducts();
    const demoCategories = getDemoCategories();
    
    return NextResponse.json({
      success: true,
      products: demoProducts,
      categories: demoCategories,
      count: demoProducts.length,
      source: 'demo_error_fallback',
      error: error.message,
      message: 'Temporary products shown - our full catalog will be available shortly'
    });
  }
}
