import { describe, expect, it } from 'vitest';
import { applyInventorySnapshot } from '@/lib/custom-inventory';
import { normalizeProduct } from '@/lib/cart-engine';

const db = {
  collection: () => ({
    find: () => ({
      project: () => ({
        toArray: async () => [
          { productId: 'OUT', currentStock: 0 },
          { productId: 'OPTIN', currentStock: -2 },
          { productId: 'READY', currentStock: 3 },
        ],
      }),
    }),
  }),
};

describe('merchant-controlled preorders', () => {
  it('shows a sold-out item as unavailable instead of accepting an unapproved preorder', async () => {
    const [item] = await applyInventorySnapshot(db, [{ id: 'OUT', name: 'Unavailable', inStock: false }]);
    expect(item.isPreorder).toBe(false);
    expect(item.purchaseStatus).toBe('out_of_stock');
    expect(normalizeProduct(item).isPreorder).toBe(false);
  });

  it('keeps an explicit market preorder available even when physical stock is depleted', async () => {
    const [item] = await applyInventorySnapshot(db, [{ id: 'OPTIN', name: 'Reserved', preorderOnly: true }]);
    expect(item.isPreorder).toBe(true);
    expect(item.purchaseStatus).toBe('preorder');
    expect(normalizeProduct(item).isPreorder).toBe(true);
  });

  it('keeps normal in-stock items outside market pickup restrictions', async () => {
    const [item] = await applyInventorySnapshot(db, [{ id: 'READY', name: 'Available' }]);
    expect(item.isPreorder).toBe(false);
    expect(item.purchaseStatus).toBe('in_stock');
  });

  it('does not pretend a catalog-only in-stock flag is verified inventory', async () => {
    const emptyDb = { collection: () => ({ find: () => ({ project: () => ({ toArray: async () => [] }) }) }) };
    const [item] = await applyInventorySnapshot(emptyDb, [{
      id: 'UNVERIFIED', name: 'Unverified', inStock: true, checkoutReady: true, price: 12,
    }]);
    expect(item.checkoutReady).toBe(false);
    expect(item.inStock).toBe(false);
    expect(item.stock).toBe(null);
    expect(item.purchaseStatus).toBe('unknown');
    expect(item.checkoutUnavailableReason).toMatch(/confirmed|verified/i);
  });

  it('does not convert a missing-inventory sold-out item into an automatic preorder', async () => {
    const emptyDb = { collection: () => ({ find: () => ({ project: () => ({ toArray: async () => [] }) }) }) };
    const [item] = await applyInventorySnapshot(emptyDb, [{ id: 'MISSING', name: 'Unavailable', inStock: false }]);
    expect(item.isPreorder).toBe(false);
    expect(item.purchaseStatus).toBe('out_of_stock');
  });
});
