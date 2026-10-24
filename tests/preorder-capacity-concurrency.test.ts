import { describe, expect, it, vi } from 'vitest';
import {
  expandCapacityDemand, pickupDateKey, capacityKey, CapacityError,
  createCapacityBoundPreorder, releaseCapacityAfterDefinitiveLinkFailure,
  fingerprintPreorder, type BundleRecipe,
} from '@/lib/preorder/capacity';

function testDatabase(limitUnits: number, otherSkuLimit = limitUnits) {
  const dateKey = '2026-10-26';
  const capacities = new Map([
    [capacityKey('market1', dateKey, 'strawberry'), {
      marketId: 'market1', dateKey, sku: 'strawberry', active: true, limitUnits, heldUnits: 0 }],
    [capacityKey('market1', dateKey, 'pineapple'), {
      marketId: 'market1', dateKey, sku: 'pineapple', active: true,
      limitUnits: otherSkuLimit, heldUnits: 0 }],
  ]);
  let counter = 0;
  let rows = new Map<string, any>();
  const state = () => ({
    strawberry: capacities.get(capacityKey('market1', dateKey, 'strawberry'))?.heldUnits,
    pineapple: capacities.get(capacityKey('market1', dateKey, 'pineapple'))?.heldUnits,
    counter, orders: rows.size,
  });
  // Faithful model of a serialized Mongo transaction. Concurrency correctness
  // against an ACTUAL replica set remains a separate deployment gate.
  let queue: Promise<void> = Promise.resolve();
  const db = {
    collection: (name: string) => {
      if (name === 'marketorders') return {
        indexExists: async () => true,
        findOne: async (filter: any) => [...rows.values()].find(order =>
          (filter.checkoutRequestId
            ? order.checkoutRequestId === filter.checkoutRequestId
            : order.orderNumber === filter.orderNumber) &&
          (!filter.paymentStatus || order.paymentStatus === filter.paymentStatus) &&
          (!filter.capacityReservationStatus || order.capacityReservationStatus === filter.capacityReservationStatus) &&
          (!filter.paymentLinkId || (!order.paymentLinkId && filter.paymentLinkId.$in.includes(null)))) || null,
        insertOne: async (order: any) => {
          if (rows.has(order.checkoutRequestId)) throw Object.assign(new Error('duplicate'), { code: 11000 });
          rows.set(order.checkoutRequestId, { ...order, _id: order.checkoutRequestId });
          return { insertedId: order.checkoutRequestId };
        },
        updateOne: async (filter: any, update: any) => {
          const existing = [...rows.values()].find(o => o._id === filter._id &&
            o.paymentStatus === filter.paymentStatus &&
            o.capacityReservationStatus === filter.capacityReservationStatus);
          if (!existing) return { modifiedCount: 0 };
          Object.assign(existing, update.$set);
          return { modifiedCount: 1 };
        },
      };
      if (name === 'preorder_capacity') return {
        findOneAndUpdate: async (filter: any, update: any) => {
          const row = capacities.get(filter._id);
          if (!row || !row.active || row.limitUnits - row.heldUnits < update.$inc.heldUnits) return null;
          row.heldUnits += update.$inc.heldUnits;
          return row;
        },
        updateOne: async (filter: any, update: any) => {
          const row = capacities.get(filter._id);
          if (!row || row.heldUnits < filter.heldUnits.$gte) return { modifiedCount: 0 };
          row.heldUnits += update.$inc.heldUnits;
          return { modifiedCount: 1 };
        },
      };
      if (name === 'market_counters') return {
        findOneAndUpdate: async () => ({ seq: ++counter }),
      };
      throw new Error('Unknown collection ' + name);
    },
  };
  const client = {
    startSession: () => ({
      withTransaction: async (fn: () => Promise<void>) => {
        const prev = queue;
        let unblock!: () => void;
        queue = new Promise<void>(resolve => { unblock = resolve; });
        await prev;
        const capacityBefore = structuredClone([...capacities]);
        const orderBefore = structuredClone([...rows]);
        const counterBefore = counter;
        try { await fn(); } catch (err) {
          capacities.clear();
          for (const [k, value] of capacityBefore) capacities.set(k, value);
          rows = new Map(orderBefore);
          counter = counterBefore;
          throw err;
        } finally { unblock(); }
      },
      endSession: vi.fn(),
    }),
  };
  return { db: db as any, client: client as any, state, rows };
}

