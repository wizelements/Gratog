const DEBUG = process.env.DEBUG === "true";
const debug = (...args) => { if (DEBUG) debug(...args); };

import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID;
const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT || 'sandbox';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

// Square API endpoints
const SQUARE_API_BASE = SQUARE_ENVIRONMENT === 'production'
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com';

export async function POST(request) {
  try {
    const body = await request.json();
    const { orderId, items, customer, total, subtotal } = body;

    if (!SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) {
      return NextResponse.json(
        { error: 'Square credentials not configured' },
        { status: 500 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'No items provided' },
        { status: 400 }
      );
    }

    // Build line items for Square
    const lineItems = items.map((item) => ({
      name: item.name,
      quantity: item.quantity.toString(),
      base_price_money: {
        amount: Math.round(item.price * 100), // Convert to cents
        currency: 'USD'
      },
      note: item.description || ''
    }));

    // Create checkout request
    const checkoutData = {
      idempotency_key: randomUUID(),
      order: {
        location_id: SQUARE_LOCATION_ID,
        line_items: lineItems,
        customer_id: customer?.squareCustomerId || undefined,
        reference_id: orderId,
        metadata: {
          order_id: orderId,
          customer_email: customer?.email || '',
          customer_name: customer?.name || ''
        }
      },
      checkout_options: {
        redirect_url: `${BASE_URL}/order/success?orderId=${orderId}`,
        ask_for_shipping_address: false,
        enable_coupon: false,
        enable_loyalty: false,
        accepted_payment_methods: {
          apple_pay: true,
          google_pay: true,
          cash_app_pay: true,
          afterpay_clearpay: false
        }
      },
      pre_populate_buyer_email: customer?.email || undefined,
      merchant_support_email: process.env.SENDGRID_FROM_EMAIL || 'hello@tasteofgratitude.com'
    };

    debug('Creating Square checkout session:', {
      orderId,
      items: lineItems.length,
      total: total,
      locationId: SQUARE_LOCATION_ID
    });

    // Call Square Checkout API
    const response = await fetch(`${SQUARE_API_BASE}/v2/online-checkout/payment-links`, {
      method: 'POST',
      headers: {
        'Square-Version': '2024-10-17',
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(checkoutData)
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Square checkout creation failed:', responseData);
      return NextResponse.json(
        { 
          error: 'Failed to create checkout session',
          details: responseData.errors || responseData
        },
        { status: response.status }
      );
    }

    const paymentLink = responseData.payment_link;
    
    debug('✅ Square checkout created:', {
      id: paymentLink.id,
      url: paymentLink.url,
      orderId: orderId
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: paymentLink.url,
      paymentLinkId: paymentLink.id,
      orderId: orderId,
      expiresAt: paymentLink.created_at
    });

  } catch (error) {
    console.error('Square checkout error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    message: 'Square Checkout API',
    configured: !!(SQUARE_ACCESS_TOKEN && SQUARE_LOCATION_ID),
    environment: SQUARE_ENVIRONMENT,
    locationId: SQUARE_LOCATION_ID ? '✓' : '✗'
  });
}
