import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { QueuePosition } from '@/lib/models/QueuePosition';

export async function POST(request) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { 
      orderId, 
      orderRef,
      marketId, 
      marketName,
      customerInfo,
      items,
      notes 
    } = body;
    
    // Validation
    if (!orderId || !marketId) {
      return NextResponse.json(
        { success: false, error: 'orderId and marketId required' },
        { status: 400 }
      );
    }
    
    // Check if already in queue
    const existing = await QueuePosition.findOne({ orderId }).lean();
    if (existing) {
      return NextResponse.json({
        success: true,
        position: existing.position,
        status: existing.status,
        message: 'Order already in queue'
      });
    }
    
    // Get next position
    const nextPosition = await QueuePosition.getNextPosition(marketId);
    
    // Create queue entry
    const queueEntry = await QueuePosition.create({
      orderId,
      orderRef: orderRef || orderId.slice(-6).toUpperCase(),
      marketId,
      marketName: marketName || 'Market',
      position: nextPosition,
      status: 'queued',
      customerInfo: customerInfo || {},
      items: items || [],
      notes,
      queuedAt: new Date()
    });
    
    return NextResponse.json({
      success: true,
      position: queueEntry.position,
      status: queueEntry.status,
      orderRef: queueEntry.orderRef,
      estimatedWaitMinutes: Math.ceil(nextPosition * 2) // Rough estimate: 2 min per order
    });
    
  } catch (error) {
    console.error('Queue join error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
