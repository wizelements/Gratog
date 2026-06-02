export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const marketId = searchParams.get('marketId') || 'default';

    const { db } = await connectToDatabase();

    const positions = await db.collection('queuepositions')
      .find({
        marketId,
        status: { $in: ['queued', 'making', 'ready'] }
      })
      .sort({ position: 1 })
      .toArray();

    return NextResponse.json({
      success: true,
      positions: positions.map(p => ({
        orderId: p.orderId,
        orderRef: p.orderRef,
        position: p.position,
        status: p.status,
        customerName: p.customerInfo?.name || 'Customer',
        queuedAt: p.queuedAt,
        items: (p.items || []).map(i => ({ name: i.name, quantity: i.quantity }))
      })),
      count: positions.length
    });
  } catch (error) {
    console.error('Queue active error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
