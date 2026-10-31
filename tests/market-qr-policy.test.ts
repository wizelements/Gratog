import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildMarketQrMenu,
  canPurchaseFromMarketQr,
  MARKET_INFORMATIONAL_CATEGORIES,
  resolveMarketQrId,
} from '../lib/market-qr-policy';

const file = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf-8');

describe('Dedicated market QR channel', () => {
  it('resolves only active canonical markets and supported old QR aliases', () => {
    expect(resolveMarketQrId('serenbe')).toBe('serenbe');
    expect(resolveMarketQrId('serenbe-farmers-market')).toBe('serenbe');
    expect(resolveMarketQrId('dunwoody-farmers-market')).toBe('dunwoody');
    expect(resolveMarketQrId('hapeville-hangar')).toBe('hapeville-hangar');
    expect(resolveMarketQrId('sandy-springs-market')).toBeNull();
    expect(resolveMarketQrId('../../admin')).toBeNull();
    expect(resolveMarketQrId(null)).toBeNull();
  });

  it('publishes only the nine approved bottled and gel products', () => {
    const menu = buildMarketQrMenu([
      { name: 'Calm Waters', ingredients: [{ name: 'incorrect legacy ingredient' }], checkoutReady: true, inventoryVerified: true, stock: 100 },
      { name: 'Herbal Vibe', stock: 1000, checkoutReady: true },
      { name: 'Peach Lemonade', checkoutReady: true },
      { name: 'Spicy Bloom', checkoutReady: true },
      { name: 'Healing Harmony Sea Moss Gel', checkoutReady: true },
      { name: 'Boba', checkoutReady: true },
    ]);
    expect(menu).toHaveLength(9);
    expect(menu.filter(item => item.kind === 'lemonade')).toHaveLength(6);
    expect(menu.filter(item => item.kind === 'juice')).toHaveLength(2);
    expect(menu.filter(item => item.kind === 'gel')).toHaveLength(1);
    expect(menu.map(item => item.name)).not.toContain('Spicy Bloom');
    expect(menu.map(item => item.name)).not.toContain('Peach Lemonade');
    expect(menu.map(item => item.name)).not.toContain('Boba');
    expect(menu.find(item => item.slug === 'herbal-vibe')?.approvedPriceCents).toBe(1599);
    expect(menu.find(item => item.slug === 'apg')?.approvedPriceCents).toBe(1299);
    expect(menu.find(item => item.slug === 'calm-waters')?.ingredients).toContain('Blue spirulina');
    expect(menu.find(item => item.slug === 'calm-waters')?.ingredients).not.toContain('incorrect legacy ingredient');
    expect(menu.every(item => item.digitalPurchaseEnabled === false && !canPurchaseFromMarketQr(item))).toBe(true);
    expect(menu.every(item => item.availability === 'ask_at_booth')).toBe(true);
  });

  it('never upgrades stock from the browser, catalog flag, or owner report', () => {
    const one = buildMarketQrMenu([{ name: 'SuppleMint', stock: 500, checkoutReady: true, inventoryVerified: true }]);
    const two = buildMarketQrMenu([]);
    expect(one.find(i => i.slug === 'supplemint')?.digitalPurchaseEnabled).toBe(false);
    expect(two.find(i => i.slug === 'supplemint')?.digitalPurchaseEnabled).toBe(false);
    expect(MARKET_INFORMATIONAL_CATEGORIES.map(x => x.id)).toEqual(['boba', 'refreshers', 'shots', 'teas', 'food']);
  });

  it('decommissions the legacy market cart and stale QR destination', () => {
    const oldMenu = file('app/order/menu/page.tsx');
    const oldStart = file('app/order/start/page.tsx');
    const qr = file('app/admin/qr-generator/page.tsx');
    const publicPage = file('app/m/[market]/page.tsx');
    expect(oldMenu).not.toContain('remaining ?? 999');
    expect(oldMenu).toContain('resolveMarketQrId');
    expect(oldStart).toContain('resolveMarketQrId');
    expect(qr).toContain('/m/');
    expect(qr).not.toContain('serenbe-farmers-market');
    expect(publicPage).not.toContain('addToCart');
    expect(publicPage).not.toContain('SquarePaymentForm');
    expect(publicPage).toContain('MARKET_INFORMATIONAL_CATEGORIES');
  });
});
