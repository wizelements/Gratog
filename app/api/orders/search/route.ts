import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import MarketOrder from '@/models/MarketOrder';

export const runtime = 'nodejs';

/**
 * GET /api/orders/search?q=phone|name|orderNumber
 * Search orders by customer info
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const marketId = searchParams.get('marketId') || 'serenbe-farmers-market';
    
    if (!query || query.length < 3) {
      return NextResponse.json(
        { error: 'Query must be at least 3 characters' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Today's date range
    const today = new Date().toISOString().split('T')[0];
    const startOfDay = new Date(today);
    const endOfDay = new Date(today + 'T23:59:59');

    // Build search query
    const searchQuery: any = {
      marketId,
      createdAt: { $gte: startOfDay, $lt: endOfDay },
      $or: [
        { orderNumber: { $regex: query, $options: 'i' } },
        { customerName: { $regex: query, $options: 'i' } },
        { customerPhone: { $regex: query.replace(/\D/g, ''), $options: 'i' } },
      ],
    };

    const orders = await MarketOrder.find(searchQuery)
      .sort({ createdAt: -1 })
      .limit(10);

    return NextResponse.json({
      orders: orders.map(order => ({
        id: order._id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        status: order.status,
        total: order.total,
        items: order.items.map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
        })),
        createdAt: order.createdAt,
      })),
    });
  } catch (error) {
    console.error('Order search error:', error);
    return NextResponse.json(
      { error: 'Failed to search orders' },
      { status: 500 }
    );
  }
}
