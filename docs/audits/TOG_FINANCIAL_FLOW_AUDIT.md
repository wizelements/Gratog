# TOG Financial Flow Audit

**Audit Date:** June 3, 2026  
**Scope:** Payment processing, pricing logic, revenue tracking, and financial risk assessment  
**Risk Level:** MEDIUM — dual pricing logic and multiple payment routes need consolidation

---

## Executive Summary

Square is the sole payment processor with proper environment/token validation. The canonical payment flow works: order creation → Web Payments SDK tokenization → payment processing. However, **4 separate payment API routes** exist, **dual pricing logic** lives in `lib/pricing.ts` and `lib/cart-pricing.ts`, and demo products have hardcoded prices that may not match the Square catalog. Idempotency support, rate limiting, and telemetry are all properly implemented.

---

## Payment Architecture

### Square Integration

**File:** `lib/square.ts`

| Config | Value |
|--------|-------|
| Payment processor | Square (sole processor) |
| SDK | `square` npm package — `SquareClient`, `SquareEnvironment` |
| Environments | `production` and `sandbox` |
| Token validation | ✅ Validates token format on client creation |
| Token/env mismatch detection | ✅ Detects sandbox token with production env (and vice versa) |
| Error handling | Throws on missing token, invalid environment, or mismatch |

```
Token Validation Logic (lib/square.ts):
  - Empty token → Error
  - Invalid environment (not 'production'|'sandbox') → Error
  - Sandbox token (starts with 'sandbox-') + production env → Error
  - Production token (starts with 'EAAA'|'sq0atp-') + sandbox env → Warning
```

### Canonical Payment Flow

```
Customer Flow:
  1. Browse products → Add to cart
  2. POST /api/orders/create → Creates MarketOrder in MongoDB
  3. Square Web Payments SDK tokenizes card client-side
  4. POST /api/payments → Processes payment with Square
  5. Order status updated: PENDING → PAID
  6. Redirect to success page
```

### Deprecated Routes

| Route | Status | Implementation |
|-------|--------|---------------|
| `/api/checkout` | 410 Gone | Properly deprecated — returns 410 status |

---

## Payment API Routes (Consolidation Needed)

**⚠️ 4 separate payment-related API routes exist:**

| Route | File | Purpose |
|-------|------|---------|
| `/api/payments` | `app/api/payments/route.ts` | Primary payment processing |
| `/api/pay-flow/payment` | `app/api/pay-flow/payment/` | Alternate payment flow |
| `/api/pay/process` | `app/api/pay/process/` | Standalone payment processing |
| `/api/payments/square` | `app/api/payments/square/` | Square-specific payment route |

**Risk:** Multiple routes handling payment could lead to inconsistent behavior, duplicate charges, or missed validation. Only **one** canonical payment route should exist.

---

## Pricing Logic (Dual Sources)

**⚠️ Two pricing modules exist:**

| File | Purpose | Risk |
|------|---------|------|
| `lib/pricing.ts` | General pricing logic | May diverge from cart pricing |
| `lib/cart-pricing.ts` | Cart-specific pricing | May diverge from general pricing |
| `lib/delivery-pricing.js` | Delivery-specific pricing | Additional pricing surface |

**Additional pricing surface:**
- `/api/cart/price` — Cart pricing API route

**Risk:** Price calculations in `lib/pricing.ts`, `lib/cart-pricing.ts`, and the Square catalog could produce different totals for the same products. No single source of truth for product pricing.

---

## Preorder Rules

**File:** `lib/preorder/rules.ts`

| Rule | Value | Implementation |
|------|-------|---------------|
| Non-boba minimum | $60.00 | `PREORDER_RULES.NON_BOBA_MINIMUM_CENTS = 6000` |
| Boba max quantity | 2 items | `PREORDER_RULES.BOBA_MAX_QTY = 2` |
| Tax rate | 0% | `PREORDER_RULES.TAX_RATE = 0` (market sales, no tax collected) |
| Saturday market cutoff | Friday 6:00 PM | `cutoffDay: 'Friday', cutoffHour: 18` |
| Sunday market cutoff | Saturday 6:00 PM | `cutoffDay: 'Saturday', cutoffHour: 18` |

---

## Order Model

**File:** `models/MarketOrder.ts`

### Financial Fields

| Field | Type | Required |
|-------|------|----------|
| `subtotal` | Number | Yes |
| `tax` | Number | No (default: 0) |
| `total` | Number | Yes |
| `paymentStatus` | Enum | Yes |
| `paymentMethod` | Enum | Yes |
| `squareOrderId` | String | No |

### Payment Statuses

```
PENDING → PAID → (optional) REFUNDED
         ↘ FAILED
```

### Payment Methods

| Method | Use case |
|--------|----------|
| `SQUARE_ONLINE` | Card payment via Web Payments SDK |
| `CASH` | Cash at market |
| `VENMO` | Venmo transfer |
| `PAY_AT_PICKUP` | Deferred payment at market pickup |

### Order Statuses

```
PENDING_PAYMENT → PENDING_CONFIRMATION → CONFIRMED → PREPARING → READY → PICKED_UP
                                                                         ↘ CANCELLED
                                                                         ↘ REFUNDED
```

---

## Refund Handling

