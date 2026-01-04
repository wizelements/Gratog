/**
 * Admin Markets API
 * CRUD operations for managing farmers market locations
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-session';
import { logger } from '@/lib/logger';
import {
  getAllMarkets,
  createMarket,
  updateMarket,
  deleteMarket,
} from '@/lib/markets/repository';
import {
  createMarketSchema,
  updateMarketSchema,
  deleteMarketSchema,
} from '@/lib/markets/schema';

/**
 * GET /api/admin/markets
 * Fetch all markets for admin dashboard
 */
export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);

    const markets = await getAllMarkets();

    logger.info('API', 'Admin fetched markets', {
      adminEmail: admin.email,
      count: markets.length,
    });

    return NextResponse.json({
      success: true,
      markets,
      count: markets.length,
    });
  } catch (error: any) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }

    logger.error('API', 'Admin markets fetch error', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch markets' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/markets
 * Create a new market
 */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const json = await request.json();

    const parsed = createMarketSchema.safeParse(json);
    if (!parsed.success) {
      const errors = parsed.error.flatten();
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: errors.fieldErrors,
        },
        { status: 400 }
      );
    }

    const market = await createMarket(parsed.data);

    logger.info('API', 'Market created by admin', {
      adminEmail: admin.email,
      marketId: market.id,
      marketName: market.name,
    });

    return NextResponse.json({
      success: true,
      market,
    });
  } catch (error: any) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }

    logger.error('API', 'Admin market create error', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create market' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/markets
 * Update an existing market
 */
export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const json = await request.json();

    const parsed = updateMarketSchema.safeParse(json);
    if (!parsed.success) {
      const errors = parsed.error.flatten();
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: errors.fieldErrors,
        },
        { status: 400 }
      );
    }

    const { marketId, ...updateData } = parsed.data;

    const market = await updateMarket(marketId, updateData);

    if (!market) {
      return NextResponse.json(
        { success: false, error: 'Market not found' },
        { status: 404 }
      );
    }

    logger.info('API', 'Market updated by admin', {
      adminEmail: admin.email,
      marketId,
    });

    return NextResponse.json({
      success: true,
      market,
      message: 'Market updated successfully',
    });
  } catch (error: any) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }

    logger.error('API', 'Admin market update error', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update market' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/markets
 * Delete a market
 */
export async function DELETE(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const json = await request.json();

    const parsed = deleteMarketSchema.safeParse(json);
    if (!parsed.success) {
      const errors = parsed.error.flatten();
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: errors.fieldErrors,
        },
        { status: 400 }
      );
    }

    const { marketId } = parsed.data;

    const deleted = await deleteMarket(marketId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Market not found' },
        { status: 404 }
      );
    }

    logger.info('API', 'Market deleted by admin', {
      adminEmail: admin.email,
      marketId,
    });

    return NextResponse.json({
      success: true,
      message: 'Market deleted successfully',
    });
  } catch (error: any) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }

    logger.error('API', 'Admin market delete error', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete market' },
      { status: 500 }
    );
  }
}
