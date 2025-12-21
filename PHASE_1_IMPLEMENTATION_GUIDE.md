# Phase 1 Implementation Guide

**Status:** READY TO IMPLEMENT  
**Estimated Time:** 16-20 hours (spread over 1-2 weeks)  
**Files Created:** 3 new security modules ready for integration

---

## QUICK START

### What's Been Created
1. **`/lib/rewards-security.js`** - Security module with:
   - Input validation schemas (Zod)
   - Authentication & authorization helpers
   - CSRF protection
   - Rate limiting
   - Secure code generation
   - Input sanitization

2. **`/lib/rewards-secure.js`** - Secure rewards library with:
   - MongoDB transactions (ACID)
   - Idempotency keys (prevent duplicates)
   - Race condition prevention
   - Secure voucher codes
   - PII masking

3. **`/app/api/rewards/stamp/secure/route.js`** - Reference implementation:
   - Authentication required
   - Input validation
   - Rate limiting
   - Transaction-safe stamp addition
   - Secure response format

---

## IMPLEMENTATION STEPS

### Step 1: Verify Dependencies (30 minutes)

Check that required packages are installed:

```bash
npm list zod next-auth mongodb
```

If missing, install:
```bash
npm install zod next-auth mongodb
```

### Step 2: Set Up Environment Variables (15 minutes)

Add to `.env.local`:

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate-random-secret>

# Rewards system
NEXT_PUBLIC_REWARDS_ENABLED=true
REWARDS_RATE_LIMIT_STAMPS_PER_HOUR=10
REWARDS_RATE_LIMIT_PER_MARKET=2

# CSRF protection
CSRF_ENABLED=true

# Allowed origins (for CORS)
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### Step 3: Enable Database Indexes (15 minutes)

Create a migration script:

```javascript
// scripts/initialize-rewards-indexes.js
import SecureRewardsSystem from '../lib/rewards-secure.js';

async function main() {
  console.log('Creating database indexes...');
  await SecureRewardsSystem.initializeIndexes();
  console.log('✓ Indexes created successfully');
}

main().catch(console.error);
```

Run it:
```bash
node scripts/initialize-rewards-indexes.js
```

### Step 4: Update Stamp Endpoint (1-2 hours)

**Option A: Create new endpoint** (recommended for gradual rollout)
```
/api/rewards/stamp → Old endpoint (deprecate after 30 days)
/api/rewards/stamp/secure → New endpoint (with all security fixes)
```

**Option B: Replace existing endpoint**
Replace `/app/api/rewards/stamp/route.js` with secure version

We've created **`/app/api/rewards/stamp/secure/route.js`** as reference.

### Step 5: Update Client Code (2-3 hours)

Update components that call stamp endpoint:

```javascript
// OLD
const response = await fetch('/api/rewards/stamp', {
  method: 'POST',
  body: JSON.stringify({ email: 'user@example.com', marketName: 'Market1' })
});

// NEW (with authentication)
const response = await fetch('/api/rewards/stamp/secure', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com', // or omit if using passportId
    marketName: 'Market1',
    activityType: 'visit',
    idempotencyKey: generateUUID() // For duplicate prevention
  })
});

if (response.status === 401) {
  // Redirect to login
  window.location.href = '/login';
}

const data = await response.json();
```

### Step 6: Update Leaderboard Endpoint (1 hour)

```javascript
// /app/api/rewards/leaderboard/route.js
import SecureRewardsSystem from '@/lib/rewards-secure';
import { createSecureResponse } from '@/lib/rewards-security';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 10;

    // Use secure method with PII masking
    const leaderboard = await SecureRewardsSystem.getLeaderboard(limit);

    return createSecureResponse({
      success: true,
      leaderboard,
      limit
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return createSecureResponse(
      { success: false, error: 'Failed to fetch leaderboard' },
      500
    );
  }
}
```

