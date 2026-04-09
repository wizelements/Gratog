import { logger } from '@/lib/logger';
import { releaseLock } from '@/lib/inventory-lock';
import { RateLimit } from '@/lib/redis';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/inventory/release
 * Release inventory lock (called on cancel/abandon)
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!RateLimit.check(`inventory_release:${clientIp}`, 30, 60)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { lockId, orderId } = body;

    if (!lockId && !orderId) {
      return NextResponse.json(
        { error: 'Either lockId or orderId is required' },
        { status: 400 }
      );
    }

    const success = await releaseLock(lockId, orderId);

    if (success) {
      logger.info('InventoryLock', 'Lock released', { lockId, orderId });

      return NextResponse.json({
        success: true,
        message: 'Inventory lock released successfully',
        releasedAt: new Date().toISOString()
      });
    } else {
      logger.warn('InventoryLock', 'Lock not found for release', { lockId, orderId });

      return NextResponse.json({
        success: false,
        error: 'Lock not found or already released'
      }, { status: 404 });
    }
  } catch (error) {
    logger.error('InventoryLock', 'Error in release endpoint', { error });
    return NextResponse.json(
      { error: 'Failed to release inventory lock' },
      { status: 500 }
    );
  }
}
