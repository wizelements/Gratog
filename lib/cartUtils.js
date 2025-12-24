/**
 * ⚠️ DEPRECATED - This file is kept for backward compatibility only
 * 
 * Please use /lib/cart-engine.js instead
 * 
 * This file will be removed in a future version.
 * All functionality has been moved to the unified Cart Engine.
 * 
 * Migration guide: /docs/CART_ENGINE.md
 */

import { createLogger } from './logger';
import { 
  loadCart as engineLoadCart,
  addToCart as engineAddToCart,
  removeFromCart as engineRemoveFromCart,
  updateQuantity as engineUpdateQuantity,
  clearCart as engineClearCart,
  getCartTotal as engineGetCartTotal,
  formatPrice as engineFormatPrice,
  formatPriceCents as engineFormatPriceCents,
  normalizeProduct,
  CART_KEY,
} from './cart-engine';

const logger = createLogger('CartUtils');

// Re-export all functions from cart-engine for backward compatibility
export const CART_STORAGE_KEY = CART_KEY;
export const loadCart = engineLoadCart;
export const saveCart = (items) => {
  logger.warn('saveCart is deprecated, cart is auto-saved on mutations');
  return items;
};
export const addToCart = engineAddToCart;
export const removeFromCart = engineRemoveFromCart;
export const updateQuantity = engineUpdateQuantity;
export const updateCartQuantity = engineUpdateQuantity;
export const clearCart = engineClearCart;
export const getCartTotal = engineGetCartTotal;
export const getCartTotals = engineGetCartTotal;
export const formatPrice = engineFormatPrice;
export const formatPriceCents = engineFormatPriceCents;
export const createCartItem = normalizeProduct;
