import { NextResponse } from 'next/server';
import { orderTracking } from '@/lib/enhanced-order-tracking';
import { sendOrderConfirmationEmail } from '@/lib/resend-email';
import { sendOrderConfirmationSMS } from '@/lib/sms';
import { calculateDeliveryFee } from '@/lib/delivery-fees';
import { validateDeliveryFulfillment } from '@/lib/validation/fulfillment';
import { createLogger } from '@/lib/logger';
import { randomUUID } from 'crypto';

const logger = createLogger('OrdersCreateAPI');

export async function POST(request) {
  const startTime = Date.now();
  
  try {
    const orderData = await request.json();
    
    logger.info('Order creation request received', { 
      fulfillmentType: orderData.fulfillmentType,
      cartItemsCount: orderData.cart?.length,
      customerEmail: orderData.customer?.email 
    });
    
    // Validate required fields
    if (!orderData.cart || !Array.isArray(orderData.cart) || orderData.cart.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cart items are required' },
        { status: 400 }
      );
    }
    
    if (!orderData.customer?.email || !orderData.customer?.name || !orderData.customer?.phone) {
      return NextResponse.json(
        { success: false, error: 'Customer information (email, name, phone) is required' },
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
    
    // CRITICAL: Create Square Order FIRST
    let squareOrderId = null;
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
        logger.info('Creating Square Order', { orderId });
        
        // Step 1: Create Square Order
        const orderPayload = {
          idempotency_key: `order_${orderId}_${Date.now()}`,
          order: {
            location_id: SQUARE_LOCATION_ID,
            line_items: orderData.cart.map(item => ({
              catalog_object_id: item.catalogObjectId || item.variationId || item.id,
              quantity: String(item.quantity),
              base_price_money: {
                amount: Math.round((item.price || 0) * 100),
                currency: 'USD'
              }
            })),
            metadata: {
              source: 'website',
              local_order_id: orderId,
              order_number: orderNumber,
              fulfillment_type: orderData.fulfillmentType,
              customer_email: orderData.customer.email
            }
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
            error: errorDetail
          });
          
          if (!ALLOW_FALLBACK) {
            throw new Error(errorDetail);
          }
          
          logger.warn('Square failed but fallback enabled');
          squareOrderId = `fallback_${orderId}`;
        } else {
          squareOrderId = orderResponseData.order.id;
          logger.info('✅ Square Order created', { squareOrderId });
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
    
    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        customer: order.customer,
        items: order.items,
        pricing: order.pricing,
        squareOrderId
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
