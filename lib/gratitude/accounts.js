/**
 * Gratitude Accounts — Account Management
 */

import { getRewardAccountRepository } from './turso-repository';
import { 
  TIERS, 
  checkTierUpgrade, 
  calculateExpiration,
  generateReferralCode 
} from './core';

/**
 * Create a new gratitude account for a customer
 * @param {string} customerId - Customer ID
 * @param {Object} options - Options
 * @returns {Object} New account
 */
export async function createAccount(customerId, options = {}) {
  const now = new Date();
  const referralCode = options.referralCode || generateReferralCode(customerId);
  return getRewardAccountRepository().create(customerId, {
    signupBonus: options.signupBonus ?? 50,
    referralCode,
    referredBy: options.referredBy || null,
    expiresAt: calculateExpiration(now),
    now
  });
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
  return getRewardAccountRepository().getByCustomerId(customerId);
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
  return getRewardAccountRepository().getById(accountId);
}

/**
 * Update credit balance (internal use, use transactions.js for public API)
 * @param {string} customerId - Customer ID
 * @param {number} delta - Change in balance (positive or negative)
 * @param {Object} metadata - Update metadata
 */
export async function updateBalance(customerId, delta, metadata = {}) {
  void metadata;
  const now = new Date();
  return getRewardAccountRepository().changeBalance(customerId, delta, calculateExpiration(now), now);
}

/**
 * Update tier progress from order data
 * @param {string} customerId - Customer ID
 * @param {Object} orderData - Order information
 */
export async function updateProgressFromOrder(customerId, orderData) {
  const { total } = orderData;
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
  
  const result = await getRewardAccountRepository().updateProgress(customerId, newProgress,
    upgradeCheck.upgraded ? upgradeCheck.to : account.tier.current,
    upgradeCheck.upgraded ? now : null, calculateExpiration(now), now);
  
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
  await getRewardAccountRepository().setFavorite(customerId, rewardType);
}

/**
 * Increment referral count
 * @param {string} customerId - Customer ID
 */
export async function incrementReferralCount(customerId) {
  await getRewardAccountRepository().incrementReferrals(customerId);
}

/**
 * Link referred by
 * @param {string} customerId - Customer ID
 * @param {string} referrerId - Referring customer ID
 */
export async function setReferredBy(customerId, referrerId) {
  await getRewardAccountRepository().setReferredBy(customerId, referrerId);
}

/**
 * Find account by referral code
 * @param {string} code - Referral code
 * @returns {Object|null} Account or null
 */
export async function findByReferralCode(code) {
  return getRewardAccountRepository().getByReferralCode(code);
}

/**
 * Delete account (GDPR compliance)
 * @param {string} customerId - Customer ID
 */
export async function deleteAccount(customerId) {
  await getRewardAccountRepository().delete(customerId);
}

/**
 * Get accounts expiring soon (for cron job)
 * @param {number} days - Days until expiration
 * @returns {Array} Accounts
 */
export async function getExpiringAccounts(days = 7) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);
  
  return getRewardAccountRepository().expiringBefore(cutoff);
}

/**
 * Get top customers by lifetime earned
 * @param {number} limit - Number of results
 * @returns {Array} Top customers
 */
export async function getTopCustomers(limit = 100) {
  return getRewardAccountRepository().top(limit);
}

/**
 * Get tier distribution stats
 * @returns {Object} Tier counts
 */
export async function getTierDistribution() {
  const results = await getRewardAccountRepository().tierDistribution();
  
  const distribution = {};
  results.forEach(r => {
    distribution[r.tier] = {
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
  return (await getRewardAccountRepository().liability()) || { totalBalance: 0, totalPending: 0 };
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
