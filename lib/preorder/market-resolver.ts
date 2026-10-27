import { getActiveMarkets } from '@/lib/markets/repository';
import type { PreorderMarket } from './market-schedule';

/** Resolve only a market currently presented to customers by /api/markets. */
export async function resolveActivePreorderMarket(id: string): Promise<PreorderMarket | null> {
  if (!id || typeof id !== 'string' || id.length > 120) return null;
  let markets: PreorderMarket[] = [];
  try {
    const active = await getActiveMarkets();
    markets = active as PreorderMarket[];
  } catch {
    return null;
  }
  return markets.find(m => m.id === id && m.isActive === true) || null;
}
