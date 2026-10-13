import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { addToCart } from '@/lib/cart-engine';
import { resolveProductAvailability } from '@/lib/product-availability';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
afterEach(() => vi.unstubAllGlobals());

describe('one canonical Taste of Gratitude purchase and receipt journey', () => {
  it('hands QR visitors to the shared cart instead of keeping a detached local cart', () => {
    const legacyMenu = source('app/order/menu/page.tsx');
    const landing = source('app/order/start/page.tsx');
    expect(legacyMenu).toContain('redirect(`/catalog?');
    expect(legacyMenu).not.toContain('useState<CartItem[]>');
    expect(landing).toContain('/catalog?source=market-qr');
    expect(landing).not.toContain('/order/menu?market=');
  });

  it('retains only the canonical order and payment APIs', () => {
    const checkout = source('components/checkout/CheckoutRoot.tsx');
    const alias = source('app/order/checkout/page.tsx');
    const order = source('app/api/orders/create/route.js');
    const legacyApi = source('app/api/checkout/route.ts');
    expect(checkout).toContain('CartAPI.subscribe');
    expect(alias).toContain("redirect('/checkout')");
    expect(order).toContain('createOrReuseCheckoutOrder');
    expect(order).toContain('CHECKOUT_KEY_REQUIRED');
    expect(legacyApi).toContain('CHECKOUT_PATH_DEPRECATED');
  });

  it('does not give old market receipts a separate paid-state decision', () => {
    const legacyReceipt = source('app/order/complete/page.tsx');
    const canonical = source('app/order/success/page-enhanced.js');
    expect(legacyReceipt).toContain('/order/success?orderRef=');
    expect(legacyReceipt).not.toContain('Payment Successful!');
    expect(canonical).toContain('Payment Not Yet Verified');
  });

  it('does not report successful cart adds when the browser cannot persist the cart', () => {
    vi.stubGlobal('window', {
      localStorage: {
        setItem: () => { throw new Error('storage denied'); },
        removeItem: () => {},
      },
    });
    const outcome = addToCart({
      id: 'test-item', name: 'Test item', price: 11.99, quantity: 1,
      checkoutReady: true, variationId: 'test-variation',
    });
    expect(outcome.success).toBe(false);
    expect(outcome.error).toMatch(/storage/i);
  });

  it('never interprets unavailable stock as merchant-approved preorder', () => {
    const result = resolveProductAvailability({
      id: 'test-item', name: 'Test item', price: 12,
      checkoutReady: true, stock: 0, weeklyStatus: 'active', activeWeeklyMenu: true,
    });
    expect(result.canOrder).toBe(false);
    expect(result.canMarketPreorder).toBe(false);
  });
});
