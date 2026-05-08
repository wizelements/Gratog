/**
 * 🚀 Gratog Pay Flow — Library Exports
 */

// Types
export * from './types';

// Store hooks
export {
  usePayFlowCart,
  usePayFlowUI,
  usePayFlowInventory,
  usePayFlowMetrics
} from './store';

// Data
export { SAMPLE_PRODUCTS, formatPrice, getProductsByCategory, getAvailabilityBadge } from './data';

// Live Products (connects to Gratog storefront)
export {
  fetchLiveProducts,
  fetchAdminProducts,
  getDemoPayFlowProducts,
  transformToPayFlowProduct
} from './products-live';

// Square Extension
export {
  createPayFlowOrder,
  processPayFlowPayment,
  getPayFlowSquareConfig,
  getSquareSdkUrl,
  healthCheck as squareHealthCheck
} from './square-extension';
export type {
  PayFlowCartItem,
  PayFlowOrderRequest,
  PayFlowPaymentRequest,
  PayFlowOrderResult,
  PayFlowPaymentResult,
  PayFlowSquareConfig
} from './square-extension';
