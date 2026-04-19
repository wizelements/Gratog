/**
 * Cart & Product Validation
 * Ensures cart data is valid before payment processing
 */

import type { CartItem as EngineCartItem } from '@/lib/cart-engine';

// Re-export CartItem for this module
export type CartItem = EngineCartItem;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates quantity value
 */
export function validateQuantity(quantity: any): ValidationResult {
  // Check if quantity exists
  if (quantity === undefined || quantity === null) {
    return { valid: false, error: 'Quantity is required' };
  }

  // Convert to number if string
  const qty = typeof quantity === 'string' ? parseFloat(quantity) : quantity;

  // Check if valid number
  if (isNaN(qty)) {
    return { valid: false, error: 'Quantity must be a valid number' };
  }

  // Check if integer
  if (!Number.isInteger(qty)) {
    return { valid: false, error: 'Quantity must be a whole number' };
  }

  // Check if positive
  if (qty <= 0) {
    return { valid: false, error: 'Quantity must be greater than 0' };
  }

  // Check maximum (prevent abuse)
  if (qty > 999) {
    return { valid: false, error: 'Quantity cannot exceed 999' };
  }

  return { valid: true };
}

/**
 * Validates price value
 */
export function validatePrice(price: any): ValidationResult {
  // Check if price exists
  if (price === undefined || price === null) {
    return { valid: false, error: 'Price is required' };
  }

  // Convert to number if string
  const priceNum = typeof price === 'string' ? parseFloat(price) : price;

  // Check if valid number
  if (isNaN(priceNum)) {
    return { valid: false, error: 'Price must be a valid number' };
  }

  // Check if positive
  if (priceNum <= 0) {
    return { valid: false, error: 'Price must be greater than $0' };
  }

  // Check maximum (sanity check)
  if (priceNum > 10000) {
    return { valid: false, error: 'Price cannot exceed $10,000' };
  }

  return { valid: true };
}

/**
 * Validates a single cart item
 */
export function validateCartItem(item: any, index?: number): ValidationResult {
  const itemLabel = index !== undefined ? `Item ${index + 1}` : 'Cart item';

  if (!item || typeof item !== 'object') {
    return { valid: false, error: `${itemLabel}: Invalid item data` };
  }

  // Check for product identifier (at least one required)
  const hasIdentifier = !!(
    item.productId ||
    item.variationId ||
    item.catalogObjectId ||
    item.squareVariationId
  );

  if (!hasIdentifier) {
    return { valid: false, error: `${itemLabel}: Missing product identifier` };
  }

  // Validate quantity
  const qtyValidation = validateQuantity(item.quantity);
  if (!qtyValidation.valid) {
    return { valid: false, error: `${itemLabel}: ${qtyValidation.error}` };
  }

  // Validate price if present
  if (item.price !== undefined && item.price !== null) {
    const priceValidation = validatePrice(item.price);
    if (!priceValidation.valid) {
      return { valid: false, error: `${itemLabel}: ${priceValidation.error}` };
    }
  }

  return { valid: true };
}

/**
 * Validates entire cart
 */
export function validateCart(cart: any): ValidationResult {
  if (!cart || typeof cart !== 'object') {
    return { valid: false, error: 'Cart data is required' };
  }

  // Check if items array exists
  if (!Array.isArray(cart.items) && !Array.isArray(cart)) {
    return { valid: false, error: 'Cart must contain an items array' };
  }

  const items = Array.isArray(cart) ? cart : cart.items;

  // Check if cart is empty
  if (items.length === 0) {
    return { valid: false, error: 'Cart cannot be empty' };
  }

  // Validate each item
  for (let i = 0; i < items.length; i++) {
    const itemValidation = validateCartItem(items[i], i);
    if (!itemValidation.valid) {
      return itemValidation;
    }
  }

  // Validate total if present
  if (cart.subtotal !== undefined) {
    const totalValidation = validatePrice(cart.subtotal);
    if (!totalValidation.valid) {
      return { valid: false, error: `Cart total: ${totalValidation.error}` };
    }
  }

  return { valid: true };
}

/**
 * Calculates cart totals for validation
 */
export function calculateCartTotals(items: CartItem[]): {
  subtotal: number;
  itemCount: number;
  totalQuantity: number;
} {
  let subtotal = 0;
  let totalQuantity = 0;

  for (const item of items) {
    const price = item.price || 0;
    const quantity = item.quantity || 0;
    subtotal += price * quantity;
    totalQuantity += quantity;
  }

  return {
    subtotal: Math.round(subtotal * 100) / 100, // Round to 2 decimals
    itemCount: items.length,
    totalQuantity
  };
}
