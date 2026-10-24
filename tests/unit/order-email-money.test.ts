import { describe, expect, it } from 'vitest';
import { generateOrderEmailText, generateFulfillmentSection } from '@/lib/resend-email';

describe('customer order email monetary truth', () => {
  it('uses the same $11.99 priced total as the HTML template when total is nested', () => {
    const text = generateOrderEmailText({
      id: 'sandbox-test',
      pricing: { total: 11.99 },
      items: [{ name: 'Strawberry Bliss', price: 11.99, quantity: 1 }],
    }, 'confirmation');
    expect(text).toContain('Total: $11.99');
    expect(text).not.toContain('Total: $0.00');
  });

  it('preserves an explicit zero total rather than substituting items', () => {
    const text = generateOrderEmailText({ id: 'free', total: 0, pricing: { total: 11.99 } }, 'confirmation');
    expect(text).toContain('Total: $0.00');
  });
});

describe('customer receipt fulfillment accuracy', () => {
  it('does not invent a market/date/booth when the checkout has no confirmed pickup slot', () => {
    const html = generateFulfillmentSection({ fulfillment: { type: 'pickup' } });
    expect(html).toContain('team will confirm');
    expect(html).not.toContain('Serenbe Farmers Market');
    expect(html).not.toContain('This Saturday');
    expect(html).not.toContain('Thursday - Order Received');
  });

  it('renders actual appointment location and Eastern time without a fictional market', () => {
    const html = generateFulfillmentSection({
      fulfillmentType: 'pickup_appointment',
      fulfillment: { type: 'pickup', pickup: {
        mode: 'appointment',
        locationName: 'Test & Pickup',
        locationAddress: {street: '100 Cedar St',city: 'Atlanta',state: 'GA',zip: '30331'},
        date: '2026-11-04T17:00:00.000Z',
        windowEndsAt: '2026-11-04T18:00:00.000Z',
        arrivalInstructions: '<Bring receipt>',
      } },
    });
    expect(html).toContain('Scheduled non-market pickup');
    expect(html).toContain('Test &amp; Pickup');
    expect(html).toContain('100 Cedar St, Atlanta, GA, 30331');
    expect(html).toContain('November 4, 2026');
    expect(html).toContain('ET');
    expect(html).toContain('&lt;Bring receipt&gt;');
    expect(html).not.toContain('Serenbe');
    expect(html).not.toContain('This Saturday');
  });
  it('never invents an appointment location when missing its server snapshot', () => {
    const html = generateFulfillmentSection({
      fulfillmentType: 'pickup_appointment', fulfillment: {type:'pickup',pickup:{mode:'appointment'}}
    });
    expect(html).toContain('Please do not travel until confirmed');
    expect(html).not.toContain('Serenbe Farmers Market');
  });
  it('avoids false delivery and parcel ETA promises', () => {
    const local = generateFulfillmentSection({
      fulfillmentType:'delivery',
      deliveryAddress:{street:'110 N Main',city:'Atlanta',state:'GA',zip:'30331'},
      deliveryTimeSlot:'12-15'
    });
    expect(local).toContain('Local delivery request');
    expect(local).toContain('12-15');
    expect(local).not.toContain('2-3 Business Days');
    expect(local).not.toContain('tracking information');
    const parcel = generateFulfillmentSection({
      fulfillmentType:'shipping',
      shippingAddress:{street:'110 N Main',city:'Savannah',state:'GA',zip:'31401'},
      shippingService:'Example Carrier Service'
    });
    expect(parcel).toContain('Savannah');
    expect(parcel).toContain('Example Carrier Service');
    expect(parcel).not.toContain('2-3 business days');
    expect(parcel).toContain('after a carrier label has been purchased');
  });
  it('uses the explicitly confirmed pickup market and window safely', () => {
    const html = generateFulfillmentSection({
      fulfillment: { type: 'pickup', pickup: { locationName: 'Test & Market', window: '1:00–2:00 PM' } },
    });
    expect(html).toContain('Test &amp; Market');
    expect(html).toContain('1:00–2:00 PM');
    expect(html).not.toContain('Serenbe Farmers Market');
  });
});