function request(db: any, client: any, suffix: string, demand = [{ sku: 'strawberry', quantity: 1 }]) {
  const fingerprint = fingerprintPreorder('market1', '2026-10-26', demand);
  return createCapacityBoundPreorder({
    db, client, marketId: 'market1', dateKey: '2026-10-26',
    prefix: 'M', checkoutRequestId: 'checkout-request-' + suffix,
    order: {
      orderNumber: 'PRE-ORDER-' + suffix,
      marketId: 'market1', paymentStatus: 'PENDING',
      preorderFingerprint: fingerprint, total: 11.99, totalCents: 1199,
    },
    demand,
  });
}

describe('merchant-bounded preorder capacity', () => {
  it('uses the New York local market day rather than UTC midnight', () => {
    expect(pickupDateKey(new Date('2026-10-27T02:00:00Z'))).toBe('2026-10-26');
  });

  it('expands bundle recipes and combines overlapping ingredients', () => {
    const recipes = new Map<string, BundleRecipe>([['gratitude-trio', {
      sku: 'gratitude-trio', active: true,
      components: [{ sku: 'strawberry', quantity: 2 }, { sku: 'pineapple', quantity: 1 }],
    }]]);
    const demand = expandCapacityDemand([
      { sku: 'gratitude-trio', quantity: 2, isBundle: true },
      { sku: 'strawberry', quantity: 3 },
    ], recipes);
    expect(demand).toEqual([
      { sku: 'pineapple', quantity: 2 }, { sku: 'strawberry', quantity: 7 },
    ]);
  });

  it('never trusts unapproved bundle recipes or fractional client quantities', () => {
    expect(() => expandCapacityDemand([{ sku: 'gratitude-trio', quantity: 1, isBundle: true }]))
      .toThrow('Bundle components have not been approved');
    expect(() => expandCapacityDemand([{ sku: 'strawberry', quantity: 1.2 }]))
      .toThrow('Invalid quantity');
  });

  it('admitting 1,000 simultaneous unique checkout requests never exceeds 125 committed units', async () => {
    const { db, client, state } = testDatabase(125);
    const result = await Promise.allSettled(
      Array.from({ length: 1000 }, (_, index) => request(db, client, String(index).padStart(5, '0')))
    );
    expect(result.filter(x => x.status === 'fulfilled')).toHaveLength(125);
    expect(result.filter(x => x.status === 'rejected')).toHaveLength(875);
    expect(state()).toMatchObject({ strawberry: 125, orders: 125, counter: 125 });
    expect(result.filter(x => x.status === 'rejected').every(x =>
      (x as PromiseRejectedResult).reason instanceof CapacityError)).toBe(true);
  });

  it('rejects a two-component bundle with insufficient second SKU, leaving zero held units', async () => {
    const { db, client, state } = testDatabase(100, 0);
    await expect(request(db, client, 'bundle-0001', [
      { sku: 'strawberry', quantity: 2 },
      { sku: 'pineapple', quantity: 1 },
    ])).rejects.toMatchObject({ code: 'PREORDER_CAPACITY_UNAVAILABLE' });
    expect(state()).toMatchObject({ strawberry: 0, pineapple: 0, orders: 0, counter: 0 });
  });

  it('repeated checkout IDs return the same order and do not reserve inventory twice', async () => {
    const { db, client, state } = testDatabase(2);
    const first = await request(db, client, 'repeat-12345');
    const second = await request(db, client, 'repeat-12345');
    expect(first.preorder.orderNumber).toBe(second.preorder.orderNumber);
    expect(second.replay).toBe(true);
    expect(state()).toMatchObject({ strawberry: 1, orders: 1, counter: 1 });
  });

  it('releases only a definitively failed, unpayable payment attempt once', async () => {
    const { db, client, state, rows } = testDatabase(2);
    const order = await request(db, client, 'failure-12345');
    expect(await releaseCapacityAfterDefinitiveLinkFailure(db, client, order.preorder.orderNumber))
      .toBe(true);
    expect(await releaseCapacityAfterDefinitiveLinkFailure(db, client, order.preorder.orderNumber))
      .toBe(false);
    expect(state()).toMatchObject({ strawberry: 0, orders: 1 });
    const changed = [...rows.values()][0];
    expect(changed.paymentStatus).toBe('FAILED');
    expect(changed.capacityReservationStatus).toBe('released');
  });
});
