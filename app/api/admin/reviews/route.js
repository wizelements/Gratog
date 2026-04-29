export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/db-optimized';
import { requireAdmin } from '@/lib/admin-session';
import { createLogger } from '@/lib/logger';

const logger = createLogger('AdminReviews');

/**
 * GET - List all reviews with filters (admin only)
 */
export async function GET(request) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending, approved, rejected
    const productId = searchParams.get('productId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const parsedPage = Number.parseInt(searchParams.get('page') || '1', 10);
    const parsedLimit = Number.parseInt(searchParams.get('limit') || '20', 10);
    const page = Number.isFinite(parsedPage) ? Math.max(parsedPage, 1) : 1;
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 20;
    const skip = (page - 1) * limit;

    const { db } = await connectToDatabase();

    // Build query
    const query = {};

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
      query.productId = productId;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const parsedStart = new Date(startDate);
        if (Number.isNaN(parsedStart.getTime())) {
          return NextResponse.json(
            { error: 'Invalid startDate value' },
            { status: 400 }
          );
        }
        query.createdAt.$gte = parsedStart;
      }
      if (endDate) {
        const parsedEnd = new Date(endDate);
        if (Number.isNaN(parsedEnd.getTime())) {
          return NextResponse.json(
            { error: 'Invalid endDate value' },
            { status: 400 }
          );
        }
        query.createdAt.$lte = parsedEnd;
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
                { $and: [{ $ne: ['$approved', true] }, { $ne: ['$rejected', true] }, { $ne: ['$hidden', true] }] },
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
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }
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
export async function PATCH(request) {
  try {
    const admin = await requireAdmin(request);

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

    const objectIds = [];
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

    const update = { $set: { updatedAt: new Date() } };

    switch (action) {
      case 'approve':
        update.$set.approved = true;
        update.$set.rejected = false;
        update.$set.hidden = false;
        update.$set.approvedAt = new Date();
        update.$set.approvedBy = admin.email;
        break;
      case 'reject':
        update.$set.rejected = true;
        update.$set.approved = false;
        update.$set.rejectedAt = new Date();
        update.$set.rejectedBy = admin.email;
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
      user: admin.email 
    });

    return NextResponse.json({
      success: true,
      action,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }
    logger.error('Failed to bulk update reviews', { error: error.message });
    return NextResponse.json(
      { error: 'Failed to update reviews' },
      { status: 500 }
    );
  }
}
