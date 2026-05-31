# EXECUTIVE_DECISION_REPORT — Gratog / Taste of Gratitude

> Phase 10 deliverable. Plain-language answers to the 10 questions that decide if the business is safe to operate today and what to do next.

## 1. Can the business safely accept payments today?

**Mostly yes — with caveats.**

The canonical guest checkout works end-to-end: cart → `/api/orders/create` → orderAccessToken → `/api/payments` → `/order/success`. Card data never touches the server (Square iframe). The payment route has a server-authoritative amount-match guard that blocks any mismatch.

**The caveats are not theoretical:**
- A technical user can submit a manipulated cart and pay $0.01 for full-price items (price tampering at `/api/orders/create`).
- A "single-use" coupon is reusable indefinitely because a field-name mismatch makes `isUsed` silently no-op.
- Capped coupons can be drained without paying via repeated abandonment.

**Verdict:** safe for honest customers; vulnerable to ~5-minutes-of-effort technical abuse. Fix Tier 1 items 1-4 immediately.

## 2. Can customers complete purchases today?

**Yes.** Guest checkout works. Confirmation emails send (though delivery is not tracked). Square SDK works on mobile and desktop. Inventory locks → consume sequence is solid.

The dead surfaces (`/quiz`, `/wishlist`, `/profile/*`, `/contact`, `/register`) do not block payment, but they do erode trust on first encounter.

## 3. Can the admin reliably fulfill orders today?

**Partially.**

Works:
- See order list and details
- Issue refunds
- Manage products, customers, coupons, markets, reviews
- View analytics

Doesn't work:
- Bulk status update (`/api/admin/orders/update-status` missing)
- Square sync (`/api/admin/orders/sync` missing)
- Inventory list view (`/api/admin/inventory` missing — per-product still works)
- Admin password recovery (`/api/admin/auth/reset-password` missing)

**Verdict:** daily operator workflow currently requires 2-3 manual workarounds. Restore those 4 routes and admin is fine.

## 4. Can revenue leak today?

**Yes — five active paths:**

1. **Price tampering** at order creation (unbounded per-order loss).
2. **Reward points double-awarded** (cumulative margin loss on redemption).
3. **Coupon usage not tracked** at payment success — single-use coupons reusable.
4. **Coupon `$inc`** at order creation — capped promos drainable without paying.
5. **Silent email failures** — confirmations may not arrive → support cost + chargebacks.

