export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';

function toInitials(name) {
  if (!name) return '??';
  return name
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + '.')
    .join('');
}

export async function GET(request) {
  // Staff auth check
  const staffKey = request.headers.get('x-staff-key');
  if (!staffKey || staffKey !== process.env.PREORDER_STAFF_KEY) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

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

    const mapped = positions.map(p => ({
      orderId: p.orderId,
      orderRef: p.orderRef,
      position: p.position,
      status: p.status,
      customerName: p.customerInfo?.name || 'Customer',
      queuedAt: p.queuedAt,
      items: (p.items || []).map(i => ({ name: i.name, quantity: i.quantity }))
    }));

    // Flat array with redacted names for backward compat
    const redacted = mapped.map(p => ({
      ...p,
      customerName: toInitials(p.customerName),
    }));

    // Grouped shape for vendor pages (full names since staff is authed)
    const queue = { queued: [], making: [], ready: [] };
    for (const p of mapped) {
      if (queue[p.status]) {
        queue[p.status].push(p);
      }
    }

    return NextResponse.json({
      success: true,
      positions: redacted,
      queue,
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
