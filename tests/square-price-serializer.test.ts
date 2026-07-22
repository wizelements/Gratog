import { describe, it, expect } from 'vitest';
import {
  safeSquareCents,
  validateStorefrontItem,
  isValidStorefrontItem,
  summarizeRejection,
  type StorefrontItem,
} from '../lib/square-price-serializer';

describe('safeSquareCents', () => {
  it('converts a valid positive BigInt cents value', () => {
    const result = safeSquareCents(1234n);
    expect(result.cents).toBe(1234);
    expect(result.status).toBe('valid');
  });

  it('returns zero for explicit 0n BigInt', () => {
    const result = safeSquareCents(0n);
    expect(result.cents).toBe(0);
    expect(result.status).toBe('zero');
  });

  it('returns missing for undefined amount', () => {
    const result = safeSquareCents(undefined);
    expect(result.cents).toBe(0);
    expect(result.status).toBe('missing');
  });

  it('returns missing for null amount', () => {
    const result = safeSquareCents(null);
    expect(result.cents).toBe(0);
    expect(result.status).toBe('missing');
  });

  it('returns invalid for negative BigInt', () => {
    const result = safeSquareCents(-100n);
    expect(result.cents).toBe(-100);
    expect(result.status).toBe('invalid');
  });

  it('returns invalid for unreasonably large amount', () => {
    const result = safeSquareCents(10_000_000_00n); // $1,000,000 in cents
    expect(result.cents).toBe(10_000_000_00);
    expect(result.status).toBe('invalid');
  });

  it('accepts numeric integer input', () => {
    const result = safeSquareCents(2500);
    expect(result.cents).toBe(2500);
    expect(result.status).toBe('valid');
  });

  it('rejects numeric non-integer input', () => {
    const result = safeSquareCents(25.5);
    expect(result.status).toBe('invalid');
  });

  it('rejects non-numeric string input', () => {
    const result = safeSquareCents('not-a-number');
    expect(result.status).toBe('invalid');
  });

  it('accepts numeric string input', () => {
    const result = safeSquareCents('1500');
    expect(result.cents).toBe(1500);
    expect(result.status).toBe('valid');
  });

  it('returns missing for empty string', () => {
    const result = safeSquareCents('');
    expect(result.status).toBe('missing');
  });
});

describe('validateStorefrontItem', () => {
  const baseItem: StorefrontItem = {
    id: 'item_123',
    name: 'Sea Moss Gel',
    priceCents: 1500,
    currency: 'USD',
    variationId: 'var_456',
    itemType: 'ITEM',
    available: true,
    inStock: true,
  };

  it('validates a complete, positive-price item', () => {
    const result = validateStorefrontItem(baseItem);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('rejects missing product name', () => {
    const result = validateStorefrontItem({ ...baseItem, name: undefined });
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('missing_name');
  });

  it('rejects blank product name', () => {
    const result = validateStorefrontItem({ ...baseItem, name: '   ' });
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('missing_name');
  });

  it('rejects the Square "Unnamed Product" sentinel', () => {
    const result = validateStorefrontItem({ ...baseItem, name: 'Unnamed Product' });
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('unnamed');
  });

  it('rejects missing variation', () => {
    const result = validateStorefrontItem({ ...baseItem, variationId: undefined });
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('missing_variation_id');
  });

  it('rejects missing item id', () => {
    const result = validateStorefrontItem({ ...baseItem, id: undefined });
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('missing_item_id');
  });

  it('rejects missing price', () => {
    const result = validateStorefrontItem({ ...baseItem, priceCents: undefined });
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('missing_price');
  });

  it('rejects zero price', () => {
    const result = validateStorefrontItem({ ...baseItem, priceCents: 0 });
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('zero_price');
  });

  it('rejects negative price', () => {
    const result = validateStorefrontItem({ ...baseItem, priceCents: -100 });
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('invalid_price');
  });

  it('rejects missing currency', () => {
    const result = validateStorefrontItem({ ...baseItem, currency: undefined });
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('missing_currency');
  });

  it('rejects unsupported currency', () => {
    const result = validateStorefrontItem({ ...baseItem, currency: 'EUR' });
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('unsupported_currency');
  });

  it('rejects unsupported Square object type', () => {
    const result = validateStorefrontItem({ ...baseItem, itemType: 'CATEGORY' });
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('unsupported_type');
  });

  it('accepts ITEM_VARIATION as a valid variation type', () => {
    const result = validateStorefrontItem({ ...baseItem, itemType: 'ITEM_VARIATION' });
    expect(result.valid).toBe(true);
  });

  it('rejects explicitly disabled item', () => {
    const result = validateStorefrontItem({ ...baseItem, available: false });
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('explicitly_disabled');
  });

  it('treats malformed object as invalid price', () => {
    const result = validateStorefrontItem({ ...baseItem, priceCents: NaN });
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('invalid_price');
  });

  it('summarizes rejection without exposing secrets', () => {
    const result = summarizeRejection('Sea Moss Gel', ['zero_price', 'missing_currency']);
    expect(result).toBe('Sea Moss Gel: zero_price, missing_currency');
  });

  it('uses a safe placeholder for unnamed rejected items', () => {
    const result = summarizeRejection(undefined, ['unnamed', 'zero_price']);
    expect(result).toBe('<unnamed>: unnamed, zero_price');
  });
});

describe('isValidStorefrontItem', () => {
  it('returns true for valid item', () => {
    expect(isValidStorefrontItem({
      id: 'id',
      name: 'Product',
      priceCents: 100,
      currency: 'USD',
      variationId: 'var',
    })).toBe(true);
  });

  it('returns false for invalid item', () => {
    expect(isValidStorefrontItem({
      id: 'id',
      name: 'Unnamed Product',
      priceCents: 100,
      currency: 'USD',
      variationId: 'var',
    })).toBe(false);
  });
});
