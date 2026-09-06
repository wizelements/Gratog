export const dynamic = 'force-dynamic';

/**
 * Hardened Individual Customer API
 * 
 * Security: PII protection, strict access controls
 */

import { NextResponse } from 'next/server';
import { getAdminCustomer, listRecentCustomerOrders } from '@/lib/customers/repository';
import { PERMISSIONS } from '@/lib/security';
import { withAdminMiddlewareWithContext, AuthenticatedRequest } from '@/lib/middleware/admin';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/customers/[id]
 * Get customer details with full PII (requires explicit permission)
 */
export const GET = withAdminMiddlewareWithContext(
  async (_request: AuthenticatedRequest, context: { params: Promise<Record<string, string>> }) => {
    const params = await context.params;
    const customerId = params.id;
    
    try {
      if (!customerId || customerId.length > 200) {
        return NextResponse.json(
          { success: false, error: 'Invalid customer ID format' },
          { status: 400 }
        );
      }
      
      const customer = await getAdminCustomer(customerId);
      
      if (!customer) {
        return NextResponse.json(
          { success: false, error: 'Customer not found' },
          { status: 404 }
        );
      }
      
      // Get recent orders
      const recentOrders = await listRecentCustomerOrders(customerId);
      
      return NextResponse.json({
        success: true,
        customer: {
          ...customer,
        },
        recentOrders,
      });
      
    } catch (error) {
      logger.error('CUSTOMERS', 'Failed to fetch customer', { customerId, error });
      return NextResponse.json(
        { success: false, error: 'Failed to fetch customer' },
        { status: 500 }
      );
    }
  },
  {
    permission: PERMISSIONS.CUSTOMERS_VIEW,
    resource: 'customers',
    action: 'view',
    rateLimit: { maxRequests: 100, windowSeconds: 60 },
  }
);
