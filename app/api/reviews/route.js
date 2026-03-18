import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { sendReviewConfirmation } from '@/lib/resend-email';
import { verifyAdminToken } from '@/lib/admin-session';
import { logger } from '@/lib/logger';
import { RateLimit } from '@/lib/redis';
import { PUBLIC_REVIEW_FILTER } from '@/lib/review-visibility';
import { ObjectId } from 'mongodb';
import { randomUUID } from 'crypto';

const REVIEW_POINTS = 10;
const MAX_REVIEW_IMAGES = 3;
const REVIEW_MEDIA_URL_REGEX = /^\/api\/reviews\/media\/([a-f0-9]{24})$/i;
const LEGACY_REVIEW_UPLOAD_URL_REGEX = /^\/uploads\/reviews\/[a-zA-Z0-9._-]{1,180}$/;
const VERIFIED_PURCHASE_STATUSES = ['paid', 'completed', 'delivered', 'fulfilled', 'payment_completed', 'COMPLETED'];

function getClientIp(request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const [firstHop] = forwardedFor.split(',');
    const normalized = firstHop?.trim();
    if (normalized) {
      return normalized;
    }
  }

  return request.headers.get('x-real-ip') || 'unknown';
}

async function hasAdminSession(request, contextLabel) {
  const token = request.cookies.get('admin_token')?.value;
  if (!token) {
    return false;
  }

  try {
    const decoded = await verifyAdminToken(token);
    return decoded?.role === 'admin';
  } catch (tokenError) {
    logger.warn('Reviews', `Invalid admin token for ${contextLabel}`, {
      error: tokenError.message,
    });
    return false;
  }
}

async function upsertPendingCustomerFromReview(db, { name, email, productId, productName }) {
  const now = new Date();

  try {
    const result = await db.collection('pending_customers').updateOne(
      { email },
      {
        $setOnInsert: {
          email,
          source: 'review_submission',
          status: 'pending_signup',
          firstSeenAt: now,
        },
        $set: {
          name,
          updatedAt: now,
          lastReviewAt: now,
          lastReviewedProductId: productId,
          lastReviewedProductName: productName,
        },
        $inc: {
          reviewSubmissionCount: 1,
        },
        $addToSet: {
          reviewedProductIds: productId,
        },
      },
      { upsert: true }
    );

    return {
      captured: true,
      signupSuggested: true,
      created: Boolean(result?.upsertedId),
    };
  } catch (error) {
    logger.error('Reviews', 'Failed to capture pending customer from review', {
      email,
      productId,
      error: error.message,
    });

    return { captured: false, signupSuggested: true, created: false };
  }
}

function buildSignupPrompt({ shouldSuggestSignup, name, email }) {
  if (!shouldSuggestSignup) {
    return {
      recommended: false,
      registerHref: null,
    };
  }

  const params = new URLSearchParams({
    from: 'review',
    intent: 'claim-rewards',
    name,
    email,
  });

  return {
    recommended: true,
    reason: 'review_without_verified_purchase',
    registerHref: `/register?${params.toString()}`,
  };
}

function buildReviewSummary(reviews) {
  const safeReviews = Array.isArray(reviews) ? reviews : [];
  const ratingDistribution = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0
  };

  let ratingTotal = 0;
  let verifiedCount = 0;

  for (const review of safeReviews) {
    const rating = Number(review?.rating || 0);
    if (rating >= 1 && rating <= 5) {
      ratingDistribution[rating] += 1;
      ratingTotal += rating;
    }

    if (review?.verifiedPurchase === true) {
      verifiedCount += 1;
    }
  }

  const reviewCount = safeReviews.length;
  const averageRating = reviewCount > 0
    ? Number((ratingTotal / reviewCount).toFixed(1))
    : 0;

  return {
    averageRating,
    reviewCount,
    ratingDistribution,
    verifiedCount
  };
}

