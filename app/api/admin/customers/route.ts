/**
 * Hardened Customers Admin API
 * 
 * Security: PII protection, RBAC, input validation, rate limiting, audit logging
 * Note: This endpoint has strict PII protections
 */

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { PERMISSIONS } from '@/lib/security';
import { withAdminMiddleware, AuthenticatedRequest } from '@/lib/middleware/admin';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Validation schemas
const CustomerQuerySchema = z.object({
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sortBy: z.enum(['createdAt', 'name', 'email', 'lastOrderDate']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  hasOrders: z.enum(['true', 'false']).optional(),
  rewardsTier: z.enum(['bronze', 'silver', 'gold', 'platinum']).optional(),
}).strict();

/**
 * GET /api/admin/customers
 * List customers with PII protection
 */
export const GET = withAdminMiddleware(
  async (request: AuthenticatedRequest) => {
    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const validation = CustomerQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries())
    );
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors.map(e => e.message).join('; ') },
        { status: 400 }
      );
    }
    
    const { search, page, limit, sortBy, sortOrder, hasOrders, rewardsTier } = validation.data;
    const skip = (page - 1) * limit;
    
    try {
      const { db } = await connectToDatabase();
      
      // Build query
      const query: Record<string, unknown> = {};
      
      if (search) {
        // Safe partial match with escaped regex
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.$or = [
          { name: { $regex: escapedSearch, $options: 'i' } },
          { email: { $regex: escapedSearch, $options: 'i' } },
        ];
      }
      
      if (hasOrders !== undefined) {
        query.orderCount = hasOrders === 'true' ? { $gt: 0 } : { $eq: 0 };
      }
      
      if (rewardsTier) {
        query['rewards.tier'] = rewardsTier;
      }
      
      // Whitelist sort fields
      const sortFieldMap: Record<string, string> = {
        createdAt: 'createdAt',
        name: 'name',
        email: 'email',
        lastOrderDate: 'lastOrderDate',
      };
      
      const sortField = sortFieldMap[sortBy] || 'createdAt';
      
      // Get customers with pagination
      const [customers, total] = await Promise.all([
        db.collection('customers')
          .find(query)
          .sort({ [sortField]: sortOrder === 'asc' ? 1 : -1 })
          .skip(skip)
          .limit(limit)
          .project({
            _id: 1,
            id: 1,
            name: 1,
            // Email masked for list view
            email: { 
              $concat: [
                { $substr: ['$email', 0, 2] },
                '***',
                { $substr: ['$email', { $indexOfBytes: ['$email', '@'] }, -1] }
              ]
            },
            createdAt: 1,
            rewards: 1,
            orderCount: 1,
            totalSpent: 1,
            lastOrderDate: 1,
            // Exclude: phone, address, full email history, etc.
          })
          .toArray(),
        db.collection('customers').countDocuments(query),
      ]);
      
      // Get summary stats
      const statsAgg = await db.collection('customers').aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            withOrders: { $sum: { $cond: [{ $gt: ['$orderCount', 0] }, 1, 0] } },
            avgOrders: { $avg: '$orderCount' },
            totalRevenue: { $sum: '$totalSpent' },
          },
        },
      ]).toArray();
      
      const stats = statsAgg[0] || {
        total: 0,
        withOrders: 0,
        avgOrders: 0,
        totalRevenue: 0,
      };
      
      return NextResponse.json({
        success: true,
        customers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        stats: {
          totalCustomers: stats.total,
          customersWithOrders: stats.withOrders,
          averageOrdersPerCustomer: Math.round(stats.avgOrders * 10) / 10,
          totalRevenue: stats.totalRevenue,
        },
      });
      
    } catch (error) {
      logger.error('CUSTOMERS', 'Failed to fetch customers', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch customers' },
        { status: 500 }
      );
    }
  },
  {
    permission: PERMISSIONS.CUSTOMERS_VIEW,
    resource: 'customers',
    action: 'list',
    rateLimit: { maxRequests: 100, windowSeconds: 60 },
  }
);

/**
 * POST /api/admin/customers
 * Export customer data (with permission check)
 */
export const POST = withAdminMiddleware(
  async (request: AuthenticatedRequest) => {
    const admin = request.admin;
    
    try {
      const body = await request.json();
      const { action, filters = {} } = body;
      
      if (action === 'export') {
        // Check export permission
        if (!['super_admin', 'admin'].includes(admin.role)) {
          return NextResponse.json(
            { success: false, error: 'Export requires admin or higher role' },
            { status: 403 }
          );
        }
        
        const { db } = await connectToDatabase();
        
        // Build export query (same filters as GET)
        const query: Record<string, unknown> = {};
        
        if (filters.search) {
          const escapedSearch = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          query.$or = [
            { name: { $regex: escapedSearch, $options: 'i' } },
            { email: { $regex: escapedSearch, $options: 'i' } },
          ];
        }
        
        if (filters.rewardsTier) {
          query['rewards.tier'] = filters.rewardsTier;
        }
        
        // Limit export size
        const customers = await db.collection('customers')
          .find(query)
          .limit(10000)
          .project({
            _id: 0,
            id: 1,
            name: 1,
            email: 1,
            createdAt: 1,
            rewards: 1,
            orderCount: 1,
            totalSpent: 1,
            // Exclude sensitive fields
            password: 0,
            passwordHash: 0,
            internalNotes: 0,
          })
          .toArray();
        
        logger.info('CUSTOMERS', `Customer export by ${admin.email}`, {
          count: customers.length,
        });
        
        return NextResponse.json({
          success: true,
          count: customers.length,
          exportedAt: new Date().toISOString(),
          customers,
        });
      }
      
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
      
    } catch (error) {
      logger.error('CUSTOMERS', 'Export failed', error);
      return NextResponse.json(
        { success: false, error: 'Export failed' },
        { status: 500 }
      );
    }
  },
  {
    permission: PERMISSIONS.CUSTOMERS_EXPORT,
    resource: 'customers',
    action: 'export',
    rateLimit: { maxRequests: 10, windowSeconds: 60 },
  }
);
