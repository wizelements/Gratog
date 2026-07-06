export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';
import resend from '@/lib/email/resend-client';

const DEFAULT_INACTIVE_DAYS = 21;
const DEFAULT_COUPON_CODE = process.env.WINBACK_COUPON_CODE || 'WINBACK10';
const MAX_LIMIT = 200;

interface WinbackRequest {
  daysInactive?: number;
  dryRun?: boolean;
  limit?: number;
  secret?: string;
  couponCode?: string;
  message?: string;
}

export async function POST(request: NextRequest) {
  const raw: WinbackRequest = await request.json().catch(() => ({}));

  const authHeader = request.headers.get('authorization') || '';
  const bearer = authHeader.replace(/^Bearer\s+/i, '');
  const cronSecret = process.env.WEEKLY_WARM_CRON_SECRET;
  const adminToken = process.env.ADMIN_API_TOKEN;

  const isAuthorized =
    (cronSecret && bearer === cronSecret) ||
    (adminToken && bearer === adminToken) ||
    (cronSecret && raw.secret === cronSecret) ||
    (adminToken && raw.secret === adminToken);

  if (!isAuthorized) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const daysInactive = Math.min(Math.max(Number(raw.daysInactive) || DEFAULT_INACTIVE_DAYS, 7), 365);
  const dryRun = raw.dryRun === true;
  const limit = Math.min(Math.max(Number(raw.limit) || 50, 1), MAX_LIMIT);
  const couponCode = raw.couponCode || process.env.WINBACK_COUPON_CODE || DEFAULT_COUPON_CODE;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysInactive);

  try {
    const { db } = await connectToDatabase();

    // Find subscribers who joined but never preordered, or who have not received a communication recently.
    // Exclude anyone who already received a winback offer (one per customer).
    const leads = await db
      .collection('newsletter_subscribers')
      .find({
        $or: [{ intent: 'weekly_menu_texts' }, { intent: 'email_signup' }, { intent: 'subscription_waitlist' }],
        $and: [
          { $or: [{ optedOut: { $ne: true } }, { optedOut: { $exists: false } }] },
          {
            $or: [
              { lastCommunicationAt: { $exists: false } },
              { lastCommunicationAt: { $lte: cutoff } },
            ],
          },
          { createdAt: { $lte: cutoff } },
          { $or: [{ receivedWinback: { $ne: true } }, { receivedWinback: { $exists: false } }] },
        ],
      })
      .limit(limit)
      .toArray();

    const results = {
      sent: 0,
      skipped: 0,
      email: 0,
      errors: 0,
      dryRun,
      daysInactive,
      recipients: [] as Array<{ channel: 'email'; to: string; ok: boolean; error?: string }>,
    };

    const emailSubject = 'We saved something for you';
    const emailHtml = `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; color: #1c1917;">
        <h2 style="color: #047857;">We miss you at Taste of Gratitude.</h2>
        <p>The weekly menu keeps changing. Use code <strong>${couponCode}</strong> on your next preorder.</p>
        <p>
          <a href="https://tasteofgratitude.shop/preorder?utm_source=winback_email" style="display:inline-block;padding:12px 24px;background:#047857;color:#fff;border-radius:9999px;text-decoration:none;">
            Preorder this week
          </a>
        </p>
        <p style="font-size:12px;color:#78716c;margin-top:24px;">
          <a href="https://tasteofgratitude.shop/unsubscribe?email={{email}}">Unsubscribe</a>.
        </p>
      </div>
    `;

    for (const lead of leads) {
      const email = lead.email;

      if (email && resend && !dryRun) {
        try {
          await resend.emails.send({
            from: 'Taste of Gratitude <rewards@tasteofgratitude.shop>',
            to: email,
            subject: emailSubject,
            html: emailHtml.replace('{{email}}', encodeURIComponent(email)),
          });
          results.sent += 1;
          results.email += 1;
          results.recipients.push({ channel: 'email', to: email, ok: true });
        } catch (err) {
          results.errors += 1;
          results.recipients.push({ channel: 'email', to: email, ok: false, error: (err as Error).message });
          logger.warn('Winback', 'Email send failed', { email, error: (err as Error).message });
        }
      } else if (email && dryRun) {
        results.recipients.push({ channel: 'email', to: email, ok: true });
      }

      if (!email) {
        results.skipped += 1;
      }

      if (!dryRun) {
        await db.collection('newsletter_subscribers').updateOne(
          { _id: lead._id },
          { $set: { lastCommunicationAt: new Date(), updatedAt: new Date(), receivedWinback: true } }
        );
        await db.collection('communication_logs').insertOne({
          leadId: lead._id,
          type: 'winback',
          email,
          couponCode,
          sentAt: new Date(),
          success: results.recipients[results.recipients.length - 1]?.ok ?? false,
        });
      }
    }

    return NextResponse.json({
      success: true,
      sent: results.sent,
      skipped: results.skipped,
      email: results.email,
      errors: results.errors,
      dryRun,
      daysInactive,
      recipientCount: results.recipients.length,
    });
  } catch (error) {
    logger.error('Winback', 'Winback send failed', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send winback', message: (error as Error).message },
      { status: 500 }
    );
  }
}
