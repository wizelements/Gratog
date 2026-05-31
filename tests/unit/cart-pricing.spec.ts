import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Unit tests for server-authoritative cart pricing.
 *
 * We mock `@/lib/db-optimized` to feed the priceCart() function a controlled
 * "catalog" and a controlled coupons collection. The point is to prove that
 * client-supplied prices CANNOT influence what the server stores or charges.
 */

type ProductDoc = {
  id: string;
  name: string;
  price?: number;
  priceCents?: number;
  rewardPoints?: number;
  variations?: Array<{ id: string; name?: string; price?: number; priceCents?: number }>;
  inStock?: boolean;
  squareIsArchived?: boolean;
  squareEcomAvailable?: boolean;
};

type CouponDoc = {
  code: string;
  type?: string;
  value?: number;
  isActive?: boolean;
  isUsed?: boolean;
  maxUses?: number;
  usedCount?: number;
  expiresAt?: Date | null;
  minPurchase?: number;
};

const products: ProductDoc[] = [];
const coupons: CouponDoc[] = [];

vi.mock('@/lib/db-optimized', () => ({
  connectToDatabase: async () => ({
    db: {
      collection: (name: string) => {
        if (name === 'unified_products') {
          return {
            find: (q: any) => ({
              toArray: async () =>
                products.filter((p) => {
                  const ids: string[] = q?.$or?.[0]?.id?.$in || [];
                  const vids: string[] = q?.$or?.[2]?.['variations.id']?.$in || [];
                  return (
                    ids.includes(p.id) ||
                    (p.variations || []).some((v) => vids.includes(v.id))
                  );
                }),
            }),
          };
        }
        if (name === 'coupons') {
          return {
            findOne: async (q: any) =>
              coupons.find((c) => c.code === q.code) || null,
          };
        }
        throw new Error(`unexpected collection ${name}`);
      },
    },
  }),
}));

import { priceCart, CartPricingError } from '../../lib/cart-pricing';

beforeEach(() => {
  products.length = 0;
  coupons.length = 0;
});

describe('priceCart — tamper resistance', () => {
  it('ignores client-supplied price and rebuilds from the catalog', async () => {
    products.push({
      id: 'PROD_A',
      name: 'Gratitude Tonic',
      priceCents: 2500, // $25.00
      rewardPoints: 5,
    });

    const result = await priceCart({
      items: [
        // Client lies: claims $0.01 unit price. Cast through `any` because
        // CartLineInput doesn't accept a price field — and that's the point.
        { productId: 'PROD_A', quantity: 2, price: 0.01 } as any,
      ],
    });

    expect(result.totalCents).toBe(5000);
    expect(result.subtotalCents).toBe(5000);
    expect(result.items[0].unitPriceCents).toBe(2500);
    expect(result.items[0].lineTotalCents).toBe(5000);
  });

  it('rejects unknown product IDs', async () => {
    await expect(
      priceCart({ items: [{ productId: 'GHOST', quantity: 1 }] })
    ).rejects.toBeInstanceOf(CartPricingError);
  });

  it('rejects an archived / unavailable product', async () => {
    products.push({
      id: 'PROD_A',
      name: 'Old Bottle',
      priceCents: 1000,
      squareIsArchived: true,
    });
    await expect(
      priceCart({ items: [{ productId: 'PROD_A', quantity: 1 }] })
    ).rejects.toMatchObject({ code: 'PRODUCT_UNAVAILABLE' });
  });

  it('rejects non-positive or non-integer quantities', async () => {
    products.push({ id: 'PROD_A', name: 'X', priceCents: 1000 });
    await expect(
      priceCart({ items: [{ productId: 'PROD_A', quantity: 0 }] })
    ).rejects.toMatchObject({ code: 'INVALID_QUANTITY' });
    await expect(
      priceCart({ items: [{ productId: 'PROD_A', quantity: 1.5 }] })
    ).rejects.toMatchObject({ code: 'INVALID_QUANTITY' });
    await expect(
      priceCart({ items: [{ productId: 'PROD_A', quantity: -3 }] })
    ).rejects.toMatchObject({ code: 'INVALID_QUANTITY' });
  });

  it('rejects a catalog product with zero or missing price', async () => {
    products.push({ id: 'PROD_A', name: 'X', priceCents: 0 });
    await expect(
      priceCart({ items: [{ productId: 'PROD_A', quantity: 1 }] })
    ).rejects.toMatchObject({ code: 'PRODUCT_PRICE_INVALID' });
  });

  it('resolves variation pricing via variation id', async () => {
    products.push({
      id: 'PROD_A',
      name: 'Bundle',
      priceCents: 1000,
      variations: [
        { id: 'VAR_S', priceCents: 800 },
        { id: 'VAR_L', priceCents: 1500 },
      ],
    });
    const res = await priceCart({
      items: [{ productId: 'PROD_A', variationId: 'VAR_L', quantity: 1 }],
    });
    expect(res.items[0].unitPriceCents).toBe(1500);
  });

  it('caps tip at 50% of (subtotal + delivery)', async () => {
    products.push({ id: 'PROD_A', name: 'X', priceCents: 1000 });
    const res = await priceCart({
      items: [{ productId: 'PROD_A', quantity: 1 }],
      deliveryFeeCents: 200,
      tipCents: 99999, // attempt to inflate via tip
    });
    expect(res.tipCents).toBe(600); // floor((1000+200)/2)
    expect(res.totalCents).toBe(1000 + 200 + 600);
  });

  it('rejects invalid coupon and unknown coupon', async () => {
    products.push({ id: 'PROD_A', name: 'X', priceCents: 5000 });
    await expect(
      priceCart({ items: [{ productId: 'PROD_A', quantity: 1 }], couponCode: 'GHOST' })
    ).rejects.toMatchObject({ code: 'COUPON_INVALID' });
  });

  it('caps coupon discount at subtotal — never creates a negative total', async () => {
    products.push({ id: 'PROD_A', name: 'X', priceCents: 500 });
    coupons.push({ code: 'BIG', type: 'fixed', value: 999, isActive: true });
    const res = await priceCart({
      items: [{ productId: 'PROD_A', quantity: 1 }],
      couponCode: 'BIG',
    });
    expect(res.discountCents).toBe(500);
    expect(res.totalCents).toBe(0);
  });

  it('honors percent coupon and minPurchase', async () => {
    products.push({ id: 'PROD_A', name: 'X', priceCents: 1000 });
    coupons.push({
      code: 'TEN',
      type: 'percent',
      value: 10,
      isActive: true,
      minPurchase: 50,
    });
    await expect(
      priceCart({ items: [{ productId: 'PROD_A', quantity: 1 }], couponCode: 'TEN' })
    ).rejects.toMatchObject({ code: 'COUPON_MIN_NOT_MET' });

    const res = await priceCart({
      items: [{ productId: 'PROD_A', quantity: 6 }], // $60 subtotal
      couponCode: 'TEN',
    });
    expect(res.subtotalCents).toBe(6000);
    expect(res.discountCents).toBe(600);
    expect(res.totalCents).toBe(5400);
  });
});
