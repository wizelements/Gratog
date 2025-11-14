# Square Payment Test Suite Analysis
## Executed: November 14, 2025

---

## EXECUTIVE SUMMARY

**Test Coverage:** 112 tests across 6 test suites  
**Pass Rate:** 75% (84 passed / 28 failed)  
**Status:** 🔴 CRITICAL ISSUES IDENTIFIED

### Critical Finding
**The payment system currently violates the "Payment Data Contract" principle:**
- Missing environment variables block Square initialization
- Input validation gaps allow invalid data to reach payment APIs
- API structure inconsistencies prevent proper error handling

---

## TEST RESULTS BY CATEGORY

### ✅ PASSING (84 tests)
- Frontend integration (24/24) ✅
- Basic payment validation (partial)
- Order creation flow (partial)
- Security edge cases (partial)

### 🔴 FAILING (28 tests)

#### **CATEGORY 1: Environment Configuration (6 failures)**
**Impact:** BLOCKS ALL PAYMENT PROCESSING

```
❌ NEXT_PUBLIC_SQUARE_APPLICATION_ID - undefined
❌ NEXT_PUBLIC_SQUARE_LOCATION_ID - undefined
❌ SQUARE_ACCESS_TOKEN - undefined
❌ SQUARE_ENVIRONMENT - undefined
❌ SQUARE_LOCATION_ID - undefined
❌ Configuration validation - cannot validate undefined values
```

**Root Cause:** Vitest test environment not loading .env files  
**Risk Level:** 🔴 CRITICAL - Square SDK cannot initialize  
**Blocks:** All payment processing, SDK initialization, API calls

---

#### **CATEGORY 2: Input Validation Gaps (7 failures)**
**Impact:** ALLOWS INVALID DATA TO REACH SQUARE API

```
❌ Email format validation - invalid emails ACCEPTED (returns 200, should be 400)
   Test: "notanemail" → Order created successfully ❌
   
❌ Phone number validation - invalid phones ACCEPTED (returns 200, should be 400)
   Test: "invalid-phone" → Order created successfully ❌
   
❌ Quantity constraints - negative/zero quantities ACCEPTED (returns 200, should be 400)
   Test: quantity: -5 → Order created successfully ❌
   
❌ XSS injection - test timeout (5000ms exceeded)
   Payload: '<script>alert("xss")</script>' → No response
   
❌ SQL injection - test timeout (5000ms exceeded)  
   Payload: "'; DROP TABLE orders; --" → No response
```

**Root Cause:** Validation logic missing or incomplete in `/app/app/api/orders/create/route.js`  
**Risk Level:** 🔴 CRITICAL - Data integrity violations  
**Blocks:** Payment Data Contract enforcement

**Payment Data Contract Violations:**
1. ❌ Incomplete customer data can reach Square
2. ❌ Invalid email/phone prevents order confirmation
3. ❌ Negative quantities create accounting errors
4. ❌ Malicious input not sanitized

---

#### **CATEGORY 3: API Structure Issues (4 failures)**
**Impact:** INCONSISTENT API RESPONSES

```
❌ GET /api/checkout - Returns 400, should return 200 with status
   Expected: { service: "square-checkout", configured: true }
   Actual: 400 Bad Request
   
❌ GET /api/webhooks/square - Missing 'status' property
   Expected: { status: "active", webhookTypes: [...] }
   Actual: { message: "...", webhookTypes: [...] } // no 'status' field
   
❌ Order response - Missing 'paymentLink' property
   Expected: { order: { id, squareOrderId, paymentLink, ... } }
   Actual: { order: { id, squareOrderId, ... } } // no paymentLink
   
❌ Rate limiting - 0 successful responses
   Expected: Some requests succeed, some rate-limited
   Actual: All 10 rapid requests failed
```

**Root Cause:** API endpoints don't follow consistent response schema  
**Risk Level:** 🟡 MEDIUM - Error handling complications  
**Impact:** Frontend cannot reliably parse responses

---

#### **CATEGORY 4: Performance & Timeouts (3 failures)**
**Impact:** UNRELIABLE PAYMENT PROCESSING

```
❌ POST /api/payments - Timeout after 5000ms
❌ Order creation with pickup - Timeout after 5000ms  
❌ SQL injection test - Timeout after 5000ms
```

