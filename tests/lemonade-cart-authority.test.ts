import { beforeEach, describe, expect, it, vi } from 'vitest';

const ledger = vi.hoisted(() => ({
  documents: [] as Array<Record<string, any>>,
  coupon: null as null | Record<string, any>,
}));

vi.mock('@/lib/db-optimized', () => ({
  connectToDatabase: async () => ({
    db: {
      collection: (name: string) => name === 'unified_products'
        ? { find: () => ({ toArray: async () => ledger.documents }) }
        : { findOne: async () => ledger.coupon },
    },
  }),
}));

import { priceCart } from '@/lib/cart-pricing';

const strawberry = {
  id: 'strawberry-bliss', name: 'Strawberry Bliss', category: 'lemonades',
  price: 10, priceCents: 1000, inStock: true,
  variations: [{ id: 'strawberry-16oz', name: '16oz bottle', price: 10, priceCents: 1000 }],
};
const gel = {
  id: 'blue-lotus-gel', name: 'Blue Lotus Gel', category: 'gels',
  price: 36, priceCents: 3600, inStock: true,
  variations: [{ id: 'gel16', name: '16oz jar', price: 36, priceCents: 3600 }],
};

describe('server-authoritative pack checkout', () => {
  beforeEach(() => {
    ledger.documents = [strawberry, gel];
    ledger.coupon = null;
  });
  it('repairs stale catalog pricing and charges exact four-pack total', async () => {
    const order = await priceCart({ items: [{ productId: strawberry.id, variationId: 'strawberry-16oz', quantity: 4 }] });
    expect(order.subtotalCents).toBe(4796);
    expect(order.lemonadePackDiscountCents).toBe(397);
    expect(order.totalCents).toBe(4399);
    expect(order.items[0].unitPriceCents).toBe(1199);
  });
  it('discounts six-pack only, never includes a gel as an eligible bottle', async () => {
    const order = await priceCart({ items: [
      { productId: strawberry.id, variationId: 'strawberry-16oz', quantity: 6 },
      { productId: gel.id, variationId: 'gel16', quantity: 1 },
    ] });
    expect(order.lemonadePackDiscountCents).toBe(895);
    expect(order.totalCents).toBe(6299 + 3600);
    expect(order.lemonadePackCounts).toEqual({ fourPacks: 0, sixPacks: 1 });
  });
  it('does not stack coupons; selects the better verified discount', async () => {
    ledger.coupon = { code: 'TENOFF', type: 'fixed', value: 10, isActive: true };
    const order = await priceCart({ items: [
      { productId: strawberry.id, variationId: 'strawberry-16oz', quantity: 6 },
    ], couponCode: 'TENOFF' });
    expect(order.discountCents).toBe(1000);
    expect(order.lemonadePackDiscountCents).toBe(0);
    expect(order.totalCents).toBe(6194);
    expect(order.appliedCoupon?.code).toBe('TENOFF');
  });
  it('does not charge client-supplied promo price or count', async () => {
    const order = await priceCart({ items: [{
      productId: strawberry.id, variationId: 'strawberry-16oz', quantity: 4,
      // extra untrusted browser fields are intentionally ignored
      price: 0, discount: 4796, name: 'free',
    } as any] });
    expect(order.totalCents).toBe(4399);
  });
});
