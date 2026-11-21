import { describe, expect, it } from 'vitest';
import { listAvailableLemonadeBundleChoices, quoteLemonadeBundle } from '@/lib/preorder/lemonade-bundle-offers';

const flavors = [
  'strawberry-bliss',
  'pineapple-mango',
  'pineapple-basil',
  'calm-waters',
  'supplemint',
  'gracious-roots',
];

const catalog = flavors.map((slug, index) => ({
  id: `server-id-${index}`,
  name: slug.replace(/-/g, ' '),
  slug,
  price: 11.99,
  priceCents: 1199,
  variationId: `square-variation-${index}`,
  inStock: true,
}));

describe('proposed lemonade bundle quotes (isolated from checkout)', () => {
  it('quotes a four-pack at $42 with $5.96 of actual savings', () => {
    const result = quoteLemonadeBundle(4, catalog.slice(0, 4).map(p => p.id), catalog);
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.quote.priceCents).toBe(4200);
    expect(result.quote.regularTotalCents).toBe(4796);
    expect(result.quote.savingsCents).toBe(596);
    expect(result.quote.items.map(p => p.unitPriceCents)).toEqual([1050, 1050, 1050, 1050]);
  });

  it('quotes a six-pack at $60 with six distinct flavors', () => {
    const result = quoteLemonadeBundle(6, catalog.map(p => p.id), catalog);
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.quote.priceCents).toBe(6000);
    expect(result.quote.regularTotalCents).toBe(7194);
    expect(result.quote.savingsCents).toBe(1194);
    expect(new Set(result.quote.items.map(p => p.canonicalFlavor)).size).toBe(6);
  });

  it('blocks duplicate IDs even if the requested quantity is right', () => {
    const ids = [catalog[0].id, catalog[0].id, catalog[2].id, catalog[3].id];
    expect(quoteLemonadeBundle(4, ids, catalog)).toMatchObject({ valid: false, code: 'BUNDLE_DUPLICATE' });
  });

  it('blocks duplicate flavors across separate catalog aliases', () => {
    const aliases = [...catalog, { ...catalog[1], id: 'second-id', slug: 'pineapple-mango-lemonade' }];
    const ids = [catalog[1].id, 'second-id', catalog[2].id, catalog[3].id];
    expect(quoteLemonadeBundle(4, ids, aliases)).toMatchObject({ valid: false, code: 'BUNDLE_DUPLICATE' });
  });

  it('rejects APG ($12.99), gels, unsupported sizes and client-invented IDs', () => {
    const apg = { ...catalog[0], id: 'apg-id', slug: 'apg', price: 12.99, priceCents: 1299 };
    expect(quoteLemonadeBundle(4, [apg.id, ...catalog.slice(1, 4).map(p=>p.id)], [...catalog, apg]))
      .toMatchObject({ valid: false, code: 'BUNDLE_ITEM_INELIGIBLE' });
    expect(quoteLemonadeBundle(4, ['client-supplied-id', ...catalog.slice(1, 4).map(p=>p.id)], catalog))
      .toMatchObject({ valid: false, code: 'BUNDLE_ITEM_UNAVAILABLE' });
  });

  it('rejects unavailable, stale-price and unpublished catalog items', () => {
    const ids = catalog.slice(0, 4).map(p => p.id);
    expect(quoteLemonadeBundle(4, ids, [{ ...catalog[0], checkoutReady: false }, ...catalog.slice(1)]))
      .toMatchObject({ valid: false, code: 'BUNDLE_ITEM_UNAVAILABLE' });
    expect(quoteLemonadeBundle(4, ids, [{ ...catalog[0], price: 10, priceCents: 1000 }, ...catalog.slice(1)]))
      .toMatchObject({ valid: false, code: 'BUNDLE_ITEM_INELIGIBLE' });
  });

  it('requires merchant-approved active made-to-order status when stock is zero', () => {
    const ids = catalog.slice(0,4).map(p=>p.id);
    expect(quoteLemonadeBundle(4, ids, [{ ...catalog[0], inStock: false }, ...catalog.slice(1)]))
      .toMatchObject({ valid: false, code: 'BUNDLE_ITEM_UNAVAILABLE' });
    expect(quoteLemonadeBundle(4, ids, [{
      ...catalog[0], inStock: false, preorderOnly: true,
      activeWeeklyMenu: true, weeklyStatus: 'active',
    }, ...catalog.slice(1)])).toMatchObject({ valid: true });
  });

  it('does not enable a bundle with fewer than the required distinct selections', () => {
    expect(quoteLemonadeBundle(6, catalog.slice(0,4).map(p=>p.id), catalog))
      .toMatchObject({ valid: false, code: 'BUNDLE_SELECTION_INVALID' });
    expect(quoteLemonadeBundle('4', catalog.slice(0,4).map(p=>p.id), catalog))
      .toMatchObject({ valid: false, code: 'BUNDLE_SIZE_INVALID' });
  });

  it('lists only unique eligible in-stock flavors for the visual builder', () => {
    const aliases = [
      ...catalog,
      { ...catalog[1], id: 'duplicate-pineapple-mango', slug: 'pineapple-mango-lemonade' },
      { ...catalog[2], id: 'sold-out', inStock: false },
      { ...catalog[3], id: 'wrong-price', price: 9.99, priceCents: 999 },
    ];
    const choices = listAvailableLemonadeBundleChoices(aliases);
    expect(choices).toHaveLength(6);
    expect(choices.map(p => p.id)).toEqual(catalog.map(p => p.id));
  });

  it('fails closed when the storefront catalog is missing', () => {
    expect(listAvailableLemonadeBundleChoices(null as any)).toEqual([]);
    expect(quoteLemonadeBundle(4, catalog.slice(0, 4).map(p => p.id), null as any))
      .toMatchObject({ valid: false, code: 'CATALOG_UNAVAILABLE' });
  });
});
