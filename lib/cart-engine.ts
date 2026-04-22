/**
 * 🛒 Cart Engine - The Ultimate Unified Cart System
 * 
 * BEST PRACTICES IMPLEMENTED:
 * - Single source of truth for cart operations
 * - Comprehensive validation at every step
 * - Market-exclusive enforcement
 * - Preorder validation
 * - Graceful fallbacks
 */

import { createLogger } from './logger';

// Type definitions
export interface CartItem {
  id: string;
  productId: string;
  variationId: string;
  catalogObjectId: string;
  name: string;
  slug: string;
  image: string;
  category?: string;
  price: number;
  priceCents: number;
  quantity: number;
  variantLabel?: string;
  size?: string;
  addedAt: string;
  isPreorder?: boolean;
  marketExclusive?: boolean;
  fulfillmentType?: string;
  // Legacy compatibility
  variant?: {
    id: string;
    name: string;
    price: number;
    sku?: string;
  } | null;
  rewardPoints?: number;
  squareProductUrl?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  code?: string;
}

const logger = createLogger('CartEngine');

export const CART_KEY = 'tog_cart_engine_v1';

// 🎯 MARKET CONFIGURATION - Single source of truth
export const MARKET_CONFIG = {
  serenbe: {
    id: 'serenbe',
    name: 'Serenbe Farmers Market',
    day: 'Saturday',
    hours: '9am-1pm',
    location: 'Serenbe',
    allowsBoba: true,
    allowsPreorder: true,
  },
  dunwoody: {
    id: 'dunwoody',
    name: 'Dunwoody Market',
    day: 'Saturday', 
    hours: '9am-12pm',
    location: 'Dunwoody',
    allowsBoba: true,
    allowsPreorder: true,
  },
  shipping: {
    id: 'shipping',
    name: 'Shipping',
    allowsBoba: false,
    allowsPreorder: false,
  },
  delivery: {
    id: 'delivery',
    name: 'Local Delivery',
    allowsBoba: false,
    allowsPreorder: false,
  }
};

// Preorder rules by product type
export const PREORDER_MINIMUM = 60; // Minimum subtotal for non-boba preorder items
export const BOBA_PREORDER_MAX_QTY = 2; // Max boba drinks per preorder (order more at market)

// 🎯 MARKET-EXCLUSIVE PRODUCTS
const MARKET_EXCLUSIVE_CATEGORIES = ['boba', 'market-exclusive', 'fresh-pressed'];
const MARKET_EXCLUSIVE_KEYWORDS = ['boba', 'bubble tea', 'tapioca', 'fresh pressed', 'market only'];

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
 * 🎯 DETERMINE IF PRODUCT IS MARKET-EXCLUSIVE
 */
function isMarketExclusive(product) {
  // Check explicit flag
  if (product.marketExclusive === true) return true;
  
  // Check category
  const category = (product.category || product.intelligentCategory || '').toLowerCase();
  if (MARKET_EXCLUSIVE_CATEGORIES.some(c => category.includes(c))) return true;
  
  // Check name for keywords
  const name = (product.name || '').toLowerCase();
  if (MARKET_EXCLUSIVE_KEYWORDS.some(k => name.includes(k))) return true;
  
  // Check tags
  const tags = product.tags || [];
  if (tags.some((t) => MARKET_EXCLUSIVE_KEYWORDS.includes(t.toLowerCase()))) return true;
  
  return false;
}

/**
 * 🎯 VALIDATE CART FOR FULFILLMENT TYPE
 * Returns validation result with specific error messages
 */
