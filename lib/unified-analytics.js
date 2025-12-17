const DEBUG = process.env.DEBUG === "true" || process.env.VERBOSE === "true";
const debug = (...args) => { if (DEBUG) debug(...args); };

/**
 * Unified Analytics & Metrics System
 * Tracks events from both frontend and admin, integrates Square data
 */

import { connectToDatabase } from './db-optimized';

export const ANALYTICS_COLLECTION = 'unified_analytics';
export const METRICS_COLLECTION = 'unified_metrics';

// Event types
export const EVENT_TYPES = {
  // Product events
  PRODUCT_VIEW: 'product_view',
  PRODUCT_ADD_TO_CART: 'product_add_to_cart',
  PRODUCT_REMOVE_FROM_CART: 'product_remove_from_cart',
  
  // Checkout events
  CHECKOUT_START: 'checkout_start',
  CHECKOUT_COMPLETE: 'checkout_complete',
  CHECKOUT_ABANDON: 'checkout_abandon',
  
  // Payment events
  PAYMENT_INITIATED: 'payment_initiated',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  
  // Admin events
  ADMIN_PRODUCT_UPDATE: 'admin_product_update',
  ADMIN_INVENTORY_UPDATE: 'admin_inventory_update',
  ADMIN_PRICE_CHANGE: 'admin_price_change',
  
  // Category events
  CATEGORY_VIEW: 'category_view',
  INGREDIENT_FILTER: 'ingredient_filter',
  SEARCH_QUERY: 'search_query',
  
  // Square events
  SQUARE_ORDER_CREATED: 'square_order_created',
  SQUARE_PAYMENT_COMPLETE: 'square_payment_complete',
  SQUARE_INVENTORY_UPDATE: 'square_inventory_update'
};

/**
 * Track analytics event
 */
export async function trackEvent(eventType, eventData, metadata = {}) {
  try {
    const { db } = await connectToDatabase();
    
    const event = {
      type: eventType,
      data: eventData,
      metadata: {
        ...metadata,
        source: metadata.source || 'frontend',
        userAgent: metadata.userAgent || 'unknown',
        ip: metadata.ip || 'unknown'
      },
      timestamp: new Date(),
      processed: false
    };
    
    // Store event
    await db.collection(ANALYTICS_COLLECTION).insertOne(event);
    
    // Update real-time metrics
    await updateMetrics(eventType, eventData);
    
    return true;
  } catch (error) {
    console.error('Track event failed:', error);
    return false;
  }
}

/**
 * Update real-time metrics based on event
 */
async function updateMetrics(eventType, eventData) {
  try {
    const { db } = await connectToDatabase();
    const today = new Date().toISOString().split('T')[0];
    
    const metricUpdate = {
      date: today,
      lastUpdated: new Date()
    };
    
    // Increment counters based on event type
    const incrementFields = {};
    
    switch (eventType) {
      case EVENT_TYPES.PRODUCT_VIEW:
        incrementFields['views.total'] = 1;
        incrementFields[`views.byProduct.${eventData.productId}`] = 1;
        if (eventData.category) {
          incrementFields[`views.byCategory.${eventData.category}`] = 1;
        }
        break;
        
      case EVENT_TYPES.PRODUCT_ADD_TO_CART:
        incrementFields['cart.adds'] = 1;
        incrementFields[`cart.byProduct.${eventData.productId}`] = 1;
        break;
        
      case EVENT_TYPES.CHECKOUT_START:
        incrementFields['checkout.started'] = 1;
        break;
        
      case EVENT_TYPES.CHECKOUT_COMPLETE:
        incrementFields['checkout.completed'] = 1;
        incrementFields['revenue.orders'] = 1;
        if (eventData.total) {
          incrementFields['revenue.total'] = eventData.total;
        }
        break;
        
      case EVENT_TYPES.PAYMENT_SUCCESS:
        incrementFields['payments.success'] = 1;
        if (eventData.amount) {
          incrementFields['payments.totalAmount'] = eventData.amount;
        }
        break;
        
      case EVENT_TYPES.PAYMENT_FAILED:
        incrementFields['payments.failed'] = 1;
        break;
        
      case EVENT_TYPES.SEARCH_QUERY:
        incrementFields['search.queries'] = 1;
        incrementFields[`search.terms.${eventData.query}`] = 1;
        break;
        
      case EVENT_TYPES.INGREDIENT_FILTER:
        incrementFields['filters.ingredient'] = 1;
        incrementFields[`filters.byIngredient.${eventData.ingredient}`] = 1;
        break;
    }
    
    // Update metrics
    if (Object.keys(incrementFields).length > 0) {
      await db.collection(METRICS_COLLECTION).updateOne(
        { date: today },
        {
          $inc: incrementFields,
          $set: { lastUpdated: new Date() }
        },
        { upsert: true }
      );
    }
    
  } catch (error) {
    console.error('Update metrics failed:', error);
  }
}

