import { describe, expect, it, vi } from 'vitest';
import {
  createOrReuseCheckoutOrder,
  CheckoutAttemptConflictError,
} from '@/lib/checkout/single-order';

function fakeOrders() {
  const rows = new Map<string, any>();
  const createIndex = vi.fn(async () => 'checkout_attempt_key_unique');
  const findOne = vi.fn(async ({ checkoutAttemptKey }: { checkoutAttemptKey: string }) =>
    rows.get(checkoutAttemptKey) || null
  );
  const collection = { createIndex, findOne };
  let id = 0;
  const make = (key: string, fingerprint: string) => async () => {
    // Yield deliberately to make both requests observe the same initial miss.
    await Promise.resolve();
    if (rows.has(key)) {
      throw Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
    }
    const order = { id: 'order-' + (++id), checkoutAttemptKey: key, checkoutRequestFingerprint: fingerprint };
    rows.set(key, order);
    return order;
  };
  return { rows, collection, make };
}

describe('checkout single-order admission', () => {
  it('returns precisely one stored order under concurrent identical POSTs', async () => {
    const { rows, collection, make } = fakeOrders();
    const key = '00000000-0000-4000-8000-000000000001';
    const args = { collection, key, fingerprint: 'cart-and-fulfillment-A',
      create: make(key, 'cart-and-fulfillment-A'), existingResponse: (order: any) => order };
    const results = await Promise.all(Array.from({ length: 12 },
      () => createOrReuseCheckoutOrder(args)));
    expect(new Set(results.map(item => item.id)).size).toBe(1);
    expect(rows.size).toBe(1);
    expect(collection.createIndex).toHaveBeenCalledWith(
      { checkoutAttemptKey: 1 }, expect.objectContaining({ unique: true })
    );
  });

  it('rejects reuse of an idempotency key with changed cart or destination', async () => {
    const { collection, make } = fakeOrders();
    const key = '00000000-0000-4000-8000-000000000002';
    const base = { collection, key, existingResponse: (order: any) => order };
    await createOrReuseCheckoutOrder({ ...base, fingerprint: 'payload-1', create: make(key, 'payload-1') });
    await expect(createOrReuseCheckoutOrder({
      ...base, fingerprint: 'payload-2', create: make(key, 'payload-2'),
    })).rejects.toBeInstanceOf(CheckoutAttemptConflictError);
  });

  it('does not fall back to unsafe order insertion if uniqueness is unavailable', async () => {
    const create = vi.fn(async () => ({ id: 'should-never-exist' }));
    const collection = {
      createIndex: vi.fn(async () => { throw new Error('index unavailable'); }),
      findOne: vi.fn(async () => null),
    };
    await expect(createOrReuseCheckoutOrder({
      collection, key: '00000000-0000-4000-8000-000000000003',
      fingerprint: 'payload', create, existingResponse: (order: any) => order,
    })).rejects.toThrow('index unavailable');
    expect(create).not.toHaveBeenCalled();
  });

  it('allows a genuinely distinct checkout intent to create a new order', async () => {
    const { collection, rows, make } = fakeOrders();
    for (const key of ['different-order-1', 'different-order-2']) {
      await createOrReuseCheckoutOrder({
        collection, key, fingerprint: key, create: make(key, key),
        existingResponse: (order: any) => order,
      });
    }
    expect(rows.size).toBe(2);
  });
});
