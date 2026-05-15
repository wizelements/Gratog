/**
 * Catalog API - Edge Runtime
 * Read-only endpoint for product catalog - perfect for edge caching
 * 
 * @edge
 */

export const runtime = 'edge';
export const preferredRegion = 'iad1'; // US East (N. Virginia) - closest to Square

import { NextRequest, NextResponse } from 'next/server';
import { getSquareCatalog } from '@/lib/square-api-edge';

/**
 * GET /api/catalog
 * Returns cached product catalog from Square
 * Cached at edge for 60 seconds
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    // Fetch from Square (with internal caching)
    const catalog = await getSquareCatalog({ category, limit });

    return NextResponse.json(
      { 
        success: true, 
        data: catalog,
        cachedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
          'CDN-Cache-Control': 'public, s-maxage=60',
          'Vercel-CDN-Cache-Control': 'public, s-maxage=60',
        },
      }
    );
  } catch (error) {
    console.error('[Catalog API] Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch catalog',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Only allow GET requests
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
