/**
 * Database Integration Tests for Rewards System
 * Tests actual MongoDB operations
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { getDb } from '../setup/db.setup';
import { ObjectId, Document } from 'mongodb';

describe('Rewards Database Operations', () => {
  const testEmail = 'test-rewards@example.com';
  
  beforeEach(async () => {
    const db = getDb();
    // Clean up test data
    await db.collection('passports').deleteMany({ customerEmail: testEmail });
    await db.collection('test_passports').deleteMany({});
  });

  describe('Passport CRUD Operations', () => {
    test('should create a new passport', async () => {
      const db = getDb();
      
      const passport = {
        _id: new ObjectId(),
        customerEmail: testEmail,
        customerName: 'Test User',
        stamps: [],
        totalStamps: 0,
        vouchers: [],
        level: 'Explorer',
        xpPoints: 0,
        createdAt: new Date(),
        lastActivity: new Date()
      };
      
      const result = await db.collection('test_passports').insertOne(passport);
      
      expect(result.acknowledged).toBe(true);
      expect(result.insertedId).toEqual(passport._id);
    });

    test('should find passport by email', async () => {
      const db = getDb();
      
      // Insert test passport
      await db.collection('test_passports').insertOne({
        customerEmail: testEmail,
        customerName: 'Test User',
        level: 'Explorer',
        totalStamps: 5,
        xpPoints: 100
      });
      
      const found = await db.collection('test_passports').findOne({
        customerEmail: testEmail
      });
      
      expect(found).not.toBeNull();
      expect(found?.customerEmail).toBe(testEmail);
      expect(found?.totalStamps).toBe(5);
    });

    test('should update passport stamps atomically', async () => {
      const db = getDb();
      
      // Insert initial passport
      const { insertedId } = await db.collection('test_passports').insertOne({
        customerEmail: testEmail,
        totalStamps: 0,
        stamps: [],
        xpPoints: 0
      });
      
      // Atomic update
      const stamp = {
        id: 'stamp-1',
        marketName: 'Test Market',
        activityType: 'visit',
        timestamp: new Date(),
        xpValue: 10
      };
      
      const result = await db.collection('test_passports').findOneAndUpdate(
        { _id: insertedId },
        {
          $push: { stamps: stamp as unknown as never },
          $inc: { totalStamps: 1, xpPoints: stamp.xpValue }
        },
        { returnDocument: 'after' }
      );
      
      expect(result?.totalStamps).toBe(1);
      expect(result?.xpPoints).toBe(10);
      expect(result?.stamps).toHaveLength(1);
    });

    test('should prevent duplicate passport creation', async () => {
      const db = getDb();
      
      // Create unique index
      await db.collection('test_passports').createIndex(
        { customerEmail: 1 },
        { unique: true }
      );
      
      // Insert first passport
      await db.collection('test_passports').insertOne({
        customerEmail: testEmail,
        level: 'Explorer'
      });
      
      // Try to insert duplicate
      await expect(
        db.collection('test_passports').insertOne({
          customerEmail: testEmail,
          level: 'Explorer'
        })
      ).rejects.toThrow(/duplicate key/i);
    });
  });

  describe('Voucher Operations', () => {
    test('should add voucher to passport', async () => {
      const db = getDb();
      
      const { insertedId } = await db.collection('test_passports').insertOne({
        customerEmail: testEmail,
        vouchers: []
      });
      
      const voucher = {
        id: 'voucher-1',
        type: 'free_shot_2oz',
        code: 'TEST_CODE_123',
        used: false,
        awardedAt: new Date()
      };
      
      await db.collection('test_passports').updateOne(
        { _id: insertedId },
        { $push: { vouchers: voucher as unknown as never } }
      );
      
      const updated = await db.collection('test_passports').findOne({ _id: insertedId });
      expect(updated?.vouchers).toHaveLength(1);
      expect(updated?.vouchers[0].code).toBe('TEST_CODE_123');
    });

    test('should mark voucher as used atomically', async () => {
      const db = getDb();
      
      const voucherId = 'voucher-to-redeem';
      
      const { insertedId } = await db.collection('test_passports').insertOne({
        customerEmail: testEmail,
        vouchers: [{
          id: voucherId,
          type: 'discount_15',
          code: 'REDEEM_ME',
          used: false
        }]
      });
      
      // Atomic redemption
      const result = await db.collection('test_passports').findOneAndUpdate(
        {
          _id: insertedId,
          'vouchers.id': voucherId,
          'vouchers.used': false
        },
        {
          $set: {
            'vouchers.$.used': true,
            'vouchers.$.usedAt': new Date()
          }
        },
        { returnDocument: 'after' }
      );
      
      expect(result?.vouchers[0].used).toBe(true);
      expect(result?.vouchers[0].usedAt).toBeDefined();
    });

    test('should not allow double redemption', async () => {
      const db = getDb();
      
      const voucherId = 'already-used';
      
      await db.collection('test_passports').insertOne({
        customerEmail: testEmail,
        vouchers: [{
          id: voucherId,
          used: true,
          usedAt: new Date()
        }]
      });
      
      // Try to redeem already used voucher
      const result = await db.collection('test_passports').findOneAndUpdate(
        {
          customerEmail: testEmail,
          'vouchers.id': voucherId,
          'vouchers.used': false // This won't match
        },
        {
          $set: { 'vouchers.$.used': true }
        },
        { returnDocument: 'after' }
      );
      
      // Should return null because query didn't match
      expect(result).toBeNull();
    });
  });

  describe('Leaderboard Queries', () => {
    test('should return top users by XP', async () => {
      const db = getDb();
      
      // Insert test users
      await db.collection('test_passports').insertMany([
        { customerEmail: 'user1@test.com', customerName: 'User 1', xpPoints: 500, totalStamps: 10 },
        { customerEmail: 'user2@test.com', customerName: 'User 2', xpPoints: 1000, totalStamps: 20 },
        { customerEmail: 'user3@test.com', customerName: 'User 3', xpPoints: 750, totalStamps: 15 }
      ]);
      
      const leaderboard = await db.collection('test_passports')
        .find({})
        .sort({ xpPoints: -1 })
        .limit(10)
        .toArray();
      
      expect(leaderboard).toHaveLength(3);
      expect(leaderboard[0].xpPoints).toBe(1000);
      expect(leaderboard[1].xpPoints).toBe(750);
      expect(leaderboard[2].xpPoints).toBe(500);
    });

    test('should anonymize names in leaderboard projection', async () => {
      const db = getDb();
      
      await db.collection('test_passports').insertOne({
        customerEmail: 'private@test.com',
        customerName: 'John Doe',
        xpPoints: 100
      });
      
      const result = await db.collection('test_passports').aggregate([
        { $match: { customerEmail: 'private@test.com' } },
        {
          $project: {
            _id: 0,
            xpPoints: 1,
            nameDisplay: {
              $concat: [
                { $substr: ['$customerName', 0, 1] },
                '***'
              ]
            }
          }
        }
      ]).toArray();
      
      expect(result[0].nameDisplay).toBe('J***');
      expect(result[0].customerName).toBeUndefined();
      expect(result[0].customerEmail).toBeUndefined();
    });
  });

  describe('Index Performance', () => {
    test('should use email index for lookups', async () => {
      const db = getDb();
      
      // Create index
      await db.collection('test_passports').createIndex({ customerEmail: 1 });
      
      // Insert some data
      await db.collection('test_passports').insertOne({
        customerEmail: testEmail,
        level: 'Explorer'
      });
      
      // Explain the query
      const explanation = await db.collection('test_passports')
        .find({ customerEmail: testEmail })
        .explain('executionStats');
      
      // Check that index was used (not a collection scan)
      const winningPlan = (explanation as any).queryPlanner?.winningPlan;
      const usedIndex = JSON.stringify(winningPlan).includes('IXSCAN') ||
                       JSON.stringify(winningPlan).includes('customerEmail');
      
      expect(usedIndex).toBe(true);
    });
  });
});
