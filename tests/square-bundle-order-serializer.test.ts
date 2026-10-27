import { afterEach, describe, expect, it, vi } from 'vitest';
import { createOrder } from '@/lib/square-api';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('Square Order API pack discounts (no network access)', () => {
  it.each([
    { bottles: 4, discountCents: 397, payableCents: 4399 },
    { bottles: 6, discountCents: 895, payableCents: 6299 },
  ])('sends approved $payableCents Square order total for $bottles bottles', async ({ bottles, discountCents, payableCents }) => {
    vi.stubEnv('SQUARE_ENVIRONMENT', 'sandbox');
    vi.stubEnv('SQUARE_ACCESS_TOKEN', 'test-only-sandbox-token');
    vi.stubEnv('SQUARE_LOCATION_ID', 'test-square-location');
    const mockedFetch = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe('https://connect.squareupsandbox.com/v2/orders');
      const body = JSON.parse(String(init.body));
      expect(body.order.location_id).toBe('test-square-location');
      expect(body.order.line_items).toEqual([{
        name: 'Approved 16oz lemonade', quantity: String(bottles),
        base_price_money: { amount: 1199, currency: 'USD' },
      }]);
      expect(body.order.discounts).toEqual([{
        name: 'Lemonade pack savings', type: 'FIXED_AMOUNT',
        scope: 'ORDER', amount_money: { amount: discountCents, currency: 'USD' },
      }]);
      expect(bottles * 1199 - discountCents).toBe(payableCents);
      return {
        ok: true,
        json: async () => ({ order: { id: 'sandbox-order', total_money: { amount: payableCents, currency: 'USD' } } }),
      };
    });
    vi.stubGlobal('fetch', mockedFetch);
    const result = await createOrder({
      lineItems: [{
        name: 'Approved 16oz lemonade', quantity: String(bottles),
        basePriceMoney: { amount: 1199, currency: 'USD' },
      }],
      discounts: [{ name: 'Lemonade pack savings', amountMoney: { amount: discountCents, currency: 'USD' } }],
      idempotencyKey: 'test-only-order-key',
    });
    expect(result.success).toBe(true);
    expect(result.data?.order?.id).toBe('sandbox-order');
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it('omits Square discounts when the cart has no authorized discount', async () => {
    vi.stubEnv('SQUARE_ENVIRONMENT', 'sandbox');
    vi.stubEnv('SQUARE_ACCESS_TOKEN', 'test-only-sandbox-token');
    vi.stubEnv('SQUARE_LOCATION_ID', 'test-square-location');
    const fetchMock = vi.fn(async (_url: string, options: RequestInit) => {
      const request = JSON.parse(String(options.body));
      expect(request.order.discounts).toBeUndefined();
      return { ok: true, json: async () => ({ order: { id: 'ord' } }) };
    });
    vi.stubGlobal('fetch', fetchMock);
    expect((await createOrder({
      lineItems: [{ name: 'One lemonade', quantity: '1', basePriceMoney: { amount: 1199, currency: 'USD' } }],
    })).success).toBe(true);
  });
});
