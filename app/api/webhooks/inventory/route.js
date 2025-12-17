import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { updateInventoryLevel, checkLowStock } from '@/lib/inventory-sync';
import { connectToDatabase } from '@/lib/db-optimized';
import { createLogger } from '@/lib/logger';

const logger = createLogger('InventoryWebhook');

/**
 * Verify Square webhook signature
 */
function verifySquareSignature(payload, signature, webhookUrl) {
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  
  if (!signatureKey) {
    logger.warn('SQUARE_WEBHOOK_SIGNATURE_KEY not configured');
    return false;
  }

  try {
    const hmac = crypto.createHmac('sha256', signatureKey);
    hmac.update(webhookUrl + payload);
    const expectedSignature = 'sha256=' + hmac.digest('base64');
    
    return crypto.timingSafeEquals(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    logger.error('Signature verification failed', { error: error.message });
    return false;
  }
}

/**
 * Handle Square inventory webhook events
 */
export async function POST(request) {
  const startTime = Date.now();
  
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-square-hmacsha256-signature');
    const webhookUrl = request.url;

    // Verify signature if key is configured
    if (process.env.SQUARE_WEBHOOK_SIGNATURE_KEY) {
      if (!signature || !verifySquareSignature(rawBody, signature, webhookUrl)) {
        logger.warn('Invalid webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    const event = JSON.parse(rawBody);
    const eventType = event.type;

    logger.info('Received inventory webhook', { 
      type: eventType, 
      eventId: event.event_id 
    });

    // Handle inventory count updated event
    if (eventType === 'inventory.count.updated') {
      const data = event.data?.object?.inventory_counts || [];
      
      for (const count of data) {
        const catalogObjectId = count.catalog_object_id;
        const quantity = parseInt(count.quantity || '0');
        const state = count.state;

        // Only process IN_STOCK state
        if (state === 'IN_STOCK') {
          await updateInventoryLevel(catalogObjectId, quantity, catalogObjectId);
          
          logger.info('Inventory updated', { 
            catalogObjectId, 
            quantity 
          });
        }
      }

      // Check for low stock alerts
      const lowStockCheck = await checkLowStock();
      if (lowStockCheck.count > 0) {
        logger.warn('Low stock items detected', { 
          count: lowStockCheck.count,
          items: lowStockCheck.items.map(i => i.name)
        });

        // Log low stock alert to database
        try {
          const { db } = await connectToDatabase();
          await db.collection('inventory_alerts').insertOne({
            type: 'low_stock',
            items: lowStockCheck.items,
            count: lowStockCheck.count,
            threshold: lowStockCheck.threshold,
            createdAt: new Date()
          });
        } catch (alertError) {
          logger.error('Failed to log inventory alert', { error: alertError.message });
        }
      }
    }

    // Log webhook event for debugging
    try {
      const { db } = await connectToDatabase();
      await db.collection('webhook_logs').insertOne({
        source: 'square',
        type: 'inventory',
        eventType,
        eventId: event.event_id,
        payload: event,
        processedAt: new Date(),
        duration: Date.now() - startTime
      });
    } catch (logError) {
      logger.error('Failed to log webhook', { error: logError.message });
    }

    return NextResponse.json({ 
      success: true,
      eventId: event.event_id,
      processed: eventType
    });

  } catch (error) {
    logger.error('Inventory webhook processing failed', { 
      error: error.message,
      stack: error.stack
    });

    return NextResponse.json(
      { error: 'Webhook processing failed', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Health check for the inventory webhook endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'inventory-webhook',
    configured: !!process.env.SQUARE_WEBHOOK_SIGNATURE_KEY,
    timestamp: new Date().toISOString()
  });
}
