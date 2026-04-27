/**
 * Gratitude Accounts — Account Management
 */

import { connectToDatabase } from '../db-admin';
import { 
  TIERS, 
  determineTier, 
  checkTierUpgrade, 
  calculateExpiration,
  generateReferralCode 
} from './core';

const COLLECTION = 'gratitude_accounts';

/**
 * Create a new gratitude account for a customer
 * @param {string} customerId - Customer ID
 * @param {Object} options - Options
 * @returns {Object} New account
 */
export async function createAccount(customerId, options = {}) {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTION);
  
  const now = new Date();
  const referralCode = options.referralCode || generateReferralCode(customerId);
  
  const account = {
    customerId,
    credits: {
      balance: options.signupBonus || 50, // Welcome bonus
      lifetimeEarned: options.signupBonus || 50,
      lifetimeRedeemed: 0,
      pending: 0
    },
    tier: {
      current: 'seedling',
      achievedAt: now,
      progress: {
        purchases: 0,
        spent: 0,
        credits: options.signupBonus || 50
      }
    },
    stats: {
      lastEarnedAt: now,
      lastRedeemedAt: null,
      favoriteReward: null
    },
    referrals: {
      code: referralCode,
      referredCount: 0,
      referredBy: options.referredBy || null
    },
    expiresAt: calculateExpiration(now),
    createdAt: now,
    updatedAt: now
  };
  
  await collection.insertOne(account);
  
  // Update customer record with reference
  await db.collection('customers').updateOne(
    { _id: customerId },
    { 
      $set: { 
        gratitudeAccountId: account._id.toString(),
        gratitudeTier: 'seedling',
        updatedAt: now
      }
    }
  );
  
  return account;
}

/**
 * Get or create a gratitude account
 * @param {string} customerId - Customer ID
 * @returns {Object} Account
 */
export async function getOrCreateAccount(customerId) {
  const existing = await getAccount(customerId);
  if (existing) return existing;
  
  return createAccount(customerId);
}

/**
 * Get account by customer ID
 * @param {string} customerId - Customer ID
 * @returns {Object|null} Account or null
 */
export async function getAccount(customerId) {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTION);
  
  return await collection.findOne({ customerId });
}

/**
 * Find account by customer ID (alias for getAccount)
 * @param {string} customerId - Customer ID
 * @returns {Object|null} Account or null
 */
export async function findByCustomerId(customerId) {
  return getAccount(customerId);
}

/**
 * Get account by ID
 * @param {string} accountId - Account ID
 * @returns {Object|null} Account or null
 */
export async function getAccountById(accountId) {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTION);
  
  const { ObjectId } = require('mongodb');
  return await collection.findOne({ _id: new ObjectId(accountId) });
}

/**
 * Update credit balance (internal use, use transactions.js for public API)
 * @param {string} customerId - Customer ID
 * @param {number} delta - Change in balance (positive or negative)
 * @param {Object} metadata - Update metadata
 */
export async function updateBalance(customerId, delta, metadata = {}) {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTION);
  
  const now = new Date();
  const update = {
    $inc: { 'credits.balance': delta },
    $set: { updatedAt: now }
  };
  
  if (delta > 0) {
    update.$inc['credits.lifetimeEarned'] = delta;
    update.$set['stats.lastEarnedAt'] = now;
  } else {
    update.$inc['credits.lifetimeRedeemed'] = Math.abs(delta);
    update.$set['stats.lastRedeemedAt'] = now;
  }
  
  // Update progress credits
  if (delta > 0) {
    update.$inc['tier.progress.credits'] = delta;
  }
  
  // Reset expiration on activity
  update.$set.expiresAt = calculateExpiration(now);
  
  const result = await collection.findOneAndUpdate(
    { customerId },
    update,
    { returnDocument: 'after' }
  );
  
  return result;
}

/**
 * Update tier progress from order data
 * @param {string} customerId - Customer ID
 * @param {Object} orderData - Order information
 */
export async function updateProgressFromOrder(customerId, orderData) {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTION);
  
  const { total, items = [] } = orderData;
  const now = new Date();
  
  // Get current account
  const account = await getAccount(customerId);
  if (!account) return null;
  
  // Update progress
  const newProgress = {
    purchases: account.tier.progress.purchases + 1,
    spent: account.tier.progress.spent + total,
    credits: account.tier.progress.credits
  };
  
  // Check for tier upgrade
  const upgradeCheck = checkTierUpgrade(account.tier.current, newProgress);
  
  const update = {
    $set: {
      'tier.progress': newProgress,
      updatedAt: now,
      expiresAt: calculateExpiration(now)
    }
  };
  
  // If tier upgraded
  if (upgradeCheck.upgraded) {
    update.$set['tier.current'] = upgradeCheck.to;
    update.$set['tier.achievedAt'] = now;
  }
  
  const result = await collection.findOneAndUpdate(
    { customerId },
    update,
    { returnDocument: 'after' }
  );
  
  // Update denormalized tier on customer
  if (result && upgradeCheck.upgraded) {
    await db.collection('customers').updateOne(
      { _id: customerId },
      { $set: { gratitudeTier: upgradeCheck.to } }
    );
  }
  
  return {
    account: result,
    upgrade: upgradeCheck.upgraded ? upgradeCheck : null
  };
}

