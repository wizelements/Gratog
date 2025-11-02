/**
 * Delivery & Fulfillment Fee Calculations
 * Handles delivery fees, shipping fees, tips, and order totals
 */

import { getDeliveryConfig } from './fulfillment';

// Calculate delivery fee based on subtotal
export function calculateDeliveryFee(subtotal: number): number {
  const config = getDeliveryConfig();
  return subtotal >= config.freeThreshold ? 0 : config.baseFee;
}

// Calculate progress toward free delivery
export function getFreeDeliveryProgress(subtotal: number): number {
  const config = getDeliveryConfig();
  const remaining = config.freeThreshold - subtotal;
  return Math.max(0, remaining);
}

// Check if order qualifies for free delivery
export function qualifiesForFreeDelivery(subtotal: number): boolean {
  return getFreeDeliveryProgress(subtotal) === 0;
}

// Calculate shipping fee based on state
export function calculateShippingFee(state: string, subtotal: number): number {
  const FREE_SHIPPING_THRESHOLD = 50;
  
  if (subtotal >= FREE_SHIPPING_THRESHOLD) {
    return 0;
  }
  
  const SHIPPING_RATES: { [key: string]: number } = {
    'GA': 8.99,
    'AL': 9.99,
    'FL': 9.99,
    'TN': 9.99,
    'SC': 9.99,
    'NC': 10.99,
  };
  
  return SHIPPING_RATES[state] || 12.99;
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
