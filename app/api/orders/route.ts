export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import {tursoPreviewSelected,openTursoPreview} from '@/lib/checkout/turso-preview-runtime.mjs';
import MarketOrder from '@/models/MarketOrder';

export const runtime = 'nodejs';

function deprecatedOrderCreationResponse() {
  return NextResponse.json(
    {
      success: false,
      error: 'This endpoint is no longer available. Use /api/orders/create then /api/payments.',
      code: 'ORDER_CREATION_PATH_DEPRECATED',
    },
    {
      status: 410,
      headers: {
        Deprecation: 'true',
        Sunset: 'Sat, 31 May 2026 00:00:00 GMT',
        Link: '</api/orders/create>; rel="successor-version"',
      },
    }
  );
}

/**
 * POST /api/orders
 * Deprecated legacy order creation path.
 */
export async function POST() {
  return deprecatedOrderCreationResponse();
}

/**
 * GET /api/orders
 * Get orders with filtering by fulfillment type
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.ADMIN_API_KEY;
    
    if (!authHeader || authHeader.replace('Bearer ', '') !== apiKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fulfillmentType = searchParams.get('fulfillmentType');
    const status = searchParams.get('status');
    const marketId = searchParams.get('marketId');

    if(tursoPreviewSelected()){
      const {listTursoAdminOrders}=await import('@/lib/checkout/turso-admin-order-list.mjs');
      const result=await listTursoAdminOrders(await openTursoPreview(),{
        sourceCollection:'marketorders',page:1,limit:100,status,fulfillmentType,marketId
      });
      return NextResponse.json({orders:result.orders},{headers:{'Cache-Control':'no-store'}});
    }

    await connectToDatabase();

    const query: any = {};
    if (fulfillmentType) query.fulfillmentType = fulfillmentType;
    if (status) query.status = status;
    if (marketId) query.marketId = marketId;

    const orders = await MarketOrder.find(query)
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Order fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: tursoPreviewSelected()?503:500, headers:{'Cache-Control':'no-store'} }
    );
  }
}
