import { NextResponse } from 'next/server';
import { orderTracking } from '@/lib/enhanced-order-tracking';
import { sendOrderStatusEmail } from '@/lib/resend-email';
import { sendOrderUpdateSMS } from '@/lib/sms';
import { createLogger } from '@/lib/logger';

const logger = createLogger('OrderStatusUpdateAPI');

export async function POST(request) {
  try {
    const { orderId, status, adminKey } = await request.json();
    
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'dev-admin-key-taste-of-gratitude-2024';
    if (adminKey !== ADMIN_SECRET) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (!orderId || !status) {
      return NextResponse.json(
        { success: false, error: 'orderId and status are required' },
        { status: 400 }
      );
    }
    
    logger.info('Updating order status', { orderId, status });
    
    const validStatuses = [
      'pending',
      'confirmed', 
      'preparing',
      'ready_for_pickup',
      'out_for_delivery',
      'delivered',
      'picked_up',
      'cancelled'
    ];
    
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Valid: ${validStatuses.join(', ')}` },
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
    
    const result = await orderTracking.updateOrderStatus(orderId, status);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to update status' },
        { status: 500 }
      );
    }
    
    const updatedOrder = result.order;
    
    logger.info('Order status updated', { orderId, oldStatus: order.status, newStatus: status });
    
    // Send automated notifications using new system
    try {
      const { notifyOrderStatusChange } = await import('@/lib/order-status-notifier');
      const { notifyStaffStatusChange } = await import('@/lib/staff-notifications');
      
      // Notify customer
      await notifyOrderStatusChange(updatedOrder, order.status, status);
      logger.info('Customer notifications sent', { orderId, status });
      
      // Notify staff
      await notifyStaffStatusChange(updatedOrder, order.status, status);
      logger.info('Staff notifications sent', { orderId, status });
      
    } catch (notificationError) {
      logger.warn('Notification error', { error: notificationError.message });
    }
    
    const notificationStatuses = ['confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'picked_up'];
    
    return NextResponse.json({
      success: true,
      order: updatedOrder,
      notificationsSent: notificationStatuses.includes(status)
    });
    
  } catch (error) {
    logger.error('Update status error', { error: error.message, stack: error.stack });
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update order status',
      details: error.message
    }, { status: 500 });
  }
}
