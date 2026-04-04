import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase } from '@/lib/db-optimized';
import { getSquareWebhookSignatureKey } from '@/lib/square';
import { sendOrderConfirmationEmail } from '@/lib/resend-email';
import { syncSingleCatalogItem } from '@/lib/square/syncSingleItem';
import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';

// Force Node.js runtime for crypto operations and raw body access
export const runtime = 'nodejs';

/**
 * Square Webhooks Handler - PRODUCTION HARDENED
 * 
 * FIXES APPLIED:
 * 1. Correct order mapping using reference_id (local orderId) or metadata.localOrderId
 * 2. Status precedence - never downgrade from paid to processing
 * 3. Email deduplication with emailSentAt flag
 * 4. Proper error handling with Sentry integration
 * 5. Event deduplication to handle Square retries
 */

// Status precedence (higher = more final, never downgrade)
const STATUS_PRECEDENCE: Record<string, number> = {
  'pending': 1,
  'payment_processing': 2,
  'processing': 2,
  'payment_failed': 2,
  'paid': 3,
  'COMPLETED': 3,
  'completed': 3,
  'payment_completed': 3,
  'shipped': 4,
  'delivered': 5,
  'refunded': 6,
  'cancelled': 7
};

// Verify webhook signature for security
function verifyWebhookSignature(signatureHeader: string, requestUrl: string, requestBody: string): boolean {
  let webhookKey: string;
  try {
    webhookKey = getSquareWebhookSignatureKey();
  } catch {
    logger.warn('Webhook', 'Webhook signature key not configured');
    return false;
  }
  
  if (!signatureHeader) {
    logger.warn('Webhook', 'Missing signature header');
    return false;
  }
  
  try {
    // Square signs notificationUrl + rawBody and sends the base64 signature directly.
    const normalizedSignature = signatureHeader.trim();
    if (!normalizedSignature) {
      logger.error('Webhook', 'Empty signature header');
      return false;
    }

    const stringToSign = requestUrl + requestBody;
    
    // Calculate HMAC
    const hmac = crypto.createHmac('sha256', webhookKey);
    hmac.update(stringToSign);
    const calculatedSignature = hmac.digest('base64');

    const calculatedBuffer = Buffer.from(calculatedSignature);
    const providedBuffer = Buffer.from(normalizedSignature);
    if (calculatedBuffer.length !== providedBuffer.length) {
      return false;
    }

    // Compare signatures securely
    return crypto.timingSafeEqual(calculatedBuffer, providedBuffer);
  } catch (error) {
    logger.error('Webhook', 'Webhook signature verification error:', error);
    return false;
  }
}

/**
 * FIX #6: Find local order using multiple strategies
 * 1. Try payment.reference_id (contains local orderId)
 * 2. Try Square order metadata.localOrderId or metadata.local_order_id
 * 3. Fall back to squareOrderId lookup
 */
async function findLocalOrder(db: any, payment: any): Promise<any | null> {
  // Strategy 1: Use payment.reference_id (set in /api/payments when creating payment)
  if (payment.reference_id) {
    const order = await db.collection('orders').findOne({ id: payment.reference_id });
    if (order) {
      logger.debug('Webhook', 'Found order via payment.reference_id', { 
        orderId: order.id, 
        referenceId: payment.reference_id 
      });
      return order;
    }
  }
  
  // Strategy 2: Use Square order_id to look up order with that squareOrderId
  if (payment.order_id) {
    const order = await db.collection('orders').findOne({ squareOrderId: payment.order_id });
    if (order) {
      logger.debug('Webhook', 'Found order via squareOrderId', { 
        orderId: order.id, 
        squareOrderId: payment.order_id 
      });
      return order;
    }
  }
  
  // Strategy 3: Check payment records for local order mapping
  if (payment.id) {
    let paymentRecord = await db.collection('payment_records').findOne({ squarePaymentId: payment.id });

    // Migration fallback for older records.
    if (!paymentRecord) {
      paymentRecord = await db.collection('payments').findOne({ squarePaymentId: payment.id });
    }

    if (paymentRecord?.metadata?.orderId) {
      const order = await db.collection('orders').findOne({ id: paymentRecord.metadata.orderId });
      if (order) {
        logger.debug('Webhook', 'Found order via payment record mapping', { 
          orderId: order.id, 
          paymentId: payment.id 
        });
        return order;
      }
    }
  }
  
  logger.warn('Webhook', 'Could not find local order for payment', {
    paymentId: payment.id,
    referenceId: payment.reference_id,
    squareOrderId: payment.order_id
  });
  
  return null;
}

