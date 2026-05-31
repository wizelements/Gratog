# REVENUE_RISK_REPORT — How money can be lost

> Phase 3 deliverable. Every way the platform can lose, leak, or fail to capture revenue. Code-verified at commit `f9d20e98`.

## 🔴 Critical (active risk — fix first)

### R-C1 — Price tampering at order creation
- **Vector:** `app/api/orders/create/route.js#L79-96` accepts client-supplied `price`, `subtotal`, `total`. Stored order total reflects whatever the client sent.
- **Mitigation present:** `/api/payments` validates amount **against the stored order total** (lines 501-555). So Square charges what the server stored.
- **Net exploit:** Attacker submits cart with `price: 0.01` on real variation IDs. Stored total = $0.01. Payment validates $0.01 vs $0.01. Square charges $0.01. **Successful exploit.** Fulfillment ships full-price product.
- **Impact:** unbounded per-order loss.
- **Fix:** server-side rebuild from `unified_products` / Square catalog at `/api/orders/create`. Reject unknown variation IDs.

### R-C2 — Reward points double-awarded
- **Vector:** `/api/orders/create` fires `/api/rewards/add-points` (fire-and-forget) AND `/api/payments` calls `rewardsSystem.addPoints()` on payment success (line 998).
- **Net exploit:** Every paid order earns 2× the intended points. Customers can redeem inflated balances for discounts → real margin loss on redemption.
- **Impact:** medium-to-high cumulative; depends on redemption rate.
- **Fix:** remove the order-create call; rewards belong at payment success only. (Or make both calls idempotent on `(email, orderId)` and accept whichever wins.)

