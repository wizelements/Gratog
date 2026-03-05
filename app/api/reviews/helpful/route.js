import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';
import { ObjectId } from 'mongodb';

export async function POST(request) {
  try {
    const { reviewId, helpful } = await request.json();

    if (!reviewId) {
      return NextResponse.json(
        { error: 'reviewId is required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    let objectId;
    try {
      objectId = new ObjectId(reviewId);
    } catch {
      return NextResponse.json(
        { error: 'Invalid reviewId format' },
        { status: 400 }
      );
    }

    const update = helpful
      ? { $inc: { helpful: 1 } }
      : { $inc: { notHelpful: 1 } };

    const result = await db.collection('product_reviews').updateOne(
      { _id: objectId },
      { ...update, $set: { updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('API', 'Failed to record helpful vote', error);
    return NextResponse.json(
      { error: 'Failed to record vote' },
      { status: 500 }
    );
  }
}
