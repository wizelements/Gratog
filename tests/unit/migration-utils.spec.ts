import { describe, expect, it } from 'vitest';
import { cents, fingerprint, iso, sourceId } from '../../scripts/migrate/migration-utils.mjs';

describe('Mongo to Turso migration normalization', () => {
  it('preserves integer cents and converts exact dollar values', () => {
    expect(cents(125, 'amountCents')).toBe(125);
    expect(cents('12.34', 'total', 'dollars')).toBe(1234);
  });

  it('rejects invalid money and timestamps', () => {
    expect(() => cents('nope', 'total')).toThrow('INVALID_MONEY:total');
    expect(() => iso('not-a-date', 'createdAt')).toThrow('INVALID_TIMESTAMP:createdAt');
    expect(() => cents('1.001', 'total', 'dollars')).toThrow('INEXACT_MONEY:total');
    expect(cents('0', 'total', 'dollars')).toBe(0);
  });

  it('canonicalizes key order and BSON-like identifiers for fingerprints', () => {
    expect(fingerprint({ b: 2, a: 1 })).toBe(fingerprint({ a: 1, b: 2 }));
    expect(sourceId({ toString: () => 'legacy-id' })).toBe('legacy-id');
  });
});
