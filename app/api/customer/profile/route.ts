import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import MarketOrder from '@/models/MarketOrder';

export const runtime = 'nodejs';

/**
 * GET /api/customer/profile?phone=xxx
 * Returns customer profile and order history
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
    }

    await connectToDatabase();

    // Get order history
    const orders = await MarketOrder.find({
      customerPhone: phone.replace(/\D/g, ''),
    })
      .sort({ createdAt: -1 })
      .limit(20);

    // Calculate favorite items (most ordered)
    const itemCounts: Record<string, number> = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
      });
    });

    const favoriteItems = Object.entries(itemCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name]) => name);

    // Get customer name from most recent order
    const latestOrder = orders[0];

    const profile = {
      phone,
      name: latestOrder?.customerName,
      email: latestOrder?.customerEmail,
      orderCount: orders.length,
      favoriteItems,
    };

    return NextResponse.json({
      profile,
      orders: orders.map(o => ({
        orderNumber: o.orderNumber,
        marketName: o.marketName,
        total: o.total,
        items: o.items.map(i => ({ name: i.name, quantity: i.quantity })),
        createdAt: o.createdAt,
        status: o.status,
      })),
    });
  } catch (error) {
    console.error('Customer profile fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
