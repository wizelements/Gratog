import { describe, expect, it } from 'vitest';
import {
  getProductBySlugOrId,
  getCuratedStorefrontProducts,
  mergeWithCuratedProduct,
} from '@/data/products';
import { standardGallonPriceCents } from '@/lib/batches/pricing';

describe('merchant-approved product truth — 11 October 2026', () => {
  it('Calm Waters never implies cucumber or mint and uses the disclosed Square recipe', () => {
    const item = getProductBySlugOrId('calm-waters');
    expect(item).toBeTruthy();
    const all = [
      ...(item?.ingredients || []),
      item?.shortDescription,
      item?.fullDescription,
      item?.flavorNotes,
      item?.seoTitle,
      item?.seoDescription,
      ...(item?.tags || []),
    ].join(' ').toLowerCase();
    expect(all).not.toMatch(/\bcucumber\b|\bmint\b/);
    for (const ingredient of ['Blue Spirulina', 'Lemon', 'Ashwagandha', 'Celtic Salt', 'Agave']) {
      expect(item?.ingredients).toContain(ingredient);
    }
    expect(item?.price).toBe(11.99);
  });

  it('Strawberry Bliss is always $11.99, including custom gallon calculation', () => {
    const item = getProductBySlugOrId('strawberry-bliss');
    expect(item?.price).toBe(11.99);
    expect(standardGallonPriceCents('strawberry-bliss')).toBe(9592);
  });

  it('curated Blue Lotus gel offers one 16oz SKU at $36 without samples', () => {
    const item = getProductBySlugOrId('blue-lotus-gel');
    expect(item?.sizes).toEqual(['16oz jar']);
    expect(item?.price).toBe(36);
    const storefront = getCuratedStorefrontProducts().find(x => x.slug === 'blue-lotus-gel');
    expect(storefront?.variations).toHaveLength(1);
    expect(storefront?.variations[0].priceCents).toBe(3600);
  });

  it('merges an old Blue Lotus Square record into the approved 16oz variant', () => {
    const live = mergeWithCuratedProduct({
      id: 'DSROEB4HMZK63V7IGBH6SSJH',
      name: 'Blue Lotus',
      slug: 'blue-lotus',
      source: 'square_sync',
      price: 35,
      priceCents: 3500,
      variationId: 'obsolete-2oz',
      catalogObjectId: 'obsolete-2oz',
      variations: [
        { id: 'obsolete-2oz', name: '2oz sample', priceCents: 1100 },
        { id: 'QIX6D5PRQKX4TKEMTQUJPZUX', name: '16oz', priceCents: 3600 },
      ],
      checkoutReady: true,
      stock: 2,
    });
    expect(live.curatedProductId).toBe('blue-lotus-gel');
    expect(live.slug).toBe('blue-lotus');
    expect(live.variations).toEqual([{ id: 'QIX6D5PRQKX4TKEMTQUJPZUX', name: '16oz', priceCents: 3600 }]);
    expect(live.price).toBe(36);
    expect(live.priceCents).toBe(3600);
    expect(live.variationId).toBe('QIX6D5PRQKX4TKEMTQUJPZUX');
    expect(live.catalogObjectId).toBe('QIX6D5PRQKX4TKEMTQUJPZUX');
    expect(live.checkoutReady).toBe(true);
  });

  it('refuses purchase when Square lacks an approved 16oz variant', () => {
    const live = mergeWithCuratedProduct({
      id: 'DSROEB4HMZK63V7IGBH6SSJH', name: 'Blue Lotus', slug: 'blue-lotus',
      source: 'square_sync', variationId: 'obsolete-2oz',
      variations: [{ id: 'obsolete-2oz', name: '2oz sample', priceCents: 1100 }],
      checkoutReady: true,
    });
    expect(live.variations).toHaveLength(0);
    expect(live.checkoutReady).toBe(false);
  });
});
