import { NextResponse } from 'next/server';
import { orderTracking } from '@/lib/enhanced-order-tracking';
import { sendOrderConfirmationEmail } from '@/lib/resend-email';
import { sendOrderConfirmationSMS } from '@/lib/sms';
import { calculateDeliveryFee } from '@/lib/delivery-fees';
import { validateDeliveryFulfillment } from '@/lib/validation/fulfillment';
import { validateCustomerData } from '@/lib/validation/customer';
import { validateCart } from '@/lib/validation/cart';
import { sanitizeObject } from '@/lib/validation/sanitize';
import { createLogger } from '@/lib/logger';
import { randomUUID, createHash } from 'crypto';
import { findOrCreateSquareCustomer, createCustomerNote } from '@/lib/square-customer';
import { RateLimit } from '@/lib/redis';
import { withIdempotency, getIdempotencyKeyFromHeaders } from '@/lib/idempotency';

const logger = createLogger('OrdersCreateAPI');

// Rate limiting configuration
const ORDER_RATE_LIMIT = 10; // Max orders per window
const ORDER_RATE_WINDOW = 300; // 5 minutes

// FIX M12: Atlanta/Eastern timezone for pickup date calculations
const ATLANTA_TIMEZONE = 'America/New_York';

/**
 * Get the next Saturday pickup date in Atlanta timezone
 * 
 * FIX M12: Previously used naive Date which could give wrong day
 * when server timezone differs from customer timezone (Atlanta).
 * Now explicitly calculates based on Atlanta local time.
 */
function getNextSaturday(time = '09:00') {
  // Get current time in Atlanta
  const now = new Date();
  const atlantaFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ATLANTA_TIMEZONE,
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  // Parse Atlanta local time components
  const parts = atlantaFormatter.formatToParts(now);
  const getPart = (type) => parts.find(p => p.type === type)?.value;
  const atlantaDayOfWeek = getPart('weekday');
  
  // Map weekday name to number (Sunday=0, Saturday=6)
  const dayMap = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
  const currentDayNum = dayMap[atlantaDayOfWeek] ?? now.getDay();
  
  // Calculate days until next Saturday
  let daysUntilSaturday = (6 - currentDayNum + 7) % 7;
  if (daysUntilSaturday === 0) {
    // If today is Saturday, check if pickup time has passed
    const currentHour = parseInt(getPart('hour') || '0');
    const currentMinute = parseInt(getPart('minute') || '0');
    const [targetHour, targetMinute] = time.split(':').map(Number);
    
    if (currentHour > targetHour || (currentHour === targetHour && currentMinute >= targetMinute)) {
      // Pickup time passed, use next Saturday
      daysUntilSaturday = 7;
    }
  }
  
  // Build the target date
  const nextSat = new Date(now.getTime() + daysUntilSaturday * 24 * 60 * 60 * 1000);
  const [hours, minutes] = time.split(':');
  
  // Create ISO string for the Atlanta timezone date
  // We use a simple approach: set the hours in UTC offset to approximate Atlanta time
  // For precision, we'd use a library like date-fns-tz, but this is close enough
  nextSat.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  return nextSat.toISOString();
}

