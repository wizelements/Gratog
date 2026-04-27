/**
 * Gratitude Rewards Catalog
 * 
 * Admin-configurable rewards with validation
 */

import { connectToDatabase } from '../db-admin';
import { DEFAULT_REWARDS, TIER_ORDER, TIERS } from './core';

const COLLECTION = 'gratitude_rewards_catalog';

/**
 * Initialize default rewards if none exist
 */
export async function initializeDefaultRewards() {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTION);
  
  const count = await collection.countDocuments();
  if (count > 0) return { alreadyInitialized: true };
  
  // Add timestamps to defaults
  const rewards = DEFAULT_REWARDS.map(r => ({
    ...r,
    createdAt: new Date(),
    updatedAt: new Date()
  }));
  
  await collection.insertMany(rewards);
  
  return { initialized: true, count: rewards.length };
}

/**
 * Get all active rewards
 * @param {Object} options - Query options
 */
export async function getActiveRewards(options = {}) {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTION);
  
  const { tier = null, includeInactive = false } = options;
  
  const query = {};
  if (!includeInactive) query.active = true;
  
  let rewards = await collection.find(query).sort({ creditsCost: 1 }).toArray();
  
  // Filter by tier eligibility
  if (tier) {
    const tierIndex = TIER_ORDER.indexOf(tier);
    rewards = rewards.filter(r => {
      if (!r.tierRequirement) return true;
      const requiredIndex = TIER_ORDER.indexOf(r.tierRequirement);
      return tierIndex >= requiredIndex;
    });
  }
  
  return rewards;
}

/**
 * Get a single reward by ID
 * @param {string} rewardId - Reward ID
 */
export async function getRewardById(rewardId) {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTION);
  
  return await collection.findOne({ id: rewardId });
}

/**
 * Validate a reward configuration
 * @param {Object} reward - Reward object
 */
export function validateReward(reward) {
  const errors = [];
  
  if (!reward.name) errors.push('Name is required');
  if (!reward.description) errors.push('Description is required');
  if (!reward.creditsCost || reward.creditsCost < 1) {
    errors.push('Credits cost must be at least 1');
  }
  if (!reward.rewardType) errors.push('Reward type is required');
  if (reward.rewardValue < 0) errors.push('Reward value cannot be negative');
  if (reward.minimumOrder < 0) errors.push('Minimum order cannot be negative');
  
  const validTypes = ['discount_fixed', 'discount_percent', 'free_shipping', 'free_product', 'experience'];
  if (!validTypes.includes(reward.rewardType)) {
    errors.push(`Invalid reward type. Must be one of: ${validTypes.join(', ')}`);
  }
  
  if (reward.tierRequirement && !TIER_ORDER.includes(reward.tierRequirement)) {
    errors.push(`Invalid tier requirement. Must be one of: ${TIER_ORDER.join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create a new reward
 * @param {Object} reward - Reward data
 */
export async function createReward(reward) {
  const validation = validateReward(reward);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }
  
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTION);
  
  // Check for duplicate ID
  const existing = await collection.findOne({ id: reward.id });
  if (existing) {
    return { success: false, error: 'Reward with this ID already exists' };
  }
  
  const newReward = {
    ...reward,
    redemptionCount: 0,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  await collection.insertOne(newReward);
  
  return { success: true, reward: newReward };
}

/**
 * Update a reward
 * @param {string} rewardId - Reward ID
 * @param {Object} updates - Updates to apply
 */
export async function updateReward(rewardId, updates) {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTION);
  
  // Prevent changing ID
  delete updates.id;
  delete updates._id;
  delete updates.redemptionCount;
  delete updates.createdAt;
  
  updates.updatedAt = new Date();
  
  const result = await collection.findOneAndUpdate(
    { id: rewardId },
    { $set: updates },
    { returnDocument: 'after' }
  );
  
  if (!result) {
    return { success: false, error: 'Reward not found' };
  }
  
  return { success: true, reward: result };
}

/**
 * Toggle reward active status
 * @param {string} rewardId - Reward ID
 */
export async function toggleRewardStatus(rewardId) {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTION);
  
  const reward = await collection.findOne({ id: rewardId });
  if (!reward) {
    return { success: false, error: 'Reward not found' };
  }
  
  const result = await collection.findOneAndUpdate(
    { id: rewardId },
    { 
      $set: { 
        active: !reward.active,
        updatedAt: new Date()
      }
    },
    { returnDocument: 'after' }
  );
  
  return { success: true, reward: result };
}

/**
 * Delete a reward
 * @param {string} rewardId - Reward ID
 */
export async function deleteReward(rewardId) {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTION);
  
  const result = await collection.deleteOne({ id: rewardId });
  
  if (result.deletedCount === 0) {
    return { success: false, error: 'Reward not found' };
  }
  
  return { success: true };
}

/**
 * Increment redemption count
 * @param {string} rewardId - Reward ID
 */
export async function incrementRedemptionCount(rewardId) {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTION);
  
  await collection.updateOne(
    { id: rewardId },
    { 
      $inc: { redemptionCount: 1 },
      $set: { updatedAt: new Date() }
    }
  );
}

/**
 * Get reward analytics
 */
export async function getRewardAnalytics() {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTION);
  
  const pipeline = [
    {
      $group: {
        _id: null,
        totalRewards: { $sum: 1 },
        activeRewards: { 
          $sum: { $cond: ['$active', 1, 0] }
        },
        totalRedemptions: { $sum: '$redemptionCount' },
        avgCost: { $avg: '$creditsCost' }
      }
    }
  ];
  
  const results = await collection.aggregate(pipeline).toArray();
  
  // Get by reward type
  const byType = await collection.aggregate([
    {
      $group: {
        _id: '$rewardType',
        count: { $sum: 1 },
        totalRedemptions: { $sum: '$redemptionCount' }
      }
    }
  ]).toArray();
  
  return {
    overview: results[0] || {},
    byType: byType.reduce((acc, r) => {
      acc[r._id] = { count: r.count, totalRedemptions: r.totalRedemptions };
      return acc;
    }, {})
  };
}

/**
 * Get popular rewards
 * @param {number} limit - Number of results
 */
export async function getPopularRewards(limit = 5) {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTION);
  
  return await collection
    .find({ active: true })
    .sort({ redemptionCount: -1 })
    .limit(limit)
    .toArray();
}

/**
 * Check if customer can afford any rewards
 * @param {number} balance - Customer's credit balance
 * @param {string} tier - Customer's tier
 */
export async function getAffordableRewards(balance, tier) {
  const rewards = await getActiveRewards({ tier });
  
  return {
    affordable: rewards.filter(r => r.creditsCost <= balance),
    upcoming: rewards.filter(r => r.creditsCost > balance)
      .sort((a, b) => a.creditsCost - b.creditsCost)
      .slice(0, 3)
  };
}

export default {
  initializeDefaultRewards,
  getActiveRewards,
  getRewardById,
  validateReward,
  createReward,
  updateReward,
  toggleRewardStatus,
  deleteReward,
  incrementRedemptionCount,
  getRewardAnalytics,
  getPopularRewards,
  getAffordableRewards
};
