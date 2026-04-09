import { logger } from '@/lib/logger';
import { confirmLock } from '@/lib/inventory-lock';
import { RateLimit } from '@/lib/redis';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/inventory/confirm
 * Confirm inventory lock and deduct stock (called on payment success)
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!RateLimit.check(`inventory_confirm:${clientIp}`, 30, 60)) {
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

    const success = await confirmLock(lockId, orderId);

    if (success) {
      logger.info('InventoryLock', 'Lock confirmed and stock deducted', { lockId, orderId });

      return NextResponse.json({
        success: true,
        message: 'Inventory lock confirmed and stock deducted',
        confirmedAt: new Date().toISOString()
      });
    } else {
      logger.warn('InventoryLock', 'Lock not found for confirmation', { lockId, orderId });

      return NextResponse.json({
        success: false,
        error: 'Lock not found or already confirmed/released'
      }, { status: 404 });
    }
  } catch (error) {
    logger.error('InventoryLock', 'Error in confirm endpoint', { error });
    return NextResponse.json(
      { error: 'Failed to confirm inventory lock' },
      { status: 500 }
    );
  }
}
