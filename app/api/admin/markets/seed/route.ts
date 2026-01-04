/**
 * Seed Markets API
 * Initializes default market data if none exists
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-session';
import { logger } from '@/lib/logger';
import { seedDefaultMarkets, ensureMarketIndexes } from '@/lib/markets/repository';

/**
 * POST /api/admin/markets/seed
 * Seed default markets and create indexes
 */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);

    await ensureMarketIndexes();
    const result = await seedDefaultMarkets();

    logger.info('API', 'Markets seeded by admin', {
      adminEmail: admin.email,
      seeded: result.seeded,
    });

    return NextResponse.json({
      success: true,
      seeded: result.seeded,
      message:
        result.seeded > 0
          ? `Successfully seeded ${result.seeded} markets`
          : 'Markets already exist, no seeding needed',
    });
  } catch (error: any) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }

    logger.error('API', 'Admin markets seed error', error);
    return NextResponse.json(
      { success: false, error: 'Failed to seed markets' },
      { status: 500 }
    );
  }
}
