/**
 * Checkout Store - Zustand store for checkout state management
 * Handles 3-step flow: Cart → Contact & Fulfillment → Review & Pay
 */

import { create } from 'zustand';
import { CartItem, CartAPI } from '@/adapters/cartAdapter';
import { computeTotals, OrderTotals } from '@/adapters/totalsAdapter';
import { shippingMethods, ShippingMethod } from '@/adapters/fulfillmentAdapter';

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
  fee?: number;
  distanceMiles?: number;
  deliveryMessage?: string;
  quotedSubtotal?: number;
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
  // Stage; defer all browser storage to after hydration to keep SSR stable.
  stage: CheckoutStage;
  hydrated: boolean;
  hydrateFromStorage: () => void;
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
  // New regular online shoppers start with the non-market option. The checkout
  // automatically switches to pickup when preorder items are present.
  type: 'shipping',
  shipping: {
    address: { street: '', city: '', state: 'GA', zip: '' },
    methodId: '',
  },
  pickup: { locationId: '', date: null },
};

// Load persisted data from localStorage
function loadPersistedState(): Partial<CheckoutState> {
  if (typeof window === 'undefined') return {};
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return {};
    
    const parsed = JSON.parse(saved);
    const fulfillment = parsed.fulfillment || initialFulfillment;
    // Deserialize pickup date from JSON string back to Date
    if (fulfillment.pickup?.date && typeof fulfillment.pickup.date === 'string') {
      fulfillment.pickup = {
        ...fulfillment.pickup,
        date: new Date(fulfillment.pickup.date),
      };
    }
    return {
      stage: parsed.stage || 'cart',
      contact: parsed.contact || initialContact,
      fulfillment,
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
  // Server and first client render must agree. Browser storage is loaded
  // once, from CheckoutRoot after mount, never during store initialization.
  const initialTotals = computeTotals({
    cart: [],
    fulfillmentType: initialFulfillment.type,
    tip: 0,
    couponDiscount: 0,
    shippingFee: 0,
  });

  return {
    stage: 'cart',
    hydrated: false,
    cart: [],
    contact: initialContact,
    fulfillment: initialFulfillment,
    tip: 0,
    couponCode: '',
    couponDiscount: 0,
    totals: initialTotals,
    validation: {},
    isSubmitting: false,

    // Actions
    hydrateFromStorage: () => {
      if (get().hydrated) return;
      const saved = loadPersistedState();
      const cart = CartAPI.getCart();
      const fulfillment = saved.fulfillment || initialFulfillment;
      // Never resume an old review/payment step after a reload. Payment
      // sessions are server-owned; the customer must re-review current terms.
      set({
        hydrated: true,
        stage: 'cart',
        cart,
        contact: saved.contact || initialContact,
        fulfillment,
        tip: saved.tip || 0,
        couponCode: saved.couponCode || '',
        // Never restore stale client-computed discounts as payable amounts.
        couponDiscount: 0,
        validation: {},
      });
      get().recomputeTotals();
    },
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
        // Get shipping method price from imported function (safe for client bundle)
        const methods = shippingMethods();
        const method = methods.find((m: ShippingMethod) => m.id === state.fulfillment.shipping?.methodId);
        shippingFee = method?.price || 0;
      }
      
      const totals = computeTotals({
        cart: state.cart,
        fulfillmentType: state.fulfillment.type,
        tip: state.tip,
        couponDiscount: state.couponDiscount,
        shippingFee,
        deliveryFee: state.fulfillment.delivery?.fee
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

// Cart subscriptions are owned and cleaned up by CheckoutRoot.
