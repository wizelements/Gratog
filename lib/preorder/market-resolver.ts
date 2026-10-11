import { getActiveMarkets } from '@/lib/markets/repository';
import { getActiveMarketPickups } from '@/data/markets';
import type { PreorderMarket } from './market-schedule';

/** Resolve only a market currently presented to customers by /api/markets. */
export async function resolveActivePreorderMarket(id: string): Promise<PreorderMarket | null> {
  if (!id || typeof id !== 'string' || id.length > 120) return null;
  let markets: PreorderMarket[] = [];
  try {
    const active = await getActiveMarkets();
    markets = (active.length ? active : getActiveMarketPickups()) as PreorderMarket[];
  } catch {
    markets = getActiveMarketPickups();
  }
  const exact = markets.find(m => m.id === id && m.isActive !== false);
  if (exact) return exact;
  // Support older links that used named slugs, without authorizing arbitrary market IDs.
  if (!['serenbe', 'dunwoody', 'hapeville-hangar'].includes(id)) return null;
  const keyword = id === 'hapeville-hangar' ? 'airport' : id;
  return markets.find(m => m.isActive !== false && m.name.toLowerCase().includes(keyword)) || null;
}