export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { verifySignedOpeeRequest } from '@/lib/opee/request-auth';
import {
  ackOpeeOutboxEvents,
  claimOpeeOutboxEvents,
  enqueueOpeeBusinessEvent,
  getOpeeOutboxStats,
  nackOpeeOutboxEvents,
} from '@/lib/opee/outbox';

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function validConsumerId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 3 &&
    value.length <= 120 &&
    /^[a-zA-Z0-9._:-]+$/.test(value)
  );
}

function eventIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((id): id is string => typeof id === 'string' && id.length <= 64)
    .slice(0, 100);
}

export async function GET() {
  return json({
    ok: true,
    service: 'tog-opee-events',
    auth: 'ed25519',
    mode: 'observe-only',
    tenantId: 'tog-001',
  });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!verifySignedOpeeRequest({
    timestamp: request.headers.get('x-opee-timestamp') || '',
    signature: request.headers.get('x-opee-signature') || '',
    rawBody,
  })) {
    return json({ ok: false, error: 'Unauthorized' }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json({ ok: false, error: 'Invalid JSON body' }, 400);
  }
  if (!body || Array.isArray(body) || typeof body !== 'object') {
    return json({ ok: false, error: 'JSON object required' }, 400);
  }

  const action = String(body.action || '');
  const consumerId = body.consumerId;

  if (action === 'canary') {
    const sourceEventId =
      typeof body.sourceEventId === 'string' && body.sourceEventId
        ? body.sourceEventId
        : crypto.randomUUID();

    const event = await enqueueOpeeBusinessEvent({
      eventType: 'tog.integration.canary',
      source: 'gratog.integration',
      sourceEventId,
      correlationId: sourceEventId,
      subject: { type: 'integration', id: sourceEventId },
      payload: { purpose: 'opee-commerce-spine-canary' },
    });
    return json({
      ok: true,
      queued: true,
      eventId: event.eventId,
      idempotencyKey: event.idempotencyKey,
    });
  }

  if (!validConsumerId(consumerId)) {
    return json({ ok: false, error: 'Valid consumerId is required' }, 400);
  }

  if (action === 'stats') {
    return json({
      ok: true,
      mode: 'observe-only',
      tenantId: 'tog-001',
      ...(await getOpeeOutboxStats()),
    });
  }

  if (action === 'claim') {
    const requestedLimit = Number(body.limit || 20);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(Math.trunc(requestedLimit), 100))
      : 20;
    const items = await claimOpeeOutboxEvents(consumerId, limit);
    return json({
      ok: true,
      mode: 'observe-only',
      tenantId: 'tog-001',
      items,
    });
  }

  const ids = eventIds(body.eventIds);
  if (!ids.length) {
    return json({ ok: false, error: 'eventIds are required' }, 400);
  }

  if (action === 'ack') {
    const acknowledged = await ackOpeeOutboxEvents(ids, consumerId);
    return json({ ok: true, acknowledged });
  }

  if (action === 'nack') {
    const reason =
      typeof body.error === 'string' && body.error.trim()
        ? body.error.trim()
        : 'OPEE consumer rejected event';
    const rejected = await nackOpeeOutboxEvents(ids, consumerId, reason);
    return json({ ok: true, rejected });
  }

  return json({ ok: false, error: 'Unsupported action' }, 400);
}
