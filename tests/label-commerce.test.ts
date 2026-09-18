import { describe, expect, it } from 'vitest';
import {
  LABEL_QUANTITY_MAX,
  normalizeLabelQuantity,
  resolveLabelProductFromCatalog,
} from '@/lib/label-commerce';

describe('label commerce', () => {
  it('prefers live Square price and variation data over curated fallback price', () => {
    const result = resolveLabelProductFromCatalog('strawberry-bliss', [
      {
        id: 'SQUAREITEM123456789012345',
        slug: 'strawberry-bliss',
        name: 'Strawberry Bliss',
        category: 'lemonades',
        price: 11.99,
        priceCents: 1199,
        size: '16oz bottle',
        ingredients: [{ name: 'Strawberry' }],
        source: 'square_sync',
        variationId: 'HYODQWXIJJVAPRIZ66SVUYE5',
      },
    ]);

    expect(result.payable).toBe(true);
    expect(result.product?.priceCents).toBe(1199);
    expect(result.product?.squareVariationId).toBe('HYODQWXIJJVAPRIZ66SVUYE5');
  });

  it('supports stable label aliases for Square-only market products', () => {
    const result = resolveLabelProductFromCatalog('pineapple-mango', [
      {
        slug: 'pineapple-mango-lemonade',
        name: 'Pineapple Mango Lemonade',
        category: 'Lemonades & Juices',
        price: 9,
        priceCents: 900,
        size: '16oz',
        source: 'square_sync',
        variationId: '4YFOIFCPUXTDKDA5DU2LLQ2G',
      },
    ]);

    expect(result.payable).toBe(true);
    expect(result.product?.slug).toBe('pineapple-mango-lemonade');
    expect(result.product?.priceCents).toBe(900);
  });

  it('allows a priced seasonal curated item even when it is not on the active weekly menu', () => {
    const result = resolveLabelProductFromCatalog('vitamin-sea', []);
    expect(result.payable).toBe(true);
    expect(result.product?.priceCents).toBe(1000);
  });

  it('supports Square-only boba flavors when they have a verified price', () => {
    const result = resolveLabelProductFromCatalog('strawberry-milk-tea', [
      {
        slug: 'strawberry-milk-tea',
        name: 'Strawberry Milk Tea',
        category: 'Boba',
        price: 9.75,
        priceCents: 975,
        size: 'Regular',
        source: 'square_sync',
        variationId: 'OGMHH6NVS2MOAGZH4BFJ6HD2',
      },
    ]);

    expect(result.payable).toBe(true);
    expect(result.product?.priceCents).toBe(975);
  });

  it('refuses archived generic products without inventing a price', () => {
    const result = resolveLabelProductFromCatalog('boba', []);
    expect(result.payable).toBe(false);
    expect(result.reason).toBe('inactive');
  });

  it('bounds label quantities for booth checkout', () => {
    expect(normalizeLabelQuantity('0')).toBe(1);
    expect(normalizeLabelQuantity('3')).toBe(3);
    expect(normalizeLabelQuantity('99')).toBe(LABEL_QUANTITY_MAX);
    expect(normalizeLabelQuantity('junk')).toBe(1);
  });
});
