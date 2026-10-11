import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { checkoutOrderIdempotencyKey, clearCheckoutOrderAttempt } from '@/lib/checkout/order-attempt';
import { computeTotals } from '@/adapters/totalsAdapter';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    values,
  };
}

describe('checkout order integrity and recovery', () => {
  beforeEach(() => clearCheckoutOrderAttempt(null));

  it('uses one retry key for a lost response and rotates it on a changed cart', async () => {
    const storage = memoryStorage();
    const first = await checkoutOrderIdempotencyKey({
      cart: [{ id: 'gel', quantity: 1 }], email: 'customer@example.test'
    }, storage, 1000);
    const repeat = await checkoutOrderIdempotencyKey({
      cart: [{ id: 'gel', quantity: 1 }], email: 'customer@example.test'
    }, storage, 2000);
    const different = await checkoutOrderIdempotencyKey({
      cart: [{ id: 'gel', quantity: 2 }], email: 'customer@example.test'
    }, storage, 3000);
    expect(first).toMatch(/^[a-f0-9-]{36}$/);
    expect(repeat).toBe(first);
    expect(different).not.toBe(first);
    expect([...storage.values.values()].join('')).not.toContain('customer@example.test');
  });

  it('expires old attempts rather than replaying an unrelated purchase', async () => {
    const storage = memoryStorage();
    const old = await checkoutOrderIdempotencyKey({ cart: ['gel'] }, storage, 1000);
    const next = await checkoutOrderIdempotencyKey({ cart: ['gel'] }, storage, 21 * 60 * 1000 + 1000);
    expect(next).not.toBe(old);
    clearCheckoutOrderAttempt(storage);
    expect(storage.values.size).toBe(0);
  });

  it('prevents an old delivery tip from following the customer into shipping or pickup', () => {
    const cart = [{ id: 'gel', quantity: 1, price: 36 }] as any;
    const delivery = computeTotals({ cart, fulfillmentType: 'delivery', tip: 7, deliveryFee: 5 });
    const shipping = computeTotals({ cart, fulfillmentType: 'shipping', tip: 7, shippingFee: 8.99 });
    const pickup = computeTotals({ cart, fulfillmentType: 'pickup', tip: 7 });
    expect(delivery.total).toBe(48);
    expect(shipping.tip).toBe(0);
    expect(shipping.total).toBe(44.99);
    expect(pickup.tip).toBe(0);
    expect(pickup.total).toBe(36);
  });

  it('never reads browser persisted state in the initial SSR checkout render', () => {
    const store = read('stores/checkout.ts');
    const start = store.indexOf('export const useCheckoutStore = create');
    const hydrate = store.indexOf('hydrateFromStorage: () =>', start);
    expect(store.slice(start, hydrate)).not.toContain('loadPersistedState()');
    expect(store.slice(start, hydrate)).not.toContain('CartAPI.getCart()');
    expect(store).toContain("stage: 'cart',\n    hydrated: false");
    expect(read('components/checkout/CheckoutRoot.tsx')).toContain('hydrateFromStorage();');
  });

  it('passes a stable order creation idempotency header and blocks rapid duplicates', () => {
    expect(read('services/order.ts')).toContain("'Idempotency-Key': idempotencyKey");
    expect(read('components/checkout/ReviewAndPay.tsx')).toContain('if (orderRequestInFlight.current) return;');
    expect(read('components/checkout/ReviewAndPay.tsx')).toContain('clearCheckoutOrderAttempt();');
  });

  it('requires completed rather than merely approved payment and server-authoritative totals', () => {
    const api = read('app/api/payments/route.ts');
    expect(api).toContain("const isCompleted = payment.status === 'COMPLETED';");
    expect(api).toContain("code: 'INVALID_SERVER_ORDER_TOTAL'");
    expect(api).toContain("code: 'PAYMENT_CAPTURE_PENDING'");
    expect(api).not.toContain('Order has no valid total, using client amount');
    expect(api).not.toContain("details: error instanceof Error ? error.message : 'Unknown error'");
  });

  it('invalidates a delivery quote when customer edits an address', () => {
    const source = read('components/checkout/DeliveryForm.tsx');
    expect(source).toContain('quoteRevision.current += 1');
    expect(source).toContain('requestedRevision !== quoteRevision.current');
  });
});
