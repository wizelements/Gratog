import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/db-optimized';
import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { verifySubscriptionAccessToken } from '@/lib/subscription-access';

export async function POST(request, { params }) {
  try {
    if (process.env.FEATURE_SUBSCRIPTIONS_ENABLED !== 'true') {
      return NextResponse.json({ error: 'Subscriptions are disabled' }, { status: 503 });
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid subscription ID' }, { status: 400 });
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

    const skipUntilDate = new Date();
    skipUntilDate.setDate(skipUntilDate.getDate() + 30);

    await db.collection('subscriptions').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          skipUntil: skipUntilDate,
          nextChargeDate: skipUntilDate,
          updatedAt: new Date(),
        },
      }
    );

    await sendEmail({
      to: subscription.email,
      subject: '✓ Your next shipment has been skipped',
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2>✓ Shipment Skipped</h2>
        <div style="background:#d1fae5;border-left:4px solid #059669;padding:15px;margin:20px 0;">
          <strong>Your next shipment has been skipped!</strong>
          <p>We won't charge you this month. Your next charge will be on <strong>${skipUntilDate.toLocaleDateString()}</strong>.</p>
        </div>
        <p>No worries—you can skip anytime, and it won't affect your subscription status.</p>
        <p><a href="https://tasteofgratitude.shop/account/subscriptions">View your subscription</a></p>
      </div>`,
    });

    logger.info('Subscriptions', 'Skipped shipment', { id, skipUntil: skipUntilDate });

    return NextResponse.json({ success: true, skipUntil: skipUntilDate });
  } catch (error) {
    logger.error('Subscriptions', 'Failed to skip shipment', error);
    return NextResponse.json({ error: 'Failed to skip shipment' }, { status: 500 });
  }
}
