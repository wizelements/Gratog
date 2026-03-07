import { NextResponse } from 'next/server';
import { getUnifiedProducts } from '@/lib/product-sync-engine';
import { getCategoriesWithCounts } from '@/lib/ingredient-taxonomy';
import { getDemoProducts, getDemoCategories } from '@/lib/demo-products';
import { createLogger } from '@/lib/logger';
import { enhanceProductCatalog } from '@/lib/product-enhancements';
import { connectToDatabase } from '@/lib/db-optimized';
import { applyInventorySnapshot } from '@/lib/custom-inventory';

const logger = createLogger('EnhancedProductsAPI');

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0'
};

function createNoStoreJsonResponse(payload, init = {}) {
  return NextResponse.json(payload, {
    ...init,
    headers: {
      ...NO_STORE_HEADERS,
      ...(init.headers || {})
    }
  });
}

/**
 * GET /api/products/enhanced
 * Enhanced products API with image prioritization and beautiful placeholders
 */
export async function GET(request) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    
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
    
    logger.debug('Fetching enhanced products', { filters });
    const rawProducts = await getUnifiedProducts(filters);
    const { db } = await connectToDatabase();
    
    // Transform products
    const productsWithVariations = rawProducts.map(product => ({
      ...product,
      variationId: product.squareData?.variationId || product.variations?.[0]?.id || product.id,
      catalogObjectId: product.squareData?.variationId || product.variations?.[0]?.id || product.id
    }));
    
    // Enhance with placeholders and sort by image priority
    const inventoryAwareProducts = await applyInventorySnapshot(db, productsWithVariations);
    const enhancedProducts = enhanceProductCatalog(inventoryAwareProducts);
    
    const categories = getCategoriesWithCounts(enhancedProducts);
    
    // If no products found, use demo products
    if (enhancedProducts.length === 0) {
      logger.warn('No products found, using demo fallback');
      const demoProducts = getDemoProducts(filters);
      const demoCategories = getDemoCategories();
      
      return createNoStoreJsonResponse({
        success: true,
        products: demoProducts,
        categories: demoCategories,
        count: demoProducts.length,
        source: 'demo_fallback',
        filters
      });
    }
    
    const imageStats = {
      withImages: enhancedProducts.filter(p => !p.isPlaceholder).length,
      withPlaceholders: enhancedProducts.filter(p => p.isPlaceholder).length
    };
    
    logger.info(`Returning ${enhancedProducts.length} enhanced products`, imageStats);
    
    return createNoStoreJsonResponse({
      success: true,
      products: enhancedProducts,
      categories,
      count: enhancedProducts.length,
      source: 'enhanced_intelligent',
      imageStats,
      filters
    });
    
  } catch (error) {
    logger.error('Failed to fetch enhanced products', { 
      error: error.message,
      stack: error.stack 
    });
    
    const demoProducts = getDemoProducts();
    const demoCategories = getDemoCategories();
    
    return createNoStoreJsonResponse({
      success: true,
      products: demoProducts,
      categories: demoCategories,
      count: demoProducts.length,
      source: 'demo_error_fallback',
      error: error.message
    });
  }
}
