import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { sendReviewConfirmation } from '@/lib/resend';

const REVIEW_POINTS = 10; // Points awarded per review

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const limit = parseInt(searchParams.get('limit') || '50');

    const { db } = await connectToDatabase();

    const query = productId ? { productId, hidden: false } : { hidden: false };

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
    console.error('Failed to fetch reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { productId, productName, name, email, rating, title, comment } = await request.json();

    // Validation
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

    // Create review
    const review = {
      productId,
      productName,
      name,
      email: email.toLowerCase(),
      rating,
      title,
      comment,
      verified: false, // Can be set to true if order verification is implemented
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
        // Add points to existing passport
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
        // Create new passport with points
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
      console.error('Failed to award points:', passportError);
      // Continue even if points award fails
    }

    // Send confirmation email
    await sendReviewConfirmation(email, productName, REVIEW_POINTS);

    return NextResponse.json({
      success: true,
      message: 'Review submitted successfully',
      pointsEarned: REVIEW_POINTS,
      review: {
        ...review,
        _id: review._id?.toString(),
      },
    });
  } catch (error) {
    console.error('Failed to submit review:', error);
    return NextResponse.json(
      { error: 'Failed to submit review' },
      { status: 500 }
    );
  }
}
