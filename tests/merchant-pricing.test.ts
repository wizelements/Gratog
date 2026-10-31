import { describe, expect, it } from 'vitest';
import {
  approvedUnitPriceCents,
  applyMerchantPrice,
  findApprovedOrderPriceMismatch,
} from '@/lib/merchant-pricing';

describe('merchant-approved pricing cannot regress', () => {
  it.each([
    ['Strawberry Bliss', 1199],
    ['Supplemint', 1199],
    ['Calm Waters', 1199],
    ['Pineapple Mango', 1199],
    ['Pineapple Mango Lemonade', 1199],
    ['Pineapple Basil', 1199],
    ['Strawberry Rita', 1199],
    ['Blue Lotus', 3600],
    ['APG', 1299],
    ['Always Pursue Gratitude', 1299],
    ['Herbal Vibe', 1599],
    ['Herbal Vibes', 1599],
    ['Elderberry Apple Gel', 3600],
    ['Floral Tide Gel', 3600],
    ['Soursop Chai Gel', 3600],
  ])('%s is priced in integer cents: %i', (name, cents) => {
    expect(approvedUnitPriceCents({ name })).toBe(cents);
  });

  it('never overrides unknown merchandise by fuzzy naming', () => {
    expect(approvedUnitPriceCents({ name: 'Strawberry Bliss Gift Basket' })).toBeNull();
    expect(applyMerchantPrice({ name: 'Custom Gift', price: 19.5 })).toEqual({ name: 'Custom Gift', price: 19.5 });
  });

  it('corrects stale listing, variant and priceCents together', () => {
    expect(applyMerchantPrice({
      id: 'strawberry-bliss', name: 'Strawberry Bliss', price: 10, priceCents: 1000,
      variations: [{ id: 'standard', name: '16oz bottle', price: 10, priceCents: 1000 }],
    })).toMatchObject({
      price: 11.99, priceCents: 1199,
      variations: [{ id: 'standard', price: 11.99, priceCents: 1199 }],
    });
  });

  it('never advertises retired 2oz Blue Lotus variations', () => {
    const item = applyMerchantPrice({
      id: 'DSROEB4HMZK63V7IGBH6SSJH', name: 'Blue Lotus', price: 35, priceCents: 3500,
      variations: [
        { id: 'old', name: '2oz sample', priceCents: 1100 },
        { id: 'approved', name: '16oz jar', priceCents: 3500 },
      ],
    });
    expect(item.variations).toHaveLength(1);
    expect(item.variations[0]).toMatchObject({ id: 'approved', priceCents: 3600 });
    expect(item.priceCents).toBe(3600);
  });

  it('blocks legacy orders even when stored subtotal and total appear consistent', () => {
    expect(findApprovedOrderPriceMismatch([
      { id: 'strawberry-bliss', name: 'Strawberry Bliss', priceCents: 1000, quantity: 1 },
    ])).toMatchObject({ expectedCents: 1199, actualCents: 1000 });
    expect(findApprovedOrderPriceMismatch([
      { id: 'strawberry-bliss', name: 'Strawberry Bliss', priceCents: 1199, quantity: 1, size: '16oz' },
    ])).toBeNull();
  });

  it('preorder cannot substitute the full-jar price for a default 2oz sample', async () => {
    const { readFileSync } = await import('node:fs');
    const source = readFileSync('app/api/preorder/route.ts', 'utf8');
    expect(source).toContain('const authorizedPrice = sampleGel ? variantPrice');
    expect(source).toContain('the sample size has no verified price');
  });

  it('rejects an obsolete Blue Lotus size even when its price equals $36', () => {
    expect(findApprovedOrderPriceMismatch([
      { id: 'DSROEB4HMZK63V7IGBH6SSJH', name: 'Blue Lotus', priceCents: 3600, size: '2oz sample' },
    ])).toMatchObject({ expectedCents: 3600 });
  });
});
