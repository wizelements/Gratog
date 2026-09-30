
/**
 * MongoDB transaction helpers for atomic operations
 */

import { Db, ClientSession } from 'mongodb';
import { connectToDatabase } from './db-optimized';
import { buildOpeeBusinessEvent, stableCustomerRef } from './opee/contract';
import { ensureOpeeOutboxIndexes, insertOpeeOutboxEvent } from './opee/outbox';

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
  await ensureOpeeOutboxIndexes();
  return withTransaction(async (db, session) => {
    // 1. Insert order
    const orderResult = await db.collection('orders').insertOne(orderData, { session });
    
    if (!orderResult.acknowledged) {
      throw new Error('Order insertion failed');
    }

    // 2. Upsert the customer profile (identity only).
    //    DO NOT $inc LTV counters here — abandoned orders would inflate
    //    totalOrders / totalSpent before a single dollar is captured.
    //    LTV counters are incremented exactly once in /api/payments on
    //    confirmed payment success.
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
          $setOnInsert: {
            id: orderData.customerEmail,
            createdAt: new Date(),
            preferences: {},
            addresses: [],
            totalOrders: 0,
            totalSpent: 0,
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

    // 4. INTENTIONAL NO-OP: coupon usage is NOT incremented at order
    //    creation. Pre-payment increments let abandoned-cart loops drain
    //    capped coupons (REVENUE risk R-C4). The coupon `usedCount` and
    //    `isUsed` flag are advanced atomically in /api/payments on
    //    confirmed payment success.

    // 5. Transactional outbox: the order and its OPEE observations commit together.
    //    No raw customer email/phone/address is copied into OPEE.
    const customerRef = stableCustomerRef(orderData.customerEmail);
    const opeeEvent = buildOpeeBusinessEvent({
      eventType: 'tog.order.created',
      source: 'gratog.order',
      sourceEventId: String(orderData.id),
      correlationId: String(orderData.id),
      subject: { type: 'order', id: String(orderData.id) },
      payload: {
        order_id: orderData.id,
        total_cents: Number(orderData.totalCents || 0),
        currency: orderData.currency || 'USD',
        fulfillment_type: orderData.fulfillmentType || orderData.fulfillment?.type || null,
        source: orderData.source || 'website',
        customer_ref: customerRef,
        items: (orderData.items || []).map((item: any) => ({
          product_id: item.productId || item.id || null,
          variation_id: item.variationId || item.catalogObjectId || null,
          quantity: Number(item.quantity || 0),
          unit_price_cents: Number(item.priceCents || 0),
        })),
      },
    });
    await insertOpeeOutboxEvent(db, opeeEvent, { session });

    if (customerRef) {
      const customerEvent = buildOpeeBusinessEvent({
        eventType: 'tog.customer.observed',
        source: 'gratog.customer',
        sourceEventId: String(orderData.id),
        correlationId: String(orderData.id),
        subject: { type: 'customer', id: customerRef },
        payload: {
          customer_ref: customerRef,
          observed_via: 'order',
          order_id: orderData.id,
        },
      });
      await insertOpeeOutboxEvent(db, customerEvent, { session });
    }

    return orderData;
  });
}
