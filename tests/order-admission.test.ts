import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateCheckoutFulfillment, findUnapprovedCurrentMenuItem, validateItemizedOrder } from '../lib/order-admission';
import { approvedUnitPriceCents } from '../lib/merchant-pricing';

const pickup = { fulfillmentType: 'pickup_market', pickup: { locationId: 'serenbe', date: '2026-11-07T09:00:00.000Z' } };
const delivery = { fulfillmentType: 'delivery', deliveryAddress: { street: '123 Main St', city: 'Atlanta', state: 'GA', zip: '30331' }, deliveryTimeSlot: '12:00-14:00' };
const shipping = { fulfillmentType: 'shipping', shippingAddress: { street: '123 Main St', city: 'Atlanta', state: 'GA', zip: '30331' }, shippingMethod: 'verified-method' };
const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('fail-closed commerce and fulfillment', () => {
  it.each([null, undefined, '', 'bogus', 'pickup_unknown'])('rejects missing or unsupported method %s', (method) => {
    expect(validateCheckoutFulfillment({ fulfillmentType: method }).valid).toBe(false);
    expect(validateCheckoutFulfillment({ fulfillmentType: method }).code).toBe('FULFILLMENT_SELECTION_REQUIRED');
  });
  it('rejects contradictory customer fulfillment fields and accepts persisted pickup Date', () => {
    expect(validateCheckoutFulfillment({
      fulfillmentType: 'delivery',
      fulfillment: { type: 'pickup', pickup: { locationId: 'market', date: '2026-11-07' } },
    }).code).toBe('FULFILLMENT_CONFLICT');
    expect(validateCheckoutFulfillment({
      fulfillmentType: 'pickup_market',
      fulfillment: { type: 'pickup', pickup: { locationId: 'market', date: new Date('2026-11-07') } },
    }).valid).toBe(true);
  });
  it('requires date and place for pickup; never assumes market pickup', () => {
    expect(validateCheckoutFulfillment({ fulfillmentType: 'pickup' }).code).toBe('PICKUP_DETAILS_REQUIRED');
    expect(validateCheckoutFulfillment({ ...pickup, pickup: { locationId: 'serenbe' } }).valid).toBe(false);
    expect(validateCheckoutFulfillment(pickup).valid).toBe(true);
  });
  it('requires full address and scheduled window for delivery', () => {
    expect(validateCheckoutFulfillment({ fulfillmentType: 'delivery' }).valid).toBe(false);
    expect(validateCheckoutFulfillment({ ...delivery, deliveryTimeSlot: '' }).code).toBe('DELIVERY_WINDOW_REQUIRED');
    expect(validateCheckoutFulfillment(delivery).valid).toBe(true);
  });
  it('requires complete shipping address and method', () => {
    expect(validateCheckoutFulfillment({ ...shipping, shippingMethod: '' }).valid).toBe(false);
    expect(validateCheckoutFulfillment(shipping).valid).toBe(true);
  });
  it('honors persisted fulfillment shape for existing orders', () => {
    expect(validateCheckoutFulfillment({ fulfillment: { type: 'pickup', pickup: { locationId: 'market', date: '2026-11-07T12:00:00Z' } } }).valid).toBe(true);
    expect(validateCheckoutFulfillment({ fulfillment: { type: 'pickup' } }).valid).toBe(false);
  });
  it.each(['Black Minerals', 'Peach Lemonade', 'Healing Harmony Sea Moss Gel', 'Soursop Spice Sea Moss Gel'])('blocks retired selections %s', (name) => {
    expect(findUnapprovedCurrentMenuItem([{ name, category: name.includes('Gel') ? 'gels' : 'lemonades' }])).not.toBeNull();
  });
  it.each(['Calm Waters', 'SuppleMint', 'Gracious Roots', 'Kissed by Gods', 'Melon Rita', 'Passion Guava Pineapple Lemonade', 'Passion Fruit Guava Pineapple Lemon'])('permits six approved lemonade aliases %s', (name) => {
    expect(findUnapprovedCurrentMenuItem([{ name, category: 'lemonades' }])).toBeNull();
  });
  it.each(['Calm Waters', 'SuppleMint', 'Gracious Roots', 'Kissed by Gods', 'Melon Rita', 'Passion Guava Pineapple Lemonade'])('charges current 16oz lemonade %s at $11.99', (name) => {
    expect(approvedUnitPriceCents({ name })).toBe(1199);
  });
  it('hides legacy Square sea-moss catalog labels outside Soursop Chai', () => {
    expect(findUnapprovedCurrentMenuItem([{name:'Blue Lotus',category:'sea-moss'}])).not.toBeNull();
    expect(findUnapprovedCurrentMenuItem([{name:'Soursop Chai Gel',category:'sea-moss'}])).toBeNull();
  });
  it('permits Soursop Chai gel and preserves separately approved juices', () => {
    expect(findUnapprovedCurrentMenuItem([{ name: 'Soursop Chai Gel', category: 'gels' }])).toBeNull();
    expect(findUnapprovedCurrentMenuItem([{ name: 'APG — Always Pursue Gratitude', category: 'juices' }])).toBeNull();
  });
  it.each(['Berry Zinger', 'Desert Glow', 'Peach Refresher', 'Rejuvenate', 'Vitamin Sea', 'Blue Lotus', 'Gratitude Defense', 'Golden Glow Gel'])('blocks unapproved Square specials %s', (name) => {
    expect(findUnapprovedCurrentMenuItem([{ name, category: 'specials' }])).not.toBeNull();
  });
  it.each(['Always Pursue Gratitude', 'APG — Always Pursue Gratitude', 'Herbal Vibe', 'Herbal Vibes', 'Soursop Chai Gel'])('accepts approved juices and gel %s', (name) => {
    expect(findUnapprovedCurrentMenuItem([{ name, category: 'specials' }])).toBeNull();
  });
  it('enforces approved bottled juice prices', () => {
    expect(approvedUnitPriceCents({ name: 'Always Pursue Gratitude' })).toBe(1299);
    expect(approvedUnitPriceCents({ name: 'Herbal Vibe' })).toBe(1599);
  });
  it('blocks stale square IDs even when the display title is changed', () => {
    expect(findUnapprovedCurrentMenuItem([{ productId: 'healing-harmony-gel', name: 'Available Gel' }])).not.toBeNull();
  });
  it('rejects missing product names, quantities and empty order lines before charging', () => {
    expect(validateItemizedOrder([]).code).toBe('ORDER_ITEMS_REQUIRED');
    expect(validateItemizedOrder([{ name: '', quantity: 1 }]).code).toBe('ORDER_ITEM_DETAILS_REQUIRED');
    expect(validateItemizedOrder([{ name: 'SuppleMint', quantity: 0 }]).valid).toBe(false);
    expect(validateItemizedOrder([{ name: 'SuppleMint', quantity: 1 }]).valid).toBe(true);
    expect(read('app/api/payments/route.ts')).toContain('validateItemizedOrder(order.items)');
  });
  it('enforces independent admission at order creation, authoritative pricing, and payment', () => {
    expect(read('app/api/orders/create/route.js')).toContain('validateCheckoutFulfillment(orderData)');
    expect(read('app/api/payments/route.ts')).toContain('validateCheckoutFulfillment(order)');
    expect(read('app/api/payments/route.ts')).toContain('findUnapprovedCurrentMenuItem(order.items)');
    expect(read('lib/cart-pricing.ts')).toContain('findUnapprovedCurrentMenuItem([product])');
  });
  it('does not default Square sync orders with absent fulfillment to pickup or delivered', () => {
    const sync = read('lib/square-orders-sync.js');
    expect(sync).toContain("let fulfillmentType = 'unconfirmed'");
    expect(sync).not.toContain("if (state === 'COMPLETED') status = 'delivered'");
  });
  it('flags unconfirmed fulfillment in the admin UI', () => {
    const admin = read('app/admin/orders/page.js');
    expect(admin).toContain('Fulfillment needs confirmation');
    expect(admin).toContain('Needs details');
    expect(admin).toContain("if (!['pickup', 'delivery'].includes(fulfillmentType)) return null");
  });
});