/**
 * Record favorite reward type
 * @param {string} customerId - Customer ID
 * @param {string} rewardType - Type of reward
 */
export async function recordFavoriteReward(customerId, rewardType) {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTION);
  
  await collection.updateOne(
    { customerId },
    { $set: { 'stats.favoriteReward': rewardType } }
  );
}

/**
 * Increment referral count
 * @param {string} customerId - Customer ID
 */
export async function incrementReferralCount(customerId) {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTION);
  
  await collection.updateOne(
    { customerId },
    { 
      $inc: { 'referrals.referredCount': 1 },
      $set: { updatedAt: new Date() }
    }
  );
}

/**
 * Link referred by
 * @param {string} customerId - Customer ID
 * @param {string} referrerId - Referring customer ID
 */
export async function setReferredBy(customerId, referrerId) {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTION);
  
  await collection.updateOne(
    { customerId },
    { $set: { 'referrals.referredBy': referrerId } }
  );
}

/**
 * Find account by referral code
 * @param {string} code - Referral code
 * @returns {Object|null} Account or null
 */
export async function findByReferralCode(code) {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTION);
  
  return await collection.findOne({ 'referrals.code': code });
}

/**
 * Delete account (GDPR compliance)
 * @param {string} customerId - Customer ID
 */
export async function deleteAccount(customerId) {
  const { db } = await connectToDatabase();
  
  // Delete account
  await db.collection(COLLECTION).deleteOne({ customerId });
  
  // Remove reference from customer
  await db.collection('customers').updateOne(
    { _id: customerId },
    { 
      $unset: { 
        gratitudeAccountId: '',
        gratitudeTier: ''
      }
    }
  );
}

/**
 * Get accounts expiring soon (for cron job)
 * @param {number} days - Days until expiration
 * @returns {Array} Accounts
 */
export async function getExpiringAccounts(days = 7) {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTION);
  
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);
  
  return await collection.find({
    expiresAt: { $lte: cutoff },
    'credits.balance': { $gt: 0 }
  }).toArray();
}

/**
 * Get top customers by lifetime earned
 * @param {number} limit - Number of results
 * @returns {Array} Top customers
 */
export async function getTopCustomers(limit = 100) {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTION);
  
  return await collection
    .find({})
    .sort({ 'credits.lifetimeEarned': -1 })
    .limit(limit)
    .toArray();
}

/**
 * Get tier distribution stats
 * @returns {Object} Tier counts
 */
export async function getTierDistribution() {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTION);
  
  const pipeline = [
    {
      $group: {
        _id: '$tier.current',
        count: { $sum: 1 },
        totalCredits: { $sum: '$credits.balance' }
      }
    }
  ];
  
  const results = await collection.aggregate(pipeline).toArray();
  
  const distribution = {};
  results.forEach(r => {
    distribution[r._id] = {
      count: r.count,
      totalCredits: r.totalCredits
    };
  });
  
  // Ensure all tiers are represented
  Object.keys(TIERS).forEach(tier => {
    if (!distribution[tier]) {
      distribution[tier] = { count: 0, totalCredits: 0 };
    }
  });
  
  return distribution;
}

/**
 * Get total liability (all outstanding credits)
 * @returns {number} Total credits in circulation
 */
export async function getTotalLiability() {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTION);
  
  const result = await collection.aggregate([
    {
      $group: {
        _id: null,
        totalBalance: { $sum: '$credits.balance' },
        totalPending: { $sum: '$credits.pending' }
      }
    }
  ]).toArray();
  
  return result[0] || { totalBalance: 0, totalPending: 0 };
}

export default {
  createAccount,
  getOrCreateAccount,
  getAccount,
  findByCustomerId,
  getAccountById,
  updateBalance,
  updateProgressFromOrder,
  recordFavoriteReward,
  incrementReferralCount,
  setReferredBy,
  findByReferralCode,
  deleteAccount,
  getExpiringAccounts,
  getTopCustomers,
  getTierDistribution,
  getTotalLiability
};
