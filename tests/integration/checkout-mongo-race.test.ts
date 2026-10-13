import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoClient } from 'mongodb';
import { randomUUID } from 'node:crypto';
import { createOrReuseCheckoutOrder, CheckoutAttemptConflictError } from '@/lib/checkout/single-order';
import { reserveMarketPreorderAttempt, completeMarketPreorderAttempt } from '@/lib/preorder/single-attempt';
import { reserveCheckoutInventory, releaseCheckoutInventory, commitCheckoutInventory } from '@/lib/checkout/stock-reservation';

const mongoUri = process.env.MONGODB_URI;
const run = mongoUri?.includes('tog_checkout_race_ci') ? describe : describe.skip;
let client: MongoClient;
let db: any;

run('real Mongo replica-set checkout uniqueness', () => {
  beforeAll(async () => {
    client = new MongoClient(mongoUri!);
    await client.connect();
    const hello = await client.db('admin').command({ hello: 1 });
    if (!hello.setName) throw new Error('This integration proof requires a genuine Mongo replica set');
    db = client.db('tog_checkout_race_ci');
  }, 25_000);

  afterAll(async () => {
    if (db) await db.dropDatabase();
    if (client) await client.close();
  }, 25_000);

  it('creates exactly one committed order across 24 concurrent transactions', async () => {
    const orders = db.collection('orders');
    const key = randomUUID();
    const fingerprint = 'same-cart-and-pickup';
    const create = async () => {
      const session = client.startSession();
      try {
        return await session.withTransaction(async () => {
          // A real committed Mongo transaction, not an in-memory fake.
          const order = { id: randomUUID(), checkoutAttemptKey: key, checkoutRequestFingerprint: fingerprint };
          await orders.insertOne(order, { session });
          return order;
        });
      } finally {
        await session.endSession();
      }
    };
    const request = {
      collection: orders, key, fingerprint, create,
      existingResponse: (order: any) => order,
    };
    const responses = await Promise.all(Array.from({ length: 24 }, () => createOrReuseCheckoutOrder(request)));
    expect(new Set(responses.map(x => x.id)).size).toBe(1);
    expect(await orders.countDocuments({ checkoutAttemptKey: key })).toBe(1);
    await expect(createOrReuseCheckoutOrder({ ...request, fingerprint: 'changed-quantity' }))
      .rejects.toBeInstanceOf(CheckoutAttemptConflictError);
    expect(await orders.countDocuments({ checkoutAttemptKey: key })).toBe(1);
  }, 30_000);

  it('allows just one market Square-link admission across 24 concurrent intents', async () => {
    const key = randomUUID();
    const fingerprint = 'market-cart-and-schedule';
    const attempts = await Promise.all(Array.from({ length: 24 },
      () => reserveMarketPreorderAttempt(key, fingerprint)));
    expect(attempts.filter(x => x.state === 'new')).toHaveLength(1);
    expect(attempts.filter(x => x.state === 'pending')).toHaveLength(23);
    const saved = { success: true, orderNumber: 'PRE-TEST', payment: { url: 'https://example.invalid/square-test' } };
    await completeMarketPreorderAttempt(key, saved, 'complete');
    expect(await reserveMarketPreorderAttempt(key, fingerprint)).toMatchObject({
      state: 'replay', result: saved,
    });
    expect((await reserveMarketPreorderAttempt(key, 'changed-cart')).state).toBe('conflict');
    expect(await db.collection('market_preorder_attempts').countDocuments({ key })).toBe(1);
  }, 30_000);
  it('admits exactly one of 24 DISTINCT checkout orders for the final stock unit', async () => {
    const productId = 'final-unit-' + randomUUID();
    await db.collection('inventory').insertOne({ productId, currentStock: 1 });
    const results = await Promise.all(Array.from({ length: 24 }, (_, n) =>
      reserveCheckoutInventory(db, client, {
        orderId: 'other-customer-' + n + '-' + randomUUID(),
        items: [{ productId, quantity: 1 }],
      }),
    ));
    expect(results.filter(result => result.valid)).toHaveLength(1);
    expect(results.filter(result => !result.valid)).toHaveLength(23);
    expect((await db.collection('inventory').findOne({ productId })).currentStock).toBe(0);
    const claims = await db.collection('checkout_stock_claims').find({ 'items.productId': productId }).toArray();
    expect(claims.filter((claim: any) => claim.status === 'reserved')).toHaveLength(1);
  }, 35_000);

  it('reserves an entire multi-item cart atomically and restores stock after proven decline', async () => {
    const first = 'stock-A-' + randomUUID();
    const second = 'stock-B-' + randomUUID();
    const orderId = randomUUID();
    const items = [{ productId: first, quantity: 2 }, { productId: second, quantity: 1 }];
    await db.collection('inventory').insertMany([
      { productId: first, currentStock: 3 },
      { productId: second, currentStock: 0 },
    ]);
    const rejected = await reserveCheckoutInventory(db, client, { orderId, items });
    expect(rejected.valid).toBe(false);
    expect((await db.collection('inventory').findOne({ productId: first })).currentStock).toBe(3);
    expect(await db.collection('checkout_stock_claims').countDocuments({ orderId })).toBe(0);

    await db.collection('inventory').updateOne({ productId: second }, { $set: { currentStock: 1 } });
    expect((await reserveCheckoutInventory(db, client, { orderId, items })).valid).toBe(true);
    expect((await reserveCheckoutInventory(db, client, { orderId, items })).valid).toBe(true);
    expect((await db.collection('inventory').findOne({ productId: first })).currentStock).toBe(1);
    expect((await db.collection('inventory').findOne({ productId: second })).currentStock).toBe(0);

    expect(await releaseCheckoutInventory(db, client, orderId, 'verified_decline')).toBe(true);
    expect(await releaseCheckoutInventory(db, client, orderId, 'duplicate_decline')).toBe(false);
    expect((await db.collection('inventory').findOne({ productId: first })).currentStock).toBe(3);
    expect((await db.collection('inventory').findOne({ productId: second })).currentStock).toBe(1);
    expect((await reserveCheckoutInventory(db, client, { orderId, items })).valid).toBe(true);
    const confirmed = await Promise.all(Array.from({ length: 12 },
      () => commitCheckoutInventory(db, client, orderId)));
    expect(confirmed.filter(result => !result.skipped)).toHaveLength(1);
    expect(confirmed.filter(result => result.skipped)).toHaveLength(11);
    expect(await db.collection('inventory_events').countDocuments({ type: 'order_debit', orderId })).toBe(1);
    // Capture commits the already withheld quantity: NEVER subtract a second time.
    expect((await db.collection('inventory').findOne({ productId: first })).currentStock).toBe(1);
    expect((await db.collection('inventory').findOne({ productId: second })).currentStock).toBe(0);
    expect(await releaseCheckoutInventory(db, client, orderId, 'late_decline')).toBe(false);
  }, 35_000);

});
