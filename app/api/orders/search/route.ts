export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { AdminAuthError, requireAdminSession } from '@/lib/auth/unified-admin';
import MarketOrder from '@/models/MarketOrder';

export async function GET(request: NextRequest) {
  const respond = (body: unknown, status: number) => NextResponse.json(body,
    { status, headers: { 'Cache-Control': 'no-store' } });
  try {
    if (String(process.env.DATABASE_PROVIDER).toLowerCase() === 'turso') {
      return respond({ error: 'Order search is not yet available for this database.', code: 'TURSO_ORDER_SEARCH_NOT_CERTIFIED' }, 503);
    }
    await requireAdminSession(request);
    const params = new URL(request.url).searchParams;
    const query = (params.get('q') || '').trim();
    const marketId = (params.get('marketId') || '').trim();
    if (query.length < 3 || query.length > 80 || !/^[a-zA-Z0-9_-]{1,100}$/.test(marketId)) {
      return respond({ error: 'A search of 3–80 characters and an explicit market identity are required.' }, 400);
    }
    const literal = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches: Record<string, unknown>[] = [
      { orderNumber: { $regex: literal, $options: 'i' } },
      { customerName: { $regex: literal, $options: 'i' } },
    ];
    const digits = query.replace(/\D/g, '');
    if (digits.length >= 4 && digits.length <= 15) matches.push({ customerPhone: { $regex: digits } });
    await connectToDatabase();
    const orders = await MarketOrder.find({ marketId, $or: matches })
      .select('orderNumber customerName status total items.name items.quantity createdAt')
      .sort({ createdAt: -1 }).limit(10).lean();
    return respond({ orders: orders.map(order => ({
      id: String(order._id), orderNumber: order.orderNumber, customerName: order.customerName,
      status: order.status, total: order.total,
      items: (order.items || []).map((item: { name: string; quantity: number }) => ({ name: item.name, quantity: item.quantity })),
      createdAt: order.createdAt,
    })) }, 200);
  } catch (error) {
    return respond({ error: error instanceof AdminAuthError ? 'Administrator authentication required' : 'Order search unavailable' },
      error instanceof AdminAuthError ? error.statusCode : 503);
  }
}
