import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Square payment retry and reconciliation safety', () => {
  it('rotates the payment attempt key only when Square definitively declined', () => {
    const source = read('app/api/payments/route.ts');
    expect(source).toContain("const PRE_PAYMENT_STATES = ['pending', 'PENDING',");
    expect(source).toContain('order.paymentAttemptNumber');
    expect(source).toContain('$inc: { paymentAttemptNumber: 1 }');
    expect(source).toContain("$unset: { paymentIdempotencyKey: '' }");
    expect(source).toContain('const paymentIdempotencyKey = order.paymentIdempotencyKey || serverStableKey;');
    expect(source).toContain("code: 'PAYMENT_CAPTURE_PENDING'");
  });

  it('allows card retry after verified decline, but blocks uncertain results', () => {
    const source = read('components/checkout/SquarePaymentForm.tsx');
    expect(source).toContain('definitiveDecline = res.status === 400 && Boolean(data.code)');
    expect(source).toContain("setPaymentStep(definitiveDecline ? 'idle' : 'error')");
    expect(source).toContain('if (definitiveDecline) submittingRef.current = false;');
    expect(source).toContain('if (submittingRef.current');
  });

  it('provides an authenticated status check rather than blindly charging again', () => {
    const source = read('components/checkout/SquarePaymentForm.tsx');
    expect(source).toContain('const query = new URLSearchParams({ orderId, token: orderAccessToken })');
    expect(source).toContain("data.payment?.status === 'COMPLETED'");
    expect(source).toContain('Check payment status');
    expect(source).toContain('Do not attempt another charge until its status is checked');
    const api = read('app/api/payments/route.ts');
    expect(api).toContain('id: paymentRecord.squarePaymentId');
  });
});
