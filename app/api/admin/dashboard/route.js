import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { requireAdmin } from '@/lib/admin-session';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/dashboard
 * Get dashboard statistics for admin
 */
export async function GET(request) {
  try {
    const admin = await requireAdmin(request);
    
    const { db } = await connectToDatabase();
    
    // Get counts from various collections
    const [
      productsCount,
      ordersCount,
      customersCount,
      recentOrders
    ] = await Promise.all([
      db.collection('unified_products').countDocuments(),
      db.collection('orders').countDocuments(),
      db.collection('customers').countDocuments(),
      db.collection('orders')
        .find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray()
    ]);
    
    // Calculate revenue from orders
    const orders = await db.collection('orders').find({}).toArray();
    const totalRevenue = orders.reduce((sum, order) => {
      return sum + (order.total || order.totalAmount || 0);
    }, 0);
    
    return NextResponse.json({
      success: true,
      stats: {
        products: productsCount,
        orders: ordersCount,
        customers: customersCount,
        revenue: totalRevenue
      },
      recentOrders: recentOrders.map(order => ({
        id: order.id || order._id?.toString(),
        customerName: order.customerName || order.customer?.name || 'Guest',
        total: order.total || order.totalAmount || 0,
        status: order.status || 'pending',
        createdAt: order.createdAt
      }))
    });
  } catch (error) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }
    logger.error('API', 'Dashboard fetch error', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
