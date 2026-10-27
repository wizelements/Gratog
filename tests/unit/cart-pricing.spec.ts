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
  isPreorder?: boolean;
  preorderOnly?: boolean;
  marketExclusive?: boolean;
  marketPickupOnly?: boolean;
  category?: string;
  fulfillmentType?: string;
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
                  // New security policy wraps identifier matching in an
                  // environment-scoped $and. This fake database honors the
                  // identifier portion while policy is tested separately.
                  const lookup = q?.$and?.find((clause: any) => Array.isArray(clause?.$or)) || q;
                  const ids: string[] = lookup?.$or?.[0]?.id?.$in || [];
                  const vids: string[] = lookup?.$or?.[2]?.['variations.id']?.$in || [];
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

  it('corrects the old $35 Blue Lotus 16 oz merchant price to owner-approved $36', async () => {
    products.push({
      id: 'DSROEB4HMZK63V7IGBH6SSJH',
      name: 'Blue Lotus',
      price: 35,
      priceCents: 3500,
      inStock: true,
      variations: [
        { id: 'QIX6D5PRQKX4TKEMTQUJPZUX', name: '16oz', priceCents: 3500 },
      ],
    });
    const priced = await priceCart({
      items: [{ productId: 'DSROEB4HMZK63V7IGBH6SSJH',
                variationId: 'QIX6D5PRQKX4TKEMTQUJPZUX', quantity: 1 }],
    });
    expect(priced.items[0].unitPriceCents).toBe(3600);
    expect(priced.totalCents).toBe(3600);
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

  it('blocks retired Blue Lotus sample variation IDs even with valid product ID', async () => {
    products.push({
      id: 'BLUE_LOTUS',
      name: 'Blue Lotus',
      priceCents: 3600,
      variations: [{ id: 'BLUE_LOTUS_16OZ', name: '16oz', priceCents: 3600 }],
    });
    await expect(priceCart({
      items: [{ productId: 'BLUE_LOTUS', variationId: 'OLD_2OZ_SAMPLE', quantity: 1 }],
    })).rejects.toMatchObject({ code: 'VARIATION_NOT_FOUND', status: 422 });
    const approved = await priceCart({
      items: [{ productId: 'BLUE_LOTUS', variationId: 'BLUE_LOTUS_16OZ', quantity: 1 }],
    });
    expect(approved.totalCents).toBe(3600);
    expect(approved.items[0].variationId).toBe('BLUE_LOTUS_16OZ');
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


describe('catalog-owned preorder and fulfillment security', () => {
  it('cannot force a sold-out product into the cart by setting client isPreorder=true', async () => {
    products.push({ id: 'SOLD_OUT', name: 'Sold Out', priceCents: 1599, inStock: false });
    await expect(priceCart({ items: [
      { productId: 'SOLD_OUT', quantity: 1, isPreorder: true },
    ] })).rejects.toMatchObject({ code: 'PRODUCT_UNAVAILABLE' });
  });

  it('allows sold-out preorder products only when the server catalog explicitly enables preorder', async () => {
    products.push({ id: 'MADE_TO_ORDER', name: 'Reserved Gel', priceCents: 3600, inStock: false, preorderOnly: true });
    const priced = await priceCart({ items: [
      { productId: 'MADE_TO_ORDER', quantity: 1, isPreorder: false },
    ] });
    expect(priced.items[0].isPreorder).toBe(true);
    expect(priced.items[0].unitPriceCents).toBe(3600);
  });

  it('enforces catalog pickup-only flags when the client lies that it is a normal product', async () => {
    products.push({ id: 'PICKUP_ONLY', name: 'Fresh Shot', priceCents: 1299, marketPickupOnly: true });
    const priced = await priceCart({ items: [
      { productId: 'PICKUP_ONLY', quantity: 1, marketExclusive: false },
    ] });
    expect(priced.items[0].marketExclusive).toBe(true);
  });

  it('classifies fresh-pressed catalog items as market only without trusting client category', async () => {
    products.push({ id: 'PRESSED', name: 'Fresh Pressed Juice', priceCents: 1499, category: 'fresh-pressed' });
    const priced = await priceCart({ items: [
      { productId: 'PRESSED', quantity: 1, category: 'unrestricted', marketExclusive: false },
    ] });
    expect(priced.items[0].marketExclusive).toBe(true);
  });
});
