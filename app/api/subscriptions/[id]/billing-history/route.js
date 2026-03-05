import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid subscription ID' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const subscription = await db.collection('subscriptions').findOne({ _id: new ObjectId(id) });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
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
