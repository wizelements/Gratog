import { describe, expect, it } from 'vitest';
import { assertExactCapturedPayment } from '@/lib/checkout/provider-payment-amount';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('verified payment before marking orders paid', () => {
  const payment = (amount: number, currency = 'USD') => ({
    status: 'COMPLETED', amount_money: { amount, currency },
  });

  it('accepts the exact regular checkout captured total', () => {
    expect(() => assertExactCapturedPayment({ totalCents: 1199 }, payment(1199))).not.toThrow();
  });

  it('accepts a market preorder priced in server-owned dollars', () => {
    expect(() => assertExactCapturedPayment({ total: 36 }, payment(3600))).not.toThrow();
    expect(() => assertExactCapturedPayment({ total: 11.99 }, payment(1199))).not.toThrow();
  });

  it('refuses deposits, short payments, tampered totals and incorrect currency', () => {
    for (const paid of [3500, 1, 3601, 0, NaN]) {
      expect(() => assertExactCapturedPayment({ total: 36 }, payment(paid))).toThrow(/amount or currency/);
    }
    expect(() => assertExactCapturedPayment({ total: 36 }, payment(3600, 'CAD'))).toThrow();
    expect(() => assertExactCapturedPayment({}, payment(3600))).toThrow();
    expect(() => assertExactCapturedPayment({ totalCents: 3600 }, { status: 'COMPLETED' })).toThrow();
  });

  it('enforces this check before webhook status changes for all orders', () => {
    const route = readFileSync(resolve(process.cwd(), 'app/api/webhooks/square/route.ts'), 'utf8');
    const callback = route.slice(route.indexOf('async function handlePaymentUpdated'));
    const assertion = callback.indexOf('assertExactCapturedPayment(order, payment)');
    const statusUpdate = callback.indexOf('updateOrderStatusSafe(db, order.id, newOrderStatus');
    expect(assertion).toBeGreaterThanOrEqual(0);
    expect(statusUpdate).toBeGreaterThan(assertion);
    // Inventory claim reconciliation is correctly scoped to newer orders;
    // payment amount validation itself must NOT be scoped to them.
    expect(callback).toContain('if (isCompleted) assertExactCapturedPayment(order, payment);');
  });
});