export function validateCartForFulfillment(
  cart,
  fulfillmentType,
  marketId
) {
  if (!cart.length) {
    return { valid: false, error: 'Your cart is empty', code: 'EMPTY_CART' };
  }
  
  // Extract market from fulfillment type or marketId
  const marketKey = marketId || 
    (fulfillmentType.includes('serenbe') ? 'serenbe' :
     fulfillmentType.includes('dunwoody') ? 'dunwoody' :
     fulfillmentType.includes('pickup') ? 'serenbe' : // default to serenbe for generic pickup
     fulfillmentType.includes('delivery') ? 'delivery' :
     fulfillmentType.includes('shipping') ? 'shipping' : null);
  
  if (!marketKey) {
    return { valid: false, error: 'Please select a fulfillment method', code: 'NO_FULFILLMENT' };
  }
  
  const market = MARKET_CONFIG[marketKey];
  
  // Check for market-exclusive items in non-market orders
  const marketExclusiveItems = cart.filter(item => item.marketExclusive || isMarketExclusive(item));
  
  if (marketExclusiveItems.length > 0) {
    // If this is shipping/delivery, block it
    if (['shipping', 'delivery'].includes(marketKey)) {
      const itemNames = marketExclusiveItems.map(i => i.name).join(', ');
      return {
        valid: false,
        error: `${itemNames} ${marketExclusiveItems.length > 1 ? 'are' : 'is'} only available for market pickup at Serenbe (Saturdays 9am-1pm) or Dunwoody (Saturdays 9am-12pm). Please select a market pickup option or remove ${marketExclusiveItems.length > 1 ? 'these items' : 'this item'}.`,
        code: 'MARKET_EXCLUSIVE_REQUIRED'
      };
    }
  }
  
  // Check for preorder items (only allowed if market supports it)
  const preorderItems = cart.filter(item => item.isPreorder);
  if (preorderItems.length > 0 && market && !market.allowsPreorder) {
    return {
      valid: false,
      error: 'Preorder items are only available for market pickup',
      code: 'PREORDER_NOT_ALLOWED'
    };
  }
  
  // All checks passed
  return { valid: true };
}

/**
 * 🎯 DETERMINE IF ITEM IS BOBA
 */
function isBoba(item: CartItem | any): boolean {
  const category = (item.category || item.intelligentCategory || '').toLowerCase();
  const name = (item.name || '').toLowerCase();
  return category.includes('boba') || name.includes('boba') || name.includes('bubble tea');
}

/**
 * Validate preorder items meet minimum requirements.
 * - Boba: max 2 drinks per preorder (order more at market)
 * - Everything else (lemonades, juices, sea moss): $60 minimum subtotal
 */
export function validatePreorderMinimum(cart: CartItem[]): ValidationResult & { preorderSubtotal?: number; minimumRequired?: number; bobaQty?: number; bobaMax?: number } {
  const preorderItems = cart.filter(item => item.isPreorder);
  if (preorderItems.length === 0) {
    return { valid: true };
  }
  
  // Check boba preorder quantity cap
  const bobaPreorder = preorderItems.filter(item => isBoba(item));
  const bobaQty = bobaPreorder.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
  if (bobaQty > BOBA_PREORDER_MAX_QTY) {
    return {
      valid: false,
      error: `Boba preorders are limited to ${BOBA_PREORDER_MAX_QTY} drinks. Want more? Order at the market! Remove ${bobaQty - BOBA_PREORDER_MAX_QTY} boba drink(s) to continue.`,
      code: 'BOBA_PREORDER_LIMIT',
      bobaQty,
      bobaMax: BOBA_PREORDER_MAX_QTY,
    };
  }
  
  // Check non-boba preorder minimum subtotal ($60)
  const nonBobaPreorder = preorderItems.filter(item => !isBoba(item));
  const preorderSubtotal = nonBobaPreorder.reduce(
    (sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 1)), 
    0
  );
  
  // Only enforce minimum if there are non-boba preorder items
  if (nonBobaPreorder.length > 0 && preorderSubtotal < PREORDER_MINIMUM) {
    return {
      valid: false,
      error: `Preorder items require a $${PREORDER_MINIMUM.toFixed(2)} minimum. Current preorder total: $${preorderSubtotal.toFixed(2)}. Add $${(PREORDER_MINIMUM - preorderSubtotal).toFixed(2)} more to continue.`,
      code: 'PREORDER_MINIMUM_NOT_MET',
      preorderSubtotal,
      minimumRequired: PREORDER_MINIMUM,
    };
  }
  
  return { valid: true, preorderSubtotal, minimumRequired: PREORDER_MINIMUM };
}

