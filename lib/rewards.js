// Rewards and Loyalty System for Taste of Gratitude

import { connectToDatabase } from './db-optimized';
import { randomUUID } from 'crypto';

export class RewardsSystem {
  static async createPassport(customerEmail, customerName = null) {
    const { db } = await connectToDatabase();
    
    // Check if passport already exists
    const existing = await db.collection('passports').findOne({ customerEmail });
    if (existing) {
      return existing;
    }
    
    const passport = {
      id: randomUUID(),
      customerEmail,
      customerName,
      stamps: [],
      totalStamps: 0,
      vouchers: [],
      level: 'Explorer', // Explorer -> Enthusiast -> Ambassador
      xpPoints: 0,
      createdAt: new Date(),
      lastActivity: new Date()
    };
    
    await db.collection('passports').insertOne(passport);
    return passport;
  }
  
  static async addStamp(passportId, marketName, activityType = 'visit') {
    const { db } = await connectToDatabase();
    
    const stamp = {
      id: randomUUID(),
      marketName,
      activityType, // visit, purchase, challenge_complete
      timestamp: new Date(),
      xpValue: this.getXPValue(activityType)
    };
    
    const result = await db.collection('passports').updateOne(
      { id: passportId },
      { 
        $push: { stamps: stamp },
        $inc: { 
          totalStamps: 1,
          xpPoints: stamp.xpValue
        },
        $set: { lastActivity: new Date() }
      }
    );
    
    // Check for rewards eligibility
    const passport = await db.collection('passports').findOne({ id: passportId });
    const rewards = await this.checkRewardEligibility(passport);
    
    return { stamp, rewards, passport };
  }
  
  static getXPValue(activityType) {
    const xpMap = {
      visit: 10,
      purchase: 25,
      challenge_complete: 50,
      referral: 100,
      review: 15
    };
    return xpMap[activityType] || 5;
  }
  
  static async checkRewardEligibility(passport) {
    const rewards = [];
    const { totalStamps, vouchers, xpPoints } = passport;
    
    // 2 stamps = free 2oz shot
    if (totalStamps >= 2 && !vouchers.some(v => v.type === 'free_shot_2oz')) {
      rewards.push({
        type: 'free_shot_2oz',
        title: '🎉 Free 2oz Shot Earned!',
        description: 'Redeem your free Spicy Bloom or Gratitude Defense shot at any market',
        code: `SHOT2OZ${Date.now()}`,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      });
    }
    
    // 5 stamps = 15% off next purchase
    if (totalStamps >= 5 && !vouchers.some(v => v.type === 'discount_15')) {
      rewards.push({
        type: 'discount_15',
        title: '🌟 15% Off Reward!',
        description: 'Get 15% off your next gel or bundle purchase',
        code: `LOYAL15${Date.now()}`,
        discountPercent: 15,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days
      });
    }
    
    // 10 stamps = Level up + exclusive product access
    if (totalStamps >= 10 && passport.level === 'Explorer') {
      rewards.push({
        type: 'level_up',
        title: '🏆 Level Up: Enthusiast!',
        description: 'Unlock exclusive seasonal flavors and early access',
        newLevel: 'Enthusiast'
      });
    }
    
    // XP-based rewards
    if (xpPoints >= 500 && !vouchers.some(v => v.type === 'bundle_discount')) {
      rewards.push({
        type: 'bundle_discount',
        title: '💎 Bundle Master Reward',
        description: 'Buy any 2 gels, get the 3rd for $1',
        code: `BUNDLE3${Date.now()}`,
        expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
      });
    }
    
    return rewards;
  }
  
  static async awardVouchers(passportId, rewards) {
    if (rewards.length === 0) return [];
    
    const { db } = await connectToDatabase();
    const vouchers = rewards.map(reward => ({
      ...reward,
      id: randomUUID(),
      awardedAt: new Date(),
      used: false,
      usedAt: null
    }));
    
    await db.collection('passports').updateOne(
      { id: passportId },
      { 
        $push: { vouchers: { $each: vouchers } },
        $set: { 
          level: rewards.find(r => r.type === 'level_up')?.newLevel || undefined,
          lastActivity: new Date() 
        }
      }
    );
    
    return vouchers;
  }
  
  static async redeemVoucher(voucherId, orderId = null) {
    const { db } = await connectToDatabase();
    
    const result = await db.collection('passports').updateOne(
      { 'vouchers.id': voucherId, 'vouchers.used': false },
      { 
        $set: { 
          'vouchers.$.used': true,
          'vouchers.$.usedAt': new Date(),
          'vouchers.$.orderId': orderId
        }
      }
    );
    
    return result.modifiedCount > 0;
  }
  
  static async getPassportByEmail(customerEmail) {
    const { db } = await connectToDatabase();
    return await db.collection('passports').findOne({ customerEmail });
  }
  
  static async getLeaderboard(limit = 10) {
    const { db } = await connectToDatabase();
    return await db.collection('passports')
      .find({})
      .sort({ xpPoints: -1, totalStamps: -1 })
      .limit(limit)
      .project({ customerName: 1, xpPoints: 1, totalStamps: 1, level: 1 })
      .toArray();
  }
}

export default RewardsSystem;