/**
 * Practical Subscription System for Gratog
 * Based on actual product catalog and Square Subscriptions API
 * 
 * Product Portfolio:
 * - Sea Moss Gels (16oz): Elderberry ($35), Purple ($38), Turmeric Ginger, Plain
 * - Wellness Shots (2oz): $8-12 each
 * - Lemonades (16oz): $28
 * - Boba: Market-only
 */

import { getSquareClient } from './square';
import { connectToDatabase } from './db-optimized';
import { logger } from './logger';

// ============================================================================
// SUBSCRIPTION PLANS - Based on actual product consumption patterns
// ============================================================================

export const SUBSCRIPTION_PLANS = {
  // Weekly Gel Subscription - Most popular
  weekly_gel: {
    id: 'weekly_gel',
    name: 'Weekly Gel Club',
    description: 'One 16oz Sea Moss Gel delivered weekly',
    billingCadence: 'WEEKLY',
    cadencePeriod: 1,
    price: 3000, // $30.00 (vs $35-38 retail = ~15% savings)
    retailValue: 3500,
    savings: 0.15,
    benefits: [
      'Choose any gel flavor weekly',
      'FREE pickup at market or local delivery',
      '15% savings vs single purchase',
      'Flexible - swap flavors anytime',
      'Pause or skip weeks as needed'
    ],
    // Maps to actual Square catalog items
    eligibleProducts: [
      'elderberry-sea-moss-gel-16oz',
      'purple-sea-moss-gel-16oz',
      'turmeric-ginger-sea-moss-gel-16oz',
      'plain-sea-moss-gel-16oz',
      'pineapple-sea-moss-gel-16oz'
    ],
    fulfillmentOptions: ['pickup', 'local_delivery'],
    isActive: true
  },

  // Bi-weekly Gel - For moderate users
  biweekly_gel: {
    id: 'biweekly_gel',
    name: 'Bi-Weekly Gel Club',
    description: 'One 16oz Sea Moss Gel every 2 weeks',
    billingCadence: 'WEEKLY',
    cadencePeriod: 2,
    price: 3200, // $32.00 (vs $35-38 retail = ~10% savings)
    retailValue: 3500,
    savings: 0.10,
    benefits: [
      'Perfect for moderate usage',
      'One gel lasts 2 weeks',
      '10% savings vs single purchase',
      'Free pickup or local delivery'
    ],
    eligibleProducts: [
      'elderberry-sea-moss-gel-16oz',
      'purple-sea-moss-gel-16oz',
      'turmeric-ginger-sea-moss-gel-16oz',
      'plain-sea-moss-gel-16oz'
    ],
    fulfillmentOptions: ['pickup', 'local_delivery', 'shipping'],
    isActive: true
  },

  // Monthly Wellness Bundle
  monthly_wellness: {
    id: 'monthly_wellness',
    name: 'Monthly Wellness Bundle',
    description: '2 Sea Moss Gels + 6 Wellness Shots monthly',
    billingCadence: 'MONTHLY',
    cadencePeriod: 1,
    price: 8500, // $85.00 (Retail: $70 gels + $60 shots = $130, ~35% savings)
    retailValue: 13000,
    savings: 0.35,
    benefits: [
      '2 Gels of your choice (16oz each)',
      '6 Wellness Shots (2oz each)',
      'Mix & match flavors',
      '35% savings vs individual purchase',
      'Market pickup priority',
      'Priority fulfillment'
    ],
    eligibleProducts: {
      gels: [
        'elderberry-sea-moss-gel-16oz',
        'purple-sea-moss-gel-16oz',
        'turmeric-ginger-sea-moss-gel-16oz',
        'plain-sea-moss-gel-16oz',
        'pineapple-sea-moss-gel-16oz'
      ],
      shots: [
        'wellness-shot-ginger',
        'wellness-shot-turmeric',
        'wellness-shot-elderberry',
        'wellness-shot-immune',
        'wellness-shot-energy'
      ]
    },
    fulfillmentOptions: ['pickup', 'local_delivery', 'shipping'],
    isActive: true
  },

  // Shots Only Subscription
  weekly_shots: {
    id: 'weekly_shots',
    name: 'Weekly Shots Club',
    description: '4 Wellness Shots delivered weekly',
    billingCadence: 'WEEKLY',
    cadencePeriod: 1,
    price: 2800, // $28.00 (vs $40 retail = 30% savings)
    retailValue: 4000,
    savings: 0.30,
    benefits: [
      '4 wellness shots per week',
      'Mix & match flavors',
      '30% savings vs individual',
      'Perfect for busy schedules',
      'Quick wellness on-the-go'
    ],
    eligibleProducts: [
      'wellness-shot-ginger',
      'wellness-shot-turmeric',
      'wellness-shot-elderberry',
      'wellness-shot-immune',
      'wellness-shot-energy'
    ],
    fulfillmentOptions: ['pickup', 'local_delivery'],
    isActive: true
  },

  // Family Pack (High volume users)
  weekly_family: {
    id: 'weekly_family',
    name: 'Family Wellness Pack',
    description: '4 Sea Moss Gels + 12 Wellness Shots weekly',
    billingCadence: 'WEEKLY',
    cadencePeriod: 1,
    price: 12000, // $120 (Retail: ~$180, ~33% savings)
    retailValue: 18000,
    savings: 0.33,
    benefits: [
      '4 Gels (16oz each)',
      '12 Wellness Shots',
      'Perfect for families or sharing',
      '33% savings',
      'FREE priority delivery',
      'VIP customer status'
    ],
    eligibleProducts: {
      gels: [
        'elderberry-sea-moss-gel-16oz',
        'purple-sea-moss-gel-16oz',
        'turmeric-ginger-sea-moss-gel-16oz',
        'plain-sea-moss-gel-16oz',
        'pineapple-sea-moss-gel-16oz'
      ],
      shots: [
        'wellness-shot-ginger',
        'wellness-shot-turmeric',
        'wellness-shot-elderberry',
        'wellness-shot-immune',
        'wellness-shot-energy'
      ]
    },
    fulfillmentOptions: ['pickup', 'local_delivery', 'shipping'],
    isActive: true,
    isVIP: true
  },

  // Lemonade Subscription (Seasonal)
  weekly_lemonade: {
    id: 'weekly_lemonade',
    name: 'Lemonade Refresh Club',
    description: '2 Sea Moss Lemonades weekly',
    billingCadence: 'WEEKLY',
    cadencePeriod: 1,
    price: 4800, // $48 (vs $56 retail = ~15% savings)
    retailValue: 5600,
    savings: 0.15,
    benefits: [
      '2 refreshing lemonades weekly',
      'Perfect for summer hydration',
      '15% savings',
      'Mix flavors: Original, Mango, Pineapple'
    ],
    eligibleProducts: [
      'sea-moss-lemonade-16oz',
      'sea-moss-lemonade-mango-16oz',
      'sea-moss-lemonade-pineapple-16oz'
    ],
    fulfillmentOptions: ['pickup', 'local_delivery'],
    isActive: true,
    isSeasonal: true,
    availableMonths: [4, 5, 6, 7, 8, 9] // April-September
  }
};