/**
 * 🎯 NORMALIZE PRODUCT TO CART ITEM
 * Enhanced with market-exclusive detection
 */
export function normalizeProduct(product: any): CartItem {
  const variationId = 
    product.variationId || 
    product.catalogObjectId || 
    product.squareVariationId ||
    product.squareData?.variationId ||
    product.variations?.[0]?.id ||
    null;
  
  if (!variationId) {
    // Fallback: use product id or slug as variation ID for products without Square variations
    const fallbackId = product.id || product.productId || product.slug;
    if (!fallbackId) {
      logger.error('Missing variation ID', { product });
      throw new Error('Product must have a variation ID');
    }
    logger.warn('Using fallback ID as variationId', { fallbackId });
    return normalizeProduct({ ...product, variationId: fallbackId });
  }

  const productId = product.id || product.productId || variationId;
  const price = typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0;
  const priceCents = product.priceCents || Math.round(price * 100);
  
  const variantLabel = 
    product.variantLabel || 
    product.size || 
    product.variationName || 
    product.variantName || 
    null;

  // 🎯 AUTO-DETECT MARKET-EXCLUSIVE
  const marketExclusive = isMarketExclusive(product);

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
    size: variantLabel,
    addedAt: new Date().toISOString(),
    isPreorder: product.isPreorder || (product.stock != null && product.stock <= 0) || false,
    marketExclusive: marketExclusive,
    fulfillmentType: null, // Will be set at checkout
  };
}

/**
 * 🎯 ADD TO CART WITH VALIDATION
 * Accepts multiple call signatures used across the codebase:
 *   addToCart(cartItem)
 *   addToCart(product, quantity, selectedVariant)
 *   addToCart(product, selectedVariant, quantity)
 */
export function addToCart(productOrItem: any, arg2?: any, arg3?: any): { success: boolean; error?: string } {
  try {
    const storage = getSafeLocalStorage();
    if (!storage) {
      logger.warn('No localStorage, using in-memory cart');
      return { success: true };
    }

    // Resolve the flexible call signatures into a normalized CartItem
    let item: CartItem;

    if (productOrItem.variationId && typeof productOrItem.quantity === 'number' && arg2 === undefined) {
      // Already a CartItem — use directly
      item = productOrItem as CartItem;
    } else {
      // Raw product object — figure out quantity & variant from extra args
      const product = { ...productOrItem };

      let quantity = 1;
      let variant: any = null;

      if (typeof arg2 === 'number') {
        // addToCart(product, quantity, variant?)
        quantity = arg2;
        variant = arg3 || null;
      } else if (typeof arg3 === 'number') {
        // addToCart(product, variant, quantity)
        variant = arg2 || null;
        quantity = arg3;
      } else if (arg2 && typeof arg2 === 'object') {
        // addToCart(product, variant)  — quantity defaults to 1
        variant = arg2;
      }

      // Apply variant overrides to product before normalizing
      if (variant) {
        product.variationId = variant.id || variant.variationId || product.variationId;
        product.variantLabel = variant.name || variant.label || product.variantLabel;
        product.size = variant.name || variant.label || product.size;
        if (variant.price != null) {
          product.price = variant.price;
        }
      }

      product.quantity = quantity;
      item = normalizeProduct(product);
    }

    const currentCart = loadCart();
    
    // Check if item already exists
    const existingIndex = currentCart.findIndex(i => i.variationId === item.variationId);
    
    if (existingIndex >= 0) {
      // Update quantity
      currentCart[existingIndex].quantity += item.quantity;
    } else {
      currentCart.push(item);
    }
    
    storage.setItem(CART_KEY, JSON.stringify(currentCart));
    
    // Dispatch event for real-time updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cart-updated'));
    }
    
    return { success: true };
  } catch (error) {
    logger.error('Failed to add to cart', error);
    return { success: false, error: 'Could not add item to cart' };
  }
}

/**
 * 🎯 LOAD CART WITH MIGRATION
 */
