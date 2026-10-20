// Market Configuration for Taste of Gratitude
// Supports: Serenbe Farmers Market, Druid Hills (DHA), Sandy Springs

export interface MarketConfig {
  id: string;
  name: string;
  shortName: string;
  address: string;
  coordinates: { lat: number; lng: number };
  hours: { open: string; close: string };
  days: string[];
  description: string;
  parkingInfo: string;
  contactPhone?: string;
  imageUrl?: string;
  isActive: boolean;
}

export const MARKETS: MarketConfig[] = [
  {
    id: 'serenbe-farmers-market',
    name: 'Serenbe Farmers Market',
    shortName: 'Serenbe',
    address: '10640 Serenbe Trail, Chattahoochee Hills, GA 30268',
    coordinates: { lat: 33.5407, lng: -84.7241 },
    hours: { open: '09:00', close: '13:00' },
    days: ['Saturday'],
    description: 'Handcrafted sea moss gel, juices, and wellness drinks every Saturday',
    parkingInfo: 'Free parking at the Farmhouse entrance',
    isActive: true,
  },
  {
    id: 'dunwoody-farmers-market',
    name: 'Dunwoody Farmers Market',
    shortName: 'DHA',
    address: 'Dunwoody Farmhouse, Dunwoody, GA 30338',
    coordinates: { lat: 33.9462, lng: -84.3346 },
    hours: { open: '08:00', close: '12:00' },
    days: ['Saturday'],
    description: 'Fresh sea moss products and wellness drinks',
    parkingInfo: 'Free parking at the Dunwoody Farmhouse',
    isActive: true,
  },
  {
    id: 'sandy-springs-market',
    name: 'Sandy Springs Farmers Market',
    shortName: 'Sandy Springs',
    address: '6100 Lake Forrest Dr, Sandy Springs, GA 30328',
    coordinates: { lat: 33.9304, lng: -84.3733 },
    hours: { open: '08:00', close: '12:00' },
    days: ['Saturday'],
    description: 'Saturday morning wellness essentials',
    parkingInfo: 'Free lot parking behind the community center',
    isActive: true,
  },
];

/**
 * Get all active markets
 */
export function getActiveMarkets(): MarketConfig[] {
  return MARKETS.filter(m => m.isActive);
}

/**
 * Get market by ID
 */
export function getMarketById(id: string): MarketConfig | undefined {
  return MARKETS.find(m => m.id === id && m.isActive);
}

/**
 * Get markets scheduled for a specific day
 */
export function getMarketsByDay(dayName: string): MarketConfig[] {
  return MARKETS.filter(m => 
    m.isActive && m.days.includes(dayName)
  );
}

export const MARKET_TIME_ZONE = 'America/New_York';

/**
 * One authoritative local clock for Georgia market dates and opening hours.
 * Never depend on the server process timezone (often UTC on Vercel).
 */
export function getMarketLocalNow(now: Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MARKET_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const fields = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return {
    date: `${fields.year}-${fields.month}-${fields.day}`,
    dayName: fields.weekday,
    minutesSinceMidnight: Number(fields.hour) * 60 + Number(fields.minute),
  };
}

function marketMinutes(hhmm: string): number {
  const [hour, minute] = hhmm.split(':').map(Number);
  return hour * 60 + minute;
}

/** Check whether a market is currently open in America/New_York. */
export function isMarketOpenNow(market: MarketConfig, now: Date = new Date()): boolean {
  const local = getMarketLocalNow(now);
  return market.days.includes(local.dayName)
    && local.minutesSinceMidnight >= marketMinutes(market.hours.open)
    && local.minutesSinceMidnight < marketMinutes(market.hours.close);
}

/** Minutes until today's opening, or -1 when not scheduled today. */
export function getMinutesUntilOpen(market: MarketConfig, now: Date = new Date()): number {
  const local = getMarketLocalNow(now);
  if (!market.days.includes(local.dayName)) return -1;
  return Math.max(0, marketMinutes(market.hours.open) - local.minutesSinceMidnight);
}

/** Minutes until today's closing, or -1 when not scheduled today. */
export function getMinutesUntilClose(market: MarketConfig, now: Date = new Date()): number {
  const local = getMarketLocalNow(now);
  if (!market.days.includes(local.dayName)) return -1;
  return Math.max(0, marketMinutes(market.hours.close) - local.minutesSinceMidnight);
}

/**
 * Return UTC midnight for the next local market calendar date.
 * The returned ISO date is the Georgia date, not the server's date.
 */
export function getNextMarketDay(market: MarketConfig, now: Date = new Date()): Date | null {
  const local = getMarketLocalNow(now);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayIndex = dayNames.indexOf(local.dayName);
  const [year, month, day] = local.date.split('-').map(Number);
  const localCalendarDate = Date.UTC(year, month - 1, day);
  for (let i = 0; i < 7; i++) {
    const candidateDay = dayNames[(todayIndex + i) % 7];
    if (market.days.includes(candidateDay)) {
      return new Date(localCalendarDate + i * 86_400_000);
    }
  }
  return null;
}
