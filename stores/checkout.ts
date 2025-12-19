/**
 * Checkout Store - Zustand store for checkout state management
 * Handles 3-step flow: Cart → Contact & Fulfillment → Review & Pay
 */

import { create } from 'zustand';
import { CartItem, CartAPI } from '@/adapters/cartAdapter';
import { computeTotals, OrderTotals } from '@/adapters/totalsAdapter';

export type CheckoutStage = 'cart' | 'details' | 'review';

export type FulfillmentType = 'pickup' | 'delivery' | 'shipping';

export interface ContactInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  saveInfo: boolean;
}

export interface PickupData {
  locationId: string;
  date: Date | null;
  instructions?: string;
}

export interface DeliveryData {
  address: {
    street: string;
    suite?: string;
    city: string;
    state: string;
    zip: string;
  };
  window: string;
  notes?: string;
}

export interface ShippingData {
  address: {
    street: string;
    suite?: string;
    city: string;
    state: string;
    zip: string;
  };
  methodId: string;
}

export interface FulfillmentData {
  type: FulfillmentType;
  pickup?: PickupData;
  delivery?: DeliveryData;
  shipping?: ShippingData;
}

export interface CheckoutValidation {
  contact?: Record<string, string>;
  fulfillment?: Record<string, string>;
  payment?: Record<string, string>;
}

export interface CheckoutState {
  // Stage
  stage: CheckoutStage;
  setStage: (stage: CheckoutStage) => void;
  
  // Cart
  cart: CartItem[];
  updateCart: (cart: CartItem[]) => void;
  
  // Contact
  contact: ContactInfo;
  setContact: (contact: Partial<ContactInfo>) => void;
  
  // Fulfillment
  fulfillment: FulfillmentData;
  setFulfillment: (fulfillment: Partial<FulfillmentData>) => void;
  
  // Tip (for delivery)
  tip: number;
  setTip: (tip: number) => void;
  
  // Coupon
  couponCode: string;
  couponDiscount: number;
  setCoupon: (code: string, discount: number) => void;
  
  // Totals
  totals: OrderTotals;
  recomputeTotals: () => void;
  
  // Validation
  validation: CheckoutValidation;
  setValidation: (validation: CheckoutValidation) => void;
  clearValidation: () => void;
  
  // Actions
  reset: () => void;
  
  // Loading states
  isSubmitting: boolean;
  setSubmitting: (value: boolean) => void;
}

const STORAGE_KEY = 'checkout_v2@1';

const initialContact: ContactInfo = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  saveInfo: false
};

const initialFulfillment: FulfillmentData = {
  type: 'delivery',
  delivery: {
    address: { street: '', city: '', state: 'GA', zip: '' },
    window: '12-15'
  }
};

// Load persisted data from localStorage
function loadPersistedState(): Partial<CheckoutState> {
  if (typeof window === 'undefined') return {};
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return {};
    
    const parsed = JSON.parse(saved);
    return {
      stage: parsed.stage || 'cart',
      contact: parsed.contact || initialContact,
      fulfillment: parsed.fulfillment || initialFulfillment,
      tip: parsed.tip || 0,
      couponCode: parsed.couponCode || '',
      couponDiscount: parsed.couponDiscount || 0
    };
  } catch (e) {
    console.error('Failed to load persisted checkout state:', e);
    return {};
  }
}

// Save state to localStorage
function persistState(state: CheckoutState) {
  if (typeof window === 'undefined') return;
  
  try {
    const toPersist = {
      stage: state.stage,
      contact: state.contact,
      fulfillment: state.fulfillment,
      tip: state.tip,
      couponCode: state.couponCode,
      couponDiscount: state.couponDiscount
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist));
  } catch (e) {
    console.error('Failed to persist checkout state:', e);
  }
}

export const useCheckoutStore = create<CheckoutState>((set, get) => {
  // Load initial cart safely (returns empty array during SSR)
  const initialCart = typeof window !== 'undefined' ? CartAPI.getCart() : [];
  const persisted = loadPersistedState();
  
  const initialTotals = computeTotals({
    cart: initialCart,
    fulfillmentType: persisted.fulfillment?.type || 'delivery',
    tip: persisted.tip || 0,
    couponDiscount: persisted.couponDiscount || 0
  });
  
  return {
    // Initial state
    stage: persisted.stage || 'cart',
    cart: initialCart,
    contact: persisted.contact || initialContact,
    fulfillment: persisted.fulfillment || initialFulfillment,
    tip: persisted.tip || 0,
    couponCode: persisted.couponCode || '',
    couponDiscount: persisted.couponDiscount || 0,
    totals: initialTotals,
    validation: {},
    isSubmitting: false,
    
    // Actions
    setStage: (stage) => {
      set({ stage });
      const state = get();
      persistState(state);
      
      // Analytics
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('analytics', {
          detail: { event: 'checkout_stage_change', to: stage }
        }));
      }
    },
    
    updateCart: (cart) => {
      set({ cart });
      get().recomputeTotals();
    },
    
    setContact: (contact) => {
      set((state) => ({
        contact: { ...state.contact, ...contact }
      }));
      const state = get();
      persistState(state);
    },
    
    setFulfillment: (fulfillment) => {
      set((state) => ({
        fulfillment: { ...state.fulfillment, ...fulfillment }
      }));
      const state = get();
      persistState(state);
      get().recomputeTotals();
    },
    
    setTip: (tip) => {
      set({ tip });
      const state = get();
      persistState(state);
      get().recomputeTotals();
    },
    
    setCoupon: (couponCode, couponDiscount) => {
      set({ couponCode, couponDiscount });
      const state = get();
      persistState(state);
      get().recomputeTotals();
    },
    
    recomputeTotals: () => {
      const state = get();
      
      let shippingFee = 0;
      if (state.fulfillment.type === 'shipping' && state.fulfillment.shipping?.methodId) {
        // Get shipping method price from adapter
        const { Fulfillment } = require('@/adapters/fulfillmentAdapter');
        const methods = Fulfillment.shippingMethods();
        const method = methods.find((m: any) => m.id === state.fulfillment.shipping?.methodId);
        shippingFee = method?.price || 0;
      }
      
      const totals = computeTotals({
        cart: state.cart,
        fulfillmentType: state.fulfillment.type,
        tip: state.tip,
        couponDiscount: state.couponDiscount,
        shippingFee
      });
      
      set({ totals });
    },
    
    setValidation: (validation) => set({ validation }),
    
    clearValidation: () => set({ validation: {} }),
    
    reset: () => {
      set({
        stage: 'cart',
        contact: initialContact,
        fulfillment: initialFulfillment,
        tip: 0,
        couponCode: '',
        couponDiscount: 0,
        validation: {},
        isSubmitting: false
      });
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
      
      get().recomputeTotals();
    },
    
    setSubmitting: (value) => set({ isSubmitting: value })
  };
});

// Subscribe to cart changes from external sources
if (typeof window !== 'undefined') {
  CartAPI.subscribe((cart) => {
    useCheckoutStore.getState().updateCart(cart);
  });
}
