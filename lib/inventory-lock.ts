/**
 * Inventory Locking System
 * Prevents overselling by reserving inventory during checkout
 * TTL: 15 minutes (configurable via INVENTORY_LOCK_TTL_MINUTES)
 */

import { logger } from './logger';
import { connectToDatabase } from './db-optimized';
import { inventoryCache } from './cache';

// Lock TTL in milliseconds (default: 15 minutes)
const LOCK_TTL_MS = (parseInt(process.env.INVENTORY_LOCK_TTL_MINUTES || '15')) * 60 * 1000;

export interface InventoryLock {
  _id?: string;
  productId: string;
  variationId?: string;
  quantity: number;
  orderId: string;
  sessionId: string;
  customerEmail: string;
  status: 'active' | 'expired' | 'confirmed' | 'released';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
  releasedAt?: Date;
}

export interface LockResult {
  success: boolean;
  lockId?: string;
  productId: string;
  quantityLocked: number;
  availableStock: number;
  expiresAt?: Date;
  error?: string;
}

/**
 * Create an inventory lock during checkout
 */
export async function lockInventory(
  productId: string,
  quantity: number,
  orderId: string,
  sessionId: string,
  customerEmail: string,
  variationId?: string
): Promise<LockResult> {
  try {
    const { db } = await connectToDatabase();

    // Check current available stock
    const inventory = await db.collection('inventory').findOne({ productId });
    
    if (!inventory) {
      return {
        success: false,
        productId,
        quantityLocked: 0,
        availableStock: 0,
        error: 'Product not found'
      };
    }

    // Calculate locked quantity for this product
    const lockedResult = await db.collection('inventory_locks').aggregate([
      {
        $match: {
          productId,
          status: 'active',
          expiresAt: { $gt: new Date() }
        }
      },
      {
        $group: {
          _id: null,
          totalLocked: { $sum: '$quantity' }
        }
      }
    ]).toArray();

    const totalLocked = lockedResult[0]?.totalLocked || 0;
    const availableStock = inventory.currentStock - totalLocked;

    // Check if requested quantity is available
    if (availableStock < quantity) {
      logger.warn('InventoryLock', 'Insufficient stock', {
        productId,
        requested: quantity,
        available: availableStock,
        totalLocked
      });

      return {
        success: false,
        productId,
        quantityLocked: 0,
        availableStock,
        error: `Only ${availableStock} units available (${totalLocked} reserved by other customers)`
      };
    }

    // Create the lock
    const expiresAt = new Date(Date.now() + LOCK_TTL_MS);
    const lockData: Omit<InventoryLock, '_id'> = {
      productId,
      variationId,
      quantity,
      orderId,
      sessionId,
      customerEmail,
      status: 'active',
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('inventory_locks').insertOne(lockData);

    // Update cache
    inventoryCache.invalidate(productId);

    logger.info('InventoryLock', 'Created lock', {
      lockId: result.insertedId.toString(),
      productId,
      quantity,
      orderId,
      expiresAt
    });

    return {
      success: true,
      lockId: result.insertedId.toString(),
      productId,
      quantityLocked: quantity,
      availableStock: availableStock - quantity,
      expiresAt
    };
  } catch (error) {
    logger.error('InventoryLock', 'Error creating lock', { productId, quantity, error });
    return {
      success: false,
      productId,
      quantityLocked: 0,
      availableStock: 0,
      error: 'Failed to lock inventory'
    };
  }
}

/**
 * Release an inventory lock (called on cancel/abandon)
 */
export async function releaseLock(
  lockId: string,
  orderId: string
): Promise<boolean> {
  try {
    const { db } = await connectToDatabase();

    const lock = await db.collection('inventory_locks').findOne({
      $or: [
        { _id: lockId },
        { orderId }
      ],
      status: 'active'
    });

    if (!lock) {
      logger.warn('InventoryLock', 'Lock not found or already released', { lockId, orderId });
      return false;
    }

    const result = await db.collection('inventory_locks').updateOne(
      { _id: lock._id },
      {
        $set: {
          status: 'released',
          releasedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

    // Invalidate cache
    inventoryCache.invalidate(lock.productId);

    logger.info('InventoryLock', 'Released lock', {
      lockId: lock._id.toString(),
      productId: lock.productId,
      quantity: lock.quantity
    });

    return result.modifiedCount > 0;
  } catch (error) {
    logger.error('InventoryLock', 'Error releasing lock', { lockId, orderId, error });
    return false;
  }
}

/**
 * Confirm an inventory lock (convert to actual deduction on payment success)
 */
export async function confirmLock(
  lockId: string,
  orderId: string
): Promise<boolean> {
  try {
    const { db } = await connectToDatabase();

    const lock = await db.collection('inventory_locks').findOne({
      $or: [
        { _id: lockId },
        { orderId }
      ],
      status: 'active'
    });

    if (!lock) {
      logger.warn('InventoryLock', 'Lock not found for confirmation', { lockId, orderId });
      return false;
    }

    // Update lock status to confirmed
    await db.collection('inventory_locks').updateOne(
      { _id: lock._id },
      {
        $set: {
          status: 'confirmed',
          confirmedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

    // Deduct from actual inventory
    const deductResult = await db.collection('inventory').updateOne(
      { productId: lock.productId },
      {
        $inc: { currentStock: -lock.quantity },
        $set: { updatedAt: new Date() },
        $push: {
          stockHistory: {
            type: 'sale',
            quantity: -lock.quantity,
            orderId: lock.orderId,
            timestamp: new Date()
          }
        }
      }
    );

    // Invalidate cache
    inventoryCache.invalidate(lock.productId);

    logger.info('InventoryLock', 'Confirmed lock and deducted inventory', {
      lockId: lock._id.toString(),
      productId: lock.productId,
      quantity: lock.quantity,
      orderId
    });

    return deductResult.modifiedCount > 0;
  } catch (error) {
    logger.error('InventoryLock', 'Error confirming lock', { lockId, orderId, error });
    return false;
  }
}

/**
 * Get active locks for a product
 */
export async function getActiveLocksForProduct(productId: string): Promise<InventoryLock[]> {
  try {
    const { db } = await connectToDatabase();

    const locks = await db.collection('inventory_locks')
      .find({
        productId,
        status: 'active',
        expiresAt: { $gt: new Date() }
      })
      .toArray();

    return locks as InventoryLock[];
  } catch (error) {
    logger.error('InventoryLock', 'Error getting active locks', { productId, error });
    return [];
  }
}

/**
 * Get total locked quantity for a product
 */
export async function getLockedQuantity(productId: string): Promise<number> {
  try {
    const { db } = await connectToDatabase();

    const result = await db.collection('inventory_locks').aggregate([
      {
        $match: {
          productId,
          status: 'active',
          expiresAt: { $gt: new Date() }
        }
      },
      {
        $group: {
          _id: null,
          totalLocked: { $sum: '$quantity' }
        }
      }
    ]).toArray();

    return result[0]?.totalLocked || 0;
  } catch (error) {
    logger.error('InventoryLock', 'Error getting locked quantity', { productId, error });
    return 0;
  }
}

/**
 * Check available inventory (stock - locked)
 */
export async function getAvailableStock(productId: string): Promise<number> {
  try {
    const { db } = await connectToDatabase();

    const inventory = await db.collection('inventory').findOne({ productId });
    if (!inventory) return 0;

    const locked = await getLockedQuantity(productId);
    return Math.max(0, inventory.currentStock - locked);
  } catch (error) {
    logger.error('InventoryLock', 'Error getting available stock', { productId, error });
    return 0;
  }
}

/**
 * Cleanup expired locks (called by cron job)
 */
export async function cleanupExpiredLocks(): Promise<{
  cleaned: number;
  productsAffected: string[];
}> {
  try {
    const { db } = await connectToDatabase();

    // Find expired active locks
    const expiredLocks = await db.collection('inventory_locks')
      .find({
        status: 'active',
        expiresAt: { $lte: new Date() }
      })
      .toArray();

    if (expiredLocks.length === 0) {
      return { cleaned: 0, productsAffected: [] };
    }

    // Mark them as expired
    const lockIds = expiredLocks.map(lock => lock._id);
    await db.collection('inventory_locks').updateMany(
      { _id: { $in: lockIds } },
      {
        $set: {
          status: 'expired',
          updatedAt: new Date()
        }
      }
    );

    // Get unique products affected
    const productsAffected = [...new Set(expiredLocks.map(lock => lock.productId))] as string[];

    // Invalidate cache for affected products
    productsAffected.forEach(productId => inventoryCache.invalidate(productId));

    logger.info('InventoryLock', 'Cleaned up expired locks', {
      cleaned: expiredLocks.length,
      productsAffected: productsAffected.length
    });

    return { cleaned: expiredLocks.length, productsAffected };
  } catch (error) {
    logger.error('InventoryLock', 'Error cleaning up expired locks', { error });
    return { cleaned: 0, productsAffected: [] };
  }
}

/**
 * Extend lock expiration (e.g., during payment processing)
 */
export async function extendLock(
  lockId: string,
  additionalMinutes: number = 5
): Promise<boolean> {
  try {
    const { db } = await connectToDatabase();

    const newExpiresAt = new Date(Date.now() + (additionalMinutes * 60 * 1000));

    const result = await db.collection('inventory_locks').updateOne(
      { _id: lockId, status: 'active' },
      {
        $set: {
          expiresAt: newExpiresAt,
          updatedAt: new Date()
        }
      }
    );

    if (result.modifiedCount > 0) {
      logger.info('InventoryLock', 'Extended lock expiration', { lockId, newExpiresAt });
    }

    return result.modifiedCount > 0;
  } catch (error) {
    logger.error('InventoryLock', 'Error extending lock', { lockId, error });
    return false;
  }
}

/**
 * Batch lock multiple products (for cart checkout)
 */
export async function batchLockInventory(
  items: Array<{
    productId: string;
    variationId?: string;
    quantity: number;
  }>,
  orderId: string,
  sessionId: string,
  customerEmail: string
): Promise<{
  success: boolean;
  locks: LockResult[];
  failedItems: Array<{ productId: string; reason: string }>;
}> {
  const locks: LockResult[] = [];
  const failedItems: Array<{ productId: string; reason: string }> = [];

  // Try to lock each item
  for (const item of items) {
    const result = await lockInventory(
      item.productId,
      item.quantity,
      orderId,
      sessionId,
      customerEmail,
      item.variationId
    );

    if (result.success) {
      locks.push(result);
    } else {
      failedItems.push({
        productId: item.productId,
        reason: result.error || 'Failed to lock inventory'
      });
    }
  }

  // If any locks failed, release the successful ones
  if (failedItems.length > 0 && locks.length > 0) {
    logger.warn('InventoryLock', 'Rolling back partial locks due to failures', {
      orderId,
      locksCreated: locks.length,
      failures: failedItems.length
    });

    // Release all successful locks
    for (const lock of locks) {
      if (lock.lockId) {
        await releaseLock(lock.lockId, orderId);
      }
    }

    return {
      success: false,
      locks: [],
      failedItems
    };
  }

  return {
    success: failedItems.length === 0,
    locks,
    failedItems
  };
}

// Default export
export default {
  lockInventory,
  releaseLock,
  confirmLock,
  getActiveLocksForProduct,
  getLockedQuantity,
  getAvailableStock,
  cleanupExpiredLocks,
  extendLock,
  batchLockInventory
};
