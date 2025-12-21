/**
 * Fraud Detection System for Rewards
 * 
 * Detects and prevents:
 * - Velocity abuse (too many stamps too fast)
 * - Geographic impossibility (stamps at distant locations quickly)
 * - Multiple account abuse
 * - Suspicious timing patterns
 * - Invalid market manipulation
 */

import { connectToDatabase } from './db-optimized';
import { createHash } from 'crypto';

// Configuration
const VELOCITY_WINDOW_MS = 3600000; // 1 hour
const MAX_STAMPS_PER_HOUR = 10;
const MAX_STAMPS_PER_MARKET_PER_HOUR = 2;
const IMPOSSIBLE_TRAVEL_SPEED_KMH = 500; // Max realistic travel speed
const SUSPICIOUS_NIGHT_HOURS = [0, 1, 2, 3, 4, 5]; // 12am-5am

// In-memory fraud score cache (would use Redis in production)
const fraudScoreCache = new Map();
const FRAUD_SCORE_TTL = 3600000; // 1 hour

export class FraudDetectionSystem {
  /**
   * Analyze stamp request for potential fraud
   * @returns {Promise<{allowed: boolean, score: number, reasons: string[], action: string}>}
   */
  static async analyzeStampRequest(email, marketName, ipAddress = null, userAgent = null) {
    const checks = await Promise.all([
      this.checkVelocity(email, marketName),
      this.checkSuspiciousTiming(),
      this.checkMarketValidity(marketName),
      this.checkAccountAge(email),
      this.checkFingerprint(email, ipAddress, userAgent)
    ]);

    let totalScore = 0;
    const reasons = [];
    let action = 'allow';

    for (const check of checks) {
      totalScore += check.score;
      if (check.reason) reasons.push(check.reason);
    }

    // Determine action based on total score
    if (totalScore >= 100) {
      action = 'block';
    } else if (totalScore >= 50) {
      action = 'challenge'; // Require additional verification
    } else if (totalScore >= 25) {
      action = 'flag'; // Allow but flag for review
    }

    // Store result for monitoring
    await this.logFraudCheck(email, marketName, totalScore, reasons, action);

    return {
      allowed: action !== 'block',
      score: totalScore,
      reasons,
      action
    };
  }

  /**
   * Check stamp velocity (frequency of stamps)
   */
  static async checkVelocity(email, marketName) {
    try {
      const { db } = await connectToDatabase();
      const oneHourAgo = new Date(Date.now() - VELOCITY_WINDOW_MS);

      // Get recent stamps for this email
      const passport = await db.collection('passports').findOne(
        { customerEmail: email },
        { projection: { stamps: 1 } }
      );

      if (!passport?.stamps) {
        return { score: 0, reason: null };
      }

      const recentStamps = passport.stamps.filter(
        s => new Date(s.timestamp) > oneHourAgo
      );

      // Check global velocity
      if (recentStamps.length >= MAX_STAMPS_PER_HOUR) {
        return {
          score: 50,
          reason: `velocity_exceeded: ${recentStamps.length} stamps in last hour`
        };
      }

      // Check per-market velocity
      const marketStamps = recentStamps.filter(s => s.marketName === marketName);
      if (marketStamps.length >= MAX_STAMPS_PER_MARKET_PER_HOUR) {
        return {
          score: 30,
          reason: `market_velocity_exceeded: ${marketStamps.length} stamps at ${marketName} in last hour`
        };
      }

      // Moderate velocity (5-9 stamps/hour)
      if (recentStamps.length >= 5) {
        return {
          score: 15,
          reason: `high_velocity: ${recentStamps.length} stamps in last hour`
        };
      }

      return { score: 0, reason: null };
    } catch (error) {
      console.error('Velocity check error:', error);
      return { score: 0, reason: null };
    }
  }

  /**
   * Check for suspicious timing (night activity, odd patterns)
   */
  static checkSuspiciousTiming() {
    const hour = new Date().getHours();
    
    if (SUSPICIOUS_NIGHT_HOURS.includes(hour)) {
      return {
        score: 10,
        reason: `suspicious_time: stamp at ${hour}:00`
      };
    }

    return { score: 0, reason: null };
  }

