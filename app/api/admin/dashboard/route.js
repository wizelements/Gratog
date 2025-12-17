const DEBUG = process.env.DEBUG === "true";
const debug = (...args) => { if (DEBUG) debug(...args); };

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/admin/dashboard
 * Fetch dashboard metrics and data
 */
export async function GET(request) {
  // Verify admin authentication
  const token = request.cookies.get('admin_token')?.value;
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  try {
    const { db } = await connectToDatabase();
    
    // Get products count
    const productsCount = await db.collection('square_catalog_items').countDocuments();
    
    // Get orders count (if orders collection exists)
    let ordersCount = 0;
    let totalSales = 0;
    try {
      ordersCount = await db.collection('orders').countDocuments();
      const salesData = await db.collection('orders').aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]).toArray();
      totalSales = salesData[0]?.total || 0;
    } catch (e) {
      debug('Orders collection not yet available');
    }
    
    // Get customers count (if customers collection exists)
    let customersCount = 0;
    try {
      customersCount = await db.collection('customers').countDocuments();
    } catch (e) {
      debug('Customers collection not yet available');
    }
    
    // Low stock alerts (products with inventory tracking)
    let lowStockCount = 0;
    try {
      const productsWithInventory = await db.collection('square_catalog_items').find({
        'variations.trackQuantity': true
      }).toArray();
      
      lowStockCount = productsWithInventory.filter(p => {
        return p.variations.some(v => 
          v.trackQuantity && (v.inventoryAlertThreshold || 0) > 0
        );
      }).length;
    } catch (e) {
      debug('Inventory check skipped');
    }
    
    // Recent activity (mock for now)
    const recentActivity = [
      {
        id: '1',
        type: 'product_sync',
        message: 'Square catalog synced successfully',
        timestamp: new Date(Date.now() - 1000 * 60 * 30)
      },
      {
        id: '2',
        type: 'order',
        message: 'New order received',
        timestamp: new Date(Date.now() - 1000 * 60 * 120)
      }
    ];
    
    return NextResponse.json({
      success: true,
      data: {
        sales: {
          today: totalSales,
          change: '+0%'
        },
        orders: {
          pending: ordersCount,
          total: ordersCount
        },
        products: {
          active: productsCount,
          total: productsCount
        },
        lowStock: lowStockCount,
        customers: customersCount,
        recentActivity
      }
    });
  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch dashboard data',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
