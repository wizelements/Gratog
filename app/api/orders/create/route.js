import { NextResponse } from 'next/server';
import { orderTracking } from '@/lib/enhanced-order-tracking';
import { sendOrderConfirmationEmail } from '@/lib/resend-email';
import { sendOrderConfirmationSMS } from '@/lib/sms';
import { calculateDeliveryFee } from '@/lib/delivery-fees';

export async function POST(request) {
  try {
    const orderData = await request.json();
    
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
      // Check if delivery is enabled
      if (process.env.NEXT_PUBLIC_FULFILLMENT_DELIVERY !== 'enabled') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Home Delivery is temporarily unavailable',
            message: 'Home Delivery is temporarily unavailable. Please choose Pickup or Shipping.',
            code: 'FULFILLMENT_METHOD_UNAVAILABLE'
          },
          { status: 409 }
        );
      }
      
      // Validate delivery address
      if (!orderData.deliveryAddress?.street || !orderData.deliveryAddress?.city || !orderData.deliveryAddress?.zip) {
        return NextResponse.json(
          { success: false, error: 'Complete delivery address is required' },
          { status: 400 }
        );
      }
      
      // Validate ZIP code
      const zipWhitelist = (process.env.DELIVERY_ZIP_WHITELIST || '').split(',').map(z => z.trim());
      const cleanZip = orderData.deliveryAddress.zip.replace(/\D/g, '').slice(0, 5);
      
      if (!zipWhitelist.includes(cleanZip)) {
        return NextResponse.json(
          { 
            success: false, 
            error: "We're not in your area yet. Try Pickup or Shipping, or use a different address.",
            code: 'DELIVERY_AREA_UNAVAILABLE'
          },
          { status: 400 }
        );
      }
      
      // Validate minimum order
      const subtotal = orderData.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const minSubtotal = parseFloat(process.env.DELIVERY_MIN_SUBTOTAL || '30');
      
      if (subtotal < minSubtotal) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Minimum order for delivery is $${minSubtotal.toFixed(2)}`,
            code: 'DELIVERY_MINIMUM_NOT_MET'
          },
          { status: 400 }
        );
      }
      
      // Validate delivery window
      if (!orderData.deliveryTimeSlot) {
        return NextResponse.json(
          { success: false, error: 'Delivery time window is required' },
          { status: 400 }
        );
      }
      
      // Validate tip if provided
      if (orderData.deliveryTip !== undefined && orderData.deliveryTip !== null) {
        const tip = parseFloat(orderData.deliveryTip);
        if (isNaN(tip) || tip < 0 || tip > 100) {
          return NextResponse.json(
            { success: false, error: 'Invalid tip amount' },
            { status: 400 }
          );
        }
      }
    }
    
    // Validate fulfillment-specific requirements
    if (orderData.fulfillmentType === 'pickup_market') {
      if (!orderData.pickupMarket) {
        return NextResponse.json(
          { success: false, error: 'Pickup market selection is required' },
          { status: 400 }
        );
      }
      if (!orderData.pickupDate) {
        return NextResponse.json(
          { success: false, error: 'Pickup date is required' },
          { status: 400 }
        );
      }
    }
    
    if (orderData.fulfillmentType === 'shipping') {
      if (!orderData.deliveryAddress || !orderData.deliveryAddress.street || !orderData.deliveryAddress.city || !orderData.deliveryAddress.zip) {
        return NextResponse.json(
          { success: false, error: 'Complete shipping address is required' },
          { status: 400 }
        );
      }
    }
    
    // Calculate delivery fee if applicable
    let deliveryFee = 0;
    if (orderData.fulfillmentType === 'delivery') {
      const subtotal = orderData.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      deliveryFee = calculateDeliveryFee(subtotal);
      console.log(`Delivery fee calculated: $${deliveryFee} for subtotal $${subtotal}`);
    }
    
    // Add request metadata and delivery fee
    const enhancedOrderData = {
      ...orderData,
      deliveryFee, // Add calculated delivery fee
      metadata: {
        ...orderData.metadata,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString(),
        deliveryFee // Also store in metadata for tracking
      }
    };
    
    // Create order using enhanced tracking system
    const result = await orderTracking.createOrder(enhancedOrderData, true);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to create order' },
        { status: 500 }
      );
    }
    
    const order = result.order;
    
    // Send confirmations (don't let failures block the order creation)
    try {
      // Send email confirmation
      await sendOrderConfirmationEmail(order);
      console.log('Order confirmation email sent');
    } catch (emailError) {
      console.warn('Failed to send confirmation email:', emailError);
    }
    
    try {
      // Send SMS confirmation
      await sendOrderConfirmationSMS(order);
      console.log('Order confirmation SMS sent');
    } catch (smsError) {
      console.warn('Failed to send confirmation SMS:', smsError);
    }
    
    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        statusLabel: order.statusLabel,
        customer: order.customer,
        items: order.items,
        fulfillment: order.fulfillment,
        pricing: order.pricing,
        timeline: order.timeline,
        createdAt: order.createdAt
      },
      isFallback: result.isFallback,
      message: result.message || 'Order created successfully'
    });
    
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve order
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('id');
    const email = searchParams.get('email');
    
    if (orderId) {
      // Get specific order
      const result = await orderTracking.getOrder(orderId, true);
      
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: 'Order not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        order: result.order,
        isFallback: result.isFallback,
        message: result.isFallback ? 'Order retrieved from offline storage' : 'Order retrieved successfully'
      });
      
    } else if (email) {
      // Get customer orders
      const result = await orderTracking.getCustomerOrders(email, true);
      
      return NextResponse.json({
        success: true,
        orders: result.orders || [],
        isFallback: result.isFallback,
        message: result.isFallback ? 'Orders retrieved from offline storage' : 'Orders retrieved successfully'
      });
      
    } else {
      return NextResponse.json(
        { success: false, error: 'Order ID or customer email is required' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Get order error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve order' },
      { status: 500 }
    );
  }
}

// PUT endpoint to update order status
export async function PUT(request) {
  try {
    const { orderId, status, metadata = {} } = await request.json();
    
    if (!orderId || !status) {
      return NextResponse.json(
        { success: false, error: 'Order ID and status are required' },
        { status: 400 }
      );
    }
    
    // Update order status
    const result = await orderTracking.updateOrderStatus(orderId, status, metadata, true);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to update order' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      order: result.order,
      isFallback: result.isFallback,
      message: result.message || 'Order status updated successfully'
    });
    
  } catch (error) {
    console.error('Update order error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update order' },
      { status: 500 }
    );
  }
}