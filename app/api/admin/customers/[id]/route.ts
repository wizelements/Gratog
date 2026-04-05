/**
 * Hardened Individual Customer API
 * 
 * Security: PII protection, strict access controls
 */

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/db-optimized';
import { PERMISSIONS } from '@/lib/security';
import { withAdminMiddlewareWithContext, AuthenticatedRequest } from '@/lib/middleware/admin';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/customers/[id]
 * Get customer details with full PII (requires explicit permission)
 */
export const GET = withAdminMiddlewareWithContext(
  async (request: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
    const params = await context.params;
    const customerId = params.id;
    
    try {
      // Validate ID format
      if (!ObjectId.isValid(customerId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid customer ID format' },
          { status: 400 }
        );
      }
      
      const { db } = await connectToDatabase();
      
      const customer = await db.collection('customers').findOne(
        { _id: new ObjectId(customerId) },
        {
          projection: {
            password: 0,
            passwordHash: 0,
            internalNotes: 0,
            // Keep other fields for detailed view
          },
        }
      );
      
      if (!customer) {
        return NextResponse.json(
          { success: false, error: 'Customer not found' },
          { status: 404 }
        );
      }
      
      // Get recent orders
      const recentOrders = await db.collection('orders')
        .find({ customerId })
        .sort({ createdAt: -1 })
        .limit(10)
        .project({
          id: 1,
          orderNumber: 1,
          status: 1,
          total: 1,
          createdAt: 1,
          items: { $slice: ['$items', 3] }, // Limit items
        })
        .toArray();
      
      return NextResponse.json({
        success: true,
        customer: {
          ...customer,
          _id: customer._id.toString(),
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