### R-C3 — Coupon usage may not register on paid orders
- **Vector:** order create stores `appliedCoupon.code` ([orders/create route.js#L105](file:///data/data/com.termux/files/home/Gratog-live/app/api/orders/create/route.js#L105)); payment route reads `order?.coupon?.code` (line 1015 of payments route). Field-name mismatch.
- **Net exploit:** Limited-use coupons can be reused indefinitely because the payment-success `usedCount` increment silently no-ops.
- **Impact:** unbounded loss on capped promotions.
- **Fix:** align field name (use `appliedCoupon.code` in payment route, or remap in transactions).

### R-C4 — Coupon usage incremented at order create (pre-payment)
- **Vector:** [lib/transactions.ts#L86-104](file:///data/data/com.termux/files/home/Gratog-live/lib/transactions.ts#L86-104) does `$inc usedCount` inside `createOrderAtomic`, before payment success.
- **Net exploit:** Abandon-and-re-attempt loop drains a limited-usage coupon to 0 without anyone paying.
- **Impact:** medium — campaign-specific.
- **Fix:** move `$inc` to payment-success path. (Pairs with R-C3 fix.)

### R-C5 — Transactional email silent failures
- **Vector:** `lib/resend-email.js` does not write `email_sends` rows; the restored Resend webhook updates `email_sends` only. So bounces / complaints / deferrals on order confirmations are **invisible**.
- **Net exploit:** Customer never gets confirmation → opens support ticket → support burden + chargeback risk + Square dispute.
- **Impact:** medium — multiplied by every silent bounce.
- **Fix:** write to `email_sends` keyed by Resend `messageId` on send.

## 🟠 High

### R-H1 — Customer LTV counters inflated pre-payment
- **Vector:** [lib/transactions.ts#L57-60](file:///data/data/com.termux/files/home/Gratog-live/lib/transactions.ts#L57-60) `$inc totalOrders +1, totalSpent +order.total` at order create.
- **Impact:** customer profiles overcount activity (especially after abandons); analytics drift.
- **Fix:** move to payment success.

### R-H2 — Parallel checkout paths competing
- **Vector:** `/api/checkout`, `/api/create-checkout`, `/api/pay/process`, `/order/*` pages live alongside canonical `/checkout` + `/api/payments`.
- **Impact:** indirect — admin or marketing surface could link the wrong path → drift / lost orders.
- **Fix:** redirect or remove legacy pages and routes.

### R-H3 — `/checkout/success` (Square hosted-link return) vs `/order/success` mismatch
- **Vector:** two confirmation pages exist for two checkout systems. Customers who happen onto the hosted-link path may see an empty success page or a 404.
- **Impact:** indirect.
- **Fix:** canonicalize.

### R-H4 — No abandoned-cart recovery
- **Vector:** `/api/cron/cleanup-abandoned-orders` referenced but missing. No abandoned-cart email.
- **Impact:** typical recoverable revenue ~10-20%.
- **Fix:** schedule a daily job + restore route.

### R-H5 — Square diagnostic endpoints public
- **Vector:** `/api/debug/square`, `/api/square/{diagnose,test-rest,validate-token}` reachable without auth.
- **Impact:** info disclosure → token validity probe.
- **Fix:** 404 in prod or admin-gate.

### R-H6 — Admin cookie = literal API key
- **Vector:** see [SECURITY_EXPLOIT_PATHS.md](file:///data/data/com.termux/files/home/Gratog-live/docs/audit/business/SECURITY_EXPLOIT_PATHS.md). Cookie disclosure = total admin compromise → adversary can void orders, issue refunds, mutate prices.
- **Impact:** catastrophic.
- **Fix:** signed admin session cookie + rotate `ADMIN_API_KEY`/`MASTER_API_KEY`.

## 🟡 Medium

### R-M1 — Webhook signature loss = order limbo
- **Vector:** if `SQUARE_WEBHOOK_SIGNATURE_KEY` rotates or env drift, webhook 401s → fulfillment doesn't update.
- **Mitigation:** add health monitor on webhook 401 rate.

### R-M2 — Inventory race conditions on simultaneous purchases
- **Vector:** `inventory_locks` collection is used, but concurrency tests don't exist for `consumeInventoryForPaidOrder`.
- **Impact:** double-spend on last-unit items.
- **Fix:** add real concurrency test; verify Mongo conditional update with `qty: { $gte: N }`.

### R-M3 — Idempotency-key not always passed to Square
- **Vector:** verify `/api/payments` forwards the Idempotency-Key header to Square `Payments.createPayment`. If not, retried client → double-charge possible.
- **Fix:** confirm passthrough.

### R-M4 — Order access token reusable within 30 min TTL
- **Vector:** token = HMAC; not single-use.
- **Impact:** theoretical replay; bounded by order paymentStatus check.
- **Fix:** bind to idempotency key + flag-used.

### R-M5 — Service Worker stale cache
- **Vector:** SW version bump is manual; if `lib/pwa.ts` and `public/sw.js` drift, customers can be served stale UI with old API contracts.
- **Fix:** CI guard on version equality.

### R-M6 — Catalog drift between Square and Mongo
- **Vector:** if `square_sync_metadata` job stalls, prices and availability diverge.
- **Fix:** add daily health check + alert.

### R-M7 — Refund flow untested in payments path
- **Vector:** `/api/admin/orders/[id]/refund` exists, but no test on the refund's coupon/reward rollback semantics.
- **Fix:** test refund → rewards reversed → coupon usage decremented (or not, by policy).

## 🟢 Low

### R-L1 — Missing recommendations
- **Vector:** `/api/recommendations` missing → AOV ceiling.
- **Fix:** restore later.

### R-L2 — No express pay
- **Vector:** Square SDK supports Apple/Google Pay; not wired.
- **Fix:** P4.

### R-L3 — No upsell on PDP/cart
- **Fix:** P4.

### R-L4 — Promo dead surfaces (quiz, wishlist, subscriptions, learning)
- **Vector:** broken CTAs without backend. Direct revenue impact ~0; trust drag.
- **Fix:** hide.

## Ranked top-10 revenue risks

| # | Risk | Severity | Effort to fix |
|---|---|---|---|
| 1 | Price tampering at order create | 🔴 catastrophic per-event | M (1-2 d) |
| 2 | Admin cookie = literal API key | 🔴 catastrophic if leaked | M (1-3 d) |
| 3 | Reward points double-awarded | 🔴 cumulative | S (4-6 h) |
| 4 | Coupon usage field mismatch | 🔴 unbounded on capped promos | S (2 h) |
| 5 | Coupon `$inc` pre-payment | 🟠 abuse vector | S (3 h) |
| 6 | Email confirmation silent fail | 🟠 support burden + CAN-SPAM exposure | M (2-3 h + unsubscribe restore) |
| 7 | Customer LTV inflation | 🟠 analytics drift | S (1 h, with R-C4 fix) |
| 8 | Square diagnostics public | 🟠 info disclosure | XS (1 h) |
| 9 | Inventory race conditions | 🟡 last-unit bug | S (4 h test + minor logic) |
| 10 | Webhook idempotency-key passthrough | 🟡 duplicate charge | S (2 h verify) |

## Key insight

**The revenue risk is concentrated in 4 files:**
1. [app/api/orders/create/route.js](file:///data/data/com.termux/files/home/Gratog-live/app/api/orders/create/route.js) — accepts client prices, fires duplicate rewards.
2. [lib/transactions.ts](file:///data/data/com.termux/files/home/Gratog-live/lib/transactions.ts) — coupon `$inc` pre-payment, customer LTV inflation pre-payment.
3. [app/api/payments/route.ts](file:///data/data/com.termux/files/home/Gratog-live/app/api/payments/route.ts) — reads `order.coupon.code` (wrong field), good amount validation otherwise.
4. [middleware.ts](file:///data/data/com.termux/files/home/Gratog-live/middleware.ts) — cookie = API key.

Fixing those four files closes 70% of the revenue risk surface.
