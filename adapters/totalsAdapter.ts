/**
 * Totals Adapter - Computes order totals using existing business logic
 * Reuses delivery fee calculation, tax rules, and minimum order validation
 */

import { CartItem } from './cartAdapter';

/**
 * Delivery fee tiers (from existing logic)
 */
const DELIVERY_FEE = 6.99;
const DELIVERY_MINIMUM = 30;

/**
 * Tax rate (8% - from existing logic)
 */
const TAX_RATE = 0.08;

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
}

/**
 * Compute comprehensive order totals
 */
export function computeTotals(input: TotalsInput): OrderTotals {
  const { cart, fulfillmentType, tip = 0, couponDiscount = 0, shippingFee = 0 } = input;
  
  // Calculate subtotal
  const subtotal = cart.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 1)), 0);
  const itemCount = cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
  
  // Calculate delivery fee
  let deliveryFee = 0;
  if (fulfillmentType === 'delivery') {
    deliveryFee = DELIVERY_FEE;
  } else if (fulfillmentType === 'shipping') {
    deliveryFee = shippingFee;
  }
  
  // Calculate tax (on subtotal only, not fees)
  const tax = subtotal * TAX_RATE;
  
  // Calculate total
  const total = subtotal - couponDiscount + deliveryFee + tax + tip;
  
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
  if (fulfillmentType === 'delivery' && subtotal < DELIVERY_MINIMUM) {
    return {
      valid: false,
      message: `Minimum order for delivery is $${DELIVERY_MINIMUM.toFixed(2)}`
    };
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
  constants: {
    DELIVERY_FEE,
    DELIVERY_MINIMUM,
    TAX_RATE
  }
};
