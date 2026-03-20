/**
 * @deprecated This webhook handler is DEPRECATED and returns 410 Gone.
 * All webhook traffic should go to /api/webhooks/square.
 *
 * Migration steps:
 * 1. Go to Square Developer Dashboard → Webhooks
 * 2. Confirm webhook URL is /api/webhooks/square (not /api/square-webhook)
 * 3. Delete this file once Square Dashboard confirms no traffic for 30+ days
 */

import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export async function POST() {
  logger.warn('Webhook', 'Deprecated /api/square-webhook endpoint received POST — returning 410 Gone');
  Sentry.captureMessage('Deprecated /api/square-webhook endpoint received traffic', {
    level: 'warning',
    tags: { deprecated: 'square-webhook', route: '/api/square-webhook' },
  });
  return NextResponse.json(
    { error: 'Gone. This endpoint is deprecated. Use /api/webhooks/square instead.' },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    { error: 'Gone. This endpoint is deprecated. Use /api/webhooks/square instead.' },
    { status: 410 }
  );
}
