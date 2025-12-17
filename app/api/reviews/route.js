import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { sendReviewConfirmation } from '@/lib/resend';
import { verifyToken } from '@/lib/auth';
import { logger } from '@/lib/logger';

const REVIEW_POINTS = 10;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const includeUnapproved = searchParams.get('includeUnapproved') === 'true';

    const { db } = await connectToDatabase();

    // Check if admin requesting all reviews
    let showAll = false;
    if (includeUnapproved) {
      const token = request.cookies.get('admin_token')?.value;
      const decoded = verifyToken(token);
      if (decoded && (decoded.role === 'admin' || decoded.role === 'superadmin')) {
        showAll = true;
      }
    }

    const query = { hidden: false };
    if (productId) query.productId = productId;
    if (!showAll) query.approved = true;

    const reviews = await db
      .collection('product_reviews')
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      reviews,
      count: reviews.length,
    });
  } catch (error) {
    logger.error('API', 'Failed to fetch reviews', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { productId, productName, name, email, rating, title, comment, images } = await request.json();

    if (!productId || !productName || !name || !email || !rating || !title || !comment) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Validate images array
    const reviewImages = Array.isArray(images) ? images.slice(0, 3) : [];

    const { db } = await connectToDatabase();

    // Check if user already reviewed this product
    const existingReview = await db.collection('product_reviews').findOne({
      productId,
      email: email.toLowerCase(),
    });

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this product' },
        { status: 400 }
      );
    }

    // Check if user has purchased this product (verified purchase)
    const verifiedPurchase = await checkVerifiedPurchase(db, email.toLowerCase(), productId);

    const review = {
      productId,
      productName,
      name,
      email: email.toLowerCase(),
      rating,
      title,
      comment,
      images: reviewImages,
      verifiedPurchase,
      approved: false, // Pending moderation
      hidden: false,
      helpful: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection('product_reviews').insertOne(review);

    // Award points to customer's passport
    try {
      const passport = await db.collection('passports').findOne({ email: email.toLowerCase() });

      if (passport) {
        await db.collection('passports').updateOne(
          { email: email.toLowerCase() },
          {
            $inc: { xp: REVIEW_POINTS },
            $push: {
              timeline: {
                action: 'product_review',
                points: REVIEW_POINTS,
                productName,
                timestamp: new Date(),
              },
            },
            $set: { updatedAt: new Date() },
          }
        );
      } else {
        await db.collection('passports').insertOne({
          email: email.toLowerCase(),
          name,
          xp: REVIEW_POINTS,
          level: 1,
          stamps: [],
          vouchers: [],
          timeline: [
            {
              action: 'product_review',
              points: REVIEW_POINTS,
              productName,
              timestamp: new Date(),
            },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (passportError) {
      logger.error('API', 'Failed to award points', passportError);
    }

    await sendReviewConfirmation(email, productName, REVIEW_POINTS);

    return NextResponse.json({
      success: true,
      message: 'Review submitted successfully. It will be visible after approval.',
      pointsEarned: REVIEW_POINTS,
      review: {
        ...review,
        _id: review._id?.toString(),
      },
    });
  } catch (error) {
    logger.error('API', 'Failed to submit review', error);
    return NextResponse.json(
      { error: 'Failed to submit review' },
      { status: 500 }
    );
  }
}

async function checkVerifiedPurchase(db, email, productId) {
  try {
    const order = await db.collection('orders').findOne({
      'customer.email': email,
      'items.productId': productId,
      status: { $in: ['completed', 'delivered', 'fulfilled'] }
    });
    return !!order;
  } catch (error) {
    logger.error('API', 'Error checking verified purchase', error);
    return false;
  }
}

export async function getReviewAnalytics(db, productId = null) {
  try {
    const matchStage = { approved: true, hidden: false };
    if (productId) matchStage.productId = productId;

    const analytics = await db.collection('product_reviews').aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: productId ? null : '$productId',
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
          rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          verifiedCount: { $sum: { $cond: ['$verifiedPurchase', 1, 0] } },
        }
      },
      {
        $project: {
          productId: '$_id',
          averageRating: { $round: ['$averageRating', 1] },
          totalReviews: 1,
          ratingDistribution: {
            1: '$rating1',
            2: '$rating2',
            3: '$rating3',
            4: '$rating4',
            5: '$rating5'
          },
          verifiedCount: 1
        }
      }
    ]).toArray();

    return productId ? (analytics[0] || null) : analytics;
  } catch (error) {
    logger.error('API', 'Error getting review analytics', error);
    return null;
  }
}
