/**
 * Cart Adapter - Bridges existing cart utilities with new checkout
 * Reuses all logic from /lib/cartUtils.js
 */

import { 
  loadCart, 
  saveCart, 
  addToCart, 
  updateQuantity, 
  removeFromCart, 
  clearCart, 
  getCartTotal,
  createCartItem,
  CART_STORAGE_KEY
} from '@/lib/cartUtils';
import type { CartItem } from '@/lib/cart-engine';

export interface CartTotals {
  subtotal: number;
  itemCount: number;
  tax: number;
  total: number;
}

/**
 * Cart API - Unified interface for cart operations
 */
export const CartAPI = {
  // Get current cart
  getCart: (): CartItem[] => loadCart(),
  
  // Save cart
  saveCart: (cart: CartItem[]) => saveCart(cart),
  
  // Add item to cart
  addItem: (product: any, quantity: number = 1, variantOrSize: any = null) => {
    // Add the product (cartUtils.addToCart only handles single qty increments)
    for (let i = 0; i < quantity; i++) {
      addToCart(product);
    }
    return loadCart();
  },
  
  // Update item quantity
  updateQuantity: (itemId: string, quantity: number) => 
    updateQuantity(itemId, quantity),
  
  // Remove item
  removeItem: (itemId: string) => removeFromCart(itemId),
  
  // Clear entire cart
  clear: () => clearCart(),
  
  // Get cart totals
  getTotals: (cart?: CartItem[]): CartTotals => {
    const result = getCartTotal();
    return {
      subtotal: result.subtotal,
      itemCount: result.totalItems,
      tax: 0,
      total: result.subtotal
    };
  },
  
  // Subscribe to cart changes
  subscribe: (callback: (cart: CartItem[]) => void) => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ cart: CartItem[] }>;
      callback(customEvent.detail.cart);
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('cartUpdated', handler as EventListener);
      return () => window.removeEventListener('cartUpdated', handler as EventListener);
    }
    
    return () => {};
  },
  
  // Storage key for persistence
  STORAGE_KEY: CART_STORAGE_KEY
};
