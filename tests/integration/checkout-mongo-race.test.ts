import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoClient } from 'mongodb';
import { randomUUID } from 'node:crypto';
import { createOrReuseCheckoutOrder, CheckoutAttemptConflictError } from '@/lib/checkout/single-order';
import { reserveMarketPreorderAttempt, completeMarketPreorderAttempt } from '@/lib/preorder/single-attempt';

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
});
