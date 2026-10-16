import { describe, expect, it } from 'vitest';
import { unstartedPaymentMatch } from '@/lib/checkout/unstarted-payment';

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
});
