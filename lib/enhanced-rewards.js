// Enhanced Rewards System with Robust Fallbacks
// Handles all reward points, levels, achievements, and customer loyalty tracking
//
// ISS-036 NOTE: This is 1 of 2 server-side reward models:
//   - rewards-secure.js → stamps/vouchers via `passports` collection (ACID, ObjectId)
//   - enhanced-rewards.js (THIS FILE) → points/levels via `customer_passports` collection (UUID)
//   - stores/rewards.ts → client-side Zustand store (syncs to server via ISS-037)
//
// The `/api/rewards/passport` route unifies both collections at read time.
// FUTURE: Merge into a single `passports` collection with both stamps + points.

import { connectToDatabase } from './db-optimized';
import { v4 as uuidv4 } from 'uuid';

// Reward levels configuration
const REWARD_LEVELS = {
  EXPLORER: { name: 'Explorer', emoji: '🌱', min: 0, max: 99 },
  ENTHUSIAST: { name: 'Enthusiast', emoji: '🌿', min: 100, max: 249 },
  CONNOISSEUR: { name: 'Connoisseur', emoji: '🍃', min: 250, max: 499 },
  WELLNESS_WARRIOR: { name: 'Wellness Warrior', emoji: '💚', min: 500, max: 999 },
  SEA_MOSS_SAGE: { name: 'Sea Moss Sage', emoji: '🧙‍♀️', min: 1000, max: 1999 },
  GRATITUDE_GURU: { name: 'Gratitude Guru', emoji: '✨', min: 2000, max: Infinity }
};

// Point earning activities
const POINT_ACTIVITIES = {
  purchase: { base: 1, multiplier: 1 }, // 1 point per dollar spent
  spin_wheel: { base: 5, multiplier: 1 },
  spin_wheel_win: { base: 10, multiplier: 1 },
  referral: { base: 50, multiplier: 1 },
  review: { base: 25, multiplier: 1 },
  social_share: { base: 15, multiplier: 1 },
  newsletter_signup: { base: 20, multiplier: 1 },
  birthday: { base: 100, multiplier: 1 }
};

// Available rewards by level
const LEVEL_REWARDS = {
  ENTHUSIAST: [
    { id: 'free_shipping_100', type: 'free_shipping', cost: 100, name: 'Free Shipping', description: 'Free shipping on your next order' }
  ],
  CONNOISSEUR: [
    { id: 'discount_5_200', type: 'discount', cost: 200, value: 5, name: '$5 Off', description: '$5 off your next order' }
  ],
  WELLNESS_WARRIOR: [
    { id: 'discount_10_400', type: 'discount', cost: 400, value: 10, name: '$10 Off', description: '$10 off your next order' },
    { id: 'free_sample_300', type: 'free_product', cost: 300, name: 'Free Sample', description: 'Free sample of new products' }
  ],
  SEA_MOSS_SAGE: [
    { id: 'discount_20_800', type: 'discount', cost: 800, value: 20, name: '$20 Off', description: '$20 off your next order' },
    { id: 'vip_access_500', type: 'vip_access', cost: 500, name: 'VIP Access', description: 'Early access to new products' }
  ],
  GRATITUDE_GURU: [
    { id: 'discount_50_1500', type: 'discount', cost: 1500, value: 50, name: '$50 Off', description: '$50 off your next order' },
    { id: 'exclusive_products_1000', type: 'exclusive_access', cost: 1000, name: 'Exclusive Products', description: 'Access to exclusive limited-edition products' }
  ]
};

class EnhancedRewardsSystem {
  constructor() {
    this.db = null;
  }

  async initialize() {
    try {
      const { db } = await connectToDatabase();
      this.db = db;
      return true;
    } catch (error) {
      console.error('Failed to initialize rewards system:', error);
      return false;
    }
  }

