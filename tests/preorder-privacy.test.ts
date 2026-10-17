import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateOrderAccessToken } from '@/lib/order-access-token';
import { preorderViewerHasPrivateAccess, publicPreorderStatus } from '@/lib/preorder/status-access';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const privatePreorder = {
  orderNumber: 'PRE-privacy-001',
  waitlistNumber: 'W-0001',
  status: 'PENDING_PAYMENT',
  paymentStatus: 'PENDING',
  customerEmail: 'private@example.test',
  customerPhone: '4045550100',
  customerName: 'Private Shopper',
  items: [{ name: 'Elderberry Gel', price: 36 }],
  total: 36,
  paymentUrl: 'https://squareup.com/checkout/secret',
  marketId: 'market-a',
  queuePosition: 2,
  pickupLocation: 'Georgia Market',
  pickupDate: 'Saturday',
  pickupHours: '10–2',
};

describe('preorder privacy and ownership', () => {
  it('never reveals contact information, purchases, totals or pay links in public response', () => {
    const status = publicPreorderStatus(privatePreorder, 'Awaiting payment.', null);
    const raw = JSON.stringify(status);
    for (const value of ['private@example.test', '4045550100', 'Private Shopper',
      'Elderberry Gel', 'squareup.com', '"total":', '"items":', '"paymentUrl":']) {
      expect(raw).not.toContain(value);
    }
    expect(status.waitlistNumber).toBe('W-0001');
    expect(status.privateDetailsAvailable).toBe(false);
  });

  it('only accepts signed proof scoped to the exact preorder and customer email', () => {
    const good = generateOrderAccessToken({
      orderId: privatePreorder.orderNumber,
      customerEmail: privatePreorder.customerEmail,
      ttlMs: 60 * 60 * 1000,
    });
    expect(good).toBeTruthy();
    expect(preorderViewerHasPrivateAccess(privatePreorder, good)).toBe(true);
    expect(preorderViewerHasPrivateAccess({ ...privatePreorder, orderNumber: 'PRE-other' }, good)).toBe(false);
    expect(preorderViewerHasPrivateAccess({ ...privatePreorder, customerEmail: 'other@example.test' }, good)).toBe(false);
    expect(preorderViewerHasPrivateAccess(privatePreorder, null)).toBe(false);
    expect(preorderViewerHasPrivateAccess(privatePreorder, good + 'tamper')).toBe(false);
  });

  it('gates both public GET routes and never exposes a public phone-number lookup', () => {
    const statusApi = read('app/api/preorder/status/route.ts');
    const preorderApi = read('app/api/preorder/route.ts');
    expect(statusApi).toContain('if (!allowed)');
    expect(statusApi).toContain('publicPreorderStatus(preorder');
    expect(statusApi).toContain("request.headers.get('x-order-access-token')");
    expect(statusApi).not.toContain('findPreorderByPhone(');
    expect(preorderApi).toContain('if (!privateAccess)');
    expect(preorderApi).toContain('publicPreorderStatus(preorder');
  });

  it('keeps the buyer signed token in session storage, never in redirect URL', () => {
    const client = read('app/preorder/PreorderClientPage.tsx');
    const status = read('app/preorder/status/page.tsx');
    expect(client).toContain('sessionStorage.setItem(');
    expect(client).toContain('data.preorderAccessToken');
    expect(status).toContain("'x-order-access-token': token");
    expect(client).not.toContain('nextPaymentUrl + data.preorderAccessToken');
  });
});
