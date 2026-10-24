import { describe, expect, it } from 'vitest';
import { calculateLemonadePackDiscount, isApprovedLemonadeLine, LEMONADE_PACKS } from '@/lib/lemonade-packs';
import { computeTotals } from '@/adapters/totalsAdapter';

const bottle = (name = 'Strawberry Bliss', quantity = 1, extras = {}) => ({
  name, category: 'lemonades', unitPriceCents: 1199, price: 11.99, priceCents: 1199,
  subtitle: '16oz bottle', variantLabel: '16oz bottle', quantity, ...extras,
});

describe('approved lemonade-only four- and six-pack policy', () => {
  it('makes the exact owner-approved pack amounts in cents', () => {
    expect(LEMONADE_PACKS.map(x => x.priceCents)).toEqual([4399, 6299]);
    expect(LEMONADE_PACKS.map(x => x.savingsCents)).toEqual([397, 895]);
  });
  it.each([
    [4, 397, 1, 0], [5, 397, 1, 0], [6, 895, 0, 1],
    [7, 895, 0, 1], [8, 895, 0, 1], [10, 1292, 1, 1],
    [12, 1790, 0, 2], [14, 1790, 0, 2],
  ])('optimizes %i qualified bottles without inventing 5-packs', (n, discount, four, six) => {
    expect(calculateLemonadePackDiscount([bottle('Strawberry Bliss', n)])).toMatchObject({
      discountCents: discount, fourPacks: four, sixPacks: six,
    });
  });
  it('allows mix and match, including repeats', () => {
    expect(calculateLemonadePackDiscount([
      bottle('Strawberry Bliss', 2), bottle('Calm Waters'), bottle('Supplemint'),
    ]).discountCents).toBe(397);
  });
  it('excludes gels, shots, juices, unknown flavors and unapproved sizes and prices', () => {
    const excluded = [
      bottle('APG', 6, { category: 'juices' }),
      bottle('Blue Lotus Gel', 6, { category: 'gels' }),
      bottle('Elderberry Ginger Shot', 6, { category: 'shots' }),
      bottle('Unknown Lemonade', 6),
      bottle('Strawberry Bliss', 6, { unitPriceCents: 1000, priceCents: 1000, price: 10 }),
      bottle('Strawberry Bliss', 6, { subtitle: '1 gallon', variantLabel: '1 gallon' }),
    ];
    excluded.forEach(line => expect(isApprovedLemonadeLine(line)).toBe(false));
    expect(calculateLemonadePackDiscount(excluded).discountCents).toBe(0);
  });
  it('does not let unrelated items complete a four-pack', () => {
    expect(calculateLemonadePackDiscount([
      bottle('Strawberry Bliss', 3),
      bottle('Blue Lotus Gel', 1, { price: 36, priceCents: 3600, unitPriceCents: 3600 }),
    ]).discountCents).toBe(0);
  });
  it('client totals show the same pack price and choose one best discount (no stacking)', () => {
    const cart = Array.from({ length: 6 }, (_, i) => ({
      ...bottle('Strawberry Bliss'), id: String(i),
    })) as any;
    const result = computeTotals({ cart, fulfillmentType: 'pickup' });
    expect(result.subtotal).toBeCloseTo(71.94);
    expect(result.lemonadePackDiscount).toBeCloseTo(8.95);
    expect(result.total).toBeCloseTo(62.99);
    const biggerCoupon = computeTotals({ cart, fulfillmentType: 'pickup', couponDiscount: 10 });
    expect(biggerCoupon.lemonadePackDiscount).toBe(0);
    expect(biggerCoupon.total).toBeCloseTo(61.94);
  });
});
