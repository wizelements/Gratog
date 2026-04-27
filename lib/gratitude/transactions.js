/**
 * Gratitude Transactions — Earn/Redeem/Expire Credits
 * 
 * All credit movements go through here for audit trail and idempotency
 */

import { connectToDatabase } from '../db-admin';
import { 
  calculatePurchaseCredits, 
  calculateExpiration, 
  generateCouponCode,
  validateRedemption,
  EARNING_RATES 
} from './core';
import { updateBalance, updateProgressFromOrder } from './accounts';

const TRANSACTIONS_COLLECTION = 'gratitude_transactions';
const REDEMPTIONS_COLLECTION = 'gratitude_redemptions';

/**
 * Earn credits from a purchase
 * @param {Object} params - Transaction params
 * @returns {Object} Transaction result
 */
export async function earnFromPurchase(params) {
  const {
    customerId,
    orderId,
    orderTotal,
    tier,
    isFirstPurchase = false,
    isPreorder = false,
    metadata = {}
  } = params;
  
  const { db } = await connectToDatabase();
  
  // Idempotency check: don't double-award for same order
  const existing = await db.collection(TRANSACTIONS_COLLECTION).findOne({
    customerId,
    'source.orderId': orderId,
    'source.type': 'purchase'
  });
  
  if (existing) {
    return { 
      success: true, 
      duplicate: true, 
      transaction: existing,
      message: 'Credits already awarded for this order'
    };
  }
  
  // Calculate credits
  const credits = calculatePurchaseCredits(orderTotal, tier, { 
    isFirstPurchase, 
    isPreorder 
  });
  
  if (credits <= 0) {
    return { success: true, credits: 0, message: 'No credits earned' };
  }
  
  // Use MongoDB transaction for atomicity
  const session = db.client.startSession();
  let result;
  
  try {
    await session.withTransaction(async () => {
      // Create transaction record
      const transaction = {
        customerId,
        type: 'earn',
        credits,
        source: {
          type: 'purchase',
          orderId,
          metadata: {
            orderTotal,
            tier,
            isFirstPurchase,
            isPreorder,
            ...metadata
          }
        },
        description: isFirstPurchase 
          ? `First purchase bonus + $${(orderTotal/100).toFixed(2)} order`
          : `$${(orderTotal/100).toFixed(2)} purchase`,
        expiresAt: calculateExpiration(),
        createdAt: new Date()
      };
      
      await db.collection(TRANSACTIONS_COLLECTION).insertOne(transaction, { session });
      
      // Update account balance
      await updateBalance(customerId, credits);
      
      // Update tier progress
      const progressResult = await updateProgressFromOrder(customerId, { total: orderTotal, items: metadata.items || [] });
      
      result = {
        success: true,
        transaction,
        credits,
        tierUpgrade: progressResult?.upgrade || null
      };
    });
  } finally {
    await session.endSession();
  }
  
  return result;
}

/**
 * Earn credits for other activities (reviews, referrals, etc.)
 * @param {Object} params - Transaction params
 */
export async function earnFromActivity(params) {
  const {
    customerId,
    activityType, // 'review', 'referral', 'birthday', 'social_share', 'market_visit', etc.
    credits,
    description,
    metadata = {}
  } = params;
  
  const { db } = await connectToDatabase();
  
  // Idempotency checks for specific types
  if (activityType === 'review') {
    const existing = await db.collection(TRANSACTIONS_COLLECTION).findOne({
      customerId,
      'source.type': 'review',
      'source.metadata.productId': metadata.productId
    });
    if (existing) {
      return { success: false, error: 'Already reviewed this product', transaction: existing };
    }
  }
  
  if (activityType === 'birthday') {
    const thisYear = new Date().getFullYear();
    const existing = await db.collection(TRANSACTIONS_COLLECTION).findOne({
      customerId,
      'source.type': 'birthday',
      'source.metadata.year': thisYear
    });
    if (existing) {
      return { success: false, error: 'Birthday bonus already awarded this year', transaction: existing };
    }
  }
  
  const session = db.client.startSession();
  let result;
  
  try {
    await session.withTransaction(async () => {
      const transaction = {
        customerId,
        type: 'earn',
        credits,
        source: {
          type: activityType,
          metadata
        },
        description,
        expiresAt: activityType === 'birthday' ? null : calculateExpiration(), // Birthday credits don't expire
        createdAt: new Date()
      };
      
      await db.collection(TRANSACTIONS_COLLECTION).insertOne(transaction, { session });
      await updateBalance(customerId, credits);
      
      result = { success: true, transaction, credits };
    });
  } finally {
    await session.endSession();
  }
  
  return result;
}

