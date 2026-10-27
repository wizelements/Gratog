import { describe, expect, it } from 'vitest';
import { classifyCapturedRefund } from '@/lib/checkout/refund-progress';

describe('Square captured refund reconciliation', () => {
  it('keeps a small refund distinct from a complete refund', () => {
    expect(classifyCapturedRefund(1199, 100)).toEqual({
      fullyRefunded: false, paymentStatus: 'partially_refunded',
    });
    expect(classifyCapturedRefund(1199, 1199)).toEqual({
      fullyRefunded: true, paymentStatus: 'refunded',
    });
  });

  it('handles several cumulative partial refunds without declaring full early', () => {
    expect(classifyCapturedRefund(3600, 1200).paymentStatus).toBe('partially_refunded');
    expect(classifyCapturedRefund(3600, 2400).paymentStatus).toBe('partially_refunded');
    expect(classifyCapturedRefund(3600, 3600).paymentStatus).toBe('refunded');
  });

  it.each([[0, 0], [1199, 0], [1199, 1200], [1199, -1], [1199, 1.5]])(
    'rejects invalid paid/refunded values (%i, %i)', (paid, refunded) => {
      expect(() => classifyCapturedRefund(paid, refunded)).toThrow(/refund amount/i);
    },
  );
});