### Step 7: Update Passport Endpoint (1 hour)

```javascript
// /app/api/rewards/passport/route.js
import { NextResponse } from 'next/server';
import SecureRewardsSystem from '@/lib/rewards-secure';
import {
  verifyRequestAuthentication,
  PassportCreateSchema,
  validateRequest,
  createErrorResponse,
  createSecureResponse
} from '@/lib/rewards-security';

export async function POST(request) {
  try {
    // Authentication required
    const auth = await verifyRequestAuthentication(request);
    if (!auth.authenticated) {
      return createErrorResponse('Unauthorized', 401);
    }

    const body = await request.json();

    // Validate input
    const validation = validateRequest(body, PassportCreateSchema);
    if (!validation.valid) {
      return createErrorResponse('Invalid request', 400);
    }

    const { email, name } = validation.data;

    // Create passport with transaction safety
    const passport = await SecureRewardsSystem.createPassport(email, name);

    return createSecureResponse({
      success: true,
      passport: {
        totalStamps: passport.totalStamps,
        xpPoints: passport.xpPoints,
        level: passport.level
      }
    });
  } catch (error) {
    console.error('Passport creation error:', error);
    return createErrorResponse('Failed to create passport', 500, error);
  }
}

export async function GET(request) {
  try {
    const auth = await verifyRequestAuthentication(request);
    if (!auth.authenticated) {
      return createErrorResponse('Unauthorized', 401);
    }

    const passport = await SecureRewardsSystem.getPassportByEmail(auth.userEmail);

    if (!passport) {
      return createErrorResponse('Passport not found', 404);
    }

    return createSecureResponse({
      success: true,
      passport: {
        totalStamps: passport.totalStamps,
        xpPoints: passport.xpPoints,
        level: passport.level
      }
    });
  } catch (error) {
    console.error('Get passport error:', error);
    return createErrorResponse('Internal server error', 500, error);
  }
}
```

### Step 8: Update Redeem Endpoint (1 hour)

```javascript
// /app/api/rewards/redeem/route.js
import SecureRewardsSystem from '@/lib/rewards-secure';
import {
  verifyRequestAuthentication,
  VoucherRedeemSchema,
  validateRequest,
  createErrorResponse,
  createSecureResponse
} from '@/lib/rewards-security';
import { ObjectId } from 'mongodb';

export async function POST(request) {
  try {
    // Authentication required
    const auth = await verifyRequestAuthentication(request);
    if (!auth.authenticated) {
      return createErrorResponse('Unauthorized', 401);
    }

    const body = await request.json();

    // Validate input
    const validation = validateRequest(body, VoucherRedeemSchema);
    if (!validation.valid) {
      return createErrorResponse('Invalid request', 400);
    }

    const { voucherId, orderId } = validation.data;

    // Get passport for user
    const passport = await SecureRewardsSystem.getPassportByEmail(auth.userEmail);
    if (!passport) {
      return createErrorResponse('Passport not found', 404);
    }

    // Redeem voucher (with transaction safety)
    const result = await SecureRewardsSystem.redeemVoucher(
      passport._id.toString(),
      voucherId,
      orderId
    );

    return createSecureResponse({
      success: true,
      message: 'Voucher redeemed successfully',
      voucher: {
        code: result.voucher.code,
        type: result.voucher.type,
        value: result.voucher.discountPercent || result.voucher.value,
        usedAt: result.voucher.usedAt
      }
    });
  } catch (error) {
    console.error('Redeem error:', error);
    const status = error.message.includes('already used') ? 400 : 500;
    return createErrorResponse(
      error.message || 'Failed to redeem voucher',
      status,
      error
    );
  }
}
```

### Step 9: Update Frontend Storage (2-3 hours)

Replace `localStorage` usage with secure session storage:

**Before:**
```javascript
// /stores/rewards.ts
localStorage.setItem('rewards_v1', JSON.stringify(state));
```

