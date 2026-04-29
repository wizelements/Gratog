export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';
import { ObjectId } from 'mongodb';
import { RateLimit } from '@/lib/redis';
import { PUBLIC_REVIEW_FILTER } from '@/lib/review-visibility';

export async function POST(request) {
  try {
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!RateLimit.check(`review_helpful:${clientIp}`, 30, 60 * 60)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const { reviewId, helpful } = await request.json();

    if (!reviewId) {
      return NextResponse.json(
        { error: 'reviewId is required' },
        { status: 400 }
      );
    }

    if (typeof helpful !== 'boolean') {
      return NextResponse.json(
        { error: 'helpful must be true or false' },
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
      { _id: objectId, ...PUBLIC_REVIEW_FILTER },
      { ...update, $set: { updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      const existingReview = await db.collection('product_reviews').findOne({ _id: objectId });
      if (existingReview) {
        return NextResponse.json(
          { error: 'Review is not available for voting' },
          { status: 409 }
        );
      }

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
