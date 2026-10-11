import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mock = vi.hoisted(() => ({ priceCart: vi.fn() }));
vi.mock('@/lib/cart-pricing', () => ({
  priceCart: mock.priceCart,
  CartPricingError: class CartPricingError extends Error {
    status = 400;
    code = 'PRICE_ERROR';
  },
}));
import { POST } from '@/app/api/cart/price/route';

function request(lines: unknown): NextRequest {
  return new NextRequest('http://localhost/api/cart/price', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lines }),
  });
}

beforeEach(() => mock.priceCart.mockReset());

describe('read-only canonical cart price preview', () => {
  it.each([
    [], [ { variationId: 'V', qty: 0 } ], [ { variationId: 'V', qty: -1 } ],
    [ { variationId: 'V', qty: 1.5 } ], [ { variationId: 'V', qty: 51 } ],
    [ { variationId: '', qty: 1 } ], [ { variationId: 1, qty: 1 } ],
  ])('rejects invalid cart lines %# before calling any paid service', async (lines) => {
    expect((await POST(request(lines))).status).toBe(400);
    expect(mock.priceCart).not.toHaveBeenCalled();
  });

  it('calls the actual authoritative pricing function, never trusts client monetary amounts', async () => {
    mock.priceCart.mockResolvedValue({
      subtotalCents: 3600, taxCents: 0, totalCents: 3600, currency: 'USD',
      items: [{ variationId: 'V1', name: 'Sea Moss', quantity: 1, unitPriceCents: 3600, lineTotalCents: 3600 }],
    });
    const response = await POST(request([{ variationId: 'V1', qty: 1, price: 0.01 }]));
    expect(response.status).toBe(200);
    expect(mock.priceCart).toHaveBeenCalledWith({ items: [{ variationId: 'V1', quantity: 1 }] });
    expect((await response.json()).pricing.subtotalCents).toBe(3600);
  });
});
