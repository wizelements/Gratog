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

// Re-export CartItem for consumers
export type { CartItem };

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
    const handler = () => {
      callback(loadCart());
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('cart-updated', handler);
      return () => window.removeEventListener('cart-updated', handler);
    }
    
    return () => {};
  },
  
  // Storage key for persistence
  STORAGE_KEY: CART_STORAGE_KEY
};
