/**
 * 🛒 Cart Engine - The Ultimate Unified Cart System
 * Single source of truth for all cart operations
 * Consolidates Zustand, cartUtils, and unified-cart into one powerful system
 */

import { createLogger } from './logger';

const logger = createLogger('CartEngine');

// SINGLE CART KEY - One ring to rule them all
export const CART_KEY = 'tog_cart_engine_v1';

/**
 * 🎯 Cart Item Structure - The gold standard
 * 
 * @typedef {Object} CartItemType
 * @property {string} id - Product ID
 * @property {string} productId - Alias for id
 * @property {string} variationId - Square catalog variation ID
 * @property {string} catalogObjectId - Alias for Square API
 * @property {string} name - Product name
 * @property {string} slug - Product slug
 * @property {string} image - Product image URL
 * @property {string} [category] - Product category (optional)
 * @property {number} price - Price in dollars
 * @property {number} priceCents - Price in cents
 * @property {number} quantity - Item quantity
 * @property {string} addedAt - ISO timestamp
 */

/**
 * 🔄 Normalize product from ANY source into standard cart item
 */
export function normalizeProduct(product) {
  const variationId = 
    product.variationId || 
    product.catalogObjectId || 
    product.squareVariationId ||
    product.squareData?.variationId ||
    product.id;
  
  if (!variationId) {
    logger.error('Missing variation ID', { product });
    throw new Error('Product must have a variation ID');
  }

  const productId = product.id || product.productId || variationId;
  const price = typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0;
  const priceCents = product.priceCents || Math.round(price * 100);

  return {
    id: productId,
    productId: productId,
    variationId: variationId,
    catalogObjectId: variationId,
    name: product.name || 'Unknown Product',
    slug: product.slug || productId,
    image: product.image || product.images?.[0] || '/images/sea-moss-default.svg',
    category: product.category || product.intelligentCategory || 'product',
    price: price,
    priceCents: priceCents,
    quantity: product.quantity || 1,
    addedAt: new Date().toISOString(),
  };
}

/**
 * 📦 Load cart from localStorage
 */
export function loadCart() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = localStorage.getItem(CART_KEY);
    
    if (stored) {
      const parsed = JSON.parse(stored);
      logger.info('Cart loaded', { itemCount: parsed.length });
      return parsed;
    }

    // First time - migrate from old systems
    const migrated = migrateOldCarts();
    if (migrated.length > 0) {
      saveCart(migrated);
      logger.info('Cart migrated', { itemCount: migrated.length });
    }
    return migrated;
  } catch (error) {
    logger.error('Failed to load cart', { error: error.message });
    return [];
  }
}

/**
 * 🔄 Migrate from old cart systems
 */
function migrateOldCarts() {
  const oldKeys = [
    'tog_cart_v3',           // Zustand
    'tog_cart',              // cartUtils
    'tog_cart_unified_v1',   // unified-cart
    'cart_items',            // Legacy
    'taste_cart',            // Very old
  ];

  let allItems = [];

  for (const key of oldKeys) {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) continue;

      const parsed = JSON.parse(stored);
      let items = [];

      // Handle different formats
      if (Array.isArray(parsed)) {
        items = parsed;
      } else if (parsed.items) {
        items = parsed.items;
      } else if (parsed.state?.items) {
        items = parsed.state.items;
      }

      if (items.length > 0) {
        logger.info(`Migrating ${items.length} items from ${key}`);
        allItems = allItems.concat(items);
        localStorage.removeItem(key);
      }
    } catch (error) {
      logger.warn(`Failed to migrate from ${key}`, { error: error.message });
    }
  }

  // Deduplicate and merge quantities
  const uniqueMap = new Map();
  
  for (const item of allItems) {
    const normalized = normalizeProduct(item);
    const key = normalized.productId;
    
    if (uniqueMap.has(key)) {
      const existing = uniqueMap.get(key);
      existing.quantity += normalized.quantity;
    } else {
      uniqueMap.set(key, normalized);
    }
  }

  return Array.from(uniqueMap.values());
}

/**
 * 💾 Save cart to localStorage
 */
export function saveCart(items) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    logger.info('Cart saved', { itemCount: items.length });
    
    // Notify all listeners
    const event = new CustomEvent('cartUpdated', {
      detail: { 
        cart: items, 
        count: items.reduce((sum, i) => sum + i.quantity, 0),
        subtotal: items.reduce((sum, i) => sum + (i.price * i.quantity), 0)
      }
    });
    window.dispatchEvent(event);
  } catch (error) {
    logger.error('Failed to save cart', { error: error.message });
  }
}

/**
 * ➕ Add item to cart
 */
export function addToCart(product, quantity = 1) {
  const cart = loadCart();
  const normalized = normalizeProduct({ ...product, quantity });
  
  const existingIndex = cart.findIndex(item => 
    item.productId === normalized.productId ||
    item.variationId === normalized.variationId
  );

  if (existingIndex > -1) {
    cart[existingIndex].quantity += quantity;
    logger.info('Increased quantity', { 
      productId: normalized.productId, 
      newQuantity: cart[existingIndex].quantity 
    });
  } else {
    cart.push(normalized);
    logger.info('Added new item', { productId: normalized.productId });
  }

  saveCart(cart);
  return cart;
}

/**
 * ➖ Remove item from cart
 */
export function removeFromCart(productId) {
  const cart = loadCart();
  const filtered = cart.filter(item => 
    item.id !== productId && 
    item.productId !== productId &&
    item.variationId !== productId
  );
  
  saveCart(filtered);
  logger.info('Item removed', { productId, remainingItems: filtered.length });
  return filtered;
}

/**
 * 🔢 Update item quantity
 */
export function updateQuantity(productId, quantity) {
  const cart = loadCart();
  const item = cart.find(item => 
    item.id === productId || 
    item.productId === productId ||
    item.variationId === productId
  );

  if (item) {
    if (quantity <= 0) {
      return removeFromCart(productId);
    }
    item.quantity = quantity;
    saveCart(cart);
    logger.info('Quantity updated', { productId, newQuantity: quantity });
  }

  return cart;
}

/**
 * 🗑️ Clear entire cart
 */
export function clearCart() {
  saveCart([]);
  logger.info('Cart cleared');
  return [];
}

/**
 * 💰 Get cart totals
 */
export function getCartTotal() {
  const cart = loadCart();
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
 * 💵 Format price
 */
export function formatPrice(price) {
  return `$${parseFloat(price).toFixed(2)}`;
}

export function formatPriceCents(cents) {
  return formatPrice(cents / 100);
}

/**
 * 🎧 Subscribe to cart changes
 */
export function subscribeToCart(callback) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handler = (event) => {
    callback(event.detail);
  };

  window.addEventListener('cartUpdated', handler);
  return () => window.removeEventListener('cartUpdated', handler);
}

/**
 * 🎯 Create cart item (for backward compatibility)
 */
export function createCartItem(product) {
  return normalizeProduct(product);
}

// Aliases for backward compatibility
export const getCartTotals = getCartTotal;
export const updateCartQuantity = updateQuantity;
export const CART_STORAGE_KEY = CART_KEY;
