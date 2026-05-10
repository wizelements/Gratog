/**
 * 🚀 Gratog Products API
 * Unified product endpoint for all consumers
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStorefrontCatalogSnapshot } from '@/lib/storefront-products';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const marketId = searchParams.get('marketId');
    const category = searchParams.get('category');
    
    // Get products from unified source
    const snapshot = await getStorefrontCatalogSnapshot({
      marketId: marketId || undefined,
      category: category || undefined
    });
    
    return NextResponse.json({
      success: true,
      products: snapshot.products,
      categories: snapshot.categories,
      marketId: marketId || null,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
