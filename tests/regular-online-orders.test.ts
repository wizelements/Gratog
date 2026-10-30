import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('regular Georgia customers can order without selecting a market', () => {
  it('separates online shopping from market preorders in primary navigation', () => {
    const nav = read('components/Header.jsx');
    expect(nav).toContain("{ href: '/catalog', label: 'Order for Yourself' }");
    expect(nav).toContain("{ href: '/preorder', label: 'Market Pickup & Pay' }");
    expect(nav).toContain("{ href: '/order-help', label: 'Chat to Order' }");
  });

  it('gives standard shoppers a direct shopping route from the homepage and catalog', () => {
    const home = read('components/home/HomePageClient.jsx');
    const catalog = read('components/catalog/CatalogPageClient.jsx');
    expect(home).toContain('<Link href="/catalog">Browse the full shop</Link>');
    expect(home).toContain('<Link href="/order-help">Chat about preorder or delivery</Link>');
    expect(home).toContain('<Link href="/preorder">Market pickup &amp; pay');
    expect(catalog).toContain('No market visit required for eligible orders');
    expect(catalog).toContain('Enter your complete address in checkout');
  });

  it('defaults new online checkouts to shipping without changing the separate pickup-only journey', () => {
    const store = read('stores/checkout.ts');
    const checkout = read('components/checkout/CheckoutRoot.tsx');
    expect(store).toMatch(/const initialFulfillment: FulfillmentData = \{\s*\/\/[^\n]*\n\s*\/\/[^\n]*\n\s*type: 'shipping'/);
    expect(checkout).toContain('item.isPreorder || item.marketExclusive');
    expect(checkout).toContain("type: 'pickup'");
    expect(checkout).toContain('<ShippingForm');
    expect(checkout).toContain('<DeliveryForm');
    expect(checkout).toContain('validateGeorgiaDestination');
  });

  it('rejects market-only products server-side using catalog flags, never trusting cart flags alone', () => {
    const pricing = read('lib/cart-pricing.ts');
    const orderRoute = read('app/api/orders/create/route.js');
    expect(pricing).toContain('product.marketExclusive');
    expect(pricing).toContain('product.marketPickupOnly');
    expect(pricing).toContain('product.preorderOnly');
    expect(orderRoute).toContain('MARKET_PICKUP_REQUIRED');
    expect(orderRoute).toContain('basePricing.items.some((line) => line.isPreorder || line.marketExclusive)');
    expect(orderRoute).toContain('validateGeorgiaDestination');
    const cartEngine = read('lib/cart-engine.ts');
    expect(cartEngine).toContain('product.marketPickupOnly === true');
    expect(cartEngine).toContain('product.preorderOnly');
  });

  it('does not imply statewide shipping of every product', () => {
    const catalog = read('components/catalog/CatalogPageClient.jsx');
    const home = read('components/home/HomePageClient.jsx');
    expect(catalog).toContain('Only eligible items and confirmed options can proceed to payment.');
    expect(home).toContain('delivery eligibility and fees must be confirmed before payment');
    expect(catalog).not.toMatch(/nationwide shipping|all (?:products|items) ship/i);
  });
});