**Root Cause:** Unknown - requires investigation  
**Possible Causes:**
- Database connection pooling issues
- Slow Square API calls without timeout handling
- Infinite loops in validation logic
- Memory pressure (Next.js restart detected during previous tests)

**Risk Level:** 🟡 MEDIUM - User experience degradation  
**Impact:** Slow checkouts, abandoned carts

---

## PAYMENT DATA CONTRACT VIOLATIONS

Based on test failures, current system ALLOWS:

### ❌ FRONT-END VIOLATIONS
- [ ] Missing customer email
- [ ] Invalid email format (e.g., "notanemail")
- [ ] Invalid phone format (e.g., "invalid-phone")
- [ ] Negative cart quantities
- [ ] Zero cart quantities
- [ ] Unsanitized XSS payloads
- [ ] SQL injection attempts

### ❌ BACKEND VIOLATIONS
- [ ] Order creation without complete validation
- [ ] Payment processing without idempotency verification
- [ ] Missing environment variable checks before Square calls
- [ ] Inconsistent API response structures
- [ ] No timeout protection on Square API calls

### ❌ DATA SYNC VIOLATIONS
- [ ] Order created without paymentLink
- [ ] No verification that Square order ID exists before marking paid
- [ ] Missing webhook signature validation (not tested)

---

## RECOMMENDED FIXES (PRIORITY ORDER)

### 🔴 PHASE 1: Environment Variables (IMMEDIATE)
**Goal:** Enable test suite to run with proper credentials

```bash
# Fix 1: Load .env in test setup
# File: vitest.square.config.ts
```

**Files to update:**
1. `/app/vitest.square.config.ts` - Add dotenv setup
2. `/app/.env` - Verify all Square variables present
3. `/app/.env.production` - Verify production variables

**Validation:** Re-run tests, all environment tests should pass

---

### 🔴 PHASE 2: Input Validation (CRITICAL)
**Goal:** NO invalid data reaches Square API

**2A. Email Validation**
```typescript
// File: /app/lib/validation/customer.ts (create new)
export function validateEmail(email: string): { valid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return { valid: false, error: 'Valid email address is required' };
  }
  return { valid: true };
}
```

**2B. Phone Validation**
```typescript
// File: /app/lib/validation/customer.ts
export function validatePhone(phone: string): { valid: boolean; error?: string } {
  // US phone: 10 digits, optional formatting
  const phoneRegex = /^[\d\s\-\(\)]{10,}$/;
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length < 10) {
    return { valid: false, error: 'Valid phone number is required (10 digits)' };
  }
  return { valid: true };
}
```

**2C. Quantity Validation**
```typescript
// File: /app/lib/validation/cart.ts (create new)
export function validateCartItem(item: any): { valid: boolean; error?: string } {
  if (!item.quantity || item.quantity <= 0) {
    return { valid: false, error: 'Quantity must be greater than 0' };
  }
  if (item.quantity > 999) {
    return { valid: false, error: 'Quantity cannot exceed 999' };
  }
  if (!Number.isInteger(item.quantity)) {
    return { valid: false, error: 'Quantity must be a whole number' };
  }
  return { valid: true };
}
```

**2D. Input Sanitization**
```typescript
// File: /app/lib/validation/sanitize.ts (create new)
export function sanitizeString(input: string): string {
  // Remove dangerous characters
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/['"`;]/g, '')
    .trim();
}
```

**Files to update:**
1. `/app/app/api/orders/create/route.js` - Add validation calls
2. `/app/lib/validation/customer.ts` - Create new file
3. `/app/lib/validation/cart.ts` - Create new file
4. `/app/lib/validation/sanitize.ts` - Create new file

**Validation:** Re-run validation tests, all should pass

---

### 🟡 PHASE 3: API Structure Consistency (HIGH)
**Goal:** All APIs follow consistent response schema

**3A. Fix GET /api/checkout**
```typescript
// Current: Returns 400 on GET
// Expected: Return status object

