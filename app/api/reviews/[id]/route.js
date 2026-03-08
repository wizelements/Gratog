import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/db-optimized';
import { requireAdminAuth } from '@/lib/admin-auth-middleware';
import { logger } from '@/lib/logger';

function parseReviewId(id) {
  if (typeof id !== 'string' || !ObjectId.isValid(id)) {
    return null;
  }
  return new ObjectId(id);
}

// Admin endpoint to hide/show reviews
async function handlePut(request, { params }) {
  try {
    const { id } = await params;
    const reviewObjectId = parseReviewId(id);
    if (!reviewObjectId) {
      return NextResponse.json(
        { error: 'Invalid review ID' },
        { status: 400 }
      );
    }

    const { hidden } = await request.json();
    if (typeof hidden !== 'boolean') {
      return NextResponse.json(
        { error: 'hidden must be true or false' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    const result = await db.collection('product_reviews').updateOne(
      { _id: reviewObjectId },
      {
        $set: {
          hidden,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: hidden ? 'Review hidden' : 'Review visible',
    });
  } catch (error) {
    logger.error('API', 'Failed to update review', error);
    return NextResponse.json(
      { error: 'Failed to update review' },
      { status: 500 }
    );
  }
}

// Admin endpoint to delete reviews
async function handleDelete(request, { params }) {
  try {
    const { id } = await params;
    const reviewObjectId = parseReviewId(id);
    if (!reviewObjectId) {
      return NextResponse.json(
        { error: 'Invalid review ID' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    const result = await db.collection('product_reviews').deleteOne({ _id: reviewObjectId });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Review deleted',
    });
  } catch (error) {
    logger.error('API', 'Failed to delete review', error);
    return NextResponse.json(
      { error: 'Failed to delete review' },
      { status: 500 }
    );
  }
}

export const PUT = requireAdminAuth(handlePut);
export const DELETE = requireAdminAuth(handleDelete);
