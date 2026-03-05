
import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { z } from 'zod'

// Environment variables
const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID
const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT || 'sandbox'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL
const FEATURE_CHECKOUT_V2 = process.env.FEATURE_CHECKOUT_V2 || 'on'

// Square API endpoints
const SQUARE_API_BASE = SQUARE_ENVIRONMENT === 'production'
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com'

// Consistent Square API version across all endpoints
const SQUARE_VERSION = '2024-01-18'

// Helper to validate Square catalog IDs (20+ char alphanumeric)
const isValidSquareCatalogId = (id?: string): boolean => {
  return !!id && typeof id === 'string' && id.length >= 20 && /^[A-Z0-9]+$/i.test(id)
}

// Validation schema
const CartItemSchema = z.object({
  productId: z.string(),
  slug: z.string(),
  name: z.string(),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
  image: z.string().optional(),
  catalogObjectId: z.string().optional(),
  category: z.string().optional(),
})

const CheckoutRequestSchema = z.object({
  items: z.array(CartItemSchema).min(1, 'Cart must contain at least one item'),
  contact: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
  }).optional(),
  fulfillment: z.object({
    type: z.enum(['pickup', 'shipping', 'delivery']),
    address: z.any().optional(),
    pickupLocation: z.string().optional(),
    pickupDate: z.string().optional(),
  }).optional(),
})

export async function POST(request: NextRequest) {
  const traceId = randomUUID();
  const json = (payload: Record<string, unknown>, status = 200) =>
    NextResponse.json({ ...payload, traceId }, { status });

  try {
    // Check feature flag
    if (FEATURE_CHECKOUT_V2 === 'off') {
      return json({ error: 'Checkout is temporarily unavailable' }, 503)
    }

    // Validate environment variables
    if (!SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) {
      console.error('Square credentials not configured')
      return json({ error: 'Payment system not configured. Please contact support.' }, 500)
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = CheckoutRequestSchema.safeParse(body)

    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error.format())
      return json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.flatten().fieldErrors
        },
        400
      )
    }

    const { items, contact, fulfillment } = validationResult.data

    // Generate order ID
    const orderId = `TOG-${Date.now()}-${randomUUID().substring(0, 8)}`

    // Build line items for Square with proper structure
    const lineItems = items.map((item) => {
      const lineItem: any = {
        name: item.name,
        quantity: item.quantity.toString(),
        base_price_money: {
          amount: Math.round(item.price * 100), // Convert to cents
          currency: 'USD'
        },
      }

      // CRITICAL FIX: Only add catalog_object_id if it's a valid Square ID
      // Invalid IDs cause "catalog object not found" errors
      if (isValidSquareCatalogId(item.catalogObjectId)) {
        lineItem.catalog_object_id = item.catalogObjectId
      }

      // Add item URL for reference
      if (item.slug) {
        lineItem.note = `Product: ${item.slug}`
      }

      return lineItem
    })

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)

    // Create checkout request for Square Payment Links API
    const checkoutData = {
      idempotency_key: randomUUID(),
      order: {
        location_id: SQUARE_LOCATION_ID,
        line_items: lineItems,
        reference_id: orderId,
        metadata: {
          order_id: orderId,
          customer_email: contact?.email || '',
          customer_name: contact?.name || '',
          fulfillment_type: fulfillment?.type || 'pickup',
          source: 'web_checkout_v2',
        }
      },
      checkout_options: {
        redirect_url: `${BASE_URL}/order/success?orderId=${orderId}`,
        ask_for_shipping_address: fulfillment?.type === 'shipping',
        enable_coupon: false,
        enable_loyalty: false,
        accepted_payment_methods: {
          apple_pay: true,
          google_pay: true,
          cash_app_pay: true,
          afterpay_clearpay: false
        }
      },
      pre_populate_buyer_email: contact?.email || undefined,
      merchant_support_email: process.env.SENDGRID_FROM_EMAIL || 'hello@tasteofgratitude.shop'
    }

    logger.debug('API', 'Creating Square checkout session:', {
      orderId,
      itemCount: lineItems.length,
      subtotal: subtotal.toFixed(2),
      locationId: SQUARE_LOCATION_ID,
      environment: SQUARE_ENVIRONMENT,
      hasCatalogIds: items.some(i => i.catalogObjectId)
    })

    // Call Square Payment Links API
    const response = await fetch(`${SQUARE_API_BASE}/v2/online-checkout/payment-links`, {
      method: 'POST',
      headers: {
        'Square-Version': SQUARE_VERSION,
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(checkoutData)
    })

    const responseData = await response.json()

    if (!response.ok) {
      console.error('Square checkout creation failed:', {
        status: response.status,
        errors: responseData.errors,
        data: responseData
      })
      return json(
        { 
          error: 'Failed to create checkout session',
          details: responseData.errors || responseData,
          message: responseData.errors?.[0]?.detail || 'Please try again or contact support.'
        },
        response.status
      )
    }

    const paymentLink = responseData.payment_link
    
    if (!paymentLink || !paymentLink.url) {
      console.error('Invalid Square response - missing payment link')
      return json({ error: 'Invalid response from payment system' }, 500)
    }

    logger.debug('API', '✅ Square checkout created successfully:', {
      paymentLinkId: paymentLink.id,
      orderId,
      url: paymentLink.url
    })

    // Emit analytics event
    console.info('checkout_success', {
      items: items.length,
      total: subtotal,
      orderId
    })

    return json({
      success: true,
      checkoutUrl: paymentLink.url,
      paymentLinkId: paymentLink.id,
      orderId,
      expiresAt: paymentLink.created_at
    })

  } catch (error: any) {
    console.error('Checkout API error:', error)
    console.error('checkout_error', { error: error.message })
    
    return json(
      { 
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again.'
      },
      500
    )
  }
}

// GET endpoint for health check
export async function GET() {
  const traceId = randomUUID();
  return NextResponse.json({
    service: 'Square Checkout API v2',
    configured: !!(SQUARE_ACCESS_TOKEN && SQUARE_LOCATION_ID),
    featureFlag: FEATURE_CHECKOUT_V2,
    timestamp: new Date().toISOString(),
    traceId
  })
}
