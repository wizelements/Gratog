import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/db-optimized';
import { requireAdminAuth, logAdminAction } from '@/lib/admin-auth-middleware';
import { createLogger } from '@/lib/logger';

const logger = createLogger('AdminReviewDetail');

/**
 * GET - Get single review details
 */
async function handleGet(request, { params }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    const review = await db.collection('product_reviews').findOne({
      _id: new ObjectId(id)
    });

    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    // Get order history for this email to check verified purchase
    const orders = await db.collection('orders')
      .find({
        'customer.email': review.email,
        'items.productId': review.productId
      })
      .project({ orderNumber: 1, createdAt: 1 })
      .toArray();

    return NextResponse.json({
      success: true,
      review: {
        ...review,
        _id: review._id.toString(),
        verifiedPurchase: orders.length > 0,
        purchaseHistory: orders
      }
    });
  } catch (error) {
    logger.error('Failed to fetch review', { error: error.message });
    return NextResponse.json(
      { error: 'Failed to fetch review' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update review (approve, reject, hide, edit)
 */
async function handlePatch(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, hidden, approved, rejected, adminNote } = body;

    const { db } = await connectToDatabase();

    const update = {
      $set: { updatedAt: new Date() }
    };

    // Handle specific actions
    if (action === 'approve') {
      update.$set.approved = true;
      update.$set.rejected = false;
      update.$set.hidden = false;
      update.$set.approvedAt = new Date();
      update.$set.approvedBy = request.user?.email;
    } else if (action === 'reject') {
      update.$set.rejected = true;
      update.$set.approved = false;
      update.$set.rejectedAt = new Date();
      update.$set.rejectedBy = request.user?.email;
    } else {
      // Direct field updates
      if (typeof hidden === 'boolean') update.$set.hidden = hidden;
      if (typeof approved === 'boolean') update.$set.approved = approved;
      if (typeof rejected === 'boolean') update.$set.rejected = rejected;
    }

    if (adminNote) {
      update.$set.adminNote = adminNote;
    }

    const result = await db.collection('product_reviews').updateOne(
      { _id: new ObjectId(id) },
      update
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    // Log admin action
    await logAdminAction(request.user, 'review_update', {
      reviewId: id,
      action: action || 'field_update',
      changes: update.$set
    }, request);

    logger.info('Review updated', { 
      reviewId: id, 
      action,
      by: request.user?.email 
    });

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    logger.error('Failed to update review', { error: error.message });
    return NextResponse.json(
      { error: 'Failed to update review' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove review permanently
 */
async function handleDelete(request, { params }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    // Get review before deletion for logging
    const review = await db.collection('product_reviews').findOne({
      _id: new ObjectId(id)
    });

    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    await db.collection('product_reviews').deleteOne({
      _id: new ObjectId(id)
    });

    // Log admin action
    await logAdminAction(request.user, 'review_delete', {
      reviewId: id,
      productId: review.productId,
      email: review.email
    }, request);

    logger.info('Review deleted', { 
      reviewId: id,
      by: request.user?.email 
    });

    return NextResponse.json({
      success: true,
      deleted: true
    });
  } catch (error) {
    logger.error('Failed to delete review', { error: error.message });
    return NextResponse.json(
      { error: 'Failed to delete review' },
      { status: 500 }
    );
  }
}

export const GET = requireAdminAuth(handleGet);
export const PATCH = requireAdminAuth(handlePatch);
export const DELETE = requireAdminAuth(handleDelete);
