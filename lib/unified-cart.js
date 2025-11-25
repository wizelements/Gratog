/**
 * Unified Cart System
 * Single source of truth for all cart operations across the application
 * Consolidates Zustand store, cartUtils, and legacy implementations
 */

import { createLogger } from './logger';

const logger = createLogger('UnifiedCart');

// UNIFIED CART KEY - Only one storage key for the entire app
export const UNIFIED_CART_KEY = 'tog_cart_unified_v1';

/**
 * Unified Cart Item Structure
 * All cart items must conform to this structure
 * 
 * @typedef {Object} UnifiedCartItem
 * @property {string} id - Product ID
 * @property {string} productId - Alias for id (consistency)
 * @property {string} variationId - Square catalog variation ID (primary)
 * @property {string} catalogObjectId - Alias for variationId (Square API compatibility)
 * @property {string} name - Product name
 * @property {string} slug - Product slug
 * @property {string} image - Product image URL
 * @property {string} [category] - Product category (optional)
 * @property {number} price - Price in dollars
 * @property {number} priceCents - Price in cents
 * @property {number} quantity - Item quantity
 */

/**
 * Normalize product data from any source into UnifiedCartItem
 * @param {Object} product - Product data from any source
 * @returns {UnifiedCartItem} Normalized cart item
 */
export function normalizeCartItem(product) {
  logger.debug('Normalizing cart item', { productId: product.id || product.productId });

  // Extract variation ID from multiple possible sources
  const variationId = 
    product.variationId || 
    product.catalogObjectId || 
    product.squareVariationId ||
    product.squareData?.variationId ||
    product.id;
  
  if (!variationId) {
    logger.error('Missing variation ID', { product });
    throw new Error('Product must have a variation ID for Square integration');
  }

  const productId = product.id || product.productId || variationId;
  const price = typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0;
  const priceCents = product.priceCents || Math.round(price * 100);

  const normalized = {
    // IDs
    id: productId,
    productId: productId,
    variationId: variationId,
    catalogObjectId: variationId, // Square API compatibility
    
    // Display
    name: product.name || 'Unknown Product',
    slug: product.slug || productId,
    image: product.image || product.images?.[0] || '/images/sea-moss-default.svg',
    category: product.category || product.intelligentCategory || 'product',
    
    // Pricing
    price: price,
    priceCents: priceCents,
    
    // Quantity
    quantity: product.quantity || 1,
  };

  logger.info('Cart item normalized', { 
    productId: normalized.id, 
    variationId: normalized.variationId,
    price: normalized.price 
  });
  
  return normalized;
}

/**
 * Load cart from localStorage
 * Handles migration from old cart formats
 */
export function loadUnifiedCart() {
  if (typeof window === 'undefined') {
    logger.debug('SSR: Returning empty cart');
    return [];
  }

  try {
    // Try loading from unified key first
    let stored = localStorage.getItem(UNIFIED_CART_KEY);
    
    if (stored) {
      const parsed = JSON.parse(stored);
      logger.info('Loaded unified cart', { itemCount: parsed.length });
      return parsed;
    }

    // Migration: Check old cart keys
    logger.info('No unified cart found, checking for migration');
    const migratedCart = migrateOldCarts();
    
    if (migratedCart.length > 0) {
      saveUnifiedCart(migratedCart);
      logger.info('Migrated cart saved', { itemCount: migratedCart.length });
    }
    
    return migratedCart;
  } catch (error) {
    logger.error('Failed to load cart', { error: error.message });
    return [];
  }
}

/**
 * Migrate carts from old storage keys
 */
