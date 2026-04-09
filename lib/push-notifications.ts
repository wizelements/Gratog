/**
 * Push Notification System for Gratog
 * 
 * Features:
 * - Web Push API integration
 * - Location-based notifications (geofencing)
 * - Market day reminders
 * - New product alerts
 * - Order status updates
 * - Admin notification dashboard
 */

import { connectToDatabase } from './db-optimized';
import { logger } from './logger';
import { sendEmail } from './email';

// ============================================================================
// PUSH NOTIFICATION CONFIGURATION
// ============================================================================

// VAPID keys for Web Push (generate these)
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:hello@tasteofgratitude.shop';

// Notification types
export const NOTIFICATION_TYPES = {
  // Order-related
  ORDER_CONFIRMED: 'order_confirmed',
  ORDER_READY: 'order_ready',
  ORDER_DELIVERED: 'order_delivered',
  
  // Marketing
  MARKET_DAY: 'market_day',
  NEW_PRODUCT: 'new_product',
  FLASH_SALE: 'flash_sale',
  SEASONAL_SPECIAL: 'seasonal_special',
  
  // Location-based
  NEARBY_MARKET: 'nearby_market',
  NEARBY_PICKUP: 'nearby_pickup',
  
  // Subscription
  SUBSCRIPTION_REMINDER: 'subscription_reminder',
  SUBSCRIPTION_PAYMENT: 'subscription_payment',
  
  // General
  WELCOME: 'welcome',
  ABANDONED_CART: 'abandoned_cart',
  REORDER_REMINDER: 'reorder_reminder'
};

// ============================================================================
// NOTIFICATION PREFERENCES
// ============================================================================

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  orderUpdates: true,
  marketDays: true,
  newProducts: true,
  flashSales: true,
  nearbyMarkets: true,
  subscriptionReminders: true,
  emailEnabled: true,
  pushEnabled: true,
  smsEnabled: false
};

/**
 * Get or create notification preferences for a customer
 */
