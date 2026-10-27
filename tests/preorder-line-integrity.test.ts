import { describe, expect, it } from 'vitest';
import {
  validateMarketOrderLines, validateSelectedMarketVariation,
  PreorderLineValidationError,
} from '@/lib/preorder/line-validation';

const product = { id: 'square-product', slug: 'calm-waters' };
const variationA = { id: 'square-variation-a' };
const variationB = { id: 'square-variation-b' };
const lookup = new Map<string, { product: any; variation: any }>([
  ['square-product', { product, variation: variationA }],
  ['calm-waters', { product, variation: variationA }],
  ['square-variation-a', { product, variation: variationA }],
  ['square-variation-b', { product, variation: variationB }],
  ['other-product', { product: { id: 'other-product' }, variation: { id: 'other-variation' } }],
]);

describe('market preorder line selection and money precision', () => {
  it('accepts only stable valid quantities', () => {
    expect(validateMarketOrderLines([{ productId: 'square-product', quantity: 2 }])[0].quantity).toBe(2);
    expect(validateMarketOrderLines([{ productId: 'square-product', quantity: '2' }])[0].quantity).toBe(2);
    for (const quantity of [0, -1, 1.5, 51, null, undefined, '', Infinity, '2.5', 'nan']) {
      expect(() => validateMarketOrderLines([{ productId: 'square-product', quantity }]))
        .toThrow(PreorderLineValidationError);
    }
  });
  it('rejects duplicate lines and unsupported quantities before Square', () => {
    expect(() => validateMarketOrderLines([
      { productId: 'square-product', variationId: 'square-variation-a', quantity: 2 },
      { productId: 'square-product', variationId: 'square-variation-a', quantity: 3 },
    ])).toThrow(/appears twice/i);
    expect(() => validateMarketOrderLines(Array.from({ length: 51 }, (_, i) =>
      ({ id: String(i), quantity: 1 })))).toThrow(/50-line/);
  });
  it('accepts a valid catalog product and selected variation', () => {
    expect(() => validateSelectedMarketVariation(
      { productId: product.id, variationId: variationA.id },
      product, variationA, lookup,
    )).not.toThrow();
  });
  it('never falls back to a different size when the submitted variation was removed', () => {
    expect(() => validateSelectedMarketVariation(
      { productId: product.id, variationId: 'retired-variation' },
      product, variationA, lookup,
    )).toThrow(/size or variation/i);
    expect(() => validateSelectedMarketVariation(
      { productId: product.id, variationId: variationA.id, catalogObjectId: variationB.id },
      product, variationA, lookup,
    )).toThrow(/variations do not match/i);
  });
  it('rejects forged product + variation combinations instead of repricing another product', () => {
    expect(() => validateSelectedMarketVariation(
      { productId: 'other-product', variationId: variationA.id },
      product, variationA, lookup,
    )).toThrow(/product changed/i);
  });
});
