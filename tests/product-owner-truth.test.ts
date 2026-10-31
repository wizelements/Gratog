import { describe, expect, it } from 'vitest';
import {
  getProductBySlugOrId,
  getCuratedStorefrontProducts,
  toStorefrontProduct,
  mergeWithCuratedProduct,
} from '@/data/products';
import { standardGallonPriceCents } from '@/lib/batches/pricing';

describe('merchant-approved product truth — 11 October 2026', () => {
  it('lists all six approved current lemonades, including Gracious Roots, Melon Rita and Passion Guava', () => {
    const names = getCuratedStorefrontProducts()
      .filter(item => item.category === 'lemonades')
      .map(item => item.name);
    for (const name of [
      'Calm Waters', 'Supplemint', 'Gracious Roots', 'Kissed by Gods',
      'Melon Rita', 'Passion Guava Pineapple Lemonade',
    ]) expect(names).toContain(name);
    for (const retired of ['Peach Lemonade', 'Black Minerals', 'Strawberry Bliss']) {
      expect(names).not.toContain(retired);
    }
  });

  it('requires real stock evidence before describing a curated item as purchasable', () => {
    for (const slug of ['gracious-roots', 'melon-rita', 'passion-guava-pineapple']) {
      const product = getProductBySlugOrId(slug);
      expect(product?.price).toBe(11.99);
      expect(product?.sizes).toEqual(['16oz bottle']);
      const rendered = toStorefrontProduct(product!);
      expect(rendered.stock).toBeNull();
      expect(rendered.inStock).toBe(false);
      expect(rendered.inventoryVerified).toBe(false);
      expect(rendered.checkoutReady).toBe(false);
      expect(rendered.variations[0].id).toMatch(/^tog-/);
    }
  });

  it('keeps Passion Guava Pineapple free of sea moss and ginger, unlike the other lemonade blends', () => {
    const passion = getProductBySlugOrId('passion-guava-pineapple');
    expect(passion?.ingredients).toEqual([
      'Passion Fruit', 'Guava', 'Pineapple', 'Lemon', 'Agave', 'Alkaline Water',
    ]);
    const combined = (passion?.ingredients || []).join(' ').toLowerCase();
    expect(combined).not.toContain('ginger');
    expect(combined).not.toContain('sea moss');
  });

  it('excludes the known duplicate Calm Waters Square object from direct storefront feed', async () => {
    const { readFileSync } = await import('node:fs');
    const direct = readFileSync('app/api/storefront/square-catalog/route.ts', 'utf8');
    expect(direct).toContain("item.id !== 'NOD76PUJZP7QRJ2YTHY7S3K5'");
    const edge = readFileSync('lib/square-api-edge.ts', 'utf8');
    expect(edge).toContain("obj.id !== LEGACY_DUPLICATE_CALM_WATERS_ID");
  });

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
    // Historical approved size/price remains intact, but Blue Lotus is not
    // on the six-lemonade + Soursop Chai current ordering menu.
    expect(getCuratedStorefrontProducts().some(x => x.slug === 'blue-lotus-gel')).toBe(false);
    const storefront = toStorefrontProduct(item!, 0);
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
        { id: 'approved-16oz', name: '16oz', priceCents: 3600 },
      ],
      checkoutReady: true,
    });
    expect(live.curatedProductId).toBe('blue-lotus-gel');
    expect(live.slug).toBe('blue-lotus');
    expect(live.variations).toEqual([{ id: 'approved-16oz', name: '16oz', priceCents: 3600 }]);
    expect(live.price).toBe(36);
    expect(live.priceCents).toBe(3600);
    expect(live.variationId).toBe('approved-16oz');
    expect(live.catalogObjectId).toBe('approved-16oz');
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
