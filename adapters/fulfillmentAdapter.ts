/**
 * Fulfillment Adapter - Integrates with existing delivery zones and validation
 * Reuses ZIP validation, market locations, and delivery windows
 */

/**
 * Atlanta/South Fulton serviceable ZIP codes (from existing validation)
 */
const SERVICEABLE_ZIPS = [
  '30213', '30331', '30349', '30354', '30310', '30311', '30312', '30314', 
  '30315', '30316', '30317', '30318', '30336', '30337', '30344', '30349', 
  '30354', '30310', '30314', '30331', '30213'
];

/**
 * Pickup locations (markets)
 */
export interface PickupLocation {
  id: string;
  name: string;
  address: string;
  hours: string;
  coordinates?: { lat: number; lng: number };
}

const PICKUP_LOCATIONS: PickupLocation[] = [
  {
    id: 'serenbe',
    name: 'Serenbe Farmers Market',
    address: '10950 Hutcheson Ferry Rd, Palmetto, GA 30268 (Booth #12)',
    hours: 'Sat 9am-1pm'
  },
  {
    id: 'browns_mill',
    name: 'DHA Dunwoody Farmers Market',
    address: '4770 N Peachtree Rd, Dunwoody, GA 30338 (Brook Run Park)',
    hours: 'Sat 9am-12pm'
  }
];

/**
 * Delivery time windows
 */
export type DeliveryWindow = '09-12' | '12-15' | '15-18';

export interface DeliveryWindowOption {
  value: DeliveryWindow;
  label: string;
  available: boolean;
}

const DELIVERY_WINDOWS: DeliveryWindowOption[] = [
  { value: '09-12', label: '9:00 AM - 12:00 PM', available: true },
  { value: '12-15', label: '12:00 PM - 3:00 PM', available: true },
  { value: '15-18', label: '3:00 PM - 6:00 PM', available: true }
];

/**
 * Shipping methods
 */
export interface ShippingMethod {
  id: string;
  name: string;
  price: number;
  estimatedDays: string;
  description: string;
}

const SHIPPING_METHODS: ShippingMethod[] = [
  {
    id: 'standard',
    name: 'Standard Shipping',
    price: 8.99,
    estimatedDays: '5-7 business days',
    description: 'USPS Priority Mail'
  },
  {
    id: 'express',
    name: 'Express Shipping',
    price: 15.99,
    estimatedDays: '2-3 business days',
    description: 'FedEx Express'
  },
  {
    id: 'overnight',
    name: 'Overnight Shipping',
    price: 29.99,
    estimatedDays: 'Next business day',
    description: 'FedEx Overnight'
  }
];

/**
 * Check if ZIP code is serviceable for delivery
 */
export function isZipServiceable(zip: string): boolean {
  const cleanZip = zip.replace(/\D/g, '');
  return SERVICEABLE_ZIPS.includes(cleanZip);
}

/**
 * Get available delivery windows for a ZIP
 */
export function deliveryWindowsForZip(zip: string): DeliveryWindowOption[] {
  // In future, could filter based on ZIP, time of day, etc.
  return DELIVERY_WINDOWS;
}

/**
 * Get available pickup locations
 */
export function pickupLocations(): PickupLocation[] {
  return PICKUP_LOCATIONS;
}

/**
 * Get available pickup dates for a location
 * Returns next 4 available market days
 */
export function marketCalendar(locationId: string): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  
  // Get location
  const location = PICKUP_LOCATIONS.find(loc => loc.id === locationId);
  if (!location) return dates;
  
  // Parse hours to determine available days
  const availableDays: number[] = [];
  if (location.hours.includes('Sat')) availableDays.push(6); // Saturday
  if (location.hours.includes('Sun')) availableDays.push(0); // Sunday
  
  // Find next 4 available dates
  let checkDate = new Date(today);
  while (dates.length < 4) {
    if (availableDays.includes(checkDate.getDay())) {
      dates.push(new Date(checkDate));
    }
    checkDate.setDate(checkDate.getDate() + 1);
  }
  
  return dates;
}

/**
 * Get shipping methods
 */
export function shippingMethods(): ShippingMethod[] {
  return SHIPPING_METHODS;
}

/**
 * Validate address
 */
export interface AddressValidation {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateAddress(address: {
  street?: string;
  suite?: string;
  city?: string;
  state?: string;
  zip?: string;
}): AddressValidation {
  const errors: Record<string, string> = {};
  
  if (!address.street || address.street.trim().length < 5) {
    errors.street = 'Street address is required';
  }
  
  if (!address.city || address.city.trim().length < 2) {
    errors.city = 'City is required';
  }
  
  if (!address.state || address.state.trim().length !== 2) {
    errors.state = 'State is required (2-letter code)';
  }
  
  if (!address.zip || !/^\d{5}(-\d{4})?$/.test(address.zip)) {
    errors.zip = 'Valid ZIP code is required';
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Fulfillment utility interface
 */
export const Fulfillment = {
  isZipServiceable,
  deliveryWindowsForZip,
  pickupLocations,
  marketCalendar,
  shippingMethods,
  validateAddress,
  constants: {
    SERVICEABLE_ZIPS,
    PICKUP_LOCATIONS,
    DELIVERY_WINDOWS,
    SHIPPING_METHODS
  }
};
