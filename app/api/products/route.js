import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { getUnifiedProducts } from '@/lib/product-sync-engine';
import { getCategoriesWithCounts } from '@/lib/ingredient-taxonomy';
import { getDemoProducts, getDemoCategories } from '@/lib/demo-products';
import { createLogger } from '@/lib/logger';
import { enhanceProductCatalog } from '@/lib/product-enhancements';

const logger = createLogger('ProductsAPI');

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
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const useUnified = searchParams.get('unified') !== 'false'; // Default to unified
    
    logger.info('Products API request', { 
      useUnified, 
      params: Object.fromEntries(searchParams) 
    });
    
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
      
      logger.debug('Fetching unified products', { filters });
      const rawProducts = await getUnifiedProducts(filters);
      
      // Transform products to expose variationId at top level for cart compatibility
      const products = rawProducts.map(product => ({
        ...product,
        variationId: product.squareData?.variationId || product.variations?.[0]?.id || product.id,
        catalogObjectId: product.squareData?.variationId || product.variations?.[0]?.id || product.id
      }));
      
      // Enhance with beautiful placeholders and sort by image priority
      const enhancedProducts = enhanceProductCatalog(products);
      
      const categories = getCategoriesWithCounts(enhancedProducts);
      
      // If no products found, use demo products as fallback
      if (enhancedProducts.length === 0) {
        logger.warn('No products in unified collection, using demo fallback');
        const demoProducts = getDemoProducts(filters);
        const demoCategories = getDemoCategories();
        
        logger.api('GET', '/api/products', 200, Date.now() - startTime, { 
          source: 'demo_fallback',
          count: demoProducts.length 
        });
        
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
      
      const imageStats = {
        withImages: enhancedProducts.filter(p => !p.isPlaceholder).length,
        withPlaceholders: enhancedProducts.filter(p => p.isPlaceholder).length
      };
      
      logger.info(`Returning ${enhancedProducts.length} products (${imageStats.withImages} with images, ${imageStats.withPlaceholders} with placeholders)`);
      logger.api('GET', '/api/products', 200, Date.now() - startTime, { 
        source: 'unified',
        count: enhancedProducts.length,
        ...imageStats
      });
      
      return NextResponse.json({
        success: true,
        products: enhancedProducts,
        categories,
        count: enhancedProducts.length,
        source: 'unified_intelligent_enhanced',
        imageStats,
        filters
      });
    }
    
    // Fallback to original Square catalog (legacy mode)
    logger.debug('Using legacy Square catalog mode');
    const { db } = await connectToDatabase();
    
    // Fetch all synced catalog items from MongoDB
    const items = await db.collection('square_catalog_items')
      .find({})
      .sort({ name: 1 })
      .toArray();
    
    logger.debug(`Found ${items.length} items in square_catalog_items`);
    
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
    
    logger.info(`Returning ${products.length} products from Square catalog (legacy)`);
    logger.api('GET', '/api/products', 200, Date.now() - startTime, { 
      source: 'square_catalog',
      count: products.length 
    });
    
    return NextResponse.json({
      success: true,
      products,
      count: products.length,
      source: 'square_catalog_sync',
      lastSync: items.length > 0 ? items[0].updatedAt : null
    });
    
  } catch (error) {
    logger.error('Failed to fetch products', { 
      error: error.message,
      stack: error.stack 
    });
    
    // Use demo products as ultimate fallback
    const demoProducts = getDemoProducts();
    const demoCategories = getDemoCategories();
    
    logger.api('GET', '/api/products', 200, Date.now() - startTime, { 
      source: 'demo_error_fallback',
      count: demoProducts.length 
    });
    
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