  // Create or get customer passport with robust fallbacks
  async createOrGetPassport(email, name = null, fallbackMode = true) {
    try {
      await this.initialize();
      
      if (!this.db) {
        if (fallbackMode) {
          return this.createFallbackPassport(email, name);
        }
        throw new Error('Database not available');
      }

      // Try to get existing passport
      let passport = await this.db.collection('customer_passports').findOne({ email });
      
      if (passport) {
        // Update passport data and return
        return this.updatePassportLevel(passport);
      }

      // Create new passport
      const newPassport = {
        id: uuidv4(),
        email,
        name,
        points: 0,
        totalPointsEarned: 0,
        level: 'EXPLORER',
        activities: [],
        redeemedRewards: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.db.collection('customer_passports').insertOne(newPassport);
      return this.formatPassportResponse(newPassport);
      
    } catch (error) {
      console.error('Error creating/getting passport:', error);
      
      if (fallbackMode) {
        return this.createFallbackPassport(email, name);
      }
      
      throw error;
    }
  }

  // Create fallback passport for offline mode
  createFallbackPassport(email, name = null) {
    const passport = {
      id: `fallback_${Date.now()}`,
      email,
      name,
      points: 0,
      totalPointsEarned: 0,
      level: 'EXPLORER',
      activities: [],
      redeemedRewards: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isFallback: true
    };

    return this.formatPassportResponse(passport);
  }

  // Add points with activity tracking
  async addPoints(email, points, activityType, activityData = {}, fallbackMode = true) {
    try {
      await this.initialize();
      
      if (!this.db) {
        if (fallbackMode) {
          // Store in localStorage for sync later
          this.storePendingActivity(email, points, activityType, activityData);
          return { success: true, points, isFallback: true };
        }
        throw new Error('Database not available');
      }

      const activity = {
        id: uuidv4(),
        type: activityType,
        points,
        data: activityData,
        timestamp: new Date()
      };

      // Update passport with new points and activity
      const result = await this.db.collection('customer_passports').findOneAndUpdate(
        { email },
        {
          $inc: { 
            points: points,
            totalPointsEarned: points 
          },
          $push: { activities: activity },
          $set: { updatedAt: new Date() }
        },
        { returnDocument: 'after', upsert: true }
      );

      if (result.value) {
        const updatedPassport = this.updatePassportLevel(result.value);
        
        // Check for level up
        const oldLevel = this.determineLevelFromPoints(result.value.totalPointsEarned - points);
        const newLevel = updatedPassport.level;
        
        if (oldLevel !== newLevel) {
          // Award level up bonus
          await this.awardLevelUpBonus(email, newLevel);
        }
        
        return {
          success: true,
          points,
          totalPoints: updatedPassport.points,
          levelUp: oldLevel !== newLevel,
          newLevel: newLevel,
          passport: updatedPassport
        };
      }
      
      throw new Error('Failed to update passport');
      
    } catch (error) {
      console.error('Error adding points:', error);
      
      if (fallbackMode) {
        this.storePendingActivity(email, points, activityType, activityData);
        return { success: true, points, isFallback: true, error: error.message };
      }
      
      throw error;
    }
  }

  // Store pending activity in localStorage for sync later
  storePendingActivity(email, points, activityType, activityData) {
    try {
      // Check if we're in browser environment
      if (typeof window === 'undefined' || !window.localStorage) {
        console.warn('localStorage not available - cannot store pending activity');
        return;
      }
      
      const key = `taste-of-gratitude-pending-activities-${email}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      
      existing.push({
        id: uuidv4(),
        email,
        points,
        activityType,
        activityData,
        timestamp: new Date().toISOString()
      });
      
      localStorage.setItem(key, JSON.stringify(existing));
    } catch (error) {
      console.error('Failed to store pending activity:', error);
    }
  }

  // Sync pending activities when online
  async syncPendingActivities(email) {
    try {
      // Check if we're in browser environment
      if (typeof window === 'undefined' || !window.localStorage) {
        return { success: true, synced: 0, message: 'localStorage not available' };
      }
      
      const key = `taste-of-gratitude-pending-activities-${email}`;
      const pending = JSON.parse(localStorage.getItem(key) || '[]');
      
      if (pending.length === 0) return { success: true, synced: 0 };
      
      let syncedCount = 0;
      const errors = [];
      
      for (const activity of pending) {
        try {
          await this.addPoints(
            activity.email,
            activity.points,
            activity.activityType,
            activity.activityData,
            false // Don't use fallback mode during sync
          );
          syncedCount++;
        } catch (error) {
          errors.push({ activity, error: error.message });
        }
      }
      
      // Clear synced activities
      if (syncedCount > 0) {
        localStorage.removeItem(key);
      }
      
      return {
        success: true,
        synced: syncedCount,
        total: pending.length,
        errors: errors.length > 0 ? errors : undefined
      };
      
    } catch (error) {
      console.error('Error syncing pending activities:', error);
      return { success: false, error: error.message };
    }
  }

  // Redeem reward
  async redeemReward(email, rewardId, fallbackMode = true) {
    try {
      await this.initialize();
      
      if (!this.db && !fallbackMode) {
        throw new Error('Database not available');
      }

      const passport = await this.createOrGetPassport(email, null, fallbackMode);
      const availableRewards = this.getAvailableRewards(passport.level, passport.points);
      const reward = availableRewards.find(r => r.id === rewardId);
      
      if (!reward) {
        throw new Error('Reward not available');
      }
      
      if (passport.points < reward.cost) {
        throw new Error('Insufficient points');
      }

      if (this.db) {
        // Redeem via database
        const redemption = {
          id: uuidv4(),
          rewardId: reward.id,
          reward,
          cost: reward.cost,
          redeemedAt: new Date()
        };

        const result = await this.db.collection('customer_passports').findOneAndUpdate(
          { email },
          {
            $inc: { points: -reward.cost },
            $push: { redeemedRewards: redemption },
            $set: { updatedAt: new Date() }
          },
          { returnDocument: 'after' }
        );

        if (result.value) {
          return {
            success: true,
            redemption,
            remainingPoints: result.value.points,
            passport: this.formatPassportResponse(result.value)
          };
        }
        
        throw new Error('Failed to redeem reward');
      } else {
        // Fallback mode
        return {
          success: true,
          redemption: {
            id: `fallback_${Date.now()}`,
            rewardId: reward.id,
            reward,
            cost: reward.cost,
            redeemedAt: new Date(),
            isFallback: true
          },
          remainingPoints: passport.points - reward.cost,
          isFallback: true
        };
      }
      
    } catch (error) {
      console.error('Error redeeming reward:', error);
      throw error;
    }
  }

  // Get leaderboard
  async getLeaderboard(limit = 10, fallbackMode = true) {
    try {
      await this.initialize();
      
      if (!this.db) {
        if (fallbackMode) {
          return this.getFallbackLeaderboard();
        }
        throw new Error('Database not available');
      }

      const leaders = await this.db.collection('customer_passports')
        .find({})
        .sort({ totalPointsEarned: -1 })
        .limit(limit)
        .toArray();

      return leaders.map((leader, index) => {
        const formattedPassport = this.formatPassportResponse(leader);
        return {
          rank: index + 1,
          email: leader.email,
          name: leader.name,
          points: leader.points,
          totalPointsEarned: leader.totalPointsEarned,
          level: formattedPassport.level,
          levelInfo: formattedPassport.levelInfo
        };
      });
      
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      
      if (fallbackMode) {
        return this.getFallbackLeaderboard();
      }
      
      throw error;
    }
  }

  getFallbackLeaderboard() {
    return [
      { rank: 1, name: 'Wellness Champion', points: 1500, level: 'GRATITUDE_GURU', levelInfo: REWARD_LEVELS.GRATITUDE_GURU },
      { rank: 2, name: 'Health Hero', points: 800, level: 'SEA_MOSS_SAGE', levelInfo: REWARD_LEVELS.SEA_MOSS_SAGE },
      { rank: 3, name: 'Natural Navigator', points: 450, level: 'WELLNESS_WARRIOR', levelInfo: REWARD_LEVELS.WELLNESS_WARRIOR }
    ];
  }

  // Helper methods
  determineLevelFromPoints(points) {
    for (const [levelKey, level] of Object.entries(REWARD_LEVELS)) {
      if (points >= level.min && points <= level.max) {
        return levelKey;
      }
    }
    return 'EXPLORER';
  }

  updatePassportLevel(passport) {
    const level = this.determineLevelFromPoints(passport.totalPointsEarned || passport.points || 0);
    passport.level = level;
    return this.formatPassportResponse(passport);
  }

  formatPassportResponse(passport) {
    const levelInfo = REWARD_LEVELS[passport.level] || REWARD_LEVELS.EXPLORER;
    const availableRewards = this.getAvailableRewards(passport.level, passport.points);
    
    // Calculate progress to next level
    const nextLevelKey = this.getNextLevel(passport.level);
    const nextLevel = nextLevelKey ? REWARD_LEVELS[nextLevelKey] : null;
    
    const progressToNext = nextLevel ? {
      progress: Math.round(((passport.totalPointsEarned || passport.points) - levelInfo.min) / (nextLevel.min - levelInfo.min) * 100),
      pointsToNext: nextLevel.min - (passport.totalPointsEarned || passport.points),
      isMaxLevel: false,
      nextLevel
    } : {
      progress: 100,
      pointsToNext: 0,
      isMaxLevel: true,
      nextLevel: null
    };

    return {
      ...passport,
      levelInfo,
      availableRewards,
      progressToNext,
      recentActivities: (passport.activities || []).slice(-10)
    };
  }

  getNextLevel(currentLevel) {
    const levels = Object.keys(REWARD_LEVELS);
    const currentIndex = levels.indexOf(currentLevel);
    return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;
  }

  getAvailableRewards(level, points) {
    const rewards = [];
    
    // Get rewards for current level and below
    for (const [levelKey, levelRewards] of Object.entries(LEVEL_REWARDS)) {
      const currentLevelInfo = REWARD_LEVELS[level];
      const rewardLevelInfo = REWARD_LEVELS[levelKey];
      
      // Check if both levels exist and compare minimums
      if (currentLevelInfo && rewardLevelInfo && rewardLevelInfo.min <= currentLevelInfo.min) {
        rewards.push(...levelRewards.filter(reward => points >= reward.cost));
      }
    }
    
    return rewards;
  }

  async awardLevelUpBonus(email, newLevel) {
    const bonusPoints = {
      ENTHUSIAST: 25,
      CONNOISSEUR: 50,
      WELLNESS_WARRIOR: 100,
      SEA_MOSS_SAGE: 200,
      GRATITUDE_GURU: 500
    };
    
    const bonus = bonusPoints[newLevel] || 0;
    if (bonus > 0) {
      await this.addPoints(email, bonus, 'level_up_bonus', { newLevel }, false);
    }
  }
}

// Export singleton instance
export const rewardsSystem = new EnhancedRewardsSystem();
export { REWARD_LEVELS, POINT_ACTIVITIES, LEVEL_REWARDS };