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
    description: 'Handcrafted sea moss gel, juices, and boba every Saturday',
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

/**
 * Check if a market is currently open
 */
export function isMarketOpenNow(market: MarketConfig): boolean {
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  
  // Check if market runs today
  if (!market.days.includes(dayName)) {
    return false;
  }
  
  // Parse current time
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;
  
  // Parse market hours
  const [openHour, openMinute] = market.hours.open.split(':').map(Number);
  const [closeHour, closeMinute] = market.hours.close.split(':').map(Number);
  const openTime = openHour * 60 + openMinute;
  const closeTime = closeHour * 60 + closeMinute;
  
  return currentTime >= openTime && currentTime < closeTime;
}

/**
 * Get time until market opens (in minutes)
 */
export function getMinutesUntilOpen(market: MarketConfig): number {
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  
  if (!market.days.includes(dayName)) {
    return -1; // Not running today
  }
  
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;
  
  const [openHour, openMinute] = market.hours.open.split(':').map(Number);
  const openTime = openHour * 60 + openMinute;
  
  if (currentTime >= openTime) {
    return 0; // Already open or passed
  }
  
  return openTime - currentTime;
}

/**
 * Get time until market closes (in minutes)
 */
export function getMinutesUntilClose(market: MarketConfig): number {
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  
  if (!market.days.includes(dayName)) {
    return -1;
  }
  
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;
  
  const [closeHour, closeMinute] = market.hours.close.split(':').map(Number);
  const closeTime = closeHour * 60 + closeMinute;
  
  if (currentTime >= closeTime) {
    return 0;
  }
  
  return closeTime - currentTime;
}

/**
 * Get next market day for a specific market
 */
export function getNextMarketDay(market: MarketConfig): Date | null {
  const today = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayIndex = today.getDay();
  
  // Find the next occurrence of this market
  for (let i = 0; i < 7; i++) {
    const checkIndex = (todayIndex + i) % 7;
    const checkDay = dayNames[checkIndex];
    
    if (market.days.includes(checkDay)) {
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + i);
      return nextDate;
    }
  }
  
  return null;
}
