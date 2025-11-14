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
    for (const item of orderData.items) {
      const inventoryResult = await db.collection('inventory').findOneAndUpdate(
        { productId: item.id },
        {
          $inc: { currentStock: -item.quantity },
          // @ts-ignore - MongoDB $push typing issue
          $push: {
            stockHistory: {
              date: new Date(),
              adjustment: -item.quantity,
              reason: `Order ${orderData.id}`,
              adjustedBy: 'system',
            },
          },
        },
        { session }
      );

      // Check if inventory was actually decremented
      if (!inventoryResult.value) {
        throw new Error(`Product ${item.id} not found in inventory`);
      }

      // Check for negative stock (optional: enforce stock limits)
      const newStock = inventoryResult.value.currentStock - item.quantity;
      if (newStock < 0) {
        console.warn(`Product ${item.id} stock went negative: ${newStock}`);
        // Optionally: throw error to rollback if out of stock
        // throw new Error(`Product ${item.id} is out of stock`);
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
        },
        { session }
      );
    }

    return orderData;
  });
}
