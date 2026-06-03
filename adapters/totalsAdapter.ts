/**
 * Totals Adapter - Computes order totals using existing business logic
 * Reuses delivery fee calculation, tax rules, and minimum order validation
 */

import { CartItem } from './cartAdapter';
import { getDeliveryConfig } from '@/lib/fulfillment';

/**
 * Tax is currently handled outside checkout pricing; keep client and server totals aligned.
 */
const TAX_RATE = 0;

export interface OrderTotals {
  subtotal: number;
  deliveryFee: number;
  tax: number;
  tip: number;
  couponDiscount: number;
  total: number;
  itemCount: number;
  freeDeliveryProgress?: {
    remaining: number;
    percentage: number;
  };
}

export interface TotalsInput {
  cart: CartItem[];
  fulfillmentType: 'pickup' | 'delivery' | 'shipping';
  tip?: number;
  couponDiscount?: number;
  shippingFee?: number;
  deliveryFee?: number;
}

/**
 * Compute comprehensive order totals
 */
export function computeTotals(input: TotalsInput): OrderTotals {
  const { cart, fulfillmentType, tip = 0, couponDiscount = 0, shippingFee = 0, deliveryFee: quotedDeliveryFee } = input;
  
  const subtotal = cart.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 1)), 0);
  const itemCount = cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
  
  let deliveryFee = 0;
  if (fulfillmentType === 'delivery') {
    deliveryFee = typeof quotedDeliveryFee === 'number'
      ? Math.max(0, quotedDeliveryFee)
      : 0;
  } else if (fulfillmentType === 'shipping') {
    deliveryFee = shippingFee;
  }
  
  const tax = subtotal * TAX_RATE;
  const total = Math.max(0, subtotal - couponDiscount + deliveryFee + tax + tip);
  
  return {
    subtotal,
    deliveryFee,
    tax,
    tip,
    couponDiscount,
    total,
    itemCount,
  };
}

/**
 * Validate if cart meets minimum order requirements
 */
export function validateMinimumOrder(
  subtotal: number, 
  fulfillmentType: 'pickup' | 'delivery' | 'shipping'
): { valid: boolean; message?: string } {
  if (fulfillmentType === 'delivery') {
    const config = getDeliveryConfig();
    if (subtotal < config.minSubtotal) {
      return {
        valid: false,
        message: `Minimum order for delivery is $${config.minSubtotal.toFixed(2)}`
      };
    }
  }
  
  return { valid: true };
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Totals computation utility
 */
export const Totals = {
  compute: computeTotals,
  validateMinimum: validateMinimumOrder,
  format: formatCurrency,
  get constants() {
    const config = getDeliveryConfig();
    return {
      DELIVERY_FEE: config.baseFee,
      DELIVERY_MINIMUM: config.minSubtotal,
      TAX_RATE
    };
  }
};
