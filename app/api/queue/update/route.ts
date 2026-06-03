export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';

function verifyStaffAuth(request: NextRequest): boolean {
  const key = request.headers.get('x-staff-key');
  return !!key && key === process.env.PREORDER_STAFF_KEY;
}

async function handleUpdate(request: NextRequest) {
  if (!verifyStaffAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { orderId, status, position } = await request.json();

    if (!orderId || !status) {
      return NextResponse.json({ success: false, error: 'orderId and status are required' }, { status: 400 });
    }

    // Map picked_up → completed for UI compatibility
    const mappedStatus = status === 'picked_up' ? 'completed' : status;

    const validStatuses = ['queued', 'making', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(mappedStatus)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const updateData: Record<string, unknown> = { status: mappedStatus, updatedAt: new Date() };
    if (typeof position === 'number') updateData.position = position;
    if (mappedStatus === 'completed' || mappedStatus === 'cancelled') updateData.completedAt = new Date();

    const result = await db.collection('queuepositions').findOneAndUpdate(
      { orderId },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ success: false, error: 'Queue position not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      position: {
        orderId: result.orderId,
        orderRef: result.orderRef,
        status: result.status,
        position: result.position,
        updatedAt: result.updatedAt,
      },
    });
  } catch (error) {
    console.error('Queue update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update queue' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  return handleUpdate(request);
}

export async function POST(request: NextRequest) {
  return handleUpdate(request);
}
