import { NextResponse } from 'next/server';
import { orderTracking } from '@/lib/enhanced-order-tracking';
import { sendOrderConfirmationEmail } from '@/lib/email';
import { sendOrderConfirmationSMS } from '@/lib/sms';

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
    
    // Add request metadata
    const enhancedOrderData = {
      ...orderData,
      metadata: {
        ...orderData.metadata,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
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