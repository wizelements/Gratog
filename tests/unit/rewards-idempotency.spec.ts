import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Unit tests for reward-points idempotency.
 *
 * The contract: addPoints(email, points, type, { orderId }) is keyed by
 * (email, orderId, type). A second call with the same triple is a no-op
 * and returns `{ duplicate: true }` instead of double-incrementing points.
 *
 * This protects against duplicate Square callbacks, browser refresh,
 * webhook retries, and double-click submissions.
 */

interface RewardTxn {
  email: string;
  orderId: string | null;
  type: string;
  points: number;
}
interface Passport {
  email: string;
  points: number;
  totalPointsEarned: number;
  activities: any[];
}

let rewardTxns: RewardTxn[] = [];
let passports: Passport[] = [];

vi.mock('@/lib/db-optimized', () => ({
  connectToDatabase: async () => ({
    db: {
      collection: (name: string) => {
        if (name === 'reward_transactions') {
          return {
            findOne: async (q: any) =>
              rewardTxns.find(
                (r) =>
                  r.email === q.email &&
                  r.orderId === q.orderId &&
                  r.type === q.type
              ) || null,
            insertOne: async (doc: any) => {
              const dup = rewardTxns.find(
                (r) =>
                  r.email === doc.email &&
                  r.orderId === doc.orderId &&
                  r.type === doc.type
              );
              if (dup) {
                const err: any = new Error('E11000 duplicate key');
                err.code = 11000;
                throw err;
              }
              rewardTxns.push(doc);
              return { insertedId: doc.transactionId };
            },
          };
        }
        if (name === 'customer_passports') {
          return {
            findOneAndUpdate: async (q: any, update: any) => {
              let p = passports.find((x) => x.email === q.email);
              if (!p) {
                p = { email: q.email, points: 0, totalPointsEarned: 0, activities: [] };
                passports.push(p);
              }
              p.points += update.$inc?.points || 0;
              p.totalPointsEarned += update.$inc?.totalPointsEarned || 0;
              if (update.$push?.activities) {
                p.activities.push(update.$push.activities);
              }
              return { value: p };
            },
          };
        }
        return { findOne: async () => null };
      },
    },
  }),
}));

// Mock logger to silence output.
vi.mock('@/lib/logger', () => ({ logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} } }));

// Mock rewards-security to avoid pulling auth deps.
vi.mock('@/lib/rewards-security', () => ({}));

// EnhancedRewards uses Mongo direct via `connectToDatabase`. Import only after
// mocks are installed.
import { rewardsSystem } from '../../lib/enhanced-rewards.js';

beforeEach(() => {
  rewardTxns = [];
  passports = [];
  // Force re-initialize the singleton so it re-grabs our mocked db.
  // @ts-ignore — private field reset
  rewardsSystem.db = null;
  // @ts-ignore
  rewardsSystem.isInitialized = false;
});

describe('rewardsSystem.addPoints — idempotency', () => {
  it('first call awards points and writes a ledger row', async () => {
    const res = await rewardsSystem.addPoints(
      'a@example.com',
      10,
      'purchase',
      { orderId: 'ORDER_1' }
    );
    expect(res.success).toBe(true);
    expect(res.duplicate).toBeFalsy();
    expect(rewardTxns).toHaveLength(1);
    expect(passports[0].points).toBe(10);
  });

  it('duplicate call (same email, orderId, type) returns duplicate=true and does NOT double-award', async () => {
    await rewardsSystem.addPoints('a@example.com', 10, 'purchase', { orderId: 'ORDER_1' });
    const dup = await rewardsSystem.addPoints('a@example.com', 10, 'purchase', { orderId: 'ORDER_1' });
    expect(dup.duplicate).toBe(true);
    expect(rewardTxns).toHaveLength(1);
    expect(passports[0].points).toBe(10); // not 20
  });

  it('different orderId awards separately', async () => {
    await rewardsSystem.addPoints('a@example.com', 10, 'purchase', { orderId: 'ORDER_1' });
    await rewardsSystem.addPoints('a@example.com', 7, 'purchase', { orderId: 'ORDER_2' });
    expect(rewardTxns).toHaveLength(2);
    expect(passports[0].points).toBe(17);
  });

  it('different activity type for same order awards separately', async () => {
    await rewardsSystem.addPoints('a@example.com', 10, 'purchase', { orderId: 'ORDER_1' });
    await rewardsSystem.addPoints('a@example.com', 5, 'referral_bonus', { orderId: 'ORDER_1' });
    expect(rewardTxns).toHaveLength(2);
    expect(passports[0].points).toBe(15);
  });
});
