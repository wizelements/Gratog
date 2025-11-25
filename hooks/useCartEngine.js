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

  // Load cart on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCart(loadCart());
      setIsHydrated(true);
    }
  }, []);

  // Subscribe to cart updates
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const unsubscribe = subscribeToCart((detail) => {
      setCart(detail.cart);
    });

    return unsubscribe;
  }, []);

  const add = useCallback((product, quantity = 1) => {
    const updated = addToCart(product, quantity);
    setCart(updated);
    
    // Toast notification
    if (typeof window !== 'undefined' && window.toast) {
      window.toast.success(`Added ${product.name} to cart`);
    }
    
    return updated;
  }, []);

  const remove = useCallback((productId) => {
    const updated = removeFromCart(productId);
    setCart(updated);
    
    if (typeof window !== 'undefined' && window.toast) {
      window.toast.success('Item removed from cart');
    }
    
    return updated;
  }, []);

  const updateQty = useCallback((productId, quantity) => {
    const updated = updateQuantity(productId, quantity);
    setCart(updated);
    return updated;
  }, []);

  const clear = useCallback(() => {
    const updated = clearCart();
    setCart(updated);
    
    if (typeof window !== 'undefined' && window.toast) {
      window.toast.success('Cart cleared');
    }
    
    return updated;
  }, []);

  const totals = getCartTotal();

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
