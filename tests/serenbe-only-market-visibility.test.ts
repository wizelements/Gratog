import { describe, expect, it } from 'vitest';
import { MARKETS as pickupMarkets, getActiveMarketPickups } from '@/data/markets';
import { MARKETS as marketStatus, getActiveMarkets, getMarketById } from '@/lib/markets';
import { resolveActivePreorderMarket } from '@/lib/preorder/market-resolver';

describe('reversible Serenbe-only market visibility', () => {
  it('preserves paused market records without displaying them', () => {
    expect(pickupMarkets.map(m => m.id)).toEqual(['hapeville-hangar', 'serenbe', 'dunwoody']);
    expect(getActiveMarketPickups().map(m => m.id)).toEqual(['serenbe']);
    expect(pickupMarkets.filter(m => !m.isActive).map(m => m.id)).toEqual(['hapeville-hangar', 'dunwoody']);
  });

  it('shows only Serenbe on the market-day feed', () => {
    expect(getActiveMarkets().map(m => m.id)).toEqual(['serenbe-farmers-market']);
    expect(getMarketById('dunwoody-farmers-market')).toBeUndefined();
    expect(getMarketById('sandy-springs-market')).toBeUndefined();
  });

  it('refuses paused preorders from saved, direct, and legacy links', async () => {
    expect((await resolveActivePreorderMarket('serenbe'))?.id).toBe('serenbe');
    expect(await resolveActivePreorderMarket('dunwoody')).toBeNull();
    expect(await resolveActivePreorderMarket('hapeville-hangar')).toBeNull();
    expect(await resolveActivePreorderMarket('dunwoody-farmers-market')).toBeNull();
    expect(await resolveActivePreorderMarket('sandy-springs-market')).toBeNull();
  });
});
