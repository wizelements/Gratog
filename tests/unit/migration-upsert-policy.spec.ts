import { describe, expect, it } from 'vitest';

describe('migration upsert policy', () => {
  it('covers every staging table and never emits unrestricted updates', async () => {
    const { UPSERT_POLICIES, insertStatement } = await import('../../scripts/migrate/upsert-policy.mjs');
    expect(Object.keys(UPSERT_POLICIES)).toHaveLength(25);
    const append = insertStatement('payments', { id: 'p1', status: 'paid', amount_cents: 100 });
    expect(append.sql).toContain('ON CONFLICT(id) DO NOTHING');
    const customer = insertStatement('customers', { id: 'c1', email: 'new@example.test', created_at: 'fixed' });
    expect(customer.sql).toContain('email=excluded.email');
    expect(customer.sql).not.toContain('created_at=excluded.created_at');
  });

  it('fails closed when a transformer names a table without a policy', async () => {
    const { insertStatement } = await import('../../scripts/migrate/upsert-policy.mjs');
    expect(() => insertStatement('unknown_table', { id: 'x' })).toThrow('UPSERT_POLICY_MISSING');
  });
});
