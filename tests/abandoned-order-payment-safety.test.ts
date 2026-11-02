import { describe, expect, it } from 'vitest';
import { unstartedPaymentMatch, guardedAbandonmentWriteFilter } from '@/lib/checkout/unstarted-payment';

describe('automatic abandonment only for never-attempted payments', () => {
  it('admits only explicit unpaid statuses', () => {
    const filter = unstartedPaymentMatch();
    expect(filter.paymentStatus.$in).toEqual(['pending', 'PENDING', 'PENDING_PAYMENT']);
    expect(filter.paymentStatus.$in).not.toContain('processing');
    expect(filter.paymentStatus.$in).not.toContain('payment_processing');
    expect(filter.paymentStatus.$in).not.toContain('paid');
  });

  it('excludes every order with payment-attempt evidence', () => {
    expect(unstartedPaymentMatch()).toMatchObject({
      paymentAttemptedAt: { $exists: false },
      paymentIdempotencyKey: { $exists: false },
    });
  });
  it('carries the current eligibility predicate into the atomic write', () => {
    const eligible = { $and: [unstartedPaymentMatch(), { status: { $nin: ['processing', 'paid'] } }] };
    const write = guardedAbandonmentWriteFilter(['order-1'], eligible);
    expect(write).toEqual({
      $and: [{ id: { $in: ['order-1'] } }, eligible],
    });
    expect(write.$and[1]).toBe(eligible);
  });
});