| Route | Purpose |
|-------|---------|
| `/api/admin/orders/[id]/refund` | Admin-initiated refund for specific order |
| `/api/payments/refund` | General refund API |

Both routes exist — should verify they use the same refund logic through Square.

---

## Additional Financial Features

### Coupon System

| Route | Purpose |
|-------|---------|
| `/api/coupons/validate` | Validate coupon code at checkout |
| `/api/coupons/create` | Admin coupon creation |
| Admin UI at `/admin/coupons` | Coupon management interface |

### Subscription System

| File | Purpose | Status |
|------|---------|--------|
| `lib/subscription-tiers.js` | Subscription tier definitions | Exists |
| `lib/subscription-access.ts` | Subscription access control | Exists |
| `lib/subscription-practical.ts` | Practical subscription utilities | Exists |

**Status:** Subscription infrastructure exists but activation is unclear. Look for `FEATURE_SUBSCRIPTIONS_ENABLED` env flag.

### Returns

| Route | Purpose |
|-------|---------|
| `/api/returns/create` | Create a return request |

---

## Risks

### RISK 1: Demo/Hardcoded Prices (MEDIUM)

Demo products may have hardcoded prices (e.g., $35, $28) that don't match Square catalog prices. When products are synced from Square via `lib/product-sync-engine.js`, local hardcoded prices could override or conflict.

### RISK 2: Multiple Payment Routes (MEDIUM)

4 payment API routes increase the attack surface and risk of inconsistent validation. A payment processed through `/api/pay/process` may not apply the same validation as `/api/payments`.

### RISK 3: Dual Pricing Logic (MEDIUM)

`lib/pricing.ts` and `lib/cart-pricing.ts` existing side-by-side means a price change must be updated in multiple places. Risk of cart showing one price, checkout charging another.

### RISK 4: Revenue Calculation (LOW)

Admin dashboard revenue appears to be calculated client-side from all orders without date filtering or pagination. As order volume grows, this becomes inaccurate (no date range) and slow (no pagination).

### RISK 5: Price Audit Trail (LOW)

No clear mechanism for tracking when product prices change, who changed them, or what the previous price was.

---

## Verified Safe

| Feature | File | Assessment |
|---------|------|-----------|
| Square client token validation | `lib/square.ts` | ✅ Validates format, detects mismatches |
| Idempotency support | `lib/idempotency.ts`, `lib/redis-idempotency.ts` | ✅ Prevents duplicate payments |
| Rate limiting | `lib/rate-limit.ts` | ✅ Protects payment endpoints |
| Payment telemetry | `lib/checkout-telemetry.ts` | ✅ Tracks payment flow metrics |
| Sandbox detection | `lib/sandbox-detection.js` | ✅ Warns on sandbox in production |
| Deprecated route handling | `/api/checkout` → 410 | ✅ Clean deprecation |

---

## Recommendations

### Critical (Financial Integrity)
1. **Consolidate to ONE payment API route** — deprecate `/api/pay-flow/payment`, `/api/pay/process`, `/api/payments/square` with 410s pointing to `/api/payments`
2. **Single pricing module** — merge `lib/pricing.ts` and `lib/cart-pricing.ts` into one source of truth
3. **Eliminate hardcoded demo prices** — all prices should come from Square catalog sync

### High Priority (Accuracy)
4. **Add date-range filtering to admin revenue** — dashboard should show today/week/month/custom
5. **Server-side revenue aggregation** — don't calculate totals client-side from all orders
6. **Verify refund routes use same logic** — both `/api/admin/orders/[id]/refund` and `/api/payments/refund` should call the same Square refund function

### Medium Priority (Audit Trail)
7. **Add price change logging** — track product price history
8. **Add payment route logging** — log which route processed each payment for debugging
9. **Clarify subscription status** — either activate with proper billing or remove dead code

---

## Evidence Files

| File | Relevance |
|------|-----------|
| `lib/square.ts` | Square client creation with token/env validation |
| `lib/preorder/rules.ts` | Preorder rules, minimums, cutoffs, tax rate |
| `lib/pricing.ts` | General pricing logic |
| `lib/cart-pricing.ts` | Cart-specific pricing logic |
| `lib/delivery-pricing.js` | Delivery pricing |
| `lib/idempotency.ts` | Idempotency key management |
| `lib/redis-idempotency.ts` | Redis-backed idempotency |
| `lib/rate-limit.ts` | Rate limiting |
| `lib/checkout-telemetry.ts` | Payment flow telemetry |
| `lib/sandbox-detection.js` | Sandbox environment detection |
| `lib/product-sync-engine.js` | Square catalog sync engine |
| `lib/subscription-tiers.js` | Subscription tier definitions |
| `lib/subscription-access.ts` | Subscription access control |
| `lib/subscription-practical.ts` | Subscription utilities |
| `models/MarketOrder.ts` | Order model with financial fields |
| `app/api/payments/route.ts` | Primary payment route |
| `app/api/pay-flow/payment/` | Alternate payment flow |
| `app/api/pay/process/` | Standalone payment processing |
| `app/api/payments/square/` | Square-specific payment |
| `app/api/payments/refund/` | Refund processing |
| `app/api/admin/orders/[id]/refund/` | Admin refund route |
| `app/api/coupons/validate/` | Coupon validation |
| `app/api/coupons/create/` | Coupon creation |
| `app/api/returns/create/` | Returns processing |
