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
  recurrence?: 'weekly' | 'first_third';
}

export const MARKETS: MarketPickupLocation[] = [
  {
    id: 'hapeville-hangar',
    name: 'Airport District Night Market at The Hangar',
    shortName: 'Hapeville',
    address: '3361 Dogwood Dr',
    city: 'Hapeville',
    state: 'GA',
    zip: '30354',
    addressLine: '3361 Dogwood Dr, Hapeville, GA 30354',
    dayOfWeek: 5,
    hours: '17:00-21:00',
    pickupDays: '1st & 3rd Friday night market pickup',
    preorderCutoff: 'Preorder by Thursday evening for Friday pickup when the Hapeville market is scheduled.',
    description: 'An evening Airport District market at Chattabrewchee The Hangar with local food, drinks, music, and vendors. Taste of Gratitude offers fresh market products and preorder pickup here on scheduled 1st and 3rd Fridays.',
    parkingNotes: 'Use The Hangar on-site parking and follow event/vendor parking guidance when posted.',
    mapsUrl: 'https://maps.google.com/?q=3361%20Dogwood%20Dr%2C%20Hapeville%2C%20GA%2030354',
    isActive: true,
    featured: true,
    recurrence: 'first_third',
  },
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
