# API_MASTER_AUDIT — Gratog Platform

> Code-verified at commit `f9d20e98`. Cross-checks 138 referenced API paths against 93 existing route files; identifies 64 referenced-but-missing endpoints.

## Status legend
- ✅ Implemented and called
- ⚠️ Implemented but with caveats (partial, parallel, untested)
- ❌ Referenced but missing
- 🗑️ Implemented but unused

## 1. Critical revenue path (Cart → Pay → Confirm → Email)

| Endpoint | File | Status | Notes |
|---|---|---|---|
| `POST /api/orders/create` | `app/api/orders/create/route.js` | ✅ | Restored. Mints HMAC `orderAccessToken` (30 m TTL). Subtotal/total auto-computed if missing. Validates customer + cart non-empty. Calls `createOrderAtomic` ([lib/transactions.ts](file:///data/data/com.termux/files/home/Gratog-live/lib/transactions.ts)) and triggers async `/api/rewards/add-points`. |
| `GET /api/orders/by-ref` | `app/api/orders/by-ref/route.js` | ✅ | Restored. Used by `/order/success` to look up an order by reference (`orderRef`, `id`, or `TOG-…`). |
| `POST /api/payments` | `app/api/payments/route.ts` | ✅ | Square card-on-file payment using token + verificationToken. Requires `orderAccessToken` for guest checkout. |
| `POST /api/payments/square` | `app/api/payments/square/route.ts` | ⚠️ | Alternate entrypoint; check for duplication with `/api/payments`. |
| `POST /api/pay/process` | `app/api/pay/process/route.ts` | ⚠️ | "Pay Flow" alternate; powers `/order/*` parallel UX. |
| `POST /api/payments/refund` | `app/api/payments/refund/route.ts` | ✅ | Admin-triggered. |
| `POST /api/inventory/lock` | `app/api/inventory/lock/route.ts` | ✅ | Holds stock prior to payment. |
| `POST /api/inventory/confirm` | `app/api/inventory/confirm/route.ts` | ✅ | Consumes lock after payment. |
| `POST /api/inventory/release` | `app/api/inventory/release/route.ts` | ✅ | Releases unfilled locks (cron). |
| `POST /api/webhooks/square` | `app/api/webhooks/square/route.ts` | ✅ | Validates `SQUARE_WEBHOOK_SIGNATURE_KEY`. |
| `POST /api/webhooks/resend` | `app/api/webhooks/resend/route.js` | ✅ | Restored. Updates `email_sends` based on Resend delivery events. |
| `POST /api/rewards/add-points` | `app/api/rewards/add-points/route.js` | ✅ | Restored. Internal-only (Bearer master/admin key). Idempotent on `(email,orderId)`. |
| `GET /api/user/rewards` | `app/api/user/rewards/route.js` | ✅ | Restored. |
| `GET /api/rewards/passport` | `app/api/rewards/passport/route.js` | ✅ | Restored. |
| `POST /api/queue/join` | `app/api/queue/join/route.js` | ✅ | Restored. |
| `GET /api/queue/position/[id]` | `app/api/queue/position/[id]/route.js` | ✅ | Restored. |
| `GET /api/ics/market-route` | `app/api/ics/market-route/route.js` | ✅ | Restored. ICS calendar export. |
| `POST /api/checkout` | `app/api/checkout/route.ts` | ⚠️ | Generic — verify whether deprecated by `/api/orders/create` + `/api/payments`. |
| `POST /api/create-checkout` | `app/api/create-checkout/route.ts` | ⚠️ | Square hosted-link path. |

**Verdict:** Canonical revenue path (`/checkout → /api/orders/create → /api/payments → /order/success → confirmation email`) is intact.

## 2. Admin APIs (22 existing)

| Endpoint | Status |
|---|---|
| `/api/admin/analytics` | ✅ |
| `/api/admin/auth/{csrf,login,logout,me}` | ✅ |
| `/api/admin/campaigns` (+ `/send`) | ✅ — but `/generate`, `/test` referenced and ❌ missing |
| `/api/admin/coupons` (+ `[id]`) | ✅ |
| `/api/admin/customers` (+ `[id]`) | ✅ |
| `/api/admin/emergency-init`, `/setup`, `/markets`, `/markets/seed` | ✅ |
| `/api/admin/inventory/[productId]` | ✅ — but list `/api/admin/inventory` ❌ missing |
| `/api/admin/notifications` | ✅ — but `/broadcast`, `/market-day`, `/new-product`, `/send`, `/stats` ❌ missing |
| `/api/admin/orders` (+ `[id]/refund`) | ✅ — but `/sync`, `/update-status` ❌ missing |
| `/api/admin/products` (+ `[id]`) | ✅ |
| `/api/admin/reviews` | ✅ |

## 3. Customer/User APIs

| Endpoint | Status |
|---|---|
| `/api/auth/register` | ❌ missing (referenced from `/register`) |
| `/api/auth/reset-password` | ❌ missing |
| `/api/customer/profile` | ✅ |
| `/api/user/profile` | ❌ missing |
| `/api/user/orders` | ❌ missing |
| `/api/user/favorites` | ❌ missing |
| `/api/user/stats` | ❌ missing |
| `/api/user/challenge`, `/api/user/challenge/checkin` | ❌ missing |
| `/api/user/email-preferences` | ❌ missing |
| `/api/user/rewards` | ✅ |
| `/api/contact` | ❌ missing |
| `/api/newsletter/subscribe`, `/api/nurture/subscribe`, `/api/unsubscribe` | ❌ missing |
| `/api/reviews`, `/api/reviews/helpful` | ❌ missing |
| `/api/quiz/{submit,results,recommendations}` | ❌ missing |
| `/api/coupons/create`, `/api/coupons/validate` | ❌ missing |
| `/api/waitlist` | ❌ missing |
| `/api/ugc/submit` | ❌ missing |

## 4. Notifications APIs

| Endpoint | Status |
|---|---|
| `/api/notifications` | ✅ |
| `/api/notifications/{location,preferences,subscribe,test,unsubscribe}` | ❌ missing |

## 5. Cron APIs

| Endpoint | Status |
|---|---|
| `/api/cron/cleanup-locks` | ✅ |
| `/api/cron/daily-report` | ✅ |
| `/api/cron/cleanup-abandoned-orders` | ❌ missing — referenced in `vercel.json` or admin UI |

## 6. Storefront/catalog APIs

| Endpoint | Status |
|---|---|
| `/api/products` | ✅ |
| `/api/catalog` | ✅ |
| `/api/storefront/catalog` | ✅ |
| `/api/storefront/square-catalog` | ✅ |
| `/api/search/enhanced` | ✅ |
| `/api/instagram/{posts,sync,post/[slug]}` | ✅ |
| `/api/cart`, `/api/cart/price` | ✅ |
| `/api/markets`, `/api/market/today` | ✅ |
| `/api/preorder`, `/api/preorder/status` | ✅ |
| `/api/shipping/rates` | ✅ |
| `/api/subscriptions` | ✅ (list); `/plans` ❌ missing |
| `/api/returns/create` | ✅; `/api/returns` ❌ missing |

## 7. Gratitude (loyalty) APIs — 8/8 present

`/api/gratitude/{account,earn,redeem,referral/code,referral/track,rewards,transactions,webhook}` — all ✅.

## 8. Square diagnostics

`/api/square/{config,diagnose,test-rest,validate-token}` — all ✅. Suggest gating these behind admin auth (currently public per file inspection).

## 9. Health/observability

| Endpoint | Status |
|---|---|
| `/api/health` | ✅ |
| `/api/health/payments` | ✅ |
| `/api/errors/list`, `/api/errors/summary` | ✅ |
| `/api/csp-report` | ✅ (must remain public) |
| `/api/analytics`, `/api/analytics/web-vitals` | ✅ |
| `/api/error-report` | ❌ missing |
| `/api/tracking/user` | ❌ missing |
| `/api/transactions/log`, `/api/transactions/stats` | ❌ missing |

## 10. OAuth / integrations

`/api/oauth/square/{authorize,callback,status}` — all ✅.

## 11. Issues to flag (verified)

1. **Parallel checkout systems** — `/api/orders/create` + `/api/payments` (canonical) vs `/api/checkout` + `/api/create-checkout` + `/api/pay/process` (alternate "Pay Flow"). Live frontend uses canonical; the alternate is stale and a risk vector.
2. **Internal token fan-out** — `awardRewardPointsWithRetry` in `app/api/orders/create/route.js#L207-241` fetches `${NEXT_PUBLIC_BASE_URL}/api/rewards/add-points` with `MASTER_API_KEY`. If `NEXT_PUBLIC_BASE_URL` is empty or mis-set the call hits relative URL on a non-browser process → reward awards silently fail.
3. **`/api/admin/inventory` list missing** — but `/api/admin/inventory/[productId]` exists. The admin inventory page UI breaks listing view.
4. **Webhook tracking gap** — `lib/resend-email.js` does not write to `email_sends` (only `lib/email/service.js`'s `email_queue` / `email_logs`). The just-restored webhook updates `email_sends`, so emails sent via `lib/resend-email.js` (order confirmations, password resets) won't have delivery events tracked. See [EMAIL_SYSTEM_AUDIT.md](file:///data/data/com.termux/files/home/Gratog-live/docs/audit/EMAIL_SYSTEM_AUDIT.md).
5. **64 referenced routes deleted by `04768656`** — see breakdown in [ROUTE_INVENTORY.md](file:///data/data/com.termux/files/home/Gratog-live/docs/audit/ROUTE_INVENTORY.md). Restoration is a separate project.
6. **Square diagnostics endpoints are public** — should require admin gate or be removed from production.
