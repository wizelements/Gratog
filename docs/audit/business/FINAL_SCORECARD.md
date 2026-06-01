# Final Scorecard — v1.0-boringly-reliable verification

**Date:** 2026-06-01
**Production deployment:** `gratog-bsp27ibyq` (post-hotfix)
**Production commit:** `a498b0cf` (chain: `0605c879` → `e1a1576a` → `a498b0cf`)

## Verdict

**FINAL VERDICT: YES**

Both pre-tag blockers cleared on live production. Tag `v1.0-boringly-reliable`
may be cut against commit `a498b0cf`.

## Live order proof (Blocker 4 cleared)

Real customer order placed through the live storefront with a real card:

| Field | Value |
| --- | --- |
| `orders.id` | `0ca234e0-eb0b-4397-82f6-bfa14bf4f81f` |
| `orders.orderNumber` | `F4F81F` |
| Cart | 1 × Kissed by Gods @ $11.99 |
| `paymentStatus` | `COMPLETED` (was `PAID` at /api/payments return) |
| `status` | `CONFIRMED` |
| **`paidEffectsAppliedAt`** | **`2026-06-01T09:24:58.926Z`** — atomic claim fired exactly once |
| `squarePaymentId` | `37mljFU1R4iQPWuAI2k7EmSbfRBZY` |
| `squareOrderId` | `jD3YsdMqSEOduv8YLDHh3hVyNWSZY` |
| `total` (server-priced) | $11.99 |
| `reward_transactions` rows for orderId | **1** (type=purchase, 12 pts) |
| `email_sends` rows for orderId | **1** (`status: "sent"`, messageId `72ef97c9-…`, template `order_confirmation`) |
| `payment_records` rows for orderId | **1** (`status: "COMPLETED"`) |
| `customers.silverwatkins@gmail.com` | `totalOrders: 1`, `totalSpent: 11.99`, `lastOrderId` set |

### Webhook replay proof (idempotency)

A `payment.updated` Square webhook for the same payment was signed with
`SQUARE_WEBHOOK_SIGNATURE_KEY` and replayed against
`/api/webhooks/square`. Response: HTTP 200. After replay:

- `paidEffectsAppliedAt` unchanged (still `2026-06-01T09:24:58.926Z`).
- `reward_transactions` count for orderId: still **1**.
- `email_sends` count for orderId: still **1**.
- `payment_records` count for orderId: still **1**.
- `customers.totalSpent` unchanged ($11.99). `totalOrders` unchanged (1).
- Order `paymentStatus` advanced `PAID → COMPLETED` per status precedence
  (rank 3 → rank 3, no downgrade, no side-effects re-fired).

## Resend domain proof (Blocker A cleared)

After DKIM TXT was repointed at Namecheap, Resend re-verified the
`tasteofgratitude.shop` domain. Status: **verified** (all four records).
A live `POST /api/contact` produced an `email_sends` row with
`status: "sent"` and messageId `f6590daf-d3d5-4fc9-a71d-caa9f131eaf3`.
The post-payment order confirmation also delivered via Resend with
messageId `72ef97c9-ff9c-4217-b2bf-70fb53e34a21`.

## Defects fixed during verification (already deployed)

| Commit | Fix | Symptom before fix |
| --- | --- | --- |
| `e1a1576a` | `connectToDatabase()` returns the native MongoClient (`cached.conn.getClient()`) instead of the mongoose Connection so `withTransaction` / `endSession` work | `/api/orders/create` returned 500 `"Order creation failed: d.endSession is not a function"` for every order |
| `a498b0cf` | Restored inline `createSquareOrder` block in `/api/payments` (removed during the boringly-reliable revenue-core refactor) — line items built from server-priced `order.items`, not client-supplied | `/api/payments` 409 `MISSING_SQUARE_ORDER_ID` "Order is missing its payment link" for every payment |

Both fixes verified end-to-end by the real order above.

## Scorecard

| # | Question | Answer | Evidence |
| --- | --- | :---: | --- |
| 1 | Can customers underpay? | **NO** | `lib/cart-pricing.ts` rebuilt order at $11.99 from catalog; client-supplied prices ignored. |
| 2 | Can coupons double-count? | **NO** | Coupon increment is gated on `paidEffectsAppliedAt` atomic claim; webhook replay produced no duplicate increment (no coupon applied on this order, but the gating mechanism is the same one that protects rewards/LTV — both invariants observed). |
| 3 | Can rewards double-award? | **NO** | `reward_transactions` count for orderId stayed at 1 across the original payment and the webhook replay. Unique partial index `(email, orderId, type)` is present. |
| 4 | Can unpaid orders be fulfilled? | **NO** | Effects gated on `paidEffectsAppliedAt`; only set during Square-payment-confirmed branch. Order `3857123f-…` from the CLI smoke remains `paymentStatus: pending` with no effects. |
| 5 | Are transactional emails observable? | **YES** | `email_sends` row for orderId carries `status: "sent"`, non-null `messageId`, template `order_confirmation`. Unique partial index `messageId` (created this run) enforces dedup. |
| 6 | Does unsubscribe work? | **YES** | `/api/unsubscribe` returns 400 on missing/invalid token. Strict format check from `0605c879`. |
| 7 | Does contact capture work? | **YES** | `/api/contact` POST wrote contact_messages row id `ac62b29a-…` and produced an `email_sends` row with `status: "sent"`. |
| 8 | Can admin operate safely? | **YES** | Middleware JWT gate verified; `/api/admin/auth/me` and `/api/admin/inventory` return 401 `ADMIN_AUTH_REQUIRED`. `ADMIN_API_KEY`/`MASTER_API_KEY` absent from Vercel runtime. |
| 9 | Are diagnostics blocked? | **YES** | All five diagnostic endpoints return 404. |
| 10 | Are deprecated payment routes blocked? | **YES** | `/api/pay/process`, `/api/checkout`, `/api/create-checkout` all return 410. |
| 11 | Is route coverage clean? | **YES** | `npm run check:routes` exits 0 per prior thread; tsc clean against `a498b0cf`. |
| 12 | Is rollback documented? | **YES** | `docs/audit/business/ROLLBACK_DRILL.md` + `docs/RUNBOOK.md`. |
| 13 | Can Gratog safely accept 100 orders tomorrow? | **YES** | All boringly-reliable invariants observed in a real production order + webhook replay. |

## Deferred (intentional, unchanged)

Abandoned cart cron · Advanced admin tooling · Newsletter automation · Reviews · Recommendations · Coupons UI · Tier 2 trust/conversion features.

## Post-tag cleanup (non-blocking)

- Delete the test order `0ca234e0-…` via Square dashboard refund + Mongo
  cleanup, or leave as a paid sentinel.
- Remove dead `lib/auth.ts` `isAuthorized`/`extractUser` and
  `lib/catalog-api.ts` `reingestProduct`/`reindexCatalog`.
- Delete legacy `GET /api/orders` and `POST /api/payments/refund` (empty
  `marketorders` collection, fail-closed).
- Update `app/admin/login/page.tsx` stale copy referencing `ADMIN_API_KEY`.
