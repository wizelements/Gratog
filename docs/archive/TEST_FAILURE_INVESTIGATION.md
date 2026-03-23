# Test Failure Investigation - Detailed Analysis

## Current Status

**Date:** December 20, 2025  
**Server Status:** Running ✅ (localhost:3000)  
**Test Execution:** In progress

### Test Summary

```
Test Files:  2 failed | 1 passed (3)
Tests:       12 failed | 60 passed (72)
```

---

## Root Cause Analysis

### Issue #1: Square SDK Type Mismatch ✅ FIXED

**Problem:** The Square SDK v43.2.0 requires `amountMoney.amount` to be a `BigInt`, but our API was passing a plain `number`.

**Error:**
```
Payment API error: Error: amountMoney -> amount: Expected bigint. Received 5000.
```

**Fix Applied:** 
```typescript
// Before
amountMoney: {
  amount: amountCents,  // number
  currency
}

// After  
amountMoney: {
  amount: BigInt(amountCents),  // bigint
  currency
}
```

**File:** `/workspaces/Gratog/app/api/payments/route.ts` (line 117)

---

### Issue #2: Invalid Test Source ID ❌ NEEDS FIX

**Problem:** Tests use `cnp:card-nonce-ok` which is not a valid Square payment source ID.

**Current Error:**
```
Payment API error: Status code: 400
{
  "code": "BAD_REQUEST",
  "detail": "Invalid source_id cnp:card-nonce-ok",
  "category": "INVALID_REQUEST_ERROR"
}
```

**Root Cause:** The test constant references an old Square nonce format that no longer works with the current SDK.

**Options to Fix:**
1. Use actual Web Payments SDK tokens
2. Mock the Square SDK for tests
3. Use Square's test payment tokens (requires updating test setup)

---

## Test Files Analysis

### File 1: `tests/api/square-payment-flow.spec.ts` (70 tests)

**Status:** 12 failed, 60 passed

**Failed Tests (12):**
1. ❌ should accept customer details (200 expected, 500 received)
2. ❌ should support large amounts (200 expected, 500 received)
3. ❌ should handle metadata (200 expected, 500 received)
4. ❌ should not timeout on legitimate requests (200 expected, 500 received)
5. ❌ should retrieve payment status (TypeError: cannot read 'id' of undefined)
6. ❌ should handle multiple line items (400/500 mismatch)
7. ❌ should accept custom redirect URL (400/500 mismatch)
8. ❌ should handle missing Square credentials (503/500 mismatch)
9. ❌ should process admin-initiated order payment (200 expected, 500 received)
10. + 3 more in comprehensive tests

**Passed Tests (60):** ✅
- Request validation tests
- Edge case tests  
- Field requirement tests
- Type validation tests
- etc.

### File 2: `tests/api/square-comprehensive.spec.ts`

**Status:** Not yet executed (skipped due to previous failures)

---

## Failing Test Details

### Test: "should accept customer details"

```typescript
// Line 191-203
const response = await fetch(`${BASE_URL}/api/payments`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sourceId: SQUARE_TEST_CARD,  // <-- INVALID
    amountCents: 5000,
    customer: { /* ... */ }
  })
});

expect(response.status).toBe(200);  // Fails: gets 500
```

**Why it fails:**
- Uses `cnp:card-nonce-ok` as sourceId
- Square API rejects this as invalid
- API returns 500 error

---

## Solutions

### Solution A: Mock Square SDK (Recommended)

Create a test helper that mocks the Square client:

```typescript
// tests/api/setup.ts
import { vitest } from 'vitest';

export function mockSquarePayments() {
  return vitest.fn().mockResolvedValue({
    payment: {
      id: 'test_payment_123',
      status: 'COMPLETED',
      amountMoney: { amount: 5000n, currency: 'USD' },
      cardDetails: { card: { last4: '1111' } },
      receiptUrl: 'https://example.com/receipt'
    }
  });
}
```

### Solution B: Use Square Test Tokens

Get actual test tokens from Square Dashboard:
- Create test payment method in Square Dashboard
- Use returned token in tests
- Requires Square account access

### Solution C: Skip Integration Tests

Mark API tests as integration tests that require real Square credentials:

```typescript
it.skip('requires real Square credentials', () => {
  // Only run in staging/production with real creds
});
```

---

## Implementation Plan

### Immediate (Next 30 min)

1. ✅ Fix BigInt issue in payments API
2. ⏳ Add API error handler for Square 400 errors  
3. ⏳ Create mock setup for tests

### Short-term (Next 2 hours)

1. Update test assertions to handle 400 errors properly
2. Document required environment for test execution
3. Create test setup file with mocks

### Long-term (Next sprint)

1. Create test database fixtures
2. Add API contract tests
3. Set up CI with test Square account

---

## Next Steps

### For continued investigation:

1. Check if Square test token format has changed
2. Look for Square SDK documentation on test tokens
3. Review .env configuration for test mode
4. Check if API should handle 400 errors gracefully

### Commands to continue:

```bash
# Check server logs for errors
tail -f /tmp/server.log

# Run specific test
npm run test:api -- tests/api/square-payment-flow.spec.ts

# Kill server when done
kill $(cat /tmp/server.pid)
```

---

## Status Summary

| Issue | Status | Fix |
|-------|--------|-----|
| BigInt type error | ✅ FIXED | Changed `amountCents` to `BigInt(amountCents)` |
| Invalid source ID | ⏳ PENDING | Needs test token format update or mocking |
| Database saves | ⏳ PENDING | Check MongoDB connection in tests |
| API error handling | ⏳ PENDING | Add 400 error response mapping |

**Progress:** 25% complete

---

## Key Learnings

1. **Square SDK v43.2.0** requires `BigInt` for money amounts
2. **Test source IDs** must be valid Square tokens (not hardcoded strings)
3. **API tests** require real server running with valid credentials
4. **Test strategy** needs separation between:
   - Unit tests (with mocks) ✅ Working
   - Integration tests (with real API) ⏳ In progress
   - E2E tests (with full app) ⏳ Separate issues

---
