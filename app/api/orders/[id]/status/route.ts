export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { AdminAuthError, requireAdminSession } from '@/lib/auth/unified-admin';

const VALID_ORDER_STATUSES = [
  'pending', 'payment_processing', 'confirmed', 'making', 'preparing', 'ready',
  'completed', 'cancelled', 'refunded', 'delivered', 'picked_up', 'shipped', 'fulfilled',
  'PENDING_PAYMENT', 'PENDING_CONFIRMATION', 'CONFIRMED', 'PREPARING', 'READY',
  'PICKED_UP', 'CANCELLED', 'REFUNDED', 'PREORDER_PENDING_PAYMENT',
  'PREORDER_CONFIRMED', 'SHIPPING_PENDING_PAYMENT', 'SHIPPING_CONFIRMED', 'COMPLETED',
];

const VALID_PAYMENT_STATUSES = [
  'pending', 'processing', 'paid', 'failed', 'refunded',
  'PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED',
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();
    
    const order = await db.collection('marketorders').findOne({
      $or: [{ orderNumber: id }, { orderRef: id }, { _id: id }]
    });

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order._id?.toString(),
        orderNumber: order.orderNumber || order.orderRef,
        status: order.status || 'pending',
        items: order.items || [],
        total: order.total || 0,
        fulfillment: order.fulfillment || order.fulfillmentType ? {
          type: order.fulfillmentType || order.fulfillment?.type,
          address: order.shippingAddress || order.fulfillment?.address,
        } : null,
        customerName: order.customerName,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        estimatedReady: order.estimatedReady,
        queuePosition: order.queuePosition,
      },
    });
  } catch (error) {
    console.error('Order status error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch order status' }, { status: 500 });
  }
}

async function updateOrderStatus(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminSession(request);
    const { id } = await params;
    const { status, estimatedReady, paymentStatus } = await request.json();
    
    if (!status && !paymentStatus && !estimatedReady) {
      return NextResponse.json({ success: false, error: 'Status update is required' }, { status: 400 });
    }

    if (status && !VALID_ORDER_STATUSES.includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
    }

    if (paymentStatus && !VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
      return NextResponse.json({ success: false, error: 'Invalid payment status' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      statusUpdatedBy: admin.email,
    };
    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (estimatedReady) updateData.estimatedReady = estimatedReady;

    const result = await db.collection('marketorders').findOneAndUpdate(
      { $or: [{ orderNumber: id }, { orderRef: id }] },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order: {
        orderNumber: result.orderNumber || result.orderRef,
        status: result.status,
        paymentStatus: result.paymentStatus,
        updatedAt: result.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json(
        { success: false, error: error.statusCode === 401 ? 'Unauthorized' : 'Admin authentication failed' },
        { status: error.statusCode || 401 }
      );
    }

    console.error('Order status update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update order status' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return updateOrderStatus(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return updateOrderStatus(request, context);
}
