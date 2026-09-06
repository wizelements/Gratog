import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { listMarketOrdersForUser } from '@/lib/repositories/order-reads';

describe('Turso order reads', () => {
  it('preserves guest email linkage, newest-first ordering, and exact cents', async () => {
    const all = vi.fn()
      .mockResolvedValueOnce([{
        id: 'order-1', order_number: 'M-001', status: 'paid', total_cents: 2899,
        fulfillment_json: JSON.stringify({ boothNumber: '12' }), created_at: '2026-09-05T12:00:00.000Z',
      }])
      .mockResolvedValueOnce([{
        order_id: 'order-1', id: 'order-1:item:0', name_snapshot: 'Ginger Gel', quantity: 2,
        unit_price_cents: 1200, total_cents: 2400, external_catalog_id: 'variation-1', position: 0,
      }]);

    const result = await listMarketOrdersForUser('user-1', ' Guest@Example.COM ', { all } as never);

    expect(all.mock.calls[0][0]).toContain("source_collection = 'marketorders'");
    expect(all.mock.calls[0][0]).toContain('ORDER BY created_at DESC');
    expect(all.mock.calls[0].slice(1)).toEqual(['user-1', 'guest@example.com']);
    expect(result[0]).toMatchObject({
      id: 'order-1', total: 2899, fulfillment: { boothNumber: '12' },
      items: [{ quantity: 2, priceCents: 1200, totalCents: 2400 }],
    });
  });

  it('does not query child rows when the user has no orders', async () => {
    const all = vi.fn().mockResolvedValue([]);

    await expect(listMarketOrdersForUser('user-2', 'guest@example.com', { all } as never)).resolves.toEqual([]);
    expect(all).toHaveBeenCalledOnce();
  });

  it('binds order IDs instead of interpolating values', async () => {
    const all = vi.fn()
      .mockResolvedValueOnce([
        { id: "order'one", order_number: null, status: 'pending', total_cents: 0, fulfillment_json: null, created_at: '2026-01-02' },
        { id: 'order-two', order_number: null, status: 'pending', total_cents: 0, fulfillment_json: null, created_at: '2026-01-01' },
      ])
      .mockResolvedValueOnce([]);

    await listMarketOrdersForUser('user-3', 'user@example.com', { all } as never);

    expect(all.mock.calls[1][0]).toContain('IN (?,?)');
    expect(all.mock.calls[1][0]).not.toContain("order'one");
    expect(all.mock.calls[1].slice(1)).toEqual(["order'one", 'order-two']);
  });
});
