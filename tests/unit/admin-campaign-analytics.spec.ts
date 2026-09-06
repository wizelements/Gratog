import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCampaignAnalyticsSummary = vi.hoisted(() => vi.fn());

vi.mock('@/lib/campaigns/repository', () => ({ getCampaignAnalyticsSummary }));
vi.mock('@/lib/admin/analytics-repository', () => ({
  getCustomerAnalyticsData: vi.fn(),
  getDashboardAnalytics: vi.fn(),
  getSalesAnalyticsData: vi.fn(),
}));

import { getCampaignAnalytics } from '@/lib/admin-analytics';

describe('admin campaign analytics on Turso', () => {
  beforeEach(() => vi.clearAllMocks());

  it('preserves dashboard totals, rates, and recent-campaign shape', async () => {
    getCampaignAnalyticsSummary.mockResolvedValue({
      statusRows: [
        { status: 'draft', count: 2 },
        { status: 'sending', count: 1 },
        { status: 'sent', count: 3 },
      ],
      sentTotals: { totalRecipients: 20, sent: 18, failed: 2 },
      recent: [{
        id: 'campaign-1', name: 'September', status: 'sent',
        stats: { totalRecipients: 10, sent: 9 },
        createdAt: '2026-09-01T00:00:00.000Z', sentAt: '2026-09-02T00:00:00.000Z',
      }],
    });

    await expect(getCampaignAnalytics()).resolves.toEqual({
      total: 6,
      byStatus: { draft: 2, scheduled: 0, sending: 1, sent: 3 },
      overall: { recipients: 20, sent: 18, failed: 2, deliveryRate: '90.0' },
      recent: [{
        id: 'campaign-1', name: 'September', status: 'sent', recipients: 10, sent: 9,
        createdAt: '2026-09-01T00:00:00.000Z', sentAt: '2026-09-02T00:00:00.000Z',
      }],
    });
    expect(getCampaignAnalyticsSummary).toHaveBeenCalledWith(10);
  });

  it('returns numeric zero for an empty campaign history', async () => {
    getCampaignAnalyticsSummary.mockResolvedValue({
      statusRows: [], sentTotals: { totalRecipients: 0, sent: 0, failed: 0 }, recent: [],
    });

    const result = await getCampaignAnalytics();
    expect(result.total).toBe(0);
    expect(result.overall.deliveryRate).toBe(0);
    expect(result.recent).toEqual([]);
  });
});
