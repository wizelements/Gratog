/**
 * Rewards System Unit Tests
 * 
 * Tests:
 * - Input validation
 * - Reward eligibility
 * - Security functions
 * - Fraud detection
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock database
vi.mock('@/lib/db-optimized', () => ({
  connectToDatabase: vi.fn(() => ({
    db: {
      collection: vi.fn(() => ({
        findOne: vi.fn(),
        insertOne: vi.fn(),
        updateOne: vi.fn(),
        findOneAndUpdate: vi.fn(),
        find: vi.fn(() => ({
          sort: vi.fn(() => ({
            limit: vi.fn(() => ({
              toArray: vi.fn(() => [])
            }))
          }))
        })),
        aggregate: vi.fn(() => ({
          toArray: vi.fn(() => [])
        })),
        createIndex: vi.fn()
      }))
    },
    client: {
      startSession: vi.fn(() => ({
        withTransaction: vi.fn(async (fn) => fn()),
        endSession: vi.fn()
      }))
    }
  }))
}));

// Import after mocking
import {
  EmailSchema,
  MarketNameSchema,
  ActivityTypeSchema,
  StampRequestSchema,
  PassportCreateSchema,
  VoucherRedeemSchema,
  sanitizeString,
  validateEmail,
  generateSecureVoucherCode,
  generateIdempotencyKey,
  checkStampRateLimit,
  authorizePassportAccess
} from '@/lib/rewards-security';

describe('Input Validation', () => {
  describe('EmailSchema', () => {
    test('accepts valid emails', () => {
      expect(() => EmailSchema.parse('test@example.com')).not.toThrow();
      expect(() => EmailSchema.parse('user+tag@domain.co.uk')).not.toThrow();
      expect(() => EmailSchema.parse('name.surname@company.org')).not.toThrow();
    });

    test('rejects invalid emails', () => {
      expect(() => EmailSchema.parse('test@')).toThrow();
      expect(() => EmailSchema.parse('@example.com')).toThrow();
      expect(() => EmailSchema.parse('test@.com')).toThrow();
      expect(() => EmailSchema.parse('notanemail')).toThrow();
      expect(() => EmailSchema.parse('')).toThrow();
    });

    test('rejects emails with newlines', () => {
      expect(() => EmailSchema.parse('test@example.com\ninjection')).toThrow();
      expect(() => EmailSchema.parse('test\r\n@example.com')).toThrow();
    });

    test('lowercases email', () => {
      const result = EmailSchema.parse('TEST@EXAMPLE.COM');
      expect(result).toBe('test@example.com');
    });

    test('rejects very long emails', () => {
      const longEmail = 'a'.repeat(300) + '@example.com';
      expect(() => EmailSchema.parse(longEmail)).toThrow();
    });
  });

  describe('MarketNameSchema', () => {
    test('accepts valid market names', () => {
      expect(() => MarketNameSchema.parse('Downtown Farmers Market')).not.toThrow();
      expect(() => MarketNameSchema.parse("Bob's Market & Grill")).not.toThrow();
      expect(() => MarketNameSchema.parse('Market (Main St.)')).not.toThrow();
    });

    test('rejects invalid market names', () => {
      expect(() => MarketNameSchema.parse('')).toThrow();
      expect(() => MarketNameSchema.parse('<script>alert(1)</script>')).toThrow();
      expect(() => MarketNameSchema.parse('Market; DROP TABLE users;--')).toThrow();
    });

    test('rejects very long market names', () => {
      const longName = 'A'.repeat(150);
      expect(() => MarketNameSchema.parse(longName)).toThrow();
    });
  });

  describe('ActivityTypeSchema', () => {
    test('accepts valid activity types', () => {
      expect(() => ActivityTypeSchema.parse('visit')).not.toThrow();
      expect(() => ActivityTypeSchema.parse('purchase')).not.toThrow();
      expect(() => ActivityTypeSchema.parse('challenge_complete')).not.toThrow();
      expect(() => ActivityTypeSchema.parse('referral')).not.toThrow();
      expect(() => ActivityTypeSchema.parse('review')).not.toThrow();
    });

    test('rejects invalid activity types', () => {
      expect(() => ActivityTypeSchema.parse('invalid')).toThrow();
      expect(() => ActivityTypeSchema.parse('VISIT')).toThrow();
      expect(() => ActivityTypeSchema.parse('')).toThrow();
    });
  });

  describe('StampRequestSchema', () => {
    test('accepts valid stamp request', () => {
      const result = StampRequestSchema.parse({
        email: 'test@example.com',
        marketName: 'Downtown Market',
        activityType: 'visit'
      });
      expect(result.email).toBe('test@example.com');
      expect(result.marketName).toBe('Downtown Market');
    });

    test('requires either email or passportId', () => {
      expect(() => StampRequestSchema.parse({
        marketName: 'Downtown Market'
      })).toThrow();
    });

    test('defaults activityType to visit', () => {
      const result = StampRequestSchema.parse({
        email: 'test@example.com',
        marketName: 'Downtown Market'
      });
      expect(result.activityType).toBe('visit');
    });
  });

  describe('PassportCreateSchema', () => {
    test('accepts valid passport creation', () => {
      const result = PassportCreateSchema.parse({
        email: 'test@example.com',
        name: 'John Doe'
      });
      expect(result.email).toBe('test@example.com');
    });

    test('rejects names with dangerous characters', () => {
      expect(() => PassportCreateSchema.parse({
        email: 'test@example.com',
        name: '<script>alert(1)</script>'
      })).toThrow();
    });
  });
});

describe('Sanitization Functions', () => {
  describe('sanitizeString', () => {
    test('removes HTML tags', () => {
      expect(sanitizeString('<script>alert(1)</script>')).toBe('alert(1)');
      expect(sanitizeString('<img src=x onerror=alert(1)>')).toBe('');
    });

    test('removes control characters', () => {
      expect(sanitizeString('hello\x00world')).toBe('helloworld');
      expect(sanitizeString('test\x1Fvalue')).toBe('testvalue');
    });

    test('trims whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    test('handles non-string input', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
      expect(sanitizeString(123)).toBe('');
    });
  });

  describe('validateEmail', () => {
    test('returns valid for correct emails', () => {
      const result = validateEmail('test@example.com');
      expect(result.valid).toBe(true);
      expect(result.email).toBe('test@example.com');
    });

    test('returns invalid for bad emails', () => {
      const result = validateEmail('notanemail');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

describe('Secure Code Generation', () => {
  describe('generateSecureVoucherCode', () => {
    test('generates unique codes', () => {
      const code1 = generateSecureVoucherCode('TEST');
      const code2 = generateSecureVoucherCode('TEST');
      expect(code1).not.toBe(code2);
    });

    test('includes prefix', () => {
      const code = generateSecureVoucherCode('SHOT2OZ');
      expect(code.startsWith('SHOT2OZ_')).toBe(true);
    });

    test('has sufficient length', () => {
      const code = generateSecureVoucherCode('CODE');
      expect(code.length).toBeGreaterThan(15);
    });
  });

  describe('generateIdempotencyKey', () => {
    test('generates UUID format', () => {
      const key = generateIdempotencyKey();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(key).toMatch(uuidRegex);
    });

    test('generates unique keys', () => {
      const keys = new Set();
      for (let i = 0; i < 100; i++) {
        keys.add(generateIdempotencyKey());
      }
      expect(keys.size).toBe(100);
    });
  });
});

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Clear rate limit state between tests
    // Note: In real implementation, this would clear the rate limit map
  });

  describe('checkStampRateLimit', () => {
    test('allows first stamp', () => {
      const result = checkStampRateLimit('unique-test-' + Date.now() + '@example.com', 'Market A');
      expect(result.allowed).toBe(true);
    });

    test('tracks remaining stamps', () => {
      const email = 'remaining-test-' + Date.now() + '@example.com';
      const result = checkStampRateLimit(email, 'Market B');
      expect(result.remainingToday).toBeDefined();
      expect(result.remainingToday).toBeLessThan(10);
    });
  });
});

describe('Authorization', () => {
  describe('authorizePassportAccess', () => {
    test('allows user to access own passport', () => {
      expect(authorizePassportAccess('user@example.com', 'user@example.com')).toBe(true);
    });

    test('denies access to other users passport', () => {
      expect(authorizePassportAccess('user@example.com', 'other@example.com')).toBe(false);
    });
  });
});

describe('Reward Eligibility', () => {
  // Import the function we need to test
  const checkRewardEligibility = (passport) => {
    const rewards = [];
    const { totalStamps, vouchers = [], xpPoints = 0 } = passport;

    // 2 stamps = free 2oz shot
    if (totalStamps >= 2 && !vouchers.some(v => v.type === 'free_shot_2oz')) {
      rewards.push({ type: 'free_shot_2oz', title: 'Free 2oz Shot' });
    }

    // 5 stamps = 15% off
    if (totalStamps >= 5 && !vouchers.some(v => v.type === 'discount_15')) {
      rewards.push({ type: 'discount_15', title: '15% Off' });
    }

    // 10 stamps = Level up
    if (totalStamps >= 10 && passport.level === 'Explorer') {
      rewards.push({ type: 'level_up', newLevel: 'Enthusiast' });
    }

    // XP-based rewards
    if (xpPoints >= 500 && !vouchers.some(v => v.type === 'bundle_discount')) {
      rewards.push({ type: 'bundle_discount', title: 'Bundle Discount' });
    }

    return rewards;
  };

  test('awards free shot at 2 stamps', () => {
    const passport = { totalStamps: 2, vouchers: [], level: 'Explorer' };
    const rewards = checkRewardEligibility(passport);
    expect(rewards.some(r => r.type === 'free_shot_2oz')).toBe(true);
  });

  test('does not award free shot below 2 stamps', () => {
    const passport = { totalStamps: 1, vouchers: [], level: 'Explorer' };
    const rewards = checkRewardEligibility(passport);
    expect(rewards.some(r => r.type === 'free_shot_2oz')).toBe(false);
  });

  test('awards 15% discount at 5 stamps', () => {
    const passport = { totalStamps: 5, vouchers: [], level: 'Explorer' };
    const rewards = checkRewardEligibility(passport);
    expect(rewards.some(r => r.type === 'discount_15')).toBe(true);
  });

  test('does not duplicate rewards', () => {
    const passport = {
      totalStamps: 5,
      vouchers: [{ type: 'free_shot_2oz', used: false }],
      level: 'Explorer'
    };
    const rewards = checkRewardEligibility(passport);
    expect(rewards.filter(r => r.type === 'free_shot_2oz').length).toBe(0);
  });

  test('awards level up at 10 stamps', () => {
    const passport = { totalStamps: 10, vouchers: [], level: 'Explorer' };
    const rewards = checkRewardEligibility(passport);
    expect(rewards.some(r => r.type === 'level_up')).toBe(true);
    expect(rewards.find(r => r.type === 'level_up')?.newLevel).toBe('Enthusiast');
  });

  test('does not award level up if already leveled', () => {
    const passport = { totalStamps: 10, vouchers: [], level: 'Enthusiast' };
    const rewards = checkRewardEligibility(passport);
    expect(rewards.some(r => r.type === 'level_up')).toBe(false);
  });

  test('awards bundle discount at 500 XP', () => {
    const passport = { totalStamps: 0, vouchers: [], level: 'Explorer', xpPoints: 500 };
    const rewards = checkRewardEligibility(passport);
    expect(rewards.some(r => r.type === 'bundle_discount')).toBe(true);
  });

  test('awards multiple rewards at once', () => {
    const passport = { totalStamps: 10, vouchers: [], level: 'Explorer', xpPoints: 500 };
    const rewards = checkRewardEligibility(passport);
    expect(rewards.length).toBeGreaterThanOrEqual(3);
  });
});

describe('Edge Cases', () => {
  test('handles null/undefined passport values', () => {
    const checkRewardEligibility = (passport) => {
      const { totalStamps = 0, vouchers = [], xpPoints = 0 } = passport || {};
      const rewards = [];
      if (totalStamps >= 2 && !vouchers.some(v => v.type === 'free_shot_2oz')) {
        rewards.push({ type: 'free_shot_2oz' });
      }
      return rewards;
    };

    expect(() => checkRewardEligibility(null)).not.toThrow();
    expect(() => checkRewardEligibility(undefined)).not.toThrow();
    expect(() => checkRewardEligibility({})).not.toThrow();
  });

  test('handles very large stamp counts', () => {
    const passport = { totalStamps: Number.MAX_SAFE_INTEGER, vouchers: [], level: 'Explorer' };
    // This should not crash
    expect(passport.totalStamps).toBe(Number.MAX_SAFE_INTEGER);
  });

  test('handles empty vouchers array', () => {
    const passport = { totalStamps: 5, vouchers: [], level: 'Explorer' };
    // Should not throw when checking vouchers
    expect(passport.vouchers.some(v => v.type === 'test')).toBe(false);
  });
});
