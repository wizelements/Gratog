import { describe, expect, it } from 'vitest';
import { MARKETS, getActiveMarketPickups } from '@/data/markets';
import { getActiveWeeklyProducts, getProductBySlugOrId } from '@/data/products';
import { approvedUnitPriceCents } from '@/lib/merchant-pricing';
import { MARKET_CONFIGS, isValidMarketId } from '@/lib/preorder/rules';
import { validateCartForFulfillment } from '@/lib/cart-engine';
import { readFileSync } from 'node:fs';

describe('Taste of Gratitude market truth and price contract', () => {
  it('publishes only active Serenbe pickup, keeps paused markets recoverable', () => {
    expect(getActiveMarketPickups().map(market => market.id)).toEqual(['serenbe']);
    expect(MARKETS.find(market => market.id === 'dunwoody')?.isActive).toBe(false);
    expect(MARKETS.find(market => market.id === 'hapeville-hangar')?.isActive).toBe(false);
    expect(getActiveMarketPickups()[0].hours).toBe('09:00-12:00');
    expect(MARKET_CONFIGS.serenbe.hours).toBe('9:00 AM - 12:00 PM');
    expect(isValidMarketId('serenbe')).toBe(true);
    expect(isValidMarketId('dunwoody')).toBe(false);
  });

  it('does not direct legacy carts to paused pickup locations', () => {
    const cart = [{ id: 'test-item', name: 'Test lemonade', quantity: 1, price: 11.99, marketExclusive: true }];
    expect(validateCartForFulfillment(cart, 'pickup_dunwoody', 'dunwoody')).toMatchObject({
      valid: false, code: 'MARKET_PAUSED',
    });
    expect(validateCartForFulfillment(cart, 'pickup_dunwoody', 'dunwoody').error).toContain('currently paused');
  });

  it('aligns curated weekly lemonade prices with merchant-approved cents', () => {
    const item = getProductBySlugOrId('kissed-by-gods');
    expect(item?.price).toBe(11.99);
    expect(approvedUnitPriceCents(item)).toBe(1199);
    const fromWeeklyMenu = getActiveWeeklyProducts().find(product => product.id === 'kissed-by-gods');
    expect(fromWeeklyMenu?.price).toBe(approvedUnitPriceCents(fromWeeklyMenu) / 100);
  });

  it('never fabricates products and prices when storefront catalog request fails', () => {
    const marketPage = readFileSync('app/markets/page.tsx', 'utf8');
    expect(marketPage).not.toContain('fallback-golden-glow-gel');
    expect(marketPage).not.toContain('fallback-kissed-by-gods');
    expect(marketPage).toContain('setProducts([])');
    expect(marketPage).toContain('We couldn’t load today’s favorites.');
  });

  it('preserves Jenneisha’s full Ted’s Gym founder story during trust fixes', () => {
    const aboutPage = readFileSync('app/about/page.js', 'utf8');
    expect(aboutPage).toContain('Ted’s Gym');
    expect(aboutPage).toContain('Jenneisha Glover');
  });
});
