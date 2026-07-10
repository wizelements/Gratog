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

function parseBoolean(value: string | null) {
  return value === '1' || value === 'true' || value === 'yes';
}

function warmRequestFromSearchParams(request: NextRequest): WarmRequest {
  const params = request.nextUrl.searchParams;
  return {
    marketId: params.get('marketId') || params.get('market') || undefined,
    dryRun: parseBoolean(params.get('dryRun')),
    limit: params.get('limit') ? Number(params.get('limit')) : undefined,
    secret: params.get('secret') || undefined,
    subject: params.get('subject') || undefined,
    message: params.get('message') || undefined,
  };
}

function isAuthorized(request: NextRequest, raw: WarmRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const bearer = authHeader.replace(/^Bearer\s+/i, '');
  const cronSecret = process.env.WEEKLY_WARM_CRON_SECRET;
  const adminToken = process.env.ADMIN_API_TOKEN;

  return Boolean(
    (cronSecret && bearer === cronSecret) ||
    (adminToken && bearer === adminToken) ||
    (cronSecret && raw.secret === cronSecret) ||
    (adminToken && raw.secret === adminToken)
  );
}

function buildWeeklyWarmEmail({
  email,
  marketName,
  marketSlug,
  featuredProducts,
}: {
  email: string;
  marketName: string;
  marketSlug: string;
  featuredProducts: string;
}) {
  const encodedEmail = encodeURIComponent(email);
  const encodedMarket = encodeURIComponent(marketSlug || 'serenbe');

  return `
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; color: #1c1917;">
      <h2 style="color: #047857;">${WEEKLY_MENU.title}</h2>
      <p>${WEEKLY_MENU.preorderLanguage}</p>
      <p><strong>This week:</strong> ${featuredProducts}</p>
      <p>Pickup at ${marketName}.</p>
      <p>
        <a href="https://tasteofgratitude.shop/weekly-menu?market=${encodedMarket}&utm_source=weekly_warm_email" style="display:inline-block;padding:12px 24px;background:#047857;color:#fff;border-radius:9999px;text-decoration:none;">
          View weekly menu
        </a>
      </p>
      <p style="font-size:12px;color:#78716c;margin-top:24px;">
        You received this because you signed up for weekly menu updates.
        <a href="https://tasteofgratitude.shop/unsubscribe?email=${encodedEmail}">Unsubscribe</a>.
      </p>
    </div>
  `;
}

export async function GET(request: NextRequest) {
  return handleWarmRequest(request, warmRequestFromSearchParams(request));
}

export async function POST(request: NextRequest) {
  const raw: WarmRequest = await request.json().catch(() => ({}));
  return handleWarmRequest(request, raw);
}

async function handleWarmRequest(request: NextRequest, raw: WarmRequest) {
  if (!isAuthorized(request, raw)) {
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
    const fallbackMarketName = targetMarket?.shortName || targetMarket?.name || 'your market';

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

    for (const lead of leads) {
      const email = lead.email || lead.metadata?.email;
      const leadMarketId = lead.marketInterest || lead.metadata?.marketId || marketId;
      const market = activeMarkets.find((m) => m.id === leadMarketId) || targetMarket || activeMarkets[0];
      const marketSlug = market?.id || 'serenbe';
      const marketName = market?.shortName || market?.name || fallbackMarketName;
      const emailSubject = raw.subject || `This week at ${marketName}: ${WEEKLY_MENU.title}`;

      if (!email) {
        results.skipped += 1;
        if (!dryRun) {
          await db.collection('communication_logs').insertOne({
            leadId: lead._id,
            type: 'weekly_warm',
            marketId: leadMarketId,
            email: null,
            sentAt: new Date(),
            success: false,
            skippedReason: 'missing_email',
          });
        }
        continue;
      }

      const emailHtml = buildWeeklyWarmEmail({ email, marketName, marketSlug, featuredProducts });

      if (dryRun) {
        results.recipients.push({ channel: 'email', to: email, ok: true });
      } else if (resend) {
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
      } else {
        results.skipped += 1;
        results.recipients.push({ channel: 'email', to: email, ok: false, error: 'resend_not_configured' });
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
