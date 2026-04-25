import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import MarketOrder from '@/models/MarketOrder';
import DailyInventory from '@/models/DailyInventory';
import { sendDailyReport } from '@/lib/sms';

export const runtime = 'nodejs';

/**
 * GET /api/reports/daily
 * Generate daily market report
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const marketId = searchParams.get('marketId') || 'serenbe-farmers-market';
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const sendSms = searchParams.get('sendSms') === 'true';

    await connectToDatabase();

    const startOfDay = new Date(date);
    const endOfDay = new Date(date + 'T23:59:59');

    // Fetch all orders for the day
    const orders = await MarketOrder.find({
      marketId,
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
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Count unique customers
    const uniquePhones = new Set(orders.map(o => o.customerPhone));
    const uniqueCustomers = uniquePhones.size;

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

    // Peak hour analysis
    const hourlyOrders: Record<number, number> = {};
    orders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      hourlyOrders[hour] = (hourlyOrders[hour] || 0) + 1;
    });
    
    const peakHour = Object.entries(hourlyOrders)
      .sort(([, a], [, b]) => b - a)[0];

    // Fetch inventory data
    const inventory = await DailyInventory.findOne({
      marketId,
      date: { $gte: startOfDay, $lt: endOfDay },
    });

    const soldOutItems = inventory?.items.filter(item => item.isSoldOut) || [];

    const report = {
      date,
      marketId,
      summary: {
        totalRevenue,
        onlineRevenue,
        cashRevenue,
        totalOrders,
        avgOrderValue,
        uniqueCustomers,
      },
      topItems,
      peakHour: peakHour ? `${peakHour[0]}:00 (${peakHour[1]} orders)` : null,
      soldOutItems: soldOutItems.map(item => ({
        name: item.name,
        sold: item.soldCount,
      })),
      paymentBreakdown: {
        square: orders.filter(o => o.paymentMethod === 'SQUARE_ONLINE').length,
        cash: orders.filter(o => o.paymentMethod === 'CASH').length,
        venmo: orders.filter(o => o.paymentMethod === 'VENMO').length,
        payAtPickup: orders.filter(o => o.paymentMethod === 'PAY_AT_PICKUP').length,
      },
    };

    // Send SMS report if requested
    if (sendSms) {
      try {
        await sendDailyReport(process.env.ADMIN_PHONE || '', report);
      } catch (smsError) {
        console.error('Failed to send daily report SMS:', smsError);
      }
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('Daily report generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
