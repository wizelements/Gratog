/**
 * Durable recipient delivery evidence for the Turso checkout outbox.
 *
 * The HTTP boundary MUST verify the exact raw body and Svix headers with the
 * environment-specific Resend signing secret before passing signatureVerified.
 * Never populate that flag, eventId, or event from an unverified request body.
 * This adapter does not send mail or certify that a QA address is a real buyer
 * or approved staff inbox. Provider acceptance and delivery remain distinct.
 */
import {createHash} from 'node:crypto';

const states = Object.freeze({
  'email.sent':'accepted',
  'email.delivery_delayed':'delayed',
  'email.failed':'failed',
  'email.delivered':'delivered',
  'email.bounced':'bounced',
  'email.suppressed':'suppressed',
  'email.complained':'complained',
});
// Facts are retained independently. Later receipt of an older/transient event
// cannot erase delivery or suppress a recorded bounce/complaint.
const precedence = ['complained','suppressed','bounced','delivered','failed','delayed','accepted'];
const factNames = ['accepted','delayed','failed','delivered','bounced','suppressed','complained'];
const validId = value => typeof value === 'string' && value.trim() === value &&
  value.length > 0 && value.length <= 250 && value !== 'unknown' && !/[\x00-\x1f]/.test(value);
const digest = value => createHash('sha256').update(value).digest('hex');
const timestamp = () => new Date().toISOString();
const count = result => {
  if (!Number.isSafeInteger(result?.changes)) throw Error('TURSO_WRITE_CONFIRMATION_UNAVAILABLE');
  return result.changes;
};

function immediate(db, fn) {
  if (typeof db?.transactionAsync !== 'function') throw Error('TURSO_TRANSACTION_REQUIRED');
  const transaction = db.transactionAsync(fn);
  if (typeof transaction?.immediate !== 'function') throw Error('TURSO_IMMEDIATE_TRANSACTION_REQUIRED');
  return transaction.immediate();
}

function iso(value) {
  if (typeof value !== 'string' || value.length > 80 || !Number.isFinite(Date.parse(value)))
    throw Error('RESEND_EVENT_TIMESTAMP_REQUIRED');
  return new Date(value).toISOString();
}

function canonical(value, depth = 0) {
  if (depth > 20) throw Error('RESEND_EVENT_PAYLOAD_INVALID');
  if (value === null || ['string','boolean'].includes(typeof value)) return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(item => canonical(item, depth + 1)).join(',') + ']';
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return '{' + Object.keys(value).sort().map(key =>
      JSON.stringify(key) + ':' + canonical(value[key], depth + 1)).join(',') + '}';
  }
  throw Error('RESEND_EVENT_PAYLOAD_INVALID');
}

function normalize(eventId, event, signatureVerified) {
  if (signatureVerified !== true) throw Error('RESEND_EVENT_SIGNATURE_VERIFICATION_REQUIRED');
  if (!validId(eventId) || !validId(event?.type) || !validId(event?.data?.email_id))
    throw Error('RESEND_EVENT_IDENTITY_REQUIRED');
  // Modern Resend delivery events identify one recipient. Multiple addresses
  // are ambiguous and must be reconciled rather than marked wholly delivered.
  const recipients = event.data.to;
  if (!Array.isArray(recipients) || recipients.length !== 1 ||
      typeof recipients[0] !== 'string' || recipients[0].length > 320 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipients[0].trim()))
    throw Error('RESEND_EVENT_SINGLE_RECIPIENT_REQUIRED');
  const serialized = canonical(event);
  if (Buffer.byteLength(serialized) > 65536) throw Error('RESEND_EVENT_PAYLOAD_TOO_LARGE');
  return {
    eventId, eventType:event.type, messageId:event.data.email_id,
    recipientSha256:digest(recipients[0].trim().toLowerCase()),
    payloadSha256:digest(serialized), occurredAt:iso(event.created_at),
    state:states[event.type] || null,
  };
}

function earlier(previous, next) {
  return previous && previous < next ? previous : next;
}

