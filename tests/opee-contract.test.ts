import crypto from 'crypto';
import { describe, expect, it } from 'vitest';
import {
  buildOpeeBusinessEvent,
  stableCustomerRef,
  toOpeeKernelEvent,
} from '@/lib/opee/contract';
import { verifySignedOpeeRequest } from '@/lib/opee/request-auth';

describe('OPEE business event contract', () => {
  it('builds a tenant-scoped event with deterministic idempotency', () => {
    const a = buildOpeeBusinessEvent({
      eventType: 'tog.order.created',
      source: 'gratog.order',
      sourceEventId: 'order-123',
      occurredAt: '2026-09-30T03:00:00.000Z',
      correlationId: 'order-123',
      subject: { type: 'order', id: 'order-123' },
      payload: { total_cents: 1199 },
    });
    const b = buildOpeeBusinessEvent({
      eventType: 'tog.order.created',
      source: 'gratog.order',
      sourceEventId: 'order-123',
      occurredAt: '2026-09-30T03:00:00.000Z',
      correlationId: 'order-123',
      subject: { type: 'order', id: 'order-123' },
      payload: { total_cents: 1199 },
    });

    expect(a.tenantId).toBe('tog-001');
    expect(a.schemaVersion).toBe('1.0.0');
    expect(a.idempotencyKey).toBe('tog-001:tog.order.created:order-123');
    expect(b.idempotencyKey).toBe(a.idempotencyKey);
    expect(b.eventId).not.toBe(a.eventId);
  });

  it('hashes customer identity without leaking raw email', () => {
    const one = stableCustomerRef(' Customer@Example.com ');
    const two = stableCustomerRef('customer@example.com');

    expect(one).toBe(two);
    expect(one).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(one).not.toContain('customer@example.com');
    expect(stableCustomerRef(null)).toBeNull();
  });

  it('maps the business event into the Wave-4 kernel envelope', () => {
    const event = buildOpeeBusinessEvent({
      eventType: 'tog.payment.completed',
      source: 'gratog.square',
      sourceEventId: 'square-event-1',
      occurredAt: '2026-09-30T03:01:00.000Z',
      correlationId: 'order-123',
      subject: { type: 'payment', id: 'payment-123' },
      payload: { amount_cents: 1199, currency: 'USD' },
    });

    expect(toOpeeKernelEvent(event)).toEqual({
      event_type: 'tog.payment.completed',
      source: 'gratog.square',
      occurred_at: '2026-09-30T03:01:00.000Z',
      idempotency_key: 'tog-001:tog.payment.completed:square-event-1',
      correlation_id: 'order-123',
      payload: {
        schema_version: '1.0.0',
        tenant_id: 'tog-001',
        event_id: event.eventId,
        source_event_id: 'square-event-1',
        subject: { type: 'payment', id: 'payment-123' },
        amount_cents: 1199,
        currency: 'USD',
      },
    });
  });

  it('fails closed when required source identity is missing', () => {
    expect(() =>
      buildOpeeBusinessEvent({
        eventType: 'tog.integration.canary',
        source: 'gratog.integration',
        sourceEventId: '',
        subject: { type: 'integration', id: 'canary' },
      })
    ).toThrow('OPEE sourceEventId is required');
  });
});

describe('OPEE Ed25519 request authentication', () => {
  it('accepts a valid signature and rejects tampering, staleness, and wrong keys', () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const publicKeyDerB64 = publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
    const nowEpoch = 1790771400;
    const timestamp = String(nowEpoch);
    const rawBody = JSON.stringify({ action: 'stats', consumerId: 'opee-core:test' });
    const signature = crypto
      .sign(null, Buffer.from(`${timestamp}.${rawBody}`), privateKey)
      .toString('base64');

    expect(verifySignedOpeeRequest({
      timestamp, signature, rawBody, publicKeyDerB64, nowEpoch,
    })).toBe(true);

    expect(verifySignedOpeeRequest({
      timestamp, signature, rawBody: rawBody + 'x', publicKeyDerB64, nowEpoch,
    })).toBe(false);

    expect(verifySignedOpeeRequest({
      timestamp, signature, rawBody, publicKeyDerB64, nowEpoch: nowEpoch + 301,
    })).toBe(false);

    const wrong = crypto.generateKeyPairSync('ed25519').publicKey;
    expect(verifySignedOpeeRequest({
      timestamp,
      signature,
      rawBody,
      publicKeyDerB64: wrong.export({ format: 'der', type: 'spki' }).toString('base64'),
      nowEpoch,
    })).toBe(false);
  });
});