/**
 * Redeem credits for a reward
 * @param {Object} params - Redemption params
 */
export async function redeemCredits(params) {
  const {
    customerId,
    rewardId,
    rewardConfig,
    cartTotal = 0
  } = params;
  
  const { db } = await connectToDatabase();
  
  // Get account
  const { getAccount } = require('./accounts');
  const account = await getAccount(customerId);
  
  if (!account) {
    return { success: false, error: 'Account not found' };
  }
  
  // Validate redemption
  const validation = validateRedemption(account, rewardConfig, cartTotal);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }
  
  const credits = rewardConfig.creditsCost;
  const couponCode = generateCouponCode(account.tier.current);
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + (rewardConfig.expiresDays || 30));
  
  const session = db.client.startSession();
  let result;
  
  try {
    await session.withTransaction(async () => {
      // Create transaction
      const transaction = {
        customerId,
        type: 'redeem',
        credits: -credits,
        balanceAfter: account.credits.balance - credits,
        source: {
          type: 'reward_redemption',
          rewardId,
          metadata: {
            rewardName: rewardConfig.name,
            couponCode,
            rewardType: rewardConfig.rewardType,
            rewardValue: rewardConfig.rewardValue
          }
        },
        description: `Redeemed: ${rewardConfig.name}`,
        createdAt: now
      };
      
      await db.collection(TRANSACTIONS_COLLECTION).insertOne(transaction, { session });
      
      // Create redemption record (coupon)
      const redemption = {
        customerId,
        accountId: account._id.toString(),
        rewardId,
        couponCode,
        creditsCost: credits,
        rewardType: rewardConfig.rewardType,
        rewardValue: rewardConfig.rewardValue,
        minimumOrder: rewardConfig.minimumOrder,
        applied: false,
        appliedAt: null,
        orderId: null,
        expiresAt,
        createdAt: now
      };
      
      await db.collection(REDEMPTIONS_COLLECTION).insertOne(redemption, { session });
      
      // Update balance
      await updateBalance(customerId, -credits);
      
      result = {
        success: true,
        transaction,
        redemption: {
          couponCode,
          expiresAt,
          rewardName: rewardConfig.name
        },
        creditsSpent: credits,
        newBalance: account.credits.balance - credits
      };
    });
  } finally {
    await session.endSession();
  }
  
  return result;
}

/**
 * Apply a coupon to an order
 * @param {Object} params - Application params
 */
export async function applyCoupon(params) {
  const {
    couponCode,
    customerId,
    orderId
  } = params;
  
  const { db } = await connectToDatabase();
  
  const redemption = await db.collection(REDEMPTIONS_COLLECTION).findOne({
    couponCode,
    customerId
  });
  
  if (!redemption) {
    return { success: false, error: 'Invalid coupon code' };
  }
  
  if (redemption.applied) {
    return { success: false, error: 'Coupon already used' };
  }
  
  if (new Date() > new Date(redemption.expiresAt)) {
    return { success: false, error: 'Coupon expired' };
  }
  
  await db.collection(REDEMPTIONS_COLLECTION).updateOne(
    { _id: redemption._id },
    {
      $set: {
        applied: true,
        appliedAt: new Date(),
        orderId
      }
    }
  );
  
  return {
    success: true,
    redemption: {
      rewardType: redemption.rewardType,
      rewardValue: redemption.rewardValue,
      minimumOrder: redemption.minimumOrder
    }
  };
}

/**
 * Get transaction history
 * @param {string} customerId - Customer ID
 * @param {Object} options - Query options
 */
export async function getTransactionHistory(customerId, options = {}) {
  const { db } = await connectToDatabase();
  
  const { limit = 50, skip = 0, type = null } = options;
  
  const query = { customerId };
  if (type) query.type = type;
  
  const transactions = await db.collection(TRANSACTIONS_COLLECTION)
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();
  
  return transactions;
}

/**
 * Get redemption history
 * @param {string} customerId - Customer ID
 */
export async function getRedemptionHistory(customerId) {
  const { db } = await connectToDatabase();
  
  return await db.collection(REDEMPTIONS_COLLECTION)
    .find({ customerId })
    .sort({ createdAt: -1 })
    .toArray();
}

/**
 * Expire old credits (cron job)
 * @param {number} batchSize - Number to process
 */
