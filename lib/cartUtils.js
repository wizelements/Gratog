import { createLogger } from './logger';

const logger = createLogger('CartUtils');

/**
 * Unified Cart Utilities
 * Single source of truth for all cart operations
 */

const CART_KEY = 'tog_cart';
const CART_VERSION = 'v1';

// Export for adapters
export const CART_STORAGE_KEY = CART_KEY;

export function createCartItem(product) {
  logger.debug('Creating cart item', { productId: product.id, name: product.name });

  // Handle multiple ID formats from different sources
  const variationId = product.variationId || product.catalogObjectId || product.squareVariationId || product.id;
  
  if (!variationId) {
    logger.error('Missing variation ID for cart item', { product });
    throw new Error('Product must have a variation ID');
  }

  const item = {
    id: product.id,
    productId: product.id,
    variationId, // Square catalog object ID
    catalogObjectId: variationId, // Alias for Square checkout
    name: product.name,
    price: typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0,
    priceCents: product.priceCents || Math.round((typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0) * 100),
    quantity: 1,
    image: product.image || product.images?.[0] || '/images/sea-moss-default.svg',
    category: product.category || 'product',
    slug: product.slug || product.id,
  };

  logger.info('Cart item created', item);
  return item;
}

export function loadCart() {
  if (typeof window === 'undefined') {
    logger.debug('SSR: Returning empty cart');
    return [];
  }

  try {
    const stored = localStorage.getItem(CART_KEY);
    if (!stored) {
      logger.debug('No cart found in localStorage');
      return [];
    }

    const parsed = JSON.parse(stored);
    const cart = parsed.version === CART_VERSION ? parsed.items : [];
    logger.info('Cart loaded', { itemCount: cart.length, cart });
    return cart;
  } catch (error) {
    logger.error('Failed to load cart', { error: error.message });
    return [];
  }
}

export function saveCart(items) {
  if (typeof window === 'undefined') {
    logger.warn('SSR: Cannot save cart');
    return;
  }

  try {
    const cartData = {
      version: CART_VERSION,
      items,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(CART_KEY, JSON.stringify(cartData));
    logger.info('Cart saved', { itemCount: items.length });
  } catch (error) {
    logger.error('Failed to save cart', { error: error.message });
  }
}

export function addToCart(product) {
  logger.cart('Adding to cart', { productId: product.id });
  
  const cart = loadCart();
  const existingIndex = cart.findIndex(item => item.id === product.id || item.productId === product.id);

  if (existingIndex > -1) {
    cart[existingIndex].quantity += 1;
    logger.cart('Quantity increased', { productId: product.id, newQuantity: cart[existingIndex].quantity });
  } else {
    const newItem = createCartItem(product);
    cart.push(newItem);
    logger.cart('New item added', { productId: product.id });
  }

  saveCart(cart);
  return cart;
}

export function removeFromCart(productId) {
  logger.cart('Removing from cart', { productId });
  
  const cart = loadCart();
  const filtered = cart.filter(item => item.id !== productId && item.productId !== productId);
  saveCart(filtered);
  
  logger.cart('Item removed', { productId, remainingItems: filtered.length });
  return filtered;
}

export function updateQuantity(productId, quantity) {
  logger.cart('Updating quantity', { productId, quantity });
  
  const cart = loadCart();
  const item = cart.find(item => item.id === productId || item.productId === productId);

  if (item) {
    if (quantity <= 0) {
      logger.cart('Quantity <= 0, removing item', { productId });
      return removeFromCart(productId);
    }
    item.quantity = quantity;
    saveCart(cart);
    logger.cart('Quantity updated', { productId, newQuantity: quantity });
  } else {
    logger.warn('Item not found in cart', { productId });
  }

  return cart;
}

export function clearCart() {
  logger.cart('Clearing cart');
  saveCart([]);
  return [];
}

export function getCartTotal() {
  const cart = loadCart();
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  logger.debug('Cart total calculated', { subtotal, totalItems });
  return { subtotal, totalItems, items: cart };
}

export function formatPrice(price) {
  return `$${parseFloat(price).toFixed(2)}`;
}

export function formatPriceCents(cents) {
  return formatPrice(cents / 100);
}

// Aliases for compatibility with different imports
export const getCartTotals = getCartTotal;
export const updateCartQuantity = updateQuantity;
