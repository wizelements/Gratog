# GRATOG APP-WIDE STABILIZATION & SQUARE HARDENING PLAN
## Generated: 2025-11-14T15:15:00Z

---

## 🎯 MISSION
Transform Gratog from "mostly working" to **fully stable, error-free, and production-ready** across ALL flows (customer + admin) with deeply integrated Square payments.

---

## 📊 CURRENT STATE ASSESSMENT

### App Structure Discovered:
```
CUSTOMER FLOWS:
├── Homepage (/) - Browse products, hero, features
├── Catalog (/catalog) - Full product listing
├── Product Detail (/product/[slug]) - Individual product view
├── Quiz (/quiz) - Wellness recommendations
├── Quiz Results (/quiz/results/[id]) - Personalized results
├── Rewards (/rewards) - Loyalty program
├── Passport (/passport) - Market passport stamping
├── Markets (/markets) - Market locations & schedules
├── Order Tracking (/order) - Order status/history
├── Checkout (/checkout) - Payment & fulfillment
└── Order Success (/order/success) - Confirmation

ADMIN FLOWS:
├── Admin Login (/admin/login)
├── Dashboard (/admin) - Overview & analytics
├── Products (/admin/products) - Product management
├── Product Edit (/admin/products/[id]) - Edit individual product
├── Orders (/admin/orders) - Order management
├── Customers (/admin/customers) - Customer CRM
├── Coupons (/admin/coupons) - Discount management
├── Inventory (/admin/inventory) - Stock management
├── Waitlist (/admin/waitlist) - Waitlist management
├── Settings (/admin/settings) - System configuration
├── Setup (/admin/setup) - Initial setup wizard
├── Square OAuth (/admin/square-oauth) - Square connection
└── Analytics (/admin/analytics) - Business metrics

PAYMENT TOUCHPOINTS:
├── /api/payments - Web Payments SDK processing
├── /api/checkout - Payment Links creation
├── /api/create-checkout - Checkout V2
├── /api/orders/create - Order creation
├── /api/square/create-checkout - Square checkout
├── /api/cart/price - Cart pricing
├── /api/webhooks/square - Square webhooks
└── /app/order/page.js - Checkout UI
```

### Environment Variables Status:
```
✅ NEXT_PUBLIC_SQUARE_APPLICATION_ID: sq0idp-V1fV-MwsU5lET4rvzHKnIw
✅ NEXT_PUBLIC_SQUARE_LOCATION_ID: L66TVG6867BG9
✅ SQUARE_ACCESS_TOKEN: EAAAl4KvA... (production token)
✅ SQUARE_ENVIRONMENT: production
✅ SQUARE_LOCATION_ID: L66TVG6867BG9
⚠️  SQUARE_FALLBACK_MODE: true (why is this enabled?)
⚠️  Duplicate APP_ID variables (NEXT_PUBLIC_SQUARE_APP_ID vs APPLICATION_ID)
```

### Test Suite Results:
- **84/112 tests passing (75%)**
- **28/112 tests failing (25%)**
- **Key issues:** Validation gaps, API inconsistencies, timeouts

---

## 🔍 PHASE 1: SYSTEM-WIDE ERROR SCAN
**Duration:** 30 minutes  
**Goal:** Identify ALL critical errors across customer + admin flows

### 1.1 Customer Flow Testing
Test each flow end-to-end and document:
- [ ] Homepage load & navigation
- [ ] Product browsing & search
- [ ] Product detail pages (all products)
- [ ] Add to cart functionality
- [ ] Cart management (update/remove items)
- [ ] Quiz flow (start → finish → results)
- [ ] Rewards enrollment
- [ ] Passport stamping
- [ ] Market information
- [ ] Order tracking (with/without order ID)
- [ ] Checkout flow (all fulfillment methods)
- [ ] Payment submission
- [ ] Order confirmation

**Capture:**
- Console errors
- Network failures
- Broken UI elements
- Dead buttons
- Missing states

### 1.2 Admin Flow Testing
Test admin workflows:
- [ ] Admin login
- [ ] Dashboard load & metrics
- [ ] Product listing
- [ ] Product creation
- [ ] Product editing
- [ ] Order management
- [ ] Customer list
- [ ] Coupon creation
- [ ] Inventory updates
- [ ] Waitlist management
- [ ] Settings changes
- [ ] Square OAuth flow
- [ ] Analytics views

