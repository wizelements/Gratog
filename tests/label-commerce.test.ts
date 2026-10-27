import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/storefront-products', () => ({ getStorefrontCatalogSnapshot: async () => ({ products: [] }) }));
import { LABEL_QUANTITY_MAX, normalizeLabelQuantity, resolveLabelProductFromCatalog } from '@/lib/label-commerce';

const live = {
  id: 'KZXEV24XZ2UCQUJ64BH7ZUJP', slug: 'strawberry-bliss', name: 'Strawberry Bliss',
  category: 'lemonades', price: 11.99, priceCents: 1199, stock: 4, currentStock: 4,
  checkoutReady: true, inStock: true, size: '16oz bottle', ingredients: [{ name: 'Strawberry' }],
  source: 'square_sync', variationId: 'HYODQWXIJJVAPRIZ66SVUYE5',
  variations: [{ id: 'HYODQWXIJJVAPRIZ66SVUYE5', name: '16oz', priceCents: 1199 }],
};

describe('labels discover products through canonical checkout', () => {
  it('preserves verified product identity and price without authorizing a standalone payment', () => {
    const result = resolveLabelProductFromCatalog('strawberry-bliss', [live]);
    expect(result.payable).toBe(false);
    expect(result.productPath).toBe('/product/strawberry-bliss');
    expect(result.product?.priceVerified).toBe(true);
    expect(result.product?.priceCents).toBe(1199);
    expect(result.product?.squareVariationId).toBe('HYODQWXIJJVAPRIZ66SVUYE5');
  });

  it('does not convert seasonal curated copy into a price or payment path', () => {
    const result = resolveLabelProductFromCatalog('vitamin-sea', []);
    expect(result.payable).toBe(false);
    expect(result.product?.priceVerified).toBe(false);
    expect(result.product?.priceCents).toBeNull();
    expect(result.productPath).toBe('/product/vitamin-sea');
  });

  it.each([0, -1, null, undefined])('does not quote inventory that is unavailable or unknown: %s', stock => {
    const result = resolveLabelProductFromCatalog('strawberry-bliss', [{ ...live, stock, currentStock: stock }]);
    expect(result.product?.priceVerified).toBe(false);
    expect(result.product?.priceCents).toBeNull();
    expect(result.payable).toBe(false);
  });

  it('rejects conflicting product identities instead of picking a similar name', () => {
    expect(resolveLabelProductFromCatalog('strawberry-bliss', [live, { ...live, id: 'different-item' }]))
      .toMatchObject({ payable: false, productPath: null, reason: 'identity_unverified' });
    expect(resolveLabelProductFromCatalog('pineapple-mango', [{
      ...live, id: 'F2YVC7OVRYJU575JXROKFHFT', name: 'Pineapple Mango Lemonade', slug: 'pineapple-mango-lemonade',
    }])).toMatchObject({ payable: false, productPath: null, reason: 'identity_unverified' });
  });

  it('refuses archived generic product purchase paths', () => {
    expect(resolveLabelProductFromCatalog('boba', []))
      .toMatchObject({ payable: false, productPath: null, reason: 'inactive' });
  });

  it('preserves bounded quantities for legacy consumers without creating an order', () => {
    expect(normalizeLabelQuantity('0')).toBe(1);
    expect(normalizeLabelQuantity('3')).toBe(3);
    expect(normalizeLabelQuantity('99')).toBe(LABEL_QUANTITY_MAX);
    expect(normalizeLabelQuantity('junk')).toBe(1);
  });
});