/** Must run within the same transaction as event ingestion. */
async function reconcile(tx, providerMessageId, now) {
  const accepted = await tx.get(
    'SELECT order_id,kind,status,provider_message_id,sent_at FROM checkout_notification_outbox WHERE provider_message_id=?',
    providerMessageId);
  if (!accepted || accepted.status !== 'sent')
    return {matched:false,applied:0,recipients:[],needsReconciliation:true};

  const events = await tx.all(
    "SELECT event_id,event_type,recipient_sha256,occurred_at,status FROM checkout_notification_delivery_events WHERE provider_message_id=? AND status!='ignored' ORDER BY occurred_at,event_id",
    providerMessageId);
  const grouped = new Map();
  for (const event of events) {
    const state = states[event.event_type];
    if (!state) throw Error('RESEND_STORED_EVENT_TYPE_UNSUPPORTED');
    let summary = grouped.get(event.recipient_sha256);
    if (!summary) {
      summary = {recipientSha256:event.recipient_sha256, facts:{},lastEventAt:event.occurred_at};
      if (accepted.sent_at) summary.facts.accepted = iso(accepted.sent_at);
      grouped.set(event.recipient_sha256, summary);
    }
    summary.facts[state] = earlier(summary.facts[state], event.occurred_at);
    if (event.occurred_at > summary.lastEventAt) summary.lastEventAt = event.occurred_at;
  }

  const recipients = [];
  for (const summary of grouped.values()) {
    const status = precedence.find(state => summary.facts[state]);
    // Every field is derived from durable, verified events and the exact
    // acceptance binding. Browser IDs, webhook tags and customer addresses
    // never select or mutate an order.
    const result = await tx.run(
      'INSERT INTO checkout_notification_deliveries('+
      'order_id,kind,provider_message_id,recipient_sha256,recipient_role,delivery_status,'+
      'accepted_at,delayed_at,failed_at,delivered_at,bounced_at,suppressed_at,complained_at,last_event_at,updated_at'+
      ') VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) '+
      'ON CONFLICT(order_id,kind,recipient_sha256) DO UPDATE SET '+
      'delivery_status=excluded.delivery_status,accepted_at=excluded.accepted_at,'+
      'delayed_at=excluded.delayed_at,failed_at=excluded.failed_at,delivered_at=excluded.delivered_at,'+
      'bounced_at=excluded.bounced_at,suppressed_at=excluded.suppressed_at,complained_at=excluded.complained_at,'+
      'last_event_at=excluded.last_event_at,updated_at=excluded.updated_at',
      accepted.order_id,accepted.kind,providerMessageId,summary.recipientSha256,
      accepted.kind === 'customer_confirmation' ? 'customer' : 'staff',status,
      ...factNames.map(state => summary.facts[state] || null),summary.lastEventAt,now);
    if (count(result) !== 1) throw Error('TURSO_NOTIFICATION_DELIVERY_UPDATE_FAILED');
    recipients.push({recipientSha256:summary.recipientSha256,status});
  }
  const applied = await tx.run(
    "UPDATE checkout_notification_delivery_events SET status='applied',applied_at=? WHERE provider_message_id=? AND status='unmatched'",
    now,providerMessageId);
  return {matched:true,applied:count(applied),orderId:accepted.order_id,kind:accepted.kind,
    recipients,needsReconciliation:false};
}

/**
 * Receives an already signature-verified provider event. A successful return
 * means durable receipt, not necessarily delivery or even an order match.
 * Database errors must produce a non-2xx webhook response so Resend can retry.
 */
export async function recordVerifiedTursoResendEvent(db, {
  eventId, event, signatureVerified = false,
} = {}) {
  const normalized = normalize(eventId,event,signatureVerified);
  return immediate(db, async tx => {
    const now = timestamp();
    const prior = await tx.get(
      'SELECT provider,provider_message_id,event_type,recipient_sha256,payload_sha256 FROM checkout_notification_delivery_events WHERE event_id=?',
      normalized.eventId);
    if (prior && (prior.provider !== 'resend' || prior.provider_message_id !== normalized.messageId ||
      prior.event_type !== normalized.eventType || prior.recipient_sha256 !== normalized.recipientSha256 ||
      prior.payload_sha256 !== normalized.payloadSha256)) throw Error('RESEND_EVENT_ID_REUSED');
    const write = prior
      ? await tx.run('UPDATE checkout_notification_delivery_events SET receipt_count=receipt_count+1,last_received_at=? WHERE event_id=?',
        now,normalized.eventId)
      : await tx.run('INSERT INTO checkout_notification_delivery_events('+ 
        'event_id,provider,provider_message_id,event_type,recipient_sha256,payload_sha256,occurred_at,first_received_at,last_received_at,status'+
        ') VALUES (?,?,?,?,?,?,?,?,?,?)',
        normalized.eventId,'resend',normalized.messageId,normalized.eventType,
        normalized.recipientSha256,normalized.payloadSha256,normalized.occurredAt,now,now,
        normalized.state ? 'unmatched' : 'ignored');
    if (count(write) !== 1) throw Error('TURSO_NOTIFICATION_EVENT_RECEIPT_FAILED');
    if (!normalized.state) return {received:true,duplicate:Boolean(prior),ignored:true};
    const result = await reconcile(tx,normalized.messageId,now);
    return {received:true,duplicate:Boolean(prior),ignored:false,...result};
  });
}

/**
 * Replays stored, verified events after the send response is durably bound.
 * This does not retry a send, infer an unknown send outcome, or create a binding.
 */
export async function reconcileTursoNotificationDelivery(db, {providerMessageId} = {}) {
  if (!validId(providerMessageId)) throw Error('RESEND_MESSAGE_ID_REQUIRED');
  return immediate(db, tx => reconcile(tx,providerMessageId,timestamp()));
}
