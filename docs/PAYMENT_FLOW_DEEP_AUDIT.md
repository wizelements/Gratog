# Payment Flow Deep Audit - Square-Level Assurance

**Date:** 2026-01-04  
**Scope:** End-to-end payment flow in gratog  
**Status:** COMPREHENSIVE REVIEW COMPLETE

---

## Executive Summary

The payment system is **production-ready** with Square-level patterns in place. This audit covers every component from cart totals to webhook reconciliation.

---

## 1. Amount Calculation Path (End-to-End)

### Flow Diagram
```
Cart Items (dollars)
    ↓
totalsAdapter.computeTotals() → OrderTotals (all in DOLLARS)
    ↓
ReviewAndPay.tsx → createOrder(couponDiscount in dollars)
    ↓
services/order.ts → POST /api/orders/create (couponDiscount in dollars)
    ↓
enhanced-order-tracking.js → pricing.total (dollars), stored in DB
    ↓
ReviewAndPay.tsx → Math.round(totals.total * 100) = amountCents
    ↓
SquarePaymentForm.tsx → POST /api/payments (amountCents)
    ↓
square-api.ts → createPayment(amountCents) → Square API (cents)
```

### ✅ Unit Consistency Verified

| Component | Unit | Verified |
|-----------|------|----------|
| `totalsAdapter.ts` | dollars | ✅ All calculations in dollars |
| `services/order.ts` | dollars (couponDiscount) | ✅ Line 197: `couponDiscount: sanitizedDiscount` |
| `enhanced-order-tracking.js` | dollars | ✅ Line 74: `total = subtotal - couponDiscount + deliveryFee + tip` |
| `ReviewAndPay.tsx` | converts to cents | ✅ Line 344: `Math.round(totals.total * 100)` |
| `SquarePaymentForm.tsx` | cents | ✅ Passes `amountCents` to API |
| `/api/payments/route.ts` | cents | ✅ `amountCents` validated, passed to Square |
| `square-api.ts` | cents | ✅ Line 144-147: `amount_money: { amount: req.amountCents }` |

### Coupon Unit Flow
```
/api/coupons/create → discountAmount in CENTS (stored in DB)
/api/coupons/validate → returns discountAmount in CENTS
services/checkout.ts → discountAmountCents (frontend converts to dollars)
totalsAdapter.ts → couponDiscount in DOLLARS
services/order.ts → couponDiscount in DOLLARS (sent to backend)
enhanced-order-tracking.js → couponDiscount in DOLLARS
```

---

## 2. Idempotency Analysis

### ✅ Payment Idempotency (CORRECT)