**After:**
```javascript
// /stores/rewards-secure.ts
import { SecureStorage } from '@/lib/secure-storage';

const secureStorage = new SecureStorage();

// Use sessionStorage with expiration
await secureStorage.set('rewards', state, 1800000); // 30 min TTL

// Never persist referral codes or sensitive data
// Instead, fetch from server on page load
```

Create `/lib/secure-storage.ts`:

```typescript
/**
 * Secure client-side storage using sessionStorage
 * - Auto-expires after TTL
 * - Uses sessionStorage (not persistent)
 * - No sensitive data stored
 */

export class SecureStorage {
  private prefix = 'secure_';
  private ttlKey = '_expires';

  async set(key: string, value: any, ttl = 1800000): Promise<void> {
    try {
      const item = {
        data: value,
        expires: Date.now() + ttl
      };
      sessionStorage.setItem(
        this.prefix + key,
        JSON.stringify(item)
      );
    } catch (e) {
      console.error('Storage error:', e);
    }
  }

  async get(key: string): Promise<any | null> {
    try {
      const item = sessionStorage.getItem(this.prefix + key);
      if (!item) return null;

      const parsed = JSON.parse(item);
      if (Date.now() > parsed.expires) {
        sessionStorage.removeItem(this.prefix + key);
        return null;
      }

      return parsed.data;
    } catch (e) {
      console.error('Storage error:', e);
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    sessionStorage.removeItem(this.prefix + key);
  }

  clear(): void {
    const keys = Object.keys(sessionStorage);
    keys
      .filter(k => k.startsWith(this.prefix))
      .forEach(k => sessionStorage.removeItem(k));
  }
}
```

---

## TESTING CHECKLIST

### Unit Tests

```bash
# Test input validation
npm test -- rewards-security.test.js

# Test secure rewards system
npm test -- rewards-secure.test.js
```

Create test file: `/lib/__tests__/rewards-security.test.js`

```javascript
import { validateEmail, StampRequestSchema, validateRequest } from '@/lib/rewards-security';

describe('Input Validation', () => {
  test('accepts valid email', () => {
    const result = validateEmail('user@example.com');
    expect(result.valid).toBe(true);
  });

  test('rejects invalid email', () => {
    const result = validateEmail('not-an-email');
    expect(result.valid).toBe(false);
  });

  test('rejects NoSQL injection attempts', () => {
    const data = {
      email: 'user@example.com',
      marketName: 'Test',
      activityType: { $ne: '' } // NoSQL injection
    };
    const result = validateRequest(data, StampRequestSchema);
    expect(result.valid).toBe(false);
  });

  test('rejects XSS attempts', () => {
    const data = {
      email: 'user@example.com',
      marketName: '<script>alert("xss")</script>'
    };
    const result = validateRequest(data, StampRequestSchema);
    expect(result.valid).toBe(false);
  });
});
```

### Integration Tests

```bash
npm run test:integration
```

Test scenarios:
1. ✓ Authentication required
2. ✓ Concurrent stamps don't duplicate rewards
3. ✓ Idempotency prevents duplicate processing
4. ✓ Rate limiting blocks rapid requests
5. ✓ Vouchers expire correctly
6. ✓ PII not exposed in responses

### Security Tests

```bash
# Test with OWASP ZAP or similar
npm run security:test

# Manual tests:
# 1. Try accessing without authentication
curl -X POST http://localhost:3000/api/rewards/stamp \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","marketName":"Test"}'
# Expected: 401 Unauthorized

# 2. Try modifying other user's passport
# Expected: 403 Forbidden

# 3. Try NoSQL injection
curl -X POST http://localhost:3000/api/rewards/stamp/secure \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","marketName":"Test","activityType":{"$ne":""}}'
# Expected: 400 Validation failed
```

### Performance Tests

