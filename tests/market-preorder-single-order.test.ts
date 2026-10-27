import { beforeEach, describe, expect, it, vi } from 'vitest';
import { connectToDatabase } from '@/lib/db-optimized';
import { reserveMarketPreorderAttempt, completeMarketPreorderAttempt } from '@/lib/preorder/single-attempt';

vi.mock('@/lib/db-optimized', () => ({ connectToDatabase: vi.fn() }));

function setupFakeMongo() {
  const rows = new Map<string, any>();
  const createIndex = vi.fn(async () => 'unique');
  const insertOne = vi.fn(async (row: any) => {
    await Promise.resolve();
    if (rows.has(row.key)) throw Object.assign(new Error('duplicate key'), { code: 11000 });
    rows.set(row.key, { ...row });
    return { acknowledged: true };
  });
  const findOne = vi.fn(async (query: any) => rows.get(query.key) || null);
  const updateOne = vi.fn(async (query: any, update: any) => {
    const row = rows.get(query.key);
    if (!row || row.state !== query.state) return { matchedCount: 0 };
    Object.assign(row, update.$set);
    return { matchedCount: 1 };
  });
  const db = { collection: (_: string) => ({ createIndex, insertOne, findOne, updateOne }) };
  vi.mocked(connectToDatabase).mockResolvedValue({ db } as any);
  return { rows, createIndex, insertOne };
}

describe('market preorder payment link and waitlist single admission', () => {
  beforeEach(() => vi.resetAllMocks());
  it('admits only one out of 12 simultaneous identical submissions', async () => {
    const { rows, insertOne } = setupFakeMongo();
    const results = await Promise.all(Array.from({ length: 12 },
      () => reserveMarketPreorderAttempt('market-intent-001', 'market+cart+pickup-A')));
    expect(results.filter(item => item.state === 'new')).toHaveLength(1);
    expect(results.filter(item => item.state === 'pending')).toHaveLength(11);
    expect(rows.size).toBe(1);
    expect(insertOne).toHaveBeenCalledTimes(12);
  });
  it('returns the same order and Square payment link when the original response was lost', async () => {
    setupFakeMongo();
    const key = 'market-intent-002';
    expect((await reserveMarketPreorderAttempt(key, 'payload-A')).state).toBe('new');
    const result = { success: true, orderNumber: 'PRE-123', payment: { url: 'https://example.test/checkout-123' } };
    await completeMarketPreorderAttempt(key, result, 'complete');
    const repeated = await reserveMarketPreorderAttempt(key, 'payload-A');
    expect(repeated).toMatchObject({ state: 'replay', result });
    expect((await reserveMarketPreorderAttempt(key, 'payload-B')).state).toBe('conflict');
  });
  it('does not replay payment creation after a failed link attempt', async () => {
    setupFakeMongo();
    const key = 'market-intent-003';
    await reserveMarketPreorderAttempt(key, 'payload-A');
    await completeMarketPreorderAttempt(key, { success: false, code: 'PAYMENT_LINK_FAILED' }, 'failed');
    const recovered = await reserveMarketPreorderAttempt(key, 'payload-A');
    expect(recovered.state).toBe('failed');
  });
  it('never starts a market side effect without a unique index', async () => {
    const { createIndex, insertOne } = setupFakeMongo();
    createIndex.mockRejectedValue(new Error('unique index unavailable'));
    await expect(reserveMarketPreorderAttempt('market-intent-004', 'payload')).rejects.toThrow('unique index unavailable');
    expect(insertOne).not.toHaveBeenCalled();
  });
});
