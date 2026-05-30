/**
 * 🚀 Gratog Pay Flow — Square Extension
 * Extends existing square-api.ts for market-specific needs
 * Uses established patterns from lib/square-api.ts
 */

import { 
  createPayment as baseCreatePayment,
  createOrder as baseCreateOrder,
  OrderLineItem,
  OrderFulfillment,
  SquareResponse,
  getSquareConfig,
  healthCheck
} from '@/lib/square-api';
import { randomUUID } from 'crypto';

// Re-export base types and functions
export {
  getSquareConfig,
  healthCheck
};

// ============================================
// PAY FLOW SPECIFIC TYPES
// ============================================

export interface PayFlowCartItem {
  productId: string;
  name: string;
  quantity: number;
  priceCents: number;
  upsellIds?: string[];
  catalogObjectId?: string;
}

export interface PayFlowOrderRequest {
  items: PayFlowCartItem[];
  referenceId?: string;
  customerPhone?: string;
  locationId?: string;
}

export interface PayFlowPaymentRequest {
  sourceId: string;
  orderId?: string;
  amountCents: number;
  items: PayFlowCartItem[];
  customerPhone?: string;
}

export interface PayFlowOrderResult {
  id: string;
  squareOrderId: string;
  totalCents: number;
  status: string;
  createdAt: string;
}

export interface PayFlowPaymentResult {
  success: boolean;
  orderId: string;
  squareOrderId?: string;
  paymentId?: string;
  receiptUrl?: string;
  totalCents: number;
  status?: string;
  error?: string;
}

// ============================================
// PAY FLOW ORDER CREATION
// ============================================

export async function createPayFlowOrder(
  request: PayFlowOrderRequest
): Promise<SquareResponse<{ order: PayFlowOrderResult }>> {
  console.log('[createPayFlowOrder] Starting with', request.items.length, 'items');
  try {
    const referenceId = request.referenceId || `GR-${Date.now().toString(36).toUpperCase()}`;
    console.log('[createPayFlowOrder] Reference ID:', referenceId);
    
    // Convert PayFlow items to Square line items
    const lineItems: OrderLineItem[] = request.items.map((item, index) => {
      console.log(`[createPayFlowOrder] Item ${index}:`, { name: item.name, quantity: item.quantity, priceCents: item.priceCents, catalogObjectId: item.catalogObjectId });
      return ({
        name: item.name,
        quantity: item.quantity.toString(),
        catalogObjectId: item.catalogObjectId,
        basePriceMoney: {
          amount: item.priceCents,
          currency: 'USD'
        },
        note: item.upsellIds?.length 
          ? `Upsells: ${item.upsellIds.join(', ')}` 
          : undefined
      });
    });
    
    // Calculate total
    const totalCents = request.items.reduce(
      (sum, item) => sum + (item.priceCents * item.quantity), 
      0
    );
    console.log('[createPayFlowOrder] Total cents:', totalCents);
    
    // Create pickup fulfillment
    const fulfillments: OrderFulfillment[] = [{
      type: 'PICKUP',
      state: 'PROPOSED',
      pickupDetails: {
        recipient: {
          displayName: 'Market Customer',
          phoneNumber: request.customerPhone
        },
        scheduleType: 'ASAP',
        note: 'Gratog Market Order - Pay Flow'
      }
    }];
    
    console.log('[createPayFlowOrder] Calling baseCreateOrder...');
    // Use base createOrder
    const result = await baseCreateOrder({
      referenceId,
      lineItems,
      fulfillments,
      metadata: {
        source: 'pay-flow',
        channel: 'market',
        itemCount: request.items.length.toString(),
        totalCents: totalCents.toString(),
        customerPhone: request.customerPhone || ''
      }
    });
    
    console.log('[createPayFlowOrder] baseCreateOrder result:', { success: result.success, hasData: !!result.data, errors: result.errors });
    
    if (!result.success || !result.data?.order) {
      console.error('[createPayFlowOrder] baseCreateOrder failed:', result.errors);
      return {
        success: false,
        errors: result.errors || [{ 
          category: 'ORDER_ERROR', 
          code: 'CREATE_FAILED', 
          detail: 'Failed to create order' 
        }]
      };
    }
    
    const order = result.data.order;
    console.log('[createPayFlowOrder] Order created:', { id: order.id, state: order.state });
    
    return {
      success: true,
      data: {
        order: {
          id: referenceId,
          squareOrderId: order.id,
          totalCents: order.totalMoney?.amount || totalCents,
          status: order.state,
          createdAt: order.createdAt
        }
      }
    };
    
  } catch (error) {
    return {
      success: false,
      errors: [{
        category: 'INTERNAL_ERROR',
        code: 'ORDER_EXCEPTION',
        detail: error instanceof Error ? error.message : 'Order creation failed'
      }]
    };
  }
}