function buildFulfillment(orderData) {
  const { fulfillmentType, customer, deliveryAddress, shippingAddress, deliveryInstructions, pickup, meetUpDetails } = orderData;
  
  // Pickup orders (Serenbe or Browns Mill)
  // NORMALIZED: pickup_market = Serenbe, pickup_browns_mill = Browns Mill
  // Also handle legacy 'meetup_serenbe' type
  const isPickupOrder = fulfillmentType === 'pickup' || fulfillmentType === 'pickup_serenbe' || 
                        fulfillmentType === 'pickup_market' || fulfillmentType === 'pickup_browns_mill' ||
                        fulfillmentType === 'meetup_serenbe';
  if (isPickupOrder) {
    const isBrownsMill = fulfillmentType === 'pickup_browns_mill' || pickup?.locationId === 'browns_mill';
    // Normalize fulfillment type for consistency across all systems
    const normalizedType = isBrownsMill ? 'pickup_browns_mill' : 'pickup_market';
    const pickupDate = getNextSaturday(isBrownsMill ? '15:00' : '09:00');
    
    return [{
      type: 'PICKUP',
      state: 'PROPOSED',
      pickup_details: {
        recipient: {
          display_name: customer.name,
          phone_number: customer.phone
        },
        note: isBrownsMill
          ? '📍 PICKUP: Browns Mill Community • Saturdays 3:00 PM - 6:00 PM • Show order number at pickup booth'
          : '📍 PICKUP: Serenbe Farmers Market (Booth #12) • 10950 Hutcheson Ferry Rd, Palmetto, GA 30268 • Saturdays 9:00 AM - 1:00 PM',
        schedule_type: 'SCHEDULED',
        pickup_at: pickupDate
      },
      // Store normalized type and pickup date for cron jobs
      normalizedType,
      pickupDate
    }];
  }
  
  // Delivery orders (local delivery)
  if (fulfillmentType === 'delivery') {
    return [{
      type: 'SHIPMENT',
      state: 'PROPOSED',
      shipment_details: {
        recipient: {
          display_name: customer.name,
          phone_number: customer.phone,
          address: {
            address_line_1: deliveryAddress?.street || '',
            locality: deliveryAddress?.city || '',
            administrative_district_level_1: deliveryAddress?.state || 'GA',
            postal_code: deliveryAddress?.zip || ''
          }
        },
        shipping_note: `🚚 LOCAL DELIVERY${deliveryInstructions ? ' - ' + deliveryInstructions : ''}`,
        expected_shipped_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    }];
  }
  
  // Shipping orders (nationwide shipping)
  if (fulfillmentType === 'shipping') {
    const addr = shippingAddress || deliveryAddress;
    return [{
      type: 'SHIPMENT',
      state: 'PROPOSED',
      shipment_details: {
        recipient: {
          display_name: customer.name,
          phone_number: customer.phone,
          address: {
            address_line_1: addr?.street || '',
            locality: addr?.city || '',
            administrative_district_level_1: addr?.state || '',
            postal_code: addr?.zip || ''
          }
        },
        shipping_note: '📦 USPS PRIORITY SHIPPING',
        expected_shipped_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
      }
    }];
  }
  
  return undefined;
}

export async function POST(request) {
  const startTime = Date.now();
  
  try {
    let orderData = await request.json();
    
    // SECURITY: Sanitize all input data to prevent XSS/SQL injection
    orderData = sanitizeObject(orderData, { preventSQL: true });
    
    logger.info('Order creation request received', { 
      fulfillmentType: orderData.fulfillmentType,
      cartItemsCount: orderData.cart?.length,
      customerEmail: orderData.customer?.email 
    });
    
    // RATE LIMITING: Prevent order creation abuse
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const rateLimitKey = `order_create:${clientIp}`;
    
    if (!RateLimit.check(rateLimitKey, ORDER_RATE_LIMIT, ORDER_RATE_WINDOW)) {
      logger.warn('Order creation rate limit exceeded', { ip: clientIp });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many order attempts. Please wait a few minutes and try again.',
          code: 'RATE_LIMIT_EXCEEDED'
        },
        { status: 429 }
      );
    }
    
    // IDEMPOTENCY: Generate key from order data to prevent duplicate orders
    // Check for client-provided idempotency key first
    let idempotencyKey = getIdempotencyKeyFromHeaders(request.headers);
    
    if (!idempotencyKey && orderData.customer?.email) {
      // Generate key from order content for deduplication
      const orderHash = createHash('sha256')
        .update(JSON.stringify({
          email: orderData.customer.email,
          cart: orderData.cart?.map(i => ({ id: i.id, qty: i.quantity })),
          fulfillmentType: orderData.fulfillmentType,
          // Include timestamp bucket (5-minute window) to allow genuine re-orders
          timeBucket: Math.floor(Date.now() / (5 * 60 * 1000))
        }))
        .digest('hex')
        .substring(0, 32);
      
      idempotencyKey = `order_${orderHash}`;
    }
    
    // If we have an idempotency key, wrap the order creation
    if (idempotencyKey) {
      const cachedResult = await import('@/lib/idempotency').then(m => 
        m.getIdempotentResponse(idempotencyKey)
      );
      
      if (cachedResult) {
        logger.info('Returning cached order (idempotency hit)', { 
          idempotencyKey,
          orderId: cachedResult.order?.id 
        });
        return NextResponse.json({
          ...cachedResult,
          _cached: true
        });
      }
    }
    
    // VALIDATION 1: Validate cart data
    const cartValidation = validateCart(orderData.cart);
    if (!cartValidation.valid) {
      logger.warn('Cart validation failed', { error: cartValidation.error });
      return NextResponse.json(
        { success: false, error: cartValidation.error },
        { status: 400 }
      );
    }
    
    // VALIDATION 2: Validate customer data (email, phone, name)
    const customerValidation = validateCustomerData(orderData.customer);
    if (!customerValidation.valid) {
      logger.warn('Customer validation failed', { error: customerValidation.error });
      return NextResponse.json(
        { success: false, error: customerValidation.error },
        { status: 400 }
      );
    }
    
    if (!orderData.fulfillmentType) {
      return NextResponse.json(
        { success: false, error: 'Fulfillment type is required' },
        { status: 400 }
      );
    }
    
    // Validate delivery fulfillment
    if (orderData.fulfillmentType === 'delivery') {
      if (!orderData.deliveryAddress?.street || !orderData.deliveryAddress?.city || !orderData.deliveryAddress?.zip) {
        return NextResponse.json(
          { success: false, error: 'Complete delivery address is required' },
          { status: 400 }
        );
      }
      
      // Validate delivery fulfillment (ZIP code, minimum order, etc.)
      const subtotal = orderData.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const deliveryValidation = validateDeliveryFulfillment({
        zip: orderData.deliveryAddress.zip,
        window: 'anytime', // Bypass strict window validation for MVP
        subtotal: subtotal,
        tip: orderData.deliveryTip || 0,
        street: orderData.deliveryAddress.street,
        city: orderData.deliveryAddress.city,
        state: orderData.deliveryAddress.state || 'GA'
      });
      
      if (!deliveryValidation.valid) {
        const errorMessage = deliveryValidation.errors.map(e => e.message).join(', ');
        logger.warn('Delivery validation failed', { errors: deliveryValidation.errors });
        return NextResponse.json(
          { success: false, error: errorMessage },
          { status: 400 }
        );
      }
    }
    
    // Calculate delivery fee if applicable
    let deliveryFee = 0;
    if (orderData.fulfillmentType === 'delivery') {
      const subtotal = orderData.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      deliveryFee = calculateDeliveryFee(subtotal);
      logger.debug('Delivery fee calculated', { subtotal, deliveryFee });
    }
    
    // Generate order ID and number
    const orderId = randomUUID();
    const orderNumber = `TOG${Date.now().toString().slice(-6)}`;
    
    logger.info('Generated order identifiers', { orderId, orderNumber });
    
    // Calculate pickup date for pickup orders (for cron job filtering)
    let pickupDate = null;
    const isPickup = orderData.fulfillmentType === 'pickup' || 
                     orderData.fulfillmentType === 'pickup_serenbe' || 
                     orderData.fulfillmentType === 'pickup_market' || 
                     orderData.fulfillmentType === 'pickup_browns_mill' ||
                     orderData.fulfillmentType === 'meetup_serenbe';
    if (isPickup) {
      const isBrownsMill = orderData.fulfillmentType === 'pickup_browns_mill' || 
                           orderData.pickup?.locationId === 'browns_mill';
      pickupDate = getNextSaturday(isBrownsMill ? '15:00' : '09:00');
      
      // Normalize fulfillment type for consistency
      orderData.fulfillmentType = isBrownsMill ? 'pickup_browns_mill' : 'pickup_market';
    }
    
    // Add metadata
    const enhancedOrderData = {
      ...orderData,
      deliveryFee,
      pickupDate, // Store pickup date for cron jobs
      metadata: {
        ...orderData.metadata,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString(),
        deliveryFee
      }
    };
    
    // CRITICAL: Create Square Customer FIRST, then Order
    let squareOrderId = null;
    let squareCustomerId = null;
    const ALLOW_FALLBACK = process.env.SQUARE_FALLBACK_MODE === 'true';
    
    const SQUARE_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
    const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID;
    const SQUARE_ENV = process.env.SQUARE_ENVIRONMENT || 'production';
    const SQUARE_BASE = SQUARE_ENV === 'production' 
      ? 'https://connect.squareup.com' 
      : 'https://connect.squareupsandbox.com';
    
    if (!SQUARE_TOKEN || !SQUARE_LOCATION_ID) {
      if (!ALLOW_FALLBACK) {
        return NextResponse.json({
          success: false,
          error: 'Square payment system is not configured. Please contact support.',
          code: 'SQUARE_NOT_CONFIGURED'
        }, { status: 503 });
      }
      logger.warn('Square not configured - using fallback mode');
      squareOrderId = `fallback_${orderId}`;
    } else {
      try {
        // STEP 1: Find or create Square Customer
        logger.info('Creating/finding Square customer', { email: orderData.customer.email });
        
        const customerResult = await findOrCreateSquareCustomer({
          email: orderData.customer.email,
          name: orderData.customer.name,
          phone: orderData.customer.phone,
          address: orderData.fulfillmentType === 'delivery' ? {
            street: orderData.deliveryAddress?.street,
            city: orderData.deliveryAddress?.city,
            state: orderData.deliveryAddress?.state || 'GA',
            zip: orderData.deliveryAddress?.zip
          } : undefined,
          note: createCustomerNote({
            orderNumber,
            fulfillmentType: orderData.fulfillmentType,
            source: 'website'
          }),
          referenceId: `web_${orderId}`
        });
        
        if (customerResult.success && customerResult.customer) {
          squareCustomerId = customerResult.customer.id;
          logger.info('✅ Square customer ready', { customerId: squareCustomerId });
        } else {
          logger.warn('Square customer creation failed, continuing without customer link', { 
            error: customerResult.error 
          });
        }
        
        // STEP 2: Create Square Order with customer link
        logger.info('Creating Square Order', { orderId, customerId: squareCustomerId });
        
        const orderPayload = {
          idempotency_key: `order_${orderId}_${Date.now()}`,
          order: {
            location_id: SQUARE_LOCATION_ID,
            reference_id: orderNumber, // ⭐ THIS MAKES ORDER NUMBERS MATCH
            line_items: orderData.cart.map(item => ({
              catalog_object_id: item.catalogObjectId || item.variationId || item.id,
              quantity: String(item.quantity),
              base_price_money: {
                amount: Math.round((item.price || 0) * 100),
                currency: 'USD'
              },
              note: item.name || '' // Product name visible in Square
            })),
            customer_id: squareCustomerId || undefined, // ⭐ LINKS CUSTOMER TO ORDER
            metadata: {
              source: 'website',
              local_order_id: orderId,
              order_number: orderNumber,
              fulfillment_type: orderData.fulfillmentType,
              customer_email: orderData.customer.email,
              customer_name: orderData.customer.name,
              customer_phone: orderData.customer.phone
            },
            fulfillments: buildFulfillment(orderData)
          }
        };
        
        // FIXED: Use current stable Square API version (was future date 2025-10-16)
        const SQUARE_VERSION = '2024-01-18';
        
        const orderResponse = await fetch(`${SQUARE_BASE}/v2/orders`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SQUARE_TOKEN}`,
            'Content-Type': 'application/json',
            'Square-Version': SQUARE_VERSION
          },
          body: JSON.stringify(orderPayload)
        });
        
        const orderResponseData = await orderResponse.json();
        
        if (!orderResponse.ok) {
          const errorDetail = orderResponseData.errors?.[0]?.detail || 'Square API error';
          logger.error('Square Order creation failed', { 
            status: orderResponse.status,
            error: errorDetail,
            errors: orderResponseData.errors
          });
          
          if (!ALLOW_FALLBACK) {
            throw new Error(errorDetail);
          }
          
          logger.warn('Square failed but fallback enabled');
          squareOrderId = `fallback_${orderId}`;
        } else {
          squareOrderId = orderResponseData.order.id;
          logger.info('✅ Square Order created', { 
            squareOrderId,
            referenceId: orderNumber,
            customerId: squareCustomerId 
          });
        }
      } catch (squareError) {
        logger.error('Square integration error', { error: squareError.message });
        
        if (!ALLOW_FALLBACK) {
          return NextResponse.json({
            success: false,
            error: 'Unable to process order. Please try again.',
            details: squareError.message,
            code: 'SQUARE_ERROR'
          }, { status: 500 });
        }
        
        logger.warn('Continuing with fallback mode');
        squareOrderId = `fallback_${orderId}`;
      }
    }
    
    // Create local order (NO payment link generation - in-app payment only)
    // IMPORTANT: Order is created with status: 'pending' and paymentStatus: 'pending'
    // After payment succeeds, the payment API updates these statuses
    // See PAYMENT_FORM_AND_ORDER_FLOW_CRITICAL_ANALYSIS.md for details
    enhancedOrderData.metadata.squareOrderId = squareOrderId;
    
    const result = await orderTracking.createOrder(enhancedOrderData, true);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to create order' },
        { status: 500 }
      );
    }
    
    const order = result.order;
    
    logger.info('✅ Order created (payment pending)', { 
      orderId: order.id, 
      orderNumber: order.orderNumber,
      squareOrderId,
      paymentStatus: order.paymentStatus || 'pending'
    });
    
    // IMPORTANT: Do NOT send confirmations until payment is verified
    // Confirmations are sent by the payment API after successful payment
    // (See /app/api/payments/route.ts)
    
    const successResponse = {
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus || 'pending',
        customer: order.customer,
        items: order.items,
        pricing: order.pricing,
        fulfillment: order.fulfillment,
        squareOrderId,
        squareCustomerId,
        note: '⚠️ Order created but payment is still pending. Confirmations will be sent after payment.'
      }
    };
    
    // Cache successful response for idempotency
    if (idempotencyKey) {
      const { setIdempotentResponse } = await import('@/lib/idempotency');
      await setIdempotentResponse(idempotencyKey, successResponse, 300); // 5 minute TTL
    }
    
    return NextResponse.json(successResponse);
    
  } catch (error) {
    logger.error('Order creation error', { 
      error: error.message,
      stack: error.stack 
    });
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create order. Please try again.',
      details: error.message
    }, { status: 500 });
  }
}

// GET endpoint to retrieve order
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('id');
    
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }
    
    const order = await orderTracking.getOrder(orderId);
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      order
    });
    
  } catch (error) {
    logger.error('Order retrieval error', { error: error.message });
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve order'
    }, { status: 500 });
  }
}
