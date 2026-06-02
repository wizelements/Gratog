/**
 * Queue Integration Helper
 * Adds orders to the queue system after checkout
 */

import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';

/**
 * Server-side queue position creation for paid orders.
 * Idempotent by orderId — safe to call multiple times.
 * Uses direct MongoDB (not Mongoose) to avoid model-loading issues in lib/.
 * Writes to 'queuepositions' collection (same as QueuePosition model).
 */
export async function createQueuePositionForPaidOrder({ orderId, orderRef, marketId, marketName, customerInfo, items }) {
  try {
    const { db } = await connectToDatabase();
    const col = db.collection('queuepositions');

    // Idempotent: check if already in queue
    const existing = await col.findOne({ orderId });
    if (existing) {
      logger.debug('Queue', 'Queue position already exists', { orderId, position: existing.position });
      return { created: false, position: existing.position, status: existing.status };
    }

    // Get next position for this market
    const lastPosition = await col
      .find({ marketId: marketId || 'default' })
      .sort({ position: -1 })
      .limit(1)
      .toArray();

    const nextPosition = (lastPosition[0]?.position || 0) + 1;

    const now = new Date();
    const queueEntry = {
      orderId,
      orderRef: orderRef || orderId?.slice(-6).toUpperCase(),
      marketId: marketId || 'default',
      marketName: marketName || 'Market',
      position: nextPosition,
      status: 'queued',
      customerInfo: customerInfo || {},
      items: items || [],
      queuedAt: now,
      createdAt: now,
      updatedAt: now,
      source: 'server',
      __v: 0
    };

    await col.insertOne(queueEntry);

    logger.info('Queue', 'Queue position created server-side', { orderId, position: nextPosition });

    return { created: true, position: nextPosition, status: 'queued' };
  } catch (error) {
    // If duplicate key error (race condition on orderId unique index), return existing
    if (error.code === 11000) {
      const { db } = await connectToDatabase();
      const existing = await db.collection('queuepositions').findOne({ orderId });
      return { created: false, position: existing?.position, status: existing?.status };
    }
    logger.error('Queue', 'Failed to create queue position', { orderId, error: error.message });
    return { created: false, error: error.message };
  }
}

export async function addOrderToQueue(orderData) {
  try {
    const response = await fetch('/api/queue/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: orderData.id,
        orderRef: orderData.orderRef || orderData.id?.slice(-6).toUpperCase(),
        marketId: orderData.marketId || orderData.fulfillmentDetails?.marketId,
        marketName: orderData.marketName || orderData.fulfillmentDetails?.marketName,
        customerInfo: {
          name: orderData.customer?.name,
          phone: orderData.customer?.phone,
          email: orderData.customer?.email
        },
        items: orderData.cart?.map(item => ({
          name: item.name,
          quantity: item.quantity,
          customizations: item.modifiers || item.customizations
        })) || []
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to add to queue');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Queue join error:', error);
    return null;
  }
}

export function shouldUseQueue(fulfillmentType, orderData) {
  // Use queue for pickup orders at markets
  return fulfillmentType?.includes('pickup') || 
         orderData?.fulfillmentDetails?.type === 'pickup' ||
         orderData?.marketId;
}

export function getQueueRedirectUrl(orderId) {
  return `/order/${orderId}/queue`;
}
