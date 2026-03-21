import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/db-optimized';
import { requireAdmin } from '@/lib/admin-session';
import { logAdminAction } from '@/lib/admin-auth-middleware';
import { createLogger } from '@/lib/logger';

const logger = createLogger('AdminReviewDetail');

function parseReviewId(id) {
  if (typeof id !== 'string' || !ObjectId.isValid(id)) {
    return null;
  }
  return new ObjectId(id);
}

/**
 * GET - Get single review details
 */
export async function GET(request, { params }) {
  try {
    await requireAdmin(request);

    const { id } = await params;
    const reviewObjectId = parseReviewId(id);
    if (!reviewObjectId) {
      return NextResponse.json(
        { error: 'Invalid review ID' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    const review = await db.collection('product_reviews').findOne({
      _id: reviewObjectId
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
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }
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
export async function PATCH(request, { params }) {
  try {
    const admin = await requireAdmin(request);

    const { id } = await params;
    const reviewObjectId = parseReviewId(id);
    if (!reviewObjectId) {
      return NextResponse.json(
        { error: 'Invalid review ID' },
        { status: 400 }
      );
    }

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
      update.$set.approvedBy = admin.email;
    } else if (action === 'reject') {
      update.$set.rejected = true;
      update.$set.approved = false;
      update.$set.rejectedAt = new Date();
      update.$set.rejectedBy = admin.email;
    } else {
      // Direct field updates
      if (typeof hidden === 'boolean') update.$set.hidden = hidden;
      if (typeof approved === 'boolean') {
        update.$set.approved = approved;
        if (approved) {
          update.$set.rejected = false;
          update.$set.hidden = false;
        }
      }
      if (typeof rejected === 'boolean') {
        update.$set.rejected = rejected;
        if (rejected) {
          update.$set.approved = false;
        }
      }
    }

    if (adminNote) {
      update.$set.adminNote = adminNote;
    }

    const result = await db.collection('product_reviews').updateOne(
      { _id: reviewObjectId },
      update
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    // Log admin action
    await logAdminAction(admin, 'review_update', {
      reviewId: id,
      action: action || 'field_update',
      changes: update.$set
    }, request);

    logger.info('Review updated', { 
      reviewId: id, 
      action,
      by: admin.email 
    });

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }
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
export async function DELETE(request, { params }) {
  try {
    const admin = await requireAdmin(request);

    const { id } = await params;
    const reviewObjectId = parseReviewId(id);
    if (!reviewObjectId) {
      return NextResponse.json(
        { error: 'Invalid review ID' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Get review before deletion for logging
    const review = await db.collection('product_reviews').findOne({
      _id: reviewObjectId
    });

    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    await db.collection('product_reviews').deleteOne({
      _id: reviewObjectId
    });

    // Log admin action
    await logAdminAction(admin, 'review_delete', {
      reviewId: id,
      productId: review.productId,
      email: review.email
    }, request);

    logger.info('Review deleted', { 
      reviewId: id,
      by: admin.email 
    });

    return NextResponse.json({
      success: true,
      deleted: true
    });
  } catch (error) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }
    logger.error('Failed to delete review', { error: error.message });
    return NextResponse.json(
      { error: 'Failed to delete review' },
      { status: 500 }
    );
  }
}
