/**
 * Wishlist Store - Zustand store for wishlist/favorites state management
 * Supports both guest (localStorage) and authenticated (API) users
 */

import { create } from 'zustand';

/**
 * Get safe localStorage reference
 * Returns null if localStorage is unavailable (Safari Private, embedded browsers, etc.)
 */
function getSafeLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    console.warn('localStorage not available for wishlist, using in-memory fallback');
    return null;
  }
}

export interface WishlistState {
  items: string[];
  isAuthenticated: boolean;
  isSyncing: boolean;
  addToWishlist: (productId: string, isAuth?: boolean) => Promise<void>;
  removeFromWishlist: (productId: string, isAuth?: boolean) => Promise<void>;
  toggleWishlist: (productId: string, isAuth?: boolean) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: (isAuth?: boolean) => Promise<void>;
  getCount: () => number;
  syncWithServer: () => Promise<void>;
  setAuthStatus: (isAuth: boolean) => void;
}

const STORAGE_KEY = 'wishlist_v1';

function loadPersistedState(): string[] {
  const storage = getSafeLocalStorage();
  if (!storage) return [];
  
  try {
    const saved = storage.getItem(STORAGE_KEY);
    if (!saved) return [];
    return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to load persisted wishlist state:', e);
    return [];
  }
}

function persistState(items: string[]) {
  const storage = getSafeLocalStorage();
  if (!storage) return;
  
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to persist wishlist state:', e);
  }
}

export const useWishlistStore = create<WishlistState>((set, get) => {
  // Don't load persisted state during SSR - start with empty array
  // Client-side hydration will happen in useEffect
  const initialItems: string[] = [];
  
  // Hydrate from localStorage on client-side only using safe accessor
  const storage = getSafeLocalStorage();
  if (storage) {
    try {
      const saved = storage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          initialItems.push(...parsed);
        }
      }
    } catch (e) {
      console.error('Failed to hydrate wishlist state:', e);
    }
  }
  
  return {
    items: initialItems,
    isAuthenticated: false,
    isSyncing: false,
    
    /**
     * Sync wishlist from server for authenticated users
     */
    syncWithServer: async () => {
      try {
        set({ isSyncing: true });
        const response = await fetch('/api/user/wishlist');
        
        if (!response.ok) {
          if (response.status === 401) {
            set({ isAuthenticated: false });
            return;
          }
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        set({ items: data.items || [], isAuthenticated: true });
      } catch (error) {
        console.error('Failed to sync wishlist with server:', error);
      } finally {
        set({ isSyncing: false });
      }
    },
    
    /**
     * Set authentication status
     */
    setAuthStatus: (isAuth: boolean) => {
      set({ isAuthenticated: isAuth });
    },
    
    /**
     * Add product to wishlist
     */
    addToWishlist: async (productId: string, isAuth = false) => {
      const currentItems = get().items;
      if (currentItems.includes(productId)) return;
      
      const newItems = [...currentItems, productId];
      
      // For authenticated users, sync with API
      if (isAuth) {
        try {
          const response = await fetch('/api/user/wishlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId })
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
        } catch (error) {
          console.error('Failed to add item to server wishlist:', error);
          return;
        }
      } else {
        // For guests, use localStorage
        persistState(newItems);
      }
      
      set({ items: newItems });
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wishlistUpdate', {
          detail: { count: newItems.length, action: 'add', productId }
        }));
      }
    },
    
    /**
     * Remove product from wishlist
     */
    removeFromWishlist: async (productId: string, isAuth = false) => {
      const currentItems = get().items;
      const newItems = currentItems.filter(id => id !== productId);
      
      // For authenticated users, sync with API
      if (isAuth) {
        try {
          const response = await fetch('/api/user/wishlist', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId })
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
        } catch (error) {
          console.error('Failed to remove item from server wishlist:', error);
          return;
        }
      } else {
        // For guests, use localStorage
        persistState(newItems);
      }
      
      set({ items: newItems });
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wishlistUpdate', {
          detail: { count: newItems.length, action: 'remove', productId }
        }));
      }
    },
    
    /**
     * Toggle product in/out of wishlist
     */
    toggleWishlist: async (productId: string, isAuth = false) => {
      const currentItems = get().items;
      if (currentItems.includes(productId)) {
        await get().removeFromWishlist(productId, isAuth);
      } else {
        await get().addToWishlist(productId, isAuth);
      }
    },
    
    /**
     * Check if product is in wishlist
     */
    isInWishlist: (productId: string) => {
      return get().items.includes(productId);
    },
    
    /**
     * Clear entire wishlist
     */
    clearWishlist: async (isAuth = false) => {
      // For authenticated users, sync with API
      if (isAuth) {
        try {
          const response = await fetch('/api/user/wishlist', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
        } catch (error) {
          console.error('Failed to clear server wishlist:', error);
          return;
        }
      } else {
        // For guests, use localStorage
        persistState([]);
      }
      
      set({ items: [] });
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wishlistUpdate', {
          detail: { count: 0, action: 'clear' }
        }));
      }
    },
    
    /**
     * Get wishlist item count
     */
    getCount: () => {
      return get().items.length;
    }
  };
});
