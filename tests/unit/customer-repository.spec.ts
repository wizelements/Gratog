import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/turso', () => ({ getTursoConnection: vi.fn() }));

import { exportCustomers, getAdminCustomer, listAdminCustomers, listRecentCustomerOrders } from '@/lib/customers/repository';

const client = (responses: { all?: unknown[][]; get?: unknown[] }) => {
  const all = vi.fn();
  const get = vi.fn();
  for (const value of responses.all ?? []) all.mockResolvedValueOnce(value);
  for (const value of responses.get ?? []) get.mockResolvedValueOnce(value);
  return { all, get } as any;
};

describe('customer Turso repository', () => {
  it('lists distinct customer IDs without using email as identity', async () => {
    const db = client({
      all: [[
        { id: 'c-1', name: 'One', email: 'same@example.com', created_at: '2026-01-01', preferences_json: null, total_orders: 0, total_spent_cents: 0, last_order_date: null },
        { id: 'c-2', name: 'Two', email: 'same@example.com', created_at: '2026-01-02', preferences_json: null, total_orders: 0, total_spent_cents: 0, last_order_date: null },
      ]],
      get: [{ total: 2 }, { total: 2, with_orders: 0, avg_orders: 0, total_value_cents: 0 }],
    });
    const result = await listAdminCustomers({ page: 1, limit: 50, sortBy: 'createdAt', sortOrder: 'desc' }, db);
    expect(result.customers.map(row => row.id)).toEqual(['c-1', 'c-2']);
    expect(result.customers.map(row => row.email)).toEqual(['sa***@example.com', 'sa***@example.com']);
    expect(db.all.mock.calls[0][0]).toContain('GROUP BY c.id');
  });

  it('binds search text and escapes LIKE wildcards', async () => {
    const db = client({ all: [[]], get: [{ total: 0 }, { total: 0, with_orders: 0, avg_orders: null, total_value_cents: 0 }] });
    await listAdminCustomers({ search: 'A%_B', page: 1, limit: 10, sortBy: 'name', sortOrder: 'asc' }, db);
    expect(db.all.mock.calls[0][0]).toContain("LIKE ? ESCAPE '\\'");
    expect(db.all.mock.calls[0].slice(1, 3)).toEqual(['%a\\%\\_b%', '%a\\%\\_b%']);
  });

  it('looks up an opaque stable ID and returns null for a missing customer', async () => {
    const db = client({ get: [null] });
    await expect(getAdminCustomer('legacy-customer-key', db)).resolves.toBeNull();
    expect(db.get).toHaveBeenCalledWith(expect.stringContaining('WHERE id = ?'), 'legacy-customer-key');
  });

  it('keeps guest orders out of customer history naturally and limits items per order', async () => {
    const db = client({
      all: [
        [{ id: 'o-1', order_number: '1', status: 'paid', total_cents: 500, created_at: '2026-01-01' }],
        [{ order_id: 'o-1', id: 'i-1', name_snapshot: 'Tea', quantity: 1, unit_price_cents: 500, total_cents: 500, position: 0 }],
      ],
    });
    const result = await listRecentCustomerOrders('c-1', db);
    expect(result).toHaveLength(1);
    expect(result[0].items).toHaveLength(1);
    expect(db.all.mock.calls[0]).toEqual([expect.stringContaining('customer_id = ?'), 'c-1']);
    expect(db.all.mock.calls[1][0]).toContain('row_number() OVER (PARTITION BY order_id');
  });

  it('exports rows independently even when emails are duplicated', async () => {
    const db = client({ all: [[
      { id: 'c1', email: 'x@example.com', name: 'X', created_at: '2026-01-01', preferences_json: '{}', total_orders: 1, total_spent_cents: 100 },
      { id: 'c2', email: 'x@example.com', name: 'Y', created_at: '2026-01-02', preferences_json: '{}', total_orders: 0, total_spent_cents: 0 },
    ]] });
    const rows = await exportCustomers({}, db);
    expect(rows.map(row => row.id)).toEqual(['c1', 'c2']);
  });
});
