export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { logger } from '@/lib/logger';
import { getMarketingClient, ensureMarketingSchema, unsubscribeMarketingEmail } from '@/lib/marketing/turso-store.mjs';

const toleranceSeconds = 300;
function verifyWebhook(payload, headers) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return false;
  const id = headers.get('svix-id');
  const timestamp = headers.get('svix-timestamp');
  const signature = headers.get('svix-signature');
  if (!id || !timestamp || !signature) return false;
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(Math.floor(Date.now() / 1000) - seconds) > toleranceSeconds) return false;
  const bytes = secret.startsWith('whsec_') ? Buffer.from(secret.slice(6), 'base64') : Buffer.from(secret, 'utf8');
  const expected = createHmac('sha256', bytes).update(id + '.' + timestamp + '.' + payload).digest();
  return signature.split(' ').some(part => {
    const [version, value] = part.trim().split(',');
    if (version !== 'v1' || !value) return false;
    const actual = Buffer.from(value, 'base64');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
}
const STATUS = {
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.delivery_delayed': 'delayed',
  'email.failed': 'failed',
  'email.suppressed': 'suppressed',
  'email.complained': 'complained',
  'email.bounced': 'bounced',
  'email.opened': 'opened',
  'email.clicked': 'clicked'
};
function recipient(data) {
  const value = Array.isArray(data?.to) ? data.to[0] : (data?.to || data?.email);
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
export async function POST(request) {
  const payload = await request.text().catch(() => '');
  if (!payload || payload.length > 65536) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  if (!verifyWebhook(payload, request.headers)) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  let event;
  try { event = JSON.parse(payload); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const svixId = request.headers.get('svix-id');
  const type = String(event?.type || '');
  const status = STATUS[type] || 'ignored';
  const data = event?.data || {};
  const providerId = typeof (data.email_id || data.emailId || data.id) === 'string' ? (data.email_id || data.emailId || data.id) : null;
  try {
    const db = getMarketingClient();
    await ensureMarketingSchema(db);
    await db.execute({ sql: 'CREATE TABLE IF NOT EXISTS tog_marketing_webhook_events (id TEXT PRIMARY KEY,event_type TEXT NOT NULL,provider_id TEXT,processed_at INTEGER)', args: [] });
    if (svixId) {
      const row = await db.execute({ sql: 'SELECT processed_at FROM tog_marketing_webhook_events WHERE id=?', args: [svixId] });
      if (row.rows[0]?.processed_at) return NextResponse.json({ received: true, duplicate: true });
      await db.execute({ sql: 'INSERT OR IGNORE INTO tog_marketing_webhook_events (id,event_type,provider_id) VALUES(?,?,?)', args: [svixId, type, providerId] });
    }
    if (['bounced', 'complained', 'suppressed'].includes(status)) {
      const email = recipient(data);
      if (email) await unsubscribeMarketingEmail(db, email, 'resend_' + status);
    }
    if (svixId) {
      await db.execute({ sql: 'UPDATE tog_marketing_webhook_events SET processed_at=? WHERE id=?', args: [Date.now(), svixId] });
    }
    return NextResponse.json({ received: true, status });
  } catch (error) {
    logger.error('ResendWebhook', 'Signed webhook processing failed', { code: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ error: 'Webhook processing unavailable' }, { status: 503 });
  }
}
