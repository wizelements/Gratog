/**
 * Durable event queue for OpenClaw/SMAD automation.
 *
 * Why this exists:
 *   OpenClaw cannot reliably observe Gratog business events unless the app
 *   writes them somewhere durable and something (a cron worker, the OpenClaw
 *   gateway, or a Vercel cron) consumes them. MongoDB is the canonical
 *   datastore, so we keep the queue there.
 *
 * Design:
 *   - `owner_alert_queue` collection stores owner-facing events.
 *   - Each event has a stable `sourceEventId` (e.g. Square payment_id or a
 *     Resend messageId) so producers and consumers can deduplicate.
 *   - Status machine: pending → sending/sent → failed → dead-letter after
 *     max attempts.
 *   - No external side effects happen in this file; it only persists the
 *     intent. The consumer / `sendOwnerAlert()` implementation performs
 *     delivery.
 */

import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';
import { ObjectId, type Db } from 'mongodb';

export type OwnerAlertSeverity = 'info' | 'warning' | 'critical';
export type OwnerAlertChannel = 'telegram' | 'email' | 'all';
export type OwnerAlertStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'dead_letter';

export interface OwnerAlertEvent {
  /** Stable event id used for idempotency. Should be prefixed by source, e.g. `square:payment_123`. */
  sourceEventId: string;
  /** Logical category: order, payment, lead, daily_report, system, etc. */
  category: string;
  severity: OwnerAlertSeverity;
  /** Short headline. */
  title: string;
  /** Human-readable body; may contain markdown-ish formatting. */
  body: string;
  /** Optional link to the relevant admin page. */
  actionUrl?: string;
  /** Which channel(s) the consumer should try. */
  channel: OwnerAlertChannel;
  /** Extra structured context for the consumer. */
  metadata?: Record<string, unknown>;
  /** ISO timestamp of the originating business event. */
  eventAt: string;
}

export interface QueueItem extends OwnerAlertEvent {
  _id: ObjectId;
  status: OwnerAlertStatus;
  attempts: number;
  maxAttempts: number;
  result?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  deadLetterAt?: string;
  error?: string;
}

const COLLECTION = 'owner_alert_queue';
const DEFAULT_MAX_ATTEMPTS = 5;

function now(): string {
  return new Date().toISOString();
}

/**
 * Enqueue an owner alert. Idempotent by `sourceEventId`.
 * Returns the persisted item (existing one if already seen).
 */
export async function enqueueOwnerAlert(
  event: OwnerAlertEvent,
  options: { maxAttempts?: number } = {}
): Promise<QueueItem> {
  const { db } = await connectToDatabase();
  const collection = (db as Db).collection<QueueItem>(COLLECTION);
  const ts = now();

  const upsertDoc: Omit<QueueItem, '_id' | 'updatedAt'> = {
    ...event,
    status: 'pending',
    attempts: 0,
    maxAttempts: options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
    createdAt: ts,
  };

  try {
    const item = await collection.findOneAndUpdate(
      { sourceEventId: event.sourceEventId },
      {
        $setOnInsert: upsertDoc,
        $set: { updatedAt: ts },
      },
      { upsert: true, returnDocument: 'after' }
    );

    if (!item) {
      throw new Error('enqueueOwnerAlert: item not found after upsert');
    }

    if (item.createdAt === ts) {
      logger.info('EventQueue', 'Enqueued new owner alert', { sourceEventId: event.sourceEventId, category: event.category });
    } else {
      logger.info('EventQueue', 'Owner alert already queued; skipped duplicate', { sourceEventId: event.sourceEventId });
    }

    return item;
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error('EventQueue', 'Failed to enqueue owner alert', { sourceEventId: event.sourceEventId, error });
    throw err;
  }
}

/**
 * Fetch pending or previously failed owner alerts that are ready to be retried.
 * `limit` is intentionally small to keep delivery safe and observable.
 */
export async function fetchPendingOwnerAlerts(limit = 10): Promise<QueueItem[]> {
  const { db } = await connectToDatabase();
  return (db as Db)
    .collection<QueueItem>(COLLECTION)
    .find({ status: { $in: ['pending', 'failed'] } })
    .sort({ severity: 1, createdAt: 1 })
    .limit(limit)
    .toArray();
}

/**
 * Mark an alert as sending. Returns false if another worker claimed it.
 */
export async function claimAlert(id: ObjectId): Promise<boolean> {
  const { db } = await connectToDatabase();
  const result = await (db as Db).collection<QueueItem>(COLLECTION).updateOne(
    { _id: id, status: { $in: ['pending', 'failed'] } },
    { $set: { status: 'sending', updatedAt: now() }, $inc: { attempts: 1 } }
  );
  return result.modifiedCount === 1;
}

/**
 * Mark an alert as successfully sent.
 */
export async function markAlertSent(
  id: ObjectId,
  result: Record<string, unknown>
): Promise<void> {
  const { db } = await connectToDatabase();
  await (db as Db).collection<QueueItem>(COLLECTION).updateOne(
    { _id: id },
    {
      $set: {
        status: 'sent',
        sentAt: now(),
        result,
        updatedAt: now(),
      },
      $unset: { error: '' },
    }
  );
}

/**
 * Mark an alert as failed. If max attempts exceeded, moves to dead_letter.
 */
export async function markAlertFailed(
  id: ObjectId,
  item: Pick<QueueItem, 'attempts' | 'maxAttempts'>,
  error: Error | string
): Promise<void> {
  const { db } = await connectToDatabase();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const isDeadLetter = item.attempts >= item.maxAttempts;

  await (db as Db).collection<QueueItem>(COLLECTION).updateOne(
    { _id: id },
    {
      $set: {
        status: isDeadLetter ? 'dead_letter' : 'failed',
        error: errorMessage,
        deadLetterAt: isDeadLetter ? now() : undefined,
        updatedAt: now(),
      },
    }
  );

  logger[isDeadLetter ? 'error' : 'warn']('EventQueue', `Owner alert ${isDeadLetter ? 'dead-lettered' : 'failed'}`, {
    id,
    attempts: item.attempts,
    maxAttempts: item.maxAttempts,
    error: errorMessage,
  });
}

/**
 * Diagnostic: count alerts by status.
 */
export async function getOwnerAlertQueueStats(): Promise<Record<OwnerAlertStatus | string, number>> {
  const { db } = await connectToDatabase();
  const docs = await (db as Db)
    .collection<QueueItem>(COLLECTION)
    .aggregate<{ _id: OwnerAlertStatus; count: number }>([{ $group: { _id: '$status', count: { $sum: 1 } } }])
    .toArray();
  return Object.fromEntries(docs.map((d) => [d._id, d.count]));
}
