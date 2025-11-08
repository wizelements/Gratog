/**
 * Unified Cart Utilities - WITH VARIANT SUPPORT
 * Fixes: localStorage mismatch, cart structure, price calculations, image fallbacks, VARIANT HANDLING
 * SINGLE SOURCE OF TRUTH for cart operations
 */

// CRITICAL: Use same key as order page
export const CART_STORAGE_KEY = 'taste-of-gratitude-cart';
export const CUSTOMER_STORAGE_KEY = 'taste-of-gratitude-customer';

/**
 * Create standardized cart item with FULL VARIANT SUPPORT
 * @param {Object} product - Product object
 * @param {number} quantity - Item quantity
 * @param {Object|string} variantOrSize - Variant object OR legacy size string
 */
export function createCartItem(product, quantity = 1, variantOrSize = null) {
  // Determine variant data
  let variant = null;
  let size = '16oz'; // Default fallback
  let variationId = '';
  let priceDollars = 0;

  // Handle variant object (NEW)
  if (variantOrSize && typeof variantOrSize === 'object') {
    variant = variantOrSize;
    size = variant.name || '16oz';
    variationId = variant.id;
    priceDollars = variant.price || 0;
  }
  // Handle legacy size string (OLD - for backward compatibility)
  else if (typeof variantOrSize === 'string') {
    size = variantOrSize;
    // Try to find matching variant by name
    if (product.variations && product.variations.length > 0) {
      const matchedVariant = product.variations.find(v => v.name === size);
      if (matchedVariant) {
        variant = matchedVariant;
        variationId = matchedVariant.id;
        priceDollars = matchedVariant.price || 0;
      }
    }
  }
  // No variant provided - use first available
  else if (product.variations && product.variations.length > 0) {
    variant = product.variations[0];
    size = variant.name || '16oz';
    variationId = variant.id;
    priceDollars = variant.price || 0;
  }

  // Fallback to product price if no variant price
  if (priceDollars === 0) {
    priceDollars = typeof product.price === 'number' 
      ? product.price 
      : parseFloat(product.price) || 0;
  }

  // Fallback to variationId from product if not from variant
  if (!variationId) {
    variationId = product.variationId || product.squareData?.variationId || '';
  }
  
  return {
    // Unique ID: productId + variationId (more reliable than size name)
    id: `${product.id}_${variationId || size}`,
    productId: product.id, // Original product ID
    variationId: variationId, // Square variation ID
    slug: product.slug || product.id,
    name: product.name,
    price: priceDollars, // Dollars only
    size: size, // Variant name (e.g., "16oz", "64oz")
    quantity: quantity,
    image: product.image || product.images?.[0] || '/images/sea-moss-default.svg',
    category: product.category || 'other',
    rewardPoints: product.rewardPoints || Math.floor(priceDollars),
    squareProductUrl: product.squareProductUrl || '',
    // Store full variant data for reference
    variant: variant ? {
      id: variant.id,
      name: variant.name,
      price: variant.price,
      sku: variant.sku
    } : null
  };
}

/**
 * Load cart from localStorage
 */
export function loadCart() {
  if (typeof window === 'undefined') return [];
  
  try {
    const cartJson = localStorage.getItem(CART_STORAGE_KEY);
    return cartJson ? JSON.parse(cartJson) : [];
  } catch (e) {
    console.error('Failed to load cart:', e);
    return [];
  }
}

/**
 * Save cart to localStorage
 */
export function saveCart(cart) {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('cartUpdated', { 
      detail: { cart } 
    }));
  } catch (e) {
    console.error('Failed to save cart:', e);
  }
}

/**
 * Add item to cart with duplicate handling - VARIANT AWARE
 * @param {Object} product - Product object
 * @param {number} quantity - Item quantity  
 * @param {Object|string} variantOrSize - Variant object OR legacy size string
 */
export function addToCart(product, quantity = 1, variantOrSize = null) {
  const cart = loadCart();
  const newItem = createCartItem(product, quantity, variantOrSize);
  
  // Check if item already exists (same product + variant)
  const existingIndex = cart.findIndex(item => item.id === newItem.id);
  
  let updatedCart;
  if (existingIndex >= 0) {
    // Increment quantity
    updatedCart = cart.map((item, index) => 
      index === existingIndex 
        ? { ...item, quantity: item.quantity + quantity }
        : item
    );
  } else {
    // Add new item
    updatedCart = [...cart, newItem];
  }
  
  saveCart(updatedCart);
  return updatedCart;
}

/**
 * Update item quantity
 */
export function updateCartQuantity(itemId, quantity) {
  const cart = loadCart();
  
  const updatedCart = cart
    .map(item => item.id === itemId ? { ...item, quantity } : item)
    .filter(item => item.quantity > 0);
  
  saveCart(updatedCart);
  return updatedCart;
}

/**
 * Remove item from cart
 */
export function removeFromCart(itemId) {
  const cart = loadCart();
  const updatedCart = cart.filter(item => item.id !== itemId);
  saveCart(updatedCart);
  return updatedCart;
}

/**
 * Clear entire cart
 */
export function clearCart() {
  saveCart([]);
  return [];
}

/**
 * Get cart totals
 */
export function getCartTotals(cart) {
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  return {
    subtotal,
    itemCount,
    tax: subtotal * 0.08, // 8% estimate
    total: subtotal * 1.08
  };
}

/**
 * Format price consistently
 */
export function formatPrice(price) {
  const numPrice = typeof price === 'number' ? price : parseFloat(price) || 0;
  return numPrice.toFixed(2);
}

/**
 * Validate cart item structure
 */
export function isValidCartItem(item) {
  return item 
    && typeof item.id === 'string'
    && typeof item.name === 'string'
    && typeof item.price === 'number'
    && typeof item.quantity === 'number'
    && item.quantity > 0;
}

/**
 * Clean cart - remove invalid items
 */
export function cleanCart(cart) {
  return cart.filter(isValidCartItem);
}
