export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import MarketOrder from '@/models/MarketOrder';
import { EVENT_TYPES, trackEvent } from '@/lib/unified-analytics';

export const runtime = 'nodejs';

const CLIENT_EVENT_MAP: Record<string, string> = {
  product_view: EVENT_TYPES.PRODUCT_VIEW,
  product_add_to_cart: EVENT_TYPES.PRODUCT_ADD_TO_CART,
  search_query: EVENT_TYPES.SEARCH_QUERY,
  search_suggestion_selected: EVENT_TYPES.SEARCH_QUERY,
  category_view: EVENT_TYPES.CATEGORY_VIEW,
  ingredient_filter: EVENT_TYPES.INGREDIENT_FILTER,
  checkout_started: EVENT_TYPES.CHECKOUT_START,
  checkout_start: EVENT_TYPES.CHECKOUT_START,
  checkout_abandoned: EVENT_TYPES.CHECKOUT_ABANDON,
  order_created: EVENT_TYPES.CHECKOUT_START,
  payment_success: EVENT_TYPES.PAYMENT_SUCCESS,
  payment_error: EVENT_TYPES.PAYMENT_FAILED,
};

function sanitizeMetricKey(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[.$]/g, ' ')
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 64) || 'unknown';
}

function sanitizeAnalyticsData(eventType: string, properties: Record<string, any>) {
  const data: Record<string, any> = {};
  const allowedKeys = [
    'productId',
    'productName',
    'category',
    'query',
    'resultsCount',
    'ingredient',
    'fulfillmentType',
    'marketId',
    'orderId',
    'total',
    'amount',
    'error',
    'code',
  ];

  for (const key of allowedKeys) {
    if (properties[key] !== undefined && properties[key] !== null) {
      data[key] = typeof properties[key] === 'string' ? properties[key].slice(0, 200) : properties[key];
    }
  }

  if (eventType === EVENT_TYPES.SEARCH_QUERY) {
    data.query = sanitizeMetricKey(data.query || properties.search || properties.term);
  }

  if (eventType === EVENT_TYPES.CATEGORY_VIEW) {
    data.category = sanitizeMetricKey(data.category);
  }

  if (eventType === EVENT_TYPES.INGREDIENT_FILTER) {
    data.ingredient = sanitizeMetricKey(data.ingredient);
  }

  return data;
}

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
      order.items.forEach((item: any) => {
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

/**
 * POST /api/analytics
 * Public, best-effort storefront telemetry for search, product, and checkout funnels.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawEvent = String(body.event || body.type || '').trim();
    const eventType = CLIENT_EVENT_MAP[rawEvent];

    if (!eventType) {
      return NextResponse.json({ success: false, error: 'Unsupported analytics event' }, { status: 400 });
    }

    const properties = body.properties && typeof body.properties === 'object' ? body.properties : {};
    const data = sanitizeAnalyticsData(eventType, properties);
    const forwardedFor = request.headers.get('x-forwarded-for') || '';

    await trackEvent(eventType, data, {
      source: 'storefront',
      userAgent: request.headers.get('user-agent') || 'unknown',
      ip: forwardedFor.split(',')[0]?.trim() || 'unknown',
      path: request.headers.get('referer') || '',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics track error:', error);
    return NextResponse.json({ success: true, dropped: true });
  }
}
