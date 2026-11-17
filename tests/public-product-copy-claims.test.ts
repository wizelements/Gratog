import { describe, expect, it } from 'vitest';
import {
  containsUnsupportedProductClaim,
  sanitizePublicProductCopy,
  sanitizePublicProduct,
  sanitizePublicProducts,
  PUBLIC_PRODUCT_COPY_FALLBACK,
} from '../lib/public-product-copy';

describe('public Square product copy claims guard', () => {
  it('keeps flavor sentences while dropping unsupported minerals and thyroid claims', () => {
    const copy = 'Watermelon, strawberry, lime and lemon. Contains 92 essential minerals for thyroid health. Lightly sweetened with agave.';
    expect(sanitizePublicProductCopy(copy)).toBe('Watermelon, strawberry, lime and lemon. Lightly sweetened with agave.');
  });

  it('removes anti-inflammatory, immunity and detox sentences regardless of case', () => {
    const copy = 'A crisp lemon sip. Anti-inflammatory properties. BOOSTS IMMUNITY. Supports a detox routine.';
    expect(sanitizePublicProductCopy(copy)).toBe('A crisp lemon sip.');
  });

  it('preserves clean, bulleted ingredient descriptions exactly', () => {
    const copy = 'Watermelon • Strawberry • Lime • Lemon • Agave';
    expect(sanitizePublicProductCopy(copy)).toBe(copy);
  });

  it('does not blank all copy when one unsupported claim occurs', () => {
    expect(sanitizePublicProductCopy('Lemon and ginger. Promotes thyroid health. Bright citrus finish.'))
      .toBe('Lemon and ginger. Bright citrus finish.');
  });

  it('handles HTML line breaks and uses neutral fallback for claim-only copy', () => {
    expect(sanitizePublicProductCopy('<p>Strawberry and lime.</p><p>Boosts immunity.</p>'))
      .toBe('Strawberry and lime.');
    expect(sanitizePublicProductCopy('92 essential minerals.')).toBe(PUBLIC_PRODUCT_COPY_FALLBACK);
  });

  it('treats cure, disease, blood pressure and hormones claims as unsafe', () => {
    for (const claim of [
      'Treats diabetes', 'Prevents disease', 'Regulates blood pressure',
      'Balances hormones', 'Heals inflammation',
    ]) expect(containsUnsupportedProductClaim(claim)).toBe(true);
  });

  it('sanitizes nested product copy while leaving commerce fields intact', () => {
    const item = {
      id: 'id1', name: 'Melon Rita', price: 11.99, stock: 25, checkoutReady: false,
      description: 'Juicy melon. Boosts immunity.',
      seoDescription: 'Refreshing melon. Anti-inflammatory effects.',
      benefits: ['Detox', 'Refreshing flavor'],
      ingredients: [{ name: 'lime', notes: 'Tart citrus. Aids thyroid health.' }],
      variations: [{ id: 'v', priceCents: 1199 }],
    };
    const sanitized = sanitizePublicProduct(item);
    expect(sanitized.description).toBe('Juicy melon.');
    expect(sanitized.seoDescription).toBe('Refreshing melon.');
    expect(sanitized.benefits).toEqual(['Refreshing flavor']);
    expect(sanitized.ingredients[0].notes).toBe('Tart citrus.');
    expect(sanitized.variations).toEqual(item.variations);
    expect(sanitized.price).toBe(11.99);
    expect(sanitized.stock).toBe(25);
    expect(sanitized.checkoutReady).toBe(false);
    expect(item.description).toBe('Juicy melon. Boosts immunity.');
  });

  it('does not change Calm Waters copy or catalog ordering', () => {
    const products = [
      { id: 'calm', description: 'Blue spirulina, lemon, ashwagandha, Celtic salt, and agave.' },
      { id: 'melon', description: 'Strawberry and lime. Natural detox.' },
    ];
    const output = sanitizePublicProducts(products);
    expect(output).toHaveLength(2);
    expect(output[0]).toEqual(products[0]);
    expect(output[1].description).toBe('Strawberry and lime.');
  });
});