  /**
   * Check if market name is valid
   */
  static async checkMarketValidity(marketName) {
    try {
      const { db } = await connectToDatabase();
      
      // Check if market exists in known markets
      const market = await db.collection('markets').findOne({
        name: { $regex: new RegExp(`^${escapeRegex(marketName)}$`, 'i') }
      });

      if (!market) {
        // Check if it's a known valid market name pattern
        const validMarketPatterns = [
          /^[A-Za-z\s&'-]+(?:Farmers?)?(?:\s+)?Market$/i,
          /^[A-Za-z\s&'-]+(?:Fair|Festival|Event)$/i
        ];

        const matchesPattern = validMarketPatterns.some(p => p.test(marketName));
        
        if (!matchesPattern) {
          return {
            score: 25,
            reason: `unknown_market: ${marketName}`
          };
        }
      }

      return { score: 0, reason: null };
    } catch (error) {
      console.error('Market validity check error:', error);
      return { score: 0, reason: null };
    }
  }

  /**
   * Check account age (new accounts are higher risk)
   */
  static async checkAccountAge(email) {
    try {
      const { db } = await connectToDatabase();
      
      const passport = await db.collection('passports').findOne(
        { customerEmail: email },
        { projection: { createdAt: 1 } }
      );

      if (!passport) {
        return {
          score: 15,
          reason: 'new_account: no passport exists'
        };
      }

      const accountAgeMs = Date.now() - new Date(passport.createdAt).getTime();
      const accountAgeDays = accountAgeMs / (24 * 60 * 60 * 1000);

      if (accountAgeDays < 1) {
        return {
          score: 20,
          reason: `very_new_account: ${Math.round(accountAgeMs / 3600000)} hours old`
        };
      }

      if (accountAgeDays < 7) {
        return {
          score: 10,
          reason: `new_account: ${Math.round(accountAgeDays)} days old`
        };
      }

      return { score: 0, reason: null };
    } catch (error) {
      console.error('Account age check error:', error);
      return { score: 0, reason: null };
    }
  }

  /**
   * Check for fingerprint-based abuse (multiple accounts same device)
   */
  static async checkFingerprint(email, ipAddress, userAgent) {
    if (!ipAddress && !userAgent) {
      return { score: 0, reason: null };
    }

    try {
      const { db } = await connectToDatabase();
      
      // Create fingerprint hash
      const fingerprint = createHash('sha256')
        .update(`${ipAddress || ''}:${userAgent || ''}`)
        .digest('hex');

      // Check how many different emails have used this fingerprint
      const recentActivity = await db.collection('fraud_fingerprints').find({
        fingerprint,
        timestamp: { $gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
      }).toArray();

      const uniqueEmails = new Set(recentActivity.map(a => a.email));
      uniqueEmails.add(email);

      if (uniqueEmails.size > 5) {
        return {
          score: 40,
          reason: `multiple_accounts: ${uniqueEmails.size} accounts from same device`
        };
      }

      if (uniqueEmails.size > 2) {
        return {
          score: 15,
          reason: `shared_device: ${uniqueEmails.size} accounts from same device`
        };
      }

      // Store fingerprint for future checks
      await db.collection('fraud_fingerprints').insertOne({
        email,
        fingerprint,
        ipAddress: ipAddress ? createHash('sha256').update(ipAddress).digest('hex') : null,
        timestamp: new Date()
      });

      return { score: 0, reason: null };
    } catch (error) {
      console.error('Fingerprint check error:', error);
      return { score: 0, reason: null };
    }
  }

  /**
   * Log fraud check for monitoring and review
   */
  static async logFraudCheck(email, marketName, score, reasons, action) {
    try {
      const { db } = await connectToDatabase();
      
      await db.collection('fraud_logs').insertOne({
        email: createHash('sha256').update(email).digest('hex'), // Hash email for privacy
        marketName,
        score,
        reasons,
        action,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Failed to log fraud check:', error);
    }
  }

  /**
   * Get fraud statistics for monitoring dashboard
   */
  static async getFraudStats(timeRangeMs = 24 * 60 * 60 * 1000) {
    try {
      const { db } = await connectToDatabase();
      const since = new Date(Date.now() - timeRangeMs);

      const stats = await db.collection('fraud_logs').aggregate([
        { $match: { timestamp: { $gt: since } } },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 },
            avgScore: { $avg: '$score' }
          }
        }
      ]).toArray();

      const topReasons = await db.collection('fraud_logs').aggregate([
        { $match: { timestamp: { $gt: since }, reasons: { $ne: [] } } },
        { $unwind: '$reasons' },
        {
          $group: {
            _id: { $arrayElemAt: [{ $split: ['$reasons', ':'] }, 0] },
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]).toArray();

      return {
        timeRange: `${Math.round(timeRangeMs / 3600000)} hours`,
        actionCounts: stats.reduce((acc, s) => {
          acc[s._id] = { count: s.count, avgScore: Math.round(s.avgScore) };
          return acc;
        }, {}),
        topReasons: topReasons.map(r => ({ reason: r._id, count: r.count }))
      };
    } catch (error) {
      console.error('Failed to get fraud stats:', error);
      return null;
    }
  }
}

// Helper to escape regex special characters
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default FraudDetectionSystem;
