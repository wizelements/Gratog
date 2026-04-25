import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import MarketOrder from '@/models/MarketOrder';
import { sendOrderReady } from '@/lib/sms';

export const runtime = 'nodejs';

/**
 * GET /api/orders/[orderNumber]/status
 * Get order status for customer tracking
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orderNumber: string } }
) {
  try {
    const { orderNumber } = params;
    
    await connectToDatabase();
    
    const order = await MarketOrder.findOne({ orderNumber });
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Calculate queue position
    const today = new Date().toISOString().split('T')[0];
    const activeStatuses = ['CONFIRMED', 'PREPARING', 'READY'];
    const activeOrders = await MarketOrder.find({
      marketId: order.marketId,
      status: { $in: activeStatuses },
      createdAt: { $gte: new Date(today) },
    }).sort({ createdAt: 1 });

    const position = activeOrders.findIndex(o => o._id.toString() === order._id.toString());
    const estimatedMinutes = order.estimatedReadyAt 
      ? Math.max(0, Math.ceil((order.estimatedReadyAt.getTime() - Date.now()) / 60000))
      : null;

    return NextResponse.json({
      order: {
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        status: order.status,
        items: order.items,
        total: order.total,
        queuePosition: position >= 0 ? position + 1 : null,
        estimatedMinutes,
        estimatedReadyAt: order.estimatedReadyAt,
        pickedUpAt: order.pickedUpAt,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    console.error('Order status fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order status' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/orders/[orderNumber]/status
 * Update order status (admin)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderNumber: string } }
) {
  try {
    const { orderNumber } = params;
    const body = await request.json();
    const { status } = body;

    const validStatuses = ['PENDING_PAYMENT', 'PENDING_CONFIRMATION', 'CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP', 'CANCELLED', 'REFUNDED'];
    
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const update: any = { status };
    if (status === 'READY') {
      // Don't set picked up time yet
    }
    if (status === 'PICKED_UP') {
      update.pickedUpAt = new Date();
    }

    const order = await MarketOrder.findOneAndUpdate(
      { orderNumber },
      { $set: update },
      { new: true }
    );

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Send notification when order is ready
    if (status === 'READY') {
      try {
        await sendOrderReady(order.customerPhone, {
          orderNumber,
          customerName: order.customerName,
        });
      } catch (smsError) {
        console.error('SMS ready notification failed:', smsError);
      }
    }

    return NextResponse.json({
      success: true,
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        updatedAt: order.updatedAt,
      },
    });
  } catch (error) {
    console.error('Order status update error:', error);
    return NextResponse.json(
      { error: 'Failed to update order status' },
      { status: 500 }
    );
  }
}
