#!/usr/bin/env npx tsx
/**
 * Weekly menu broadcast — Resend only.
 *
 * Sends a weekly menu email to leads captured via /weekly-menu, /preorder, and other
 * retention forms. Segments by market interest and deep-links each recipient to the
 * appropriate preorder or weekly-menu page.
 *
 * Usage:
 *   npx tsx scripts/weekly-menu-broadcast.ts --dry-run --week 2026-07-11 \
 *     --subject "This week's menu: Golden Glow, Kissed by Gods, Grateful Defense" \
 *     --body "Fresh small batches ready for Saturday pickup..."
 *
 *   npx tsx scripts/weekly-menu-broadcast.ts --send --week 2026-07-11 \
 *     --subject "This week's menu" \
 *     --body "Fresh small batches ready for Saturday pickup..." \
 *     --image-url https://tasteofgratitude.shop/images/menu-2026-07-11.jpg
 *
 * Defaults to dry-run unless --send is explicitly passed.
 */

import { connectToDatabase } from '../lib/db-optimized.js';
import { logger } from '../lib/logger.js';
import { buildUnsubscribeUrl } from '../lib/email/unsubscribe-tokens.js';
import { Resend } from 'resend';

interface LeadRecord {
  id?: string;
  _id?: any;
  email: string;
  marketInterest?: string | null;
  metadata?: Record<string, any>;
  unsubscribed?: boolean;
  unsubscribedAt?: Date | string;
  optOutAt?: Date | string;
  source?: string;
  intent?: string;
}

const args = parseArgs(process.argv.slice(2));

function argString(name: string): string | undefined {
  const value = args[name];
  return typeof value === 'string' ? value : undefined;
}

const DRY_RUN = !args['send'];
const WEEK = argString('week') || getUpcomingSaturdayISO();
const SUBJECT = argString('subject') || `Weekly menu for the week of ${WEEK}`;
const BODY = argString('body') || '';
const IMAGE_URL = argString('image-url') || '';
const BATCH_SIZE = Number(argString('batch-size') || 50);
const DELAY_MS = Number(argString('delay-ms') || 250);

function parseArgs(argv: string[]): Record<string, string | true> {
  const out: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (key.startsWith('--')) {
      const name = key.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        out[name] = next;
        i++;
      } else {
        out[name] = true;
      }
    }
  }
  return out;
}

function getUpcomingSaturdayISO(): string {
  const now = new Date();
  const day = now.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7 || 7;
  const sat = new Date(now);
  sat.setDate(now.getDate() + daysUntilSaturday);
  return sat.toISOString().slice(0, 10);
}

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || 'https://tasteofgratitude.shop').replace(/\/$/, '');
}

function preorderUrl(marketId: string): string {
  return `${baseUrl()}/preorder?market=${encodeURIComponent(marketId)}&utm_source=weekly_email&utm_campaign=passive_preorder_funnel&week=${encodeURIComponent(WEEK)}`;
}

function weeklyMenuUrl(): string {
  return `${baseUrl()}/weekly-menu?utm_source=weekly_email&utm_campaign=weekly_menu_capture&week=${encodeURIComponent(WEEK)}`;
}

function resolveMarketId(lead: LeadRecord): string | null {
  const meta = lead.metadata || {};
  return (
    lead.marketInterest ||
    meta.marketId ||
    meta.landingMarketId ||
    null
  );
}

function isUnsubscribed(lead: LeadRecord): boolean {
  if (lead.unsubscribed === true) return true;
  if (lead.unsubscribedAt) return true;
  if (lead.optOutAt) return true;
  const meta = lead.metadata || {};
  if (meta.optOutAt) return true;
  if (meta.unsubscribedAt) return true;
  if (meta.unsubscribed === true) return true;
  return false;
}

async function loadBodyFromStdin(): Promise<string> {
  if (process.stdin.isTTY) return BODY;
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data || BODY;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildHtml({ marketId, body, imageUrl, unsubscribeUrl }: {
  marketId: string | null;
  body: string;
  imageUrl: string;
  unsubscribeUrl: string;
}): string {
  const ctaUrl = marketId ? preorderUrl(marketId) : weeklyMenuUrl();
  const ctaText = marketId ? 'Reserve my market pickup' : 'View this week\'s menu';
  const imageBlock = imageUrl
    ? `<p><img src="${escapeHtml(imageUrl)}" alt="Weekly menu" style="max-width:100%;border-radius:12px;" /></p>`
    : '';
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(SUBJECT)}</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1c1917; max-width: 600px; margin: 0 auto; padding: 24px;">
  <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #047857;">Fresh weekly menu • Taste of Gratitude</p>
  ${imageBlock}
  <div style="font-size: 17px; color: #1c1917;">${escapeHtml(body).replace(/\n/g, '<br/>')}</div>
  <p style="margin-top: 24px;">
    <a href="${ctaUrl}" style="display: inline-block; padding: 14px 24px; background: #047857; color: #fff; text-decoration: none; border-radius: 9999px; font-weight: 600;">${ctaText}</a>
  </p>
  <hr style="border: 0; border-top: 1px solid #e7e5e4; margin: 32px 0;" />
  <p style="font-size: 13px; color: #78716c;">
    You received this because you signed up for weekly menu updates at tasteofgratitude.shop.<br/>
    <a href="${unsubscribeUrl}" style="color: #78716c; text-decoration: underline;">Unsubscribe</a> anytime.
  </p>
</body>
</html>`;
}

async function sendOne(resend: Resend, lead: LeadRecord, html: string, text: string) {
  const from = process.env.RESEND_FROM_EMAIL || 'hello@tasteofgratitude.shop';
  return resend.emails.send({
    from,
    to: lead.email,
    subject: SUBJECT,
    html,
    text,
    headers: {
      'List-Unsubscribe': `<${buildUnsubscribeUrl(baseUrl(), lead.email)}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });
}

