import { logger } from '@/lib/logger';
import { lockInventory, batchLockInventory, LockResult } from '@/lib/inventory-lock';
import { RateLimit } from '@/lib/redis';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/inventory/lock
 * Lock inventory during checkout process
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!RateLimit.check(`inventory_lock:${clientIp}`, 30, 60)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const {
      productId,
      variationId,
      quantity,
      orderId,
      sessionId,
      customerEmail,
      items // For batch locking
    } = body;

    // Batch lock mode (multiple items)
    if (items && Array.isArray(items)) {
      if (!orderId || !sessionId || !customerEmail) {
        return NextResponse.json(
          { error: 'orderId, sessionId, and customerEmail required for batch lock' },
          { status: 400 }
        );
      }

      const result = await batchLockInventory(items, orderId, sessionId, customerEmail);

      if (result.success) {
        logger.info('InventoryLock', 'Batch lock created', {
          orderId,
          itemsLocked: result.locks.length
        });

        return NextResponse.json({
          success: true,
          locks: result.locks,
          expiresAt: result.locks[0]?.expiresAt
        });
      } else {
        logger.warn('InventoryLock', 'Batch lock failed', {
          orderId,
          failures: result.failedItems
        });

        return NextResponse.json({
          success: false,
          error: 'Some items could not be reserved',
          failedItems: result.failedItems,
          locks: result.locks
        }, { status: 409 });
      }
    }

    // Single item lock mode
    if (!productId || !quantity || !orderId || !sessionId || !customerEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: productId, quantity, orderId, sessionId, customerEmail' },
        { status: 400 }
      );
    }

    if (quantity < 1) {
      return NextResponse.json(
        { error: 'Quantity must be at least 1' },
        { status: 400 }
      );
    }

    const result = await lockInventory(
      productId,
      quantity,
      orderId,
      sessionId,
      customerEmail,
      variationId
    );

    if (result.success) {
      logger.info('InventoryLock', 'Lock created', {
        lockId: result.lockId,
        productId,
        quantity,
        orderId
      });

      return NextResponse.json({
        success: true,
        lockId: result.lockId,
        productId: result.productId,
        quantityLocked: result.quantityLocked,
        availableStock: result.availableStock,
        expiresAt: result.expiresAt
      });
    } else {
      logger.warn('InventoryLock', 'Lock creation failed', {
        productId,
        quantity,
        error: result.error
      });

      return NextResponse.json({
        success: false,
        error: result.error,
        productId: result.productId,
        availableStock: result.availableStock
      }, { status: 409 });
    }
  } catch (error) {
    logger.error('InventoryLock', 'Error in lock endpoint', { error });
    return NextResponse.json(
      { error: 'Failed to lock inventory' },
      { status: 500 }
    );
  }
}
