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
import { randomUUID } from 'crypto';
import { findOrCreateSquareCustomer, createCustomerNote } from '@/lib/square-customer';

const logger = createLogger('OrdersCreateAPI');

function getNextSaturday(time = '09:00') {
  const now = new Date();
  const daysUntilSaturday = (6 - now.getDay() + 7) % 7 || 7;
  const nextSat = new Date(now.getTime() + daysUntilSaturday * 24 * 60 * 60 * 1000);
  const [hours, minutes] = time.split(':');
  nextSat.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  return nextSat.toISOString();
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
    
    // Add metadata
    const enhancedOrderData = {
      ...orderData,
      deliveryFee,
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
            fulfillments: orderData.fulfillmentType.startsWith('pickup') ? [{
              type: 'PICKUP',
              state: 'PROPOSED',
              pickup_details: {
                recipient: {
                  display_name: orderData.customer.name,
                  phone_number: orderData.customer.phone
                },
                note: orderData.fulfillmentType === 'pickup_browns_mill'
                  ? '📍 PICKUP: Browns Mill Community • Saturdays 3:00 PM - 6:00 PM • Show order number at pickup booth'
                  : '📍 PICKUP: Serenbe Farmers Market (Booth #12) • 10950 Hutcheson Ferry Rd, Palmetto, GA 30268 • Saturdays 9:00 AM - 1:00 PM • Look for gold Taste of Gratitude banners',
                schedule_type: 'SCHEDULED',
                pickup_at: getNextSaturday(orderData.fulfillmentType === 'pickup_browns_mill' ? '15:00' : '09:00')
              }
            }] : orderData.fulfillmentType === 'delivery' ? [{
              type: 'SHIPMENT',
              state: 'PROPOSED',
              shipment_details: {
                recipient: {
                  display_name: orderData.customer.name,
                  phone_number: orderData.customer.phone,
                  address: {
                    address_line_1: orderData.deliveryAddress?.street || '',
                    locality: orderData.deliveryAddress?.city || '',
                    administrative_district_level_1: orderData.deliveryAddress?.state || 'GA',
                    postal_code: orderData.deliveryAddress?.zip || ''
                  }
                },
                shipping_note: orderData.deliveryInstructions || '',
                expected_shipped_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
              }
            }] : undefined
          }
        };
        
        const orderResponse = await fetch(`${SQUARE_BASE}/v2/orders`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SQUARE_TOKEN}`,
            'Content-Type': 'application/json',
            'Square-Version': '2025-10-16'
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
    enhancedOrderData.metadata.squareOrderId = squareOrderId;
    
    const result = await orderTracking.createOrder(enhancedOrderData, true);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to create order' },
        { status: 500 }
      );
    }
    
    const order = result.order;
    
    logger.info('✅ Order created', { 
      orderId: order.id, 
      orderNumber: order.orderNumber,
      squareOrderId
    });
    
    // Send confirmations
    try {
      await sendOrderConfirmationEmail(order);
      logger.info('Email sent', { orderId: order.id });
    } catch (emailError) {
      logger.warn('Email failed', { error: emailError.message });
    }
    
    try {
      await sendOrderConfirmationSMS(order);
      logger.info('SMS sent', { orderId: order.id });
    } catch (smsError) {
      logger.warn('SMS failed', { error: smsError.message });
    }
    
    // Send staff notification for pickup orders
    if (order.fulfillmentType === 'pickup_market' || order.fulfillmentType === 'pickup_browns_mill') {
      try {
        const { notifyStaffPickupOrder } = await import('@/lib/staff-notifications');
        await notifyStaffPickupOrder(order);
        logger.info('Staff notification sent', { orderId: order.id });
      } catch (staffError) {
        logger.warn('Staff notification failed', { error: staffError.message });
      }
    }
    
    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        customer: order.customer,
        items: order.items,
        pricing: order.pricing,
        fulfillment: order.fulfillment, // ⭐ Include fulfillment data for tests
        paymentLink: order.paymentLink, // ⭐ Include payment link if exists
        squareOrderId,
        squareCustomerId // ⭐ Return customer ID for frontend use
      }
    });
    
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
