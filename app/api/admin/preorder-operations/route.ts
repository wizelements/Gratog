export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { PERMISSIONS } from '@/lib/security';
import { withAdminMiddleware } from '@/lib/middleware/admin';
import { CAPACITY_COLLECTION } from '@/lib/preorder/capacity';

/** Staff production manifest: market/date, totals grouped by SKU and payment status. */
export const GET = withAdminMiddleware(async (request) => {
  const params = new URL(request.url).searchParams;
  const marketId = params.get('marketId') || '';
  const dateKey = params.get('dateKey') || '';
  const after = params.get('after') || '';
  if (!/^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,127}$/.test(marketId) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(dateKey) ||
      (after && !/^PRE-[a-zA-Z0-9_-]{5,80}$/.test(after))) {
    return NextResponse.json({ error: 'Valid market/date/order cursor required' }, { status: 400 });
  }
  try {
    const { db } = await connectToDatabase();
    const filter = { marketId, capacityDateKey: dateKey };
    const rawOrders = await db.collection('marketorders').find({
      ...filter, ...(after ? { orderNumber: { $gt: after } } : {}),
    }).project({
      _id: 0, orderNumber: 1, waitlistNumber: 1, customerName: 1,
      customerPhone: 1, items: 1, paymentStatus: 1, status: 1,
      total: 1, createdAt: 1, capacityReservationStatus: 1,
    }).sort({ orderNumber: 1 }).limit(51).toArray();
    const hasMore = rawOrders.length > 50;
    const orders = rawOrders.slice(0, 50);

    const demand = await db.collection('marketorders').aggregate([
      { $match: filter },
      { $unwind: '$capacityRequirements' },
      { $group: {
        _id: { sku: '$capacityRequirements.sku', paymentStatus: '$paymentStatus' },
        units: { $sum: '$capacityRequirements.quantity' },
        orders: { $sum: 1 },
      } },
      { $sort: { '_id.sku': 1, '_id.paymentStatus': 1 } },
    ]).toArray();
    const summary = await db.collection('marketorders').aggregate([
      { $match: filter },
      { $group: {
        _id: '$paymentStatus',
        orders: { $sum: 1 },
        revenueCents: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'PAID'] },
          '$totalCents', 0] } },
      } },
    ]).toArray();
    const waitlistCount = await db.collection('preorder_waitlist_interests')
      .countDocuments({ marketId, pickupDateKey: dateKey, status: 'waiting' });
    const capacity = await db.collection(CAPACITY_COLLECTION).find({ marketId, dateKey })
      .project({ _id: 0, sku: 1, limitUnits: 1, heldUnits: 1, active: 1 }).sort({ sku: 1 }).limit(250).toArray();
    return NextResponse.json({
      success: true, marketId, dateKey, summary, demand, capacity, orders, waitlistCount,
      nextCursor: hasMore ? orders[orders.length - 1]?.orderNumber : null,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Preorder production manifest unavailable' }, { status: 503 });
  }
}, { permission: PERMISSIONS.ORDERS_VIEW, resource: 'preorder_operations', action: 'view' });
