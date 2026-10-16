import { describe, expect, it } from 'vitest';
import { prepareLiveStorefrontProducts } from '../lib/storefront-catalog-eligibility';
import { validateStorefrontProducts } from '../lib/storefront-integrity';

describe('live storefront reconciliation before strict validation', () => {
  const squareProduct = {
    id: 'sq-live-strawberry',
    slug: 'strawberry-bliss',
    source: 'square_sync',
    name: 'Strawberry Bliss',
    price: 11.99,
    priceCents: 1199,
    description: '',
    benefitStory: '',
    ingredients: [],
    variations: [{ id: 'sq-variant-live', name: '16oz', price: 11.99, priceCents: 1199 }],
    variationId: 'sq-variant-live',
    checkoutReady: true,
    stock: 8,
    inStock: true,
  };

  it('enriches known Square merchandise from approved recipes before rejecting missing metadata', () => {
    expect(validateStorefrontProducts([squareProduct]).invalidReports).toHaveLength(1);
    const prepared = prepareLiveStorefrontProducts([squareProduct]);
    const validated = validateStorefrontProducts(prepared);
    expect(validated.invalidReports).toHaveLength(0);
    expect(validated.validProducts).toHaveLength(1);
    expect(validated.validProducts[0].id).toBe('sq-live-strawberry');
    expect(validated.validProducts[0].price).toBe(11.99);
    expect(validated.validProducts[0].variationId).toBe('sq-variant-live');
    expect(validated.validProducts[0].checkoutReady).toBe(true);
    expect(validated.validProducts[0].stock).toBe(8);
    expect(validated.validProducts[0].ingredients.length).toBeGreaterThan(0);
    expect(validated.validProducts[0].description.length).toBeGreaterThan(18);
  });

  it('never manufactures sellable metadata for unknown Square merchandise', () => {
    const unknown = {
      id: 'sq-not-curated',
      source: 'square_sync',
      name: 'Unknown Experimental Item',
      price: 0,
      variations: [],
      ingredients: [],
      description: '',
      benefitStory: '',
      checkoutReady: false,
    };
    const validated = validateStorefrontProducts(prepareLiveStorefrontProducts([unknown]));
    expect(validated.validProducts).toHaveLength(0);
    expect(validated.invalidReports).toHaveLength(1);
    expect(validated.invalidReports[0].errors).toContain('Missing positive product price');
    expect(validated.invalidReports[0].errors).toContain('Missing canonical ingredients');
  });

  it('does not publish inactive, sold-out or disabled weekly products', () => {
    const products = [
      { ...squareProduct, id: 'a', weeklyStatus: 'inactive' },
      { ...squareProduct, id: 'b', inventoryStatus: 'sold_out' },
      { ...squareProduct, id: 'c', activeWeeklyMenu: false },
    ];
    expect(prepareLiveStorefrontProducts(products)).toHaveLength(0);
  });

  it('rejects malformed records without breaking catalog bootstrap', () => {
    expect(prepareLiveStorefrontProducts([null, undefined, '', 0])).toEqual([]);
  });
});
