// Enhanced Rewards System with Security & Data Integrity

import { connectToDatabase } from './db-optimized';
import { randomUUID } from 'crypto';
import crypto from 'crypto';

// Validation utilities
export const validation = {
  isValidEmail: (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email) && email.length <= 254;
  },
  
  sanitizeString: (str, maxLength = 100) => {
    if (!str || typeof str !== 'string') return '';
    return str
      .trim()
      .substring(0, maxLength)
      .replace(/[<>\"']/g, '') // Basic XSS prevention
      .replace(/[^\w\s\-]/g, ''); // Remove special chars
  },
  
  isValidMarketName: (name) => {
    if (!name || typeof name !== 'string') return false;
    return name.length >= 2 && name.length <= 100 && /^[\w\s\-&'(),]+$/.test(name);
  },
  
  generateSecureCode: (prefix) => {
    const random = crypto.randomBytes(6).toString('hex').toUpperCase();
    return `${prefix}${random}`;
  }
};

// Main rewards system
export class EnhancedRewardsSystem {
  static async createPassport(customerEmail, customerName = null, idempotencyKey = null) {
    // Validate inputs
    if (!validation.isValidEmail(customerEmail)) {
      throw new Error('Invalid email address');
    }
    
    const sanitizedName = customerName ? validation.sanitizeString(customerName, 50) : null;
    
    const { db } = await connectToDatabase();
    
    // Check if passport already exists
    const existing = await db.collection('passports').findOne({ email: customerEmail });
    if (existing) {
      return { passport: existing, created: false };
    }
    
    const passport = {
      _id: randomUUID(),
      email: customerEmail,
      name: sanitizedName,
      stamps: [],
      totalStamps: 0,
      vouchers: [],
      level: 'Explorer',
      xpPoints: 0,
      createdAt: new Date(),
      lastActivity: new Date(),
      stampHistory: [], // Audit trail
      idempotencyKey, // Track request idempotency
      metadata: {
        source: 'market_passport',
        version: 2
      }
    };
    
    try {
      await db.collection('passports').insertOne(passport);
      return { passport, created: true };
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key - return existing
        return { passport: existing, created: false };
      }
      throw error;
    }
  }
  
  static async addStamp(passportId, marketName, activityType = 'visit', idempotencyKey = null) {
    // Validate market name
    if (!validation.isValidMarketName(marketName)) {
      throw new Error('Invalid market name');
    }
    
    const { db } = await connectToDatabase();
    
    // Check for duplicate within time window (idempotency)
    if (idempotencyKey) {
      const recentDuplicate = await db.collection('passports').findOne({
        _id: passportId,
        'stampHistory.idempotencyKey': idempotencyKey,
        'stampHistory.timestamp': { $gt: new Date(Date.now() - 60 * 1000) } // 60 second window
      });
      
      if (recentDuplicate) {
        throw new Error('Duplicate stamp request - please try again in a moment');
      }
    }
    
    // Check rate limiting (max 1 stamp per market per hour per customer)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentStamps = await db.collection('passports').findOne({
      _id: passportId,
      'stamps': {
        $elemMatch: {
          marketName,
          timestamp: { $gt: oneHourAgo }
        }
      }
    });
    
    if (recentStamps) {
      throw new Error(`You've already stamped at ${marketName} in the last hour`);
    }
    
    // Generate stamp
    const stamp = {
      id: randomUUID(),
      marketName,
      activityType,
      timestamp: new Date(),
      xpValue: this.getXPValue(activityType),
      idempotencyKey
    };
    
    // Use atomic transaction for stamp + reward
    const session = db.client.startSession();
    try {
      await session.withTransaction(async () => {
        // Add stamp
        await db.collection('passports').updateOne(
          { _id: passportId },
          {
            $push: {
              stamps: stamp,
              stampHistory: {
                ...stamp,
                type: 'stamp_added'
              }
            },
            $inc: {
              totalStamps: 1,
              xpPoints: stamp.xpValue
            },
            $set: { lastActivity: new Date() }
          },
          { session }
        );
        
        // Get updated passport
        const passport = await db.collection('passports').findOne(
          { _id: passportId },
          { session }
        );
        
        // Check rewards and award atomically
        const rewards = await this.checkRewardEligibility(passport);
        if (rewards.length > 0) {
          await this.awardVouchers(passportId, rewards, session);
        }
        
        return { stamp, rewards, passport };
      });
    } finally {
      await session.endSession();
    }
    
    // Fetch final passport
    const finalPassport = await db.collection('passports').findOne({ _id: passportId });
    const rewards = await this.checkRewardEligibility(finalPassport);
    
    return { stamp, rewards, passport: finalPassport };
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
    const { totalStamps, vouchers, xpPoints, email } = passport;
    
    // Only award if not already awarded
    const awardedTypes = vouchers.map(v => v.type);
    
    // 2 stamps = free 2oz shot
    if (totalStamps >= 2 && !awardedTypes.includes('free_shot_2oz')) {
      rewards.push({
        type: 'free_shot_2oz',
        title: '🎉 Free 2oz Shot Earned!',
        description: 'Redeem your free Spicy Bloom or Gratitude Defense shot at any market',
        code: validation.generateSecureCode('SHOT2OZ'),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        metadata: { minStamps: 2 }
      });
    }
    
    // 5 stamps = 15% off next purchase
    if (totalStamps >= 5 && !awardedTypes.includes('discount_15')) {
      rewards.push({
        type: 'discount_15',
        title: '🌟 15% Off Reward!',
        description: 'Get 15% off your next gel or bundle purchase',
        code: validation.generateSecureCode('LOYAL15'),
        discountPercent: 15,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        metadata: { minStamps: 5 }
      });
    }
    
    // 10 stamps = Level up
    if (totalStamps >= 10 && !awardedTypes.includes('level_up') && passport.level === 'Explorer') {
      rewards.push({
        type: 'level_up',
        title: '🏆 Level Up: Enthusiast!',
        description: 'Unlock exclusive seasonal flavors and early access',
        newLevel: 'Enthusiast',
        expiresAt: null, // Never expires
        metadata: { minStamps: 10 }
      });
    }
    
    // 15 stamps = Ambassador
    if (totalStamps >= 15 && !awardedTypes.includes('level_up_ambassador') && passport.level === 'Enthusiast') {
      rewards.push({
        type: 'level_up_ambassador',
        title: '👑 Reach Ambassador Status!',
        description: 'VIP access to exclusive products and events',
        newLevel: 'Ambassador',
        expiresAt: null,
        metadata: { minStamps: 15 }
      });
    }
    
    return rewards;
  }
  
  static async awardVouchers(passportId, rewards, session = null) {
    if (rewards.length === 0) return [];
    
    const { db } = await connectToDatabase();
    const vouchers = rewards.map(reward => ({
      id: randomUUID(),
      ...reward,
      awardedAt: new Date(),
      used: false,
      usedAt: null,
      usedAtOrder: null
    }));
    
    const updateOps = {
      $push: { 
        vouchers: { $each: vouchers },
        stampHistory: {
          type: 'voucher_awarded',
          vouchersCount: vouchers.length,
          timestamp: new Date()
        }
      }
    };
    
    // Update level if level-up reward
    const levelUpReward = rewards.find(r => r.newLevel);
    if (levelUpReward) {
      updateOps.$set = {
        level: levelUpReward.newLevel,
        lastActivity: new Date()
      };
    }
    
    const options = session ? { session } : {};
    
    await db.collection('passports').updateOne(
      { _id: passportId },
      updateOps,
      options
    );
    
    return vouchers;
  }
  
  static async redeemVoucher(voucherId, passportId, orderId = null) {
    const { db } = await connectToDatabase();
    
    // Verify voucher exists and not already used
    const voucher = await db.collection('passports').findOne(
      {
        _id: passportId,
        'vouchers.id': voucherId,
        'vouchers.used': false
      },
      { projection: { 'vouchers.$': 1 } }
    );
    
    if (!voucher || !voucher.vouchers[0]) {
      throw new Error('Voucher not found or already used');
    }
    
    // Check expiration
    const voucherData = voucher.vouchers[0];
    if (voucherData.expiresAt && new Date() > voucherData.expiresAt) {
      throw new Error('Voucher has expired');
    }
    
    // Redeem voucher
    const result = await db.collection('passports').updateOne(
      { _id: passportId, 'vouchers.id': voucherId },
      {
        $set: {
          'vouchers.$.used': true,
          'vouchers.$.usedAt': new Date(),
          'vouchers.$.usedAtOrder': orderId
        },
        $push: {
          stampHistory: {
            type: 'voucher_redeemed',
            voucherId,
            orderId,
            timestamp: new Date()
          }
        }
      }
    );
    
    return result.modifiedCount > 0;
  }
  
  static async getPassportByEmail(customerEmail) {
    if (!validation.isValidEmail(customerEmail)) {
      throw new Error('Invalid email address');
    }
    
    const { db } = await connectToDatabase();
    return await db.collection('passports').findOne({ email: customerEmail });
  }
  
  static async getLeaderboard(limit = 10, offset = 0) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new Error('Invalid limit');
    }
    if (!Number.isInteger(offset) || offset < 0) {
      throw new Error('Invalid offset');
    }
    
    const { db } = await connectToDatabase();
    const [leaderboard, total] = await Promise.all([
      db.collection('passports')
        .find({})
        .sort({ xpPoints: -1, totalStamps: -1 })
        .skip(offset)
        .limit(limit)
        .project({ name: 1, xpPoints: 1, totalStamps: 1, level: 1, email: 0 })
        .toArray(),
      db.collection('passports').countDocuments({})
    ]);
    
    return { leaderboard, total, hasMore: offset + limit < total };
  }
  
  static async enforceVoucherExpiration() {
    const { db } = await connectToDatabase();
    
    const result = await db.collection('passports').updateMany(
      {
        'vouchers': {
          $elemMatch: {
            expiresAt: { $lt: new Date() },
            used: false
          }
        }
      },
      {
        $set: {
          'vouchers.$[expired].expired': true
        }
      },
      {
        arrayFilters: [
          { 'expired.expiresAt': { $lt: new Date() }, 'expired.used': false }
        ]
      }
    );
    
    return result.modifiedCount;
  }
}

export default EnhancedRewardsSystem;
