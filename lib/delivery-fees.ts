/**
 * Delivery & Fulfillment Fee Calculations
 * Handles delivery fees, shipping fees, tips, and order totals
 */

import { getDeliveryConfig } from './fulfillment';

const DISTANCE_TIERS = [
  { maxMiles: 5, fee: 0 },
  { maxMiles: 10, fee: 3.99 },
  { maxMiles: 15, fee: 7.99 },
  { maxMiles: 20, fee: 11.99 },
  { maxMiles: 25, fee: 15.99 },
];

const DELIVERY_DISCOUNT_TIERS = [
  { minSubtotal: 85, percentOff: 10 },
  { minSubtotal: 65, percentOff: 5 },
];

// Calculate delivery fee based on subtotal
export function calculateDeliveryFee(subtotal: number): number {
  const config = getDeliveryConfig();
  return config.baseFee;
}

export function calculateDistanceBasedDeliveryFee(distanceMiles: number, subtotal: number): number {
  const roundedDistance = Number.isFinite(distanceMiles) ? distanceMiles : 999;
  const matchingTier = DISTANCE_TIERS.find((tier) => roundedDistance <= tier.maxMiles);

  if (!matchingTier) {
    return DISTANCE_TIERS[DISTANCE_TIERS.length - 1].fee;
  }

  if (matchingTier.fee === 0) {
    return 0;
  }

  const discountTier = DELIVERY_DISCOUNT_TIERS.find((tier) => subtotal >= tier.minSubtotal);
  if (!discountTier) {
    return matchingTier.fee;
  }

  const discountedFee = matchingTier.fee * (1 - discountTier.percentOff / 100);
  return Math.round(discountedFee * 100) / 100;
}

// Calculate progress toward free delivery
export function getFreeDeliveryProgress(subtotal: number): number {
  return 0;
}

// Check if order qualifies for free delivery
export function qualifiesForFreeDelivery(subtotal: number): boolean {
  return false;
}

// Shipping removed — contact us for shipping inquiries
export function calculateShippingFee(_state: string, _subtotal: number): number {
  return 0;
}

// Calculate tip amount from preset or custom
export function calculateTip(preset: number | 'custom', customValue?: number): number {
  if (preset === 'custom' && customValue !== undefined) {
    return Math.max(0, Math.round(customValue * 100) / 100);
  }
  return typeof preset === 'number' ? preset : 0;
}

// Get tip presets from configuration
export function getTipPresets(): number[] {
  const config = getDeliveryConfig();
  return config.tipPresets;
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

// Parse currency string to number
export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
