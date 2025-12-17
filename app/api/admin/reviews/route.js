import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { requireAdminAuth } from '@/lib/admin-auth-middleware';
import { createLogger } from '@/lib/logger';

const logger = createLogger('AdminReviews');

/**
 * GET - List all reviews with filters (admin only)
 */
async function handleGet(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending, approved, rejected
    const productId = searchParams.get('productId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const { db } = await connectToDatabase();

    // Build query
    const query = {};

    if (status === 'pending') {
      query.approved = { $ne: true };
      query.rejected = { $ne: true };
    } else if (status === 'approved') {
      query.approved = true;
    } else if (status === 'rejected') {
      query.rejected = true;
    }

    if (productId) {
      query.productId = productId;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Get reviews with pagination
    const [reviews, total] = await Promise.all([
      db.collection('product_reviews')
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection('product_reviews').countDocuments(query)
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
                { $and: [{ $ne: ['$approved', true] }, { $ne: ['$rejected', true] }] },
                1,
                0
              ]
            }
          },
          approved: { $sum: { $cond: ['$approved', 1, 0] } },
          rejected: { $sum: { $cond: ['$rejected', 1, 0] } },
          avgRating: { $avg: '$rating' }
        }
      }
    ]).toArray();

    logger.info('Admin reviews fetched', { count: reviews.length, status });

    return NextResponse.json({
      success: true,
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: stats[0] || { total: 0, pending: 0, approved: 0, rejected: 0, avgRating: 0 }
    });
  } catch (error) {
    logger.error('Failed to fetch admin reviews', { error: error.message });
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Bulk update reviews (approve/reject multiple)
 */
async function handlePatch(request) {
  try {
    const body = await request.json();
    const { reviewIds, action } = body;

    if (!reviewIds || !Array.isArray(reviewIds) || reviewIds.length === 0) {
      return NextResponse.json(
        { error: 'Review IDs array is required' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject', 'hide', 'unhide'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Use: approve, reject, hide, unhide' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const { ObjectId } = await import('mongodb');

    const objectIds = reviewIds.map(id => new ObjectId(id));

    let update = { $set: { updatedAt: new Date() } };

    switch (action) {
      case 'approve':
        update.$set.approved = true;
        update.$set.rejected = false;
        update.$set.hidden = false;
        break;
      case 'reject':
        update.$set.rejected = true;
        update.$set.approved = false;
        break;
      case 'hide':
        update.$set.hidden = true;
        break;
      case 'unhide':
        update.$set.hidden = false;
        break;
    }

    const result = await db.collection('product_reviews').updateMany(
      { _id: { $in: objectIds } },
      update
    );

    logger.info('Bulk review update', { 
      action, 
      count: result.modifiedCount,
      user: request.user?.email 
    });

    return NextResponse.json({
      success: true,
      action,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    logger.error('Failed to bulk update reviews', { error: error.message });
    return NextResponse.json(
      { error: 'Failed to update reviews' },
      { status: 500 }
    );
  }
}

export const GET = requireAdminAuth(handleGet);
export const PATCH = requireAdminAuth(handlePatch);
