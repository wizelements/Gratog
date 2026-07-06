export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';
import resend from '@/lib/email/resend-client';
import { getActiveMarketPickups } from '@/data/markets';
import { getWeeklyMenuProducts, WEEKLY_MENU } from '@/data/weeklyMenu';

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
      email: 0,
      errors: 0,
      dryRun,
      marketId,
      recipients: [] as Array<{ channel: 'email'; to: string; ok: boolean; error?: string }>,
    };

    const emailSubject = raw.subject || `This week at ${marketName}: ${WEEKLY_MENU.title}`;
    const emailHtml = `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; color: #1c1917;">
        <h2 style="color: #047857;">${WEEKLY_MENU.title}</h2>
        <p>${WEEKLY_MENU.preorderLanguage}</p>
        <p><strong>This week:</strong> ${featuredProducts}</p>
        <p>Pickup at ${marketName}.</p>
        <p>
          <a href="https://tasteofgratitude.shop/weekly-menu?market=${marketSlug}&utm_source=weekly_warm_email" style="display:inline-block;padding:12px 24px;background:#047857;color:#fff;border-radius:9999px;text-decoration:none;">
            View weekly menu
          </a>
        </p>
        <p style="font-size:12px;color:#78716c;margin-top:24px;">
          You received this because you signed up for weekly menu updates.
          <a href="https://tasteofgratitude.shop/unsubscribe?email=${encodeURIComponent('{{email}}')}">Unsubscribe</a>.
        </p>
      </div>
    `;

    for (const lead of leads) {
      const email = lead.email || lead.metadata?.email;
      const leadMarketId = lead.marketInterest || lead.metadata?.marketId || marketId;
      const market = activeMarkets.find((m) => m.id === leadMarketId) || targetMarket;
      const marketSlug = market?.id || 'serenbe';

      if (email && resend && !dryRun) {
        try {
          await resend.emails.send({
            from: 'Taste of Gratitude <community@tasteofgratitude.shop>',
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
          logger.warn('WeeklyWarm', 'Email send failed', { email, error: (err as Error).message });
        }
      } else if (email && dryRun) {
        results.recipients.push({ channel: 'email', to: email, ok: true });
      }

      if (!email) {
        results.skipped += 1;
      }

      if (!dryRun) {
        await db.collection('communication_logs').insertOne({
          leadId: lead._id,
          type: 'weekly_warm',
          marketId: leadMarketId,
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
