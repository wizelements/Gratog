import { NextResponse } from 'next/server';
import { orderTracking } from '@/lib/enhanced-order-tracking';
import { sendOrderStatusEmail } from '@/lib/resend-email';
import { sendOrderUpdateSMS } from '@/lib/sms';
import { createLogger } from '@/lib/logger';
import { requireAdmin } from '@/lib/admin-session';
import { connectToDatabase } from '@/lib/db-optimized';
import { restockInventoryForCancelledOrder } from '@/lib/custom-inventory';

const logger = createLogger('OrderStatusUpdateAPI');

export async function POST(request) {
  try {
    const admin = await requireAdmin(request);
    
    const { orderId, status } = await request.json();
    
    if (!orderId || !status) {
      return NextResponse.json(
        { success: false, error: 'orderId and status are required' },
        { status: 400 }
      );
    }
    
    logger.info('Updating order status', { orderId, status, adminEmail: admin.email });
    
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
    
    const orderLookup = await orderTracking.getOrder(orderId);
    const order = orderLookup?.order || orderLookup;

    if (!order?.id) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const previousStatus = order.status;
    
    const result = await orderTracking.updateOrderStatus(orderId, status);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to update status' },
        { status: 500 }
      );
    }
    
    const updatedOrder = result.order;
    
    logger.info('Order status updated', { orderId, oldStatus: previousStatus, newStatus: status });

    // Restock on cancellation only if the order had already been paid.
    if (status === 'cancelled' && (order.paymentStatus === 'paid' || order.status === 'paid')) {
      try {
        const { db } = await connectToDatabase();
        const restockResult = await restockInventoryForCancelledOrder(db, {
          orderId,
          orderNumber: order.orderNumber,
          items: order.items || [],
          actor: admin.email,
        });

        logger.info('Order cancellation restock complete', {
          orderId,
          restocked: restockResult.restocked,
          skipped: restockResult.skipped,
        });
      } catch (restockError) {
        logger.error('Order cancellation restock failed', {
          orderId,
          error: restockError.message,
        });
      }
    }
    
    // Send automated notifications using new system
    try {
      const { notifyOrderStatusChange } = await import('@/lib/order-status-notifier');
      const { notifyStaffStatusChange } = await import('@/lib/staff-notifications');
      
      // Notify customer
      await notifyOrderStatusChange(updatedOrder, previousStatus, status);
      logger.info('Customer notifications sent', { orderId, status });
      
      // Notify staff
      await notifyStaffStatusChange(updatedOrder, previousStatus, status);
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
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }
    logger.error('Update status error', { error: error.message, stack: error.stack });
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update order status',
      details: error.message
    }, { status: 500 });
  }
}