export async function expireOldCredits(batchSize = 1000) {
  const { db } = await connectToDatabase();
  
  const now = new Date();
  
  // Find expired earn transactions that haven't been processed
  const expired = await db.collection(TRANSACTIONS_COLLECTION)
    .find({
      type: 'earn',
      expiresAt: { $lte: now },
      expired: { $ne: true }
    })
    .limit(batchSize)
    .toArray();
  
  const results = {
    processed: 0,
    creditsExpired: 0,
    errors: []
  };
  
  for (const transaction of expired) {
    try {
      const session = db.client.startSession();
      
      await session.withTransaction(async () => {
        // Mark as expired
        await db.collection(TRANSACTIONS_COLLECTION).updateOne(
          { _id: transaction._id },
          { $set: { expired: true, expiredAt: now } },
          { session }
      );
        
        // Deduct from balance
        await updateBalance(transaction.customerId, -transaction.credits);
        
        // Create expire transaction record
        await db.collection(TRANSACTIONS_COLLECTION).insertOne({
          customerId: transaction.customerId,
          type: 'expire',
          credits: -transaction.credits,
          source: {
            type: 'expiration',
            originalTransactionId: transaction._id.toString()
          },
          description: `Credits expired (${transaction.credits} credits)`,
          createdAt: now
        }, { session });
      });
      
      await session.endSession();
      
      results.processed++;
      results.creditsExpired += transaction.credits;
    } catch (error) {
      results.errors.push({ transactionId: transaction._id, error: error.message });
    }
  }
  
  return results;
}

/**
 * Reverse credits (for refunds)
 * @param {string} orderId - Order ID
 */
export async function reverseCreditsForRefund(orderId) {
  const { db } = await connectToDatabase();
  
  // Find the earn transaction
  const transaction = await db.collection(TRANSACTIONS_COLLECTION).findOne({
    'source.orderId': orderId,
    type: 'earn'
  });
  
  if (!transaction) {
    return { success: false, error: 'No credits found for this order' };
  }
  
  // Check if already reversed
  const existingReverse = await db.collection(TRANSACTIONS_COLLECTION).findOne({
    'source.originalTransactionId': transaction._id.toString(),
    type: 'adjust'
  });
  
  if (existingReverse) {
    return { success: false, error: 'Credits already reversed' };
  }
  
  const session = db.client.startSession();
  
  try {
    await session.withTransaction(async () => {
      // Create reversal transaction
      await db.collection(TRANSACTIONS_COLLECTION).insertOne({
        customerId: transaction.customerId,
        type: 'adjust',
        credits: -transaction.credits,
        source: {
          type: 'refund_reversal',
          originalTransactionId: transaction._id.toString(),
          orderId
        },
        description: `Credits reversed (order refunded)`,
        createdAt: new Date()
      }, { session });
      
      // Deduct from balance
      await updateBalance(transaction.customerId, -transaction.credits);
    });
  } finally {
    await session.endSession();
  }
  
  return { success: true, creditsReversed: transaction.credits };
}

/**
 * Manual adjustment (admin only)
 * @param {Object} params - Adjustment params
 */
export async function manualAdjustment(params) {
  const {
    customerId,
    credits,
    reason,
    adminId
  } = params;
  
  const { db } = await connectToDatabase();
  
  const transaction = {
    customerId,
    type: 'adjust',
    credits,
    source: {
      type: 'manual_adjustment',
      metadata: { reason, adminId }
    },
    description: `Manual adjustment: ${reason}`,
    createdAt: new Date()
  };
  
  await db.collection(TRANSACTIONS_COLLECTION).insertOne(transaction);
  await updateBalance(customerId, credits);
  
  return { success: true, transaction };
}

/**
 * Get analytics
 */
export async function getTransactionAnalytics(days = 30) {
  const { db } = await connectToDatabase();
  
  const since = new Date();
  since.setDate(since.getDate() - days);
  
  const pipeline = [
    {
      $match: {
        createdAt: { $gte: since }
      }
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalCredits: { $sum: '$credits' }
      }
    }
  ];
  
  const results = await db.collection(TRANSACTIONS_COLLECTION).aggregate(pipeline).toArray();
  
  const analytics = {
    period: `${days} days`,
    since: since.toISOString(),
    summary: {}
  };
  
  results.forEach(r => {
    analytics.summary[r._id] = {
      count: r.count,
      totalCredits: r.totalCredits
    };
  });
  
  return analytics;
}

export default {
  earnFromPurchase,
  earnFromActivity,
  redeemCredits,
  applyCoupon,
  getTransactionHistory,
  getRedemptionHistory,
  expireOldCredits,
  reverseCreditsForRefund,
  manualAdjustment,
  getTransactionAnalytics
};
