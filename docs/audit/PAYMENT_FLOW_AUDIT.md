# PAYMENT_FLOW_AUDIT — Gratog Platform

> Code-verified at commit `f9d20e98`. Sources: `app/checkout/page.tsx`, `components/checkout/*`, `app/api/orders/create/route.js`, `app/api/payments/route.ts`, `lib/transactions.ts`, `lib/custom-inventory.js`, `app/api/webhooks/square/route.ts`.

## 1. Sequence diagram — canonical guest checkout

```diagram
 Browser                Next.js API              MongoDB              Square             Resend
   │                        │                       │                   │                  │
   │  add to cart           │                       │                   │                  │
   │  (stores/cart.ts,      │                       │                   │                  │
   │   localStorage)        │                       │                   │                  │
   │                                                                                       │
   │  GET /api/cart/price                                                                   │
   ├──────────────────────▶ │   read products, coupons                                      │
   │                        │ ─────────────────────▶│                                       │
   │ ◀──── totals ───────── │                                                               │
   │                                                                                       │
   │  POST /api/inventory/lock                                                              │
   ├──────────────────────▶ │   create inventory_locks                                      │
   │                        │ ─────────────────────▶│                                       │
   │                                                                                       │
   │  POST /api/orders/create  (idempotency-key header)                                     │
   ├──────────────────────▶ │                                                               │
   │                        │  createOrderAtomic (withTransaction)                          │
   │                        │   INSERT orders                                               │
   │                        │   UPSERT customers ($inc totals)                              │
   │                        │   $inc coupons.usedCount (if applied)                         │
   │                        │ ─────────────────────▶│                                       │
   │                        │                                                               │
   │                        │  awardRewardPointsWithRetry (async, fire-and-forget)         │
   │                        │   fetch /api/rewards/add-points  (Bearer MASTER_API_KEY)     │
   │                        │     UPSERT rewards (idempotent on email+orderId)              │
   │                        │ ─────────────────────▶│                                       │
   │ ◀── 200 {order, orderAccessToken (HMAC, 30m)} ─                                        │
   │                                                                                       │
   │  Tokenize card via Square Web Payments SDK                                             │
   │  → returns token + verificationToken                                                   │
   │                                                                                       │
   │  POST /api/payments  (Authorization: orderAccessToken)                                 │
   ├──────────────────────▶ │                                                               │
   │                        │  verifyOrderAccessToken                                       │
   │                        │  payments.createPayment                                       │
   │                        │ ──────────────────────────────────────▶ Square                │
   │                        │ ◀────────── payment.id, status ──────  │                     │
   │                        │  consumeInventoryForPaidOrder                                 │
   │                        │   UPDATE inventory $inc qty -N                                │
   │                        │   DELETE inventory_locks                                      │
   │                        │  UPDATE orders set paymentStatus='paid'                       │
   │                        │ ─────────────────────▶│                                       │
   │                        │                                                               │
   │                        │  send order confirmation email (lib/resend-email.js)          │
   │                        │ ───────────────────────────────────────────────────────────▶ │
   │ ◀── 200 {paymentId} ───                                                                │
   │                                                                                       │
   │  redirect /order/success?orderRef=…&token=…&paid=true                                  │
   │                                                                                       │
   │                                                                                       │
   │     Async: Square sends payment.updated webhook                                        │
   │                        │ ◀──────────────────── /api/webhooks/square                    │
   │                        │  verify HMAC, dedupe via webhook_events_processed             │
   │                        │  UPDATE orders fulfillment status                             │
   │                                                                                       │
   │     Async: Resend sends delivered/bounced webhook                                      │
   │                        │ ◀──────────────────── /api/webhooks/resend                    │
   │                        │  verify HMAC, UPDATE email_sends                              │
   │                        │  ⚠ email_sends has no row for transactional sends            │
   │                                                                                       │
```

## 2. Failure points (verified)

