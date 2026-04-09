/**
 * Push Notifications API
 * 
 * POST /api/notifications/subscribe - Subscribe to push notifications
 * POST /api/notifications/unsubscribe - Unsubscribe
 * GET  /api/notifications/preferences - Get notification preferences
 * PUT  /api/notifications/preferences - Update preferences
 * POST /api/notifications/location - Update location for geofencing
 * POST /api/notifications/test - Send test notification (admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';
import { RateLimit } from '@/lib/redis';
import {
  savePushSubscription,
  removePushSubscription,
  getNotificationPreferences,
  updateNotificationPreferences,
  sendNotification,
  NOTIFICATION_TYPES,
  sendLocationNotification
} from '@/lib/push-notifications';

/**
 * POST /api/notifications/subscribe
 * Subscribe to push notifications
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, subscription, location } = body;

    if (!email || !subscription) {
      return NextResponse.json(
        { error: 'Email and subscription data required' },
        { status: 400 }
      );
    }

    // Validate subscription object
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    // Rate limit
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    if (!RateLimit.check(`notification_subscribe:${email}`, 5, 3600)) {
      return NextResponse.json(
        { error: 'Too many subscription attempts' },
        { status: 429 }
      );
    }

    // Save subscription
    await savePushSubscription(email, subscription);

    // If location provided, check for nearby markets
    let nearbyMarkets = [];
    if (location?.lat && location?.lng) {
      const locationResult = await sendLocationNotification(email, location);
      if (locationResult.sent) {
        nearbyMarkets = [{ name: locationResult.market, distance: locationResult.distance }];
      }
    }

    // Send welcome notification
    await sendNotification(email, NOTIFICATION_TYPES.WELCOME, {});

    logger.info('NotificationsAPI', `Push subscription saved for ${email}`);

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to notifications',
      nearbyMarkets
    });
  } catch (error) {
    logger.error('NotificationsAPI', 'Failed to subscribe', { error });
    return NextResponse.json(
      { error: 'Failed to subscribe to notifications' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/subscribe
 * Unsubscribe from push notifications
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email required' },
        { status: 400 }
      );
    }

    await removePushSubscription(email);

    logger.info('NotificationsAPI', `Push subscription removed for ${email}`);

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from notifications'
    });
  } catch (error) {
    logger.error('NotificationsAPI', 'Failed to unsubscribe', { error });
    return NextResponse.json(
      { error: 'Failed to unsubscribe' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications/preferences
 * Get notification preferences
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email required' },
        { status: 400 }
      );
    }

    // Rate limit
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    if (!RateLimit.check(`notification_prefs:${email}`, 30, 60)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const prefs = await getNotificationPreferences(email);

    // Check if push is supported
    const { db } = await connectToDatabase();
    const subscription = await db.collection('push_subscriptions').findOne({
      email,
      isActive: true
    });

    return NextResponse.json({
      success: true,
      preferences: prefs,
      pushEnabled: !!subscription
    });
  } catch (error) {
    logger.error('NotificationsAPI', 'Failed to get preferences', { error });
    return NextResponse.json(
      { error: 'Failed to get preferences' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notifications/preferences
 * Update notification preferences
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, preferences } = body;

    if (!email || !preferences) {
      return NextResponse.json(
        { error: 'Email and preferences required' },
        { status: 400 }
      );
    }

    // Validate preferences
    const allowedKeys = [
      'orderUpdates',
      'marketDays',
      'newProducts',
      'flashSales',
      'nearbyMarkets',
      'subscriptionReminders',
      'emailEnabled',
      'pushEnabled',
      'smsEnabled'
    ];

    const updates = {};
    for (const key of allowedKeys) {
      if (key in preferences) {
        updates[key] = preferences[key];
      }
    }

    const updated = await updateNotificationPreferences(email, updates);

    logger.info('NotificationsAPI', `Preferences updated for ${email}`);

    return NextResponse.json({
      success: true,
      preferences: updated
    });
  } catch (error) {
    logger.error('NotificationsAPI', 'Failed to update preferences', { error });
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications/location
 * Update customer location for geofencing
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, location } = body;

    if (!email || !location?.lat || !location?.lng) {
      return NextResponse.json(
        { error: 'Email and location (lat, lng) required' },
        { status: 400 }
      );
    }

    // Rate limit - don't check location too frequently
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    if (!RateLimit.check(`location_update:${email}`, 10, 3600)) {
      return NextResponse.json(
        { error: 'Location updates limited to 10 per hour' },
        { status: 429 }
      );
    }

    // Store last known location
    const { db } = await connectToDatabase();
    await db.collection('customer_locations').updateOne(
      { email },
      {
        $set: {
          email,
          location,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    // Check for nearby markets
    const result = await sendLocationNotification(email, location);

    logger.info('NotificationsAPI', `Location updated for ${email}`, {
      lat: location.lat,
      lng: location.lng,
      notificationSent: result.sent
    });

    return NextResponse.json({
      success: true,
      locationUpdated: true,
      notification: result
    });
  } catch (error) {
    logger.error('NotificationsAPI', 'Failed to update location', { error });
    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    );
  }
}
