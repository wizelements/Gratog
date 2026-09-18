import { describe, expect, it } from 'vitest';
import {
  LABEL_QUANTITY_MAX,
  normalizeLabelQuantity,
  resolveLabelProduct,
} from '@/lib/label-commerce';

describe('label commerce', () => {
  it('keeps active bottle labels directly payable at their curated price', () => {
    const result = resolveLabelProduct('strawberry-bliss');
    expect(result.payable).toBe(true);
    expect(result.product?.priceCents).toBe(1000);
  });

  it('allows a priced seasonal item even when it is not on the active weekly menu', () => {
    const result = resolveLabelProduct('vitamin-sea');
    expect(result.payable).toBe(true);
    expect(result.product?.priceCents).toBe(1000);
  });

  it('refuses archived products without inventing a price', () => {
    const result = resolveLabelProduct('boba');
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
