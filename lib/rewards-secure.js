/**
 * Secure Rewards System with Transaction Support
 * 
 * Features:
 * - ACID transactions with rollback
 * - Idempotency for duplicate prevention
 * - No race conditions
 * - Secure code generation
 * - Data integrity validation
 * 
 * ISS-036 NOTE: This is the canonical server-side reward model (stamps/vouchers).
 * Uses `passports` collection with ObjectId-based IDs and MongoDB transactions.
 * The parallel `enhanced-rewards.js` handles points/levels in `customer_passports`.
 * Both are unified at read time by `/api/rewards/passport` route.
 * Client-side state in `stores/rewards.ts` syncs to server (ISS-037).
 */

import { connectToDatabase } from './db-optimized';
import { ObjectId } from 'mongodb';
import {
  generateSecureVoucherCode,
  generateIdempotencyKey
} from './rewards-security';

const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000; // 24 hours

export class SecureRewardsSystem {
  /**
   * Create or get passport with full transaction support
   */
  static async createPassport(customerEmail, customerName = null, idempotencyKey = null) {
    const { db, client } = await connectToDatabase();
    const session = client.startSession();

    try {
      return await session.withTransaction(async () => {
        // Check idempotency
        if (idempotencyKey) {
          const existing = await db.collection('passport_idempotency').findOne(
            { idempotencyKey, type: 'create' },
            { session }
          );
          if (existing) {
            return existing.result;
          }
        }

        // Check if passport exists
        const existingPassport = await db.collection('passports').findOne(
          { customerEmail },
          { session }
        );
        if (existingPassport) {
          return existingPassport;
        }

        // Create new passport
        const passport = {
          _id: new ObjectId(),
          customerEmail: customerEmail.toLowerCase(),
          customerName: customerName ? customerName.trim() : null,
          stamps: [],
          totalStamps: 0,
          vouchers: [],
          level: 'Explorer',
          xpPoints: 0,
          createdAt: new Date(),
          lastActivity: new Date(),
          version: 1 // For optimistic locking
        };

        await db.collection('passports').insertOne(passport, { session });

        // Store idempotency result
        if (idempotencyKey) {
          await db.collection('passport_idempotency').insertOne(
            {
              idempotencyKey,
              type: 'create',
              result: passport,
              createdAt: new Date(),
              expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL)
            },
            { session }
          );
        }

        return passport;
      });
    } finally {
      await session.endSession();
    }
  }

  /**
   * Add stamp to passport with full transaction safety
   * Prevents race conditions and duplicate rewards
   */
  static async addStamp(
    passportId,
    marketName,
    activityType = 'visit',
    idempotencyKey = null
  ) {
    const { db, client } = await connectToDatabase();
    const session = client.startSession();

    try {
      return await session.withTransaction(async () => {
        // 1. Check idempotency (prevent duplicate processing)
        if (idempotencyKey) {
          const existing = await db.collection('stamp_idempotency').findOne(
            { idempotencyKey },
            { session }
          );
          if (existing) {
            return existing.result;
          }
        }

        // 2. Create stamp
        const stamp = {
          id: generateIdempotencyKey(),
          marketName,
          activityType,
          timestamp: new Date(),
          xpValue: this.getXPValue(activityType)
        };

        // 3. Atomic update with read in same transaction
        // This ensures we see consistent data for reward eligibility check
        const updateResult = await db.collection('passports').findOneAndUpdate(
          { _id: new ObjectId(passportId) },
          {
            $push: { stamps: stamp },
            $inc: { totalStamps: 1, xpPoints: stamp.xpValue },
            $set: { lastActivity: new Date() }
          },
          { returnDocument: 'after', session }
        );

        if (!updateResult.value) {
          throw new Error('Passport not found');
        }

        // 4. Check for rewards eligibility (with guaranteed consistent data)
        const rewards = await this.checkRewardEligibility(
          updateResult.value,
          session,
          db
        );

        // 5. Award vouchers atomically
        let awardedVouchers = [];
        if (rewards.length > 0) {
          awardedVouchers = await this.awardVouchers(
            new ObjectId(passportId),
            rewards,
            session,
            db
          );
        }

        const result = {
          success: true,
          stamp,
          rewards,
          awardedVouchers,
          passport: updateResult.value
        };

        // 6. Store idempotency result
        if (idempotencyKey) {
          await db.collection('stamp_idempotency').insertOne(
            {
              idempotencyKey,
              result,
              createdAt: new Date(),
              expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL)
            },
            { session }
          );
        }

        return result;
      });
    } catch (error) {
      console.error('Error adding stamp:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Get XP value for activity type
   */
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

  /**
   * Check reward eligibility with consistent data
   * @param {object} passport - Current passport state
   * @param {object} session - Transaction session
   * @param {object} db - Database connection
   */
  static async checkRewardEligibility(passport, session = null, db = null) {
    const rewards = [];
    const { totalStamps, vouchers, xpPoints } = passport;

    // 2 stamps = free 2oz shot
    if (totalStamps >= 2 && !vouchers.some(v => v.type === 'free_shot_2oz')) {
      rewards.push({
        type: 'free_shot_2oz',
        title: '🎉 Free 2oz Shot Earned!',
        description: 'Redeem your free Spicy Bloom or Gratitude Defense shot at any market',
        code: generateSecureVoucherCode('SHOT2OZ'),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      });
    }

    // 5 stamps = 15% off
    if (totalStamps >= 5 && !vouchers.some(v => v.type === 'discount_15')) {
      rewards.push({
        type: 'discount_15',
        title: '🌟 15% Off Reward!',
        description: 'Get 15% off your next gel or bundle purchase',
        code: generateSecureVoucherCode('LOYAL15'),
        discountPercent: 15,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days
      });
    }

    // 10 stamps = Level up
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
        code: generateSecureVoucherCode('BUNDLE3'),
        expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
      });
    }

    return rewards;
  }

  /**
   * Award vouchers atomically
   */
  static async awardVouchers(passportId, rewards, session, db) {
    if (rewards.length === 0) return [];

    const vouchers = rewards.map(reward => ({
      ...reward,
      id: generateIdempotencyKey(),
      awardedAt: new Date(),
      used: false,
      usedAt: null
    }));

    // Update passport with vouchers and level if applicable
    const levelUpReward = rewards.find(r => r.type === 'level_up');
    const updateData = { $push: { vouchers: { $each: vouchers } } };

    if (levelUpReward) {
      updateData.$set = { level: levelUpReward.newLevel };
    }

    await db.collection('passports').updateOne(
      { _id: passportId },
      updateData,
      { session }
    );

    return vouchers;
  }

  /**
   * Redeem voucher with race condition protection
   */
  static async redeemVoucher(passportId, voucherId, orderId = null) {
    const { db, client } = await connectToDatabase();
    const session = client.startSession();

    try {
      return await session.withTransaction(async () => {
        // Check voucher exists and hasn't been used
        const passport = await db.collection('passports').findOne(
          { _id: new ObjectId(passportId) },
          { session }
        );

        const voucher = passport?.vouchers?.find(v => v.id === voucherId);

        if (!voucher) {
          throw new Error('Voucher not found');
        }

        if (voucher.used) {
          throw new Error('Voucher already used');
        }

        if (voucher.expiresAt && new Date() > voucher.expiresAt) {
          throw new Error('Voucher expired');
        }

        // Mark as used atomically
        const result = await db.collection('passports').findOneAndUpdate(
          {
            _id: new ObjectId(passportId),
            'vouchers.id': voucherId,
            'vouchers.used': false
          },
          {
            $set: {
              'vouchers.$.used': true,
              'vouchers.$.usedAt': new Date(),
              'vouchers.$.orderId': orderId
            }
          },
          { returnDocument: 'after', session }
        );

        if (!result.value) {
          throw new Error('Failed to redeem voucher');
        }

        return {
          success: true,
          voucher: result.value.vouchers.find(v => v.id === voucherId),
          passport: result.value
        };
      });
    } finally {
      await session.endSession();
    }
  }

  /**
   * Get passport by email (case-insensitive)
   */
  static async getPassportByEmail(customerEmail) {
    const { db } = await connectToDatabase();
    return await db.collection('passports').findOne({
      customerEmail: customerEmail.toLowerCase()
    });
  }

  /**
   * Get secure leaderboard (no PII exposed)
   */
  static async getLeaderboard(limit = 10) {
    const { db } = await connectToDatabase();

    return await db.collection('passports')
      .aggregate([
        // Only include passports with activity
        { $match: { totalStamps: { $gt: 0 } } },
        // Sort by XP, then stamps
        { $sort: { xpPoints: -1, totalStamps: -1 } },
        // Limit results
        { $limit: Math.min(limit, 100) }, // Cap at 100
        // Project safe fields only
        {
          $project: {
            _id: 0,
            rank: { $meta: 'documentPosition' },
            xpPoints: 1,
            totalStamps: 1,
            level: 1,
            // Anonymize name
            nameDisplay: {
              $cond: [
                { $eq: ['$customerName', null] },
                'Anonymous',
                {
                  $concat: [
                    { $substr: ['$customerName', 0, 1] },
                    '*** '
                  ]
                }
              ]
            }
          }
        }
      ])
      .toArray();
  }

  /**
   * Initialize database indexes for performance
   */
  static async initializeIndexes() {
    const { db } = await connectToDatabase();

    // Email lookup (primary key for finding passports)
    await db.collection('passports').createIndex(
      { customerEmail: 1 },
      { unique: true }
    );

    // Leaderboard query (sort by XP and stamps)
    await db.collection('passports').createIndex(
      { xpPoints: -1, totalStamps: -1 }
    );

    // Stamp queries
    await db.collection('passports').createIndex(
      { totalStamps: -1 }
    );

    // Creation time (for retention policies)
    await db.collection('passports').createIndex(
      { createdAt: -1 }
    );

    // Voucher lookups
    await db.collection('passports').createIndex(
      { 'vouchers.id': 1 }
    );

    // Compound index for voucher redemption
    await db.collection('passports').createIndex(
      { 'vouchers.id': 1, 'vouchers.used': 1 }
    );

    // Idempotency key expiration
    await db.collection('stamp_idempotency').createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 }
    );

    await db.collection('passport_idempotency').createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 }
    );
  }

  /**
   * Clean up expired idempotency records
   */
  static async cleanupExpiredIdempotency() {
    const { db } = await connectToDatabase();

    const now = new Date();

    await db.collection('stamp_idempotency').deleteMany({
      expiresAt: { $lt: now }
    });

    await db.collection('passport_idempotency').deleteMany({
      expiresAt: { $lt: now }
    });
  }

  /**
   * Get user statistics
   */
  static async getPassportStats(passportId) {
    const { db } = await connectToDatabase();

    const passport = await db.collection('passports').findOne(
      { _id: new ObjectId(passportId) }
    );

    if (!passport) {
      throw new Error('Passport not found');
    }

    return {
      totalStamps: passport.totalStamps,
      xpPoints: passport.xpPoints,
      level: passport.level,
      vouchersEarned: passport.vouchers.length,
      vouchersUsed: passport.vouchers.filter(v => v.used).length,
      vouchersAvailable: passport.vouchers.filter(v => !v.used && (!v.expiresAt || v.expiresAt > new Date())).length,
      createdAt: passport.createdAt,
      lastActivity: passport.lastActivity
    };
  }
}

export default SecureRewardsSystem;
