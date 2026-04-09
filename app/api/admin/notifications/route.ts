/**
 * Admin Notifications API
 * 
 * POST /api/admin/notifications/send - Send notification to specific customers
 * POST /api/admin/notifications/broadcast - Broadcast to all subscribers
 * GET  /api/admin/notifications/stats - Get notification statistics
 * POST /api/admin/notifications/market-day - Trigger market day notifications
 * POST /api/admin/notifications/new-product - Announce new product
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';
import { 
  sendNotification, 
  sendBulkNotification,
  sendMarketDayNotifications,
  announceNewProduct,
  NOTIFICATION_TYPES 
} from '@/lib/push-notifications';

/**
 * POST /api/admin/notifications/send
 * Send notification to specific customers
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { emails, type, data } = body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'Emails array required' },
        { status: 400 }
      );
    }

    if (!type || !NOTIFICATION_TYPES[type]) {
      return NextResponse.json(
        { error: 'Valid notification type required' },
        { status: 400 }
      );
    }

    // Limit bulk sends
    if (emails.length > 1000) {
      return NextResponse.json(
        { error: 'Maximum 1000 recipients per request' },
        { status: 400 }
      );
    }

    const results = await sendBulkNotification(emails, type, data);

    logger.info('AdminNotifications', `Bulk notification sent`, {
      type,
      recipientCount: emails.length,
      results
    });

    return NextResponse.json({
      success: true,
      results
    });
  } catch (error) {
    logger.error('AdminNotifications', 'Failed to send notifications', { error });
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/notifications/market-day
 * Trigger market day notifications
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { marketId, products } = body;

    if (!marketId) {
      return NextResponse.json(
        { error: 'Market ID required' },
        { status: 400 }
      );
    }

    const results = await sendMarketDayNotifications(marketId, products || []);

    logger.info('AdminNotifications', `Market day notifications sent`, {
      marketId,
      results
    });

    return NextResponse.json({
      success: true,
      message: `Market day notifications sent to ${results.sent} customers`,
      results
    });
  } catch (error) {
    logger.error('AdminNotifications', 'Failed to send market day notifications', { error });
    return NextResponse.json(
      { error: 'Failed to send market day notifications' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/notifications/new-product
 * Announce new product
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID required' },
        { status: 400 }
      );
    }

    // Get product details
    const { db } = await connectToDatabase();
    const product = await db.collection('products').findOne({ id: productId });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const results = await announceNewProduct(product);

    logger.info('AdminNotifications', `New product announced`, {
      productId: product.id,
      productName: product.name,
      results
    });

    return NextResponse.json({
      success: true,
      message: `New product announced to ${results.sent} customers`,
      results
    });
  } catch (error) {
    logger.error('AdminNotifications', 'Failed to announce new product', { error });
    return NextResponse.json(
      { error: 'Failed to announce new product' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/notifications/stats
 * Get notification statistics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    
    // Limit to reasonable range
    const daysToQuery = Math.min(Math.max(days, 1), 90);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToQuery);

    const { db } = await connectToDatabase();

    // Get statistics
    const stats = await db.collection('notification_logs').aggregate([
      {
        $match: {
          sentAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          pushSent: { 
            $sum: { $cond: [{ $eq: ['$results.push', true] }, 1, 0] }
          },
          emailSent: { 
            $sum: { $cond: [{ $eq: ['$results.email', true] }, 1, 0] }
          }
        }
      }
    ]).toArray();

    // Get subscriber counts
    const activePushSubscriptions = await db.collection('push_subscriptions').countDocuments({
      isActive: true
    });

    const notificationPreferences = await db.collection('notification_preferences').aggregate([
      {
        $group: {
          _id: null,
          marketDays: { $sum: { $cond: ['$marketDays', 1, 0] } },
          newProducts: { $sum: { $cond: ['$newProducts', 1, 0] } },
          flashSales: { $sum: { $cond: ['$flashSales', 1, 0] } },
          orderUpdates: { $sum: { $cond: ['$orderUpdates', 1, 0] } },
          nearbyMarkets: { $sum: { $cond: ['$nearbyMarkets', 1, 0] } }
        }
      }
    ]).toArray();

    return NextResponse.json({
      success: true,
      period: `${daysToQuery} days`,
      stats: {
        byType: stats,
        totalSent: stats.reduce((sum, s) => sum + s.count, 0),
        totalPush: stats.reduce((sum, s) => sum + s.pushSent, 0),
        totalEmail: stats.reduce((sum, s) => sum + s.emailSent, 0)
      },
      subscribers: {
        activePush: activePushSubscriptions,
        preferences: notificationPreferences[0] || {}
      }
    });
  } catch (error) {
    logger.error('AdminNotifications', 'Failed to get stats', { error });
    return NextResponse.json(
      { error: 'Failed to get notification statistics' },
      { status: 500 }
    );
  }
}
