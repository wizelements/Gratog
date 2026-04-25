import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import MarketOrder from '@/models/MarketOrder';

export const runtime = 'nodejs';

/**
 * GET /api/analytics?period=today|week|month&marketId=xxx
 * Returns analytics data for the dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today';
    const marketId = searchParams.get('marketId') || 'all';

    await connectToDatabase();

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'today':
      default:
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
    }

    // Build query
    const query: any = {
      createdAt: { $gte: startDate },
      status: { $nin: ['CANCELLED', 'REFUNDED'] },
    };
    if (marketId !== 'all') {
      query.marketId = marketId;
    }

    // Fetch orders
    const orders = await MarketOrder.find(query);

    // Calculate metrics
    const revenue = orders
      .filter(o => o.paymentStatus === 'PAID')
      .reduce((sum, o) => sum + o.total, 0);

    const onlineRevenue = orders
      .filter(o => o.paymentMethod === 'SQUARE_ONLINE' && o.paymentStatus === 'PAID')
      .reduce((sum, o) => sum + o.total, 0);

    const cashRevenue = orders
      .filter(o => o.paymentMethod === 'CASH' && o.paymentStatus === 'PAID')
      .reduce((sum, o) => sum + o.total, 0);

    const uniquePhones = new Set(orders.map(o => o.customerPhone));
    
    // Top items
    const itemSales: Record<string, { name: string; count: number; revenue: number }> = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        if (!itemSales[item.productId]) {
          itemSales[item.productId] = { name: item.name, count: 0, revenue: 0 };
        }
        itemSales[item.productId].count += item.quantity;
        itemSales[item.productId].revenue += item.subtotal;
      });
    });

    const topItems = Object.values(itemSales)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Hourly data (for today only)
    const hourlyData: Array<{ hour: number; orders: number; revenue: number }> = [];
    if (period === 'today') {
      for (let h = 0; h < 24; h++) {
        const hourOrders = orders.filter(o => {
          const orderHour = new Date(o.createdAt).getHours();
          return orderHour === h;
        });
        hourlyData.push({
          hour: h,
          orders: hourOrders.length,
          revenue: hourOrders.reduce((sum, o) => sum + o.total, 0),
        });
      }
    }

    // Daily comparison (yesterday vs today)
    let dailyComparison = 0;
    if (period === 'today') {
      const yesterdayStart = new Date(startDate);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      const yesterdayEnd = new Date(startDate);
      
      const yesterdayQuery = { ...query };
      yesterdayQuery.createdAt = { $gte: yesterdayStart, $lt: yesterdayEnd };
      
      const yesterdayOrders = await MarketOrder.find(yesterdayQuery);
      const yesterdayRevenue = yesterdayOrders.reduce((sum, o) => sum + o.total, 0);
      
      if (yesterdayRevenue > 0) {
        dailyComparison = Math.round(((revenue - yesterdayRevenue) / yesterdayRevenue) * 100);
      }
    }

    return NextResponse.json({
      revenue,
      orders: orders.length,
      customers: uniquePhones.size,
      avgOrderValue: orders.length > 0 ? revenue / orders.length : 0,
      onlineRevenue,
      cashRevenue,
      topItems,
      hourlyData,
      dailyComparison,
    });
  } catch (error) {
    console.error('Analytics fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
