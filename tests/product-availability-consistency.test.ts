import { describe, expect, it } from 'vitest';
import { resolveProductAvailability } from '@/lib/product-availability';

const base = {
  id: 'TEST', name: 'Market Drink', price: 11.99, checkoutReady: true,
  stock: 9, weeklyStatus: 'active', inventoryStatus: 'in_stock',
  activeWeeklyMenu: true,
};

describe('one merchant-controlled availability decision across shopping surfaces', () => {
  it('does not convert out-of-stock regular items into payable preorders', () => {
    const result = resolveProductAvailability({ ...base, stock: 0, inStock: false });
    expect(result.status).toBe('unavailable');
    expect(result.reason).toBe('out_of_stock');
    expect(result.canOrder).toBe(false);
  });

  it('allows an explicitly authorized pickup preorder with no ready stock', () => {
    const result = resolveProductAvailability({
      ...base, stock: 0, inStock: false, preorderOnly: true, marketPickupOnly: true,
    });
    expect(result.status).toBe('preorder');
    expect(result.canMarketPreorder).toBe(true);
    expect(result.canAddToCart).toBe(false);
  });

  it.each([
    { checkoutReady: false },
    { checkoutReady: undefined },
    { squareIsArchived: true },
    { soldOut: true },
    { available: false },
    { weeklyStatus: 'inactive' },
    { inventoryStatus: 'sold_out' },
    { price: 0 },
    { squareEcomVisibility: 'HIDDEN' },
  ])('blocks unverified and disabled products: %o', patch => {
    const result = resolveProductAvailability({ ...base, ...patch });
    expect(result.canOrder).toBe(false);
    expect(result.canAddToCart).toBe(false);
  });

  it('does not suppress an otherwise sellable custom-store item due to a Square Online-only flag', () => {
    const result = resolveProductAvailability({ ...base, squareEcomAvailable: false });
    expect(result.canOrder).toBe(true);
  });

  it('preserves non-market Georgia products even when excluded from the weekly market menu', () => {
    const result = resolveProductAvailability({ ...base, activeWeeklyMenu: false });
    expect(result.canOrder).toBe(true);
  });

  it('does not infer stock from an absent count or advertise a confirmed quantity', () => {
    const result = resolveProductAvailability({ ...base, stock: undefined });
    expect(result.status).toBe('stock_unverified');
    expect(result.label).toBe('Availability confirmed at checkout');
  });

  it('does not let a preorder flag override merchant-disabled checkout', () => {
    const result = resolveProductAvailability({
      ...base, checkoutReady: false, preorderOnly: true, marketPickupOnly: true,
    });
    expect(result.canMarketPreorder).toBe(false);
    expect(result.label).toBe('Request availability');
  });

  it('does not tell the customer a retired seasonal item is ready for checkout', () => {
    const result = resolveProductAvailability({
      ...base, activeWeeklyMenu: false, seasonal: true, weeklyStatus: 'seasonal',
    });
    expect(result.label).toBe('Not on this week’s menu');
  });
});