function migrateOldCarts() {
  const oldKeys = [
    'tog_cart_v3',      // Zustand store
    'tog_cart',         // cartUtils.js
    'cart_items',       // Legacy
    'taste_cart'        // Very old
  ];

  let migratedItems = [];

  for (const key of oldKeys) {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) continue;

      const parsed = JSON.parse(stored);
      
      // Handle different storage formats
      let items = [];
      if (Array.isArray(parsed)) {
        items = parsed;
      } else if (parsed.items && Array.isArray(parsed.items)) {
        items = parsed.items;
      } else if (parsed.state?.items && Array.isArray(parsed.state.items)) {
        // Zustand persisted state
        items = parsed.state.items;
      }

      if (items.length > 0) {
        logger.info(`Migrating ${items.length} items from ${key}`);
        migratedItems = migratedItems.concat(items.map(normalizeCartItem));
        
        // Remove old key after successful migration
        localStorage.removeItem(key);
        logger.info(`Removed old cart key: ${key}`);
      }
    } catch (error) {
      logger.warn(`Failed to migrate from ${key}`, { error: error.message });
    }
  }

  // Deduplicate by productId
  const uniqueItems = [];
  const seenIds = new Set();
  
  for (const item of migratedItems) {
    if (!seenIds.has(item.productId)) {
      seenIds.add(item.productId);
      uniqueItems.push(item);
    } else {
      // Merge quantities for duplicates
      const existing = uniqueItems.find(i => i.productId === item.productId);
      if (existing) {
        existing.quantity += item.quantity;
      }
    }
  }

  return uniqueItems;
}

/**
 * Save cart to localStorage
 */
export function saveUnifiedCart(items) {
  if (typeof window === 'undefined') {
    logger.warn('SSR: Cannot save cart');
    return;
  }

  try {
    localStorage.setItem(UNIFIED_CART_KEY, JSON.stringify(items));
    logger.info('Cart saved', { itemCount: items.length });
    
    // Dispatch event for components listening to cart changes
    window.dispatchEvent(new CustomEvent('cartUpdated', {
      detail: { cart: items, count: items.reduce((sum, i) => sum + i.quantity, 0) }
    }));
  } catch (error) {
    logger.error('Failed to save cart', { error: error.message });
  }
}

/**
 * Add item to cart
 */
export function addToUnifiedCart(product) {
  const cart = loadUnifiedCart();
  const normalizedItem = normalizeCartItem(product);
  
  const existingIndex = cart.findIndex(item => 
    item.productId === normalizedItem.productId ||
    item.variationId === normalizedItem.variationId
  );

  if (existingIndex > -1) {
    // Update quantity
    cart[existingIndex].quantity += normalizedItem.quantity;
    logger.info('Increased quantity', { 
      productId: normalizedItem.productId, 
      newQuantity: cart[existingIndex].quantity 
    });
  } else {
    // Add new item
    cart.push(normalizedItem);
    logger.info('Added new item', { productId: normalizedItem.productId });
  }

  saveUnifiedCart(cart);
  return cart;
}

/**
 * Remove item from cart
 */
export function removeFromUnifiedCart(productId) {
  const cart = loadUnifiedCart();
  const filtered = cart.filter(item => 
    item.id !== productId && 
    item.productId !== productId &&
    item.variationId !== productId
  );
  
  saveUnifiedCart(filtered);
  logger.info('Item removed', { productId, remainingItems: filtered.length });
  return filtered;
}

/**
 * Update item quantity
 */
export function updateUnifiedCartQuantity(productId, quantity) {
  const cart = loadUnifiedCart();
  const item = cart.find(item => 
    item.id === productId || 
    item.productId === productId ||
    item.variationId === productId
  );

  if (item) {
    if (quantity <= 0) {
      return removeFromUnifiedCart(productId);
    }
    item.quantity = quantity;
    saveUnifiedCart(cart);
    logger.info('Quantity updated', { productId, newQuantity: quantity });
  }

  return cart;
}

/**
 * Clear entire cart
 */
export function clearUnifiedCart() {
  saveUnifiedCart([]);
  logger.info('Cart cleared');
  return [];
}

/**
 * Get cart totals
 */
export function getUnifiedCartTotals() {
  const cart = loadUnifiedCart();
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  return { 
    subtotal, 
    totalItems, 
    items: cart,
    itemCount: cart.length
  };
}

/**
 * Format price for display
 */
export function formatPrice(price) {
  return `$${parseFloat(price).toFixed(2)}`;
}

export function formatPriceCents(cents) {
  return formatPrice(cents / 100);
}

// Export for backward compatibility
export const getCartTotal = getUnifiedCartTotals;
export const getCartTotals = getUnifiedCartTotals;