Full ranking in [REVENUE_RISK_REPORT.md](file:///data/data/com.termux/files/home/Gratog-live/docs/audit/business/REVENUE_RISK_REPORT.md).

## 5. Top 10 risks

| # | Risk | Severity |
|---|---|---|
| 1 | Price tampering at order creation | 🔴 catastrophic per-event |
| 2 | Admin cookie = literal API key (leak = total compromise) | 🔴 catastrophic if leaked |
| 3 | Reward points double-awarded | 🟠 cumulative |
| 4 | Coupon field-name mismatch → single-use coupons reusable | 🔴 unbounded on capped promos |
| 5 | Coupon `$inc` pre-payment → capped-promo drain | 🟠 abuse vector |
| 6 | Transactional email delivery untracked + `/api/unsubscribe` missing | 🟠 ops + 🔴 legal |
| 7 | Customer LTV inflation pre-payment | 🟠 analytics drift |
| 8 | Square diagnostic endpoints public | 🟠 info disclosure |
| 9 | `/api/contact` missing — every inquiry lost | 🟠 revenue + reputation |
| 10 | No abandoned-cart recovery | 🟡 revenue-recovery loss |

## 6. Top 10 fixes (do in this order)

1. **Server-side rebuild of prices** in `/api/orders/create` from `unified_products` / Square catalog.
2. **Signed admin session cookie** to replace literal-key cookie; rotate `ADMIN_API_KEY`.
3. **Remove pre-payment reward fire** in `/api/orders/create`; rewards only at payment success.
4. **Align coupon field name** to `order.appliedCoupon.code` in `/api/payments` and pick single coupon-schema (`$inc usedCount`).
5. **Move coupon `$inc` + customer `$inc`** from `lib/transactions.ts` to `/api/payments` post-success.
6. **Lock down Square diagnostics** (`/api/debug/square`, `/api/square/{diagnose,test-rest,validate-token}`, `/api/startup`) — 404 in prod.
7. **Write `email_sends` row on every Resend send** in `lib/resend-email.js`.
8. **Restore `/api/unsubscribe`** (legal).
9. **Restore `/api/contact`** (revenue capture).
10. **Add route-coverage CI guard** with allowlist to prevent next `04768656`.

## 7. What should be removed

- Parallel checkout system: `/api/checkout`, `/api/create-checkout`, `/api/pay/process`.
- Parallel order pages: `/order-v2`, `/order/start`, `/order/menu`, `/order/checkout`, `/order/complete`, `/order/status/[id]`, `/order` (legacy "Pay Flow"), `/pay`, `/checkout/square`, `/checkout/success`.
- Dev pages: `/test-auth`, `/diagnostic`.
- Public Square diagnostics: gate or remove `/api/debug/square`, `/api/square/{diagnose,test-rest,validate-token}`, `/api/startup`.
- Dead dep: `@sendgrid/mail`.

## 8. What should be hidden (without removing yet)

- Account CTAs: "Sign up", "Log in", "My account", "Profile", "Forgot password" — hide until accounts are revisited.
- Quiz, wishlist, subscriptions, learning, UGC entries — hide from nav.
- Admin notifications subsystem links in `/admin` UI.
- Admin campaigns "generate with AI" and "send test" buttons.
- `/admin/waitlist`, `/admin/interactions` admin nav links.
- `/admin/queue` link unless markets actively use the queue.

## 9. What should be restored first

In strict order — one PR per item:

1. **Route-coverage CI guard** (defensive — protects all future work)
2. **Lock public diagnostics** (low risk + immediate security gain)
3. **Server-authoritative pricing** at `/api/orders/create`
4. **Signed admin session cookie**
5. **Pre-payment side effects → post-payment** (rewards, coupon, customer LTV; do in one PR for atomicity)
6. **Email `email_sends` tracking** in transactional path
7. **`/api/unsubscribe`** (legal)
8. **`/api/contact`** (revenue)
9. **`/api/admin/inventory` + `/api/admin/orders/update-status` + `/api/admin/orders/sync`** (admin daily-ops)
10. **`/api/admin/auth/reset-password`** (lockout recovery)

Then Tier 2 items in order: newsletter, reviews, recommendations, public coupon validation, abandoned-cart cron, Apple/Google Pay.

## 10. What should never be worked on until the business scales

- Customer auth/profile/wishlist/learning/quiz/subscriptions/UGC.
- Notifications broadcast/send/market-day/new-product/stats.
- AI campaign generation.
- Admin interactions analytics.
- `/api/v1` versioning prefix.
- Stable customer surrogate id migration.
- Full RBAC for admin.
- A/B test admin.
- Full Apple Pay / Google Pay if Square SDK express buttons require redesign.

**Trigger to revisit:** when the *actual business* asks for it — when a customer says "I want an account to reorder" or when monthly orders pass 100/month with measurable repeat-rate.

## Final verdict

The Gratog platform is **almost** a boringly reliable food-vendor commerce site. The canonical revenue path works. The remaining work is:

1. **Close 5 active revenue leaks** in the canonical funnel (price/coupon/reward/email/admin-auth) — **~1 week of focused solo work**.
2. **Close 2 legal/trust gaps** (unsubscribe, contact) — **~half-day each**.
3. **Restore 4 admin daily-ops routes** — **~1-2 days each**.
4. **Hide / remove** 30+ dead UI surfaces — **~1 day total**.
5. **Add CI guard + smoke checklist** — **~1 day**.

Then stop. Anything beyond that is feature theater until the business outgrows current scale.

**Definition of "done" for this restoration project:**

1. Canonical guest checkout still works on production after every deploy.
2. `/api/orders/create` rebuilds prices from server-side catalog.
3. Admin cookie no longer contains a literal API key.
4. Square diagnostic endpoints not publicly reachable.
5. Every Resend send writes `email_sends`; webhook events have rows to update.
6. `/api/unsubscribe`, `/api/contact` work.
7. Admin can sync orders, update statuses, view inventory list, and reset password.
8. Every visible CTA either succeeds or is hidden.
9. CI fails on any new missing API reference.
10. Rollback procedure tested once.

Ten items. Two to four weeks of focused solo work. Then the business has a **boringly reliable, revenue-producing, defensible food-vendor commerce platform.**

That is the project. The rest is noise.
