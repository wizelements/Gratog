import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { createPreorder, getNextWaitlistNumber, updatePreorderPaymentFields } from '@/lib/preorder/repository';

describe('preorder Turso repository', () => {
  it('allocates the waitlist counter atomically', async () => {
    const tx = { run: vi.fn(), get: vi.fn().mockResolvedValue({ value: 7 }) };
    const executor = { all: vi.fn(), transaction: vi.fn(async (work: any) => work(tx)) } as any;
    const result = await getNextWaitlistNumber('serenbe', 'SER', new Date('2026-09-06T12:00:00Z'), executor);
    expect(result).toEqual({ waitlistNumber: 'SER-0607', counter: 7 });
    expect(tx.run).toHaveBeenCalledTimes(1);
  });

  it('writes the preorder parent and items in one transaction', async () => {
    const tx = { run: vi.fn() };
    const executor = { all: vi.fn(), transaction: vi.fn(async (work: any) => work(tx)) } as any;
    const result = await createPreorder({ orderNumber: 'PRE-1', totalCents: 2500, items: [{ id: 'item-1', name: 'Gel', quantity: 2, priceCents: 1250 }] }, executor);
    expect(executor.transaction).toHaveBeenCalledTimes(1);
    expect(tx.run).toHaveBeenCalledTimes(2);
    expect(result._id).toBe('PRE-1');
  });

  it('allowlists mutable payment columns', async () => {
    const all = vi.fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const executor = { all, transaction: vi.fn() } as any;
    await updatePreorderPaymentFields('PRE-1', { paymentStatus: 'COMPLETED', unsafeColumn: 'ignored' }, executor);
    expect(all.mock.calls[0][0]).toContain('payment_status = ?');
    expect(all.mock.calls[0][0]).not.toContain('unsafeColumn');
  });
});
