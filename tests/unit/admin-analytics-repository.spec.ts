import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ get: vi.fn(), all: vi.fn() }));
vi.mock('@/lib/db/turso', () => ({ getTursoConnection: () => db }));

import {
  getCustomerAnalyticsData,
  getDashboardAnalytics,
  getSalesAnalyticsData,
} from '@/lib/admin/analytics-repository';

describe('admin analytics Turso repository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns dashboard money in dollars from authoritative integer cents', async () => {
    db.get
      .mockResolvedValueOnce({ customers: 3, orders: 2, campaigns: 1, active_challenges: 1, active_campaigns: 0, sent_campaigns: 1 })
      .mockResolvedValueOnce({ total_cents: 1234, recent_cents: 500 });
    db.all.mockResolvedValueOnce([{ id: 'o1', order_number: '1', status: 'paid', total_cents: 500, created_at: '2026-09-01T00:00:00.000Z' }]).mockResolvedValueOnce([]);
    const result = await getDashboardAnalytics(new Date('2026-09-06T00:00:00.000Z'));
    expect(result.revenue).toEqual({ total: 12.34, last30Days: 5, averageOrderValue: '6.17' });
    expect(db.get.mock.calls[1][0]).not.toContain('1234');
  });

  it('preserves customer segmentation thresholds using cents', async () => {
    db.get.mockResolvedValue({ total: 3, active: 1, inactive: 2, opted_in: 2, opted_out: 1 });
    db.all
      .mockResolvedValueOnce([{ month: '2026-09', count: 3 }])
      .mockResolvedValueOnce([{ order_count: 1 }, { order_count: 3 }, { order_count: 6 }])
      .mockResolvedValueOnce([{ total_cents: 20000 }, { total_cents: 5000 }, { total_cents: 4999 }])
      .mockResolvedValueOnce([{ tier: 'gold', count: 1 }]);
    const result = await getCustomerAnalyticsData(new Date('2026-09-06T00:00:00.000Z'));
    expect(result.segments.byValue).toEqual({ high: 1, medium: 1, low: 1 });
    expect(result.emailPreferences.optInRate).toBe('66.7');
  });

  it('derives sales summaries from normalized relational rows', async () => {
    db.get.mockResolvedValue({ orders: 2, cents: 2000 });
    db.all
      .mockResolvedValueOnce([{ month: '2026-09', orders: 2, cents: 2000 }])
      .mockResolvedValueOnce([{ name: 'Gel', quantity: 2, cents: 1200 }])
      .mockResolvedValueOnce([{ category: 'Gel', orders: 1, quantity: 2, cents: 1200 }])
      .mockResolvedValueOnce([{ type: 'pickup', orders: 2, cents: 2000 }]);
    const result = await getSalesAnalyticsData(new Date('2026-09-06T00:00:00.000Z'));
    expect(result.total).toEqual({ orders: 2, revenue: 20, averageOrderValue: '10.00' });
    expect(result.topProducts[0].revenue).toBe(12);
  });
});
