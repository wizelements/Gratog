export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';
import resend from '@/lib/email/resend-client';
import { getActiveMarketPickups } from '@/data/markets';
import { getWeeklyMenuProducts, WEEKLY_MENU } from '@/data/weeklyMenu';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER || '4047899960';
const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null;

interface WarmRequest {
  marketId?: string;
  dryRun?: boolean;
  limit?: number;
  secret?: string;
  message?: string;
  subject?: string;
}

const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 200;

export async function POST(request: NextRequest) {
  const raw: WarmRequest = await request.json().catch(() => ({}));

  // Auth: cron secret or admin session token
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

  const marketId = raw.marketId || 'all';
  const dryRun = raw.dryRun === true;
  const limit = Math.min(Math.max(Number(raw.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);

  try {
    const { db } = await connectToDatabase();

    const query: Record<string, unknown> = {
      $or: [{ intent: 'weekly_menu_texts' }, { intent: 'preorder_intent_no_market' }, { intent: 'email_signup' }],
      optedOut: { $ne: true },
    };

    if (marketId !== 'all') {
      query.$or = [
        { marketInterest: marketId },
        { 'metadata.marketId': marketId },
        { marketInterest: { $exists: false } },
      ];
    }

    const leads = await db
      .collection('newsletter_subscribers')
      .find(query)
      .limit(limit)
      .toArray();

    if (leads.length === 0) {
      return NextResponse.json({ success: true, sent: 0, skipped: 0, dryRun, marketId, message: 'No eligible leads found' });
    }

    const activeMarkets = getActiveMarketPickups();
    const targetMarket = marketId !== 'all' ? activeMarkets.find((m) => m.id === marketId) : activeMarkets[0];
    const marketName = targetMarket?.shortName || targetMarket?.name || 'your market';

    const weeklyProducts = getWeeklyMenuProducts('all');
    const featuredProducts = weeklyProducts.slice(0, 3).map((p) => p.name).join(', ');

    const results = {
      sent: 0,
      skipped: 0,
      sms: 0,
      email: 0,
      errors: 0,
      dryRun,
      marketId,
      recipients: [] as Array<{ channel: 'sms' | 'email'; to: string; ok: boolean; error?: string }>,
    };

    for (const lead of leads) {
      const phone = lead.phone || lead.metadata?.phone;
      const email = lead.email || lead.metadata?.email;
      const leadMarketId = lead.marketInterest || lead.metadata?.marketId || marketId;
      const market = activeMarkets.find((m) => m.id === leadMarketId) || targetMarket;
      const marketSlug = market?.id || 'serenbe';

      const smsBody = raw.message ||
        `Fresh weekly menu is live at Taste of Gratitude. This week: ${featuredProducts}. Reserve for ${marketName} pickup: https://tasteofgratitude.shop/weekly-menu?market=${marketSlug} — Reply STOP to opt out.`;

      const emailSubject = raw.subject || `This week at ${marketName}: ${WEEKLY_MENU.title}`;
      const emailHtml = `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; color: #1c1917;">
          <h2 style="color: #047857;">${WEEKLY_MENU.title}</h2>
          <p>${WEEKLY_MENU.preorderLanguage}</p>
          <p><strong>This week:</strong> ${featuredProducts}</p>
          <p>
            <a href="https://tasteofgratitude.shop/weekly-menu?market=${marketSlug}&utm_source=weekly_warm_email" style="display:inline-block;padding:12px 24px;background:#047857;color:#fff;border-radius:9999px;text-decoration:none;">
              View weekly menu
            </a>
          </p>
          <p style="font-size:12px;color:#78716c;margin-top:24px;">
            You received this because you signed up for weekly menu updates.
            <a href="https://tasteofgratitude.shop/unsubscribe?email=${encodeURIComponent(email || '')}">Unsubscribe</a> or reply STOP to SMS.
          </p>
        </div>
      `;

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
          logger.warn('WeeklyWarm', 'SMS send failed', { phone, error: (err as Error).message });
        }
      } else if (phone && dryRun) {
        results.recipients.push({ channel: 'sms', to: String(phone), ok: true });
      }

      if (email && resend && !dryRun) {
        try {
          await resend.emails.send({
            from: 'Taste of Gratitude <community@tasteofgratitude.shop>',
            to: email,
            subject: emailSubject,
            html: emailHtml,
          });
          results.sent += 1;
          results.email += 1;
          results.recipients.push({ channel: 'email', to: email, ok: true });
        } catch (err) {
          results.errors += 1;
          results.recipients.push({ channel: 'email', to: email, ok: false, error: (err as Error).message });
          logger.warn('WeeklyWarm', 'Email send failed', { email, error: (err as Error).message });
        }
      } else if (email && dryRun) {
        results.recipients.push({ channel: 'email', to: email, ok: true });
      }

      if (!phone && !email) {
        results.skipped += 1;
      }

      // Log send record
      if (!dryRun) {
        await db.collection('communication_logs').insertOne({
          leadId: lead._id,
          type: 'weekly_warm',
          marketId: leadMarketId,
          phone,
          email,
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
      marketId,
      recipientCount: results.recipients.length,
    });
  } catch (error) {
    logger.error('WeeklyWarm', 'Weekly warm failed', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send weekly warm', message: (error as Error).message },
      { status: 500 }
    );
  }
}