function sanitizeReviewImageCandidates(images) {
  if (!Array.isArray(images)) {
    return [];
  }

  const unique = [];
  const seen = new Set();

  for (const candidate of images) {
    const value = String(candidate || '').trim();
    if (!value || seen.has(value)) {
      continue;
    }

    if (!REVIEW_MEDIA_URL_REGEX.test(value) && !LEGACY_REVIEW_UPLOAD_URL_REGEX.test(value)) {
      continue;
    }

    seen.add(value);
    unique.push(value);

    if (unique.length >= MAX_REVIEW_IMAGES) {
      break;
    }
  }

  return unique;
}

async function normalizeReviewImageUrls(db, images) {
  const candidates = sanitizeReviewImageCandidates(images);
  if (candidates.length === 0) {
    return [];
  }

  const mediaIds = candidates
    .map((url) => url.match(REVIEW_MEDIA_URL_REGEX)?.[1] || null)
    .filter(Boolean);

  if (mediaIds.length === 0) {
    return candidates;
  }

  const existingMedia = await db.collection('review_media')
    .find(
      {
        _id: {
          $in: mediaIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id))
        },
        deletedAt: { $exists: false }
      },
      { projection: { _id: 1 } }
    )
    .toArray();
  const existingIdSet = new Set(existingMedia.map((doc) => String(doc._id).toLowerCase()));

  return candidates.filter((url) => {
    const mediaMatch = url.match(REVIEW_MEDIA_URL_REGEX);
    if (!mediaMatch) {
      return true;
    }

    return existingIdSet.has(mediaMatch[1].toLowerCase());
  });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const requestedLimit = Number.parseInt(searchParams.get('limit') || '50', 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 50;
    const includeUnapproved = searchParams.get('includeUnapproved') === 'true';

    const { db } = await connectToDatabase();

    // Check if admin requesting all reviews
    const showAll = includeUnapproved
      ? await hasAdminSession(request, 'includeUnapproved request')
      : false;

    const query = showAll ? { hidden: { $ne: true } } : { ...PUBLIC_REVIEW_FILTER };
    if (productId) query.productId = productId;

    const [reviews, summarySourceReviews] = await Promise.all([
      db
        .collection('product_reviews')
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray(),
      db
        .collection('product_reviews')
        .find(query)
        .toArray()
    ]);

    const summary = buildReviewSummary(summarySourceReviews);

    return NextResponse.json({
      success: true,
      reviews,
      count: reviews.length,
      totalCount: summary.reviewCount,
      summary,
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
    const payload = await request.json();
    const qaBypassRequested = payload?.qaBypassRateLimit === true;
    const isAdminQaSubmission = qaBypassRequested
      ? await hasAdminSession(request, 'qa bypass review submission')
      : false;

    if (!isAdminQaSubmission) {
      const clientIp = getClientIp(request);
      if (!RateLimit.check(`review_submit:${clientIp}`, 20, 60 * 60)) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
      }
    }

    const productId = String(payload?.productId || '').trim();
    const rawProductName = String(payload?.productName || '').trim();
    const productName = rawProductName || productId || 'Taste of Gratitude Product';
    const name = String(payload?.name || '').trim();
    const email = String(payload?.email || '').trim().toLowerCase();
    const rating = Number(payload?.rating);
    const title = String(payload?.title || '').trim();
    const comment = String(payload?.comment || '').trim();
    const images = payload?.images;

    if (!productId || !name || !email || !title || !comment || !Number.isFinite(rating)) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
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

    const reviewImages = await normalizeReviewImageUrls(db, images);

    // Check if user already reviewed this product
    const existingReview = await db.collection('product_reviews').findOne({
      productId,
      email,
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
      email,
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

    const insertResult = await db.collection('product_reviews').insertOne(review);

    const pendingCustomer = !verifiedPurchase
      ? await upsertPendingCustomerFromReview(db, { name, email, productId, productName })
      : { captured: false, signupSuggested: false };
    const signupPrompt = buildSignupPrompt({
      shouldSuggestSignup: pendingCustomer.signupSuggested === true,
      name,
      email,
    });

    // Award points to customer's passport
    try {
      const normalizedEmail = email.toLowerCase();
      const now = new Date();

      await Promise.all([
        db.collection('passports').updateOne(
          { customerEmail: normalizedEmail },
          {
            $setOnInsert: {
              customerEmail: normalizedEmail,
              customerName: name,
              stamps: [],
              totalStamps: 0,
              vouchers: [],
              level: 'Explorer',
              xpPoints: 0,
              createdAt: now,
            },
            $set: {
              customerName: name,
              updatedAt: now,
              lastActivity: now,
            },
            $inc: {
              xpPoints: REVIEW_POINTS,
            },
          },
          { upsert: true }
        ),
        db.collection('customer_passports').updateOne(
          { email: normalizedEmail },
          {
            $setOnInsert: {
              id: randomUUID(),
              email: normalizedEmail,
              name,
              points: 0,
              totalPointsEarned: 0,
              level: 'EXPLORER',
              activities: [],
              redeemedRewards: [],
              createdAt: now,
            },
            $set: {
              name,
              updatedAt: now,
            },
            $inc: {
              points: REVIEW_POINTS,
              totalPointsEarned: REVIEW_POINTS,
            },
            $push: {
              activities: {
                id: randomUUID(),
                type: 'review',
                points: REVIEW_POINTS,
                data: {
                  productId,
                  productName,
                },
                timestamp: now,
              },
            },
          },
          { upsert: true }
        )
      ]);
    } catch (passportError) {
      logger.error('API', 'Failed to award points', passportError);
    }

    const suppressConfirmationEmail =
      isAdminQaSubmission && payload?.suppressConfirmationEmail === true;
    let emailResult = { success: false, error: 'not-sent' };
    if (!suppressConfirmationEmail) {
      try {
        emailResult = await sendReviewConfirmation(email, productName, REVIEW_POINTS);
        if (!emailResult.success) {
          logger.error('Reviews', 'Review confirmation email failed', {
            to: email,
            productName,
            error: emailResult.error,
          });
        }
      } catch (emailError) {
        logger.error('Reviews', 'Review confirmation email threw', {
          to: email,
          productName,
          error: emailError.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Review submitted successfully. It will be visible after approval.',
      reviewStatus: 'pending_moderation',
      isPublic: false,
      qaBypassRateLimit: isAdminQaSubmission,
      pointsEarned: REVIEW_POINTS,
      emailSent: emailResult.success,
      emailSuppressed: suppressConfirmationEmail,
      pendingCustomerCaptured: pendingCustomer.captured,
      pendingCustomer,
      signupPrompt,
      review: {
        ...review,
        _id: insertResult.insertedId?.toString(),
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
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedProductId = String(productId || '').trim();

    if (!normalizedEmail || !normalizedProductId) {
      return false;
    }

    const order = await db.collection('orders').findOne({
      $and: [
        {
          $or: [
            { 'customer.email': normalizedEmail },
            { customerEmail: normalizedEmail },
          ]
        },
        {
          $or: [
            { 'items.productId': normalizedProductId },
            { 'items.id': normalizedProductId },
            { 'items.slug': normalizedProductId },
          ]
        },
        {
          $or: [
            { status: { $in: VERIFIED_PURCHASE_STATUSES } },
            { paymentStatus: { $in: VERIFIED_PURCHASE_STATUSES } },
          ]
        }
      ]
    });
    return !!order;
  } catch (error) {
    logger.error('API', 'Error checking verified purchase', error);
    return false;
  }
}

async function getReviewAnalytics(db, productId = null) {
  try {
    const matchStage = { ...PUBLIC_REVIEW_FILTER };
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
