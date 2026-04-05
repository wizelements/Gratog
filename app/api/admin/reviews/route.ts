/**
 * Hardened Reviews Admin API
 * 
 * Security: RBAC, input validation, CSRF, rate limiting, audit logging
 */

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/db-optimized';
import { PERMISSIONS } from '@/lib/security';
import { withAdminMiddleware, AuthenticatedRequest } from '@/lib/middleware/admin';
import { ReviewBulkActionSchema, validateBody } from '@/lib/validation';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Query validation schema
const ReviewQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  productId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

/**
 * GET - List reviews with filters (admin only)
 */
export const GET = withAdminMiddleware(
  async (request: AuthenticatedRequest) => {
    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const validation = ReviewQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries())
    );
    
    if (!validation.success) {
      const errorMessage = validation.error.errors.map(e => e.message).join('; ');
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }
    
    const { status, productId, startDate, endDate, page, limit } = validation.data;
    const skip = (page - 1) * limit;
    
    try {
      const { db } = await connectToDatabase();
      
      // Build query
      const query: Record<string, unknown> = {};
      
      if (status === 'pending') {
        query.approved = { $ne: true };
        query.rejected = { $ne: true };
        query.hidden = { $ne: true };
      } else if (status === 'approved') {
        query.approved = true;
      } else if (status === 'rejected') {
        query.rejected = true;
      }
      
      if (productId) {
        // Validate productId format
        if (!/^[a-zA-Z0-9_-]+$/.test(productId)) {
          return NextResponse.json(
            { success: false, error: 'Invalid product ID format' },
            { status: 400 }
          );
        }
        query.productId = productId;
      }
      
      // Build date query with proper typing
      interface DateQuery {
        $gte?: Date;
        $lte?: Date;
      }
      
      const dateQuery: DateQuery = {};
      
      if (startDate) {
        const parsedStart = new Date(startDate);
        if (Number.isNaN(parsedStart.getTime())) {
          return NextResponse.json(
            { success: false, error: 'Invalid startDate value' },
            { status: 400 }
          );
        }
        dateQuery.$gte = parsedStart;
      }
      
      if (endDate) {
        const parsedEnd = new Date(endDate);
        if (Number.isNaN(parsedEnd.getTime())) {
          return NextResponse.json(
            { success: false, error: 'Invalid endDate value' },
            { status: 400 }
          );
        }
        dateQuery.$lte = parsedEnd;
      }
      
      if (Object.keys(dateQuery).length > 0) {
        query.createdAt = dateQuery;
      }
      
      // Get reviews with pagination
      const [reviews, total] = await Promise.all([
        db.collection('product_reviews')
          .find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        db.collection('product_reviews').countDocuments(query),
      ]);
      
      // Get stats
      const stats = await db.collection('product_reviews').aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pending: {
              $sum: {
                $cond: [
                  { $and: [{ $ne: ['$approved', true] }, { $ne: ['$rejected', true] }, { $ne: ['$hidden', true] }] },
                  1,
                  0,
                ],
              },
            },
            approved: { $sum: { $cond: ['$approved', 1, 0] } },
            rejected: { $sum: { $cond: ['$rejected', 1, 0] } },
            avgRating: { $avg: '$rating' },
          },
        },
      ]).toArray();
      
      const statsData = stats[0] || { total: 0, pending: 0, approved: 0, rejected: 0, avgRating: 0 };
      
      logger.info('Reviews', 'Admin reviews fetched', { count: reviews.length, status });
      
      return NextResponse.json({
        success: true,
        reviews,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        stats: {
          total: statsData.total,
          pending: statsData.pending,
          approved: statsData.approved,
          rejected: statsData.rejected,
          avgRating: Math.round((statsData.avgRating || 0) * 10) / 10,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AdminAuthError') {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 401 }
        );
      }
      logger.error('Reviews', 'Failed to fetch admin reviews', error instanceof Error ? error.message : 'Unknown');
      return NextResponse.json(
        { error: 'Failed to fetch reviews' },
        { status: 500 }
      );
    }
  },
  {
    permission: PERMISSIONS.REVIEWS_VIEW,
    resource: 'reviews',
    action: 'list',
  }
);

/**
 * PATCH - Bulk update reviews (approve/reject multiple)
 */
