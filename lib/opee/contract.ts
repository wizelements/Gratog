import { createHash, randomUUID } from 'crypto';

export const OPEE_TENANT_ID = 'tog-001' as const;
export const OPEE_EVENT_SCHEMA_VERSION = '1.0.0' as const;

export const OPEE_EVENT_TYPES = [
  'tog.integration.canary',
  'tog.order.created',
  'tog.customer.observed',
  'tog.payment.created',
  'tog.payment.updated',
  'tog.payment.completed',
  'tog.payment.failed',
  'tog.refund.updated',
  'tog.refund.completed',
  'tog.inventory.synced',
  'tog.inventory.adjusted',
  'tog.menu.created',
  'tog.menu.updated',
  'tog.menu.activated',
  'tog.menu.deleted',
  'tog.catalog.updated',
  'tog.square_order.updated',
] as const;

export type OpeeEventType = (typeof OPEE_EVENT_TYPES)[number];

export interface OpeeSubject {
  type: 'order' | 'customer' | 'payment' | 'refund' | 'inventory' | 'menu' | 'catalog' | 'integration';
  id: string;
}

export interface OpeeBusinessEventInput {
  eventType: OpeeEventType;
  source: string;
  sourceEventId: string;
  occurredAt?: string;
  correlationId?: string | null;
  subject: OpeeSubject;
  payload?: Record<string, unknown>;
}

export interface OpeeBusinessEvent {
  schemaVersion: typeof OPEE_EVENT_SCHEMA_VERSION;
  tenantId: typeof OPEE_TENANT_ID;
  eventId: string;
  eventType: OpeeEventType;
  source: string;
  sourceEventId: string;
  occurredAt: string;
  idempotencyKey: string;
  correlationId: string | null;
  subject: OpeeSubject;
  payload: Record<string, unknown>;
}

export function stableCustomerRef(email?: string | null): string | null {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return null;
  return 'sha256:' + createHash('sha256').update(normalized).digest('hex');
}

export function buildOpeeBusinessEvent(input: OpeeBusinessEventInput): OpeeBusinessEvent {
  if (!input.sourceEventId?.trim()) throw new Error('OPEE sourceEventId is required');
  if (!input.source?.trim()) throw new Error('OPEE source is required');
  if (!input.subject?.id?.trim()) throw new Error('OPEE subject id is required');

  const sourceEventId = input.sourceEventId.trim();
  const eventType = input.eventType;

  return {
    schemaVersion: OPEE_EVENT_SCHEMA_VERSION,
    tenantId: OPEE_TENANT_ID,
    eventId: randomUUID(),
    eventType,
    source: input.source.trim(),
    sourceEventId,
    occurredAt: input.occurredAt || new Date().toISOString(),
    idempotencyKey: `${OPEE_TENANT_ID}:${eventType}:${sourceEventId}`,
    correlationId: input.correlationId || null,
    subject: input.subject,
    payload: input.payload || {},
  };
}

export function toOpeeKernelEvent(event: OpeeBusinessEvent) {
  return {
    event_type: event.eventType,
    source: event.source,
    occurred_at: event.occurredAt,
    idempotency_key: event.idempotencyKey,
    correlation_id: event.correlationId,
    payload: {
      schema_version: event.schemaVersion,
      tenant_id: event.tenantId,
      event_id: event.eventId,
      source_event_id: event.sourceEventId,
      subject: event.subject,
      ...event.payload,
    },
  };
}
