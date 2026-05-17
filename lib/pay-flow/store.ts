/**
 * 🚀 Gratog Pay Flow — Zustand Store
 * Lightning-fast state management optimized for mobile markets
 */

'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { 
  PayFlowCart, 
  PayFlowCartItem, 
  PayFlowCartDisplayItem,
  PayFlowProduct, 
  PayFlowCategory,
  PayFlowView,
  PayFlowUIState,
  PayFlowMetrics,
  PayFlowOrder
} from './types';
import { PAY_FLOW_CONSTANTS } from './types';

// ============================================
// CART STORE
// ============================================

interface CartStore {
  items: PayFlowCartItem[];
  lastActivity: number;
  
  // Actions
  addItem: (productId: string, upsellIds?: string[]) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  toggleUpsell: (productId: string, upsellId: string) => void;
  clearCart: () => void;
  isCartExpired: () => boolean;
  
  // Getters
  getItemCount: () => number;
  getUniqueItemCount: () => number;
  getDisplayItems: (products: PayFlowProduct[]) => PayFlowCartDisplayItem[];
  calculateTotals: (products: PayFlowProduct[]) => { 
    subtotalCents: number; 
    taxCents: number; 
    totalCents: number;
    itemCount: number;
  };
}

export const usePayFlowCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      lastActivity: Date.now(),

      addItem: (productId, upsellIds = []) => {
        const now = Date.now();
        const items = [...get().items];
        const existingIndex = items.findIndex(item => item.productId === productId);
        
        if (existingIndex >= 0) {
          // Increment existing
          items[existingIndex].quantity += 1;
        } else {
          // Add new
          items.push({
            productId,
            quantity: 1,
            upsellIds,
            addedAt: now
          });
        }
        
        set({ items, lastActivity: now });
      },

      removeItem: (productId) => {
        set(state => ({
          items: state.items.filter(item => item.productId !== productId),
          lastActivity: Date.now()
        }));
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        
        set(state => ({
          items: state.items.map(item =>
            item.productId === productId ? { ...item, quantity } : item
          ),
          lastActivity: Date.now()
        }));
      },

      toggleUpsell: (productId, upsellId) => {
        set(state => ({
          items: state.items.map(item => {
            if (item.productId !== productId) return item;
            const hasUpsell = item.upsellIds.includes(upsellId);
            return {
              ...item,
              upsellIds: hasUpsell
                ? item.upsellIds.filter(id => id !== upsellId)
                : [...item.upsellIds, upsellId]
            };
          }),
          lastActivity: Date.now()
        }));
      },

      clearCart: () => set({ items: [], lastActivity: Date.now() }),

      isCartExpired: () => {
        const { lastActivity } = get();
        return Date.now() - lastActivity > PAY_FLOW_CONSTANTS.CART_EXPIRY_MS;
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getUniqueItemCount: () => get().items.length,

      getDisplayItems: (products: PayFlowProduct[]) => {
        return get().items.map(item => {
          const product = products.find(p => p.id === item.productId);
          if (!product) return null;
          
          const lineTotalCents = product.priceCents * item.quantity;
          const upsellTotalCents = item.upsellIds.reduce((sum, upsellId) => {
            const upsell = product.upsells?.find(u => u.id === upsellId);
            return sum + (upsell?.priceCents || 0) * item.quantity;
          }, 0);

          return {
            ...item,
            product,
            lineTotalCents,
            upsellTotalCents
          };
        }).filter(Boolean) as PayFlowCartDisplayItem[];
      },

      calculateTotals: (products: PayFlowProduct[]) => {
        const displayItems = get().getDisplayItems(products);
        const subtotalCents = displayItems.reduce(
          (sum, item) => sum + item.lineTotalCents + item.upsellTotalCents, 
          0
        );
        const taxCents = Math.round(subtotalCents * PAY_FLOW_CONSTANTS.TAX_RATE);
        const totalCents = subtotalCents + taxCents;
        const itemCount = get().getItemCount();
        
        return { subtotalCents, taxCents, totalCents, itemCount };
      }
    }),
    {
      name: PAY_FLOW_CONSTANTS.STORAGE_KEY_CART,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items, lastActivity: state.lastActivity })
    }
  )
);

// ============================================
// UI STORE
// ============================================

interface UIStore extends PayFlowUIState {
  // View navigation
  setView: (view: PayFlowView) => void;
  goBack: () => void;
  
  // Category
  setActiveCategory: (category: PayFlowCategory) => void;
  
  // Search
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  
  // Staff mode
  toggleStaffMode: () => void;
  enableStaffMode: () => void;
  disableStaffMode: () => void;
  
  // Product selection
  selectProduct: (productId: string | undefined) => void;
  
  // Full flow reset (for starting a new order)
  resetFlow: () => void;
}

const VIEW_STACK: Record<PayFlowView, PayFlowView | null> = {
  browse: null,
  cart: 'browse',
  payment: 'cart',
  processing: 'payment',
  success: null,
  error: 'cart'
};

