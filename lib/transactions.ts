
/**
 * MongoDB transaction helpers for atomic operations
 */

import { Db, ClientSession } from 'mongodb';
import { connectToDatabase } from './db-optimized';

/**
 * Execute a function within a MongoDB transaction
 */
export async function withTransaction<T>(
  operation: (db: Db, session: ClientSession) => Promise<T>
): Promise<T> {
  const { client, db } = await connectToDatabase();
  const session = client.startSession();

  try {
    let result: T;
    
    await session.withTransaction(async () => {
      result = await operation(db, session);
      return result;
    });

    return result!;
  } finally {
    await session.endSession();
  }
}

/**
 * Atomic order creation with customer update and inventory adjustment
 */
export async function createOrderAtomic(orderData: any) {
  return withTransaction(async (db, session) => {
    // 1. Insert order
    const orderResult = await db.collection('orders').insertOne(orderData, { session });
    
    if (!orderResult.acknowledged) {
      throw new Error('Order insertion failed');
    }

    // 2. Update customer data (upsert)
    if (orderData.customerEmail) {
      await db.collection('customers').findOneAndUpdate(
        { email: orderData.customerEmail },
        {
          $set: {
            email: orderData.customerEmail,
            name: orderData.customerName,
            phone: orderData.customerPhone,
            lastOrderAt: new Date(),
            lastOrderId: orderData.id,
            updatedAt: new Date(),
          },
          $inc: { 
            totalOrders: 1, 
            totalSpent: orderData.total || 0 
          },
          $setOnInsert: {
            id: orderData.customerEmail,
            createdAt: new Date(),
            preferences: {},
            addresses: [],
            version: 1,
          },
        },
        { upsert: true, session }
      );
    }

    // 3. Decrement inventory for each item
    // NOTE: Inventory is NOT decremented here at order creation time.
    // It is decremented in `consumeInventoryForPaidOrder` (lib/custom-inventory.ts)
    // after payment succeeds in `/api/payments`. Decrementing here would
    // double-debit and also fail loudly for catalog items not in our inventory
    // collection (e.g. Square-only items). We only validate items have an identifier.
    for (const item of orderData.items) {
      const productKey = item.productId || item.catalogObjectId || item.variationId || item.id;
      if (!productKey) {
        throw new Error('Cart item is missing a product identifier');
      }
    }

    // 4. If coupon was applied, mark it as used
    if (orderData.appliedCoupon?.code) {
      await db.collection('coupons').updateOne(
        { code: orderData.appliedCoupon.code },
        {
          $inc: { usedCount: 1 },
          $set: { lastUsedAt: new Date() },
          $push: {
            usageHistory: {
              orderId: orderData.id,
              customerEmail: orderData.customerEmail,
              usedAt: new Date(),
              discountAmount: orderData.couponDiscount || 0,
            },
          },
        } as any,
        { session }
      );
    }

    return orderData;
  });
}
