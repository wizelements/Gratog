import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { sendEmail } from '@/lib/email';
import { CRON_SECRET } from '@/lib/auth-config';
import { logger } from '@/lib/logger';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const results = { preRenewal: 0, winback: 0, errors: [] };

    // 1. Pre-renewal reminders (3 days before charge)
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const threeDaysEnd = new Date(threeDaysFromNow);
    threeDaysEnd.setDate(threeDaysEnd.getDate() + 1);

    const renewalSubs = await db.collection('subscriptions').find({
      status: 'active',
      nextChargeDate: { $gte: threeDaysFromNow, $lt: threeDaysEnd },
      preRenewalEmailSent: { $ne: true },
    }).toArray();

    for (const sub of renewalSubs) {
      try {
        await sendEmail({
          to: sub.email,
          subject: `Your ${sub.planName} renews in 3 days 📦`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <h2>Your ${sub.planName} Renews in 3 Days</h2>
            <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:15px;margin:20px 0;">
              <strong>Heads up!</strong> Your subscription will be renewed on <strong>${sub.nextChargeDate.toLocaleDateString()}</strong> for <strong>$${sub.monthlyPrice.toFixed(2)}</strong>.
            </div>
            <p>You can skip, pause, swap, update payment, or cancel anytime:</p>
            <a href="https://tasteofgratitude.shop/account/subscriptions/${sub._id}" style="background:#059669;color:white;padding:12px 24px;border-radius:4px;text-decoration:none;display:inline-block;">Manage My Subscription</a>
          </div>`,
        });

        await db.collection('subscriptions').updateOne(
          { _id: sub._id },
          { $set: { preRenewalEmailSent: true, updatedAt: new Date() } }
        );
        results.preRenewal++;
      } catch (err) {
        results.errors.push({ id: sub._id.toString(), type: 'preRenewal', error: err.message });
      }
    }

    // 2. Winback emails (30 days after cancellation)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyOneDaysAgo = new Date(thirtyDaysAgo);
    thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 1);

    const winbackSubs = await db.collection('subscriptions').find({
      status: 'canceled',
      canceledAt: { $gte: thirtyOneDaysAgo, $lt: thirtyDaysAgo },
      winbackSent: { $ne: true },
    }).toArray();

    for (const sub of winbackSubs) {
      try {
        const offerExpires = new Date();
        offerExpires.setDate(offerExpires.getDate() + 7);

        await sendEmail({
          to: sub.email,
          subject: '💚 Come back for 20% off your next order',
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <h2>We Miss You! 💚</h2>
            <p>It's been a minute since we've seen you on your wellness journey. We'd love to have you back!</p>
            <div style="background:linear-gradient(135deg,#059669,#10b981);color:white;padding:30px;border-radius:8px;margin:20px 0;text-align:center;">
              <h1>20% OFF</h1>
              <p>Your next ${sub.planName} order</p>
              <div style="background:rgba(255,255,255,0.2);padding:15px;border:2px dashed white;border-radius:4px;font-size:20px;font-weight:bold;margin:15px 0;">WINBACK20</div>
              <p style="font-size:14px;">Valid until ${offerExpires.toLocaleDateString()}</p>
            </div>
            <p style="text-align:center;">
              <a href="https://tasteofgratitude.shop/account/subscriptions" style="background:white;color:#059669;padding:12px 24px;border-radius:4px;text-decoration:none;display:inline-block;font-weight:bold;">Reactivate Now</a>
            </p>
          </div>`,
        });

        await db.collection('subscriptions').updateOne(
          { _id: sub._id },
          { $set: { winbackSent: true, updatedAt: new Date() } }
        );
        results.winback++;
      } catch (err) {
        results.errors.push({ id: sub._id.toString(), type: 'winback', error: err.message });
      }
    }

    logger.info('Cron', 'Subscription reminders completed', results);

    return NextResponse.json({
      success: true,
      message: 'Subscription reminders processed',
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Cron', 'Subscription reminders cron failed', error);
    return NextResponse.json({ error: 'Cron job failed', details: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'Subscription Reminders Cron',
    status: 'active',
    schedule: 'Daily at 10:00 AM',
    description: 'Pre-renewal reminders (3 days before) and winback emails (30 days after cancel)',
    endpoint: '/api/cron/subscription-reminders',
    method: 'POST',
    authentication: 'Bearer token required',
    timestamp: new Date().toISOString(),
  });
}
