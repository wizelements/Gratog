import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ all: vi.fn(), get: vi.fn() }));
vi.mock('@/lib/db/turso', () => ({ getTursoConnection: () => db }));

import { findSubscriptionForEmail, listSubscriptionsByEmail } from '@/lib/subscriptions/repository';

describe('subscription snapshot reads', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses a bounded parameterized owner query', async () => {
    db.all.mockResolvedValue([{ source_id: 'sub-1', occurred_at: '2026-01-01T00:00:00Z', status: 'paused', payload_json: '{"planName":"Pilot Box"}' }]);
    await expect(listSubscriptionsByEmail(' Owner@Example.com ', 500)).resolves.toEqual([
      expect.objectContaining({ id: 'sub-1', planName: 'Pilot Box', status: 'paused' }),
    ]);
    expect(db.all).toHaveBeenCalledWith(expect.stringContaining('source_collection = ?'), 'subscriptions', 'owner@example.com', 100);
  });

  it('binds both record and owner identity for detail access', async () => {
    db.get.mockResolvedValue({ source_id: 'sub-2', occurred_at: null, status: 'active', payload_json: '{}' });
    await expect(findSubscriptionForEmail('sub-2', 'OWNER@example.com')).resolves.toMatchObject({ id: 'sub-2', status: 'active' });
    expect(db.get).toHaveBeenCalledWith(expect.stringContaining('source_id = ?'), 'subscriptions', 'sub-2', 'owner@example.com');
  });

  it('does not query without an owner identity', async () => {
    await expect(listSubscriptionsByEmail('')).resolves.toEqual([]);
    expect(db.all).not.toHaveBeenCalled();
  });
});
