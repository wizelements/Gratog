import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { syncSquareOrders, getOrdersSyncStatus } from '@/lib/square-orders-sync';
import { requireAdmin } from '@/lib/admin-session';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/orders/sync
 * Sync orders from Square to local database
 */
export async function POST(request) {
  try {
    const admin = await requireAdmin(request);

    const body = await request.json().catch(() => ({}));
    const { since, limit } = body;

    const { db } = await connectToDatabase();
    
    const sinceDate = since ? new Date(since) : null;
    
    logger.info('AdminOrdersSync', `Starting orders sync by ${admin.email}${sinceDate ? ` since ${sinceDate.toISOString()}` : ''}`);
    
    const result = await syncSquareOrders(db, { 
      since: sinceDate,
      limit: limit || 500
    });

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${result.synced} orders from Square`,
      ...result
    });

  } catch (error) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }
    logger.error('AdminOrdersSync', 'Orders sync failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Orders sync failed',
        hint: 'Check Square API credentials and permissions (ORDERS_READ required)'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/orders/sync
 * Get sync status
 */
export async function GET(request) {
  try {
    const admin = await requireAdmin(request);

    const { db } = await connectToDatabase();
    const status = await getOrdersSyncStatus(db);

    return NextResponse.json({
      success: true,
      ...status
    });

  } catch (error) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }
    logger.error('AdminOrdersSync', 'Failed to get sync status:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}
