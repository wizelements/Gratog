# ROUTE_INVENTORY — Gratog Platform

> Code-verified at commit `f9d20e98`. Inventory pulled from `app/`, `app/api/`, and cross-checked against 138 referenced `/api/*` paths.

## Totals

| Bucket | Count |
|---|---|
| Pages (`app/**/page.*`) | **95** (68 public + 27 admin) |
| API routes (existing files) | **93** |
| API routes referenced in code | **138** |
| Referenced-but-missing API routes | **64** |
| Middleware coverage | `/admin/:path*`, `/api/admin/:path*` ([middleware.ts](file:///data/data/com.termux/files/home/Gratog-live/middleware.ts)) |

Raw lists:
- [_routes-existing.txt](file:///data/data/com.termux/files/home/Gratog-live/docs/audit/_routes-existing.txt)
- [_missing-routes.txt](file:///data/data/com.termux/files/home/Gratog-live/docs/audit/_missing-routes.txt)
- [_routes-by-category.txt](file:///data/data/com.termux/files/home/Gratog-live/docs/audit/_routes-by-category.txt)
- [_pages-existing.txt](file:///data/data/com.termux/files/home/Gratog-live/docs/audit/_pages-existing.txt)
- [_api-refs.txt](file:///data/data/com.termux/files/home/Gratog-live/docs/audit/_api-refs.txt)
- [_fetch-callers.txt](file:///data/data/com.termux/files/home/Gratog-live/docs/audit/_fetch-callers.txt)

## 1. Public pages (68)

Customer-facing. Auth not required unless noted.

| Path | File | Purpose | Status |
|---|---|---|---|
| `/` | `app/page.js` | Marketing homepage | ✅ Working |
| `/catalog` | `app/catalog/page.js` | Product grid | ✅ Working |
| `/product/[slug]` | `app/product/[slug]/page.jsx` | PDP | ✅ Working |
| `/checkout` | `app/checkout/page.tsx` | Canonical checkout (Square Web SDK) | ✅ Working (post-fix `970daff0` + `e1750aac`) |
| `/checkout/square` | `app/checkout/square/page.js` | Legacy Square hosted-link fallback | ⚠️ Partial — referenced from older flow |
| `/checkout/success` | `app/checkout/success/page.js` | Square hosted-link return URL | ⚠️ Partial |
| `/order/success` | `app/order/success/page.js` | Post-payment confirmation | ✅ Working |
| `/order/[id]` | `app/order/[id]/page.tsx` | Order detail | ⚠️ Requires `orderAccessToken` (guest) or login |
| `/order/[id]/queue` | `app/order/[id]/queue/page.js` | Queue position UI | ⚠️ Depends on `/api/queue/position/[id]` (restored) |
| `/order-v2` | `app/order-v2/page.tsx` | Experimental order flow | ❓ Unused — no inbound links found |
| `/order/start`, `/order/menu`, `/order/checkout`, `/order/complete`, `/order/status/[id]`, `/order` | various | "Pay Flow" alt journey | ⚠️ Parallel checkout system; unclear which is canonical |
| `/pay` | `app/pay/page.tsx` | Alternate pay page | ⚠️ Parallel to `/checkout` |
| `/cart` | (none — drawer in `components/cart/`) | Cart UX | ✅ Component-based |
| `/profile` | `app/profile/page.js` | User account home | ⚠️ Calls missing `/api/user/profile` |
| `/profile/orders` | `app/profile/orders/page.js` | Order history | ❌ Broken — `/api/user/orders` missing |
| `/profile/rewards` | `app/profile/rewards/page.js` | User rewards | ⚠️ Partial — see EMAIL/REWARDS audits |
| `/profile/settings` | `app/profile/settings/page.js` | Settings | ⚠️ Calls missing `/api/user/email-preferences` |
| `/profile/challenge` | `app/profile/challenge/page.js` | Challenge progress | ❌ Broken — `/api/user/challenge` missing |
| `/login` | `app/login/page.js` | Customer login | ⚠️ No customer login route (`/api/auth/login` not in existing list) |
| `/register` | `app/register/page.js` | Sign up | ❌ Broken — `/api/auth/register` missing |
| `/forgot-password` | `app/forgot-password/page.js` | Password reset request | ❌ Broken — `/api/auth/reset-password` missing |
| `/reset-password` | `app/reset-password/page.js` | Reset confirm | ❌ Broken — same root cause |
| `/contact` | `app/contact/page.js` | Contact form | ❌ Broken — `/api/contact` missing |
| `/quiz` | `app/quiz/page.js` | Ingredient quiz | ❌ Broken — `/api/quiz/submit`, `/api/quiz/results` missing |
| `/quiz/results/[id]` | `app/quiz/results/[id]/page.js` | Quiz results | ❌ Broken — `/api/quiz/recommendations` missing |
| `/rewards` | `app/rewards/page.js` | Loyalty landing | ✅ Working |
| `/gratitude` | `app/gratitude/page.jsx` | Gratitude program | ✅ Working |
| `/gratitude/rewards` | `app/gratitude/rewards/page.jsx` | Gratitude rewards | ✅ Working |
| `/passport` | `app/passport/page.js` | Customer passport | ⚠️ `/api/rewards/passport/scan` missing |
| `/reviews` | `app/reviews/page.jsx` | Reviews wall | ❌ `/api/reviews` missing |
| `/wishlist` | `app/wishlist/page.js` | Favourites | ❌ `/api/user/favorites` missing |
| `/markets` | `app/markets/page.tsx` | Market schedule | ✅ Working |
| `/preorder` | `app/preorder/page.tsx` | Preorder form | ✅ Working |
| `/preorder/status` | `app/preorder/status/page.tsx` | Preorder status | ✅ Working |
| `/subscriptions` | `app/subscriptions/page.js` | Subscription plans | ❌ `/api/subscriptions/plans` missing |
| `/account/subscriptions[/id]` | `app/account/subscriptions/*` | Subscriptions detail | ⚠️ Partial |
| `/account` | `app/account/page.tsx` | Account home | ⚠️ Partial |
| `/explore`, `/explore/games/*`, `/explore/ingredients`, `/explore/learn`, `/explore/showcase` | `app/explore/**` | Discovery hub | ⚠️ `/api/learning/modules`, `/api/learning/me/modules` missing for `/explore/learn` |
| `/info-board` | `app/info-board/page.js` | Market info | ✅ Working |
| `/faq`, `/about`, `/policies`, `/privacy`, `/terms` | static | Info pages | ✅ Working |
| `/unsubscribe` | `app/unsubscribe/page.js` | Email unsub | ❌ `/api/unsubscribe` missing |
| `/diagnostic` | `app/diagnostic/page.js` | Internal smoke | ⚠️ Should be hidden |
| `/offline` | `app/offline/page.js` | PWA offline fallback | ✅ Working |
| `/ugc`, `/ugc/spicy-bloom` | `app/ugc/*` | UGC | ❌ `/api/ugc/submit` missing |
| `/vendor/queue` | `app/vendor/queue/page.tsx` | Vendor queue | ⚠️ Depends on `/api/queue/active` (missing) |
| `/test-auth` | `app/test-auth/page.js` | Dev only | ⚠️ Should be removed in prod |
| `/(site)/community` | `app/(site)/community/page.tsx` | Community | ✅ Working |
| `/(site)/instagram/[slug]` | `app/(site)/instagram/[slug]/page.tsx` | IG post page | ⚠️ `/api/instagram/post` missing (uses `/api/instagram/post/[slug]` which exists) |

## 2. Admin pages (27)

All gated by `middleware.ts` (cookie `admin_token` matched against `ADMIN_API_KEY` or `MASTER_API_KEY`).

| Path | File | API deps existing? |
|---|---|---|
| `/admin` | `app/admin/page.js` | ✅ |
| `/admin/login` (public) | `app/admin/login/page.js`+`.tsx` | ✅ `/api/admin/auth/login` |
| `/admin/forgot-password` | `app/admin/forgot-password/page.js` | ❌ `/api/admin/auth/reset-password` missing |
| `/admin/reset-password` | `app/admin/reset-password/page.js` | ❌ same |
| `/admin/analytics` | `app/admin/analytics/page.*` | ✅ |
| `/admin/campaigns`, `/admin/campaigns/new` | `app/admin/campaigns/*` | ⚠️ `/api/admin/campaigns/generate`, `/test` missing |
| `/admin/coupons` | `app/admin/coupons/page.js` | ✅ list/[id]; ❌ `/api/coupons/create`, `/api/coupons/validate` missing (storefront side) |
| `/admin/customers` | `app/admin/customers/page.js` | ✅ |
| `/admin/errors` | `app/admin/errors/page.js` | ✅ `/api/errors/list`, `/api/errors/summary` |
| `/admin/interactions` | `app/admin/interactions/page.js` | ❌ `/api/admin/interactions` missing |
| `/admin/inventory` | `app/admin/inventory/page.js` | ❌ `/api/admin/inventory` (list) missing; only `/api/admin/inventory/[productId]` exists |
| `/admin/market-day`, `/admin/market-setup`, `/admin/markets` | `app/admin/markets/*` etc. | ✅ |
| `/admin/orders` | `app/admin/orders/page.js` | ⚠️ `/api/admin/orders/sync`, `/api/admin/orders/update-status` missing |
| `/admin/products`, `/admin/products/[id]` | `app/admin/products/*` | ✅ |
| `/admin/qr-generator` | `app/admin/qr-generator/page.tsx` | n/a |
| `/admin/queue` | `app/admin/queue/page.js` | ⚠️ `/api/queue/active`, `/api/queue/update` missing |
| `/admin/reviews` | `app/admin/reviews/page.js` | ✅ |
| `/admin/settings` | `app/admin/settings/page.js` | ⚠️ |
| `/admin/setup` | `app/admin/setup/page.js` | ✅ |
| `/admin/square-oauth` | `app/admin/square-oauth/page.tsx` | ✅ |
| `/admin/waitlist` | `app/admin/waitlist/page.js` | ❌ `/api/waitlist` missing |

## 3. API routes (existing — 93)

See [_routes-by-category.txt](file:///data/data/com.termux/files/home/Gratog-live/docs/audit/_routes-by-category.txt) for the full categorized list. Summary:

| Category | Count |
|---|---|
| Admin | 22 |
| Other (catalog/cart/inventory/oauth/etc.) | 36 |
| Gratitude (loyalty) | 8 |
| Orders | 4 |
| Payments | 4 |
| Square diagnostics | 4 |
| Cron | 2 |
| Market | 2 |
| Preorder | 2 |
| Queue | 2 |
| Rewards | 2 |
| Webhooks | 2 |
| Checkout | 1 |
| Notifications | 1 |
| User | 1 |
| **TOTAL** | **93** |

## 4. API routes (referenced-but-missing — 64)

Full list in [_missing-routes.txt](file:///data/data/com.termux/files/home/Gratog-live/docs/audit/_missing-routes.txt). Highlights by category:

| Category | Missing routes |
|---|---|
| Auth (public) | `/api/auth/register`, `/api/auth/reset-password` |
| User | `/api/user/profile`, `/api/user/orders`, `/api/user/favorites`, `/api/user/stats`, `/api/user/challenge`, `/api/user/challenge/checkin`, `/api/user/email-preferences` |
| Admin | `/api/admin/auth/reset-password`, `/api/admin/campaigns/generate`, `/api/admin/campaigns/test`, `/api/admin/interactions`, `/api/admin/inventory`, `/api/admin/notifications/{broadcast,market-day,new-product,send,stats}`, `/api/admin/orders/{sync,update-status}` |
| Notifications | `/api/notifications/{location,preferences,subscribe,test,unsubscribe}` |
| Queue | `/api/queue/active`, `/api/queue/position`, `/api/queue/update` |
| Rewards | `/api/rewards/leaderboard`, `/api/rewards/passport/scan`, `/api/rewards/stamp` |
| Auth public flows | `/api/contact`, `/api/newsletter/subscribe`, `/api/unsubscribe`, `/api/nurture/subscribe` |
| Reviews | `/api/reviews`, `/api/reviews/helpful` |
| Quiz | `/api/quiz/submit`, `/api/quiz/results`, `/api/quiz/recommendations` |
| Learning | `/api/learning/modules`, `/api/learning/me/modules` |
| Coupons (public) | `/api/coupons/create`, `/api/coupons/validate` |
| Payments | `/api/payments/route` (likely glob noise), `/api/pay-flow` (root) |
| Returns | `/api/returns` |
| Customers | `/api/customers` |
| Subscriptions | `/api/subscriptions/plans` |
| Misc | `/api/email/alert`, `/api/sms/alert`, `/api/error-report`, `/api/instagram/post`, `/api/interactions`, `/api/recommendations`, `/api/tracking/user`, `/api/transactions/log`, `/api/transactions/stats`, `/api/ugc/submit`, `/api/waitlist`, `/api/cron/cleanup-abandoned-orders`, `/api/square/image`, `/api/v1` |

> Cause: bulk cleanup commit `04768656` deleted many routes; only a subset has been restored (orders/create, by-ref, queue/{join,position}, rewards/{add-points,passport}, ics/market-route, webhooks/resend, user/rewards). The remaining 64 are still missing.

## 5. Auth posture per route family

| Family | Gate |
|---|---|
| `/admin/**` and `/api/admin/**` | `middleware.ts` cookie `admin_token` |
| `/api/cron/**` | `CRON_SECRET` header check (inside each route) |
| `/api/orders/create` | None — guest-friendly; mints `orderAccessToken` for follow-up |
| `/api/payments` | Requires `orderAccessToken` (HMAC) or session JWT |
| `/api/webhooks/square` | Square signature verification |
| `/api/webhooks/resend` | `RESEND_WEBHOOK_SECRET` HMAC |
| `/api/rewards/add-points` | Bearer `ADMIN_API_KEY`/`MASTER_API_KEY` (internal only) |
| `/api/user/**` | Session JWT (when implemented) |
| Everything else | Public |

## 6. Page → API dependency hot-spots (top breaks)

```diagram
/checkout ─────▶ /api/orders/create  ✅  ─▶ /api/payments  ✅  ─▶ /order/success ✅
/profile  ─────▶ /api/user/profile   ❌
/profile/orders ▶ /api/user/orders   ❌
/contact  ─────▶ /api/contact        ❌
/register ─────▶ /api/auth/register  ❌
/quiz     ─────▶ /api/quiz/submit    ❌
/reviews  ─────▶ /api/reviews        ❌
/wishlist ─────▶ /api/user/favorites ❌
/unsubscribe ──▶ /api/unsubscribe    ❌
/passport  ────▶ /api/rewards/passport ✅ (restored)
/passport scan ▶ /api/rewards/passport/scan ❌
```

## 7. Hidden/legacy/dev-only routes

- `/test-auth` — dev only, should be removed before prod hardening.
- `/diagnostic` — internal.
- `/order-v2`, `/pay`, `/order/*` parallel flow — competes with canonical `/checkout`. Choose one.
- `/api/debug/square`, `/api/square/{diagnose,test-rest,validate-token}` — diagnostics; ensure not exposed publicly without auth.
- `/api/startup` — boot probe; should be locked down.
- `/api/csp-report` — must remain public for browser CSP reporting.
