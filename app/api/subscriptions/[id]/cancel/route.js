import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/db-optimized';
import { getSquareClient } from '@/lib/square';
import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { verifySubscriptionAccessToken } from '@/lib/subscription-access';

export async function POST(request, { params }) {
  try {
    if (process.env.FEATURE_SUBSCRIPTIONS_ENABLED !== 'true') {
      return NextResponse.json({ error: 'Subscriptions are disabled' }, { status: 503 });
    }

    const { id } = await params;
    const { reason = 'user_requested' } = await request.json();

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

    // Cancel in Square
    if (subscription.squareSubscriptionId) {
      try {
        const client = getSquareClient();
        await client.subscriptions.cancel(subscription.squareSubscriptionId);
      } catch (squareError) {
        logger.error('Subscriptions', 'Square cancellation failed (continuing)', squareError);
      }
    }

    const canceledAt = new Date();
    const winbackScheduledAt = new Date(canceledAt);
    winbackScheduledAt.setDate(winbackScheduledAt.getDate() + 30);

    await db.collection('subscriptions').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'canceled',
          canceledAt,
          cancelReason: reason,
          winbackScheduledAt,
          winbackSent: false,
          updatedAt: new Date(),
        },
      }
    );

    await sendEmail({
      to: subscription.email,
      subject: "😢 We'll miss you! Here's 20% off if you come back",
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2>We'll Miss You 😢</h2>
        <p>Your ${subscription.planName} subscription has been canceled. We understand—life gets busy!</p>
        <h3>Come Back Anytime</h3>
        <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:2px solid #f59e0b;padding:20px;border-radius:8px;margin:20px 0;text-align:center;">
          <h2>20% OFF Your Next Order</h2>
          <p>Valid for 30 days</p>
          <div style="background:#fff;padding:10px;border:2px dashed #f59e0b;border-radius:4px;font-size:18px;font-weight:bold;margin:10px 0;">COMEBACK20</div>
        </div>
        <p style="text-align:center;">
          <a href="https://tasteofgratitude.shop/account/subscriptions" style="background:#059669;color:white;padding:12px 24px;border-radius:4px;text-decoration:none;display:inline-block;">Reactivate My Subscription</a>
        </p>
      </div>`,
    });

    logger.info('Subscriptions', 'Canceled subscription', { id, reason });

    return NextResponse.json({ success: true, status: 'canceled' });
  } catch (error) {
    logger.error('Subscriptions', 'Failed to cancel subscription', error);
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
  }
}
