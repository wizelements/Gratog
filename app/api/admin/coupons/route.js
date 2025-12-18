import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-admin';
import { requireAdmin } from '@/lib/admin-session';
import { logger } from '@/lib/logger';

export async function GET(request) {
  try {
    const admin = await requireAdmin(request);
    
    const { db } = await connectToDatabase();
    
    // Get all coupons, sorted by creation date
    const coupons = await db.collection('coupons')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      coupons: coupons.map(coupon => ({
        id: coupon.id,
        code: coupon.code,
        customerEmail: coupon.customerEmail,
        discountAmount: coupon.discountAmount,
        freeShipping: coupon.freeShipping,
        type: coupon.type,
        source: coupon.source,
        isUsed: coupon.isUsed,
        createdAt: coupon.createdAt,
        expiresAt: coupon.expiresAt,
        usedAt: coupon.usedAt,
        orderId: coupon.orderId
      }))
    });

  } catch (error) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }
    logger.error('API', 'Error fetching admin coupons', error);
    return NextResponse.json(
      { error: 'Failed to fetch coupons' },
      { status: 500 }
    );
  }
}

// Analytics endpoint for coupon statistics
export async function POST(request) {
  try {
    const admin = await requireAdmin(request);
    
    const { action } = await request.json();
    
    if (action === 'analytics') {
      const { db } = await connectToDatabase();
      
      // Get coupon analytics
      const totalCoupons = await db.collection('coupons').countDocuments();
      const usedCoupons = await db.collection('coupons').countDocuments({ isUsed: true });
      const activeCoupons = await db.collection('coupons').countDocuments({ 
        isUsed: false,
        expiresAt: { $gt: new Date().toISOString() }
      });
      
      // Calculate total savings
      const usedCouponsData = await db.collection('coupons')
        .find({ isUsed: true })
        .toArray();
      
      const totalSavings = usedCouponsData.reduce((sum, coupon) => 
        sum + (coupon.discountAmount || 0), 0
      );
      
      // Get usage by type
      const usageByType = await db.collection('coupons').aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            used: {
              $sum: {
                $cond: ['$isUsed', 1, 0]
              }
            },
            totalDiscount: {
              $sum: {
                $cond: ['$isUsed', '$discountAmount', 0]
              }
            }
          }
        }
      ]).toArray();
      
      // Get daily usage stats for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const dailyStats = await db.collection('coupons').aggregate([
        {
          $match: {
            createdAt: { $gte: thirtyDaysAgo.toISOString() }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: { $dateFromString: { dateString: '$createdAt' } }
              }
            },
            created: { $sum: 1 },
            used: {
              $sum: {
                $cond: ['$isUsed', 1, 0]
              }
            }
          }
        },
        { $sort: { '_id': 1 } }
      ]).toArray();
      
      return NextResponse.json({
        success: true,
        analytics: {
          totalCoupons,
          usedCoupons,
          activeCoupons,
          totalSavings,
          usageByType,
          dailyStats
        }
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }
    logger.error('API', 'Error getting coupon analytics', error);
    return NextResponse.json(
      { error: 'Failed to get analytics' },
      { status: 500 }
    );
  }
}
