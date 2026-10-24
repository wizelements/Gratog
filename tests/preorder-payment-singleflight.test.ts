import { describe, expect, it, vi } from 'vitest';
import { claimPreorderPaymentLinkCreation } from '@/lib/preorder/capacity';

describe('payment link single-flight across concurrent retries', () => {
  it('permits exactly one writer for an eligible order', async () => {
    let claimed = false;
    const findOneAndUpdate = vi.fn(async (filter, update) => {
      expect(filter.paymentStatus).toBe('PENDING');
      expect(filter.paymentLinkId).toEqual({ $exists: false });
      expect(filter.paymentLinkState).toEqual({ $exists: false });
      if (claimed) return null;
      claimed = true;
      return { orderNumber: filter.orderNumber, paymentLinkState: update.$set.paymentLinkState };
    });
    const db = { collection: () => ({ findOneAndUpdate }) };
    const results = await Promise.all(Array.from({ length: 100 }, () =>
      claimPreorderPaymentLinkCreation(db as any, 'PRE-ABC')));
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(findOneAndUpdate).toHaveBeenCalledTimes(100);
  });
});
