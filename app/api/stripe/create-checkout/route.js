import { NextResponse } from 'next/server';
import { createCheckoutSession, isStripeConfigured } from '@/lib/stripe-service';
import { connectToDatabase } from '@/lib/db-optimized';
import { createLogger } from '@/lib/logger';

const logger = createLogger('StripeCheckout');

export async function POST(request) {
  try {
    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { items, orderId, customerEmail, fulfillmentType } = body;

    // Validate input
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Cart items are required' },
        { status: 400 }
      );
    }

    // Validate each item
    for (const item of items) {
      if (!item.name || !item.price || !item.quantity) {
        return NextResponse.json(
          { error: 'Each item must have name, price, and quantity' },
          { status: 400 }
        );
      }
    }

    // Build URLs
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                    'https://tasteofgratitude.shop');
    
    const successUrl = `${baseUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/checkout?cancelled=true`;

    // Create checkout session
    const result = await createCheckoutSession(
      items,
      successUrl,
      cancelUrl,
      {
        orderId: orderId || `order_${Date.now()}`,
        customerEmail,
        fulfillmentType,
        collectShipping: fulfillmentType === 'shipping'
      }
    );

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      );
    }

    // Store pending order in database
    const { db } = await connectToDatabase();
    await db.collection('orders').insertOne({
      orderId: orderId || `order_${Date.now()}`,
      stripeSessionId: result.sessionId,
      items,
      customerEmail,
      fulfillmentType,
      paymentStatus: 'pending',
      paymentProvider: 'stripe',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    logger.info('Checkout session created', { 
      sessionId: result.sessionId,
      itemCount: items.length 
    });

    return NextResponse.json({
      success: true,
      sessionId: result.sessionId,
      url: result.url
    });
  } catch (error) {
    logger.error('Failed to create checkout session', { 
      error: error.message,
      stack: error.stack
    });

    return NextResponse.json(
      { error: 'Failed to create checkout session', message: error.message },
      { status: 500 }
    );
  }
}
