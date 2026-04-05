/**
 * Hardened Analytics Admin API
 * 
 * Security: Query cost limits, timeout protection, input sanitization, RBAC
 * This endpoint is heavily protected against expensive queries and injection attacks.
 */

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { PERMISSIONS } from '@/lib/security';
import { withAdminMiddleware, AuthenticatedRequest } from '@/lib/middleware/admin';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Query timeout in milliseconds
const QUERY_TIMEOUT_MS = 10000; // 10 seconds max

// Maximum date range in days
const MAX_DATE_RANGE_DAYS = 365; // 1 year max

// Validation schema for analytics queries
const AnalyticsQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  type: z.enum(['sales', 'orders', 'customers', 'products', 'revenue']).default('sales'),
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
  limit: z.coerce.number().int().min(1).max(1000).default(365),
}).strict();

/**
 * GET /api/admin/analytics
 * Get analytics data with strict query protection
 */
export const GET = withAdminMiddleware(
  async (request: AuthenticatedRequest) => {
    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const validation = AnalyticsQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries())
    );
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors.map(e => e.message).join('; ') },
        { status: 400 }
      );
    }
    
    const { startDate, endDate, type, groupBy, limit } = validation.data;
    
    // Validate date range
    let start: Date;
    let end: Date;
    
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      
      // Ensure valid dates
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Invalid date format' },
          { status: 400 }
        );
      }
      
      // Ensure start <= end
      if (start > end) {
        return NextResponse.json(
          { success: false, error: 'Start date must be before end date' },
          { status: 400 }
        );
      }
      
      // Limit date range
      const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > MAX_DATE_RANGE_DAYS) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Date range exceeds maximum of ${MAX_DATE_RANGE_DAYS} days`,
          },
          { status: 400 }
        );
      }
    } else {
      // Default: last 30 days
      end = new Date();
      start = new Date();
      start.setDate(start.getDate() - 30);
    }
    
    try {
      const { db } = await connectToDatabase();
      
      // Execute query with timeout protection
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), QUERY_TIMEOUT_MS);
      });
      
      let result: unknown;
      
      switch (type) {
        case 'sales':
          result = await Promise.race([
            getSalesAnalytics(db, start, end, groupBy, limit),
            timeoutPromise,
          ]);
          break;
          
        case 'orders':
          result = await Promise.race([
            getOrdersAnalytics(db, start, end, groupBy, limit),
            timeoutPromise,
          ]);
          break;
          
        case 'customers':
          result = await Promise.race([
            getCustomerAnalytics(db, start, end, limit),
            timeoutPromise,
          ]);
          break;
          
        case 'products':
          result = await Promise.race([
            getProductAnalytics(db, start, end, limit),
            timeoutPromise,
          ]);
          break;
          
        case 'revenue':
          result = await Promise.race([
            getRevenueAnalytics(db, start, end, groupBy, limit),
            timeoutPromise,
          ]);
          break;
          
        default:
          return NextResponse.json(
            { success: false, error: 'Invalid analytics type' },
            { status: 400 }
          );
      }
      
      logger.info('ANALYTICS', 'Analytics query executed', {
        type,
        groupBy,
        dateRange: `${start.toISOString()} to ${end.toISOString()}`,
      });
      
      return NextResponse.json({
        success: true,
        type,
        dateRange: { start: start.toISOString(), end: end.toISOString() },
        data: result,
      });
      
    } catch (error) {
      if (error instanceof Error && error.message === 'Query timeout') {
        logger.error('ANALYTICS', 'Query timeout', { type, startDate, endDate });
        return NextResponse.json(
          { success: false, error: 'Query took too long. Try a smaller date range.' },
          { status: 504 }
        );
      }
      
      logger.error('ANALYTICS', 'Analytics query failed', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch analytics' },
        { status: 500 }
      );
    }
  },
  {
    permission: PERMISSIONS.ANALYTICS_VIEW,
    resource: 'analytics',
    action: 'view',
    rateLimit: { maxRequests: 30, windowSeconds: 60 },
  }
);

// ============================================================================
// Analytics Query Functions
// ============================================================================

async function getSalesAnalytics(
  db: any,
  start: Date,
  end: Date,
  groupBy: string,
  limit: number
) {
  const dateFormat = {
    day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
    week: { $dateToString: { format: '%Y-W%U', date: '$createdAt' } },
    month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
  };
  
  const pipeline = [
    {
      $match: {
        createdAt: { $gte: start.toISOString(), $lte: end.toISOString() },
        status: { $nin: ['cancelled', 'refunded'] },
      },
    },
    {
      $group: {
        _id: dateFormat[groupBy as keyof typeof dateFormat],
        sales: { $sum: '$total' },
        orders: { $sum: 1 },
        averageOrderValue: { $avg: '$total' },
      },
    },
    { $sort: { _id: 1 } },
    { $limit: limit },
  ];
  
  return await db.collection('orders').aggregate(pipeline).toArray();
}

async function getOrdersAnalytics(
  db: any,
  start: Date,
  end: Date,
  groupBy: string,
  limit: number
) {
  const pipeline = [
    {
      $match: {
        createdAt: { $gte: start.toISOString(), $lte: end.toISOString() },
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        total: { $sum: '$total' },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
  ];
  
  const byStatus = await db.collection('orders').aggregate(pipeline).toArray();
  
  // Get orders by fulfillment type
  const byFulfillment = await db.collection('orders').aggregate([
    {
      $match: {
        createdAt: { $gte: start.toISOString(), $lte: end.toISOString() },
      },
    },
    {
      $group: {
        _id: '$fulfillmentType',
        count: { $sum: 1 },
      },
    },
  ]).toArray();
  
  return { byStatus, byFulfillment };
}

async function getCustomerAnalytics(
  db: any,
  start: Date,
  end: Date,
  limit: number
) {
  // New customers in period
  const newCustomers = await db.collection('customers').countDocuments({
    createdAt: { $gte: start.toISOString(), $lte: end.toISOString() },
  });
  
  // Active customers (made purchase)
  const activeCustomers = await db.collection('orders').distinct('customerId', {
    createdAt: { $gte: start.toISOString(), $lte: end.toISOString() },
  });
  
  // Customers by rewards tier
  const byRewards = await db.collection('customers').aggregate([
    {
      $group: {
        _id: '$rewards.tier',
        count: { $sum: 1 },
      },
    },
    { $limit: limit },
  ]).toArray();
  
  return {
    newCustomers,
    activeCustomers: activeCustomers.length,
    byRewards,
  };
}

async function getProductAnalytics(
  db: any,
  start: Date,
  end: Date,
  limit: number
) {
  // Top selling products
  const pipeline = [
    {
      $match: {
        createdAt: { $gte: start.toISOString(), $lte: end.toISOString() },
        status: { $nin: ['cancelled', 'refunded'] },
      },
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        name: { $first: '$items.name' },
        quantity: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
      },
    },
    { $sort: { quantity: -1 } },
    { $limit: limit },
  ];
  
  return await db.collection('orders').aggregate(pipeline).toArray();
}

async function getRevenueAnalytics(
  db: any,
  start: Date,
  end: Date,
  groupBy: string,
  limit: number
) {
  const dateFormat = {
    day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
    week: { $dateToString: { format: '%Y-W%U', date: '$createdAt' } },
    month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
  };
  
  // Revenue over time
  const pipeline = [
    {
      $match: {
        createdAt: { $gte: start.toISOString(), $lte: end.toISOString() },
        status: { $nin: ['cancelled', 'refunded'] },
      },
    },
    {
      $group: {
        _id: dateFormat[groupBy as keyof typeof dateFormat],
        revenue: { $sum: '$total' },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $limit: limit },
  ];
  
  const revenueByPeriod = await db.collection('orders').aggregate(pipeline).toArray();
  
  // Summary stats
  const summary = await db.collection('orders').aggregate([
    {
      $match: {
        createdAt: { $gte: start.toISOString(), $lte: end.toISOString() },
        status: { $nin: ['cancelled', 'refunded'] },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$total' },
        totalOrders: { $sum: 1 },
        averageOrder: { $avg: '$total' },
        minOrder: { $min: '$total' },
        maxOrder: { $max: '$total' },
      },
    },
  ]).toArray();
  
  return {
    byPeriod: revenueByPeriod,
    summary: summary[0] || null,
  };
}
