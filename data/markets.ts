export interface MarketPickupLocation {
  id: string;
  name: string;
  shortName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  addressLine: string;
  dayOfWeek: number;
  hours: string;
  pickupDays: string;
  preorderCutoff: string;
  description: string;
  parkingNotes: string;
  mapsUrl: string;
  isActive: boolean;
  featured: boolean;
}

export const MARKETS: MarketPickupLocation[] = [
  {
    id: 'serenbe',
    name: 'Serenbe Farmers Market',
    shortName: 'Serenbe',
    address: '10950 Hutcheson Ferry Rd',
    city: 'Chattahoochee Hills',
    state: 'GA',
    zip: '30268',
    addressLine: '10950 Hutcheson Ferry Rd, Chattahoochee Hills, GA 30268',
    dayOfWeek: 6,
    hours: '09:00-13:00',
    pickupDays: 'Saturday market pickup',
    preorderCutoff: 'Order by Friday evening when weekly inventory is open.',
    description: 'A flagship farmers market pickup window for weekly gels, lemonades, refreshers, shots, samples, and founder-led product guidance.',
    parkingNotes: 'Follow posted Serenbe market parking signs and look for the Taste of Gratitude booth.',
    mapsUrl: 'https://maps.google.com/?q=10950%20Hutcheson%20Ferry%20Rd%2C%20Chattahoochee%20Hills%2C%20GA%2030268',
    isActive: true,
    featured: true,
  },
  {
    id: 'dunwoody',
    name: 'Dunwoody Farmers Market',
    shortName: 'Dunwoody',
    address: '4770 N Peachtree Rd',
    city: 'Dunwoody',
    state: 'GA',
    zip: '30338',
    addressLine: '4770 N Peachtree Rd, Dunwoody, GA 30338',
    dayOfWeek: 6,
    hours: '08:30-12:30',
    pickupDays: 'Saturday market pickup',
    preorderCutoff: 'Order early in the week for best selection.',
    description: 'A north Atlanta pickup option for customers who want fresh weekly wellness products without waiting for shipping.',
    parkingNotes: 'Use market-designated parking and check the weekly booth map when available.',
    mapsUrl: 'https://maps.google.com/?q=4770%20N%20Peachtree%20Rd%2C%20Dunwoody%2C%20GA%2030338',
    isActive: true,
    featured: true,
  },
];

export function getActiveMarketPickups() {
  return MARKETS.filter((market) => market.isActive);
}
