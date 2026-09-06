/**
 * Fresh Batch Request System — immutable operational audit log
 *
 * Every high-impact status change, price change, reservation creation,
 * payment event, and manual communication must append a record here.
 * No ordinary admin action may edit or delete audit events.
 */

import { v4 as uuidv4 } from 'uuid';
import { getTursoConnection } from '@/lib/db/turso';

export interface AuditLogEvent {
  id: string;
  timestamp: Date;
  actor: string;
  actorType: 'owner' | 'manager' | 'system' | 'customer' | 'webhook';
  entityType: 'request' | 'batch' | 'reservation' | 'product' | 'market' | 'setting' | 'communication';
  entityId: string;
  action: string;
  previousState?: string;
  newState?: string;
  metadata?: Record<string, unknown>;
  reason?: string;
  correlationId?: string;
}

export type AuditLogInput = Omit<AuditLogEvent, 'id' | 'timestamp'>;

/**
 * Append an immutable audit-log event.
 */
export async function appendAuditLogEvent(input: AuditLogInput): Promise<AuditLogEvent> {
  const event: AuditLogEvent = {
    ...input,
    id: `audit_${uuidv4()}`,
    timestamp: new Date(),
  };
  await getTursoConnection().run(
    `INSERT INTO batch_audit_log (id,timestamp,actor,actor_type,entity_type,entity_id,action,previous_state,new_state,metadata_json,reason,correlation_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    event.id,event.timestamp.toISOString(),event.actor,event.actorType,event.entityType,event.entityId,event.action,
    event.previousState??null,event.newState??null,event.metadata?JSON.stringify(event.metadata):null,event.reason??null,event.correlationId??null
  );
  return event;
}

/**
 * Read audit events for a specific entity, newest first.
 */
export async function findAuditLogByEntity(
  entityType: AuditLogEvent['entityType'],
  entityId: string,
  limit: number = 100
): Promise<AuditLogEvent[]> {
  const rows=await getTursoConnection().all(`SELECT * FROM batch_audit_log WHERE entity_type=? AND entity_id=? ORDER BY timestamp DESC LIMIT ?`,entityType,entityId,Math.min(Math.max(1,limit),500));
  return rows.map((row:any)=>({id:row.id,timestamp:new Date(row.timestamp),actor:row.actor,actorType:row.actor_type,entityType:row.entity_type,entityId:row.entity_id,action:row.action,previousState:row.previous_state??undefined,newState:row.new_state??undefined,metadata:row.metadata_json?JSON.parse(row.metadata_json):undefined,reason:row.reason??undefined,correlationId:row.correlation_id??undefined})) as AuditLogEvent[];
}

// ============================================================================
// Convenience loggers
// ============================================================================

export async function logRequestStatusChange(
  requestId: string,
  actor: string,
  previousState: string,
  newState: string,
  reason?: string,
  metadata?: Record<string, unknown>
): Promise<AuditLogEvent> {
  return appendAuditLogEvent({
    actor,
    actorType: actor === 'system' ? 'system' : 'owner',
    entityType: 'request',
    entityId: requestId,
    action: 'request_status_changed',
    previousState,
    newState,
    reason,
    metadata,
  });
}

export async function logRequestAssigned(
  requestId: string,
  batchId: string,
  actor: string
): Promise<AuditLogEvent> {
  return appendAuditLogEvent({
    actor,
    actorType: actor === 'system' ? 'system' : 'owner',
    entityType: 'request',
    entityId: requestId,
    action: 'request_assigned',
    metadata: { batchId },
  });
}

export async function logBatchStatusChange(
  batchId: string,
  actor: string,
  previousState: string,
  newState: string,
  reason?: string,
  metadata?: Record<string, unknown>
): Promise<AuditLogEvent> {
  return appendAuditLogEvent({
    actor,
    actorType: actor === 'system' ? 'system' : 'owner',
    entityType: 'batch',
    entityId: batchId,
    action: 'batch_status_changed',
    previousState,
    newState,
    reason,
    metadata,
  });
}

export async function logBatchPriceChanged(
  batchId: string,
  actor: string,
  previousPriceCents: number,
  newPriceCents: number,
  reason: string
): Promise<AuditLogEvent> {
  return appendAuditLogEvent({
    actor,
    actorType: 'owner',
    entityType: 'batch',
    entityId: batchId,
    action: 'batch_price_changed',
    reason,
    metadata: { previousPriceCents, newPriceCents },
  });
}

export async function logReservationCreated(
  reservationId: string,
  requestId: string,
  batchId: string,
  actor: string,
  finalPriceCents: number,
  depositCents: number
): Promise<AuditLogEvent> {
  return appendAuditLogEvent({
    actor,
    actorType: actor === 'system' ? 'system' : 'owner',
    entityType: 'reservation',
    entityId: reservationId,
    action: 'reservation_created',
    metadata: { requestId, batchId, finalPriceCents, depositCents },
  });
}

export async function logReservationStatusChange(
  reservationId: string,
  actor: string,
  previousState: string,
  newState: string,
  reason?: string,
  metadata?: Record<string, unknown>
): Promise<AuditLogEvent> {
  return appendAuditLogEvent({
    actor,
    actorType: actor === 'system' ? 'system' : 'owner',
    entityType: 'reservation',
    entityId: reservationId,
    action: 'reservation_status_changed',
    previousState,
    newState,
    reason,
    metadata,
  });
}

export async function logPaymentLinkCreated(
  reservationId: string,
  actor: string,
  squarePaymentLinkId: string,
  squareOrderId?: string
): Promise<AuditLogEvent> {
  return appendAuditLogEvent({
    actor,
    actorType: actor === 'system' ? 'system' : 'owner',
    entityType: 'reservation',
    entityId: reservationId,
    action: 'payment_link_created',
    metadata: { squarePaymentLinkId, squareOrderId },
  });
}

export async function logPaymentReceived(
  reservationId: string,
  squarePaymentId: string,
  amountCents: number,
  status: 'deposit_paid' | 'paid' | 'fully_paid' | 'failed'
): Promise<AuditLogEvent> {
  return appendAuditLogEvent({
    actor: 'square_webhook',
    actorType: 'webhook',
    entityType: 'reservation',
    entityId: reservationId,
    action: 'payment_received',
    newState: status,
    metadata: { squarePaymentId, amountCents },
  });
}

export async function logCommunication(
  reservationId: string | null,
  requestId: string | null,
  template: string,
  recipient: string,
  success: boolean,
  error?: string,
  actor: string = 'system'
): Promise<AuditLogEvent> {
  return appendAuditLogEvent({
    actor,
    actorType: actor === 'system' ? 'system' : 'owner',
    entityType: 'communication',
    entityId: reservationId ?? requestId ?? 'unknown',
    action: success ? 'email_sent' : 'email_failed',
    metadata: { reservationId, requestId, template, recipient, error },
  });
}
