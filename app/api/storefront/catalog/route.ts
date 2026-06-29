/**
 * Storefront Catalog API
 * Returns Square-compatible storefront products enriched by the curated weekly market source.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStorefrontCatalogSnapshot } from '@/lib/storefront-products';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const snapshot = await getStorefrontCatalogSnapshot({
      marketId: searchParams.get('marketId') || undefined,
      category: searchParams.get('category') || undefined,
    });

    return NextResponse.json(
      {
        success: true,
        products: snapshot.products,
        categories: snapshot.categories,
        count: snapshot.products.length,
        source: snapshot.source,
        isFallback: snapshot.isFallback,
        timestamp: new Date().toISOString()
      },
      { headers: NO_STORE_HEADERS }
    );

  } catch (error) {
    console.error('[Storefront] Catalog error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch catalog',
        products: [],
        source: 'error'
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
