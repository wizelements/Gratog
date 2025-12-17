/**
 * Fulfillment Validation & Configuration Helpers
 * Handles delivery zone validation, time windows, and fee calculations
 */

import {
  getShippingRates,
  validateAddress,
  type ShippingAddress,
  type ShippingRate,
  type PackageDimensions,
} from './shipping-service';

// Parse delivery windows from environment variable
export function getDeliveryWindows(): string[] {
  const windows = process.env.DELIVERY_WINDOWS || process.env.NEXT_PUBLIC_DELIVERY_WINDOWS || '09:00-12:00|12:00-15:00|15:00-18:00';
  return windows.split('|').filter(Boolean);
}

// Parse delivery ZIP whitelist
export function getDeliveryZipWhitelist(): string[] {
  const zips = process.env.DELIVERY_ZIP_WHITELIST || process.env.NEXT_PUBLIC_DELIVERY_ZIP_WHITELIST || '';
  return zips.split(',').map(z => z.trim()).filter(Boolean);
}

// Validate ZIP code against whitelist
export function isValidDeliveryZip(zip: string): boolean {
  if (!zip) return false;
  const whitelist = getDeliveryZipWhitelist();
  const cleanZip = zip.trim().replace(/\D/g, '').slice(0, 5);
  return whitelist.includes(cleanZip);
}

// Get delivery configuration
export function getDeliveryConfig() {
  return {
    minSubtotal: parseFloat(process.env.DELIVERY_MIN_SUBTOTAL || process.env.NEXT_PUBLIC_DELIVERY_MIN_SUBTOTAL || '30'),
    baseFee: parseFloat(process.env.DELIVERY_BASE_FEE || process.env.NEXT_PUBLIC_DELIVERY_BASE_FEE || '6.99'),
    freeThreshold: parseFloat(process.env.DELIVERY_FREE_THRESHOLD || process.env.NEXT_PUBLIC_DELIVERY_FREE_THRESHOLD || '75'),
    cutoffMinutes: parseInt(process.env.DELIVERY_CUTOFF_MINUTES || process.env.NEXT_PUBLIC_DELIVERY_CUTOFF_MINUTES || '60'),
    tipPresets: (process.env.DELIVERY_TIP_PRESETS || process.env.NEXT_PUBLIC_DELIVERY_TIP_PRESETS || '0|2|4|6')
      .split('|')
      .map(t => parseFloat(t))
      .filter(t => !isNaN(t))
  };
}

// Parse delivery window string (e.g., "09:00-12:00")
export function parseDeliveryWindow(window: string): { start: Date; end: Date } | null {
  if (!window || !window.includes('-')) return null;
  
  const [startTime, endTime] = window.split('-');
  const today = new Date();
  
  const parseTime = (timeStr: string): Date => {
    const [hours, minutes] = timeStr.trim().split(':').map(Number);
    const date = new Date(today);
    date.setHours(hours, minutes, 0, 0);
    return date;
  };
  
  return {
    start: parseTime(startTime),
    end: parseTime(endTime)
  };
}

// Check if delivery window is available (not past cutoff)
export function isDeliveryWindowAvailable(window: string): boolean {
  // Allow special values for MVP/testing
  if (!window || window === 'anytime' || window === 'ASAP' || window === 'tomorrow_10am_2pm') {
    return true;
  }
  
  const parsed = parseDeliveryWindow(window);
  if (!parsed) return false;
  
  const config = getDeliveryConfig();
  const now = new Date();
  const cutoffTime = new Date(parsed.start.getTime() - config.cutoffMinutes * 60 * 1000);
  
  return now < cutoffTime;
}

// Get next available delivery window
export function getNextAvailableWindow(): string | null {
  const windows = getDeliveryWindows();
  for (const window of windows) {
    if (isDeliveryWindowAvailable(window)) {
      return window;
    }
  }
  return null;
}

// Calculate delivery fee based on subtotal
export function calculateDeliveryFee(subtotal: number): number {
  const config = getDeliveryConfig();
  return subtotal >= config.freeThreshold ? 0 : config.baseFee;
}

// Calculate how much more is needed for free delivery
export function getFreeDeliveryProgress(subtotal: number): number {
  const config = getDeliveryConfig();
  return Math.max(0, config.freeThreshold - subtotal);
}

// Validate tip amount
export function isValidTip(tip: number | string): boolean {
  const tipNum = typeof tip === 'string' ? parseFloat(tip) : tip;
  return !isNaN(tipNum) && tipNum >= 0 && tipNum <= 100;
}

// Sanitize tip amount
export function sanitizeTip(tip: number | string): number {
  const tipNum = typeof tip === 'string' ? parseFloat(tip) : tip;
  if (!isValidTip(tipNum)) return 0;
  return Math.round(tipNum * 100) / 100; // Round to 2 decimal places
}

