# Payment Flow Fixes - Flawless Square SDK Integration

## Summary

This document outlines the critical fixes applied to ensure bulletproof Square SDK payment processing. All fixes address potential payment failures, security vulnerabilities, and race conditions identified during the comprehensive audit.

---

## Fixes Applied

### 1. SquareWebPaymentForm.jsx - Complete Rewrite

**File:** `components/SquareWebPaymentForm.jsx`

**Issues Fixed:**
- ❌ Was missing `locationId` in `Square.payments()` call (required parameter)
- ❌ Hardcoded production SDK URL (ignored sandbox/production environment)
- ❌ Used undefined `debug()` function causing ReferenceError
- ❌ Did not pass `squareOrderId` for order-payment linking
- ❌ No timeout/abort handling for payment requests

**Changes:**
```javascript
// BEFORE (broken)
const payments = window.Square.payments(applicationId);

// AFTER (fixed)
const payments = await window.Square.payments(
  config.applicationId,
  config.locationId  // Required parameter
);
```

- Now fetches config from `/api/square/config` (unified with SquarePaymentForm.tsx)
- Uses environment-aware SDK URL (sandbox vs production)
- Added `squareOrderId` prop for proper order-payment linking
- Added AbortController with 30-second timeout
- Fixed cleanup function to use `console.warn` instead of undefined `debug`
- Stable idempotency key generation per order

---

### 2. /api/payments - Server-Side Amount Validation & Double-Charge Prevention

**File:** `app/api/payments/route.ts`

**Critical Security Fixes:**

#### A. Server-Side Amount Validation
```typescript
// BEFORE: Trusted client-provided amount (DANGEROUS)
const response = await square.payments.create({
  amountMoney: { amount: BigInt(amountCents) } // Client-controlled!
});

// AFTER: Server-validated amount
const order = await db.collection('orders').findOne({ id: orderId });
const expectedAmountCents = order.pricing.total * 100;

if (Math.abs(amountCents - expectedAmountCents) > 1) {
  return 400 error; // Amount mismatch
}

const response = await square.payments.create({
  amountMoney: { amount: BigInt(expectedAmountCents) } // Server-validated!
});
```

#### B. Double-Charge Prevention
```typescript
// Check if order already paid BEFORE processing payment
const paidStatuses = ['paid', 'COMPLETED', 'completed'];
if (paidStatuses.includes(order.status) || paidStatuses.includes(order.paymentStatus)) {
  return NextResponse.json({
    success: false,
    error: 'This order has already been paid.',
    alreadyPaid: true
  }, { status: 409 });
}
```

#### C. Order-Specific Idempotency Keys
```typescript
// BEFORE: Random UUID (retries could double-charge)
const paymentIdempotencyKey = idempotencyKey || randomUUID();

// AFTER: Order-specific key (same order = same key)
const paymentIdempotencyKey = idempotencyKey || `payment_${orderId}_${order.orderNumber}`;
```

---

### 3. /api/payments GET - Card Details Shape Fix

**File:** `app/api/payments/route.ts` (GET endpoint)

**Issue:** DB records stored `cardDetails.last4` but code expected `cardDetails.card.last4`

**Fix:**
```typescript
// Handle both Square API shape and DB record shape
const cardInfo = squarePayment 
  ? payment.cardDetails?.card  // Square API: nested
  : payment.cardDetails;        // DB: flat

return {
  cardLast4: cardInfo?.last4,
  cardBrand: cardInfo?.cardBrand || cardInfo?.brand
};
```

---

### 4. SquarePaymentForm.tsx - onError Callback Fix

**File:** `components/checkout/SquarePaymentForm.tsx`

**Issue:** `useCallback(onError, [])` froze first callback, ignoring prop changes

**Fix:**
```typescript
// BEFORE (broken for callback updates)
const stableOnError = useCallback(onError, []);

// AFTER (always uses latest callback)
const onErrorRef = useRef(onError);
useEffect(() => {
  onErrorRef.current = onError;
}, [onError]);

// In effects, use: onErrorRef.current(errorMsg)
```

---

### 5. updateOrderStatus - Monotonic Status Protection

**File:** `lib/db-customers.js`

**Issue:** Webhooks could regress order status (e.g., `paid` → `payment_processing`)