| # | Step | Failure mode | Recovery |
|---|---|---|---|
| F1 | `POST /api/orders/create` | Route was 404 prior to `970daff0` (file misnamed `route-atomic.js`) | ✅ Restored |
| F2 | `createOrderAtomic` | `withTransaction` requires replicaset; standalone Mongo dev → throws | Use replicaset or single-doc fallback |
| F3 | `awardRewardPointsWithRetry` | If `NEXT_PUBLIC_BASE_URL` unset or `MASTER_API_KEY` unset → returns `{skipped:true}` silently | Inline call instead of HTTP self-fetch |
| F4 | `POST /api/payments` | Guest without `orderAccessToken` header → 401 UNAUTHORIZED_PAYMENT_ACCESS (fixed by `e1750aac`) | ✅ Fixed |
| F5 | Inventory consume | `lib/custom-inventory.js` had MongoDB v6 `.value` bug (fixed in `970daff0`) | ✅ Fixed |
| F6 | Confirmation email | `lib/resend-email.js` failure logged but doesn't fail the request | Tolerable, but no retry queue |
| F7 | `email_sends` write | Transactional path skips writing `email_sends` → delivery webhook can't update | ❌ Open — see EMAIL audit |
| F8 | Square webhook signature mismatch | Drops update; order stuck in `paid` but no fulfillment | Manual reconciliation via `/api/admin/orders` |
| F9 | Parallel checkout systems | `/api/checkout`, `/api/pay/process`, `/api/create-checkout` still live → admin may surface wrong link | Deprecate or hard-redirect |
| F10 | Coupon `$inc usedCount` | Coupon decrement happens at order create, **before payment**. If payment fails, the coupon usage isn't rolled back → wasted redemption. | Move to payment-success path. |

## 3. Idempotency

- `idempotency_keys` collection backs `withIdempotency` ([lib/idempotency.ts](file:///data/data/com.termux/files/home/Gratog-live/lib/idempotency.ts)).
- Order create accepts `Idempotency-Key` header; reuses 24 h.
- Rewards add-points is idempotent on `(email, orderId)`.
- ⚠️ Square payment route — verify idempotency key passed to Square `Payments.createPayment` (Square SDK requires `idempotency_key`).

## 4. Webhook dependencies

| Webhook | Updates | Risk if delayed/lost |
|---|---|---|
| `payment.updated` (Square) | `orders.paymentStatus` reconciliation | Order stays in pre-fulfillment limbo |
| `order.fulfillment.updated` (Square) | `orders.status`, vendor queue | Customer not notified |
| `email.sent / delivered / bounced / complained` (Resend) | `email_sends` | Bounce rate untracked; reputation risk |

## 5. Database writes triggered by payment flow

| Step | Collection | Operation |
|---|---|---|
| Order create | `orders` | INSERT |
| Order create | `customers` | UPSERT + `$inc` totals |
| Order create | `coupons` | `$inc usedCount` + history push |
| Order create | `rewards` | UPSERT (async) |
| Payment | `inventory` | `$inc -qty` |
| Payment | `inventory_locks` | DELETE |
| Payment | `orders` | UPDATE paymentStatus |
| Webhook | `webhook_events_processed` | UPSERT (dedupe) |
| Webhook | `orders` | UPDATE status |
| Email send | `email_sends` | ⚠️ NOT written by transactional path |

## 6. Test coverage (verified via `tests/` + `__tests__/`)

| Area | Coverage |
|---|---|
| `lib/order-access-token` | unit test present |
| `lib/idempotency` | unit test present |
| `lib/transactions` | indirect — order route test exercises it |
| `app/api/orders/create` | smoke test |
| `app/api/payments` | smoke test |
| Square webhook signature | unit test |
| Resend webhook signature | unit test (restored) |
| E2E full guest checkout | ❌ none with real Square sandbox harness |

## 7. Recommendations (do **not** apply without explicit user OK — this is audit-only)

1. Inline rewards write — drop the self-fetch to `/api/rewards/add-points`.
2. Move coupon `$inc usedCount` to payment-success path.
3. Move transactional email send into `lib/email/service.js` so it writes `email_sends` and gets webhook tracking.
4. Add Square `idempotency_key` from `Idempotency-Key` header passthrough.
5. Add E2E test against Square sandbox in CI.
6. Decommission `/api/checkout`, `/api/create-checkout`, `/api/pay/process` if confirmed unused.
