'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  loadCart, 
  addToCart, 
  removeFromCart, 
  updateQuantity, 
  clearCart, 
  getCartTotal,
  subscribeToCart 
} from '@/lib/cart-engine';

/**
 * 🎣 useCartEngine - React hook for cart state management
 * 
 * Replaces: useCart (Zustand), manual loadCart() calls
 * 
 * Features:
 * - Real-time cart state
 * - Automatic localStorage sync
 * - SSR-safe
 * - Event-driven updates
 * - Toast notifications
 */
export function useCartEngine() {
  const [cart, setCart] = useState([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Reload cart from localStorage (single source of truth)
  const refreshCart = useCallback(() => {
    setCart(loadCart());
  }, []);

  // Load cart on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      refreshCart();
      setIsHydrated(true);
    }
  }, [refreshCart]);

  // Subscribe to cart updates — re-read from localStorage on every event
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const unsubscribe = subscribeToCart(() => {
      refreshCart();
    });

    return unsubscribe;
  }, [refreshCart]);

  const add = useCallback((product, quantity = 1) => {
    addToCart(product, quantity);
    refreshCart();
    
    if (typeof window !== 'undefined' && window.toast) {
      window.toast.success(`Added ${product.name} to cart`);
    }
  }, [refreshCart]);

  const remove = useCallback((productId) => {
    removeFromCart(productId);
    refreshCart();
    
    if (typeof window !== 'undefined' && window.toast) {
      window.toast.success('Item removed from cart');
    }
  }, [refreshCart]);

  const updateQty = useCallback((productId, quantity) => {
    updateQuantity(productId, quantity);
    refreshCart();
  }, [refreshCart]);

  const clear = useCallback(() => {
    clearCart();
    refreshCart();
    
    if (typeof window !== 'undefined' && window.toast) {
      window.toast.success('Cart cleared');
    }
  }, [refreshCart]);

  const totals = isHydrated ? getCartTotal() : { subtotal: 0, totalItems: 0 };

  return {
    // State
    items: cart,
    isHydrated,
    
    // Computed
    totalItems: totals.totalItems,
    subtotal: totals.subtotal,
    itemCount: cart.length,
    isEmpty: cart.length === 0,
    
    // Actions
    addItem: add,
    removeItem: remove,
    updateQuantity: updateQty,
    clearCart: clear,
  };
}
