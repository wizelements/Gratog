import { NextResponse } from 'next/server';
import { getActiveMarkets } from '@/lib/markets/repository';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0'
};

/**
 * GET /api/markets
 * Public markets feed consumed by storefront pages.
 */
export async function GET() {
  try {
    const markets = await getActiveMarkets();

    return NextResponse.json(
      {
        success: true,
        markets,
        count: markets.length
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error: any) {
    logger.error('API', 'Public markets fetch error', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch markets',
        markets: [],
        count: 0
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
