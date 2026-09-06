export const dynamic = 'force-dynamic';

/**
 * Hardened Customers Admin API
 * 
 * Security: PII protection, RBAC, input validation, rate limiting, audit logging
 * Note: This endpoint has strict PII protections
 */

import { NextResponse } from 'next/server';
import { exportCustomers, listAdminCustomers } from '@/lib/customers/repository';
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
    try {
      const { customers, total, stats } = await listAdminCustomers({ search, page, limit, sortBy, sortOrder, hasOrders, rewardsTier });
      
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
        
        const customers = await exportCustomers(filters);
        
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
