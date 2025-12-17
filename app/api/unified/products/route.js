const DEBUG = process.env.DEBUG === "true";
const debug = (...args) => { if (DEBUG) debug(...args); };

import { NextResponse } from 'next/server';
import { getUnifiedProducts } from '@/lib/product-sync-engine';
import { getCategoriesWithCounts } from '@/lib/ingredient-taxonomy';

export const dynamic = 'force-dynamic';

/**
 * GET /api/unified/products
 * Returns intelligently categorized products with ingredient data
 */
export async function GET(request) {
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
    
    debug('🔍 Unified Products API - Filters:', filters);
    
    // Get products with intelligent filtering
    const products = await getUnifiedProducts(filters);
    
    // Get category breakdown
    const categories = getCategoriesWithCounts(products);
    
    return NextResponse.json({
      success: true,
      count: products.length,
      products,
      categories,
      filters,
      source: 'unified_collection'
    });
  } catch (error) {
    console.error('❌ Unified Products API Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch unified products',
      message: error.message
    }, { status: 500 });
  }
}