/**
 * FIX #7: Update order status with precedence check
 * Never downgrade from a higher precedence status
 */
async function updateOrderStatusSafe(
  db: any, 
  orderId: string, 
  newStatus: string, 
  updateFields: Record<string, any>
): Promise<boolean> {
  const order = await db.collection('orders').findOne({ id: orderId });
  
  if (!order) {
    logger.warn('Webhook', 'Order not found for status update', { orderId });
    return false;
  }
  
  const currentPrecedence = STATUS_PRECEDENCE[order.status] || 0;
  const newPrecedence = STATUS_PRECEDENCE[newStatus] || 0;
  
  // Don't downgrade status (e.g., don't go from 'paid' back to 'processing')
  if (currentPrecedence >= newPrecedence && newStatus !== order.status) {
    logger.debug('Webhook', 'Skipping status downgrade', {
      orderId,
      currentStatus: order.status,
      attemptedStatus: newStatus,
      currentPrecedence,
      newPrecedence
    });
    return false;
  }
  
  // Apply update
  const result = await db.collection('orders').updateOne(
    { id: orderId },
    {
      $set: {
        status: newStatus,
        ...updateFields,
        updatedAt: new Date().toISOString()
      },
      $push: {
        timeline: {
          status: newStatus,
          timestamp: new Date().toISOString(),
          message: `Status updated via Square webhook`,
          actor: 'square_webhook'
        }
      }
    }
  );
  
  logger.info('Webhook', 'Order status updated', {
    orderId,
    previousStatus: order.status,
    newStatus,
    modifiedCount: result.modifiedCount
  });
  
  return result.modifiedCount > 0;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let eventType = 'unknown';
  let eventId = 'unknown';
  
  try {
    logger.debug('Webhook', 'Square webhook received');
    
    // Get the raw request body and URL
    const requestBody = await request.text();
    const requestUrl = request.url;
    
    // Square signature header
    const signatureHeader =
      request.headers.get('x-square-hmacsha256-signature') ||
      request.headers.get('X-Square-HmacSha256-Signature');
    
    // Verify webhook signature in production
    const isDevelopment = process.env.NODE_ENV === 'development' && !process.env.VERCEL;
    const skipVerification = isDevelopment && process.env.SQUARE_SKIP_WEBHOOK_VERIFICATION === 'true';
    
    if (!skipVerification && !signatureHeader) {
      logger.error('Webhook', 'Missing Square signature header - rejecting');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    if (!skipVerification && signatureHeader) {
      const isSignatureValid = verifyWebhookSignature(
        signatureHeader,
        requestUrl,
        requestBody
      );
      
      if (!isSignatureValid) {
        logger.error('Webhook', 'Invalid webhook signature - rejecting');
        
        Sentry.captureMessage('Invalid Square webhook signature', {
          level: 'warning',
          tags: { security: 'webhook_signature_invalid' }
        });
        
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    } else if (skipVerification) {
      logger.warn('Webhook', '⚠️ Signature verification SKIPPED (local dev only)');
    }
    
    // Parse the webhook event
    let webhookEvent;
    try {
      webhookEvent = JSON.parse(requestBody);
    } catch (parseError) {
      logger.error('Webhook', 'Failed to parse webhook body');
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }
    
    eventId = webhookEvent.id || webhookEvent.event_id || 'unknown';
    eventType = webhookEvent.type || 'unknown';
    const eventData = webhookEvent.data;
    
    logger.debug('Webhook', 'Processing webhook event', {
      type: eventType,
      eventId,
      timestamp: webhookEvent.created_at
    });
    
    // Validate event structure
    if (!eventData || !eventData.object) {
      logger.error('Webhook', 'Invalid webhook event structure - missing data.object');
      return NextResponse.json(
        { error: 'Invalid event structure' },
        { status: 400 }
      );
    }
    
    // Connect to database
    const { db } = await connectToDatabase();
    
    // Event deduplication - prevent double-processing
    const existingEvent = await db.collection('webhook_events_processed').findOne({ eventId });
    
    if (existingEvent) {
      logger.debug('Webhook', 'Event already processed (idempotent return)', { eventId, eventType });
      return NextResponse.json({
        received: true,
        eventType,
        eventId,
        processedAt: existingEvent.processedAt,
        cached: true
      });
    }
    
    // Process the event based on type
    let processingResult = { success: true, message: '' };
    
    try {
      switch (eventType) {
        case 'payment.created':
          processingResult = await handlePaymentCreated(db, eventData.object.payment || eventData.object);
          break;
          
        case 'payment.updated':
        case 'payment.completed':
          processingResult = await handlePaymentUpdated(db, eventData.object.payment || eventData.object);
          break;
          
        case 'refund.created':
        case 'refund.updated':
          processingResult = await handleRefundEvent(db, eventData.object.refund || eventData.object);
          break;
          
        case 'inventory.count.updated':
          await handleInventoryUpdate(db, eventData.object);
          break;
          
        case 'catalog.version.updated':
          await handleCatalogUpdate(db, eventData.object);
          break;
          
        case 'order.created':
        case 'order.updated':
          // Log but don't process - we manage orders locally
          logger.debug('Webhook', `Square order event: ${eventType}`, { 
            orderId: eventData.object?.order?.id || eventData.object?.id 
          });
          break;
          
        default:
          logger.debug('Webhook', `Unhandled webhook event type: ${eventType}`);
      }
      
      // Mark as successfully processed
      await db.collection('webhook_events_processed').insertOne({
        eventId,
        eventType,
        processedAt: new Date().toISOString(),
        status: 'success',
        result: processingResult
      });
      
    } catch (eventError) {
      const errorMessage = eventError instanceof Error ? eventError.message : String(eventError);
      
      logger.error('Webhook', 'Error processing webhook event', {
        eventId,
        eventType,
        error: errorMessage
      });
      
      Sentry.captureException(eventError, {
        tags: { webhook: true, eventType },
        extra: { eventId }
      });
      
      // Mark as processed with error (prevents infinite retries)
      await db.collection('webhook_events_processed').insertOne({
        eventId,
        eventType,
        processedAt: new Date().toISOString(),
        status: 'error',
        error: errorMessage
      });
      
      // Return 500 so Square knows there was an issue (may retry)
      return NextResponse.json(
        { 
          error: 'Webhook processing failed',
          eventId,
          eventType
        },
        { status: 500 }
      );
    }
    
    const duration = Date.now() - startTime;
    logger.debug('Webhook', `Webhook processed in ${duration}ms`, { eventType, eventId });
    
    return NextResponse.json({
      received: true,
      eventType,
      eventId,
      processedAt: new Date().toISOString(),
      durationMs: duration
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Webhook', 'Webhook processing error', { 
      error: error instanceof Error ? error.message : String(error),
      eventType,
      eventId,
      duration
    });
    
    Sentry.captureException(error, {
      tags: { webhook: true, eventType }
    });
    
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PAYMENT EVENT HANDLERS
// ============================================================================

async function handlePaymentCreated(db: any, payment: any): Promise<{ success: boolean; message: string }> {
  logger.debug('Webhook', 'Payment created', { paymentId: payment.id, status: payment.status });
  
  const order = await findLocalOrder(db, payment);
  
  if (!order) {
    return { success: false, message: 'Order not found for payment' };
  }
  
  // Only update if not already at a higher status
  await updateOrderStatusSafe(db, order.id, 'payment_processing', {
    squarePaymentId: payment.id,
    paymentStatus: 'processing'
  });
  
  return { success: true, message: 'Payment created event processed' };
}

async function handlePaymentUpdated(db: any, payment: any): Promise<{ success: boolean; message: string }> {
  logger.info('Webhook', 'Payment updated', { 
    paymentId: payment.id, 
    status: payment.status,
    referenceId: payment.reference_id
  });
  
  const order = await findLocalOrder(db, payment);
  
  if (!order) {
    // Log for manual reconciliation
    Sentry.captureMessage('Payment webhook received for unknown order', {
      level: 'warning',
      extra: { 
        paymentId: payment.id, 
        referenceId: payment.reference_id,
        squareOrderId: payment.order_id,
        status: payment.status
      }
    });
    
    return { success: false, message: 'Order not found for payment' };
  }
  
  // Map Square payment status to our order status
  const statusMap: Record<string, string> = {
    'COMPLETED': 'paid',
    'APPROVED': 'paid',
    'PENDING': 'payment_processing',
    'CANCELED': 'payment_failed',
    'FAILED': 'payment_failed'
  };
  
  const newOrderStatus = statusMap[payment.status] || 'payment_processing';
  const isCompleted = payment.status === 'COMPLETED' || payment.status === 'APPROVED';
  
  // Build update fields
  const updateFields: Record<string, any> = {
    squarePaymentId: payment.id,
    paymentStatus: payment.status,
    receiptUrl: payment.receipt_url,
    cardBrand: payment.card_details?.card?.card_brand,
    cardLast4: payment.card_details?.card?.last_4
  };
  
  if (isCompleted) {
    updateFields.paidAt = new Date().toISOString();
  }
  
  // Update with precedence check
  const updated = await updateOrderStatusSafe(db, order.id, newOrderStatus, updateFields);
  
  // Send confirmation email if newly paid and not already sent
  if (isCompleted && updated && !order.emailSentAt && order.customer?.email) {
    try {
      const emailResult = await sendOrderConfirmationEmail({
        id: order.id,
        orderNumber: order.orderNumber || order.id,
        customer: {
          email: order.customer.email,
          name: order.customer.name || 'Customer',
          phone: order.customer.phone
        },
        items: order.items || [],
        pricing: order.pricing || { subtotal: 0, total: 0, deliveryFee: 0, tax: 0 },
        fulfillment: order.fulfillment || { type: 'pickup' },
        payment: {
          receiptUrl: payment.receipt_url,
          cardBrand: payment.card_details?.card?.card_brand,
          cardLast4: payment.card_details?.card?.last_4
        }
      });
      
      if (emailResult.success) {
        await db.collection('orders').updateOne(
          { id: order.id },
          { $set: { emailSentAt: new Date().toISOString() } }
        );
        logger.info('Webhook', 'Confirmation email sent via webhook', { orderId: order.id });
      }
    } catch (emailError) {
      logger.warn('Webhook', 'Failed to send confirmation email', { 
        orderId: order.id,
        error: emailError instanceof Error ? emailError.message : String(emailError)
      });
    }
  }
  
  return { success: true, message: `Payment ${payment.status} processed` };
}

async function handleRefundEvent(db: any, refund: any): Promise<{ success: boolean; message: string }> {
  logger.info('Webhook', 'Refund event', { 
    refundId: refund.id, 
    paymentId: refund.payment_id,
    status: refund.status
  });
  
  // Find order via payment ID
  const order = await db.collection('orders').findOne({ squarePaymentId: refund.payment_id });
  
  if (!order) {
    return { success: false, message: 'Order not found for refund' };
  }
  
  if (refund.status === 'COMPLETED') {
    await db.collection('orders').updateOne(
      { id: order.id },
      {
        $set: {
          status: 'refunded',
          paymentStatus: 'refunded',
          refundId: refund.id,
          refundedAt: new Date().toISOString(),
          refundAmount: refund.amount_money?.amount,
          updatedAt: new Date().toISOString()
        },
        $push: {
          timeline: {
            status: 'refunded',
            timestamp: new Date().toISOString(),
            message: 'Order refunded via Square',
            actor: 'square_webhook',
            refundId: refund.id
          }
        }
      }
    );
    
    logger.info('Webhook', 'Order marked as refunded', { orderId: order.id, refundId: refund.id });
  }
  
  return { success: true, message: 'Refund event processed' };
}

// ============================================================================
// INVENTORY & CATALOG HANDLERS
// ============================================================================

async function reconcileStorefrontStock(db: any, variationId: string) {
  const product = await db.collection('square_catalog_items').findOne({
    'variations.id': variationId
  });

  if (!product) return null;

  const variationIds = (product.variations || [])
    .map((v: any) => v.id)
    .filter(Boolean);

  const inventoryDocs = await db.collection('square_inventory')
    .find({
      catalogObjectId: { $in: variationIds },
      state: 'IN_STOCK',
    })
    .toArray();

  const currentStock = inventoryDocs.reduce(
    (sum: number, doc: any) => sum + Number(doc.quantity || 0),
    0
  );

  const inStock = currentStock > 0;
  const now = new Date();

  const slug = product.name
    ?.toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  // Update the inventory collection (source of truth for frontend)
  await db.collection('inventory').updateOne(
    { productId: product.id },
    {
      $set: {
        productName: product.name,
        productSlug: slug || null,
        squareId: product.id,
        variationIds,
        currentStock,
        isActive: true,
        updatedAt: now,
        lastCatalogSyncAt: now,
      },
      $setOnInsert: {
        productId: product.id,
        createdAt: now,
        source: 'square_webhook',
        lowStockThreshold: 5,
        stockHistory: [],
        lastRestocked: now,
      },
    },
    { upsert: true }
  );

  // Update unified_products (denormalized flag)
  await db.collection('unified_products').updateOne(
    { id: product.id },
    {
      $set: {
        inStock,
        updatedAt: now,
      }
    }
  );

  // Update square_catalog_items top-level
  await db.collection('square_catalog_items').updateOne(
    { id: product.id },
    {
      $set: {
        inventoryCount: currentStock,
        inStock,
        lastInventoryUpdate: now,
      }
    }
  );

  return { productId: product.id, productName: product.name, productSlug: slug, currentStock, inStock };
}

async function handleInventoryUpdate(db: any, inventoryChange: any) {
  logger.debug('Webhook', 'Processing inventory update', {
    variationId: inventoryChange.catalog_object_id,
    quantity: inventoryChange.quantity
  });
  
  await db.collection('square_inventory').replaceOne(
    {
      catalogObjectId: inventoryChange.catalog_object_id,
      locationId: inventoryChange.location_id,
      state: inventoryChange.state
    },
    {
      catalogObjectId: inventoryChange.catalog_object_id,
      locationId: inventoryChange.location_id,
      quantity: parseInt(inventoryChange.quantity || '0'),
      state: inventoryChange.state,
      updatedAt: new Date(),
      lastWebhookUpdate: new Date()
    },
    { upsert: true }
  );
  
  // Update catalog item inventory count
  await db.collection('square_catalog_items').updateOne(
    { 'variations.id': inventoryChange.catalog_object_id },
    {
      $set: {
        'variations.$.inventoryCount': parseInt(inventoryChange.quantity || '0'),
        'variations.$.lastInventoryUpdate': new Date()
      }
    }
  );

  // Reconcile storefront stock from aggregated inventory
  try {
    const result = await reconcileStorefrontStock(db, inventoryChange.catalog_object_id);
    if (result) {
      logger.info('Webhook', `📦 Storefront stock reconciled: ${result.productName} → ${result.currentStock} (inStock: ${result.inStock})`);
      
      // Also revalidate the specific product page
      if (result.productSlug) {
        revalidatePath(`/product/${result.productSlug}`);
      }
    }
  } catch (reconcileError: any) {
    logger.warn('Webhook', 'Storefront stock reconciliation failed (non-critical)', {
      error: reconcileError.message,
      variationId: inventoryChange.catalog_object_id
    });
  }

  // Revalidate storefront so inventory changes reflect instantly
  try {
    revalidatePath('/catalog');
    revalidatePath('/');
  } catch (revalError: any) {
    logger.warn('Webhook', 'Inventory revalidation failed (non-critical)', {
      error: revalError.message
    });
  }
}

async function handleCatalogUpdate(db: any, catalogObject: any) {
  const objectId = catalogObject.catalog_version?.updated_at
    ? null // catalog.version.updated has no single object ID — do full list of changed IDs
    : catalogObject.id;

  // catalog.version.updated events include updated_object_ids listing what changed
  const updatedIds: string[] = catalogObject.updated_object_ids
    || (objectId ? [objectId] : []);

  if (updatedIds.length === 0) {
    logger.warn('Webhook', 'Catalog update event with no object IDs to sync');
    return;
  }

  logger.info('Webhook', `⚡ Instant catalog sync for ${updatedIds.length} object(s)`, {
    objectIds: updatedIds.slice(0, 10)
  });

  // Sync each changed item directly from Square → MongoDB (no queue)
  const results = [];
  for (const id of updatedIds) {
    try {
      const result = await syncSingleCatalogItem(db, id);
      results.push(result);
      logger.info('Webhook', `✅ Instant synced: ${result.name || id} (${result.type || 'ITEM'})`);
    } catch (error: any) {
      logger.error('Webhook', `❌ Failed to instant-sync ${id}`, {
        error: error.message
      });
      Sentry.captureException(error, {
        tags: { webhook: true, action: 'instant_catalog_sync' },
        extra: { objectId: id }
      });
    }
  }

  // Revalidate storefront pages so changes appear instantly
  try {
    revalidatePath('/catalog');
    revalidatePath('/');
    // Revalidate individual product pages for items that were synced
    for (const r of results) {
      if (r.name && r.type !== 'CATEGORY' && r.type !== 'IMAGE' && !r.skipped) {
        const slug = r.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        revalidatePath(`/product/${slug}`);
      }
    }
    logger.info('Webhook', '🔄 Storefront pages revalidated for instant visibility');
  } catch (revalError: any) {
    logger.warn('Webhook', 'Revalidation failed (non-critical)', {
      error: revalError.message
    });
  }
}

// ============================================================================
// GET ENDPOINT - Webhook health check
// ============================================================================

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'active',
    message: 'Square webhook endpoint active',
    timestamp: new Date().toISOString(),
    environment: process.env.SQUARE_ENVIRONMENT || 'sandbox',
    webhookTypes: [
      'payment.created',
      'payment.updated',
      'payment.completed',
      'refund.created',
      'refund.updated',
      'inventory.count.updated',
      'catalog.version.updated'
    ],
    version: '2.0.0'
  });
}
