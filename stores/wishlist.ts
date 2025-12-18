/**
 * Wishlist Store - Zustand store for wishlist/favorites state management
 */

import { create } from 'zustand';

export interface WishlistState {
  items: string[];
  addToWishlist: (productId: string) => void;
  removeFromWishlist: (productId: string) => void;
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
  getCount: () => number;
}

const STORAGE_KEY = 'wishlist_v1';

function loadPersistedState(): string[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to load persisted wishlist state:', e);
    return [];
  }
}

function persistState(items: string[]) {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to persist wishlist state:', e);
  }
}

export const useWishlistStore = create<WishlistState>((set, get) => {
  const initialItems = loadPersistedState();
  
  return {
    items: initialItems,
    
    addToWishlist: (productId: string) => {
      const currentItems = get().items;
      if (currentItems.includes(productId)) return;
      
      const newItems = [...currentItems, productId];
      set({ items: newItems });
      persistState(newItems);
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wishlistUpdate', {
          detail: { count: newItems.length, action: 'add', productId }
        }));
      }
    },
    
    removeFromWishlist: (productId: string) => {
      const currentItems = get().items;
      const newItems = currentItems.filter(id => id !== productId);
      set({ items: newItems });
      persistState(newItems);
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wishlistUpdate', {
          detail: { count: newItems.length, action: 'remove', productId }
        }));
      }
    },
    
    toggleWishlist: (productId: string) => {
      const currentItems = get().items;
      if (currentItems.includes(productId)) {
        get().removeFromWishlist(productId);
      } else {
        get().addToWishlist(productId);
      }
    },
    
    isInWishlist: (productId: string) => {
      return get().items.includes(productId);
    },
    
    clearWishlist: () => {
      set({ items: [] });
      persistState([]);
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wishlistUpdate', {
          detail: { count: 0, action: 'clear' }
        }));
      }
    },
    
    getCount: () => {
      return get().items.length;
    }
  };
});