// ============================================================================
// SQUARE SUBSCRIPTION PLAN CONFIGURATION
// ============================================================================

/**
 * Create Square Subscription Plan Variations
 * These map to actual Square Subscription API objects
 */
export async function createSquareSubscriptionPlans() {
  const client = getSquareClient();
  const plans = [];

  for (const [planId, planConfig] of Object.entries(SUBSCRIPTION_PLANS)) {
    if (!planConfig.isActive) continue;

    try {
      // Create Catalog Plan
      // Note: Square SDK types may differ from actual API. Using type assertion for now.
      // In production, use Square's upsertCatalogObject instead
      const planResponse = await (client.catalog as any).upsertCatalogObject({
        object: {
          type: 'SUBSCRIPTION_PLAN',
          id: `#${planId}`,
          subscriptionPlanData: {
            name: planConfig.name,
            phases: [{
              cadence: planConfig.billingCadence,
              periods: planConfig.cadencePeriod,
              recurringPriceMoney: {
                amount: BigInt(planConfig.price),
                currency: 'USD'
              },
              ordinal: 0
            }]
          }
        }
      });

      const squarePlanId = planResponse.result.catalogObject.id;

      // Store mapping in database
      const { db } = await connectToDatabase();
      await db.collection('subscription_plans').updateOne(
        { planId },
        {
          $set: {
            planId,
            squarePlanId,
            ...planConfig,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );

      plans.push({ planId, squarePlanId, status: 'created' });
      logger.info('Subscriptions', `Created Square plan: ${planConfig.name}`, { squarePlanId });
    } catch (error) {
      logger.error('Subscriptions', `Failed to create plan: ${planConfig.name}`, { error });
      plans.push({ planId, status: 'error', error: error.message });
    }
  }

  return plans;
}

// ============================================================================
// SUBSCRIPTION ORDER GENERATION
// ============================================================================

/**
 * Generate an order for an active subscription
 * Called by cron job when subscription is due
 */
export async function generateSubscriptionOrder(subscription) {
  const { db } = await connectToDatabase();

  try {
    // Get plan configuration
    const planConfig = SUBSCRIPTION_PLANS[subscription.planId];
    if (!planConfig) {
      throw new Error(`Unknown plan: ${subscription.planId}`);
    }

    // Get customer preferences
    const preferences = subscription.preferences || {};
    const selectedGels = preferences.selectedGels || [];
    const selectedShots = preferences.selectedShots || [];
    const fulfillmentMethod = preferences.fulfillmentMethod || 'pickup';
    const pickupLocation = preferences.pickupLocation || 'serenbe';

    // Build order items
    const orderItems = [];
    let subtotal = 0;

    // Add gels
    if (planConfig.eligibleProducts.gels || planConfig.eligibleProducts) {
      const gelProducts = planConfig.eligibleProducts.gels || planConfig.eligibleProducts;
      const gelsToAdd = selectedGels.length > 0 
        ? selectedGels.filter(g => gelProducts.includes(g))
        : gelProducts.slice(0, planConfig.gelCount || 1);

      for (const gelId of gelsToAdd) {
        const product = await db.collection('products').findOne({ id: gelId });
        if (product) {
          orderItems.push({
            productId: gelId,
            name: product.name,
            quantity: 1,
            price: product.price,
            total: product.price
          });
          subtotal += product.price;
        }
      }
    }

    // Add shots
    if (planConfig.eligibleProducts.shots) {
      const shotsToAdd = selectedShots.length > 0
        ? selectedShots.filter(s => planConfig.eligibleProducts.shots.includes(s))
        : planConfig.eligibleProducts.shots.slice(0, planConfig.shotCount || 0);

      for (const shotId of shotsToAdd) {
        const product = await db.collection('products').findOne({ id: shotId });
        if (product) {
          orderItems.push({
            productId: shotId,
            name: product.name,
            quantity: 1,
            price: product.price,
            total: product.price
          });
          subtotal += product.price;
        }
      }
    }

    // Calculate totals
    const subscriptionPrice = planConfig.price; // What they actually pay
    const savings = subtotal - subscriptionPrice;

    // Create order
    const order = {
      orderNumber: `SUB-${Date.now()}`,
      customerEmail: subscription.email,
      customerName: subscription.name,
      items: orderItems,
      pricing: {
        subtotal,
        subscriptionPrice,
        savings,
        total: subscriptionPrice
      },
      fulfillment: {
        method: fulfillmentMethod,
        pickupLocation: fulfillmentMethod === 'pickup' ? pickupLocation : null,
        deliveryAddress: fulfillmentMethod === 'local_delivery' ? subscription.deliveryAddress : null
      },
      subscriptionId: subscription._id,
      subscriptionPlanId: subscription.planId,
      status: 'pending',
      paymentStatus: 'paid_via_subscription',
      createdAt: new Date(),
      estimatedFulfillmentDate: calculateFulfillmentDate(planConfig, fulfillmentMethod)
    };

    const result = await db.collection('orders').insertOne(order);

    // Update subscription
    await db.collection('subscriptions').updateOne(
      { _id: subscription._id },
      {
        $set: {
          lastOrderDate: new Date(),
          nextOrderDate: calculateNextOrderDate(planConfig),
          updatedAt: new Date()
        },
        $push: {
          orderHistory: {
            orderId: result.insertedId,
            orderNumber: order.orderNumber,
            date: new Date(),
            status: 'pending'
          }
        }
      }
    );

    // Send confirmation email
    await sendSubscriptionOrderConfirmation(subscription, order);

    logger.info('Subscriptions', `Generated subscription order: ${order.orderNumber}`, {
      subscriptionId: subscription._id,
      planId: subscription.planId
    });

    return { success: true, orderId: result.insertedId, orderNumber: order.orderNumber };
  } catch (error) {
    logger.error('Subscriptions', 'Failed to generate subscription order', { error, subscriptionId: subscription._id });
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateFulfillmentDate(planConfig, method) {
  const now = new Date();
  
  if (method === 'pickup') {
    // Next Saturday for pickup
    const day = now.getDay();
    const daysUntilSaturday = 6 - day;
    const nextSaturday = new Date(now);
    nextSaturday.setDate(now.getDate() + daysUntilSaturday);
    nextSaturday.setHours(9, 0, 0, 0);
    return nextSaturday;
  }

  if (method === 'local_delivery') {
    // Next day for local delivery
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0); // 2 PM delivery window
    return tomorrow;
  }

  // Shipping - 3-5 business days
  const shippingDate = new Date(now);
  shippingDate.setDate(now.getDate() + 5);
  return shippingDate;
}

function calculateNextOrderDate(planConfig) {
  const now = new Date();
  
  if (planConfig.billingCadence === 'WEEKLY') {
    now.setDate(now.getDate() + (7 * planConfig.cadencePeriod));
  } else if (planConfig.billingCadence === 'MONTHLY') {
    now.setMonth(now.getMonth() + planConfig.cadencePeriod);
  }
  
  return now;
}

async function sendSubscriptionOrderConfirmation(subscription, order) {
  // Implementation would call Resend API
  logger.info('Subscriptions', 'Sending order confirmation', {
    email: subscription.email,
    orderNumber: order.orderNumber
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  SUBSCRIPTION_PLANS,
  createSquareSubscriptionPlans,
  generateSubscriptionOrder
};
