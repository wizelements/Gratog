import { NextResponse } from 'next/server';
import { orderTracking } from '@/lib/enhanced-order-tracking';
import { createLogger } from '@/lib/logger';

const logger = createLogger('OrderDetailsAPI');

export async function GET(request, { params }) {
  const startTime = Date.now();
  
  try {
    const { id } = await params; // Await params in Next.js 15+
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }
    
    logger.info('Fetching order details', { orderId: id });
    
    // Get order from database
    const order = await orderTracking.getOrder(id);
    
    if (!order) {
      logger.warn('Order not found', { orderId: id });
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }
    
    logger.info('Order retrieved successfully', { 
      orderId: id,
      duration: Date.now() - startTime 
    });
    
    return NextResponse.json({
      success: true,
      order
    });
    
  } catch (error) {
    logger.error('Failed to fetch order', { 
      error: error.message,
      stack: error.stack 
    });
    
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve order details' },
      { status: 500 }
    );
  }
}