export const PATCH = withAdminMiddleware(
  async (request: AuthenticatedRequest) => {
    const admin = request.admin;
    
    try {
      const body = await request.json();
      
      // Validate body
      const validation = validateBody(body, ReviewBulkActionSchema);
      
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: (validation as { success: false; error: string }).error },
          { status: 400 }
        );
      }
      
      const { reviewIds, action } = validation.data;
      
      const objectIds: ObjectId[] = [];
      for (const id of reviewIds) {
        objectIds.push(new ObjectId(id));
      }
      
      const { db } = await connectToDatabase();
      
      // Build update based on action
      const update: Record<string, unknown> = {
        $set: { updatedAt: new Date() },
      };
      
      switch (action) {
        case 'approve':
          update.$set = {
            ...(update.$set as Record<string, unknown>),
            approved: true,
            rejected: false,
            hidden: false,
            approvedAt: new Date(),
            approvedBy: admin.email,
          };
          update.$unset = { rejectedAt: '', rejectedBy: '' };
          break;
        case 'reject':
          update.$set = {
            ...(update.$set as Record<string, unknown>),
            rejected: true,
            approved: false,
            hidden: false,
            rejectedAt: new Date(),
            rejectedBy: admin.email,
          };
          update.$unset = { approvedAt: '', approvedBy: '' };
          break;
        case 'hide':
          update.$set = {
            ...(update.$set as Record<string, unknown>),
            hidden: true,
          };
          break;
        case 'unhide':
          update.$set = {
            ...(update.$set as Record<string, unknown>),
            hidden: false,
          };
          break;
      }
      
      const result = await db.collection('product_reviews').updateMany(
        { _id: { $in: objectIds } },
        update
      );
      
      logger.info('Reviews', 'Bulk review update', { action, count: result.modifiedCount, user: admin.email });
      
      return NextResponse.json({
        success: true,
        action,
        modifiedCount: result.modifiedCount,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AdminAuthError') {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 401 }
        );
      }
      logger.error('Reviews', 'Failed to bulk update reviews', error instanceof Error ? error.message : 'Unknown');
      return NextResponse.json(
        { error: 'Failed to update reviews' },
        { status: 500 }
      );
    }
  },
  {
    permission: PERMISSIONS.REVIEWS_MODERATE,
    resource: 'reviews',
    action: 'moderate',
    rateLimit: { maxRequests: 60, windowSeconds: 60 },
  }
);

/**
 * DELETE - Delete reviews
 */
export const DELETE = withAdminMiddleware(
  async (request: AuthenticatedRequest) => {
    const admin = request.admin;
    
    try {
      const body = await request.json();
      const { reviewIds } = body;
      
      if (!Array.isArray(reviewIds) || reviewIds.length === 0) {
        return NextResponse.json(
          { error: 'Review IDs array is required' },
          { status: 400 }
        );
      }
      
      if (reviewIds.length > 1000) {
        return NextResponse.json(
          { error: 'Maximum 1000 reviews can be deleted at once' },
          { status: 400 }
        );
      }
      
      const objectIds: ObjectId[] = [];
      for (const id of reviewIds) {
        if (typeof id !== 'string' || !ObjectId.isValid(id)) {
          return NextResponse.json(
            { error: `Invalid review ID: ${id}` },
            { status: 400 }
          );
        }
        objectIds.push(new ObjectId(id));
      }
      
      const { db } = await connectToDatabase();
      
      // Archive before delete
      const reviewsToDelete = await db.collection('product_reviews')
        .find({ _id: { $in: objectIds } })
        .toArray();
      
      if (reviewsToDelete.length > 0) {
        await db.collection('deleted_reviews').insertMany(
          reviewsToDelete.map(r => ({
            ...r,
            deletedBy: admin.email,
            deletedAt: new Date(),
            originalId: r._id,
            _id: new ObjectId(),
          }))
        );
      }
      
      const result = await db.collection('product_reviews').deleteMany(
        { _id: { $in: objectIds } }
      );
      
      logger.info('Reviews', 'Reviews deleted', { count: result.deletedCount, user: admin.email });
      
      return NextResponse.json({
        success: true,
        deletedCount: result.deletedCount,
        archivedCount: reviewsToDelete.length,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AdminAuthError') {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 401 }
        );
      }
      logger.error('Reviews', 'Failed to delete reviews', error instanceof Error ? error.message : 'Unknown');
      return NextResponse.json(
        { error: 'Failed to delete reviews' },
        { status: 500 }
      );
    }
  },
  {
    permission: PERMISSIONS.REVIEWS_MODERATE,
    resource: 'reviews',
    action: 'delete',
    rateLimit: { maxRequests: 30, windowSeconds: 60 },
  }
);