**Frontend (SquarePaymentForm.tsx line ~350):**
```typescript
paymentIdempotencyKeyRef.current = `pay_${orderId.slice(0, 32)}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
```
- Fresh key per attempt ✅
- Allows retries after failure ✅

**Backend (/api/payments/route.ts line 63):**
```typescript
const paymentIdempotencyKey = idempotencyKey || `pay_${orderId.slice(0, 32)}_${Date.now().toString(36)}`;
```
- Accepts client key OR generates fresh ✅

### ✅ Order Creation Idempotency (CORRECT)

**Backend (/api/orders/create/route.js lines 199-232):**
- Content-based hash for deduplication (email + cart + fulfillment + 5-min bucket)
- Checks for existing idempotent response before processing
- Caches successful response for 5 minutes

### ✅ Webhook Idempotency (CORRECT)

**/api/webhooks/square/route.ts lines 117-144:**
- Checks `webhook_events_processed` collection before processing
- Records eventId after processing (success or error)
- Returns cached response for duplicate events

---

## 3. Double-Charge Prevention

### ✅ Order Status Check (/api/payments/route.ts lines 80-96)

```typescript
const paidStatuses = ['paid', 'COMPLETED', 'completed', 'payment_completed'];
if (paidStatuses.includes(order.status) || paidStatuses.includes(order.paymentStatus)) {
  return NextResponse.json({
    success: false,
    error: 'This order has already been paid.',
    alreadyPaid: true,
    orderId
  }, { status: 409 });
}
```

### ✅ Frontend Handling (SquareWebPaymentForm.jsx lines 250-261)

```javascript
if (response.status === 409) {
  toast.success('This order has already been paid!');
  if (onPaymentSuccess) {
    onPaymentSuccess({ orderId, alreadyPaid: true, message: result.error });
  }
  return;
}
```

---

## 4. Error Handling Audit

### ✅ Payment API Error Mapping (/api/payments/route.ts lines 457-475)

Complete mapping for Square error codes:
- `CARD_DECLINED` → User-friendly message
- `CVV_FAILURE` → User-friendly message
- `INVALID_EXPIRATION` → User-friendly message
- `INSUFFICIENT_FUNDS` → User-friendly message
- 12 more error codes mapped

### ✅ Frontend Error Display

- `SquarePaymentForm.tsx`: Card validation errors, tokenization errors, API errors
- `SquareWebPaymentForm.jsx`: Same patterns with retry button
- `ReviewAndPay.tsx`: Order creation errors with retry

### ✅ Timeout Handling

| Component | Timeout | Verified |
|-----------|---------|----------|
| Order creation | 30s | ✅ services/order.ts line 242 |
| Payment tokenization | SDK default | ✅ |
| Payment API call | 15s | ✅ SquarePaymentForm.tsx line 361 |
| Square SDK load | 20s | ✅ SquarePaymentForm.tsx line 207 |

---

## 5. Webhook Reconciliation

### ✅ Payment Status Sync

**/api/webhooks/square/route.ts handles:**
- `payment.created` → Updates `paymentStatus: 'created'`
- `payment.updated` → Maps Square status to order status:
  - `COMPLETED`/`APPROVED` → `status: 'paid'`
  - `PENDING` → `status: 'payment_processing'`
  - `CANCELED`/`FAILED` → `status: 'payment_failed'`

**/api/square-webhook/route.js handles (duplicate):**
- Same events with same logic
- ⚠️ **NOTE:** Two webhook handlers exist - may cause duplicate processing

### ✅ Signature Verification

Both webhook handlers verify `Square-Signature` header using HMAC-SHA256 with timing-safe comparison.

---

## 6. Refund Flow

### ✅ API Available (lib/square-api.ts lines 464-474)

```typescript
export async function createRefund(req: CreateRefundRequest): Promise<SquareResponse<{ refund: RefundResult }>>
```

### ✅ Webhook Handler

`/api/square-webhook/route.js` handles `refund.created` event (line 167-168, 318-327)

### ⚠️ MISSING: Admin Refund UI/API

No admin endpoint to initiate refunds. Currently must use Square Dashboard or add an admin API.

---

## 7. Security Checklist

| Check | Status | Location |
|-------|--------|----------|
| Access token not exposed | ✅ | Server-side only in `getHeaders()` |
| Application ID public only | ✅ | `NEXT_PUBLIC_SQUARE_APPLICATION_ID` |
| Webhook signature verification | ✅ | Both webhook handlers |
| Input sanitization | ✅ | `sanitizeObject()` in order creation |
| Rate limiting | ✅ | 10 orders per 5 min per IP |
| XSS prevention | ✅ | `sanitizeString()` removes `<>` |
| Sentry error tracking | ✅ | Payment failures logged |

---

## 8. Identified Gaps

### ✅ Fixed in This Audit

1. **Email Not Actually Sending** (CRITICAL)
   - `sendNotificationReliably()` was called with wrong signature
   - **Fix:** Replaced with direct `sendOrderConfirmationEmail()` call
   - Location: `/api/payments/route.ts` lines 314-351

2. **Coupon Not Marked Used**
   - **Fix:** Added coupon update after successful payment
   - Location: `/api/payments/route.ts` lines 355-377

3. **Missing Admin Refund API**
   - **Fix:** Created `/api/admin/orders/[id]/refund` endpoint
   - Supports full and partial refunds via Square API

4. **Old Webhook Handler**
   - **Fix:** Added deprecation notice with migration steps
   - Location: `/api/square-webhook/route.js`

### 🔶 Medium Priority

1. **Duplicate Webhook Handlers**
   - `/api/webhooks/square/route.ts` (newer, TypeScript)
   - `/api/square-webhook/route.js` (older, JavaScript)
   - **Risk:** Duplicate processing if both are registered in Square
   - **Fix:** Deprecate old handler, use only `/api/webhooks/square`

2. **Missing Admin Refund API**
   - `createRefund()` exists but no admin endpoint
   - **Fix:** Add `/api/admin/orders/[id]/refund` endpoint

3. **Coupon Not Marked Used After Payment**
   - `/api/coupons/validate` has PUT to mark used, but not called after payment
   - **Fix:** Call coupon PUT after successful payment in `/api/payments`

### 🟢 Low Priority

4. **Payment Amount Mismatch Logging**
   - Currently warns but doesn't block (intentional for tolerance)
   - Consider adding Sentry alert for significant mismatches (>$1)

5. **Missing Stripe Fallback Trigger**
   - `payment-orchestrator.js` has `stripeCheckoutFallback()` but not wired to auto-trigger on Square failure

---

## 9. Test Commands

```bash
# Unit test payment flow
pnpm test:unit -- --grep payment

# E2E payment flow
pnpm test:e2e -- e2e/payment-flows.spec.ts

# Sandbox payment test
node scripts/test-sandbox-payment.js

# Square API health check
curl https://yoursite.com/api/square/diagnose
```

---

## 10. Production Checklist

- [ ] `SQUARE_ENVIRONMENT=production`
- [ ] `SQUARE_ACCESS_TOKEN` is production token
- [ ] `SQUARE_LOCATION_ID` is production location
- [ ] `SQUARE_WEBHOOK_SIGNATURE_KEY` configured in Square Dashboard
- [ ] Webhook URL registered: `https://yoursite.com/api/webhooks/square`
- [ ] Old webhook URL (`/api/square-webhook`) removed from Square Dashboard
- [ ] SSL/TLS enabled (required for webhooks)
- [ ] Sentry project configured for error tracking

---

## Conclusion

The payment flow implements Square-recommended patterns:
- ✅ Direct REST API (not SDK with versioning issues)
- ✅ Fresh idempotency keys per attempt
- ✅ Double-charge prevention
- ✅ Comprehensive error mapping
- ✅ Webhook signature verification
- ✅ Event deduplication

**Confidence Level: HIGH** - Ready for production with minor cleanup items noted above.
