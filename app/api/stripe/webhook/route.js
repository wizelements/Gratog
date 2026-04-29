export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { handleWebhookEvent } from '@/lib/stripe-service';
import { connectToDatabase } from '@/lib/db-optimized';
import { createLogger } from '@/lib/logger';

const logger = createLogger('StripeWebhook');

export async function POST(request) {
  const startTime = Date.now();

  try {
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');

    // Verify and parse webhook event
    let event;
    try {
      event = await handleWebhookEvent(rawBody, signature);
    } catch (error) {
      logger.error('Webhook verification failed', { error: error.message });
      return NextResponse.json(
        { error: 'Webhook verification failed' },
        { status: 400 }
      );
    }

    logger.info('Stripe webhook received', { type: event.type, id: event.id });

    const { db } = await connectToDatabase();

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        
        // Update order status
        await db.collection('orders').updateOne(
          { stripePaymentIntentId: paymentIntent.id },
          {
            $set: {
              paymentStatus: 'paid',
              paidAt: new Date(),
              updatedAt: new Date()
            }
          }
        );

        logger.info('Payment succeeded', { 
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount 
        });
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        
        await db.collection('orders').updateOne(
          { stripePaymentIntentId: paymentIntent.id },
          {
            $set: {
              paymentStatus: 'failed',
              paymentError: paymentIntent.last_payment_error?.message,
              updatedAt: new Date()
            }
          }
        );

        logger.warn('Payment failed', { 
          paymentIntentId: paymentIntent.id,
          error: paymentIntent.last_payment_error?.message
        });
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object;
        
        // Update order from checkout session
        await db.collection('orders').updateOne(
          { stripeSessionId: session.id },
          {
            $set: {
              paymentStatus: 'paid',
              stripePaymentIntentId: session.payment_intent,
              customerEmail: session.customer_details?.email,
              paidAt: new Date(),
              updatedAt: new Date()
            }
          }
        );

        logger.info('Checkout session completed', { 
          sessionId: session.id,
          paymentIntent: session.payment_intent 
        });
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        
        await db.collection('orders').updateOne(
          { stripePaymentIntentId: charge.payment_intent },
          {
            $set: {
              paymentStatus: 'refunded',
              refundedAt: new Date(),
              refundAmount: charge.amount_refunded,
              updatedAt: new Date()
            }
          }
        );

        logger.info('Charge refunded', { 
          chargeId: charge.id,
          amount: charge.amount_refunded 
        });
        break;
      }

      default:
        logger.info('Unhandled event type', { type: event.type });
    }

    // Log webhook event
    await db.collection('webhook_logs').insertOne({
      source: 'stripe',
      type: event.type,
      eventId: event.id,
      payload: event,
      processedAt: new Date(),
      duration: Date.now() - startTime
    });

    return NextResponse.json({ received: true, eventId: event.id });
  } catch (error) {
    logger.error('Webhook processing failed', { 
      error: error.message,
      stack: error.stack
    });

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// ISS-027 FIX: Don't leak configuration state
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
