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
    console.warn('Missing signature header or webhook signature key');
    return false;
  }
  
  try {
    // Parse Square signature format: "v1,signature"
    const parts = signatureHeader.split(',');
    if (parts.length !== 2) {
      console.error('Invalid signature format');
      return false;
    }
    
    const [version, signature] = parts;
    const [versionKey, versionValue] = version.split('=');
    const [signatureKey, signatureValue] = signature.split('=');
    
    if (versionKey !== 'v' || signatureKey !== 't') {
      console.error('Invalid signature header format');
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
    console.error('Webhook signature verification error:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Square webhook received');
    
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
        console.error('Invalid webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }
    
    // Parse the webhook event
    const webhookEvent = JSON.parse(requestBody);
    console.log('Webhook event received:', {
      type: webhookEvent.type,
      eventId: webhookEvent.event_id,
      timestamp: webhookEvent.created_at
    });
    
    // Process different event types
    const eventType = webhookEvent.type;
    const eventData = webhookEvent.data;
    
    // FIX: Proper event data structure handling
    if (!eventData || !eventData.object) {
      console.error('Invalid webhook event structure - missing data.object');
      return NextResponse.json(
        { error: 'Invalid event structure' },
        { status: 400 }
      );
    }
    
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
        console.log(`Unhandled webhook event type: ${eventType}`);
    }
    
    // Log webhook for debugging
    await logWebhookEvent(webhookEvent);
    
    return NextResponse.json({
      received: true,
      eventType,
      eventId: webhookEvent.event_id,
      processedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Handle inventory count updates
async function handleInventoryUpdate(inventoryChange: any) {
  console.log('Processing inventory update:', {
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
    
    console.log('Inventory updated successfully');
    
  } catch (error) {
    console.error('Failed to update inventory:', error);
    throw error;
  }
}

// Handle catalog version updates - FIX: Proper object structure handling
async function handleCatalogUpdate(catalogObject: any) {
  console.log('Processing catalog update:', {
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
    
    console.log('Catalog sync queued for object:', catalogObject.id);
    
    // Optionally process immediately for critical updates
    if (catalogObject.type === 'ITEM' || catalogObject.type === 'ITEM_VARIATION') {
      console.log('High priority catalog update - consider immediate sync');
    }
    
  } catch (error) {
    console.error('Failed to handle catalog update:', error);
    throw error;
  }
}

// Handle payment events
async function handlePaymentCreated(payment: any) {
  console.log('Payment created:', payment.id);
  
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
    console.error('Failed to handle payment created:', error);
  }
}

async function handlePaymentUpdated(payment: any) {
  console.log('Payment updated:', payment.id, 'Status:', payment.status);
  
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
    
    if (payment.order_id) {
      await db.collection('orders').updateOne(
        { squareOrderId: payment.order_id },
        {
          $set: {
            paymentStatus: payment.status,
            status: orderStatus,
            squarePaymentId: payment.id,
            updatedAt: new Date(),
            ...(payment.status === 'COMPLETED' && { paidAt: new Date() })
          },
          $push: {
            timeline: {
              status: orderStatus,
              timestamp: new Date(),
              message: `Payment ${payment.status.toLowerCase()}`,
              squarePaymentId: payment.id
            }
          }
        }
      );
      
      console.log(`Order ${payment.order_id} status updated to ${orderStatus}`);
    }
    
  } catch (error) {
    console.error('Failed to handle payment updated:', error);
  }
}

// Handle order events
async function handleOrderCreated(order: any) {
  console.log('Order created in Square:', order.id);
  // Handle order creation if needed
}

async function handleOrderUpdated(order: any) {
  console.log('Order updated in Square:', order.id);
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
    console.warn('Failed to log webhook event:', error);
    // Don't fail the webhook processing if logging fails
  }
}

// GET endpoint for webhook verification
export async function GET(request: NextRequest) {
  return NextResponse.json({
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
