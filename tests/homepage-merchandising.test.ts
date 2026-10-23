import { describe, expect, it } from 'vitest';
import { selectHomepageCheckoutProducts } from '@/lib/homepage-merchandising';

const product = (variationId: string, override = {}) => ({
  id: variationId,
  name: variationId,
  price: 11.99,
  variationId,
  checkoutReady: true,
  available: true,
  ...override,
});

describe('homepage merchant product safety', () => {
  it('does not turn a demo or curated fallback into a purchasable homepage card', () => {
    expect(selectHomepageCheckoutProducts({ isFallback: true, products: [product('x')] })).toEqual([]);
    expect(selectHomepageCheckoutProducts(null)).toEqual([]);
  });
  it('requires the actual checkout variation and valid positive price', () => {
    const input = [
      product('missing', { variationId: null }),
      product('no-ready', { checkoutReady: false }),
      product('zero', { price: 0 }),
      product('bad', { price: 'not a number' }),
      product('good'),
    ];
    expect(selectHomepageCheckoutProducts({ products: input }).map((p) => p.id)).toEqual(['good']);
  });
  it('rejects unavailable and sold-out variants', () => {
    const input = [
      product('out', { soldOut: true }),
      product('unavailable', { available: false }),
      product('unlisted', { squareEcomAvailable: false }),
      product('sold-status', { inventoryStatus: 'sold_out' }),
      product('okay'),
    ];
    expect(selectHomepageCheckoutProducts({ products: input }).map((p) => p.id)).toEqual(['okay']);
  });
  it('does not duplicate conflicting product identities for one Square variation', () => {
    const input = [
      product('samesquare', { name: 'Pineapple Mango' }),
      product('samesquare', { name: 'Vitamin Sea' }),
      product('other'),
    ];
    expect(selectHomepageCheckoutProducts({ products: input }).map((p) => p.name)).toEqual(['Pineapple Mango', 'other']);
  });
  it('honors the merchandising limit', () => {
    const input = Array.from({ length: 10 }, (_, i) => product('v' + i));
    expect(selectHomepageCheckoutProducts({ products: input })).toHaveLength(6);
  });
});
