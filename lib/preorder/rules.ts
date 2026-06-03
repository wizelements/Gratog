/**
 * Centralized preorder rules and market configuration
 * Single source of truth for market schedules, cutoffs, and preorder constraints
 */

export const MARKET_CONFIGS = {
  'serenbe': { prefix: 'S', day: 'Saturday', hours: '9:00 AM - 1:00 PM', name: 'Serenbe Farmers Market', cutoffDay: 'Friday', cutoffHour: 18 },
  'dunwoody': { prefix: 'D', day: 'Saturday', hours: '9:00 AM - 12:00 PM', name: 'Dunwoody Farmers Market', cutoffDay: 'Friday', cutoffHour: 18 },
  'sandy-springs': { prefix: 'SS', day: 'Sunday', hours: '10:00 AM - 1:00 PM', name: 'Sandy Springs Farmers Market', cutoffDay: 'Saturday', cutoffHour: 18 },
} as const;

export type MarketId = keyof typeof MARKET_CONFIGS;

export const PREORDER_RULES = {
  NON_BOBA_MINIMUM_CENTS: 6000, // $60.00
  BOBA_MAX_QTY: 2,
  TAX_RATE: 0, // market sales, no tax collected
} as const;

export function isValidMarketId(id: string): id is MarketId {
  return id in MARKET_CONFIGS;
}

export function getNextMarketDate(dayName: string): Date {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const targetDay = days.indexOf(dayName);
  const today = new Date();
  let daysUntil = targetDay - today.getDay();
  if (daysUntil <= 0) daysUntil += 7;
  const next = new Date(today);
  next.setDate(today.getDate() + daysUntil);
  return next;
}

export function isPastCutoff(marketId: MarketId): boolean {
  const config = MARKET_CONFIGS[marketId];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const cutoffDayIdx = days.indexOf(config.cutoffDay);
  const now = new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours();

  // If we're on cutoff day past cutoff hour
  if (currentDay === cutoffDayIdx && currentHour >= config.cutoffHour) return true;

  // Check if between cutoff and market day
  const marketDayIdx = days.indexOf(config.day);
  if (cutoffDayIdx < marketDayIdx) {
    return currentDay > cutoffDayIdx && currentDay <= marketDayIdx;
  }
  return false;
}
