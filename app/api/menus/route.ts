import { NextResponse } from 'next/server';
import { getActiveMenus } from '@/lib/menus/repository';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

/**
 * GET /api/menus
 * Public: list all active menus
 */
export async function GET() {
  try {
    const menus = await getActiveMenus();

    return NextResponse.json(
      {
        success: true,
        menus,
        count: menus.length,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error: any) {
    logger.error('API', 'Public menus fetch error', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch menus',
        menus: [],
        count: 0,
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
