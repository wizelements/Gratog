import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { QueuePosition } from '@/lib/models/QueuePosition';

export async function POST(request) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { orderId, status, notes } = body;
    
    if (!orderId || !status) {
      return NextResponse.json(
        { success: false, error: 'orderId and status required' },
        { status: 400 }
      );
    }
    
    const validStatuses = ['pending', 'queued', 'making', 'ready', 'picked_up', 'no_show', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }
    
    const update = { status };
    if (notes) update.notes = notes;
    
    const updated = await QueuePosition.findOneAndUpdate(
      { orderId },
      update,
      { new: true }
    ).lean();
    
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }
    
    // If marking ready or picked_up, update positions for remaining orders
    if (status === 'picked_up' || status === 'no_show') {
      await recalculatePositions(updated.marketId);
    }
    
    return NextResponse.json({
      success: true,
      orderId: updated.orderId,
      status: updated.status,
      position: updated.position
    });
    
  } catch (error) {
    console.error('Queue update error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function recalculatePositions(marketId) {
  // Get all active orders and renumber them
  const active = await QueuePosition.find({
    marketId,
    status: { $in: ['queued', 'making'] }
  })
  .sort({ position: 1, createdAt: 1 });
  
  for (let i = 0; i < active.length; i++) {
    await QueuePosition.updateOne(
      { _id: active[i]._id },
      { position: i + 1 }
    );
  }
}
