/**
 * Unified Payment Orchestrator
 * Intelligent routing between Square and Stripe
 */

import { trackEvent, EVENT_TYPES } from './unified-analytics';

// Payment providers
export const PAYMENT_PROVIDERS = {
  SQUARE: 'square',
  STRIPE: 'stripe'
};

// Transaction types
export const TRANSACTION_TYPES = {
  RETAIL_CHECKOUT: 'retail_checkout',
  SUBSCRIPTION: 'subscription',
  PREORDER: 'preorder',
  WHOLESALE: 'wholesale'
};

/**
 * Determine which payment provider to use
 */
export function routePayment(transactionType, orderData) {
  // Routing logic
  switch (transactionType) {
    case TRANSACTION_TYPES.RETAIL_CHECKOUT:
      return PAYMENT_PROVIDERS.SQUARE;
      
    case TRANSACTION_TYPES.SUBSCRIPTION:
    case TRANSACTION_TYPES.PREORDER:
    case TRANSACTION_TYPES.WHOLESALE:
      return PAYMENT_PROVIDERS.STRIPE;
      
    default:
      return PAYMENT_PROVIDERS.SQUARE;
  }
}

/**
 * Process payment through orchestrator
 */
export async function processPayment({
  provider,
  transactionType,
  amount,
  currency = 'USD',
  orderData,
  paymentMethod
}) {
  try {
    // Track payment initiation
    await trackEvent(EVENT_TYPES.PAYMENT_INITIATED, {
      provider,
      transactionType,
      amount,
      orderId: orderData.id
    });
    
    let result;
    
    if (provider === PAYMENT_PROVIDERS.SQUARE) {
      result = await processSquarePayment({
        amount,
        currency,
        orderData,
        paymentMethod
      });
    } else if (provider === PAYMENT_PROVIDERS.STRIPE) {
      result = await processStripePayment({
        amount,
        currency,
        orderData,
        paymentMethod
      });
    } else {
      throw new Error('Invalid payment provider');
    }
    
    // Track success
    if (result.success) {
      await trackEvent(EVENT_TYPES.PAYMENT_SUCCESS, {
        provider,
        transactionType,
        amount,
        orderId: orderData.id,
        paymentId: result.paymentId
      });
    } else {
      await trackEvent(EVENT_TYPES.PAYMENT_FAILED, {
        provider,
        transactionType,
        amount,
        orderId: orderData.id,
        error: result.error
      });
    }
    
    // Log transaction
    await logTransaction({
      provider,
      transactionType,
      amount,
      currency,
      orderData,
      result
    });
    
    return result;
  } catch (error) {
    console.error('Payment processing failed:', error);
    
    await trackEvent(EVENT_TYPES.PAYMENT_FAILED, {
      provider,
      transactionType,
      amount,
      error: error.message
    });
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Process Square payment
 */
async function processSquarePayment({ amount, currency, orderData, paymentMethod }) {
  // Call Square API
  const response = await fetch('/api/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourceId: paymentMethod.token,
      amountCents: amount,
      currency,
      orderId: orderData.id,
      note: `Order ${orderData.orderNumber || orderData.id}`
    })
  });
  
  const result = await response.json();
  
  return {
    success: response.ok,
    provider: PAYMENT_PROVIDERS.SQUARE,
    paymentId: result.payment?.id,
    ...result
  };
}

/**
 * Process Stripe payment (placeholder for future implementation)
 */
async function processStripePayment({ amount, currency, orderData, paymentMethod }) {
  // TODO: Implement Stripe payment processing
  console.log('⚠️ Stripe payment processing not yet implemented');
  
  return {
    success: false,
    provider: PAYMENT_PROVIDERS.STRIPE,
    error: 'Stripe integration pending',
    placeholder: true
  };
}

/**
 * Log transaction to database
 */
async function logTransaction(transactionData) {
  try {
    const response = await fetch('/api/transactions/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...transactionData,
        timestamp: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      console.error('Failed to log transaction:', await response.text());
    }
  } catch (error) {
    console.error('Transaction logging failed:', error);
  }
}

/**
 * Get payment statistics
 */
export async function getPaymentStats(dateRange = 30) {
  try {
    const response = await fetch(`/api/transactions/stats?days=${dateRange}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Get payment stats failed:', error);
    return null;
  }
}