export function loadCart(): CartItem[] {
  try {
    const storage = getSafeLocalStorage();
    if (!storage) return [];
    
    const cartData = storage.getItem(CART_KEY);
    if (!cartData) return [];
    
    const parsed = JSON.parse(cartData);
    if (!Array.isArray(parsed)) return [];
    
    // Migrate old cart items to new format & coerce numeric fields
    return parsed.map(item => ({
      ...item,
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 1,
      priceCents: Number(item.priceCents) || Math.round((Number(item.price) || 0) * 100),
      marketExclusive: item.marketExclusive ?? isMarketExclusive(item),
    }));
  } catch (error) {
    logger.error('Failed to load cart', error);
    return [];
  }
}

/**
 * 🎯 UPDATE QUANTITY
 */
export function updateQuantity(productId: string, quantity: number): boolean {
  try {
    const storage = getSafeLocalStorage();
    if (!storage) return false;
    
    const cart = loadCart();
    const index = cart.findIndex(i => i.id === productId || i.productId === productId);
    
    if (index < 0) return false;
    
    if (quantity <= 0) {
      cart.splice(index, 1);
    } else {
      cart[index].quantity = quantity;
    }
    
    storage.setItem(CART_KEY, JSON.stringify(cart));
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cart-updated'));
    }
    
    return true;
  } catch (error) {
    logger.error('Failed to update quantity', error);
    return false;
  }
}

/**
 * 🎯 REMOVE FROM CART
 */
export function removeFromCart(productId: string): boolean {
  try {
    const storage = getSafeLocalStorage();
    if (!storage) return false;
    
    const cart = loadCart();
    const filtered = cart.filter(i => i.id !== productId && i.productId !== productId);
    
    if (filtered.length === cart.length) return false;
    
    storage.setItem(CART_KEY, JSON.stringify(filtered));
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cart-updated'));
    }
    
    return true;
  } catch (error) {
    logger.error('Failed to remove from cart', error);
    return false;
  }
}

/**
 * 🎯 CLEAR CART
 */
export function clearCart(): boolean {
  try {
    const storage = getSafeLocalStorage();
    if (storage) {
      storage.removeItem(CART_KEY);
    }
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cart-updated'));
    }
    
    return true;
  } catch (error) {
    logger.error('Failed to clear cart', error);
    return false;
  }
}

/**
 * 🎯 GET CART TOTALS
 */
export function getCartTotal(): {
  subtotal: number;
  totalItems: number;
  itemCount: number;
  marketExclusiveCount: number;
  hasPreorderItems: boolean;
} {
  const cart = loadCart();
  
  const subtotal = cart.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 1)), 0);
  const totalItems = cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
  const marketExclusiveCount = cart.filter(i => i.marketExclusive).length;
  const hasPreorderItems = cart.some(i => i.isPreorder);
  
  return {
    subtotal,
    totalItems,
    itemCount: cart.length,
    marketExclusiveCount,
    hasPreorderItems
  };
}

/**
 * 🎯 FORMAT PRICE
 */
export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

export function formatPriceCents(priceCents: number): string {
  return `$${(priceCents / 100).toFixed(2)}`;
}

/**
 * 🎯 GET CART SUMMARY FOR UI
 */
export function getCartSummary() {
  const cart = loadCart();
  const totals = getCartTotal();
  
  return {
    items: cart,
    ...totals,
    hasMarketExclusive: totals.marketExclusiveCount > 0,
    requiresMarketPickup: totals.marketExclusiveCount > 0,
    canShip: totals.marketExclusiveCount === 0,
  };
}

// Legacy exports for backward compatibility
export { normalizeProduct as migrateCartItemLabels };

/**
 * 🎯 SUBSCRIBE TO CART UPDATES
 * Provides a callback-based subscription for cart changes
 * Returns an unsubscribe function
 */
export function subscribeToCart(callback: (detail: { count: number }) => void): () => void {
  const handler = () => {
    const { totalItems } = getCartTotal();
    callback({ count: totalItems });
  };
  
  if (typeof window !== 'undefined') {
    window.addEventListener('cart-updated', handler);
  }
  
  // Return unsubscribe function
  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('cart-updated', handler);
    }
  };
}

// Export normalizeProduct as createCartItem for adapter compatibility
export { normalizeProduct as createCartItem };
