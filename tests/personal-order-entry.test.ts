import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = (file: string) => readFileSync(file, 'utf8');

describe('personal ordering vs market preorder clarity', () => {
  it('makes personal delivery and non-market pickup the hero paths', () => {
    const home = source('components/home/HomePageClient.jsx');
    expect(home).toContain('No market trip required.');
    expect(home).toContain('Start a delivery order');
    expect(home).toContain('Request non-market pickup');
    expect(home).toContain('href="/catalog"');
    expect(home).toContain('href="/contact?request=non-market-pickup"');
    expect(home).toContain('not an online reservation yet');
    expect(home).toContain('Booking is not live');
  });

  it('explains that market pickup is optional and NOT the neighborhood pickup option', () => {
    const nav = source('components/Header.jsx');
    const tabs = source('components/checkout/FulfillmentTabs.tsx');
    const form = source('components/checkout/PickupForm.tsx');
    const checkout = source('components/checkout/CheckoutRoot.tsx');
    expect(nav).toContain("label: 'Order for Yourself'");
    expect(nav).toContain("label: 'Market Preorders'");
    expect(tabs).toContain("label: 'Market pickup'");
    expect(form).toContain('Browns Mill-area pickup outside a market');
    expect(form).toContain('href="/contact?request=non-market-pickup"');
    expect(checkout).toContain('The Pickup option in this checkout currently means a participating market');
  });

  it('makes the catalog guide actionable and delivery conditional on validation', () => {
    const shop = source('components/catalog/CatalogPageClient.jsx');
    const contact = source('app/contact/page.js');
    expect(shop).toContain('No market visit needed.');
    expect(shop).toContain('Enter your complete address in checkout');
    expect(shop).toContain('Only eligible items and confirmed options');
    expect(contact).toContain("'non-market-pickup'");
    expect(contact).toContain("subject: 'Browns Mill non-market pickup request'");
    expect(contact).toContain('Please confirm the available appointment and meeting location before I order.');
  });
});
