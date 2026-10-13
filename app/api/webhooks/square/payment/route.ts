export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';
import { verifySquareWebhookSignature } from '@/lib/batches/square-webhook-auth';
import { reconcileSquareBatchReservation } from '@/lib/batches/reconcile-square-reservation';

/**
 * Backward-compatible secondary Square webhook destination.
 * Verify the raw payload and subscription-specific public notification URL
 * before parsing or updating any order. The primary Square webhook uses the
 * same reconciliation logic at /api/webhooks/square.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const key = process.env.SQUARE_PAYMENT_WEBHOOK_SIGNATURE_KEY ||
    process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!key) {
    logger.error('SquarePaymentWebhook', 'Webhook signature key not configured');
    return NextResponse.json({ success: false, error: 'Webhook not configured' }, { status: 503 });
  }
  const signature = request.headers.get('x-square-hmacsha256-signature');
  const notificationUrl = process.env.SQUARE_PAYMENT_WEBHOOK_URL || request.url;
  if (!verifySquareWebhookSignature(signature, rawBody, notificationUrl, key)) {
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
