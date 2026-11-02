import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/product-sync-engine', () => ({
  getUnifiedProducts: async () => [],
}));

import { getStorefrontCatalogSnapshot } from '@/lib/storefront-products';

describe('public catalog when authoritative product inventory is absent', () => {
  it('does not present a curated display product as sellable or in-stock', async () => {
    const result = await getStorefrontCatalogSnapshot({});
    expect(result.products.length).toBeGreaterThan(0);
    for (const product of result.products) {
      expect(product.checkoutReady, product.name).toBe(false);
      expect(product.inStock, product.name).toBe(false);
      expect(product.purchaseStatus, product.name).toBe('unknown');
      expect(product.currentStock, product.name).toBeNull();
    }
  });
});
