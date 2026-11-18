import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = (file: string) => readFileSync(file, 'utf8');

describe('personal ordering vs market preorder clarity', () => {
  it('offers personal delivery and non-market pickup with honest confirmation language', () => {
    const home = source('components/home/HomePageClient.jsx');
    expect(home).toContain('Fresh favorites. No market trip needed.');
    expect(home).toContain('Start an order');
    expect(home).toContain('href="/order-request"');
    expect(home).toContain('Start a delivery order');
    expect(home).toContain('Ask about neighborhood pickup');
    expect(home).toContain('href="/catalog"');
    expect(home).toContain('href="/contact?request=non-market-pickup"');
    expect(home).toContain('Monday Browns Mill pickup is by request only.');
    expect(home).toContain('We’ll confirm the details and total before you pay.');
  });

  it('keeps market preorders separate from requested Monday neighborhood pickup', () => {
    const nav = source('components/Header.jsx');
    const tabs = source('components/checkout/FulfillmentTabs.tsx');
    const form = source('components/checkout/PickupForm.tsx');
    const checkout = source('components/checkout/CheckoutRoot.tsx');
    expect(nav).toContain("label: 'Order for Yourself'");
    expect(nav).toContain("label: 'Market Preorders'");
    expect(tabs).toContain('Your cart includes items available for market pickup only.');
    expect(form).toContain('Request a Monday 12–5 PM pickup in the Browns Mill area.');
    expect(form).toContain('The exact location and time will be confirmed by our team before you pay.');
    expect(form).toContain('Market preorder pickup is a separate process');
    expect(checkout).toContain('Browns Mill-area Monday pickup');
    expect(checkout).toContain('No payment is taken on this website for regular orders.');
    expect(checkout).toContain('send a Square payment link.');
  });

  it('provides a conditional delivery guide and prefills the non-market pickup inquiry', () => {
    const shop = source('components/catalog/CatalogPageClient.jsx');
    const contact = source('app/contact/page.js');
    expect(shop).toContain('No market visit needed.');
    expect(shop).toContain('Enter your complete address in checkout');
    expect(shop).toContain('Only eligible items and confirmed options');
    expect(shop).toContain('Online appointment booking is not open yet.');
    expect(contact).toContain("'non-market-pickup'");
    expect(contact).toContain("subject: 'Question about Monday Browns Mill pickup'");
    expect(contact).toContain('Monday pickup between 12 and 5 PM near Browns Mill is available?');
  });
});