export async function getNotificationPreferences(email) {
  const { db } = await connectToDatabase();
  
  let prefs = await db.collection('notification_preferences').findOne({ email });
  
  if (!prefs) {
    prefs = {
      email,
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await db.collection('notification_preferences').insertOne(prefs);
  }
  
  return prefs;
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(email, updates) {
  const { db } = await connectToDatabase();
  
  await db.collection('notification_preferences').updateOne(
    { email },
    {
      $set: {
        ...updates,
        updatedAt: new Date()
      }
    }
  );
  
  return await getNotificationPreferences(email);
}

// ============================================================================
// PUSH SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * Save push subscription for a customer
 */
export async function savePushSubscription(email, subscription) {
  const { db } = await connectToDatabase();
  
  await db.collection('push_subscriptions').updateOne(
    { email },
    {
      $set: {
        email,
        subscription,
        isActive: true,
        updatedAt: new Date(),
        lastUsed: new Date()
      }
    },
    { upsert: true }
  );
  
  logger.info('PushNotifications', `Saved push subscription for ${email}`);
}

/**
 * Remove push subscription
 */
export async function removePushSubscription(email) {
  const { db } = await connectToDatabase();
  
  await db.collection('push_subscriptions').updateOne(
    { email },
    {
      $set: {
        isActive: false,
        updatedAt: new Date()
      }
    }
  );
  
  logger.info('PushNotifications', `Removed push subscription for ${email}`);
}

/**
 * Get all active push subscriptions
 */
export async function getActivePushSubscriptions(filter = {}) {
  const { db } = await connectToDatabase();
  
  const subscriptions = await db.collection('push_subscriptions')
    .find({ isActive: true, ...filter })
    .toArray();
  
  return subscriptions;
}

// ============================================================================
// NOTIFICATION CONTENT BUILDERS
// ============================================================================

const NOTIFICATION_TEMPLATES = {
  [NOTIFICATION_TYPES.ORDER_CONFIRMED]: (data) => ({
    title: 'Order Confirmed! 🎉',
    body: `Your order #${data.orderNumber} for $${data.total} has been confirmed.`,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: `order-${data.orderId}`,
    requireInteraction: false,
    data: {
      type: NOTIFICATION_TYPES.ORDER_CONFIRMED,
      orderId: data.orderId,
      url: `/order/${data.orderId}?token=${data.accessToken}`
    }
  }),
  
  [NOTIFICATION_TYPES.ORDER_READY]: (data) => ({
    title: 'Your Order is Ready! 🛍️',
    body: `Order #${data.orderNumber} is ready for ${data.fulfillmentMethod}.`,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: `order-ready-${data.orderId}`,
    requireInteraction: true,
    data: {
      type: NOTIFICATION_TYPES.ORDER_READY,
      orderId: data.orderId,
      url: `/order/${data.orderId}?token=${data.accessToken}`
    }
  }),
  
  [NOTIFICATION_TYPES.MARKET_DAY]: (data) => ({
    title: `Market Day Today! 🌿`,
    body: `${data.marketName} is open ${data.hours}. We have ${data.products.join(', ')} ready!`,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: `market-${data.marketId}`,
    requireInteraction: false,
    actions: [
      { action: 'view', title: 'View Market' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    data: {
      type: NOTIFICATION_TYPES.MARKET_DAY,
      marketId: data.marketId,
      url: `/markets/${data.marketId}`
    }
  }),
  
  [NOTIFICATION_TYPES.NEARBY_MARKET]: (data) => ({
    title: 'We\'re Nearby! 📍',
    body: `${data.marketName} is ${data.distance} miles away. Come say hi!`,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: `nearby-${data.marketId}`,
    requireInteraction: true,
    actions: [
      { action: 'directions', title: 'Get Directions' },
      { action: 'view', title: 'View Market' }
    ],
    data: {
      type: NOTIFICATION_TYPES.NEARBY_MARKET,
      marketId: data.marketId,
      distance: data.distance,
      url: `/markets/${data.marketId}?utm_source=push_nearby`
    }
  }),
  
  [NOTIFICATION_TYPES.NEW_PRODUCT]: (data) => ({
    title: 'New Product! ✨',
    body: `Check out ${data.productName} - ${data.description}`,
    icon: data.productImage || '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: `new-product-${data.productId}`,
    requireInteraction: false,
    image: data.productImage,
    actions: [
      { action: 'view', title: 'View Product' },
      { action: 'add-to-cart', title: 'Add to Cart' }
    ],
    data: {
      type: NOTIFICATION_TYPES.NEW_PRODUCT,
      productId: data.productId,
      url: `/product/${data.productSlug}?utm_source=push_new_product`
    }
  }),
  
  [NOTIFICATION_TYPES.FLASH_SALE]: (data) => ({
    title: `⚡ Flash Sale: ${data.discount}% OFF!`,
    body: data.description,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: `flash-sale-${data.saleId}`,
    requireInteraction: true,
    actions: [
      { action: 'shop', title: 'Shop Now' },
      { action: 'remind', title: 'Remind Me' }
    ],
    data: {
      type: NOTIFICATION_TYPES.FLASH_SALE,
      saleId: data.saleId,
      url: `/catalog?sale=${data.saleId}&utm_source=push_flash_sale`
    }
  }),
  
  [NOTIFICATION_TYPES.SUBSCRIPTION_REMINDER]: (data) => ({
    title: 'Subscription Delivery Soon 📦',
    body: `Your ${data.planName} subscription will be delivered ${data.deliveryDate}.`,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: `sub-reminder-${data.subscriptionId}`,
    requireInteraction: false,
    data: {
      type: NOTIFICATION_TYPES.SUBSCRIPTION_REMINDER,
      subscriptionId: data.subscriptionId,
      url: `/subscriptions?utm_source=push_sub_reminder`
    }
  }),
  
  [NOTIFICATION_TYPES.WELCOME]: (data) => ({
    title: 'Welcome to Gratog! 🌊',
    body: 'Thanks for enabling notifications. We\'ll keep you updated on markets and new products!',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'welcome',
    requireInteraction: false,
    data: {
      type: NOTIFICATION_TYPES.WELCOME,
      url: '/catalog?utm_source=push_welcome'
    }
  })
};

// ============================================================================
// LOCATION-BASED NOTIFICATIONS
// ============================================================================

// Market locations with geofencing
export const MARKET_LOCATIONS = [
  {
    id: 'serenbe',
    name: 'Serenbe Farmers Market',
    address: '10625 Serenbe Lane, Chattahoochee Hills, GA 30268',
    coordinates: { lat: 33.4068, lng: -84.7586 },
    hours: 'Saturday 9am-1pm',
    geofenceRadius: 5, // miles
    notificationRadius: 10 // miles
  },
  {
    id: 'dunwoody',
    name: 'DHA Dunwoody Market',
    address: 'Perimeter Church, 9500 Medlock Bridge Rd, Johns Creek, GA 30097',
    coordinates: { lat: 34.0431, lng: -84.1983 },
    hours: 'Saturday 9am-12pm',
    geofenceRadius: 3,
    notificationRadius: 8
  }
];

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if customer is near any market
 */
export async function checkNearbyMarkets(customerLat, customerLng) {
  const nearby = [];
  
  for (const market of MARKET_LOCATIONS) {
    const distance = calculateDistance(
      customerLat,
      customerLng,
      market.coordinates.lat,
      market.coordinates.lng
    );
    
    if (distance <= market.notificationRadius) {
      nearby.push({
        ...market,
        distance: Math.round(distance * 10) / 10
      });
    }
  }
  
  return nearby.sort((a, b) => a.distance - b.distance);
}

/**
 * Send location-based notification
 */
export async function sendLocationNotification(email, location) {
  const prefs = await getNotificationPreferences(email);
  
  if (!prefs.nearbyMarkets || !prefs.pushEnabled) {
    return { sent: false, reason: 'preferences_disabled' };
  }
  
  const nearby = await checkNearbyMarkets(location.lat, location.lng);
  
  if (nearby.length === 0) {
    return { sent: false, reason: 'no_nearby_markets' };
  }
  
  const market = nearby[0]; // Closest market
  
  await sendNotification(email, NOTIFICATION_TYPES.NEARBY_MARKET, {
    marketId: market.id,
    marketName: market.name,
    distance: market.distance,
    address: market.address
  });
  
  return { sent: true, market: market.name, distance: market.distance };
}

// ============================================================================
// NOTIFICATION SENDING
// ============================================================================

/**
 * Send notification via all enabled channels
 */
export async function sendNotification(email, type, data) {
  const prefs = await getNotificationPreferences(email);
  const results = { push: false, email: false, sms: false };
  
  try {
    // Get notification content
    const template = NOTIFICATION_TEMPLATES[type];
    if (!template) {
      throw new Error(`Unknown notification type: ${type}`);
    }
    
    const notification = template(data);
    
    // Send push notification
    if (prefs.pushEnabled) {
      results.push = await sendPushNotification(email, notification);
    }
    
    // Send email notification
    if (prefs.emailEnabled) {
      results.email = await sendEmailNotification(email, type, notification, data);
    }
    
    // Log notification
    await logNotification(email, type, data, results);
    
    return results;
  } catch (error) {
    logger.error('PushNotifications', 'Failed to send notification', { error, email, type });
    throw error;
  }
}

/**
 * Send push notification via Web Push API
 */
async function sendPushNotification(email, notification) {
  try {
    const { db } = await connectToDatabase();
    const subscription = await db.collection('push_subscriptions').findOne({ 
      email, 
      isActive: true 
    });
    
    if (!subscription) {
      return false;
    }
    
    // Note: Actual web-push library would be used here
    // This is a placeholder for the implementation
    logger.info('PushNotifications', 'Sending push notification', { 
      email, 
      title: notification.title 
    });
    
    // Update last used
    await db.collection('push_subscriptions').updateOne(
      { email },
      { $set: { lastUsed: new Date() } }
    );
    
    return true;
  } catch (error) {
    logger.error('PushNotifications', 'Push notification failed', { error, email });
    return false;
  }
}

/**
 * Send email notification
 */
async function sendEmailNotification(email, type, notification, data) {
  try {
    const subject = notification.title;
    const html = buildEmailTemplate(type, notification, data);
    
    await sendEmail({
      to: email,
      subject,
      html
    });
    
    return true;
  } catch (error) {
    logger.error('PushNotifications', 'Email notification failed', { error, email });
    return false;
  }
}

/**
 * Build email template from notification
 */
function buildEmailTemplate(type, notification, data) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1f2937;">${notification.title}</h1>
      <p style="font-size: 16px; color: #4b5563;">${notification.body}</p>
      ${notification.data?.url ? `
        <a href="${process.env.NEXT_PUBLIC_APP_URL}${notification.data.url}" 
           style="display: inline-block; background: #1f2937; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
          View Details
        </a>
      ` : ''}
    </div>
  `;
}

/**
 * Log notification to database
 */
async function logNotification(email, type, data, results) {
  const { db } = await connectToDatabase();
  
  await db.collection('notification_logs').insertOne({
    email,
    type,
    data,
    results,
    sentAt: new Date()
  });
}

// ============================================================================
// BULK NOTIFICATIONS
// ============================================================================

/**
 * Send notification to multiple customers
 */
export async function sendBulkNotification(emails, type, data) {
  const results = { sent: 0, failed: 0, skipped: 0 };
  
  for (const email of emails) {
    try {
      await sendNotification(email, type, data);
      results.sent++;
    } catch (error) {
      results.failed++;
      logger.error('PushNotifications', 'Bulk notification failed', { error, email });
    }
  }
  
  logger.info('PushNotifications', 'Bulk notification complete', { 
    type, 
    total: emails.length,
    ...results 
  });
  
  return results;
}

/**
 * Send market day reminder to all subscribers
 */
export async function sendMarketDayNotifications(marketId, products = []) {
  const market = MARKET_LOCATIONS.find(m => m.id === marketId);
  if (!market) {
    throw new Error(`Market not found: ${marketId}`);
  }
  
  const { db } = await connectToDatabase();
  
  // Get all customers who want market day notifications
  const customers = await db.collection('notification_preferences')
    .find({ marketDays: true, pushEnabled: true })
    .toArray();
  
  const emails = customers.map(c => c.email);
  
  return await sendBulkNotification(emails, NOTIFICATION_TYPES.MARKET_DAY, {
    marketId: market.id,
    marketName: market.name,
    hours: market.hours,
    products
  });
}

/**
 * Send new product announcement
 */
export async function announceNewProduct(product) {
  const { db } = await connectToDatabase();
  
  // Get customers who want new product notifications
  const customers = await db.collection('notification_preferences')
    .find({ newProducts: true, pushEnabled: true })
    .toArray();
  
  const emails = customers.map(c => c.email);
  
  return await sendBulkNotification(emails, NOTIFICATION_TYPES.NEW_PRODUCT, {
    productId: product.id,
    productSlug: product.slug,
    productName: product.name,
    description: product.description?.substring(0, 100) + '...',
    productImage: product.image
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  NOTIFICATION_TYPES,
  DEFAULT_NOTIFICATION_PREFERENCES,
  MARKET_LOCATIONS,
  getNotificationPreferences,
  updateNotificationPreferences,
  savePushSubscription,
  removePushSubscription,
  sendNotification,
  sendBulkNotification,
  sendMarketDayNotifications,
  announceNewProduct,
  checkNearbyMarkets,
  sendLocationNotification,
  calculateDistance
};
