import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { createLogger } from '@/lib/logger';

const logger = createLogger('OrdersByRefAPI');

/**
 * Fetch order by orderRef (orderId) - Stateless, no cookies required
 * Used by success page to retrieve order details after payment
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderRef = searchParams.get('orderRef');
    
    if (!orderRef) {
      logger.warn('Missing orderRef parameter');
      return NextResponse.json(
        { error: 'orderRef parameter is required' },
        { status: 400 }
      );
    }
    
    logger.info('Fetching order by ref', { orderRef });
    
    // Connect to database
    const { db } = await connectToDatabase();
    const ordersCollection = db.collection('orders');
    
    // Find order by ID (our orderRef IS the orderId)
    const order = await ordersCollection.findOne({ id: orderRef });
    
    if (!order) {
      logger.warn('Order not found', { orderRef });
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }
    
    logger.info('Order found', { 
      orderRef, 
      status: order.status,
      orderNumber: order.orderNumber 
    });
    
    const deliveryAddress = order.deliveryAddress || order.fulfillment?.deliveryAddress || null;
    const fulfillmentType = order.fulfillmentType || order.fulfillment?.type || 'pickup_market';
    const orderTiming = order.orderTiming || order.fulfillment?.timing || null;

    // Return order data (stateless)
    return NextResponse.json({
      orderRef: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      total: order.pricing?.total || order.total,
      customer: {
        name: order.customer?.name,
        email: order.customer?.email
      },
      items: order.items,
      pricing: order.pricing,
      square: {
        orderId: order.squareOrderId || order.payment?.squareOrderId,
        paymentId: order.squarePaymentId || order.payment?.squarePaymentId,
        receiptUrl: order.receiptUrl || order.payment?.receiptUrl
      },
      payment: order.payment,
      createdAt: order.createdAt,
      fulfillmentType,
      deliveryAddress,
      orderTiming,
      fulfillment: {
        ...(order.fulfillment || {}),
        type: fulfillmentType,
        address: deliveryAddress,
        timing: orderTiming,
      },
      squareOrderId: order.squareOrderId || order.payment?.squareOrderId,
      squarePaymentId: order.squarePaymentId || order.payment?.squarePaymentId
    });
    
  } catch (error) {
    logger.error('Error fetching order by ref', { 
      error: error.message,
      stack: error.stack 
    });
    
    return NextResponse.json(
      { error: 'Failed to fetch order details', details: error.message },
      { status: 500 }
    );
  }
}
