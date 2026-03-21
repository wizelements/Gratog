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
    
    // Get counts and revenue in parallel using aggregation
    const [
      productsCount,
      ordersCount,
      customersCount,
      recentOrders,
      revenueResult
    ] = await Promise.all([
      db.collection('unified_products').countDocuments(),
      db.collection('orders').countDocuments(),
      db.collection('customers').countDocuments(),
      db.collection('orders')
        .find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray(),
      db.collection('orders').aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: { $ifNull: ['$total', { $ifNull: ['$totalAmount', 0] }] }
            }
          }
        }
      ]).toArray()
    ]);
    
    const totalRevenue = revenueResult[0]?.totalRevenue || 0;
    
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
