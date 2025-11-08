import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { updateOrderStatus } from '@/lib/db-customers';
import { sendOrderUpdateSMS } from '@/lib/sms';
import { sendOrderUpdateEmail } from '@/lib/email';

// Get webhook signature key from environment
const SQUARE_WEBHOOK_SIGNATURE_KEY = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

// Verify webhook signature for security
function verifyWebhookSignature(signatureHeader, requestUrl, requestBody) {
  if (!signatureHeader || !SQUARE_WEBHOOK_SIGNATURE_KEY) {
    console.log('Missing signature header or webhook key');
    return false;
  }
  
  try {
    const [signatureKeyVersion, signature] = signatureHeader.split(',');
    const version = signatureKeyVersion.split('=')[1];
    const squareSignature = signature.split('=')[1];
    
    // Create HMAC using the signature key
    const hmac = crypto.createHmac('sha256', SQUARE_WEBHOOK_SIGNATURE_KEY);
    
    // Update with the request URL and body
    hmac.update(requestUrl);
    hmac.update(requestBody);
    
    // Get the calculated signature
    const calculatedSignature = hmac.digest('base64');
    
    // Compare signatures securely
    return crypto.timingSafeEqual(
      Buffer.from(calculatedSignature),
      Buffer.from(squareSignature)
    );
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
}

export async function POST(request) {
  try {
    console.log('Square webhook received');
    
    // Get the raw request body for signature verification
    const requestBody = await request.text();
    const requestUrl = request.url;
    
    // Get the Square-Signature header
    const signatureHeader = request.headers.get('square-signature');
    
    // Verify the webhook signature (skip in development)
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (!isDevelopment) {
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
    console.log('Webhook event type:', webhookEvent.type);
    
    // Process different event types
    const eventType = webhookEvent.type;
    
    switch (eventType) {
      case 'payment.created':
        await handlePaymentCreated(webhookEvent.data.object.payment);
        break;
        
      case 'payment.updated':
        await handlePaymentUpdated(webhookEvent.data.object.payment);
        break;
        
      case 'payment.completed':
        await handlePaymentCompleted(webhookEvent.data.object.payment);
        break;
        
      case 'payment.failed':
        await handlePaymentFailed(webhookEvent.data.object.payment);
        break;
        
      case 'refund.created':
        await handleRefundCreated(webhookEvent.data.object.refund);
        break;
        
      default:
        console.log(`Unhandled webhook event type: ${eventType}`);
    }
    
    // Return success response
    return NextResponse.json({ 
      received: true,
      eventType: eventType,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...(error.cause && { cause: error.cause })
    });
    
    
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// Handler functions for different Square webhook events

async function handlePaymentCreated(payment) {
  console.log('Payment created:', payment?.id);
  
  try {
    // Validate payment data
    if (!payment || !payment.id) {
      console.error('Invalid payment data received:', payment);
      return;
    }
    
    // Update order status to payment_processing
    if (payment.order_id) {
      await updateOrderStatus(payment.order_id, 'payment_processing', {
        paymentId: payment.id,
        status: payment.status,
        updatedAt: new Date().toISOString()
      });
      console.log(`Order ${payment.order_id} status updated to payment_processing`);
    } else {
      console.log('Payment created without order_id:', payment.id);
    }
  } catch (error) {
    console.error('❌ Error handling payment created:', error);
    console.error('Payment data:', payment);
  }
}

async function handlePaymentUpdated(payment) {
  console.log('Payment updated:', payment.id, 'Status:', payment.status);
  
  try {
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
      
      console.log(`Order ${payment.order_id} status updated to ${newOrderStatus}`);
    }
  } catch (error) {
    console.error('Error handling payment updated:', error);
  }
}

async function handlePaymentCompleted(payment) {
  console.log('Payment completed successfully:', payment.id);
  
  try {
    if (payment.order_id) {
      // Update order to paid status
      await updateOrderStatus(payment.order_id, 'paid', {
        paymentId: payment.id,
        status: 'COMPLETED',
        amount: payment.amount_money?.amount,
        currency: payment.amount_money?.currency,
        completedAt: new Date().toISOString()
      });
      
      // Send success notifications
      // Note: You would need order details to send notifications
      console.log(`Payment completed for order ${payment.order_id}`);
    }
  } catch (error) {
    console.error('Error handling payment completed:', error);
  }
}

async function handlePaymentFailed(payment) {
  console.log('Payment failed:', payment.id);
  
  try {
    if (payment.order_id) {
      await updateOrderStatus(payment.order_id, 'payment_failed', {
        paymentId: payment.id,
        status: 'FAILED',
        failureReason: payment.processing_fee?.[0]?.type || 'Unknown',
        failedAt: new Date().toISOString()
      });
      
      console.log(`Order ${payment.order_id} marked as payment failed`);
    }
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}

async function handleRefundCreated(refund) {
  console.log('Refund created:', refund.id);
  
  try {
    if (refund.payment_id) {
      // You could update order status to 'refunded' or handle partial refunds
      console.log(`Refund created for payment ${refund.payment_id}`);
    }
  } catch (error) {
    console.error('Error handling refund created:', error);
  }
}

// Handle GET requests for webhook verification (Square webhook setup)
export async function GET(request) {
  return NextResponse.json({
    message: 'Square webhook endpoint active',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
}