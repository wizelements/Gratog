import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/db-optimized';
import { getSquareClient } from '@/lib/square';
import { logger } from '@/lib/logger';
import { verifySubscriptionAccessToken } from '@/lib/subscription-access';

export async function POST(request, { params }) {
  try {
    if (process.env.FEATURE_SUBSCRIPTIONS_ENABLED !== 'true') {
      return NextResponse.json({ error: 'Subscriptions are disabled' }, { status: 503 });
    }

    const { id } = await params;
    const { cardNonce } = await request.json();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid subscription ID' }, { status: 400 });
    }

    if (!cardNonce) {
      return NextResponse.json({ error: 'cardNonce is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const subscription = await db.collection('subscriptions').findOne({ _id: new ObjectId(id) });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    const token = request.nextUrl.searchParams.get('token') || request.headers.get('x-subscription-token');
    const tokenData = verifySubscriptionAccessToken(token);
    if (!tokenData || tokenData.email !== String(subscription.email || '').toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized subscription action' }, { status: 401 });
    }

    const client = getSquareClient();
    await client.customers.createCard(subscription.squareCustomerId, { cardNonce });

    await db.collection('subscriptions').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          paymentUpdatedAt: new Date(),
          'paymentRetry.attemptCount': 0,
          'paymentRetry.nextRetryAt': null,
          status: 'active',
          updatedAt: new Date(),
        },
      }
    );

    logger.info('Subscriptions', 'Payment method updated', { id });

    return NextResponse.json({ success: true, status: 'payment_updated' });
  } catch (error) {
    logger.error('Subscriptions', 'Failed to update payment', error);
    return NextResponse.json({ error: 'Failed to update payment method' }, { status: 500 });
  }
}
