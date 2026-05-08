/**
 * 🚀 Gratog Pay Flow — Market-Optimized Checkout System
 * 
 * DESIGN PRINCIPLES:
 * - <20 second complete flow target
 * - One-handed mobile operation
 * - Zero page reloads
 * - Instant visual feedback
 * - Parallel to existing checkout (doesn't replace it)
 * 
 * DIFFERENTIATION from /order:
 * - No forms (name/email/address) — just pay
 * - No shipping options — pickup only
 * - No account creation — guest only
 * - Inventory-aware (hides sold out)
 * - Staff mode for live stock management
 */

// ============================================
// PRODUCT MODEL
// ============================================

export type PayFlowCategory = 
  | 'lemonades' 
  | 'juices' 
  | 'sea-moss' 
  | 'refreshers' 
  | 'boba'
  | 'specials'
  | 'all';

export type AvailabilityStatus = 'available' | 'low-stock' | 'sold-out';

export interface PayFlowProduct {
  id: string;
  name: string;
  category: PayFlowCategory;
  priceCents: number; // Always in cents for precision
  image: string;
  ingredients: string; // 1-line highlight
  available: boolean;
  stockQuantity: number; // actual inventory count
  tags: PayFlowTag[];
  upsells?: PayFlowUpsell[];
  isPopular?: boolean;
  isNew?: boolean;
  originalPriceCents?: number; // for specials
}

export type PayFlowTag = 
  | 'popular' 
  | 'boba-compatible' 
  | 'refresher-base'
  | 'immune-boost'
  | 'energy'
  | 'detox'
  | 'seasonal';

export interface PayFlowUpsell {
  id: string;
  name: string;
  priceCents: number;
  description?: string;
}

// ============================================
// CART MODEL (lightweight, ephemeral)
// ============================================

export interface PayFlowCartItem {
  productId: string;
  quantity: number;
  upsellIds: string[]; // Selected upsells
  addedAt: number;
}

export interface PayFlowCartDisplayItem extends PayFlowCartItem {
  product: PayFlowProduct;
  lineTotalCents: number;
  upsellTotalCents: number;
}

export interface PayFlowCart {
  items: PayFlowCartItem[];
  createdAt: number;
  expiresAt: number; // Cart expires after 30 mins of inactivity
}

// ============================================
// ORDER MODEL (simplified for market use)
// ============================================

export interface PayFlowOrder {
  id: string;
  items: PayFlowCartItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  status: PayFlowOrderStatus;
  squarePaymentId?: string;
  receiptUrl?: string;
  createdAt: number;
  paidAt?: number;
  // Minimal customer info (optional for receipts)
  customerPhone?: string;
}

export type PayFlowOrderStatus = 
  | 'pending'
  | 'payment_processing'
  | 'paid'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'cancelled'
  | 'payment_failed';

// ============================================
// PAYMENT MODEL
// ============================================

export type PayFlowPaymentMethod = 'card' | 'apple-pay' | 'google-pay';

export interface PayFlowPaymentRequest {
  sourceId: string; // Square nonce
  orderId: string;
  amountCents: number;
}

export interface PayFlowPaymentResult {
  success: boolean;
  orderId?: string;
  receiptUrl?: string;
  error?: string;
}

// ============================================
// UI STATE MODEL
// ============================================

export type PayFlowView = 'browse' | 'cart' | 'payment' | 'processing' | 'success' | 'error';

export interface PayFlowUIState {
  currentView: PayFlowView;
  activeCategory: PayFlowCategory;
  searchQuery: string;
  isStaffMode: boolean;
  selectedProductId?: string; // For quick-view or upsell modal
}

// ============================================
// METRICS (for optimization)
// ============================================

export interface PayFlowMetrics {
  sessionStartedAt: number;
  firstItemAddedAt?: number;
  cartOpenedAt?: number;
  paymentStartedAt?: number;
  paymentCompletedAt?: number;
  totalFlowTimeMs?: number;
  itemsInCart: number;
  // Track if user hit the <20s target
  hitTargetTime?: boolean;
}

// ============================================
// API TYPES
// ============================================

export interface PayFlowProductsResponse {
  products: PayFlowProduct[];
  lastUpdated: number;
  locationId?: string;
}

export interface PayFlowCreateOrderRequest {
  items: PayFlowCartItem[];
  customerPhone?: string;
}

export interface PayFlowCreateOrderResponse {
  orderId: string;
  totalCents: number;
  expiresAt: number; // Order expires if not paid
}

export interface PayFlowStaffInventoryUpdate {
  productId: string;
  newStockQuantity: number;
  setAvailable?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

export const PAY_FLOW_CONSTANTS = {
  // Timing
  CART_EXPIRY_MS: 30 * 60 * 1000, // 30 minutes
  ORDER_EXPIRY_MS: 10 * 60 * 1000, // 10 minutes to pay
  TARGET_FLOW_MS: 20 * 1000, // 20 second target
  
  // Inventory thresholds
  LOW_STOCK_THRESHOLD: 5,
  
  // Categories in display order
  CATEGORIES: [
    { id: 'lemonades', label: 'Lemonades', icon: '🍋' },
    { id: 'juices', label: 'Juices', icon: '🥤' },
    { id: 'sea-moss', label: 'Sea Moss', icon: '🌊' },
    { id: 'refreshers', label: 'Refreshers', icon: '✨' },
    { id: 'boba', label: 'Boba', icon: '🧋' },
  ] as const,
  
  // Tax rate (matching existing)
  TAX_RATE: 0.08,
  
  // Storage keys
  STORAGE_KEY_CART: 'gratog-payflow-cart',
  STORAGE_KEY_METRICS: 'gratog-payflow-metrics',
} as const;
