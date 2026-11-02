import { describe, expect, it } from 'vitest';
import { POST as lock } from '@/app/api/inventory/lock/route';
import { POST as confirm } from '@/app/api/inventory/confirm/route';
import { POST as release } from '@/app/api/inventory/release/route';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('retired unauthenticated inventory mutation API', () => {
  it.each([
    ['create', lock], ['confirm', confirm], ['release', release],
  ])('refuses to %s customer stock directly', async (_name, handler) => {
    const response = await handler();
    expect(response.status).toBe(410);
    const result = await response.json();
    expect(result.success).toBe(false);
    expect(result.code).toBe('LEGACY_INVENTORY_MUTATION_RETIRED');
  });

  it('all captured payments must have been atomically reserved first', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/api/payments/route.ts'), 'utf8');
    expect(source.indexOf('reserveCheckoutInventory(db, client')).toBeGreaterThan(-1);
    expect(source.indexOf('reserveCheckoutInventory(db, client'))
      .toBeLessThan(source.indexOf('const paymentResult = await createPayment('));
    expect(source).toContain('requireReservation: Boolean(order.checkoutAttemptKey)');
    expect(source).toContain('PAYMENT_RECONCILIATION_REQUIRED');
  });

  it('Square webhooks cannot overwrite held stock or trust a captured amount without checking it', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/api/webhooks/square/route.ts'), 'utf8');
    expect(source).toContain('squareReportedStock: currentStock');
    expect(source).toContain('assertExactCapturedPayment(order, payment)');
    const sharedAmountCheck = readFileSync(resolve(process.cwd(), 'lib/checkout/provider-payment-amount.ts'), 'utf8');
    expect(sharedAmountCheck).toContain('amount !== expected');
    expect(source).toContain('requireReservation: true');
  });
});
