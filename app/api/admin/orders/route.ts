import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { PERMISSIONS } from '@/lib/security';
import { withAdminMiddleware, AuthenticatedRequest } from '@/lib/middleware/admin';
import { logger } from '@/lib/logger';

// ============================================================================
// GET - List orders with filtering
// ============================================================================

export const GET = withAdminMiddleware(
  async (request: AuthenticatedRequest) => {
    const { searchParams } = new URL(request.url);
    
    // Parse and validate query parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const status = searchParams.get('status')?.trim();
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search')?.trim();
    const fulfillmentType = searchParams.get('fulfillmentType')?.trim();
    const skip = (page - 1) * limit;
    
    try {
      const { db } = await connectToDatabase();
      
      // Build query
      const query: Record<string, unknown> = {};
      
      // Status filter with whitelist
      if (status) {
        const allowedStatuses = [
          'pending', 'confirmed', 'preparing', 'ready', 
          'delivered', 'picked_up', 'shipped', 'cancelled', 'refunded'
        ];
        if (allowedStatuses.includes(status)) {
          query.status = status;
        }
      }
      
      // Fulfillment type filter
      if (fulfillmentType) {
        const allowedTypes = ['pickup', 'delivery', 'shipping'];
        if (allowedTypes.includes(fulfillmentType)) {
          query.fulfillmentType = fulfillmentType;
        }
      }
      
      // Date range filter
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          const parsedStart = new Date(startDate);
          if (!isNaN(parsedStart.getTime())) {
            query.createdAt.$gte = parsedStart.toISOString();
          }
        }
        if (endDate) {
          const parsedEnd = new Date(endDate);
          if (!isNaN(parsedEnd.getTime())) {
            query.createdAt.$lte = parsedEnd.toISOString();
          }
        }
      }
      
      // Search by order number or customer
      if (search) {
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.$or = [
          { orderNumber: { $regex: escapedSearch, $options: 'i' } },
          { customerName: { $regex: escapedSearch, $options: 'i' } },
          { customerEmail: { $regex: escapedSearch, $options: 'i' } },
        ];
      }
      
      // Get orders with pagination
      const [orders, total] = await Promise.all([
        db.collection('orders')
          .find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        db.collection('orders').countDocuments(query),
      ]);
      
      // Sanitize orders for admin view
      const sanitizedOrders = orders.map(order => ({
        _id: order._id?.toString(),
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        fulfillmentType: order.fulfillmentType,
        customerName: order.customerName,
        customerEmail: order.customerEmail?.replace(/(.{2}).*(@)/, '$1***$2'), // Mask email
        total: order.total,
        items: order.items?.map((item: { name: string; quantity: number }) => ({
          name: item.name,
          quantity: item.quantity,
        })),
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        squareOrderId: order.squareOrderId,
      }));
      
      // Get summary stats
      const statsAgg = await db.collection('orders').aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total' },
            totalOrders: { $sum: 1 },
            pendingOrders: {
              $sum: {
                $cond: [{ $in: ['$status', ['pending', 'confirmed', 'preparing']] }, 1, 0],
              },
            },
            todayOrders: {
              $sum: {
                $cond: [
                  { $gte: ['$createdAt', new Date().toISOString().split('T')[0]] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]).toArray();
      
      const stats = statsAgg[0] || {
        totalRevenue: 0,
        totalOrders: 0,
        pendingOrders: 0,
        todayOrders: 0,
      };
      
      return NextResponse.json({
        success: true,
        orders: sanitizedOrders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        stats: {
          totalRevenue: stats.totalRevenue,
          totalOrders: stats.totalOrders,
          pendingOrders: stats.pendingOrders,
          todayOrders: stats.todayOrders,
        },
      });
      
    } catch (error) {
      logger.error('ORDERS', 'Failed to fetch orders', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }
  },
  {
    permission: PERMISSIONS.ORDERS_VIEW,
    resource: 'orders',
    action: 'list',
  }
);

// ============================================================================
// PATCH - Bulk update order status
// ============================================================================

export const PATCH = withAdminMiddleware(
  async (request: AuthenticatedRequest) => {
    const admin = request.admin;
    
    try {
      const body = await request.json();
      const { orderIds, status, notes } = body;
      
      // Validate inputs
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Order IDs array is required' },
          { status: 400 }
        );
      }
      
      if (orderIds.length > 100) {
        return NextResponse.json(
          { success: false, error: 'Maximum 100 orders can be updated at once' },
          { status: 400 }
        );
      }
      
      // Whitelist allowed statuses
      const allowedStatuses = [
        'pending', 'confirmed', 'preparing', 'ready', 
        'delivered', 'picked_up', 'shipped', 'cancelled'
      ];
      
      if (!allowedStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: 'Invalid status' },
          { status: 400 }
        );
      }
      
      // Validate orderIds are strings
      for (const id of orderIds) {
        if (typeof id !== 'string' || id.length < 1) {
          return NextResponse.json(
            { success: false, error: `Invalid order ID: ${id}` },
            { status: 400 }
          );
        }
      }
      
      const { db } = await connectToDatabase();
      
      // Build update
      const updateData: Record<string, unknown> = {
        status,
        statusUpdatedAt: new Date().toISOString(),
        statusUpdatedBy: admin.email,
      };
      
      if (notes) {
        if (typeof notes !== 'string' || notes.length > 1000) {
          return NextResponse.json(
            { success: false, error: 'Notes must be a string with max 1000 characters' },
            { status: 400 }
          );
        }
        updateData.statusNotes = notes;
      }
      
      // Update orders
      const result = await db.collection('orders').updateMany(
        { id: { $in: orderIds } },
        { $set: updateData }
      );
      
      // Log action
      logger.info('ORDERS', `Bulk status update by ${admin.email}`, {
        status,
        count: result.modifiedCount,
        orderIds: orderIds.slice(0, 10), // Log first 10 for brevity
      });
      
      return NextResponse.json({
        success: true,
        status,
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
      });
      
    } catch (error) {
      logger.error('ORDERS', 'Failed to update order status', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update orders' },
        { status: 500 }
      );
    }
  },
  {
    permission: PERMISSIONS.ORDERS_UPDATE_STATUS,
    resource: 'orders',
    action: 'update_status',
    rateLimit: { maxRequests: 60, windowSeconds: 60 },
  }
);
