# Payment & Order Flow Deep Audit
## tasteofgratitude.shop - Production Readiness Review

**Date:** January 5, 2026  
**Status:** ✅ ALL CRITICAL FIXES IMPLEMENTED  
**Scope:** Complete payment and order flow analysis

---

## ✅ FIXES IMPLEMENTED (January 5, 2026)

All critical and high-priority issues have been addressed:

1. **Stable idempotency key** - Server-authoritative, stored on order, reused for all attempts
2. **Pre-payment check** - Returns cached payment if order already paid successfully
3. **Order required** - Payment blocked if order not found (no orphan payments)
4. **Atomic status transition** - Only PRE_PAYMENT_STATES can transition to processing
5. **Square API version fixed** - Changed from 2025-10-16 to 2024-01-18
6. **Webhook order mapping** - Uses reference_id and metadata.localOrderId
7. **Status precedence** - Webhooks cannot downgrade paid to processing
8. **Atomic email claim** - Email dedup uses DB claim before sending
9. **Amount mismatch blocking** - Differences >$0.50 are blocked
10. **Coupon failures logged as errors** - With Sentry alerting
11. **Client idempotency persistence** - Stored in sessionStorage
12. **Refunded/cancelled blocking** - Final states block new payments

---

## 🔴 CRITICAL ISSUES (Fix Before Launch)

### 1. Double-Charge Risk on Retries
**File:** `app/api/payments/route.ts` (line 63)

**Problem:** Fresh idempotency key generated per attempt using `Date.now()`:
```ts
const paymentIdempotencyKey = idempotencyKey || `pay_${orderId.slice(0, 32)}_${Date.now().toString(36)}`;
```

**Risk:** If Square payment succeeds but API crashes before updating order/returning to client, user retries and gets charged again.

**Fix:**
```ts
// Use stable key per order, NOT per attempt
const paymentIdempotencyKey = 
  typeof idempotencyKey === 'string' && idempotencyKey.length <= 45
    ? idempotencyKey
    : `pay_${orderId.slice(0, 32)}`;
```

Also add pre-payment check:
```ts
const existingPayment = await db.collection('payments')
  .findOne({ 'metadata.orderId': orderId, status: { $in: ['COMPLETED', 'APPROVED'] } });

if (existingPayment) {
  return NextResponse.json({ success: true, payment: existingPayment, orderId });
}
```

---

### 2. Payment Proceeds When Order Not Found
**File:** `app/api/payments/route.ts` (lines 75-78)

**Problem:** Payment continues even if order lookup fails:
```ts
if (!order) {
  logger.warn('API', 'Order not found, proceeding with payment anyway', { orderId });
  // Don't block - proceed with client-provided amount
}
```

**Risk:** Customer charged but no usable order record, no email sent, no fulfillment possible.

**Fix:**
```ts
if (!order) {
  return NextResponse.json(
    { success: false, error: 'Order not found. Please refresh and try again.', code: 'ORDER_NOT_FOUND' },
    { status: 404 }
  );
}
```

---

### 3. Race Condition on Concurrent Payment Attempts
**File:** `app/api/payments/route.ts` (lines 80-96)

**Problem:** Two concurrent requests can both see "pending" status and both create Square payments.

**Fix:** Use atomic conditional update BEFORE calling Square:
```ts
const result = await db.collection('orders').updateOne(
  { id: orderId, status: { $nin: ['paid', 'COMPLETED', 'payment_processing'] } },
  {
    $set: {
      status: 'payment_processing',
      paymentStatus: 'processing',
      updatedAt: new Date().toISOString()
    }
  }
);

if (result.matchedCount === 0) {
  const order = await db.collection('orders').findOne({ id: orderId });
  if (['paid', 'COMPLETED'].includes(order?.status)) {
    return NextResponse.json(
      { success: false, error: 'This order has already been paid.', alreadyPaid: true },
      { status: 409 }
    );
  }
  // Status is processing - another request is handling this
  return NextResponse.json(
    { success: false, error: 'Payment is being processed. Please wait.' },
    { status: 409 }
  );
}
```

