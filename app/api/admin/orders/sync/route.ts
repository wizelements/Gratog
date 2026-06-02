export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { withAdminMiddleware, AuthenticatedRequest } from '@/lib/middleware/admin';
import { PERMISSIONS } from '@/lib/security';
import { syncSquareOrders, getOrdersSyncStatus } from '@/lib/square-orders-sync';
import { logger } from '@/lib/logger';

export const GET = withAdminMiddleware(
  async (request: AuthenticatedRequest) => {
    try {
      const { db } = await connectToDatabase();
      const status = await getOrdersSyncStatus(db);
      return NextResponse.json({ success: true, ...status });
    } catch (error) {
      logger.error('SYNC', 'Failed to get sync status', error);
      return NextResponse.json(
        { success: false, error: 'Failed to get sync status' },
        { status: 500 }
      );
    }
  },
  { permission: PERMISSIONS.ORDERS_VIEW, resource: 'orders', action: 'sync_status' }
);

export const POST = withAdminMiddleware(
  async (request: AuthenticatedRequest) => {
    try {
      const { db } = await connectToDatabase();
      const { success: _, ...rest } = await syncSquareOrders(db, { limit: 200 });
      return NextResponse.json({ success: true, ...rest });
    } catch (error) {
      logger.error('SYNC', 'Square sync failed', error);
      return NextResponse.json(
        { success: false, error: 'Square sync failed' },
        { status: 500 }
      );
    }
  },
  {
    permission: PERMISSIONS.ORDERS_VIEW,
    resource: 'orders',
    action: 'sync',
    rateLimit: { maxRequests: 5, windowSeconds: 60 },
  }
);