async function logBroadcast(db: any, entry: Record<string, any>) {
  await db.collection('broadcast_logs').insertOne({
    ...entry,
    createdAt: new Date(),
  });
}

async function loadLeads(db: any): Promise<LeadRecord[]> {
  // Primary source: newsletter_subscribers (deduplicated, market-aware).
  const subscriberCursor = db.collection('newsletter_subscribers').find({
    email: { $exists: true, $nin: [null, ''] },
  });
  const subscribers: LeadRecord[] = await subscriberCursor.toArray();

  // Fallback / enrichment: lead_intents for weekly_menu_texts.
  const intentCursor = db.collection('lead_intents').find({
    intent: 'weekly_menu_texts',
    email: { $exists: true, $nin: [null, ''] },
  });
  const intents: LeadRecord[] = await intentCursor.toArray();

  // Merge by email, preferring subscriber records but enriching market interest.
  const byEmail = new Map<string, LeadRecord>();
  for (const s of subscribers) {
    const email = s.email.trim().toLowerCase();
    byEmail.set(email, {
      ...s,
      email,
      marketInterest: s.marketInterest || s.metadata?.marketId || s.metadata?.landingMarketId || null,
    });
  }
  for (const intent of intents) {
    const email = intent.email.trim().toLowerCase();
    const existing = byEmail.get(email);
    if (existing) {
      const marketId = resolveMarketId(intent);
      if (marketId && !existing.marketInterest) {
        existing.marketInterest = marketId;
      }
      continue;
    }
    byEmail.set(email, {
      ...intent,
      email,
      marketInterest: resolveMarketId(intent),
    });
  }

  return Array.from(byEmail.values());
}

async function main() {
  const bodyText = await loadBodyFromStdin();
  if (!bodyText.trim()) {
    console.error('Error: --body is required. Pass a string or pipe body text via stdin.');
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI is required to load leads.');
    process.exit(1);
  }
  if (!process.env.RESEND_API_KEY && !DRY_RUN) {
    console.error('Error: RESEND_API_KEY is required to send real emails.');
    process.exit(1);
  }
  if (!process.env.JWT_SECRET && !process.env.UNSUBSCRIBE_SECRET) {
    console.error('Error: JWT_SECRET or UNSUBSCRIBE_SECRET is required for unsubscribe tokens.');
    process.exit(1);
  }

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  const { db } = await connectToDatabase();

  const allLeads = await loadLeads(db);
  const eligible = allLeads.filter((lead) => {
    if (!lead.email || !lead.email.includes('@')) return false;
    return !isUnsubscribed(lead);
  });

  const byMarket: Record<string, LeadRecord[]> = {};
  const noMarket: LeadRecord[] = [];
  for (const lead of eligible) {
    const marketId = resolveMarketId(lead);
    if (marketId) {
      byMarket[marketId] = byMarket[marketId] || [];
      byMarket[marketId].push(lead);
    } else {
      noMarket.push(lead);
    }
  }

  console.log('\n=== Weekly menu broadcast preview ===');
  console.log(`Week: ${WEEK}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY-RUN (no emails sent)' : 'LIVE SEND'}`);
  console.log(`Subject: ${SUBJECT}`);
  console.log(`Total eligible leads: ${eligible.length}`);
  for (const [marketId, list] of Object.entries(byMarket)) {
    console.log(`  ${marketId}: ${list.length}`);
  }
  console.log(`  no market preference: ${noMarket.length}`);
  console.log(`Image URL: ${IMAGE_URL || '(none)'}`);
  console.log('=====================================\n');

  if (DRY_RUN) {
    console.log('Dry run complete. Pass --send to send emails.');
    process.exit(0);
  }

  let sent = 0;
  let failed = 0;
  const all = [...eligible];

  for (let i = 0; i < all.length; i += BATCH_SIZE) {
    const batch = all.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (lead) => {
        const marketId = resolveMarketId(lead);
        const unsubUrl = buildUnsubscribeUrl(baseUrl(), lead.email);
        const html = buildHtml({ marketId, body: bodyText, imageUrl: IMAGE_URL, unsubscribeUrl: unsubUrl });
        const text = `${bodyText}\n\n${marketId ? preorderUrl(marketId) : weeklyMenuUrl()}\n\nUnsubscribe: ${unsubUrl}`;
        const logBase = {
          leadId: lead.id || lead._id?.toString(),
          email: lead.email,
          marketId,
          campaignWeek: WEEK,
          campaign: 'weekly_menu_broadcast',
          source: 'scripts/weekly-menu-broadcast.ts',
        };
        try {
          if (!resend) throw new Error('Resend client not initialized');
          const result = await sendOne(resend, lead, html, text);
          if (result.error) throw new Error(result.error.message || 'Resend error');
          sent++;
          await logBroadcast(db, {
            ...logBase,
            status: 'sent',
            providerMessageId: result.data?.id || null,
            sentAt: new Date(),
          });
        } catch (err) {
          failed++;
          const message = err instanceof Error ? err.message : String(err);
          logger.error('WeeklyBroadcast', 'Send failed', { email: lead.email, error: message });
          await logBroadcast(db, {
            ...logBase,
            status: 'failed',
            error: message,
            sentAt: new Date(),
          });
        }
      })
    );
    if (i + BATCH_SIZE < all.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  console.log(`\nBroadcast complete: ${sent} sent, ${failed} failed.`);
  process.exit(failed > 0 ? 2 : 0);
}

main().catch((err) => {
  logger.error('WeeklyBroadcast', 'Fatal error', { error: err instanceof Error ? err.message : String(err) });
  console.error(err);
  process.exit(1);
});
