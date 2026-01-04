/**
 * Market Types
 * Shared types for admin and public market data
 */

export interface MarketLocation {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  hours: string;
  dayOfWeek: number;
  description: string;
  mapsUrl?: string;
}

export interface AdminMarket extends MarketLocation {
  id: string;
  isActive: boolean;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MarketDocument extends MarketLocation {
  _id: import('mongodb').ObjectId;
  isActive: boolean;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const DAY_OF_WEEK_LABELS: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};