export async function GET(request: Request) {
  return NextResponse.json({
    service: 'square-checkout',
    configured: !!process.env.SQUARE_ACCESS_TOKEN,
    environment: process.env.SQUARE_ENVIRONMENT,
    featureFlag: process.env.FEATURE_CHECKOUT_V2
  });
}
```

**3B. Fix GET /api/webhooks/square**
```typescript
// Add 'status' field to response
return NextResponse.json({
  status: 'active', // Add this
  message: 'Square webhook endpoint is active',
  environment: process.env.SQUARE_ENVIRONMENT,
  webhookTypes: SUPPORTED_WEBHOOK_TYPES
});
```

**3C. Include paymentLink in order response**
```typescript
// File: /app/app/api/orders/create/route.js
// After creating Square payment link, store in order
const orderData = {
  ...order,
  squareOrderId: squareOrder.id,
  paymentLink: paymentLink.url, // Add this
  paymentLinkId: paymentLink.id  // Add this
};
```

**Files to update:**
1. `/app/app/api/checkout/route.ts` - Add GET handler
2. `/app/app/api/webhooks/square/route.ts` - Add status field
3. `/app/app/api/orders/create/route.js` - Include paymentLink

**Validation:** Re-run API structure tests, all should pass

---

### 🟡 PHASE 4: Timeout Protection (MEDIUM)
**Goal:** No API call hangs indefinitely

**4A. Add timeout wrapper**
```typescript
// File: /app/lib/timeout.ts (create new)
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 10000,
  errorMessage: string = 'Request timeout'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}
```

**4B. Wrap Square API calls**
```typescript
// Example usage in /app/app/api/payments/route.ts
import { withTimeout } from '@/lib/timeout';

const result = await withTimeout(
  square.paymentsApi.createPayment({...}),
  8000, // 8 second timeout
  'Square payment API timeout'
);
```

**Files to update:**
1. `/app/lib/timeout.ts` - Create new file
2. `/app/app/api/payments/route.ts` - Wrap Square calls
3. `/app/app/api/checkout/route.ts` - Wrap Square calls
4. `/app/app/api/orders/create/route.js` - Wrap Square calls

**Validation:** Re-run timeout tests, should complete within limits

---

## DIAGNOSTIC PAGE STATUS

The `/diagnostic` page was created to check production environment variables:

**Expected Variables:**
```
NEXT_PUBLIC_SQUARE_APPLICATION_ID
NEXT_PUBLIC_SQUARE_LOCATION_ID  
NODE_ENV
```

**Action Required:** Visit https://gratog.vercel.app/diagnostic to verify production config

---

## NEXT STEPS

1. **IMMEDIATE:** Load `.env` files in test configuration
2. **CRITICAL:** Add email/phone/quantity validation  
3. **HIGH:** Fix API response structure inconsistencies
4. **MEDIUM:** Add timeout protection to Square API calls
5. **VERIFY:** Run full test suite again (should reach 95%+ pass rate)
6. **PRODUCTION:** Check `/diagnostic` page on live site

---

## FILES REQUIRING CHANGES

### New Files to Create:
- `/app/lib/validation/customer.ts` - Email/phone validation
- `/app/lib/validation/cart.ts` - Cart/quantity validation
- `/app/lib/validation/sanitize.ts` - Input sanitization
- `/app/lib/timeout.ts` - Timeout wrapper utility

### Existing Files to Update:
- `/app/vitest.square.config.ts` - Add .env loading
- `/app/app/api/orders/create/route.js` - Add validation, include paymentLink
- `/app/app/api/checkout/route.ts` - Add GET handler
- `/app/app/api/webhooks/square/route.ts` - Add status field
- `/app/app/api/payments/route.ts` - Add timeout protection

---

## RISK ASSESSMENT

### Current State (Before Fixes):
- **Data Integrity:** 🔴 HIGH RISK - Invalid data can reach Square
- **Security:** 🔴 HIGH RISK - XSS/SQL injection not prevented
- **Reliability:** 🟡 MEDIUM RISK - Timeouts affect UX
- **Configuration:** 🔴 HIGH RISK - Missing env vars block payments

### Target State (After Fixes):
- **Data Integrity:** 🟢 LOW RISK - Full validation enforced
- **Security:** 🟢 LOW RISK - Input sanitization active
- **Reliability:** 🟢 LOW RISK - Timeout protection added
- **Configuration:** 🟢 LOW RISK - All env vars validated

---

**Generated:** 2025-11-14T15:12:00Z  
**Test Duration:** 23.75s  
**Test Files:** 6  
**Total Tests:** 112
