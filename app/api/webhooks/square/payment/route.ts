export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';
import { verifySquareWebhookSignature } from '@/lib/batches/square-webhook-auth';
import { reconcileSquareBatchReservation } from '@/lib/batches/reconcile-square-reservation';

// Preview certification uses an isolated Sandbox subscription. Its per-subscription
// signing key is distinct from the Production key. Resolve only the exact active
// Square Sandbox callback; never accept an unsigned event or affect Production.
let previewWebhookSigningKeyCache: {
  notificationUrl: string; key: string; expiresAt: number;
} | null = null;

async function getIsolatedPreviewWebhookKey(notificationUrl: string): Promise<string | null> {
  if (process.env.VERCEL_ENV !== 'preview' ||
      process.env.SQUARE_ENVIRONMENT !== 'sandbox') return null;
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token || !notificationUrl.startsWith('https://')) return null;
  if (previewWebhookSigningKeyCache &&
      previewWebhookSigningKeyCache.notificationUrl === notificationUrl &&
      previewWebhookSigningKeyCache.expiresAt > Date.now()) {
    return previewWebhookSigningKeyCache.key;
  }
  const headers = { Authorization: 'Bearer ' + token, 'Square-Version': '2025-01-23' };
  const base = 'https://connect.squareupsandbox.com/v2/webhooks/subscriptions';
  try {
    const listed = await fetch(base, {
      headers, cache: 'no-store', signal: AbortSignal.timeout(6500),
    });
    if (!listed.ok) return null;
    const result = await listed.json();
    const matches = (Array.isArray(result?.subscriptions) ? result.subscriptions : [])
      .filter((item: any) => item.enabled === true &&
        item.notification_url === notificationUrl &&
        Array.isArray(item.event_types) &&
        item.event_types.some((t: string) => t === 'payment.created' || t === 'payment.updated'));
    if (matches.length !== 1 || typeof matches[0]?.id !== 'string') return null;
    const detail = await fetch(base + '/' + encodeURIComponent(matches[0].id), {
      headers, cache: 'no-store', signal: AbortSignal.timeout(6500),
    });
    if (!detail.ok) return null;
    const verified = await detail.json();
    const key = verified?.subscription?.signature_key;
    if (typeof key !== 'string' || key.length < 12 ||
        verified?.subscription?.notification_url !== notificationUrl) return null;
    previewWebhookSigningKeyCache = {
      notificationUrl, key, expiresAt: Date.now() + 5 * 60 * 1000,
    };
    return key;
  } catch { return null; }
}

/**
 * Backward-compatible secondary Square webhook destination.
 * Verify the raw payload and subscription-specific public notification URL
 * before parsing or updating any order. The primary Square webhook uses the
 * same reconciliation logic at /api/webhooks/square.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (rawBody.length > 256000) {
    return NextResponse.json({ success: false, error: 'Payload too large' }, { status: 413 });
  }
  const key = process.env.SQUARE_PAYMENT_WEBHOOK_SIGNATURE_KEY ||
    process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const signature = request.headers.get('x-square-hmacsha256-signature');
  const notificationUrl = process.env.SQUARE_PAYMENT_WEBHOOK_URL || request.url;
  if (!signature || !/^[A-Za-z0-9+/=]{40,120}$/.test(signature)) {
    return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 401 });
  }
  let verified = Boolean(key) &&
    verifySquareWebhookSignature(signature, rawBody, notificationUrl, key);
  if (!verified && process.env.VERCEL_ENV === 'preview' &&
      process.env.SQUARE_ENVIRONMENT === 'sandbox') {
    const previewKey = await getIsolatedPreviewWebhookKey(notificationUrl);
    verified = Boolean(previewKey) &&
      verifySquareWebhookSignature(signature, rawBody, notificationUrl, previewKey!);
  }
  if (!verified) {
    return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  if (!['payment.created', 'payment.updated', 'payment.completed'].includes(event?.type)) {
    return NextResponse.json({ success: true, ignored: true });
  }
  const payment = event?.data?.object?.payment || event?.data?.object;
  if (!payment?.order_id) {
    return NextResponse.json({ success: true, ignored: true });
  }

  try {
    const { db } = await connectToDatabase();
    const reconciliation = await reconcileSquareBatchReservation(db, payment);
    return NextResponse.json({ success: true, ...reconciliation });
  } catch (error) {
    logger.error('SquarePaymentWebhook', 'Payment reconciliation failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Square retries non-2xx events. Never acknowledge a failed state update.
    return NextResponse.json({ success: false, error: 'Reconciliation failed' }, { status: 500 });
  }
}
