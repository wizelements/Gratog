/**
 * Merchant-controlled preorder capacity, distinct from on-hand inventory.
 *
 * All identifiers here come from server-resolved catalog variations or
 * admin-configured bundle recipes. The customer's cart never supplies SKU
 * prices, quantities of ingredients, or availability.
 *
 * A held unit is retained after successful link generation and payment. It
 * must not be released on a timer while an externally payable link is alive.
 * Link cancellation/refund is a separate independently certified workflow.
 */
import { createHash } from 'node:crypto';

export const CAPACITY_COLLECTION = 'preorder_capacity';
export const RESERVATION_COLLECTION = 'preorder_capacity_reservations';
export const RECIPE_COLLECTION = 'preorder_bundle_recipes';
export const PREORDER_SLOT_SKU = 'preorder_slot';
const MAX_CART_LINES = 30;
const MAX_UNITS_PER_LINE = 99;
const MAX_DISTINCT_COMPONENTS = 100;

export class CapacityError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 409) {
    super(message);
    this.name = 'CapacityError';
    this.code = code;
    this.status = status;
  }
}

export type DemandLine = { sku: string; quantity: number; name?: string; isBundle?: boolean };
export type CapacityRequirement = { sku: string; quantity: number };
export type BundleRecipe = { sku: string; active: boolean; components: CapacityRequirement[] };
type Store = { collection: (name: string) => any };
type MongoClient = { startSession: () => any };

function requireIdentifier(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,127}$/.test(value)) {
    throw new CapacityError('INVALID_CAPACITY_ID', `Invalid ${label}`, 400);
  }
  return value;
}

function requireCount(value: unknown, label: string, max = MAX_UNITS_PER_LINE): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1 || Number(value) > max) {
    throw new CapacityError('INVALID_CAPACITY_QUANTITY', `Invalid ${label}`, 400);
  }
  return Number(value);
}

export function pickupDateKey(date: Date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new CapacityError('INVALID_PICKUP_DATE', 'A valid pickup date is required', 400);
  }
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = (key: string) => parts.find(part => part.type === key)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function capacityKey(marketId: string, dateKey: string, sku: string) {
  const market = requireIdentifier(marketId, 'market ID');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new CapacityError('INVALID_PICKUP_DATE', 'Invalid pickup date', 400);
  }
  return JSON.stringify([market, dateKey, requireIdentifier(sku, 'SKU')]);
}

export function fingerprintPreorder(
  marketId: string, dateKey: string, items: DemandLine[],
  customerEmail = '', totalCents = 0
) {
  const normalized = items.map(item => ({
    sku: requireIdentifier(item.sku, 'SKU'),
    quantity: requireCount(item.quantity, 'quantity'),
    isBundle: item.isBundle === true,
  })).sort((a, b) => a.sku.localeCompare(b.sku) || a.quantity - b.quantity);
  return createHash('sha256').update(JSON.stringify({ marketId, dateKey, items: normalized,
    customerEmail: customerEmail.trim().toLowerCase(), totalCents })).digest('hex');
}

/**
 * Expand merchant-authored bundle recipes into source SKUs. Never accept
 * component claims or quantities from a browser.
 */
export function expandCapacityDemand(
  cart: DemandLine[], recipes: Map<string, BundleRecipe> = new Map()
): CapacityRequirement[] {
  if (!Array.isArray(cart) || !cart.length || cart.length > MAX_CART_LINES) {
    throw new CapacityError('INVALID_PREORDER_ITEMS', 'An order must contain 1–30 line items', 400);
  }
  const demand = new Map<string, number>();
  const add = (sku: string, qty: number) => {
    const previous = demand.get(sku) || 0;
    const next = previous + qty;
    if (!Number.isSafeInteger(next) || next > 100_000) {
      throw new CapacityError('CAPACITY_QUANTITY_OVERFLOW', 'Too many units requested', 400);
    }
    demand.set(sku, next);
  };
  for (const item of cart) {
    const sku = requireIdentifier(item.sku, 'SKU');
    const qty = requireCount(item.quantity, 'quantity');
    if (item.isBundle) {
      const recipe = recipes.get(sku);
      if (!recipe?.active || !Array.isArray(recipe.components) || !recipe.components.length) {
        throw new CapacityError('BUNDLE_RECIPE_UNAVAILABLE', 'Bundle components have not been approved');
      }
      for (const component of recipe.components) {
        add(requireIdentifier(component.sku, 'bundle component SKU'),
          qty * requireCount(component.quantity, 'recipe quantity', 1000));
      }
    } else add(sku, qty);
  }
  if (demand.size > MAX_DISTINCT_COMPONENTS) {
    throw new CapacityError('TOO_MANY_COMPONENTS', 'Too many distinct items in a preorder', 400);
  }
  return [...demand.entries()].map(([sku, quantity]) => ({ sku, quantity }))
    .sort((a, b) => a.sku.localeCompare(b.sku));
}

