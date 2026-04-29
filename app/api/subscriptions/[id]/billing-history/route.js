export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';
import { verifySubscriptionAccessToken } from '@/lib/subscription-access';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const token = request.nextUrl.searchParams.get('token') || request.headers.get('x-subscription-token');

    if (!token) {
      return NextResponse.json({ error: 'Subscription access token is required' }, { status: 401 });
    }

    const tokenData = verifySubscriptionAccessToken(token);
    if (!tokenData) {
      return NextResponse.json({ error: 'Invalid or expired subscription access token' }, { status: 401 });
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid subscription ID' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const subscription = await db.collection('subscriptions').findOne({ _id: new ObjectId(id) });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    const requestedEmail = String(subscription.email || '').toLowerCase();
    const tokenEmail = String(tokenData.email || '').toLowerCase();
    const tokenSubId = tokenData.subscriptionId;
    if (requestedEmail !== tokenEmail || (tokenSubId && tokenSubId !== id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Query subscription payments from payments collection
    const payments = await db
      .collection('subscription_payments')
      .find({ subscriptionId: id })
      .sort({ createdAt: -1 })
      .limit(24)
      .toArray();

    return NextResponse.json({
      success: true,
      subscription: {
        id,
        planName: subscription.planName,
        monthlyPrice: subscription.monthlyPrice,
        status: subscription.status,
        subscribedAt: subscription.subscribedAt,
      },
      payments,
      count: payments.length,
    });
  } catch (error) {
    logger.error('Subscriptions', 'Failed to fetch billing history', error);
    return NextResponse.json({ error: 'Failed to fetch billing history' }, { status: 500 });
  }
}
