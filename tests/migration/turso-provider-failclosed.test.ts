import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { assertMongoCheckoutProvider } from '../../lib/database/checkout-provider-guard';

describe('database cutover must not silently mix providers', () => {
  it('preserves the existing default Mongo path', () => {
    expect(() => assertMongoCheckoutProvider({})).not.toThrow();
    expect(() => assertMongoCheckoutProvider({DATABASE_PROVIDER:'mongodb'})).not.toThrow();
  });
  it('refuses any premature Turso runtime toggle until certified', () => {
    expect(() => assertMongoCheckoutProvider({DATABASE_PROVIDER:'turso'})).toThrow(/TURSO_APP_CUTOVER_BLOCKED/);
    expect(() => assertMongoCheckoutProvider({DATABASE_PROVIDER:'unknown'})).toThrow(/INVALID_DATABASE_PROVIDER/);
  });
  it('checks the provider on every database connection, including cached connections', () => {
    const source=readFileSync('lib/db-optimized.ts','utf8');
    const guard=source.indexOf('  assertMongoCheckoutProvider();');
    const cached=source.indexOf('  if (cached.conn)');
    expect(guard).toBeGreaterThan(0);
    expect(cached).toBeGreaterThan(guard);
  });
});
