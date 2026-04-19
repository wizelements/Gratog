import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { QueuePosition } from '@/lib/models/QueuePosition';

export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Order ID required' },
        { status: 400 }
      );
    }
    
    const position = await QueuePosition.getPositionByOrderId(id);
    
    if (!position) {
      return NextResponse.json(
        { success: false, error: 'Order not found in queue' },
        { status: 404 }
      );
    }
    
    // Calculate estimated wait time (2 minutes per order ahead)
    const estimatedMinutes = position.ahead * 2;
    
    return NextResponse.json({
      success: true,
      position: position.position,
      ahead: position.ahead,
      totalInQueue: position.totalInQueue,
      status: position.status,
      orderRef: position.orderRef,
      marketName: position.marketName,
      estimatedMinutes,
      makingNow: position.makingNow,
      items: position.items,
      updatedAt: position.updatedAt
    });
    
  } catch (error) {
    console.error('Queue position error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
