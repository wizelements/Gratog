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
 * 🔒 Get safe localStorage reference
 * Returns null if localStorage is unavailable (Safari Private, embedded browsers, etc.)
 */
function getSafeLocalStorage() {
  if (typeof window === 'undefined') return null;
  
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    logger.warn('localStorage not available, using in-memory fallback');
    return null;
  }
}

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
  
  // Extract variant label from multiple possible sources
  const variantLabel = 
    product.variantLabel || 
    product.size || 
    product.variationName || 
    product.variantName || 
    null;

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
    variantLabel: variantLabel,
    size: variantLabel, // Keep size for backward compatibility
    addedAt: new Date().toISOString(),
  };
}

/**
 * 🔄 Migrate cart items to add missing variant labels
 */
function migrateCartItemLabels(items) {
  return items.map(item => {
    // If item already has a variantLabel, no need to migrate
    if (item.variantLabel || item.size) {
      return item;
    }
    
    // Try to infer variant label from variationId or other data
    let inferredLabel = null;
    
    // Check if we can extract size from variation data
    if (item.variations && Array.isArray(item.variations)) {
      const matchingVariation = item.variations.find(v => v.id === item.variationId);
      if (matchingVariation) {
        inferredLabel = matchingVariation.name;
      } else if (item.variations.length > 0) {
        // Use first variation as fallback
        inferredLabel = item.variations[0].name;
      }
    }
    
    // Fallback: try to infer from price
    if (!inferredLabel && item.price) {
      if (item.price <= 15) {
        inferredLabel = '4oz';
      } else if (item.price > 15 && item.price <= 40) {
        inferredLabel = '16oz';
      } else {
        inferredLabel = '32oz';
      }
    }
    
    logger.info('Migrated cart item to add label', {
      productId: item.productId,
      inferredLabel
    });
    
    return {
      ...item,
      variantLabel: inferredLabel,
      size: inferredLabel
    };
  });
}

/**
 * 📦 Load cart from localStorage
 */
export function loadCart() {
  if (typeof window === 'undefined') {
    return [];
  }

  const storage = getSafeLocalStorage();
  if (!storage) {
    return [];
  }

  try {
    const stored = storage.getItem(CART_KEY);
    
    if (stored) {
      const parsed = JSON.parse(stored);
      
      // Ensure parsed is an array
      if (!Array.isArray(parsed)) {
        logger.warn('Cart data is not an array, resetting cart');
        return [];
      }
      
      // Migrate old items that lack variant labels
      const migrated = migrateCartItemLabels(parsed);
      const needsMigration = migrated.some((item, idx) => 
        item.variantLabel !== parsed[idx].variantLabel
      );
      
      if (needsMigration) {
        logger.info('Migrating cart items with missing labels', { itemCount: migrated.length });
        saveCart(migrated);
        return migrated;
      }
      
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
  const storage = getSafeLocalStorage();
  if (!storage) {
    return [];
  }

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
      const stored = storage.getItem(key);
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
        storage.removeItem(key);
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

  const storage = getSafeLocalStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(CART_KEY, JSON.stringify(items));
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
 * ➕ Add item to cart with proper variant handling
 * @param product - Product object
 * @param quantity - Quantity to add (default 1)
 * @param selectedVariation - Optional variant selection {id, name, price}
 */
export function addToCart(product, quantity = 1, selectedVariation = null) {
  const cart = loadCart();
  
  // If no variant is explicitly selected but product has variations, use the first one
  let effectiveVariation = selectedVariation;
  if (!effectiveVariation && product.variations && product.variations.length > 0) {
    effectiveVariation = product.variations[0];
    logger.info('No variant selected, using first variation as default', {
      productId: product.id,
      defaultVariant: effectiveVariation.id,
      defaultVariantName: effectiveVariation.name
    });
  }
  
  // If a specific variation is selected or defaulted, merge it with the product
  let productToAdd = { ...product, quantity };
  
  if (effectiveVariation) {
    // Override product data with selected variant
    productToAdd = {
      ...product,
      quantity,
      price: effectiveVariation.price,
      variationId: effectiveVariation.id,
      catalogObjectId: effectiveVariation.id,
      size: effectiveVariation.name,
      // Include variant label in product name for cart display
      variantLabel: effectiveVariation.name
    };
    
    logger.info('Adding with variant', { 
      productId: product.id,
      variantId: effectiveVariation.id,
      variantName: effectiveVariation.name,
      price: effectiveVariation.price 
    });
  }
  
  const normalized = normalizeProduct(productToAdd);
  
  // Match by BOTH productId AND variationId for proper multi-variant support
  const existingIndex = cart.findIndex(item => 
    item.productId === normalized.productId &&
    item.variationId === normalized.variationId
  );

  if (existingIndex > -1) {
    cart[existingIndex].quantity += quantity;
    logger.info('Increased quantity', { 
      productId: normalized.productId,
      variantId: normalized.variationId,
      newQuantity: cart[existingIndex].quantity 
    });
  } else {
    cart.push(normalized);
    logger.info('Added new item', { 
      productId: normalized.productId,
      variantId: normalized.variationId,
      variantLabel: normalized.variantLabel
    });
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
