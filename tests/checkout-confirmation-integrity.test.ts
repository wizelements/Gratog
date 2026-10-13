import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isServerVerifiedPaidOrder } from '@/lib/checkout/order-confirmation';

describe('customer confirmation page cannot be forged', () => {
  it('never considers Square authorization, unknown state, or pending state captured', () => {
    for (const state of [undefined, '', 'APPROVED', 'PENDING', 'pending', 'processing', 'FAILED', 'CANCELED']) {
      expect(isServerVerifiedPaidOrder({ paymentStatus: state })).toBe(false);
      expect(isServerVerifiedPaidOrder({ payment: { status: state } })).toBe(false);
    }
  });
  it('recognizes server-captured payment evidence', () => {
    for (const state of ['paid', 'PAID', 'COMPLETED']) {
      expect(isServerVerifiedPaidOrder({ paymentStatus: state })).toBe(true);
    }
  });
  it('does not call refunded, partially refunded or cancelled orders successfully paid', () => {
    for (const status of ['REFUNDED', 'PARTIALLY_REFUNDED', 'CANCELLED', 'CANCELED']) {
      expect(isServerVerifiedPaidOrder({ status, paymentStatus: 'PAID' })).toBe(false);
    }
  });

  it('cannot show paid for a missing order', () => {
    expect(isServerVerifiedPaidOrder(null)).toBe(false);
  });
  it('returns the same authorized order ID the receipt and pickup queue use', () => {
    const route = readFileSync(resolve(process.cwd(), 'app/api/orders/by-ref/route.js'), 'utf8');
    expect(route).toContain('id: order.id,');
    expect(route).toContain('order.customer?.email || order.customerEmail');
    expect(route).toContain('name: order.customer?.name || order.customerName');
  });

  it('never uses URL paid=true or amount as confirmation or fallback', () => {
    const page = readFileSync(resolve(process.cwd(), 'app/order/success/page-enhanced.js'), 'utf8');
    expect(page).not.toContain("searchParams.get('paid')");
    expect(page).not.toContain("searchParams.get('amount')");
    expect(page).not.toContain('Your payment was confirmed.');
    expect(page).toContain('isServerVerifiedPaidOrder(order)');
    expect(page).toContain('Payment Not Yet Verified');
    expect(page).toContain('We cannot confirm payment was received.');
  });
});
