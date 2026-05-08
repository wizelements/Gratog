/**
 * 🚀 Gratog Pay Flow — Products API Route
 * Returns available products with caching
 * Optional staff mode for full inventory access
 */

import { NextRequest, NextResponse } from 'next/server';
import { SAMPLE_PRODUCTS } from '@/lib/pay-flow/data';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const staffMode = searchParams.get('staff') === 'true';
    const category = searchParams.get('category');
    
    let products = SAMPLE_PRODUCTS;
    
    // Filter by category if specified
    if (category && category !== 'all') {
      products = products.filter(p => p.category === category);
    }
    
    // Filter availability unless staff mode
    if (!staffMode) {
      products = products.filter(p => p.available && p.stockQuantity > 0);
    }
    
    // Return with cache headers (30 second client cache)
    return NextResponse.json(
      {
        products,
        lastUpdated: Date.now(),
        locationId: process.env.SQUARE_LOCATION_ID
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=30, stale-while-revalidate=60'
        }
      }
    );
    
  } catch (error) {
    console.error('Products API error:', error);
    
    return NextResponse.json(
      { error: 'Failed to load products' },
      { status: 500 }
    );
  }
}