export const usePayFlowUI = create<UIStore>()((set, get) => ({
  currentView: 'browse',
  activeCategory: 'lemonades',
  searchQuery: '',
  isStaffMode: false,
  selectedProductId: undefined,

  setView: (view) => set({ currentView: view }),
  
  goBack: () => {
    const previousView = VIEW_STACK[get().currentView];
    if (previousView) {
      set({ currentView: previousView });
    }
  },

  setActiveCategory: (category) => set({ 
    activeCategory: category,
    searchQuery: ''
  }),

  setSearchQuery: (query) => set({ searchQuery: query }),
  clearSearch: () => set({ searchQuery: '' }),

  toggleStaffMode: () => set(state => ({ isStaffMode: !state.isStaffMode })),
  enableStaffMode: () => set({ isStaffMode: true }),
  disableStaffMode: () => set({ isStaffMode: false }),

  selectProduct: (productId) => set({ selectedProductId: productId }),

  resetFlow: () => {
    set({
      currentView: 'browse',
      activeCategory: 'lemonades',
      searchQuery: '',
      isStaffMode: false,
      selectedProductId: undefined,
    });
    usePayFlowCart.getState().clearCart();
    usePayFlowMetrics.getState().endSession();
  }
}));

// ============================================
// METRICS STORE
// ============================================

interface MetricsStore {
  metrics: PayFlowMetrics | null;
  
  // Session lifecycle
  startSession: () => void;
  endSession: () => void;
  
  // Milestones
  recordFirstItem: () => void;
  recordCartOpened: () => void;
  recordPaymentStarted: () => void;
  recordPaymentCompleted: () => void;
  
  // Getters
  getFlowTime: () => number | null;
  hitTarget: () => boolean;
}

export const usePayFlowMetrics = create<MetricsStore>()(
  persist(
    (set, get) => ({
      metrics: null,

      startSession: () => set({
        metrics: {
          sessionStartedAt: Date.now(),
          itemsInCart: 0
        }
      }),

      endSession: () => set({ metrics: null }),

      recordFirstItem: () => {
        const { metrics } = get();
        if (!metrics || metrics.firstItemAddedAt) return;
        set({ metrics: { ...metrics, firstItemAddedAt: Date.now() } });
      },

      recordCartOpened: () => {
        const { metrics } = get();
        if (!metrics || metrics.cartOpenedAt) return;
        set({ metrics: { ...metrics, cartOpenedAt: Date.now() } });
      },

      recordPaymentStarted: () => {
        const { metrics } = get();
        if (!metrics || metrics.paymentStartedAt) return;
        set({ metrics: { ...metrics, paymentStartedAt: Date.now() } });
      },

      recordPaymentCompleted: () => {
        const { metrics } = get();
        if (!metrics || metrics.paymentCompletedAt) return;
        
        const now = Date.now();
        const totalFlowTimeMs = now - metrics.sessionStartedAt;
        const hitTarget = totalFlowTimeMs <= PAY_FLOW_CONSTANTS.TARGET_FLOW_MS;
        
        set({
          metrics: {
            ...metrics,
            paymentCompletedAt: now,
            totalFlowTimeMs,
            hitTargetTime: hitTarget
          }
        });
        
        // Log success metrics (development only)
        if (process.env.NODE_ENV === 'development') {
          console.log('🎯 Target hit! Flow completed in', totalFlowTimeMs, 'ms');
        }
      },

      getFlowTime: () => {
        const { metrics } = get();
        if (!metrics?.paymentCompletedAt || !metrics.sessionStartedAt) return null;
        return metrics.paymentCompletedAt - metrics.sessionStartedAt;
      },

      hitTarget: () => {
        const flowTime = get().getFlowTime();
        if (flowTime === null) return false;
        return flowTime <= PAY_FLOW_CONSTANTS.TARGET_FLOW_MS;
      }
    }),
    {
      name: PAY_FLOW_CONSTANTS.STORAGE_KEY_METRICS,
      storage: createJSONStorage(() => sessionStorage) // Session-only metrics
    }
  )
);

// ============================================
// INVENTORY STORE (Live API Connected)
// ============================================

interface InventoryStore {
  products: PayFlowProduct[];
  isLoading: boolean;
  lastFetched: number;
  
  // Actions
  setProducts: (products: PayFlowProduct[]) => void;
  setIsLoading: (loading: boolean) => void;
  updateStock: (productId: string, newStock: number) => void;
  toggleAvailability: (productId: string) => void;
  
  // Getters
  getAvailableProducts: () => PayFlowProduct[];
  getByCategory: (category: PayFlowCategory) => PayFlowProduct[];
  getProduct: (id: string) => PayFlowProduct | undefined;
  getAvailabilityStatus: (product: PayFlowProduct) => import('./types').AvailabilityStatus;
}

export const usePayFlowInventory = create<InventoryStore>()((set, get) => ({
  products: [],
  isLoading: true,
  lastFetched: 0,

  setProducts: (products) => set({ products, lastFetched: Date.now(), isLoading: false }),
  
  setIsLoading: (loading) => set({ isLoading: loading }),

  updateStock: (productId, newStock) => {
    set(state => ({
      products: state.products.map(p =>
        p.id === productId 
          ? { ...p, stockQuantity: newStock, available: newStock > 0 }
          : p
      )
    }));
  },

  toggleAvailability: (productId) => {
    set(state => ({
      products: state.products.map(p =>
        p.id === productId ? { ...p, available: !p.available } : p
      )
    }));
  },

  getAvailableProducts: () => {
    return get().products.filter(p => p.available && p.stockQuantity > 0);
  },

  getByCategory: (category) => {
    if (category === 'all') return get().getAvailableProducts();
    return get().products.filter(p => 
      p.category === category && p.available && p.stockQuantity > 0
    );
  },

  getProduct: (id) => get().products.find(p => p.id === id),

  getAvailabilityStatus: (product) => {
    if (!product.available || product.stockQuantity === 0) return 'sold-out';
    if (product.stockQuantity <= PAY_FLOW_CONSTANTS.LOW_STOCK_THRESHOLD) return 'low-stock';
    return 'available';
  }
}));
