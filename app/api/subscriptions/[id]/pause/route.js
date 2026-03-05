import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/db-optimized';
import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { months = 1 } = await request.json();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid subscription ID' }, { status: 400 });
    }

    if (months < 1 || months > 2) {
      return NextResponse.json({ error: 'Can only pause for 1-2 months' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const subscription = await db.collection('subscriptions').findOne({ _id: new ObjectId(id) });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    const pauseUntilDate = new Date();
    pauseUntilDate.setMonth(pauseUntilDate.getMonth() + months);

    await db.collection('subscriptions').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'paused',
          pausedUntil: pauseUntilDate,
          updatedAt: new Date(),
        },
      }
    );

    await sendEmail({
      to: subscription.email,
      subject: '⏸️ Your subscription has been paused',
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2>⏸️ Subscription Paused</h2>
        <div style="background:#dbeafe;border-left:4px solid #0284c7;padding:15px;margin:20px 0;">
          <strong>Your subscription is now paused.</strong>
          <p>We'll resume your ${subscription.planName} on <strong>${pauseUntilDate.toLocaleDateString()}</strong>.</p>
        </div>
        <p>Your subscription will automatically resume on the date above. No action needed!</p>
        <p><a href="https://tasteofgratitude.shop/account/subscriptions">Manage your subscription</a></p>
      </div>`,
    });

    logger.info('Subscriptions', 'Paused subscription', { id, pausedUntil: pauseUntilDate });

    return NextResponse.json({ success: true, pausedUntil: pauseUntilDate });
  } catch (error) {
    logger.error('Subscriptions', 'Failed to pause subscription', error);
    return NextResponse.json({ error: 'Failed to pause subscription' }, { status: 500 });
  }
}
