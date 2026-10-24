/**
 * Real MongoDB replica-set, ACID and unique-index concurrency acceptance.
 * Runs only in the isolated, disposable CI replica set configured by the
 * accompanying certification workflow. Never contacts merchant databases.
 */
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { MongoClient } from 'mongodb';
import { randomUUID } from 'node:crypto';
import {
  createCapacityBoundPreorder, releaseCapacityAfterDefinitiveLinkFailure,
  capacityKey, fingerprintPreorder, CapacityError, claimPreorderPaymentLinkCreation,
} from '@/lib/preorder/capacity';

const URI = process.env.PREORDER_TEST_MONGO_URI;
const suite = URI ? describe : describe.skip;
const DAY = '2026-10-26';
const MARKET = 'market1';
const CAPPED = 125;
const TOTAL = 1000;
const PARALLEL = 32;
const key = (sku: string) => capacityKey(MARKET, DAY, sku);

suite('real replica-set preorder load certification', () => {
  let client: MongoClient;
  let db: any;
  let databaseName = '';
  let warmAt = 0;
  beforeAll(async () => {
    client = new MongoClient(URI!, { maxPoolSize: 48, serverSelectionTimeoutMS: 15000 });
    await client.connect();
    databaseName = 'tog_preorder_cert_' + randomUUID().replaceAll('-', '');
    db = client.db(databaseName);
    await db.collection('marketorders').createIndex({ checkoutRequestId: 1 }, {
      unique: true, partialFilterExpression: { checkoutRequestId: { $type: 'string' } },
      name: 'idx_marketorders_checkout_request',
    });
    await db.collection('marketorders').createIndex({ orderNumber: 1 }, { unique: true });
    await db.collection('preorder_capacity').insertMany([
      { _id: key('preorder_slot'), marketId: MARKET, dateKey: DAY, sku: 'preorder_slot',
        active: true, limitUnits: CAPPED, heldUnits: 0 },
      { _id: key('strawberry'), marketId: MARKET, dateKey: DAY, sku: 'strawberry',
        active: true, limitUnits: CAPPED, heldUnits: 0 },
      { _id: key('pineapple'), marketId: MARKET, dateKey: DAY, sku: 'pineapple',
        active: true, limitUnits: 0, heldUnits: 0 },
    ]);
    warmAt = Date.now();
  }, 30000);
  afterAll(async () => {
    if (client) {
      try { if (databaseName) await client.db(databaseName).dropDatabase(); }
      finally { await client.close(); }
    }
  }, 30000);

  function place(i: number, demand = [
    { sku: 'preorder_slot', quantity: 1 }, { sku: 'strawberry', quantity: 1 },
  ], checkoutSuffix = String(i).padStart(5, '0')) {
    const checkoutRequestId = 'checkout-cert-real-' + checkoutSuffix;
    const preorderFingerprint = fingerprintPreorder(MARKET, DAY, demand);
    return createCapacityBoundPreorder({
      db, client, marketId: MARKET, dateKey: DAY, prefix: 'T',
      checkoutRequestId, demand,
      order: {
        checkoutRequestId, marketId: MARKET,
        orderNumber: 'PRE-REAL-' + checkoutSuffix,
        preorderFingerprint, totalCents: 1199, paymentStatus: 'PENDING',
      },
    });
  }

  it('admits at most 125 of 1,000 requests under real multi-client transaction contention', async () => {
    let next = 0;
    const outcomes: Array<{ success: boolean; queue?: number; code?: string; ms: number }> = [];
    const workers = Array.from({ length: PARALLEL }, async () => {
      while (true) {
        const i = next++;
        if (i >= TOTAL) return;
        const started = Date.now();
        try {
          const result = await place(i);
          outcomes.push({ success: true, queue: result.preorder.queuePosition, ms: Date.now() - started });
        } catch (error) {
          outcomes.push({
            success: false,
            code: error instanceof CapacityError ? error.code : 'UNEXPECTED_' + (error as Error).name,
            ms: Date.now() - started,
          });
        }
      }
    });
    await Promise.all(workers);
    const successful = outcomes.filter(x => x.success);
    const denied = outcomes.filter(x => !x.success);
    const unexpected = denied.filter(x => x.code !== 'PREORDER_CAPACITY_UNAVAILABLE');
    const doc = await db.collection('preorder_capacity').findOne({ _id: key('strawberry') });
    const slot = await db.collection('preorder_capacity').findOne({ _id: key('preorder_slot') });
    const orders = await db.collection('marketorders').countDocuments({});
    const counters = await db.collection('market_counters').findOne({ _id: MARKET + '-' + DAY });
    const latencies = outcomes.map(x => x.ms).sort((a, b) => a - b);
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
    console.log('PREORDER_REAL_MONGO_LOAD_RESULT', JSON.stringify({
      attempted: TOTAL, concurrency: PARALLEL,
      admitted: successful.length, denied: denied.length,
      unexpected: unexpected.map(x => x.code).slice(0, 12),
      heldUnits: doc?.heldUnits, heldSlots: slot?.heldUnits, orderCount: orders,
      queueCount: counters?.seq, p95ms: p95, wallMs: Date.now() - warmAt,
    }));
    expect(successful).toHaveLength(CAPPED);
    expect(denied).toHaveLength(TOTAL - CAPPED);
    expect(unexpected).toHaveLength(0);
    expect(doc?.heldUnits).toBe(CAPPED);
    expect(slot?.heldUnits).toBe(CAPPED);
    expect(orders).toBe(CAPPED);
    expect(counters?.seq).toBe(CAPPED);
    expect(new Set(successful.map(x => x.queue)).size).toBe(CAPPED);
  }, 180000);

  it('replays the same request without double-reserving and rejects changed payload', async () => {
    const replay = await place(0);
    expect(replay.replay).toBe(true);
    const slotBefore = await db.collection('preorder_capacity').findOne({ _id: key('preorder_slot') });
    expect(slotBefore.heldUnits).toBe(CAPPED);
    const altered = [
      { sku: 'preorder_slot', quantity: 1 }, { sku: 'pineapple', quantity: 1 },
    ];
    await expect(place(0, altered)).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
  }, 30000);

  it('rolls back a component shortage without retaining a partial slot', async () => {
    const item = await db.collection('preorder_capacity').findOne({ _id: key('strawberry') });
    const before = item.heldUnits;
    await expect(place(1200, [
      { sku: 'strawberry', quantity: 1 }, { sku: 'pineapple', quantity: 1 },
    ])).rejects.toMatchObject({ code: 'PREORDER_CAPACITY_UNAVAILABLE' });
    const after = await db.collection('preorder_capacity').findOne({ _id: key('strawberry') });
    expect(after.heldUnits).toBe(before);
  });

  it('allows only one payment-link creator across 100 concurrent API retries', async () => {
    const claims = await Promise.all(Array.from({ length: 100 }, () =>
      claimPreorderPaymentLinkCreation(db, 'PRE-REAL-00001')));
    expect(claims.filter(Boolean)).toHaveLength(1);
    const stored = await db.collection('marketorders').findOne({
      orderNumber: 'PRE-REAL-00001',
    });
    expect(stored.paymentLinkState).toBe('creating');
    // Payment status remains untouched, and incomplete provider results are
    // never automatically made available for a second attempt.
    expect(stored.paymentStatus).toBe('PENDING');
  }, 30000);

  it('can safely release an unpayable attempt exactly once under concurrent retries', async () => {
    const order = await db.collection('marketorders').findOne({ checkoutRequestId: 'checkout-cert-real-00000' });
    const results = await Promise.allSettled([
      releaseCapacityAfterDefinitiveLinkFailure(db, client, order.orderNumber),
      releaseCapacityAfterDefinitiveLinkFailure(db, client, order.orderNumber),
    ]);
    expect(results.filter(x => x.status === 'fulfilled' && x.value)).toHaveLength(1);
    const remaining = await db.collection('preorder_capacity').findOne({ _id: key('strawberry') });
    expect(remaining.heldUnits).toBe(CAPPED - 1);
    const updated = await db.collection('marketorders').findOne({ _id: order._id });
    expect(updated.capacityReservationStatus).toBe('released');
  }, 30000);
});
