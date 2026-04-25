import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import MarketOrder from '@/models/MarketOrder';
import DailyInventory from '@/models/DailyInventory';
import { sendDailyReport } from '@/lib/sms';

export const runtime = 'nodejs';

/**
 * GET /api/cron/daily-report
 * Triggered by Vercel Cron - sends daily report to admin
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    const startOfDay = new Date(dateStr);
    const endOfDay = new Date(dateStr + 'T23:59:59');

    // Fetch yesterday's orders
    const orders = await MarketOrder.find({
      createdAt: { $gte: startOfDay, $lt: endOfDay },
    });

    // Calculate metrics
    const totalRevenue = orders
      .filter(o => o.status !== 'CANCELLED' && o.paymentStatus === 'PAID')
      .reduce((sum, o) => sum + o.total, 0);

    const onlineRevenue = orders
      .filter(o => o.paymentMethod === 'SQUARE_ONLINE' && o.paymentStatus === 'PAID')
      .reduce((sum, o) => sum + o.total, 0);

    const cashRevenue = orders
      .filter(o => o.paymentMethod === 'CASH' && o.paymentStatus === 'PAID')
      .reduce((sum, o) => sum + o.total, 0);

    const totalOrders = orders.filter(o => o.status !== 'CANCELLED').length;

    // Count unique customers
    const uniquePhones = new Set(orders.map(o => o.customerPhone));

    // Top selling items
    const itemSales: Record<string, { name: string; count: number; revenue: number }> = {};
    orders.forEach(order => {
      if (order.status === 'CANCELLED') return;
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
      .slice(0, 5);

    // Find peak hour
    const hourlyOrders: Record<number, number> = {};
    orders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      hourlyOrders[hour] = (hourlyOrders[hour] || 0) + 1;
    });
    const peakHour = Object.entries(hourlyOrders)
      .sort(([, a], [, b]) => b - a)[0];

    // Build report
    const report = {
      date: dateStr,
      summary: {
        totalRevenue,
        onlineRevenue,
        cashRevenue,
        totalOrders,
        avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        uniqueCustomers: uniquePhones.size,
      },
      topItems,
      peakHour: peakHour ? `${peakHour[0]}:00 (${peakHour[1]} orders)` : null,
      markets: Array.from(new Set(orders.map(o => o.marketName))),
    };

    // Send SMS report
    let smsSent = false;
    if (process.env.ADMIN_PHONE) {
      try {
        await sendDailyReport(process.env.ADMIN_PHONE, report);
        smsSent = true;
      } catch (err) {
        console.error('Failed to send SMS report:', err);
      }
    }

    return NextResponse.json({
      success: true,
      smsSent,
      report,
    });
  } catch (error) {
    console.error('Daily report cron error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
