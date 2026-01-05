/**
 * @deprecated This webhook handler is DEPRECATED. 
 * Use /api/webhooks/square instead.
 * 
 * TODO: Remove this file after confirming Square Dashboard 
 * only has /api/webhooks/square registered.
 * 
 * Migration steps:
 * 1. Go to Square Developer Dashboard → Webhooks
 * 2. Update webhook URL from /api/square-webhook to /api/webhooks/square
 * 3. Delete this file after 30 days of successful operation
 */

import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { updateOrderStatus } from '@/lib/db-customers';
import { sendOrderUpdateSMS } from '@/lib/sms';
import { sendOrderUpdateEmail } from '@/lib/email';
import * as Sentry from '@sentry/nextjs';

// Get webhook signature key from environment
const SQUARE_WEBHOOK_SIGNATURE_KEY = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

/**
 * SECURITY: Webhook signature verification
 * CRITICAL: Never skip verification in any production-like environment
 * 
 * @deprecated Use /api/webhooks/square instead
 */
function verifyWebhookSignature(signatureHeader, requestUrl, requestBody) {
  if (!SQUARE_WEBHOOK_SIGNATURE_KEY) {
    logger.error('Webhook', 'SQUARE_WEBHOOK_SIGNATURE_KEY not configured - rejecting all webhooks');
    return false;
  }
  
  if (!signatureHeader) {
    logger.warn('Webhook', 'Missing signature header');
    return false;
  }
  
  try {
    const [signatureKeyVersion, signature] = signatureHeader.split(',');
    if (!signatureKeyVersion || !signature) {
      logger.warn('Webhook', 'Invalid signature header format');
      return false;
    }
    
    const squareSignature = signature.split('=')[1];
    if (!squareSignature) {
      logger.warn('Webhook', 'Could not extract signature from header');
      return false;
    }
    
    // Create HMAC using the signature key
    const hmac = crypto.createHmac('sha256', SQUARE_WEBHOOK_SIGNATURE_KEY);
    
    // Update with the request URL and body
    hmac.update(requestUrl);
    hmac.update(requestBody);
    
    // Get the calculated signature
    const calculatedSignature = hmac.digest('base64');
    
    // Compare signatures securely using timing-safe comparison
    try {
      return crypto.timingSafeEqual(
        Buffer.from(calculatedSignature),
        Buffer.from(squareSignature)
      );
    } catch (compareError) {
      // Buffers have different lengths - invalid signature
      logger.warn('Webhook', 'Signature length mismatch');
      return false;
    }
  } catch (error) {
    logger.error('Webhook', 'Webhook signature verification error:', error);
    return false;
  }
}

