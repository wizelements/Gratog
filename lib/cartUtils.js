/**
 * Unified Cart Utilities
 * Fixes: localStorage mismatch, cart structure, price calculations, image fallbacks
 * SINGLE SOURCE OF TRUTH for cart operations
 */

// CRITICAL: Use same key as order page (Fix #1)
export const CART_STORAGE_KEY = 'taste-of-gratitude-cart';
export const CUSTOMER_STORAGE_KEY = 'taste-of-gratitude-customer';

/**
 * Create standardized cart item matching order page format
 * Fixes #2 (ID structure), #3 (data structure), #4 (price), #5 (images)
 */
export function createCartItem(product, quantity = 1, size = '16oz') {
  // Ensure price is in dollars (Fix #4)
  const priceDollars = typeof product.price === 'number' 
    ? product.price 
    : parseFloat(product.price) || 0;
  
  // Use first variation price if main price is 0
  const finalPrice = priceDollars || (product.variations?.[0]?.price) || 0;
  
  return {
    // Fix #2: Match order page ID format exactly
    id: `${product.id}_${size}`,
    slug: product.slug || product.id,
    name: product.name,
    price: finalPrice, // Fix #4: Dollars only, standardized
    size: size,
    quantity: quantity,
    // Fix #5: Fallback chain for images
    image: product.image || product.images?.[0] || '/images/sea-moss-default.svg',
    category: product.category || 'other',
    rewardPoints: product.rewardPoints || Math.floor(finalPrice),
    squareProductUrl: product.squareProductUrl || '',
    variationId: product.variationId || product.squareData?.variationId || ''
  };
}

/**
 * Load cart from localStorage (Fix #1: unified key)
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
 * Save cart to localStorage (Fix #1: unified key)
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
 * Add item to cart with duplicate handling
 */
export function addToCart(product, quantity = 1, size = '16oz') {
  const cart = loadCart();
  const newItem = createCartItem(product, quantity, size);
  
  // Check if item already exists
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
 * Format price consistently (Fix #4)
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
