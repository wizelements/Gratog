# CHECKOUT_TRACE — End-to-end verification

> Phase 4 deliverable. Each step verified against actual code. Findings are evidence-cited.

## Trace

```diagram
 STEP 0  Browser: cart in stores/cart.ts (Zustand → localStorage)
   │
 STEP 1  POST /api/cart/price  (optional preview, server-rebuilt)
   │     → returns server-computed totals
   │     Source: app/api/cart/route.ts + /api/cart/price/route.ts
   │
 STEP 2  POST /api/inventory/lock  (holds stock)
   │     Source: app/api/inventory/lock/route.ts
   │     Effect: inventory_locks row, TTL'd
   │
 STEP 3  POST /api/orders/create  (Idempotency-Key header)
   │     Source: app/api/orders/create/route.js
   │     Effect: INSERT orders, UPSERT customers, $inc coupons.usedCount, async /api/rewards/add-points
   │     Returns: { order: { id, orderAccessToken, pricing: {…} } }
   │
 STEP 4  Square Web Payments SDK tokenizes card client-side
   │
 STEP 5  POST /api/payments   (Authorization: orderAccessToken)
   │     Source: app/api/payments/route.ts
   │     Validates: orderAccessToken, amount-vs-stored-total, idempotency
   │     Calls: Square Payments.createPayment
   │     On success:
   │       1. consumeInventoryForPaidOrder (idempotent on orderId)
   │       2. sendOrderConfirmationEmail (Resend, no email_sends row)
   │       3. claimAndNotifyStaffOrder
   │       4. rewardsSystem.addPoints  ← DUPLICATE with STEP 3
   │       5. coupons.updateOne where order.coupon.code  ← WRONG FIELD NAME
   │
 STEP 6  Square webhook payment.updated  → /api/webhooks/square
   │     Verifies HMAC; deduplicates via webhook_events_processed
   │
 STEP 7  Browser redirect: /order/success?orderRef=…&token=…&paid=true
   │     Source: app/order/success/page.js
   │     Loads: GET /api/orders/by-ref?ref=&token=
   │
 STEP 8  Resend delivery webhook → /api/webhooks/resend
   │     Updates email_sends (which has no row for STEP 5 email)
```

## Step-by-step verification

### STEP 1 — Cart pricing
- **Expected:** Server-authoritative totals.
- **Actual:** Endpoint exists ✅. But not used as authoritative in STEP 3.
- **Evidence:** `app/api/cart/price/route.ts` exists. `app/api/orders/create/route.js#L79-96` re-computes from client-supplied `cart[].price` instead.
- **Failure risk:** 🔴 Price tampering.

### STEP 2 — Inventory lock
- **Expected:** Reserves stock for ~30 min.
- **Actual:** ✅ working.
- **Failure risk:** 🟡 Cleanup cron exists (`/api/cron/cleanup-locks`); abandoned locks released.

