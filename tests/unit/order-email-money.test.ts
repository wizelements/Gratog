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

  it('uses the explicitly confirmed pickup market and window safely', () => {
    const html = generateFulfillmentSection({
      fulfillment: { type: 'pickup', pickup: { locationName: 'Test & Market', window: '1:00–2:00 PM' } },
    });
    expect(html).toContain('Test &amp; Market');
    expect(html).toContain('1:00–2:00 PM');
    expect(html).not.toContain('Serenbe Farmers Market');
  });
});
