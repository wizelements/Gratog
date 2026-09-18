import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as validateCart } from '@/app/api/cart/route';
import { validatePreorderMinimum } from '@/lib/cart-engine';

const singleWeeklyItem = {
  id: 'weekly-1',
  productId: 'weekly-1',
  variationId: 'variation-1',
  catalogObjectId: 'variation-1',
  name: 'Weekly Bottle',
  slug: 'weekly-bottle',
  image: '/weekly.jpg',
  category: 'drinks',
  price: 11.99,
  priceCents: 1199,
  quantity: 1,
  addedAt: '2026-09-18T00:00:00.000Z',
  isPreorder: true,
  marketExclusive: false,
};

describe('weekly market preorder checkout', () => {
  it('allows a single weekly preorder item through normal cart validation', async () => {
    const request = new NextRequest('http://localhost/api/cart', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        items: [singleWeeklyItem],
        fulfillmentType: 'pickup',
        marketId: 'serenbe',
      }),
    });

    const response = await validateCart(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.valid).toBe(true);
    expect(body.totals.subtotal).toBeCloseTo(11.99, 2);
    expect(body.preorderValidation).toBeUndefined();
  });

  it('retains the legacy bulk preorder minimum helper for the dedicated bulk flow', () => {
    const result = validatePreorderMinimum([singleWeeklyItem]);
    expect(result.valid).toBe(false);
    expect(result.minimumRequired).toBe(60);
  });
});