// ============================================
// PAY FLOW PAYMENT PROCESSING
// ============================================

export async function processPayFlowPayment(
  request: PayFlowPaymentRequest
): Promise<PayFlowPaymentResult> {
  try {
    // Step 1: Create order if not provided
    let orderId = request.orderId;
    let squareOrderId: string | undefined;
    
    if (!orderId) {
      console.log('[PayFlow] Creating order with items:', request.items.length, 'items');
      const orderResult = await createPayFlowOrder({
        items: request.items,
        customerPhone: request.customerPhone
      });
      
      console.log('[PayFlow] Order result:', { success: orderResult.success, hasData: !!orderResult.data, errors: orderResult.errors });
      
      if (!orderResult.success || !orderResult.data?.order) {
        console.error('[PayFlow] Order creation failed:', orderResult.errors);
        return {
          success: false,
          orderId: 'FAILED',
          totalCents: request.amountCents,
          error: orderResult.errors?.[0]?.detail || 'Order creation failed'
        };
      }
      
      orderId = orderResult.data.order.id;
      squareOrderId = orderResult.data.order.squareOrderId;
      console.log('[PayFlow] Order created:', { orderId, squareOrderId });
    }
    
    // Step 2: Process payment
    const paymentResult = await baseCreatePayment({
      sourceId: request.sourceId,
      amountCents: request.amountCents,
      orderId: squareOrderId,
      referenceId: orderId,
      note: 'Gratog Market Order',
      idempotencyKey: randomUUID()
    });
    
    if (!paymentResult.success || !paymentResult.data?.payment) {
      return {
        success: false,
        orderId: orderId!,
        squareOrderId,
        totalCents: request.amountCents,
        error: paymentResult.errors?.[0]?.detail || 'Payment failed'
      };
    }
    
    const payment = paymentResult.data.payment;
    
    // Check payment status
    if (payment.status !== 'COMPLETED' && payment.status !== 'APPROVED') {
      return {
        success: false,
        orderId: orderId!,
        squareOrderId,
        paymentId: payment.id,
        totalCents: request.amountCents,
        status: payment.status,
        error: `Payment status: ${payment.status}`
      };
    }
    
    // Success
    return {
      success: true,
      orderId: orderId!,
      squareOrderId: squareOrderId || payment.orderId,
      paymentId: payment.id,
      receiptUrl: payment.receiptUrl,
      totalCents: payment.totalMoney?.amount || request.amountCents,
      status: payment.status
    };
    
  } catch (error) {
    return {
      success: false,
      orderId: 'ERROR',
      totalCents: request.amountCents,
      error: error instanceof Error ? error.message : 'Payment processing failed'
    };
  }
}

// ============================================
// CONFIGURATION HELPERS
// ============================================

export interface PayFlowSquareConfig {
  applicationId: string;
  locationId: string;
  environment: 'sandbox' | 'production';
  isConfigured: boolean;
}

export function getPayFlowSquareConfig(): PayFlowSquareConfig {
  try {
    const baseConfig = getSquareConfig();
    return {
      applicationId: baseConfig.applicationId,
      locationId: baseConfig.locationId,
      environment: baseConfig.environment,
      isConfigured: true
    };
  } catch {
    return {
      applicationId: '',
      locationId: '',
      environment: 'sandbox',
      isConfigured: false
    };
  }
}

// ============================================
// SDK URL HELPER
// ============================================

export function getSquareSdkUrl(): string {
  const config = getPayFlowSquareConfig();
  return config.environment === 'production'
    ? 'https://web.squarecdn.com/v1/square.js'
    : 'https://sandbox.web.squarecdn.com/v1/square.js';
}
