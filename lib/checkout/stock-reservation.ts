/**
 * Durable, bounded stock reservation for the one canonical Square checkout.
 *
 * A read-only preflight admits two customers to buy the final unit. This
 * transaction makes a stock deduction and a unique order claim one atomic
 * operation BEFORE Square can receive a charge request.
 *
 * Do not automatically expire ambiguous claims: a timeout does not establish
 * that Square did not capture money. Reconcile with Square before releasing.
 */
import type { Db, MongoClient, ClientSession } from 'mongodb';

export class CheckoutStockUnavailableError extends Error {
  code: string;
  constructor(code = 'INVENTORY_UNAVAILABLE') {
    super('This quantity is no longer available for checkout. Please update your cart.');
    this.name = 'CheckoutStockUnavailableError';
    this.code = code;
  }
}
type CheckoutLine = { id?: string; productId?: string; squareId?: string; quantity?: number };
type HeldItem = { productId: string; quantity: number };
type Claim = { orderId: string; status: 'reserved'|'committed'|'released'; items: HeldItem[] };

function aggregateItems(raw: CheckoutLine[]): HeldItem[] {
  const totals = new Map<string, number>();
  for (const item of raw || []) {
    const productId = String(item.productId || item.id || item.squareId || '');
    const quantity = Number(item.quantity);
    if (!productId || !Number.isSafeInteger(quantity) || quantity <= 0) {
      throw new CheckoutStockUnavailableError('INVALID_ORDER_ITEMS');
    }
    totals.set(productId, (totals.get(productId) || 0) + quantity);
  }
  if (!totals.size) throw new CheckoutStockUnavailableError('INVALID_ORDER_ITEMS');
  return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([productId, quantity]) => ({ productId, quantity }));
}
function sameItems(a: HeldItem[], b: HeldItem[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function withStockTransaction<T>(client: MongoClient, fn: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = client.startSession();
  try {
    return await session.withTransaction(fn, {
      readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' },
    }) as T;
  } finally {
    await session.endSession();
  }
}

export async function reserveCheckoutInventory(
  db: Db, client: MongoClient, args: { orderId: string; items: CheckoutLine[] },
): Promise<{ valid: true; alreadyReserved: boolean } | { valid: false; code: string }> {
  const { orderId } = args;
  if (!orderId) return { valid: false, code: 'INVALID_ORDER_ID' };
  let items: HeldItem[];
  try { items = aggregateItems(args.items); }
  catch (error) {
    if (error instanceof CheckoutStockUnavailableError) return { valid: false, code: error.code };
    throw error;
  }

  const claims = db.collection<Claim>('checkout_stock_claims');
  // Fail closed if the unique index cannot be created/verified.
  await claims.createIndex({ orderId: 1 }, { unique: true, name: 'checkout_stock_claim_order_unique' });

  try {
    return await withStockTransaction(client, async (session) => {
      const prior = await claims.findOne({ orderId }, { session });
      if (prior && !sameItems(prior.items, items)) {
        throw new CheckoutStockUnavailableError('CHECKOUT_STOCK_CLAIM_CONFLICT');
      }
      if (prior?.status === 'reserved' || prior?.status === 'committed') {
        return { valid: true as const, alreadyReserved: true };
      }

      // Conditional single-document decrements on the same Mongo transaction
      // make multi-item reservations all-or-nothing and prevent negative stock.
      for (const item of items) {
        const updated = await db.collection('inventory').updateOne(
          { productId: item.productId, currentStock: { $gte: item.quantity } },
          {
            $inc: { currentStock: -item.quantity },
            $set: { updatedAt: new Date(), lastCheckoutReservationOrderId: orderId },
          },
          { session },
        );
        if (updated.matchedCount !== 1) throw new CheckoutStockUnavailableError();
      }

      if (prior?.status === 'released') {
        await claims.updateOne({ orderId, status: 'released' }, {
          $set: { status: 'reserved', items, reservedAt: new Date(), updatedAt: new Date() },
        }, { session });
      } else {
        await claims.insertOne({
          orderId, status: 'reserved', items,
          reservedAt: new Date(), updatedAt: new Date(),
        } as Claim, { session });
      }
      return { valid: true as const, alreadyReserved: false };
    });
  } catch (error) {
    if (error instanceof CheckoutStockUnavailableError) {
      return { valid: false, code: error.code };
    }
    // Transaction write-conflict or unknown commit result: NEVER charge on
    // uncertainty. A retry will inspect the committed claim before proceeding.
    throw error;
  }
}

export async function releaseCheckoutInventory(
  db: Db, client: MongoClient, orderId: string, reason = 'square_declined',
): Promise<boolean> {
  return withStockTransaction(client, async (session) => {
    const claims = db.collection<Claim>('checkout_stock_claims');
    const claim = await claims.findOne({ orderId }, { session });
    if (!claim || claim.status !== 'reserved') return false;
    for (const item of claim.items) {
      const result = await db.collection('inventory').updateOne(
        { productId: item.productId },
        { $inc: { currentStock: item.quantity }, $set: { updatedAt: new Date() } },
        { session },
      );
      if (result.matchedCount !== 1) throw new Error('Stock claim release cannot locate inventory row');
    }
    const changed = await claims.updateOne(
      { orderId, status: 'reserved' },
      { $set: { status: 'released', releasedAt: new Date(), releaseReason: reason, updatedAt: new Date() } },
      { session },
    );
    if (changed.modifiedCount !== 1) throw new Error('Concurrent reservation state change');
    return true;
  });
}

/**
 * Return managed:false only for a legacy order with no pre-payment claim.
 * New checkout orders MUST have a claim; the caller checks this.
 * The physical stock was deducted before Square charge, so it must never be
 * decremented a second time when payment succeeds.
 */
export async function commitCheckoutInventory(
  db: Db, client: MongoClient, orderId: string, actor = 'payment_capture',
): Promise<{ managed: boolean; skipped: boolean; debited: number }> {
  return withStockTransaction(client, async (session) => {
    const claims = db.collection<Claim>('checkout_stock_claims');
    const claim = await claims.findOne({ orderId }, { session });
    if (!claim) return { managed: false, skipped: false, debited: 0 };
    if (claim.status === 'committed') return { managed: true, skipped: true, debited: 0 };
    if (claim.status !== 'reserved') {
      throw new Error('Captured Square payment has no active stock claim: manual reconciliation/refund required');
    }
    const update = await claims.updateOne(
      { orderId, status: 'reserved' },
      { $set: { status: 'committed', committedAt: new Date(), updatedAt: new Date() } },
      { session },
    );
    if (update.modifiedCount !== 1) throw new Error('Stock claim commit race');
    const alreadyLogged = await db.collection('inventory_events').findOne(
      { type: 'order_debit', orderId }, { session },
    );
    if (!alreadyLogged) {
      await db.collection('inventory_events').insertOne({
        type: 'order_debit', orderId, orderNumber: orderId, actor,
        origin: 'checkout_prepayment_reservation', items: claim.items, createdAt: new Date(),
      }, { session });
    }
    return { managed: true, skipped: false, debited: claim.items.length };
  });
}
