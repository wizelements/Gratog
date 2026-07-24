/**
 * Fresh Batch Request System — MongoDB persistence layer
 *
 * Follows the pattern in `lib/preorder/repository.ts`: raw MongoDB via
 * `connectToDatabase()` for CRUD and atomic counters. Collections are created
 * lazily on first write.
 */

import { v4 as uuidv4 } from 'uuid';
import { connectToDatabase } from '@/lib/db-optimized';
import type {
  BatchCampaign,
  BatchReservation,
  FreshBatchRequest,
} from './types';

const REQUESTS_COLLECTION = 'fresh_batch_requests';
const CAMPAIGNS_COLLECTION = 'batch_campaigns';
const RESERVATIONS_COLLECTION = 'batch_reservations';
const COUNTERS_COLLECTION = 'batch_counters';

/**
 * Generate a new public UUID for fresh-batch entities.
 */
export function newEntityId(): string {
  return uuidv4();
}

// ---------------------------------------------------------------------------
// Fresh batch requests
// ---------------------------------------------------------------------------

export async function createRequest(
  request: Omit<FreshBatchRequest, 'id' | 'createdAt' | 'updatedAt'>
): Promise<FreshBatchRequest> {
  const { db } = await connectToDatabase();
  const now = new Date();
  const doc: FreshBatchRequest = {
    ...request,
    id: newEntityId(),
    createdAt: now,
    updatedAt: now,
  };
  await db.collection(REQUESTS_COLLECTION).insertOne(doc);
  return doc;
}

export async function findRequestById(id: string): Promise<FreshBatchRequest | null> {
  const { db } = await connectToDatabase();
  return db.collection(REQUESTS_COLLECTION).findOne<FreshBatchRequest>({ id });
}

export async function findRequestsByEmail(email: string): Promise<FreshBatchRequest[]> {
  const { db } = await connectToDatabase();
  return db
    .collection(REQUESTS_COLLECTION)
    .find<FreshBatchRequest>({ email: email.toLowerCase() })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function findRequestsByStatus(
  status: FreshBatchRequest['status']
): Promise<FreshBatchRequest[]> {
  const { db } = await connectToDatabase();
  return db
    .collection(REQUESTS_COLLECTION)
    .find<FreshBatchRequest>({ status })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function updateRequestStatus(
  id: string,
  status: FreshBatchRequest['status'],
  ownerNotes?: string
): Promise<FreshBatchRequest | null> {
  const { db } = await connectToDatabase();
  const update: Record<string, unknown> = { status, updatedAt: new Date() };
  if (ownerNotes !== undefined) update.ownerNotes = ownerNotes;
  return db.collection(REQUESTS_COLLECTION).findOneAndUpdate(
    { id },
    { $set: update },
    { returnDocument: 'after' }
  ) as Promise<FreshBatchRequest | null>;
}

export async function linkRequestToBatch(
  requestId: string,
  batchId: string,
  status: FreshBatchRequest['status'] = 'approved'
): Promise<FreshBatchRequest | null> {
  const { db } = await connectToDatabase();
  return db.collection(REQUESTS_COLLECTION).findOneAndUpdate(
    { id: requestId },
    { $set: { linkedBatchId: batchId, status, updatedAt: new Date() } },
    { returnDocument: 'after' }
  ) as Promise<FreshBatchRequest | null>;
}

export async function hasRecentDuplicateRequest(
  email: string,
  productSlug: string | null,
  flavorProfile: string | null,
  withinMs: number = 24 * 60 * 60 * 1000
): Promise<boolean> {
  const { db } = await connectToDatabase();
  const since = new Date(Date.now() - withinMs);
  const query: Record<string, unknown> = {
    email: email.toLowerCase(),
    createdAt: { $gte: since },
  };
  if (productSlug) query.requestedProductSlug = productSlug;
  else if (flavorProfile) query.flavorProfile = flavorProfile;
  else query.requestedFlavorText = { $exists: true };
  const count = await db.collection(REQUESTS_COLLECTION).countDocuments(query);
  return count > 0;
}

// ---------------------------------------------------------------------------
// Batch campaigns
// ---------------------------------------------------------------------------

export async function createBatchCampaign(
  campaign: Omit<BatchCampaign, 'id' | 'createdAt' | 'updatedAt'>
): Promise<BatchCampaign> {
  const { db } = await connectToDatabase();
  const now = new Date();
  const doc: BatchCampaign = {
    ...campaign,
    id: newEntityId(),
    createdAt: now,
    updatedAt: now,
  };
  await db.collection(CAMPAIGNS_COLLECTION).insertOne(doc);
  return doc;
}

export async function findBatchCampaignById(id: string): Promise<BatchCampaign | null> {
  const { db } = await connectToDatabase();
  return db.collection(CAMPAIGNS_COLLECTION).findOne<BatchCampaign>({ id });
}

export async function updateBatchCampaignStatus(
  id: string,
  status: BatchCampaign['status']
): Promise<BatchCampaign | null> {
  const { db } = await connectToDatabase();
  return db.collection(CAMPAIGNS_COLLECTION).findOneAndUpdate(
    { id },
    { $set: { status, updatedAt: new Date() } },
    { returnDocument: 'after' }
  ) as Promise<BatchCampaign | null>;
}

export async function getNextBatchCampaignNumber(): Promise<number> {
  const { db } = await connectToDatabase();
  const result = await db.collection(COUNTERS_COLLECTION).findOneAndUpdate(
    { _id: 'batch_campaigns' },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  return (result?.seq ?? 0) as number;
}

// ---------------------------------------------------------------------------
// Batch reservations
// ---------------------------------------------------------------------------

export async function createReservation(
  reservation: Omit<BatchReservation, 'id' | 'createdAt' | 'updatedAt'>
): Promise<BatchReservation> {
  const { db } = await connectToDatabase();
  const now = new Date();
  const doc: BatchReservation = {
    ...reservation,
    id: newEntityId(),
    createdAt: now,
    updatedAt: now,
  };
  await db.collection(RESERVATIONS_COLLECTION).insertOne(doc);
  return doc;
}

export async function findReservationById(id: string): Promise<BatchReservation | null> {
  const { db } = await connectToDatabase();
  return db.collection(RESERVATIONS_COLLECTION).findOne<BatchReservation>({ id });
}

export async function updateReservationPayment(
  id: string,
  fields: Pick<BatchReservation, 'squarePaymentLinkId' | 'squareOrderId' | 'paymentUrl' | 'paymentStatus'>
): Promise<BatchReservation | null> {
  const { db } = await connectToDatabase();
  return db.collection(RESERVATIONS_COLLECTION).findOneAndUpdate(
    { id },
    { $set: { ...fields, updatedAt: new Date() } },
    { returnDocument: 'after' }
  ) as Promise<BatchReservation | null>;
}
