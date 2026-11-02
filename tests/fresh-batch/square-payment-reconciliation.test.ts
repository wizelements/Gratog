import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findOne: vi.fn(),
  updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
}));
vi.mock('@/lib/batches/audit-log', () => ({
  logPaymentReceived: vi.fn().mockResolvedValue(undefined),
  logReservationStatusChange: vi.fn().mockResolvedValue(undefined),
}));
import { reconcileSquareBatchReservation } from '@/lib/batches/reconcile-square-reservation';

const db = { collection: vi.fn(() => mocks) };
const paid = (id: string, amount: number, status = 'COMPLETED') => ({
  id, order_id: 'square-order-1', amount_money: { amount, currency: 'USD' }, status,
});
const reservation = {
  id: 'r1', squareOrderId: 'square-order-1', paymentStatus: 'pending',
  finalPriceCents: 20000, depositCents: 10000,
  capturedAmountCents: 0, processedSquarePaymentIds: [],
};

describe('fresh-batch Square payment reconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findOne.mockResolvedValue({ ...reservation });
    mocks.updateOne.mockResolvedValue({ modifiedCount: 1 });
  });

  it('does not count an authorized but uncompleted payment', async () => {
    const result = await reconcileSquareBatchReservation(db, paid('p1', 20000, 'APPROVED'));
    expect(result.applied).toBe(false);
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });

  it('marks a completed deposit paid, not fully paid', async () => {
    const result = await reconcileSquareBatchReservation(db, paid('p1', 10000));
    expect(result.paymentStatus).toBe('deposit_paid');
    const [filter, update] = mocks.updateOne.mock.calls[0];
    expect(filter.processedSquarePaymentIds).toEqual({ $ne: 'p1' });
    expect(update.$set.paymentStatus).toBe('deposit_paid');
    expect(update.$set.capturedAmountCents).toBe(10000);
    expect(update.$addToSet.processedSquarePaymentIds).toBe('p1');
  });

  it('marks full amount paid immediately when fully collected', async () => {
    const result = await reconcileSquareBatchReservation(db, paid('p1', 20000));
    expect(result.paymentStatus).toBe('fully_paid');
  });

  it('counts a distinct balance payment after a deposit', async () => {
    mocks.findOne.mockResolvedValue({
      ...reservation, paymentStatus: 'deposit_paid',
      capturedAmountCents: 10000, processedSquarePaymentIds: ['p1'],
    });
    const result = await reconcileSquareBatchReservation(db, paid('p2', 10000));
    expect(result.paymentStatus).toBe('fully_paid');
    expect(mocks.updateOne.mock.calls[0][1].$set.capturedAmountCents).toBe(20000);
  });

  it('ignores retries of the same Square payment ID', async () => {
    mocks.findOne.mockResolvedValue({
      ...reservation, paymentStatus: 'deposit_paid',
      capturedAmountCents: 10000, processedSquarePaymentIds: ['p1'],
    });
    const result = await reconcileSquareBatchReservation(db, paid('p1', 10000));
    expect(result.applied).toBe(false);
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });

  it('does not assume a missing amount is the total', async () => {
    const result = await reconcileSquareBatchReservation(db, {
      id: 'p1', order_id: 'square-order-1', status: 'COMPLETED',
    });
    expect(result.applied).toBe(false);
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });

  it('does not acknowledge a concurrent ledger conflict as processed', async () => {
    mocks.updateOne.mockResolvedValue({ modifiedCount: 0 });
    await expect(reconcileSquareBatchReservation(db, paid('p1', 10000)))
      .rejects.toThrow('Concurrent reservation update');
  });
});