```bash
# Load test: 100 concurrent stamp requests
npm run test:load -- --users 100 --duration 60s

# Expected:
# - Leaderboard query < 500ms with 10k users
# - Stamp endpoint < 300ms
# - No duplicate rewards despite concurrency
```

---

## DEPLOYMENT PLAN

### Week 1: Core Security

- [ ] Day 1: Set up environment variables
- [ ] Day 1-2: Install dependencies, create database indexes
- [ ] Day 2-3: Implement authentication middleware
- [ ] Day 3: Write and run unit tests

### Week 2: API Updates

- [ ] Day 1: Update stamp endpoint
- [ ] Day 1: Update leaderboard endpoint
- [ ] Day 2: Update passport endpoint
- [ ] Day 2: Update redeem endpoint
- [ ] Day 2-3: Frontend code updates
- [ ] Day 3: Integration testing

### Week 3: Rollout & Monitoring

- [ ] Day 1: Deploy to staging
- [ ] Day 1-2: Run security audit (OWASP)
- [ ] Day 2: Deploy to production with feature flag
- [ ] Day 3: Monitor error rates and performance
- [ ] Week 4: 30-day deprecation notice for old endpoints

---

## FEATURE FLAGS

Use feature flags to roll out gradually:

```javascript
// In your feature flag provider (e.g., LaunchDarkly, Vercel)
const useSecureRewards = flagProvider.isEnabled('secure-rewards-v1', {
  userId: userEmail
});

// Use old or new endpoint based on flag
const endpoint = useSecureRewards
  ? '/api/rewards/stamp/secure'
  : '/api/rewards/stamp';
```

Rollout schedule:
- **Day 1:** 1% of users → catch critical issues
- **Day 2-3:** 10% of users → identify edge cases
- **Week 1:** 50% of users → performance monitoring
- **Week 2:** 100% of users → full migration

---

## ROLLBACK PLAN

If critical issue discovered:

```bash
# Immediately switch feature flag to 0%
flagProvider.setEnabled('secure-rewards-v1', 0);

# Users revert to old endpoint
# Analyze issues, fix, and redeploy
```

---

## MONITORING & ALERTS

Set up alerts for:

1. **Authentication failures** (rate > 5/min)
2. **Validation errors** (rate > 10/min)
3. **API errors** (rate > 1%)
4. **Slow queries** (p95 > 1s)
5. **Rate limit hits** (normal behavior, monitor trends)
6. **Duplicate stamps** (should be 0)

Example Sentry alert:

```javascript
import * as Sentry from "@sentry/nextjs";

// In error handling
if (error.type === 'DUPLICATE_STAMP') {
  Sentry.captureException(error, {
    level: 'critical',
    tags: { rewards: 'duplicate' }
  });
}
```

---

## SUCCESS CRITERIA

After Phase 1 implementation, verify:

- [ ] All endpoints require authentication
- [ ] Input validation rejects injection attempts
- [ ] No PII in public responses
- [ ] Concurrent stamps never create duplicate rewards
- [ ] Voucher codes are cryptographically secure
- [ ] leaderboard query < 500ms with 10k users
- [ ] Zero critical security issues in OWASP scan
- [ ] GDPR compliance verified

---

## ESTIMATED EFFORT

| Task | Hours | Owner |
|------|-------|-------|
| Environment setup | 0.5 | DevOps |
| Database indexes | 0.5 | Backend |
| Unit tests | 3 | Backend |
| Endpoint updates | 4 | Backend |
| Frontend updates | 3 | Frontend |
| Integration tests | 2 | QA |
| Security audit | 2 | Security |
| Staging deployment | 1 | DevOps |
| Monitoring setup | 1 | DevOps |
| **TOTAL** | **17** | |

---

## NEXT STEPS

1. Review this guide with the team
2. Create GitHub issues for each task
3. Set sprint/timeline
4. Start with environment setup
5. Proceed through implementation steps in order

All code modules are ready to use - just needs integration and testing!

