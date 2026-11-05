export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getActiveMarketPickups } from '@/data/markets';
import resend from '@/lib/email/resend-client';
import { buildUnsubscribeUrl } from '@/lib/email/unsubscribe-tokens';
import { logger } from '@/lib/logger';
import {
  getMarketingClient,
  eligibleMarketingSubscribers,
  reserveMarketingSend,
  finishMarketingSend,
} from '@/lib/marketing/turso-store.mjs';

interface BroadcastRequest {
  marketId?: string;
  week?: string;
  subject?: string;
  message?: string;
  limit?: number;
  send?: boolean;
}
const jsonError = (error: string, status: number) =>
  NextResponse.json({ success: false, error }, { status });

function authorized(request: NextRequest): boolean {
  const value = request.headers.get('authorization') || '';
  const bearer = value.startsWith('Bearer ') ? value.slice(7) : '';
  return Boolean(bearer && (
    (process.env.ADMIN_API_TOKEN && bearer === process.env.ADMIN_API_TOKEN) ||
    (process.env.WEEKLY_WARM_CRON_SECRET && bearer === process.env.WEEKLY_WARM_CRON_SECRET)
  ));
}
function upcomingMarketSaturday(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value);
  const date = new Date(Date.UTC(get('year'), get('month') - 1, get('day')));
  date.setUTCDate(date.getUTCDate() + ((6 - date.getUTCDay() + 7) % 7));
  return date.toISOString().slice(0, 10);
}
function escapeHtml(input: string): string {
  return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function emailHtml(body: string, marketName: string, marketId: string, week: string, email: string): string {
  const url = 'https://tasteofgratitude.shop/weekly-menu?market=' + encodeURIComponent(marketId)
    + '&utm_source=weekly_email&utm_medium=email&utm_campaign=' + encodeURIComponent('weekly-menu-' + week);
  const unsub = buildUnsubscribeUrl('https://tasteofgratitude.shop', email);
  return '<!doctype html><html><body style="font-family:Arial,sans-serif;color:#1c1917;max-width:600px;margin:auto;padding:24px">' +
    '<h2>Fresh this week at ' + escapeHtml(marketName) + '</h2>' +
    '<p>' + escapeHtml(body).replace(/\n/g, '<br>') + '</p>' +
    '<p><a href="' + url + '" style="background:#047857;color:white;padding:14px 20px;border-radius:24px;text-decoration:none">View the weekly menu</a></p>' +
    '<p style="font-size:12px;color:#57534e">Menu and availability may change. Confirm pickup details before ordering.</p>' +
    '<p style="font-size:12px"><a href="' + unsub + '">Unsubscribe</a> from menu emails.</p></body></html>';
}
// No GET side effects: avoid sending emails from URL previews, crawlers, or copied links.
export async function GET() {
  return jsonError('Use an authenticated POST. This endpoint never sends from GET.', 405);
}
export async function POST(request: NextRequest) {
  if (!authorized(request)) return jsonError('Unauthorized', 401);
  const raw: BroadcastRequest | null = await request.json().catch(() => null);
  if (!raw || typeof raw !== 'object') return jsonError('Invalid request', 400);
  const dryRun = raw.send !== true;
  const week = raw.week || upcomingMarketSaturday();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week) || Number.isNaN(Date.parse(week))) return jsonError('Invalid market week', 400);
  const marketId = raw.marketId || 'serenbe';
  const activeMarkets = getActiveMarketPickups();
  const targets = marketId === 'all' ? activeMarkets : activeMarkets.filter(m => m.id === marketId);
  if (!targets.length) return jsonError('Market is paused or unknown', 400);
  const limit = Math.min(500, Math.max(1, Math.trunc(Number(raw.limit) || 200)));
  const subject = typeof raw.subject === 'string' ? raw.subject.trim().slice(0, 140) : '';
  const message = typeof raw.message === 'string' ? raw.message.trim().slice(0, 1800) : '';
  if (!dryRun && (!subject || !message)) return jsonError('Subject and message are required before sending', 400);
  if (!dryRun && process.env.MARKETING_EMAIL_SEND_ENABLED !== 'true') return jsonError('Marketing sends are not enabled', 503);
  if (!dryRun && !resend) return jsonError('Email provider is not configured', 503);
  if (!dryRun && !(process.env.JWT_SECRET || process.env.UNSUBSCRIBE_SECRET)) return jsonError('Unsubscribe signing secret is not configured', 503);

  const campaignKey = 'weekly-menu:' + week;
  let eligible = 0, sent = 0, skipped = 0, failures = 0;
  try {
    const db = getMarketingClient();
    for (const market of targets) {
      const leads = await eligibleMarketingSubscribers(db, market.id, limit, campaignKey);
      eligible += leads.length;
      for (const lead of leads) {
        if (dryRun) continue;
        const reserved = await reserveMarketingSend(db, lead.email, market.id, campaignKey);
        if (!reserved) { skipped += 1; continue; }
        try {
          const response = await resend!.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'Taste of Gratitude <community@tasteofgratitude.shop>',
            to: lead.email,
            subject: subject,
            html: emailHtml(message, market.shortName || market.name, market.id, week, lead.email),
            headers: { 'List-Unsubscribe': '<' + buildUnsubscribeUrl('https://tasteofgratitude.shop', lead.email) + '>' }
          });
          const receiptId = response.data?.id;
          if (response.error || !receiptId) throw new Error('EMAIL_PROVIDER_NOT_ACCEPTED');
          await finishMarketingSend(db, lead.email, campaignKey, 'sent', receiptId);
          sent += 1;
        } catch (error) {
          failures += 1;
          try { await finishMarketingSend(db, lead.email, campaignKey, 'failed'); } catch {}
          logger.error('WeeklyWarm', 'Provider delivery not accepted', { code: error instanceof Error ? error.message : 'unknown' });
        }
      }
    }
    return NextResponse.json({
      success: failures === 0, dryRun, sendEnabled: process.env.MARKETING_EMAIL_SEND_ENABLED === 'true',
      marketId, week, campaignKey, eligible, sent, skipped, failures,
      note: dryRun ? 'No emails sent. Eligible excludes previously reserved campaign recipients.' : 'Sent indicates provider acceptance, not inbox delivery or sales.'
    });
  } catch (error) {
    logger.error('WeeklyWarm', 'Turso marketing broadcast failed', { code: error instanceof Error ? error.message : 'unknown' });
    return jsonError('Marketing broadcast unavailable', 503);
  }
}