/**
 * Get analytics dashboard data
 */
export async function getAnalyticsDashboard(dateRange = 7) {
  try {
    const { db } = await connectToDatabase();
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange);
    
    // Get metrics for date range
    const metrics = await db.collection(METRICS_COLLECTION)
      .find({ 
        date: { 
          $gte: startDate.toISOString().split('T')[0] 
        } 
      })
      .sort({ date: -1 })
      .toArray();
    
    // Get recent events
    const recentEvents = await db.collection(ANALYTICS_COLLECTION)
      .find({ timestamp: { $gte: startDate } })
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray();
    
    // Calculate aggregates
    const totals = metrics.reduce((acc, metric) => {
      acc.views += metric.views?.total || 0;
      acc.cartAdds += metric.cart?.adds || 0;
      acc.checkoutStarts += metric.checkout?.started || 0;
      acc.checkoutCompletes += metric.checkout?.completed || 0;
      acc.revenue += metric.revenue?.total || 0;
      acc.orders += metric.revenue?.orders || 0;
      return acc;
    }, { views: 0, cartAdds: 0, checkoutStarts: 0, checkoutCompletes: 0, revenue: 0, orders: 0 });
    
    // Calculate conversion rates
    const conversionRate = totals.views > 0 
      ? ((totals.checkoutCompletes / totals.views) * 100).toFixed(2)
      : 0;
    
    const cartConversionRate = totals.cartAdds > 0
      ? ((totals.checkoutCompletes / totals.cartAdds) * 100).toFixed(2)
      : 0;
    
    // Get top products by views
    const topProducts = await getTopProducts(dateRange);
    
    // Get top categories
    const topCategories = await getTopCategories(dateRange);
    
    return {
      dateRange,
      totals,
      conversionRate,
      cartConversionRate,
      averageOrderValue: totals.orders > 0 ? (totals.revenue / totals.orders).toFixed(2) : 0,
      metrics,
      recentEvents: recentEvents.slice(0, 20),
      topProducts,
      topCategories
    };
  } catch (error) {
    console.error('Get analytics dashboard failed:', error);
    throw error;
  }
}

/**
 * Get top products by views
 */
async function getTopProducts(dateRange = 7) {
  try {
    const { db } = await connectToDatabase();
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange);
    
    const topProducts = await db.collection(ANALYTICS_COLLECTION).aggregate([
      {
        $match: {
          type: EVENT_TYPES.PRODUCT_VIEW,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$data.productId',
          views: { $sum: 1 },
          productName: { $first: '$data.productName' }
        }
      },
      { $sort: { views: -1 } },
      { $limit: 10 }
    ]).toArray();
    
    return topProducts;
  } catch (error) {
    console.error('Get top products failed:', error);
    return [];
  }
}

/**
 * Get top categories
 */
async function getTopCategories(dateRange = 7) {
  try {
    const { db } = await connectToDatabase();
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange);
    
    const topCategories = await db.collection(ANALYTICS_COLLECTION).aggregate([
      {
        $match: {
          type: EVENT_TYPES.CATEGORY_VIEW,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$data.category',
          views: { $sum: 1 }
        }
      },
      { $sort: { views: -1 } },
      { $limit: 10 }
    ]).toArray();
    
    return topCategories;
  } catch (error) {
    console.error('Get top categories failed:', error);
    return [];
  }
}

/**
 * Track Square webhook event
 */
export async function trackSquareEvent(webhookType, eventData) {
  const eventTypeMap = {
    'order.created': EVENT_TYPES.SQUARE_ORDER_CREATED,
    'payment.updated': EVENT_TYPES.SQUARE_PAYMENT_COMPLETE,
    'inventory.count.updated': EVENT_TYPES.SQUARE_INVENTORY_UPDATE
  };
  
  const eventType = eventTypeMap[webhookType] || 'square_webhook';
  
  return trackEvent(eventType, eventData, { source: 'square_webhook' });
}

/**
 * Initialize analytics collections
 */
export async function initializeAnalytics() {
  try {
    const { db } = await connectToDatabase();
    
    // Create indexes
    await db.collection(ANALYTICS_COLLECTION).createIndex({ type: 1 });
    await db.collection(ANALYTICS_COLLECTION).createIndex({ timestamp: -1 });
    await db.collection(ANALYTICS_COLLECTION).createIndex({ 'data.productId': 1 });
    
    await db.collection(METRICS_COLLECTION).createIndex({ date: 1 }, { unique: true });
    
    debug('✅ Analytics collections initialized');
    
    return true;
  } catch (error) {
    console.error('Initialize analytics failed:', error);
    throw error;
  }
}
