import { getActiveMarketPickups } from '@/data/markets';
import type { PreorderMarket } from './market-schedule';

/** Resolve only a market currently presented to customers by /api/markets. */
export async function resolveActivePreorderMarket(id: string): Promise<PreorderMarket | null> {
  if (!id || typeof id !== 'string' || id.length > 120) return null;
  // Resolve only currently active public markets, even when a legacy DB row
  // or saved preorder link still points to a paused location.
  const markets = getActiveMarketPickups() as PreorderMarket[];
  const exact = markets.find(m => m.id === id && m.isActive !== false);
  if (exact) return exact;
  // Support older links that used named slugs, without authorizing arbitrary market IDs.
  if (!['serenbe', 'dunwoody', 'hapeville-hangar'].includes(id)) return null;
  const keyword = id === 'hapeville-hangar' ? 'airport' : id;
  return markets.find(m => m.isActive !== false && m.name.toLowerCase().includes(keyword)) || null;
}