export async function POST(request) {
  const startTime = Date.now();
  let eventType = 'unknown';
  
  try {
    logger.debug('Webhook', 'Square webhook received');
    
    // Get the raw request body for signature verification
    const requestBody = await request.text();
    const requestUrl = request.url;
    
    // Get the Square-Signature header
    const signatureHeader = request.headers.get('square-signature');
    
    /**
     * SECURITY FIX: Always verify signature except with explicit opt-out
     * 
     * The only way to skip verification is:
     * 1. NODE_ENV is 'development' (local dev)
     * 2. AND SQUARE_SKIP_WEBHOOK_VERIFICATION is 'true'
     * 3. AND we're NOT on Vercel (VERCEL env var not set)
     * 
     * This prevents accidental bypass in staging/production
     */
    const isLocalDevelopment = 
      process.env.NODE_ENV === 'development' && 
      !process.env.VERCEL;
    
    const skipVerification = 
      isLocalDevelopment && 
      process.env.SQUARE_SKIP_WEBHOOK_VERIFICATION === 'true';
    
    if (!skipVerification) {
      const isSignatureValid = verifyWebhookSignature(
        signatureHeader,
        requestUrl,
        requestBody
      );
      
      if (!isSignatureValid) {
        logger.error('Webhook', 'Invalid webhook signature - rejecting request', {
          hasSignatureHeader: !!signatureHeader,
          hasSignatureKey: !!SQUARE_WEBHOOK_SIGNATURE_KEY,
        });
        
        // Track attempted security bypass
        Sentry.captureMessage('Invalid webhook signature attempted', {
          level: 'warning',
          tags: { security: 'webhook_signature_invalid' },
          extra: { 
            hasHeader: !!signatureHeader,
            requestUrl: requestUrl?.substring(0, 100) 
          }
        });
        
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    } else {
      logger.warn('Webhook', '⚠️ Signature verification SKIPPED (local development only)');
    }
    
    // Parse the webhook event
    let webhookEvent;
    try {
      webhookEvent = JSON.parse(requestBody);
    } catch (parseError) {
      logger.error('Webhook', 'Failed to parse webhook body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }
    
    eventType = webhookEvent.type || 'unknown';
    logger.debug('Webhook', 'Processing webhook event:', eventType);
    
    /**
     * CRITICAL FIX: Handlers now throw on failure instead of swallowing errors
     * This ensures Square receives 500 and retries the webhook
     */
    switch (eventType) {
      case 'payment.created':
        await handlePaymentCreated(webhookEvent.data?.object?.payment);
        break;
        
      case 'payment.updated':
        await handlePaymentUpdated(webhookEvent.data?.object?.payment);
        break;
        
      case 'payment.completed':
        await handlePaymentCompleted(webhookEvent.data?.object?.payment);
        break;
        
      case 'payment.failed':
        await handlePaymentFailed(webhookEvent.data?.object?.payment);
        break;
        
      case 'refund.created':
        await handleRefundCreated(webhookEvent.data?.object?.refund);
        break;
        
      default:
        logger.debug('Webhook', `Unhandled webhook event type: ${eventType}`);
    }
    
    const duration = Date.now() - startTime;
    logger.debug('Webhook', `Webhook processed successfully in ${duration}ms`, { eventType });
    
    // Return success response
    return NextResponse.json({ 
      received: true,
      eventType: eventType,
      processingTimeMs: duration,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Webhook', '❌ Webhook processing FAILED - Square will retry', { 
      eventType,
      error: error.message,
      duration 
    });
    
    // Capture in Sentry for monitoring
    Sentry.captureException(error, {
      tags: { 
        webhook: true,
        eventType 
      },
      extra: { duration }
    });
    
    /**
     * CRITICAL FIX: Return 500 so Square retries the webhook
     * Previously returned 200 which caused Square to mark as delivered
     * even when processing failed
     */
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        message: 'Internal error - will be retried',
        // Never expose error details in production
        ...(process.env.NODE_ENV === 'development' && { debug: error.message })
      },
      { status: 500 }
    );
  }
}

/**
 * Handler functions for Square webhook events
 * 
 * CRITICAL: These handlers now THROW on failure instead of catching and swallowing
 * This ensures the main handler returns 500 and Square retries
 */

async function handlePaymentCreated(payment) {
  logger.debug('Webhook', 'Payment created:', payment?.id);
  
  // Validate payment data - throw if invalid
  if (!payment || !payment.id) {
    throw new Error('Invalid payment data received in payment.created webhook');
  }
  
  // Update order status to payment_processing
  if (payment.order_id) {
    await updateOrderStatus(payment.order_id, 'payment_processing', {
      paymentId: payment.id,
      status: payment.status,
      updatedAt: new Date().toISOString()
    });
    logger.debug('Webhook', `Order ${payment.order_id} status updated to payment_processing`);
  } else {
    logger.debug('Webhook', 'Payment created without order_id:', payment.id);
  }
}

async function handlePaymentUpdated(payment) {
  logger.debug('Webhook', 'Payment updated:', payment?.id, 'Status:', payment?.status);
  
  if (!payment || !payment.id) {
    throw new Error('Invalid payment data received in payment.updated webhook');
  }
  
  if (payment.order_id) {
    const statusMap = {
      'COMPLETED': 'paid',
      'APPROVED': 'paid', 
      'PENDING': 'payment_processing',
      'CANCELED': 'payment_failed',
      'FAILED': 'payment_failed'
    };
    
    const newOrderStatus = statusMap[payment.status] || 'payment_processing';
    
    await updateOrderStatus(payment.order_id, newOrderStatus, {
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount_money?.amount,
      currency: payment.amount_money?.currency,
      updatedAt: new Date().toISOString()
    });
    
    logger.debug('Webhook', `Order ${payment.order_id} status updated to ${newOrderStatus}`);
  }
}

async function handlePaymentCompleted(payment) {
  logger.debug('Webhook', 'Payment completed successfully:', payment?.id);
  
  if (!payment || !payment.id) {
    throw new Error('Invalid payment data received in payment.completed webhook');
  }
  
  if (payment.order_id) {
    // Update order to paid status
    await updateOrderStatus(payment.order_id, 'paid', {
      paymentId: payment.id,
      status: 'COMPLETED',
      amount: payment.amount_money?.amount,
      currency: payment.amount_money?.currency,
      completedAt: new Date().toISOString()
    });
    
    logger.debug('Webhook', `Payment completed for order ${payment.order_id}`);
  }
}

async function handlePaymentFailed(payment) {
  logger.debug('Webhook', 'Payment failed:', payment?.id);
  
  if (!payment || !payment.id) {
    throw new Error('Invalid payment data received in payment.failed webhook');
  }
  
  if (payment.order_id) {
    await updateOrderStatus(payment.order_id, 'payment_failed', {
      paymentId: payment.id,
      status: 'FAILED',
      failureReason: payment.processing_fee?.[0]?.type || 'Unknown',
      failedAt: new Date().toISOString()
    });
    
    logger.debug('Webhook', `Order ${payment.order_id} marked as payment failed`);
  }
}

async function handleRefundCreated(refund) {
  logger.debug('Webhook', 'Refund created:', refund?.id);
  
  if (!refund || !refund.id) {
    throw new Error('Invalid refund data received in refund.created webhook');
  }
  
  if (refund.payment_id) {
    // You could update order status to 'refunded' or handle partial refunds
    logger.debug('Webhook', `Refund created for payment ${refund.payment_id}`);
  }
}

// Handle GET requests for webhook verification (Square webhook setup)
export async function GET(request) {
  return NextResponse.json({
    message: 'Square webhook endpoint active',
    timestamp: new Date().toISOString(),
    signatureKeyConfigured: !!SQUARE_WEBHOOK_SIGNATURE_KEY,
    environment: process.env.NODE_ENV || 'development'
  });
}
