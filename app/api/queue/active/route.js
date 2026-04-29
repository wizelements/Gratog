export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { QueuePosition } from '@/lib/models/QueuePosition';

export async function GET(request) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const marketId = searchParams.get('marketId');
    
    if (!marketId) {
      return NextResponse.json(
        { success: false, error: 'marketId required' },
        { status: 400 }
      );
    }
    
    const queue = await QueuePosition.getActiveQueue(marketId);
    
    // Group by status
    const grouped = {
      queued: queue.filter(q => q.status === 'queued'),
      making: queue.filter(q => q.status === 'making'),
      ready: queue.filter(q => q.status === 'ready')
    };
    
    // Calculate stats
    const stats = {
      total: queue.length,
      queued: grouped.queued.length,
      making: grouped.making.length,
      ready: grouped.ready.length,
      avgWaitMinutes: queue.length > 0 ? Math.ceil(queue.length * 1.5) : 0
    };
    
    return NextResponse.json({
      success: true,
      marketId,
      queue: grouped,
      stats,
      updatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Queue active error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
