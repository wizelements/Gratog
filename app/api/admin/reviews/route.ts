import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/db-optimized';
import { PERMISSIONS } from '@/lib/security';
import { withAdminMiddleware, AuthenticatedRequest } from '@/lib/middleware/admin';
import { ReviewQuerySchema, ReviewBulkActionSchema, validateBody } from '@/lib/validation';
import { logger } from '@/lib/logger';

// ============================================================================
// GET - List reviews with filtering
// ============================================================================

export const GET = withAdminMiddleware(
  async (request: AuthenticatedRequest) => {
    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const validation = validateBody(
      Object.fromEntries(searchParams.entries()),
      ReviewQuerySchema
    );
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }
    
    const { status, productId, startDate, endDate, page, limit } = validation.data;
    const skip = (page - 1) * limit;
    
    try {
      const { db } = await connectToDatabase();
      
      // Build query
      const query: Record<string, unknown> = {};
      
      if (status) {
        switch (status) {
          case 'pending':
            query.approved = { $ne: true };
            query.rejected = { $ne: true };
            query.hidden = { $ne: true };
            break;
          case 'approved':
            query.approved = true;
            break;
          case 'rejected':
            query.rejected = true;
            break;
        }
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
      
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          query.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          query.createdAt.$lte = new Date(endDate);
        }
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
      const statsAgg = await db.collection('product_reviews').aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pending: {
              $sum: {
                $cond: [
                  { $and: [
                    { $ne: ['$approved', true] },
                    { $ne: ['$rejected', true] },
                    { $ne: ['$hidden', true] },
                  ]},
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
      
      const stats = statsAgg[0] || {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        avgRating: 0,
      };
      
      // Sanitize reviews - remove PII for list view
      const sanitizedReviews = reviews.map(review => ({
        _id: review._id.toString(),
        productId: review.productId,
        rating: review.rating,
        title: review.title,
        content: review.content?.substring(0, 200), // Truncate long content
        approved: review.approved,
        rejected: review.rejected,
        hidden: review.hidden,
        createdAt: review.createdAt,
        reviewerName: review.reviewerName?.substring(0, 50), // Limit name length
        verifiedPurchase: review.verifiedPurchase,
      }));
      
      return NextResponse.json({
        success: true,
        reviews: sanitizedReviews,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        stats: {
          total: stats.total,
          pending: stats.pending,
          approved: stats.approved,
          rejected: stats.rejected,
          avgRating: Math.round((stats.avgRating || 0) * 10) / 10,
        },
      });
      
    } catch (error) {
      logger.error('REVIEWS', 'Failed to fetch reviews', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch reviews' },
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

// ============================================================================
// PATCH - Bulk update reviews (approve/reject/hide)
// ============================================================================

export const PATCH = withAdminMiddleware(
  async (request: AuthenticatedRequest) => {
    const admin = request.admin;
    
    try {
      const body = await request.json();
      
      // Validate body
      const validation = validateBody(body, ReviewBulkActionSchema);
      
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        );
      }
      
      const { reviewIds, action } = validation.data;
      
      const { db } = await connectToDatabase();
      
      // Convert string IDs to ObjectIds
      const objectIds = reviewIds.map(id => new ObjectId(id));
      
      // Build update based on action
      const update: Record<string, unknown> = {
        $set: { updatedAt: new Date() },
        $unset: {},
      };
      
      switch (action) {
        case 'approve':
          update.$set.approved = true;
          update.$set.rejected = false;
          update.$set.hidden = false;
          update.$set.approvedAt = new Date();
          update.$set.approvedBy = admin.email;
          update.$unset = { rejectedAt: '', rejectedBy: '' };
          break;
          
        case 'reject':
          update.$set.rejected = true;
          update.$set.approved = false;
          update.$set.hidden = false;
          update.$set.rejectedAt = new Date();
          update.$set.rejectedBy = admin.email;
          update.$unset = { approvedAt: '', approvedBy: '' };
          break;
          
        case 'hide':
          update.$set.hidden = true;
          break;
          
        case 'unhide':
          update.$set.hidden = false;
          break;
      }
      
      // Clean up empty $unset
      if (Object.keys(update.$unset).length === 0) {
        delete update.$unset;
      }
      
      // Atomic update
      const result = await db.collection('product_reviews').updateMany(
        { _id: { $in: objectIds } },
        update
      );
      
      // Log action
      logger.info('REVIEWS', `Bulk ${action} reviews by ${admin.email}`, {
        count: result.modifiedCount,
        action,
      });
      
      return NextResponse.json({
        success: true,
        action,
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
      });
      
    } catch (error) {
      logger.error('REVIEWS', 'Failed to bulk update reviews', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update reviews' },
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

// ============================================================================
// DELETE - Delete reviews
// ============================================================================

export const DELETE = withAdminMiddleware(
  async (request: AuthenticatedRequest) => {
    const admin = request.admin;
    
    try {
      const body = await request.json();
      const { reviewIds } = body;
      
      if (!Array.isArray(reviewIds) || reviewIds.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Review IDs array is required' },
          { status: 400 }
        );
      }
      
      if (reviewIds.length > 1000) {
        return NextResponse.json(
          { success: false, error: 'Maximum 1000 reviews can be deleted at once' },
          { status: 400 }
        );
      }
      
      // Validate all IDs
      const objectIds: ObjectId[] = [];
      for (const id of reviewIds) {
        if (!ObjectId.isValid(id)) {
          return NextResponse.json(
            { success: false, error: `Invalid review ID: ${id}` },
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
      
      // Delete
      const result = await db.collection('product_reviews').deleteMany(
        { _id: { $in: objectIds } }
      );
      
      logger.info('REVIEWS', `Reviews deleted by ${admin.email}`, {
        count: result.deletedCount,
      });
      
      return NextResponse.json({
        success: true,
        deletedCount: result.deletedCount,
        archivedCount: reviewsToDelete.length,
      });
      
    } catch (error) {
      logger.error('REVIEWS', 'Failed to delete reviews', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete reviews' },
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
