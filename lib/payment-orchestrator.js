/**
 * Unified Payment Orchestrator
 * Intelligent routing between Square and Stripe
 */

import { trackEvent, EVENT_TYPES } from './unified-analytics';
import {
  createPaymentIntent,
  createCheckoutSession,
  getPaymentIntent,
} from './stripe-service';

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
 * Process Stripe payment
 */
async function processStripePayment({ amount, currency, orderData, paymentMethod }) {
  try {
    console.log('Processing Stripe payment:', { amount, currency, orderId: orderData.id });

    const result = await createPaymentIntent(amount, currency, {
      orderId: orderData.id,
      orderNumber: orderData.orderNumber,
      customerEmail: orderData.customer?.email,
      customerName: orderData.customer?.name,
    });

    if (!result.success) {
      return {
        success: false,
        provider: PAYMENT_PROVIDERS.STRIPE,
        error: result.error,
      };
    }

    return {
      success: true,
      provider: PAYMENT_PROVIDERS.STRIPE,
      paymentId: result.paymentIntent.id,
      clientSecret: result.paymentIntent.clientSecret,
      status: result.paymentIntent.status,
      amount: result.paymentIntent.amount,
      currency: result.paymentIntent.currency,
    };
  } catch (error) {
    console.error('Stripe payment processing error:', error);
    return {
      success: false,
      provider: PAYMENT_PROVIDERS.STRIPE,
      error: error.message,
    };
  }
}

/**
 * Stripe checkout fallback when Square fails
 */
export async function stripeCheckoutFallback({
  lineItems,
  successUrl,
  cancelUrl,
  orderData,
  options = {},
}) {
  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Stripe checkout attempt ${attempt}/${maxRetries}`);

      const result = await createCheckoutSession(lineItems, successUrl, cancelUrl, {
        ...options,
        orderId: orderData?.id,
        customerEmail: orderData?.customer?.email,
        metadata: {
          orderId: orderData?.id,
          orderNumber: orderData?.orderNumber,
          source: 'square_fallback',
          attempt,
        },
      });

      if (result.success) {
        await trackEvent(EVENT_TYPES.PAYMENT_INITIATED, {
          provider: PAYMENT_PROVIDERS.STRIPE,
          transactionType: 'checkout_fallback',
          orderId: orderData?.id,
          sessionId: result.session.id,
        });

        return {
          success: true,
          provider: PAYMENT_PROVIDERS.STRIPE,
          sessionId: result.session.id,
          checkoutUrl: result.session.url,
          expiresAt: result.session.expiresAt,
        };
      }

      lastError = result.error;
    } catch (error) {
      console.error(`Stripe checkout attempt ${attempt} failed:`, error);
      lastError = error.message;

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  await trackEvent(EVENT_TYPES.PAYMENT_FAILED, {
    provider: PAYMENT_PROVIDERS.STRIPE,
    transactionType: 'checkout_fallback',
    orderId: orderData?.id,
    error: lastError,
    retries: maxRetries,
  });

  return {
    success: false,
    provider: PAYMENT_PROVIDERS.STRIPE,
    error: lastError || 'Stripe checkout failed after retries',
  };
}

/**
 * Check Stripe payment status
 */
export async function checkStripePaymentStatus(paymentIntentId) {
  try {
    const result = await getPaymentIntent(paymentIntentId);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      status: result.paymentIntent.status,
      isPaid: result.paymentIntent.status === 'succeeded',
      paymentIntent: result.paymentIntent,
    };
  } catch (error) {
    console.error('Check Stripe payment status error:', error);
    return { success: false, error: error.message };
  }
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
