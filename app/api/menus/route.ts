import { NextResponse } from 'next/server';
import { getPublicMenus } from '@/lib/menus/repository';
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
 * Public: list current and intentionally archived menus.
 * Inactive, unarchived menus remain private admin drafts.
 */
export async function GET() {
  try {
    const menus = await getPublicMenus();

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