**Fix:**
```javascript
const STATUS_PRECEDENCE = [
  'pending',
  'payment_pending', 
  'payment_processing',
  'paid',
  'preparing',
  'ready_for_pickup',
  'shipped',
  'delivered',
  'completed',
  'refunded',
  'cancelled',
  'payment_failed'
];

// Block status regression
if (newPrecedence < currentPrecedence && status !== 'payment_failed') {
  return { success: true, blocked: true, reason: 'Cannot regress status' };
}
```

---

## Payment Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CHECKOUT FLOW                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. User fills checkout form                                        │
│     └─> /api/orders/create                                          │
│         └─> Creates order in DB (status: pending)                   │
│         └─> Creates Square Order (gets squareOrderId)               │
│         └─> Returns { orderId, squareOrderId }                      │
│                                                                     │
│  2. SquarePaymentForm loads                                         │
│     └─> Fetches /api/square/config                                  │
│     └─> Loads Square SDK (env-aware URL)                            │
│     └─> Initializes payments(appId, locationId)                     │
│     └─> Attaches card form to DOM                                   │
│                                                                     │
│  3. User submits payment                                            │
│     └─> card.tokenize() → payment token                             │
│     └─> POST /api/payments with:                                    │
│         - sourceId (token)                                          │
│         - orderId                                                   │
│         - squareOrderId                                             │
│         - idempotencyKey (order-specific)                           │
│                                                                     │
│  4. /api/payments processing                                        │
│     └─> Fetch order from DB                                         │
│     └─> VALIDATE: Order exists                                      │
│     └─> VALIDATE: Order not already paid (409 if paid)              │
│     └─> VALIDATE: Amount matches order total                        │
│     └─> square.payments.create() with validated amount              │
│     └─> Persist payment record with fallback                        │
│     └─> Update order status to 'paid'                               │
│     └─> Send confirmations (email, SMS)                             │
│     └─> Award rewards points                                        │
│     └─> Return success with receiptUrl                              │
│                                                                     │
│  5. Webhooks (async backup)                                         │
│     └─> payment.completed → updateOrderStatus('paid')               │
│     └─> Monotonic: won't regress 'paid' to 'processing'             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Testing Checklist

### Happy Path
- [ ] Complete checkout with valid card
- [ ] Verify payment appears in Square Dashboard
- [ ] Verify order status is 'paid' in DB
- [ ] Verify customer receives confirmation email
- [ ] Verify receipt URL works

### Error Handling
- [ ] Invalid card → Clear error message, retry button works
- [ ] Card declined → Shows "Card declined" message
- [ ] Network timeout → Shows timeout message, can retry
- [ ] Already paid order → Returns 409, shows "already paid"

### Security
- [ ] Tampered amount in request → Rejected with 400
- [ ] Non-existent order ID → Rejected with 404
- [ ] Duplicate submission → Idempotent (same payment ID)

### Webhook Resilience
- [ ] Order paid via API → webhook doesn't regress status
- [ ] Late webhook → Properly updates if not already paid
- [ ] Invalid webhook signature → Rejected with 401

---

## Environment Variables Required

```env
# Square SDK (public)
NEXT_PUBLIC_SQUARE_APPLICATION_ID=sq0idp-xxxxx

# Square API (server-only)
SQUARE_ACCESS_TOKEN=EAAAAxxxxx
SQUARE_LOCATION_ID=Lxxxxx
SQUARE_ENVIRONMENT=production  # or 'sandbox'
SQUARE_WEBHOOK_SIGNATURE_KEY=xxxxx

# App
NEXT_PUBLIC_BASE_URL=https://tasteofgratitude.shop
```

---

## Files Modified

| File | Changes |
|------|---------|
| `components/SquareWebPaymentForm.jsx` | Complete rewrite - config API, locationId, timeout, squareOrderId |
| `components/checkout/SquarePaymentForm.tsx` | Fixed onError callback stabilization |
| `app/api/payments/route.ts` | Server-side amount validation, double-charge prevention, cardDetails fix |
| `lib/db-customers.js` | Added monotonic status protection |

---

## Rollback Plan

If issues arise:

1. **Revert payment validation** (if blocking legitimate payments):
   ```bash
   git checkout HEAD~1 -- app/api/payments/route.ts
   ```

2. **Revert status protection** (if blocking status updates):
   ```bash
   git checkout HEAD~1 -- lib/db-customers.js
   ```

3. **Revert form changes** (if SDK initialization fails):
   ```bash
   git checkout HEAD~1 -- components/SquareWebPaymentForm.jsx
   git checkout HEAD~1 -- components/checkout/SquarePaymentForm.tsx
   ```

---

*Last updated: January 4, 2026*