export async function loadApprovedBundleRecipes(db: Store, cart: DemandLine[]) {
  // Merchant-authored recipe can define a bundle even without a catalog flag.
  const bundleSkus = [...new Set(cart.map(item => item.sku))];
  if (!bundleSkus.length) return new Map<string, BundleRecipe>();
  const docs = await db.collection(RECIPE_COLLECTION).find({
    _id: { $in: bundleSkus }, active: true,
  }).toArray();
  return new Map<string, BundleRecipe>(docs.map((doc: any) => [String(doc._id), {
    sku: doc._id, active: doc.active === true, components: doc.components,
  }]));
}

/**
 * Atomically holds ALL cart components and persists the preorder + waitlist.
 * MongoDB replica set/transaction support is mandatory. No auto fallback to
 * nontransactional or optimistic read-then-insert behavior.
 */
export async function createCapacityBoundPreorder(input: {
  db: Store;
  client: MongoClient;
  marketId: string;
  dateKey: string;
  prefix: string;
  checkoutRequestId: string;
  order: Record<string, any>;
  demand: CapacityRequirement[];
}) {
  const { db, client, marketId, dateKey, prefix, checkoutRequestId, order, demand } = input;
  requireIdentifier(marketId, 'market ID');
  const safeId = requireIdentifier(checkoutRequestId, 'checkout request ID');
  if (safeId.length < 16) {
    throw new CapacityError('INVALID_REQUEST_ID', 'Checkout request ID is too short', 400);
  }
  if (!Array.isArray(demand) || !demand.length) {
    throw new CapacityError('INVALID_PREORDER_ITEMS', 'No reservable items', 400);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !/^[a-zA-Z0-9]{1,6}$/.test(prefix)) {
    throw new CapacityError('INVALID_PICKUP_DATE', 'Invalid pickup schedule', 400);
  }
  const existing = await db.collection('marketorders').findOne({ checkoutRequestId: safeId });
  if (existing) {
    if (existing.preorderFingerprint !== order.preorderFingerprint) {
      throw new CapacityError('IDEMPOTENCY_CONFLICT', 'This checkout request was already used for different items');
    }
    return { preorder: existing, replay: true };
  }

  // Validate durable uniqueness before opening a session: on a missing index,
  // creating a session first leaks resources during traffic spikes.
  const indexPresent = await db.collection('marketorders').indexExists('idx_marketorders_checkout_request');
  if (!indexPresent) {
    throw new CapacityError('PREORDER_IDEMPOTENCY_INDEX_MISSING', 'Preorder index has not been provisioned', 503);
  }
  const session = client.startSession();
  let created: any;
  let wasReplay = false;
  try {
    await session.withTransaction(async () => {
      // Recheck inside the transaction; unique index is required for
      // concurrent requests sharing an idempotency key.
      const replay = await db.collection('marketorders').findOne(
        { checkoutRequestId: safeId }, { session }
      );
      if (replay) {
        if (replay.preorderFingerprint !== order.preorderFingerprint) {
          throw new CapacityError('IDEMPOTENCY_CONFLICT', 'Conflicting checkout retry');
        }
        created = replay;
        wasReplay = true;
        return;
      }
      const now = new Date();
      for (const entry of [...demand].sort((a, b) => a.sku.localeCompare(b.sku))) {
        const sku = requireIdentifier(entry.sku, 'SKU');
        const quantity = requireCount(entry.quantity, 'requested units', 100_000);
        const updated = await db.collection(CAPACITY_COLLECTION).findOneAndUpdate(
          {
            _id: capacityKey(marketId, dateKey, sku),
            active: true,
            $expr: { $gte: [{ $subtract: ['$limitUnits', '$heldUnits'] }, quantity] },
          },
          { $inc: { heldUnits: quantity }, $set: { updatedAt: now } },
          { session, returnDocument: 'after' }
        );
        if (!updated) {
          throw new CapacityError('PREORDER_CAPACITY_UNAVAILABLE',
            'This item has reached its preorder limit or is not configured for this pickup date');
        }
      }
      const counterResult = await db.collection('market_counters').findOneAndUpdate(
        { _id: `${marketId}-${dateKey}` },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: 'after', session }
      );
      const counter = counterResult?.seq;
      if (!Number.isSafeInteger(counter) || counter < 1) {
        throw new CapacityError('QUEUE_COUNTER_UNAVAILABLE', 'Could not assign a queue number', 503);
      }
      const dayOfMonth = dateKey.slice(-2);
      const waitlistNumber = `${prefix}-${dayOfMonth}${String(counter).padStart(2, '0')}`;
      const preorder = {
        ...order,
        checkoutRequestId: safeId,
        orderNumber: order.orderNumber,
        preorderFingerprint: order.preorderFingerprint,
        queuePosition: counter,
        waitlistNumber,
        capacityDateKey: dateKey,
        capacityRequirements: demand,
        capacityReservationStatus: 'held',
        confirmationStatus: 'pending',
        createdAt: now,
        updatedAt: now,
      };
      await db.collection('marketorders').insertOne(preorder, { session });
      created = preorder;
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    return { preorder: created, replay: wasReplay };
  } catch (error: any) {
    // Duplicate client retries are benign ONLY when the payload fingerprint
    // matches. Other errors (including transaction unavailable) must fail closed.
    if (error?.code === 11000) {
      const replay = await db.collection('marketorders').findOne({ checkoutRequestId: safeId });
      if (replay && replay.preorderFingerprint === order.preorderFingerprint) {
        return { preorder: replay, replay: true };
      }
      throw new CapacityError('IDEMPOTENCY_CONFLICT', 'Checkout request already exists');
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

/**
 * Single-flight Square payment link claim across browser retries and Vercel
 * instances. A distinct checkout key already identifies the immutable order.
 * An abandoned `creating` state is NOT automatically unlocked: the Square
 * provider must first be reconciled for a link that may exist.
 */
export async function claimPreorderPaymentLinkCreation(db: Store, orderNumber: string) {
  const claimed = await db.collection('marketorders').findOneAndUpdate(
    {
      orderNumber, paymentStatus: 'PENDING', capacityReservationStatus: 'held',
      paymentLinkId: { $exists: false },
      paymentLinkState: { $exists: false },
    },
    { $set: { paymentLinkState: 'creating', paymentLinkStartedAt: new Date() } },
    { returnDocument: 'after' }
  );
  return Boolean(claimed);
}

/**
 * Release capacity ONLY when the provider explicitly reports that creating a
 * payment link FAILED before it existed. Never run this after an ambiguous
 * network timeout, an active payable link, or after payment.
 */
export async function releaseCapacityAfterDefinitiveLinkFailure(
  db: Store, client: MongoClient, orderNumber: string
) {
  const session = client.startSession();
  try {
    let released = false;
    await session.withTransaction(async () => {
      const order = await db.collection('marketorders').findOne(
        { orderNumber, paymentStatus: 'PENDING', capacityReservationStatus: 'held', paymentLinkId: { $in: [null, ''] } },
        { session }
      );
      if (!order) return;
      for (const entry of order.capacityRequirements || []) {
        const result = await db.collection(CAPACITY_COLLECTION).updateOne(
          {
            _id: capacityKey(order.marketId, order.capacityDateKey, entry.sku),
            heldUnits: { $gte: entry.quantity },
          },
          { $inc: { heldUnits: -entry.quantity }, $set: { updatedAt: new Date() } },
          { session }
        );
        if (result.modifiedCount !== 1) {
          throw new CapacityError('CAPACITY_RELEASE_FAILED', 'Unable to release order capacity', 503);
        }
      }
      const result = await db.collection('marketorders').updateOne(
        { _id: order._id, paymentStatus: 'PENDING', capacityReservationStatus: 'held' },
        { $set: {
          capacityReservationStatus: 'released',
          paymentStatus: 'FAILED',
          status: 'CANCELLED',
          updatedAt: new Date(),
        } },
        { session }
      );
      if (result.modifiedCount !== 1) {
        throw new CapacityError('CAPACITY_RELEASE_FAILED', 'Unable to close payment attempt', 503);
      }
      released = true;
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    return released;
  } finally {
    await session.endSession();
  }
}

export function assertSafeCapacityLimit(limitUnits: number, heldUnits: number) {
  if (!Number.isSafeInteger(limitUnits) || limitUnits < 0 || limitUnits > 100_000) {
    throw new CapacityError('INVALID_CAPACITY_LIMIT', 'Capacity must be an integer from 0 to 100,000', 400);
  }
  if (!Number.isSafeInteger(heldUnits) || heldUnits < 0 || limitUnits < heldUnits) {
    throw new CapacityError('CAPACITY_BELOW_HELD', 'Cannot reduce capacity below existing commitments');
  }
}