**Capture:**
- Authentication issues
- Authorization problems
- Data loading errors
- Save/update failures
- UI breakages

### 1.3 Square Integration Audit
Map every Square touchpoint:
- [ ] SDK initialization (/lib/square.ts)
- [ ] Payment Links creation
- [ ] Web Payments SDK integration
- [ ] Order creation flow
- [ ] Webhook handling
- [ ] Catalog sync
- [ ] OAuth flow
- [ ] Error handling patterns

**Capture:**
- Where data enters the payment pipeline
- What validation exists (or doesn't)
- How errors are handled
- Where sync can break

---

## 🔧 PHASE 2: CRITICAL ERROR FIXES
**Duration:** 60 minutes  
**Goal:** Fix all blocking errors

### 2.1 Environment & Configuration
**Issues from tests:**
- ❌ Test environment doesn't load .env variables
- ⚠️  SQUARE_FALLBACK_MODE enabled (investigate why)
- ⚠️  Duplicate APP_ID variables

**Actions:**
1. Fix vitest.square.config.ts to load .env files
2. Investigate SQUARE_FALLBACK_MODE - should be false for production
3. Consolidate duplicate environment variables
4. Add startup validation for critical variables

**Files:**
- `/app/vitest.square.config.ts`
- `/app/.env`
- `/app/lib/startup-validator.ts`

### 2.2 Input Validation Gaps
**Critical violations from test suite:**
- ❌ Invalid emails accepted (e.g., "notanemail")
- ❌ Invalid phone numbers accepted (e.g., "invalid-phone")
- ❌ Negative quantities accepted (e.g., -5)
- ❌ Zero quantities accepted
- ⚠️  XSS payloads not sanitized
- ⚠️  SQL injection attempts timing out

**Actions:**
1. Create comprehensive validation library
2. Add email validation (RFC-compliant regex)
3. Add phone validation (US format)
4. Add quantity constraints (1-999, integer only)
5. Add input sanitization (strip dangerous characters)
6. Apply validation to ALL order creation endpoints

**New Files:**
- `/app/lib/validation/customer.ts`
- `/app/lib/validation/cart.ts`
- `/app/lib/validation/sanitize.ts`

**Updated Files:**
- `/app/app/api/orders/create/route.js`
- `/app/app/api/cart/price/route.ts`
- `/app/app/order/page.js` (frontend validation)

### 2.3 API Response Structure
**Issues from tests:**
- ❌ GET /api/checkout returns 400 (should return 200 with status)
- ❌ GET /api/webhooks/square missing 'status' field
- ❌ Order response missing 'paymentLink' field
- ❌ Rate limiting not working

**Actions:**
1. Add GET handler to /api/checkout
2. Fix webhook response structure
3. Include paymentLink in order creation response
4. Implement basic rate limiting

**Files:**
- `/app/app/api/checkout/route.ts`
- `/app/app/api/webhooks/square/route.ts`
- `/app/app/api/orders/create/route.js`
- `/app/middleware.ts` (rate limiting)

### 2.4 Timeout & Performance
**Issues:**
- ⚠️  Multiple endpoints timing out (5000ms+)
- ⚠️  SQL injection test timeout
- ⚠️  Payment API slow responses

**Actions:**
1. Add timeout wrapper for all Square API calls
2. Set reasonable timeouts (8-10 seconds)
3. Add graceful error handling for timeouts
4. Investigate slow database queries

**New Files:**
- `/app/lib/timeout.ts`

**Updated Files:**
- `/app/app/api/payments/route.ts`
- `/app/app/api/checkout/route.ts`
- `/app/app/api/orders/create/route.js`

---

## 💳 PHASE 3: PAYMENT DATA CONTRACT ENFORCEMENT
**Duration:** 45 minutes  
**Goal:** Ensure NO invalid data reaches Square

### 3.1 Define Payment Contract
Based on existing code structure, define:

**Order Requirements (before Square):**
```typescript
interface ValidOrder {
  // Customer Data
  customer: {
    name: string; // Required, validated
    email: string; // Required, validated (RFC-compliant)
    phone: string; // Required, validated (10+ digits)
  };
  
  // Cart Data
  cart: {
    items: CartItem[]; // Min 1 item, validated
    subtotal: number; // > 0, calculated server-side
  };
  
  // Fulfillment Data
  fulfillment: {
    type: 'pickup' | 'delivery' | 'shipping';
    // Type-specific required fields
  };
  
  // Totals
  pricing: {
    subtotal: number;
    deliveryFee: number;
    tip: number;
    couponDiscount: number;
    total: number; // Must match Square amount
  };
}
```

**Square Payment Requirements:**
```typescript
interface SquarePaymentRequest {
  sourceId: string; // Payment token, required
  amountMoney: {
    amount: bigint; // In cents, > 0
    currency: 'USD';
  };
  locationId: string; // Required
  idempotencyKey: string; // Required, unique
  // Optional but recommended
  customerId?: string;
  note?: string; // Truncated to 500 chars
  referenceId?: string; // Internal order ID
}
```

### 3.2 Create Contract Validator
**New File:** `/app/lib/payment-contract.ts`

```typescript
export function validateOrderForPayment(order: any): {
  valid: boolean;
  errors: string[];
  contract: ValidOrder | null;
} {
  const errors: string[] = [];
  
  // Validate customer data
  if (!validateEmail(order.customer?.email).valid) {
    errors.push('Valid email required');
  }
  
  if (!validatePhone(order.customer?.phone).valid) {
    errors.push('Valid phone required');
  }
  
  // Validate cart
  if (!order.cart?.items?.length) {
    errors.push('Cart cannot be empty');
  }
  
  order.cart?.items?.forEach((item, idx) => {
    const itemValidation = validateCartItem(item);
    if (!itemValidation.valid) {
      errors.push(`Item ${idx + 1}: ${itemValidation.error}`);
    }
  });
  
  // Validate fulfillment
  const fulfillmentValidation = validateFulfillment(order.fulfillment);
  if (!fulfillmentValidation.valid) {
    errors.push(fulfillmentValidation.error);
  }
  
  // Validate pricing
  if (order.pricing?.total <= 0) {
    errors.push('Total must be greater than $0');
  }
  
  // Return result
  return {
    valid: errors.length === 0,
    errors,
    contract: errors.length === 0 ? order as ValidOrder : null
  };
}
```

### 3.3 Enforce Contract at ALL Payment Entry Points
Apply validation before EVERY Square API call:

**Entry Point 1:** `/app/app/api/payments/route.ts`
```typescript
// Before calling Square Payments API
const validation = validateOrderForPayment(orderData);
if (!validation.valid) {
  return NextResponse.json(
    { error: 'Invalid order data', details: validation.errors },
    { status: 400 }
  );
}
```

**Entry Point 2:** `/app/app/api/checkout/route.ts`
```typescript
// Before calling Square Payment Links API
const validation = validateOrderForPayment(orderData);
if (!validation.valid) {
  return NextResponse.json(
    { error: 'Invalid order data', details: validation.errors },
    { status: 400 }
  );
}
```

**Entry Point 3:** `/app/app/api/orders/create/route.js`
```typescript
// Before creating order + payment
const validation = validateOrderForPayment(requestData);
if (!validation.valid) {
  return NextResponse.json(
    { error: 'Invalid order data', details: validation.errors },
    { status: 400 }
  );
}
```

**Entry Point 4:** Frontend `/app/order/page.js`
```typescript
// Before enabling payment button
const validation = validateOrderForPayment(orderState);
setPaymentEnabled(validation.valid);
setValidationErrors(validation.errors);
```

---

## 🎨 PHASE 4: UI/UX FLOW COMPLETION
**Duration:** 45 minutes  
**Goal:** All flows complete, no dead ends

### 4.1 Customer Flow Enhancements

**Homepage:**
- [ ] Ensure all navigation links work
- [ ] Fix any loading states
- [ ] Verify product cards link correctly
- [ ] Test "Order Now" CTA

**Product Detail:**
- [ ] Variant selection works
- [ ] Add to cart functional
- [ ] Quick view modal
- [ ] Quantity controls
- [ ] Out of stock handling

**Cart:**
- [ ] Update quantities
- [ ] Remove items
- [ ] Apply coupons
- [ ] Calculate totals correctly
- [ ] Empty cart state

**Checkout:**
- [ ] Fulfillment selector (pickup/delivery/shipping)
- [ ] Address validation (delivery/shipping)
- [ ] Delivery time slot selection
- [ ] Tip calculator
- [ ] Payment method selection
- [ ] Loading states during submission
- [ ] Error messages clear and actionable
- [ ] Success redirect

**Order Success:**
- [ ] Display order details
- [ ] Show payment confirmation
- [ ] Next steps clear
- [ ] Email confirmation notice

**Quiz:**
- [ ] All questions display
- [ ] Answer selection works
- [ ] Progress indicator
- [ ] Submit button enabled
- [ ] Results page loads
- [ ] Recommendations display
- [ ] Add to cart from results

### 4.2 Admin Flow Enhancements

**Dashboard:**
- [ ] Metrics load correctly
- [ ] Charts render
- [ ] Recent orders display
- [ ] Navigation to sub-sections

**Product Management:**
- [ ] Product list loads
- [ ] Search/filter works
- [ ] Edit button navigates correctly
- [ ] Create new product form
- [ ] Image upload
- [ ] Variant management
- [ ] Save changes persist
- [ ] Success feedback

**Order Management:**
- [ ] Order list displays
- [ ] Filter by status
- [ ] Order details view
- [ ] Status update works
- [ ] Customer information
- [ ] Square order ID visible

**Settings:**
- [ ] All settings categories load
- [ ] Changes save correctly
- [ ] Environment variables masked
- [ ] Square connection status
- [ ] Webhook configuration

### 4.3 Loading & Error States
Ensure EVERY async operation has:
- [ ] Loading spinner/skeleton
- [ ] Error boundary
- [ ] Retry mechanism
- [ ] User-friendly error messages
- [ ] Fallback UI

---

## 🔒 PHASE 5: SQUARE SYNC & DATA INTEGRITY
**Duration:** 30 minutes  
**Goal:** Local data always matches Square

### 5.1 Order-Square Mapping
Ensure every order has:
```typescript
{
  id: string; // Local UUID
  orderNumber: string; // TOG######
  squareOrderId: string; // Square's order ID
  paymentLinkId?: string; // If using Payment Links
  paymentLink?: string; // Hosted checkout URL
  squarePaymentId?: string; // If Web Payments SDK used
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  squareStatus: string; // Square's status
  lastSyncedAt: Date;
}
```

### 5.2 Webhook Sync Verification
```typescript
// When webhook received:
1. Verify signature
2. Find local order by squareOrderId
3. Compare statuses
4. Update local order if different
5. Log sync event
6. Trigger notifications if needed
```

**File:** `/app/app/api/webhooks/square/route.ts`

### 5.3 Reconciliation Endpoint
Create admin tool to find mismatches:
```typescript
GET /api/admin/reconcile-square
- Fetch last 100 orders from Square
- Compare with local orders
- Report discrepancies
- Option to sync
```

---

## ⏱️ PHASE 6: TIMEOUT & RETRY LOGIC
**Duration:** 20 minutes  
**Goal:** Reliable under network issues

### 6.1 Timeout Wrapper
```typescript
// /app/lib/timeout.ts
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 10000,
  errorMessage: string = 'Operation timeout'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}
```

### 6.2 Retry Logic
```typescript
// /app/lib/retry.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delayMs?: number;
    shouldRetry?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    shouldRetry = () => true
  } = options;
  
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts || !shouldRetry(lastError)) {
        throw lastError;
      }
      
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
  
  throw lastError!;
}
```

### 6.3 Apply to Square Calls
```typescript
// Example: /app/app/api/payments/route.ts
const paymentResult = await withTimeout(
  withRetry(
    async () => square.paymentsApi.createPayment(paymentRequest),
    {
      maxAttempts: 2,
      shouldRetry: (error) => {
        // Only retry on network errors, not validation errors
        return error.message.includes('ETIMEDOUT') || 
               error.message.includes('ECONNRESET');
      }
    }
  ),
  8000, // 8 second timeout
  'Square payment API timeout'
);
```

---

## 🧪 PHASE 7: TEST SUITE FIXES
**Duration:** 30 minutes  
**Goal:** 95%+ test pass rate

### 7.1 Fix Environment Loading
```typescript
// /app/vitest.square.config.ts
import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';
import path from 'path';

// Load .env file
config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/square/**/*.{test,spec}.{js,ts}'],
    setupFiles: ['./tests/square/setup.ts'], // Add setup file
    // ... rest of config
  }
});
```

```typescript
// /app/tests/square/setup.ts (new file)
import { config } from 'dotenv';
config();

// Verify critical env vars loaded
if (!process.env.SQUARE_ACCESS_TOKEN) {
  console.warn('⚠️  SQUARE_ACCESS_TOKEN not loaded in test environment');
}
```

### 7.2 Update Tests for New Validation
After adding validation, update tests to expect:
- 400 responses for invalid emails
- 400 responses for invalid phones
- 400 responses for negative quantities
- Sanitized input in responses

### 7.3 Add Timeout to Slow Tests
```typescript
it('should handle slow operation', async () => {
  // Increase timeout for this specific test
  const result = await doSlowThing();
  expect(result).toBe(expected);
}, 10000); // 10 second timeout
```

### 7.4 Re-run Full Suite
```bash
cd /app
npx vitest run --config vitest.square.config.ts
```

**Target:** 105+ passing tests (95% pass rate)

---

## 📝 PHASE 8: FINAL POLISH & DOCUMENTATION
**Duration:** 20 minutes  
**Goal:** Production-ready confidence

### 8.1 Error Message Audit
Review ALL error messages for:
- Clarity (user can understand)
- Actionability (user knows what to do)
- Tone (helpful, not technical)

### 8.2 Success State Consistency
Ensure all success flows:
- Display confirmation
- Show next steps
- Provide order/reference numbers
- Match Square records

### 8.3 Admin Tools
Add diagnostic tools:
- Square connection tester
- Environment variable checker
- Recent error log viewer
- Order-Square reconciliation

### 8.4 Documentation
Update:
- `/app/docs/payments.md` - Complete payment flow
- `/app/docs/SQUARE_WEBHOOKS.md` - Webhook setup
- `/app/SQUARE_TEST_RESULTS_ANALYSIS.md` - Mark fixed issues

---

## 📊 SUCCESS CRITERIA

### Before Stabilization:
- 🔴 28 failing tests (25% failure rate)
- 🔴 Multiple console errors
- 🔴 Validation gaps (invalid data reaches Square)
- 🟡 Inconsistent API responses
- 🟡 Timeout issues
- 🟡 Missing error states

### After Stabilization:
- ✅ <5 failing tests (95%+ pass rate)
- ✅ Zero console errors in normal flows
- ✅ Full validation before Square API calls
- ✅ Consistent API response structures
- ✅ All operations complete within timeout
- ✅ Clear loading/error states everywhere
- ✅ Local data synced with Square
- ✅ Payment contract enforced
- ✅ All customer flows complete
- ✅ All admin flows functional

---

## 🚀 EXECUTION SEQUENCE

### Quick Wins (30 min):
1. Fix test environment variable loading
2. Add basic validation (email, phone, quantity)
3. Fix API response structures

### Critical Fixes (60 min):
4. Create payment contract validator
5. Apply validation to all payment endpoints
6. Add timeout protection
7. Fix webhook sync

### Flow Completion (45 min):
8. Test all customer flows
9. Fix broken UI elements
10. Add loading/error states

### Polish (30 min):
11. Re-run test suite
12. Audit error messages
13. Verify Square sync
14. Update documentation

**Total Estimated Time:** 2 hours 45 minutes

---

## 📋 FILES TO CREATE

New files needed:
```
/app/lib/validation/customer.ts
/app/lib/validation/cart.ts
/app/lib/validation/sanitize.ts
/app/lib/payment-contract.ts
/app/lib/timeout.ts
/app/tests/square/setup.ts
/app/app/api/admin/reconcile-square/route.ts
```

## 📝 FILES TO UPDATE

Existing files requiring changes:
```
/app/vitest.square.config.ts - Add .env loading
/app/.env - Review SQUARE_FALLBACK_MODE
/app/app/api/orders/create/route.js - Add validation
/app/app/api/payments/route.ts - Add timeout, validation
/app/app/api/checkout/route.ts - Add GET handler, validation
/app/app/api/webhooks/square/route.ts - Fix response structure
/app/app/order/page.js - Add frontend validation
/app/lib/startup-validator.ts - Validate env vars on startup
/app/middleware.ts - Add rate limiting
```

---

## 🎯 NEXT STEP

**User approval required before proceeding with implementation.**

Please review this plan and confirm:
1. Does the scope align with your expectations?
2. Are there any flows or areas I missed?
3. Should I prioritize any specific phase?
4. Any concerns about the approach?

Once approved, I will execute this plan systematically, testing after each phase and providing progress updates.

---

**Generated by:** Emergent AI  
**For:** Gratog Production App (gratog.vercel.app)  
**Based on:** Test analysis, codebase scan, and adaptive stabilization framework
