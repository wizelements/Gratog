import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase } from '@/lib/db-optimized';
import { SQUARE_WEBHOOK_SIGNATURE_KEY } from '@/lib/square';

// Force Node.js runtime for crypto operations and raw body access
export const runtime = 'nodejs';

/**
 * Square Webhooks Handler
 * Handles inventory updates and catalog changes for real-time synchronization
 */

// Verify webhook signature for security
function verifyWebhookSignature(signatureHeader: string, requestUrl: string, requestBody: string): boolean {
  if (!signatureHeader || !SQUARE_WEBHOOK_SIGNATURE_KEY) {
    logger.warn('Webhook', 'Missing signature header or webhook signature key');
    return false;
  }
  
  try {
    // Parse Square signature format: "v1,signature"
    const parts = signatureHeader.split(',');
    if (parts.length !== 2) {
      logger.error('Webhook', 'Invalid signature format');
      return false;
    }
    
    const [version, signature] = parts;
    const [versionKey, versionValue] = version.split('=');
    const [signatureKey, signatureValue] = signature.split('=');
    
    if (versionKey !== 'v' || signatureKey !== 't') {
      logger.error('Webhook', 'Invalid signature header format');
      return false;
    }
    
    // Create the string to sign: URL + request body
    const stringToSign = requestUrl + requestBody;
    
    // Calculate HMAC
    const hmac = crypto.createHmac('sha256', SQUARE_WEBHOOK_SIGNATURE_KEY);
    hmac.update(stringToSign);
    const calculatedSignature = hmac.digest('base64');
    
    // Compare signatures securely
    return crypto.timingSafeEqual(
      Buffer.from(calculatedSignature),
      Buffer.from(signatureValue)
    );
  } catch (error) {
    logger.error('Webhook', 'Webhook signature verification error:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    logger.debug('Webhook', 'Square webhook received');
    
    // Get the raw request body and URL
    const requestBody = await request.text();
    const requestUrl = request.url;
    
    // Get the Square-Signature header
    const signatureHeader = request.headers.get('Square-Signature');
    
    // Verify webhook signature in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (!isDevelopment && signatureHeader) {
      const isSignatureValid = verifyWebhookSignature(
        signatureHeader,
        requestUrl,
        requestBody
      );
      
      if (!isSignatureValid) {
        logger.error('Webhook', 'Invalid webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }
    
    // Parse the webhook event
    const webhookEvent = JSON.parse(requestBody);
    const eventId = webhookEvent.id || webhookEvent.event_id;
    const eventType = webhookEvent.type;
    const eventData = webhookEvent.data;
    
    logger.debug('Webhook', 'Webhook event received:', {
      type: eventType,
      eventId,
      timestamp: webhookEvent.created_at
    });
    
    // FIX: Proper event data structure handling
    if (!eventData || !eventData.object) {
      logger.error('Webhook', 'Invalid webhook event structure - missing data.object');
      return NextResponse.json(
        { error: 'Invalid event structure' },
        { status: 400 }
      );
    }
    
    // CRITICAL: Webhook event deduplication - prevent double-processing
    // Square may retry webhook delivery if we don't respond quickly
    let isAlreadyProcessed = false;
    try {
      const { db } = await connectToDatabase();
      
      // Check if we've already processed this event
      const processed = await db.collection('webhook_events_processed')
        .findOne({ eventId });
      
      if (processed) {
        logger.debug('Webhook', 'Event already processed (idempotent return)', { eventId, eventType });
        isAlreadyProcessed = true;
      }
    } catch (dbErr) {
      logger.warn('Webhook', 'Failed to check webhook dedup (continuing anyway)', dbErr);
      // Continue processing even if dedup check fails - better to process twice than lose event
    }
    
    // If already processed, return success immediately (idempotent)
    if (isAlreadyProcessed) {
      return NextResponse.json({
        received: true,
        eventType,
        eventId,
        processedAt: new Date().toISOString(),
        cached: true
      });
    }
    
    // Process the event (only once per eventId)
    try {
      switch (eventType) {
        case 'inventory.count.updated':
          await handleInventoryUpdate(eventData.object);
          break;
          
        case 'catalog.version.updated':
          await handleCatalogUpdate(eventData.object);
          break;
          
        case 'payment.created':
          await handlePaymentCreated(eventData.object.payment || eventData.object);
          break;
          
        case 'payment.updated':
          await handlePaymentUpdated(eventData.object.payment || eventData.object);
          break;
          
        case 'order.created':
          await handleOrderCreated(eventData.object.order || eventData.object);
          break;
          
        case 'order.updated':
          await handleOrderUpdated(eventData.object.order || eventData.object);
          break;
          
        default:
          logger.debug('Webhook', `Unhandled webhook event type: ${eventType}`);
      }
      
      // Mark as successfully processed (idempotency)
      try {
        const { db } = await connectToDatabase();
        await db.collection('webhook_events_processed')
          .insertOne({
            eventId,
            eventType,
            processedAt: new Date(),
            status: 'success'
          }, { writeConcern: { w: 1 } });
        logger.debug('Webhook', 'Event marked as processed', { eventId, eventType });
      } catch (dbErr) {
        logger.warn('Webhook', 'Failed to record webhook processing (non-critical)', dbErr);
        // Don't fail the response if we can't record processing
      }
      
    } catch (eventError) {
      logger.error('Webhook', 'Error processing webhook event', {
        eventId,
        eventType,
        error: eventError instanceof Error ? eventError.message : String(eventError)
      });
      // Still mark as processed even if there was an error
      // This prevents infinite retry loops
      try {
        const { db } = await connectToDatabase();
        await db.collection('webhook_events_processed')
          .insertOne({
            eventId,
            eventType,
            processedAt: new Date(),
            status: 'error',
            error: eventError instanceof Error ? eventError.message : String(eventError)
          }, { writeConcern: { w: 1 } });
      } catch (dbErr) {
        logger.warn('Webhook', 'Failed to record webhook error', dbErr);
      }
    }
    
    // Log webhook for debugging
    await logWebhookEvent(webhookEvent);
    
    return NextResponse.json({
      received: true,
      eventType,
      eventId,
      processedAt: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Webhook', 'Webhook processing error:', { error: (error as Error).message, stack: (error as Error).stack });
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Handle inventory count updates
async function handleInventoryUpdate(inventoryChange: any) {
  logger.debug('Webhook', 'Processing inventory update:', {
    variationId: inventoryChange.catalog_object_id,
    locationId: inventoryChange.location_id,
    quantity: inventoryChange.quantity,
    state: inventoryChange.state
  });
  
  try {
    const { db } = await connectToDatabase();
    
    // Update inventory in our local cache/database
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
    
    // Update the catalog item's inventory count
    await db.collection('square_catalog_items').updateOne(
      { 'variations.id': inventoryChange.catalog_object_id },
      {
        $set: {
          'variations.$.inventoryCount': parseInt(inventoryChange.quantity || '0'),
          'variations.$.lastInventoryUpdate': new Date()
        }
      }
    );
    
    logger.debug('Webhook', 'Inventory updated successfully');
    
  } catch (error) {
    logger.error('Webhook', 'Failed to update inventory:', error);
    throw error;
  }
}

// Handle catalog version updates - FIX: Proper object structure handling
async function handleCatalogUpdate(catalogObject: any) {
  logger.debug('Webhook', 'Processing catalog update:', {
    objectType: catalogObject.type || 'unknown',
    objectId: catalogObject.id || 'unknown',
    version: catalogObject.version || 'unknown',
    updatedAt: catalogObject.updated_at
  });
  
  try {
    const { db } = await connectToDatabase();
    
    // Mark for resync
    await db.collection('square_sync_queue').insertOne({
      objectId: catalogObject.id || 'unknown',
      objectType: catalogObject.type || 'UNKNOWN',
      version: catalogObject.version,
      catalogObject: catalogObject, // Store full object for processing
      action: 'sync_object',
      status: 'pending',
      createdAt: new Date(),
      attempts: 0
    });
    
    logger.debug('Webhook', 'Catalog sync queued for object:', catalogObject.id);
    
    // Optionally process immediately for critical updates
    if (catalogObject.type === 'ITEM' || catalogObject.type === 'ITEM_VARIATION') {
      logger.debug('Webhook', 'High priority catalog update - consider immediate sync');
    }
    
  } catch (error) {
    logger.error('Webhook', 'Failed to handle catalog update:', error);
    throw error;
  }
}

// Handle payment events
async function handlePaymentCreated(payment: any) {
  logger.debug('Webhook', 'Payment created:', payment.id);
  
  try {
    const { db } = await connectToDatabase();
    
    // Update order status if order ID is available
    if (payment.order_id) {
      await db.collection('orders').updateOne(
        { squareOrderId: payment.order_id },
        {
          $set: {
            paymentStatus: 'created',
            squarePaymentId: payment.id,
            updatedAt: new Date()
          },
          $push: {
            timeline: {
              status: 'payment_created',
              timestamp: new Date(),
              message: 'Payment created in Square',
              squarePaymentId: payment.id
            }
          }
        }
      );
    }
    
  } catch (error) {
    logger.error('Webhook', 'Failed to handle payment created:', error);
  }
}

async function handlePaymentUpdated(payment: any) {
  logger.debug('Webhook', 'Payment updated:', payment.id, 'Status:', payment.status);
  
  try {
    const { db } = await connectToDatabase();
    
    // Map Square payment status to our order status
    const statusMap: Record<string, string> = {
      'COMPLETED': 'paid',
      'APPROVED': 'paid',
      'PENDING': 'payment_processing',
      'CANCELED': 'payment_failed',
      'FAILED': 'payment_failed'
    };
    
    const orderStatus = statusMap[payment.status] || 'payment_processing';
    const paymentInternalStatus = payment.status === 'COMPLETED' || payment.status === 'APPROVED' ? 'completed' : 
                                   payment.status === 'PENDING' ? 'processing' : 'failed';
    
    if (payment.order_id) {
      await db.collection('orders').updateOne(
        { squareOrderId: payment.order_id },
        {
          $set: {
            status: orderStatus, // Update main order status
            paymentStatus: payment.status, // Square payment status
            squarePaymentId: payment.id,
            'payment.status': paymentInternalStatus, // Update nested payment object
            'payment.squarePaymentId': payment.id,
            'payment.receiptUrl': payment.receipt_url,
            'payment.receiptNumber': payment.receipt_number,
            'payment.cardBrand': payment.card_details?.card?.card_brand,
            'payment.cardLast4': payment.card_details?.card?.last_4,
            updatedAt: new Date(),
            ...(payment.status === 'COMPLETED' && { paidAt: new Date() })
          },
          $push: {
            timeline: {
              status: orderStatus,
              timestamp: new Date(),
              message: `Payment ${payment.status.toLowerCase()} via webhook`,
              actor: 'square_webhook',
              squarePaymentId: payment.id
            }
          }
        }
      );
      
      logger.debug('Webhook', `Order ${payment.order_id} status updated to ${orderStatus} via webhook`);
    }
    
  } catch (error) {
    logger.error('Webhook', 'Failed to handle payment updated:', error);
  }
}

// Handle order events
async function handleOrderCreated(order: any) {
  logger.debug('Webhook', 'Order created in Square:', order.id);
  // Handle order creation if needed
}

async function handleOrderUpdated(order: any) {
  logger.debug('Webhook', 'Order updated in Square:', order.id);
  // Handle order updates if needed
}

// Log webhook events for debugging and audit
async function logWebhookEvent(event: any) {
  try {
    const { db } = await connectToDatabase();
    
    await db.collection('webhook_logs').insertOne({
      eventId: event.event_id,
      type: event.type,
      data: event.data,
      createdAt: new Date(event.created_at),
      processedAt: new Date(),
      source: 'square'
    });
    
    // Clean up old logs (keep last 1000)
    await db.collection('webhook_logs')
      .deleteMany({
        _id: {
          $in: await db.collection('webhook_logs')
            .find({}, { projection: { _id: 1 } })
            .sort({ createdAt: -1 })
            .skip(1000)
            .toArray()
            .then((docs: any[]) => docs.map(doc => doc._id))
        }
      });
      
  } catch (error) {
    logger.warn('Webhook', 'Failed to log webhook event:', error);
    // Don't fail the webhook processing if logging fails
  }
}

// GET endpoint for webhook verification
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'active',
    message: 'Square webhook endpoint active',
    timestamp: new Date().toISOString(),
    environment: process.env.SQUARE_ENVIRONMENT || 'sandbox',
    webhookTypes: [
      'inventory.count.updated',
      'catalog.version.updated',
      'payment.created',
      'payment.updated',
      'order.created',
      'order.updated'
    ]
  });
}
