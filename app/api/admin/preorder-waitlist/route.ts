export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { PERMISSIONS } from '@/lib/security';
import { withAdminMiddleware } from '@/lib/middleware/admin';

/** Authorized, paginated contacts who opted into a no-charge request list. */
export const GET = withAdminMiddleware(async request => {
  const params = new URL(request.url).searchParams;
  const marketId = params.get('marketId') || '';
  const dateKey = params.get('dateKey') || '';
  const after = params.get('after') || '';
  if (!/^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,127}$/.test(marketId) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || after.length > 400) {
    return NextResponse.json({ error: 'Valid market/date/cursor required' }, { status: 400 });
  }
  try {
    let position: null | { time: Date; id: string } = null;
    if (after) {
      const decoded = JSON.parse(Buffer.from(after, 'base64url').toString());
      const time = new Date(decoded.t);
      if (!Number.isFinite(time.getTime()) || typeof decoded.id !== 'string' ||
          decoded.id.length > 400) {
        return NextResponse.json({ error: 'Invalid pagination cursor' }, { status: 400 });
      }
      position = { time, id: decoded.id };
    }
    const { db } = await connectToDatabase();
    const entries = await db.collection('preorder_waitlist_interests').find({
      marketId, pickupDateKey: dateKey, status: 'waiting',
      ...(position ? { $or: [
        { createdAt: { $gt: position.time } },
        { createdAt: position.time, _id: { $gt: position.id } },
      ] } : {}),
    }).project({
      customerName: 1, customerEmail: 1, customerPhone: 1,
      items: 1, createdAt: 1, status: 1,
    }).sort({ createdAt: 1, _id: 1 }).limit(51).toArray();
    const hasMore = entries.length > 50;
    const page = entries.slice(0, 50);
    return NextResponse.json({
      success: true,
      entries: page,
      nextCursor: hasMore ? Buffer.from(JSON.stringify({
        t: page[page.length - 1].createdAt.toISOString(),
        id: String(page[page.length - 1]._id),
      })).toString('base64url') : null,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Waitlist temporarily unavailable' }, { status: 503 });
  }
}, { permission: PERMISSIONS.ORDERS_VIEW, resource: 'preorder_waitlist', action: 'view' });