### STEP 3 — Order create
- **Expected:** Persist a server-validated order; mint payment authorization token.
- **Actual:** ✅ persists. ❌ trusts client prices. ❌ awards rewards prematurely. ❌ increments coupon usage prematurely. ❌ inflates customer LTV prematurely.
- **Evidence:**
  - Client price trust: [orders/create/route.js#L79-96](file:///data/data/com.termux/files/home/Gratog-live/app/api/orders/create/route.js#L79-L96)
  - Rewards fire: [orders/create/route.js#L207-241](file:///data/data/com.termux/files/home/Gratog-live/app/api/orders/create/route.js#L207-L241)
  - Coupon `$inc` + customer `$inc` pre-payment: [lib/transactions.ts#L46-104](file:///data/data/com.termux/files/home/Gratog-live/lib/transactions.ts#L46-L104)
- **Failure risk:** 🔴 multiple.

### STEP 4 — Card tokenization
- **Expected:** PCI-scope offloaded to Square iframe.
- **Actual:** ✅. Card data never touches Gratog server.
- **Failure risk:** 🟢.

### STEP 5 — Payment processing
- **Expected:** Charge customer the stored authoritative total.
- **Actual:** ✅ server-authoritative amount validation (lines 501-555 reject any mismatch). ✅ inventory consumed idempotently with retry. ✅ confirmation email sent. ❌ rewards double-awarded. ❌ coupon `usedCount` already incremented at STEP 3; coupon `isUsed=true` at STEP 5 fails because of `order.coupon.code` vs `order.appliedCoupon.code` field-name mismatch.
- **Evidence:**
  - Amount validation: [payments/route.ts#L500-560](file:///data/data/com.termux/files/home/Gratog-live/app/api/payments/route.ts#L500-L560)
  - Rewards: [payments/route.ts#L996-1006](file:///data/data/com.termux/files/home/Gratog-live/app/api/payments/route.ts#L996-L1006)
  - Coupon updateOne reads `order.coupon.code`: [payments/route.ts#L1015](file:///data/data/com.termux/files/home/Gratog-live/app/api/payments/route.ts#L1015)
  - Order create stores `appliedCoupon`: [orders/create/route.js#L105](file:///data/data/com.termux/files/home/Gratog-live/app/api/orders/create/route.js#L105)
- **Failure risk:** 🟠 Rewards drift, 🔴 coupon non-tracking.
- **Note:** Two different coupon-tracking schemas coexist — `$inc usedCount` + `usageHistory[]` (transactions.ts) vs `isUsed: true` flag (payments). Pick one.

### STEP 6 — Square webhook reconciliation
- **Expected:** Update order fulfillment status asynchronously.
- **Actual:** ✅ HMAC verified, deduped.
- **Failure risk:** 🟡 If signature key drifts, webhooks silently 401.

### STEP 7 — Success page
- **Expected:** Show confirmation, allow re-load via `orderRef` + `token`.
- **Actual:** ✅ `/api/orders/by-ref` works.
- **Failure risk:** 🟢.

### STEP 8 — Email delivery webhook
- **Expected:** Update `email_sends` row with delivered / bounced / etc.
- **Actual:** Webhook works ✅; but `lib/resend-email.js` never wrote an `email_sends` row, so the webhook event has nothing to update → silently dropped.
- **Failure risk:** 🟠 Operational blindness; CAN-SPAM/Square dispute exposure.

## Failure matrix

| Step | Failure type | Customer-visible? | Revenue impact |
|---|---|---|---|
| 1→3 | Price tamper | ❌ no | 🔴 unbounded |
| 3 | Reward double-award | ❌ no (silent over time) | 🟠 cumulative |
| 3 | Coupon `$inc` pre-payment | ❌ no (cap drains silently) | 🟠 capped-promo loss |
| 3 | Customer LTV inflation | ❌ no | 🟡 analytics |
| 5 | Reward double-award (companion to STEP 3) | — | 🟠 (compounds) |
| 5 | Coupon `isUsed` not set | ❌ no | 🔴 reuse without limit |
| 5 | Email send untracked | ❌ initially; later support tickets | 🟠 operational |
| 6 | Webhook signature failure | possibly (order limbo) | 🟡 reconciliation |

## What does work (verified)

✅ Card data PCI-isolated  
✅ Server-authoritative amount validation at payment  
✅ Idempotent inventory consume with retry  
✅ Idempotent payment (stable key per order)  
✅ Atomic order-status transitions before Square call  
✅ Email deduplication via `emailSentAt` flag  
✅ Order access token (HMAC, 30 m TTL) for guest payments  
✅ Square webhook HMAC verification + dedupe

## What does not work (verified)

❌ Server-side rebuild of cart prices at order creation  
❌ Single-write reward awarding  
❌ Consistent coupon tracking (field name + schema both mismatched)  
❌ Email send tracking (`email_sends` row never inserted by transactional path)  
❌ Pre-payment side effects (coupon usage, customer LTV, rewards) deferred to payment success

## The minimum patch surface

To close every failure in this trace:
1. [app/api/orders/create/route.js](file:///data/data/com.termux/files/home/Gratog-live/app/api/orders/create/route.js) — rebuild prices server-side; remove `awardRewardPointsWithRetry` call.
2. [lib/transactions.ts](file:///data/data/com.termux/files/home/Gratog-live/lib/transactions.ts) — remove pre-payment coupon `$inc` and customer LTV `$inc`; do these in payments route post-success.
3. [app/api/payments/route.ts](file:///data/data/com.termux/files/home/Gratog-live/app/api/payments/route.ts) — read `order.appliedCoupon.code` not `order.coupon.code`; align to single coupon-schema (`$inc usedCount` + history push).
4. [lib/resend-email.js](file:///data/data/com.termux/files/home/Gratog-live/lib/resend-email.js) — write `email_sends` row keyed by Resend `messageId` after send.

Four files. Each change is local. Each has clear validation.
