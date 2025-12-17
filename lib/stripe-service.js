/**
 * Stripe Payment Service
 * Provides fallback payment processing when Square is unavailable
 */

import Stripe from 'stripe';
import { createLogger } from '@/lib/logger';

const logger = createLogger('StripeService');

// Initialize Stripe client
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-10-28.acacia' })
  : null;

const CURRENCY = 'usd';

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured() {
  return !!stripe;
}

/**
 * Create a PaymentIntent for direct payment
 */
export async function createPaymentIntent(amount, currency = CURRENCY, metadata = {}) {
  if (!stripe) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY environment variable.');
  }

  logger.info('Creating PaymentIntent', { amount, currency });

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Amount in cents
      currency: currency.toLowerCase(),
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    logger.info('PaymentIntent created', { id: paymentIntent.id });

    return {
      success: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: paymentIntent.amount,
      status: paymentIntent.status
    };
  } catch (error) {
    logger.error('Failed to create PaymentIntent', { error: error.message });
    throw error;
  }
}

/**
 * Confirm a PaymentIntent
 */
export async function confirmPayment(paymentIntentId, paymentMethodId) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  logger.info('Confirming payment', { paymentIntentId });

  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId,
    });

    return {
      success: paymentIntent.status === 'succeeded',
      status: paymentIntent.status,
      paymentIntentId: paymentIntent.id
    };
  } catch (error) {
    logger.error('Failed to confirm payment', { error: error.message });
    throw error;
  }
}

/**
 * Retrieve a PaymentIntent
 */
export async function getPaymentIntent(paymentIntentId) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    logger.error('Failed to retrieve PaymentIntent', { error: error.message });
    throw error;
  }
}

/**
 * Create a Checkout Session for hosted checkout
 */
export async function createCheckoutSession(lineItems, successUrl, cancelUrl, metadata = {}) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  logger.info('Creating Checkout Session', { itemCount: lineItems.length });

  try {
    // Convert line items to Stripe format
    const stripeLineItems = lineItems.map(item => ({
      price_data: {
        currency: CURRENCY,
        product_data: {
          name: item.name,
          description: item.description || undefined,
          images: item.image ? [item.image] : undefined,
        },
        unit_amount: Math.round(item.price * 100), // Convert to cents
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: stripeLineItems,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      shipping_address_collection: metadata.collectShipping ? {
        allowed_countries: ['US'],
      } : undefined,
    });

    logger.info('Checkout Session created', { id: session.id });

    return {
      success: true,
      sessionId: session.id,
      url: session.url
    };
  } catch (error) {
    logger.error('Failed to create Checkout Session', { error: error.message });
    throw error;
  }
}

/**
 * Handle Stripe webhook events
 */
export async function handleWebhookEvent(payload, signature) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    logger.warn('STRIPE_WEBHOOK_SECRET not configured');
    // Parse without verification in dev
    return JSON.parse(payload);
  }

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    logger.info('Webhook event verified', { type: event.type, id: event.id });
    return event;
  } catch (error) {
    logger.error('Webhook signature verification failed', { error: error.message });
    throw new Error('Invalid webhook signature');
  }
}

/**
 * Create a refund
 */
export async function createRefund(paymentIntentId, amount = null, reason = 'requested_by_customer') {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  logger.info('Creating refund', { paymentIntentId, amount });

  try {
    const refundParams = {
      payment_intent: paymentIntentId,
      reason,
    };

    if (amount) {
      refundParams.amount = Math.round(amount);
    }

    const refund = await stripe.refunds.create(refundParams);

    logger.info('Refund created', { id: refund.id, status: refund.status });

    return {
      success: true,
      refundId: refund.id,
      status: refund.status,
      amount: refund.amount
    };
  } catch (error) {
    logger.error('Failed to create refund', { error: error.message });
    throw error;
  }
}

/**
 * Get Stripe public key for frontend
 */
export function getPublicKey() {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null;
}

export default {
  isStripeConfigured,
  createPaymentIntent,
  confirmPayment,
  getPaymentIntent,
  createCheckoutSession,
  handleWebhookEvent,
  createRefund,
  getPublicKey
};
