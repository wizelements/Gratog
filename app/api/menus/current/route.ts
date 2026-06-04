import { NextResponse } from 'next/server';
import { getActiveMenu } from '@/lib/menus/repository';
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
 * GET /api/menus/current
 * Public: return the current active menu
 */
export async function GET() {
  try {
    const menu = await getActiveMenu();

    return NextResponse.json(
      {
        success: true,
        menu,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error: any) {
    logger.error('API', 'Current menu fetch error', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch current menu',
        menu: null,
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
