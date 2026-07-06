export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';
import resend from '@/lib/email/resend-client';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER || '4047899960';
const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null;

const DEFAULT_INACTIVE_DAYS = 21;
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
  const couponCode = raw.couponCode || process.env.WINBACK_COUPON_CODE || 'WELCOME15';

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysInactive);

  try {
    const { db } = await connectToDatabase();

    // Find subscribers who joined but never preordered, or who have not received a communication recently.
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
        ],
      })
      .limit(limit)
      .toArray();

    const results = {
      sent: 0,
      skipped: 0,
      sms: 0,
      email: 0,
      errors: 0,
      dryRun,
      daysInactive,
      recipients: [] as Array<{ channel: 'sms' | 'email'; to: string; ok: boolean; error?: string }>,
    };

    const smsBody = raw.message ||
      `We miss you at Taste of Gratitude. Come back with code ${couponCode} for a discount on your next preorder. Reserve at https://tasteofgratitude.shop/preorder — Reply STOP to opt out.`;

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
          <a href="https://tasteofgratitude.shop/unsubscribe?email={{email}}">Unsubscribe</a> or reply STOP to SMS.
        </p>
      </div>
    `;

    for (const lead of leads) {
      const phone = lead.phone;
      const email = lead.email;

      if (phone && twilioClient && !dryRun) {
        try {
          await twilioClient.messages.create({
            body: smsBody,
            from: `+1${fromNumber.replace(/\D/g, '')}`,
            to: `+1${String(phone).replace(/\D/g, '')}`,
          });
          results.sent += 1;
          results.sms += 1;
          results.recipients.push({ channel: 'sms', to: String(phone), ok: true });
        } catch (err) {
          results.errors += 1;
          results.recipients.push({ channel: 'sms', to: String(phone), ok: false, error: (err as Error).message });
          logger.warn('Winback', 'SMS send failed', { phone, error: (err as Error).message });
        }
      } else if (phone && dryRun) {
        results.recipients.push({ channel: 'sms', to: String(phone), ok: true });
      }

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

      if (!phone && !email) {
        results.skipped += 1;
      }

      if (!dryRun) {
        await db.collection('newsletter_subscribers').updateOne(
          { _id: lead._id },
          { $set: { lastCommunicationAt: new Date(), updatedAt: new Date() } }
        );
        await db.collection('communication_logs').insertOne({
          leadId: lead._id,
          type: 'winback',
          phone,
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
      sms: results.sms,
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
