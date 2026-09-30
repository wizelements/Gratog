import { ObjectId, type ClientSession, type Db } from 'mongodb';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';
import {
  buildOpeeBusinessEvent,
  toOpeeKernelEvent,
  type OpeeBusinessEvent,
  type OpeeBusinessEventInput,
} from './contract';

export type OpeeOutboxStatus =
  | 'pending'
  | 'claimed'
  | 'failed'
  | 'delivered'
  | 'dead_letter';

export interface OpeeOutboxDocument {
  _id: ObjectId;
  event: OpeeBusinessEvent;
  status: OpeeOutboxStatus;
  attempts: number;
  maxAttempts: number;
  availableAt: Date;
  createdAt: Date;
  updatedAt: Date;
  claimedBy?: string;
  claimExpiresAt?: Date;
  lastClaimedAt?: Date;
  deliveredAt?: Date;
  deadLetterAt?: Date;
  lastError?: string;
}

const COLLECTION = 'opee_outbox_events';
const DEFAULT_MAX_ATTEMPTS = 12;
const DEFAULT_LEASE_SECONDS = 90;
let indexesPromise: Promise<void> | null = null;

function collection(db: Db) {
  return db.collection<OpeeOutboxDocument>(COLLECTION);
}

export async function ensureOpeeOutboxIndexes(): Promise<void> {
  if (indexesPromise) return indexesPromise;
  indexesPromise = (async () => {
    const { db } = await connectToDatabase();
    const c = collection(db as Db);
    await c.createIndex({ 'event.idempotencyKey': 1 }, { unique: true });
    await c.createIndex({ status: 1, availableAt: 1, createdAt: 1 });
    await c.createIndex({ claimExpiresAt: 1 });
  })().catch((error) => {
    indexesPromise = null;
    throw error;
  });
  return indexesPromise;
}

export async function insertOpeeOutboxEvent(
  db: Db,
  event: OpeeBusinessEvent,
  options: { session?: ClientSession; maxAttempts?: number } = {}
): Promise<boolean> {
  const now = new Date();
  const result = await collection(db).updateOne(
    { 'event.idempotencyKey': event.idempotencyKey },
    {
      $setOnInsert: {
        event,
        status: 'pending',
        attempts: 0,
        maxAttempts: options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
        availableAt: now,
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true, session: options.session }
  );
  return result.upsertedCount === 1;
}

export async function enqueueOpeeBusinessEvent(
  input: OpeeBusinessEventInput
): Promise<OpeeBusinessEvent> {
  await ensureOpeeOutboxIndexes();
  const { db } = await connectToDatabase();
  const event = buildOpeeBusinessEvent(input);
  const inserted = await insertOpeeOutboxEvent(db as Db, event);

  logger.info('OPEE', inserted ? 'Business event queued' : 'Business event already queued', {
    eventType: event.eventType,
    sourceEventId: event.sourceEventId,
    tenantId: event.tenantId,
  });
  return event;
}

function claimableFilter(now: Date) {
  return {
    $and: [
      {
        $or: [
          { status: { $in: ['pending', 'failed'] } },
          { status: 'claimed', claimExpiresAt: { $lte: now } },
        ],
      },
      {
        $or: [
          { availableAt: { $exists: false } },
          { availableAt: { $lte: now } },
        ],
      },
    ],
  };
}

export async function claimOpeeOutboxEvents(
  consumerId: string,
  limit = 20,
  leaseSeconds = DEFAULT_LEASE_SECONDS
) {
  await ensureOpeeOutboxIndexes();
  const { db } = await connectToDatabase();
  const c = collection(db as Db);
  const now = new Date();
  const candidates = await c
    .find(claimableFilter(now) as any)
    .sort({ createdAt: 1 })
    .limit(Math.max(1, Math.min(limit, 100)))
    .toArray();

  const claimed: OpeeOutboxDocument[] = [];
  const claimExpiresAt = new Date(now.getTime() + leaseSeconds * 1000);

  for (const candidate of candidates) {
    const item = await c.findOneAndUpdate(
      { _id: candidate._id, ...claimableFilter(now) } as any,
      {
        $set: {
          status: 'claimed',
          claimedBy: consumerId,
          claimExpiresAt,
          lastClaimedAt: now,
          updatedAt: now,
        },
        $inc: { attempts: 1 },
      },
      { returnDocument: 'after' }
    );
    if (item) claimed.push(item);
  }

  return claimed.map((item) => ({
    id: item._id.toString(),
    attempts: item.attempts,
    maxAttempts: item.maxAttempts,
    event: item.event,
    kernelEvent: toOpeeKernelEvent(item.event),
  }));
}

function objectIds(ids: string[]): ObjectId[] {
  return ids.filter(ObjectId.isValid).map((id) => new ObjectId(id));
}

export async function ackOpeeOutboxEvents(
  ids: string[],
  consumerId: string
): Promise<number> {
  if (!ids.length) return 0;
  const { db } = await connectToDatabase();
  const now = new Date();
  const result = await collection(db as Db).updateMany(
    {
      _id: { $in: objectIds(ids) },
      status: 'claimed',
      claimedBy: consumerId,
    },
    {
      $set: {
        status: 'delivered',
        deliveredAt: now,
        updatedAt: now,
      },
      $unset: {
        claimedBy: '',
        claimExpiresAt: '',
        lastError: '',
      },
    }
  );
  return result.modifiedCount;
}

export async function nackOpeeOutboxEvents(
  ids: string[],
  consumerId: string,
  error: string
): Promise<number> {
  if (!ids.length) return 0;
  const { db } = await connectToDatabase();
  const c = collection(db as Db);
  let modified = 0;

  for (const id of objectIds(ids)) {
    const item = await c.findOne({ _id: id, status: 'claimed', claimedBy: consumerId });
    if (!item) continue;

    const now = new Date();
    const dead = item.attempts >= item.maxAttempts;
    const delaySeconds = Math.min(900, 15 * 2 ** Math.min(item.attempts, 6));

    const result = await c.updateOne(
      { _id: id, status: 'claimed', claimedBy: consumerId },
      {
        $set: {
          status: dead ? 'dead_letter' : 'failed',
          lastError: error.slice(0, 2000),
          availableAt: new Date(now.getTime() + delaySeconds * 1000),
          ...(dead ? { deadLetterAt: now } : {}),
          updatedAt: now,
        },
        $unset: {
          claimedBy: '',
          claimExpiresAt: '',
        },
      }
    );
    modified += result.modifiedCount;
  }
  return modified;
}

export async function getOpeeOutboxStats() {
  await ensureOpeeOutboxIndexes();
  const { db } = await connectToDatabase();
  const rows = await collection(db as Db)
    .aggregate<{ _id: OpeeOutboxStatus; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ])
    .toArray();

  const counts = Object.fromEntries(rows.map((row) => [row._id, row.count]));
  return {
    collection: COLLECTION,
    counts,
    pending: Number(counts.pending || 0),
    failed: Number(counts.failed || 0),
    claimed: Number(counts.claimed || 0),
    delivered: Number(counts.delivered || 0),
    deadLetter: Number(counts.dead_letter || 0),
  };
}