// Check if fulfillment type is enabled
export function isFulfillmentEnabled(type: 'pickup' | 'shipping' | 'delivery'): boolean {
  const envKey = `NEXT_PUBLIC_FULFILLMENT_${type.toUpperCase()}`;
  const value = process.env[envKey];
  return value === 'enabled';
}

// Validate fulfillment data
export interface FulfillmentValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateDeliveryData(data: {
  zip: string;
  window: string;
  subtotal: number;
  tip?: number;
}): FulfillmentValidationResult {
  const errors: string[] = [];
  const config = getDeliveryConfig();
  
  // Check if delivery is enabled
  if (!isFulfillmentEnabled('delivery')) {
    errors.push('Home delivery is temporarily unavailable. Please choose Pickup or Shipping.');
  }
  
  // Validate ZIP
  if (!isValidDeliveryZip(data.zip)) {
    errors.push("We're not in your area yet. Try Pickup or Shipping, or use a different address.");
  }
  
  // Validate minimum subtotal
  if (data.subtotal < config.minSubtotal) {
    errors.push(`Minimum order for delivery is $${config.minSubtotal.toFixed(2)}`);
  }
  
  // Validate delivery window
  if (!data.window) {
    errors.push('Please select a delivery time window.');
  } else if (!isDeliveryWindowAvailable(data.window)) {
    const nextWindow = getNextAvailableWindow();
    if (nextWindow) {
      errors.push(`Order cutoff for this window has passed. Please pick a later time (next available: ${nextWindow}).`);
    } else {
      errors.push('All delivery windows for today have passed. Please try again tomorrow.');
    }
  }
  
  // Validate tip
  if (data.tip !== undefined && !isValidTip(data.tip)) {
    errors.push('Invalid tip amount.');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Validate pickup data
export function validatePickupData(data: {
  market: string;
  date?: string;
}): FulfillmentValidationResult {
  const errors: string[] = [];
  
  if (!isFulfillmentEnabled('pickup')) {
    errors.push('Pickup is temporarily unavailable.');
  }
  
  if (!data.market) {
    errors.push('Please select a pickup location.');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Validate shipping data
export function validateShippingData(data: {
  street: string;
  city: string;
  state: string;
  zip: string;
}): FulfillmentValidationResult {
  const errors: string[] = [];
  
  if (!isFulfillmentEnabled('shipping')) {
    errors.push('Shipping is temporarily unavailable.');
  }
  
  if (!data.street || data.street.length < 5) {
    errors.push('Please enter a valid street address.');
  }
  
  if (!data.city) {
    errors.push('Please enter a city.');
  }
  
  if (!data.state) {
    errors.push('Please select a state.');
  }
  
  if (!data.zip || !/^\d{5}(-\d{4})?$/.test(data.zip)) {
    errors.push('Please enter a valid ZIP code.');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Validate shipping address using shipping service API (async version)
export async function validateShippingAddressAsync(data: {
  street: string;
  city: string;
  state: string;
  zip: string;
}): Promise<FulfillmentValidationResult> {
  if (!isFulfillmentEnabled('shipping')) {
    return { valid: false, errors: ['Shipping is temporarily unavailable.'] };
  }

  const address: ShippingAddress = {
    street: data.street,
    city: data.city,
    state: data.state,
    zip: data.zip,
    country: 'US',
  };

  const validationResult = await validateAddress(address);
  
  if (!validationResult.valid) {
    return {
      valid: false,
      errors: validationResult.errors || ['Address could not be validated.'],
    };
  }

  return { valid: true, errors: [] };
}

// Get shipping options for cart items
export interface ShippingOption {
  carrier: string;
  service: string;
  rate: number;
  estimatedDays: number;
  deliveryDate?: string;
}

export async function getShippingOptions(
  address: ShippingAddress,
  cartItems: Array<{ quantity: number; weight?: number }>
): Promise<ShippingOption[]> {
  const fromAddress: ShippingAddress = {
    street: process.env.SHIPPING_FROM_STREET || '123 Bakery Lane',
    city: process.env.SHIPPING_FROM_CITY || 'Los Angeles',
    state: process.env.SHIPPING_FROM_STATE || 'CA',
    zip: process.env.SHIPPING_FROM_ZIP || '90001',
    country: 'US',
  };

  // Calculate package dimensions from cart items (default: 1lb per item)
  const packageDimensions: PackageDimensions = {
    weight: cartItems.length || 1, // 1 oz per item as default
  };
  const rates = await getShippingRates(fromAddress, address, packageDimensions);

  return rates.map((rate: ShippingRate) => ({
    carrier: rate.carrier,
    service: rate.service,
    rate: rate.rate,
    estimatedDays: rate.estimatedDays,
    deliveryDate: rate.deliveryDate,
  }));
}

// Re-export shipping service types for convenience
export type { ShippingAddress, ShippingRate, PackageDimensions };
