import { logger } from '@/lib/logger';
import { connectToDatabase } from '@/lib/db-optimized';
import { 
  validateSubscriptionAccessToken, 
  generateSubscriptionAccessToken,
  SubscriptionAccessPayload 
} from '@/lib/subscription-access';
import { RateLimit } from '@/lib/redis';
import { SUBSCRIPTION_TIERS } from '@/lib/subscription-tiers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/subscriptions
 * Get subscriptions for the authenticated user or token holder
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    // Validate access
    let accessPayload: SubscriptionAccessPayload | null = null;
    
    if (token) {
      accessPayload = validateSubscriptionAccessToken(token);
      if (!accessPayload) {
        return NextResponse.json(
          { error: 'Invalid or expired access token' },
          { status: 401 }
        );
      }
    } else if (email) {
      // Allow lookup by email with rate limiting
      const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
      if (!RateLimit.check(`subscriptions_lookup:${email}`, 10, 60 * 60)) {
        return NextResponse.json(
          { error: 'Too many lookup attempts' },
          { status: 429 }
        );
      }
      accessPayload = { email, subscriptionId: '' };
    } else {
      return NextResponse.json(
        { error: 'Access token or email required' },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();

    // Get all subscriptions for the email
    const subscriptions = await db.collection('subscriptions')
      .find({ email: accessPayload.email })
      .sort({ createdAt: -1 })
      .toArray();

    // Get billing history summary
    const billingHistory = await db.collection('subscription_billing')
      .find({ email: accessPayload.email })
      .sort({ billingDate: -1 })
      .limit(12)
      .toArray();

    // Sanitize and format response
    const formattedSubscriptions = subscriptions.map(sub => ({
      id: sub._id.toString(),
      planId: sub.planId,
      planName: sub.planName,
      monthlyPrice: sub.monthlyPrice,
      status: sub.status,
      subscribedAt: sub.subscribedAt,
      nextChargeDate: sub.nextChargeDate,
      lastChargeDate: sub.lastChargeDate,
      options: sub.options,
      metadata: sub.metadata
    }));

    return NextResponse.json({
      success: true,
      subscriptions: formattedSubscriptions,
      billingHistory: billingHistory.map(bill => ({
        id: bill._id.toString(),
        amount: bill.amount,
        status: bill.status,
        billingDate: bill.billingDate,
        description: bill.description
      })),
      accessToken: token || (accessPayload ? generateSubscriptionAccessToken(accessPayload) : null)
    });
  } catch (error) {
    logger.error('Subscriptions', 'Error fetching subscriptions', { error });
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/subscriptions/plans
 * Get available subscription plans
 */
export async function getPlans() {
  const plans = Object.entries(SUBSCRIPTION_TIERS).map(([id, tier]) => ({
    id,
    name: tier.name,
    description: tier.description,
    price: tier.price / 100,
    retailValue: tier.retailValue / 100,
    discount: tier.discount,
    benefits: tier.benefits,
    productIds: tier.productIds
  }));

  return NextResponse.json({
    success: true,
    plans
  });
}
