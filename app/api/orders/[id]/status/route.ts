export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status, estimatedReady } = await request.json();
    
    if (!status) {
      return NextResponse.json({ success: false, error: 'Status is required' }, { status: 400 });
    }

    const validStatuses = ['pending', 'confirmed', 'making', 'ready', 'completed', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const updateData: Record<string, unknown> = { status, updatedAt: new Date() };
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
        updatedAt: result.updatedAt,
      },
    });
  } catch (error) {
    console.error('Order status update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update order status' }, { status: 500 });
  }
}
