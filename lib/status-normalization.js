/**
 * Status Normalization Helpers
 * Canonical status values for orders, payments, and fulfillment
 */

const ORDER_STATUS_MAP = {
  // Uppercase legacy → lowercase canonical
  'PENDING_PAYMENT': 'pending',
  'PREORDER_PENDING_PAYMENT': 'pending',
  'SHIPPING_PENDING_PAYMENT': 'pending',
  'PENDING': 'pending',
  'PENDING_CONFIRMATION': 'payment_processing',
  'payment_processing': 'payment_processing',
  'processing': 'payment_processing',
  'CONFIRMED': 'confirmed',
  'PREORDER_CONFIRMED': 'confirmed',
  'SHIPPING_CONFIRMED': 'confirmed',
  'COMPLETED': 'confirmed',
  'paid': 'confirmed',
  'payment_completed': 'confirmed',
  'PREPARING': 'confirmed',
  'READY': 'confirmed',
  'PICKED_UP': 'fulfilled',
  'shipped': 'fulfilled',
  'delivered': 'fulfilled',
  'REFUNDED': 'refunded',
  'PARTIALLY_REFUNDED': 'refunded',
  'refunded': 'refunded',
  'CANCELLED': 'cancelled',
  'cancelled': 'cancelled',
  // Already canonical
  'pending': 'pending',
  'confirmed': 'confirmed',
  'fulfilled': 'fulfilled',
};

const PAYMENT_STATUS_MAP = {
  'PENDING': 'pending',
  'PENDING_PAYMENT': 'pending',
  'pending': 'pending',
  'PROCESSING': 'processing',
  'processing': 'processing',
  'payment_processing': 'processing',
  'APPROVED': 'paid',
  'PAID': 'paid',
  'paid': 'paid',
  'COMPLETED': 'completed',
  'completed': 'completed',
  'payment_completed': 'completed',
  'FAILED': 'failed',
  'payment_failed': 'failed',
  'failed': 'failed',
  'REFUNDED': 'refunded',
  'PARTIALLY_REFUNDED': 'refunded',
  'refunded': 'refunded',
};

const FULFILLMENT_CATEGORY_MAP = {
  'pickup': 'pickup',
  'pickup_market': 'pickup',
  'pickup_dunwoody': 'pickup',
  'delivery': 'delivery',
  'shipping': 'delivery',
  'meetup_serenbe': 'pickup',
  'meetup': 'pickup',
};

export function normalizeOrderStatus(status) {
  if (!status) return 'pending';
  return ORDER_STATUS_MAP[status] || status.toLowerCase();
}

export function normalizePaymentStatus(status) {
  if (!status) return 'pending';
  return PAYMENT_STATUS_MAP[status] || status.toLowerCase();
}

export function normalizeFulfillmentCategory(type) {
  if (!type) return 'pickup';
  return FULFILLMENT_CATEGORY_MAP[type] || type.toLowerCase();
}