---

### 4. Square API Version Set to Future Date
**File:** `app/api/orders/create/route.js` (line 427)

**Problem:**
```js
'Square-Version': '2025-10-16'  // Future date - will fail or behave unexpectedly
```

**Fix:** Use current stable version:
```js
'Square-Version': '2024-01-18'  // Match lib/square-api.ts
```

Better: Use the shared `createOrder` from `lib/square-api.ts` instead of direct fetch.

---

## 🟠 HIGH PRIORITY ISSUES

### 5. Webhook Order Mapping Inconsistency
**File:** `app/api/square-webhook/route.js`

**Problem:** Webhook uses `payment.order_id` (Square's order ID) to find local orders:
```js
if (payment.order_id) {
  await updateOrderStatus(payment.order_id, 'paid', { ... });
}
```

But local orders have their own `id`, and Square order ID is stored as `squareOrderId`.

**Fix:** Map correctly using reference_id or metadata:
```js
// Option 1: Use payment.reference_id (contains local orderId)
const localOrderId = payment.reference_id;

// Option 2: Fetch Square order, get metadata.localOrderId
const squareOrder = await getOrder(payment.order_id);
const localOrderId = squareOrder.metadata?.localOrderId;
```

---

### 6. Webhook Can Downgrade Paid Status
**Problem:** `payment.created` webhook sets status to `payment_processing`, which could overwrite `paid` status set by `/api/payments`.

**Fix:** Add status precedence check:
```js
const statusPrecedence = { 'pending': 1, 'payment_processing': 2, 'paid': 3, 'refunded': 4 };

async function updateOrderStatus(orderId, newStatus, meta) {
  const current = await db.collection('orders').findOne({ id: orderId });
  
  if (statusPrecedence[current?.status] >= statusPrecedence[newStatus]) {
    return; // Don't downgrade
  }
  
  await db.collection('orders').updateOne({ id: orderId }, { $set: { status: newStatus, ...meta } });
}
```

---

### 7. Deprecated Webhook Handler Still Active
**File:** `app/api/square-webhook/route.js`

**Problem:** Marked as deprecated but may still be receiving webhooks, causing duplicate/conflicting updates.

**Action:**
1. Verify Square Dashboard only has `/api/webhooks/square` registered
2. Delete this file after 30 days of confirmed successful operation

---

## 🟡 MEDIUM PRIORITY ISSUES

### 8. Client Idempotency Key Not Persisted on Retry
**File:** `components/checkout/SquarePaymentForm.tsx` (line 116)

**Problem:** `paymentIdempotencyKeyRef` generated once per component mount, lost on page refresh.

**Fix:** Store in localStorage keyed by orderId:
```ts
useEffect(() => {
  const storageKey = `payment_idem_${orderId}`;
  let key = localStorage.getItem(storageKey);
  if (!key) {
    key = `pay_${orderId}_${Date.now().toString(36)}`;
    localStorage.setItem(storageKey, key);
  }
  paymentIdempotencyKeyRef.current = key;
}, [orderId]);
```

---

### 9. Email Confirmation Not Retry-Safe
**File:** `app/api/payments/route.ts` (lines 315-351)

**Problem:** No flag to track if email was sent. If webhook also triggers email, customer could receive duplicates.

**Fix:** Add `emailSentAt` field:
```ts
if (!order.emailSentAt) {
  const emailResult = await sendOrderConfirmationEmail({ ... });
  if (emailResult.success) {
    await db.collection('orders').updateOne(
      { id: orderId },
      { $set: { emailSentAt: new Date().toISOString() } }
    );
  }
}
```

---

### 10. Amount Mismatch Only Warns, Doesn't Block
**File:** `app/api/payments/route.ts` (lines 103-121)

**Problem:** Large amount differences (potential tampering) only log a warning.

**Fix:** Block significant mismatches:
```ts
if (amountDifference > 50) { // More than $0.50
  return NextResponse.json(
    { success: false, error: 'Order total mismatch. Please refresh and try again.', code: 'AMOUNT_MISMATCH' },
    { status: 409 }
  );
}
```

---

### 11. Coupon Marking Failure Not Logged as Error
**File:** `app/api/payments/route.ts` (lines 366-387)

**Problem:** Coupon update failure only logs as warning. Coupon could be reused.

**Fix:** Log as error and consider alerting:
```ts
} catch (couponError) {
  logger.error('API', 'CRITICAL: Failed to mark coupon as used - possible reuse', { 
    code: order.coupon.code,
    orderId, 
    error: couponError instanceof Error ? couponError.message : String(couponError) 
  });
  
  Sentry.captureException(couponError, {
    tags: { severity: 'high', type: 'coupon_not_marked_used' }
  });
}
```

---

## 🟢 LOW PRIORITY / NICE-TO-HAVE

### 12. Success Page Relies on localStorage
**File:** `app/checkout/success/CheckoutSuccessPage.client.js`

**Problem:** Order details loaded from `localStorage.pendingOrder`. If cleared, page shows incomplete info.

**Fix:** Fetch order from API as fallback:
```js
if (!pendingOrder && orderId) {
  const res = await fetch(`/api/orders/create?id=${orderId}`);
  const data = await res.json();
  if (data.success) setOrderDetails(data.order);
}
```

---

### 13. SpinWheel Daily Limit Bypassed on New Device
**File:** `components/SpinWheel.jsx`

**Problem:** `localStorage` spin tracking is device-specific.

**Fix:** Track spins server-side in user tracking API (already partially implemented).

---

### 14. Direct Square API Call in orders/create
**File:** `app/api/orders/create/route.js`

**Problem:** Direct `fetch` to Square instead of using `lib/square-api.ts` wrapper.

**Fix:** Refactor to use:
```js
import { createOrder as createSquareOrder } from '@/lib/square-api';
const orderResult = await createSquareOrder({ ... });
```

---

## ✅ WHAT'S WORKING WELL

1. **Double-charge prevention check** - Correctly checks for paid status before processing
2. **Atomic coupon marking** - Uses `isUsed: false` filter for safe concurrent updates
3. **Server-authoritative totals** - Backend recalculates expected amount from order
4. **Webhook signature verification** - Properly validates Square webhook signatures
5. **Comprehensive error mapping** - User-friendly messages for Square error codes
6. **Customer creation before order** - Correct sequence for Square integration
7. **Request timeouts** - All API calls have abort controllers
8. **Rate limiting** - Order creation has rate limits to prevent abuse
9. **Input sanitization** - XSS/SQL injection prevention in place
10. **Idempotency on order creation** - Hash-based deduplication for orders

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: Critical Fixes (Do Now)
- [ ] Fix idempotency key generation (stable per order)
- [ ] Block payment when order not found
- [ ] Add atomic status transition before payment
- [ ] Fix Square API version to current date

### Phase 2: High Priority (This Week)
- [ ] Fix webhook order mapping to use local ID
- [ ] Add status precedence check in webhooks
- [ ] Verify and retire deprecated webhook endpoint

### Phase 3: Medium Priority (Before Heavy Traffic)
- [ ] Persist client idempotency key in localStorage
- [ ] Add emailSentAt tracking
- [ ] Block significant amount mismatches
- [ ] Upgrade coupon failure to error level

### Phase 4: Nice-to-Have (Ongoing)
- [ ] Success page API fallback
- [ ] Server-side spin tracking
- [ ] Refactor to use shared Square API wrapper

---

## 🔍 MONITORING RECOMMENDATIONS

Add alerts for:
1. `ORDER_NOT_FOUND` errors in payment API
2. Amount mismatches > $1
3. Failed coupon updates
4. Webhook signature failures
5. Double-payment attempts (same order, different payment IDs)
6. Orphan payments (Square payment exists, local order missing)

---

## 📊 RECONCILIATION SCRIPT (RECOMMENDED)

Create a nightly job that:
1. Fetches all Square payments from last 24h
2. Compares to local orders by reference_id
3. Flags anomalies:
   - Paid in Square, not marked paid locally
   - Multiple payments for same order
   - Missing local order records
   - Status inconsistencies
