# TOG-API-INVENTORY.md — Taste of Gratitude API Endpoint Inventory

Generated: 2026-07-29 18:47 EDT
Authority: Native Termux workspace

---

## 1. Overview

- **Total API endpoints**: ~137 route files
- **Framework**: Next.js 15 App Router (`app/api/`)
- **Runtime**: Mixed — most use Node.js runtime; some use Edge
- **Auth patterns**: Admin JWT, CRON_SECRET header, Square webhook signature, session cookies

---

## 2. Admin API Endpoints

### 2.1 Authentication

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/admin/auth/csrf` | GET | `app/api/admin/auth/csrf/route.ts` | CSRF token | Admin login page | active |
| `/api/admin/auth/login` | POST | `app/api/admin/auth/login/route.ts` | Admin login | Admin login page | active |
| `/api/admin/auth/logout` | POST | `app/api/admin/auth/logout/route.ts` | Admin logout | Admin layout | active |
| `/api/admin/auth/me` | GET | `app/api/admin/auth/me/route.ts` | Current admin session | Admin layout, ProtectedRoute | active |
| `/api/admin/auth/reset-password` | POST | `app/api/admin/auth/reset-password/route.ts` | Admin password reset | Admin reset page | active |

### 2.2 Dashboard & Analytics

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/admin/analytics` | GET | `app/api/admin/analytics/route.ts` | Admin analytics data | Admin dashboard | active |

### 2.3 Products

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/admin/products` | GET/POST | `app/api/admin/products/route.ts` | Product CRUD | Admin products page | active |
| `/api/admin/products/[id]` | GET/PUT/DELETE | `app/api/admin/products/[id]/route.ts` | Single product CRUD | Admin product detail | active |
| `/api/admin/products/[id]/sync` | POST | `app/api/admin/products/[id]/sync/route.ts` | Sync product with Square | Admin product detail | active |

### 2.4 Orders

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/admin/orders` | GET | `app/api/admin/orders/route.ts` | Order list | Admin orders page | active |
| `/api/admin/orders/[id]/refund` | POST | `app/api/admin/orders/[id]/refund/route.ts` | Refund order | Admin order detail | active |
| `/api/admin/orders/sync` | POST | `app/api/admin/orders/sync/route.ts` | Sync orders with Square | Admin orders page | active |

### 2.5 Customers

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/admin/customers` | GET | `app/api/admin/customers/route.ts` | Customer list | Admin customers page | active |
| `/api/admin/customers/[id]` | GET/PUT | `app/api/admin/customers/[id]/route.ts` | Customer detail | Admin customer detail | active |

### 2.6 Markets

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/admin/markets` | GET/POST | `app/api/admin/markets/route.ts` | Market CRUD | Admin markets page | active |
| `/api/admin/markets/seed` | POST | `app/api/admin/markets/seed/route.ts` | Seed market data | Admin setup | active |

### 2.7 Menus

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/admin/menus` | GET/POST | `app/api/admin/menus/route.ts` | Menu CRUD | Admin menus page | active |
| `/api/admin/menus/archive` | POST | `app/api/admin/menus/archive/route.ts` | Archive menus | Admin menus page | active |

### 2.8 Inventory

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/admin/inventory/[productId]` | PUT | `app/api/admin/inventory/[productId]/route.ts` | Update inventory | Admin inventory page | active |

### 2.9 Campaigns & Email

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/admin/campaigns` | GET/POST | `app/api/admin/campaigns/route.ts` | Campaign CRUD | Admin campaigns page | active |
| `/api/admin/campaigns/send` | POST | `app/api/admin/campaigns/send/route.ts` | Send campaign | Admin campaigns page | active |
| `/api/admin/emails` | GET/POST | `app/api/admin/emails/route.ts` | Email management | Admin emails page | active |

### 2.10 Coupons

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/admin/coupons` | GET/POST | `app/api/admin/coupons/route.ts` | Coupon list/create | Admin coupons page | active |
| `/api/admin/coupons/[id]` | GET/PUT/DELETE | `app/api/admin/coupons/[id]/route.ts` | Coupon CRUD | Admin coupons page | active |

### 2.11 Fresh Batch

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/admin/fresh-batch/requests` | GET/POST | `app/api/admin/fresh-batch/requests/route.ts` | Batch request management | Admin fresh batches page | active |
| `/api/admin/fresh-batch/reservations` | GET/POST | `app/api/admin/fresh-batch/reservations/route.ts` | Batch reservation management | Admin fresh batches page | active |

### 2.12 Other Admin

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/admin/notifications` | GET/POST | `app/api/admin/notifications/route.ts` | Notification management | Admin notifications | active |
| `/api/admin/reviews` | GET/POST | `app/api/admin/reviews/route.ts` | Review management | Admin reviews page | active |
| `/api/admin/setup` | POST | `app/api/admin/setup/route.ts` | System setup | Admin setup page | active |
| `/api/admin/emergency-init` | POST | `app/api/admin/emergency-init/route.ts` | Emergency system init | Admin | active |

---

## 3. Customer / Public API Endpoints

### 3.1 Health & Diagnostics

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/health` | GET | `app/api/health/route.ts` | Health check (DB + Square) | CI/CD, monitoring | active |
| `/api/health/payments` | GET | `app/api/health/payments/route.ts` | Payment health check | Monitoring | active |
| `/api/startup` | GET | `app/api/startup/route.ts` | Startup validation | Server startup | active |
| `/api/square/diagnose` | GET | `app/api/square/diagnose/route.ts` | Square diagnostics | Development | active |
| `/api/square/test-rest` | GET | `app/api/square/test-rest/route.ts` | Square REST API test | Development | active |
| `/api/square/validate-token` | GET | `app/api/square/validate-token/route.ts` | Square token validation | Development | active |
| `/api/debug/square` | GET | `app/api/debug/square/route.ts` | Square debug endpoint | Development | active |
| `/api/token-status` | GET | `app/api/token-status/route.ts` | Token status check | Development | experimental |

### 3.2 Catalog & Products

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/catalog` | GET | `app/api/catalog/route.ts` | Catalog data | Catalog page | active |
| `/api/storefront/catalog` | GET | `app/api/storefront/catalog/route.ts` | Storefront catalog | Storefront | active |
| `/api/storefront/square-catalog` | GET | `app/api/storefront/square-catalog/route.ts` | Direct Square catalog fetch | Storefront | active |
| `/api/products` | GET | `app/api/products/route.ts` | Products list | Product pages | active |
| `/api/square/config` | GET | `app/api/square/config/route.ts` | Square client config | Checkout page | active |

### 3.3 Cart

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/cart` | GET/POST | `app/api/cart/route.ts` | Cart operations | Cart components | active |
| `/api/cart/price` | POST | `app/api/cart/price/route.ts` | Cart pricing | Checkout | active |

### 3.4 Checkout & Orders

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/checkout` | POST | `app/api/checkout/route.ts` | **DEPRECATED** — returns 410 | Legacy callers | deprecated |
| `/api/create-checkout` | POST | `app/api/create-checkout/route.ts` | Create checkout session | Checkout page | active |
| `/api/orders` | GET | `app/api/orders/route.ts` | Orders list | Order pages | active |
| `/api/orders/create` | POST | `app/api/orders/create/route.js` | Create order | Checkout flow | active |
| `/api/orders/[id]/status` | GET | `app/api/orders/[id]/status/route.ts` | Order status | Order status page | active |
| `/api/orders/by-ref` | GET | `app/api/orders/by-ref/route.js` | Order lookup by reference | Order lookup | active |
| `/api/orders/search` | GET | `app/api/orders/search/route.ts` | Order search | Admin | active |

### 3.5 Payments

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/pay/process` | POST | `app/api/pay/process/route.ts` | **DEPRECATED** — returns 410 | Legacy callers | deprecated |
| `/api/payments` | POST | `app/api/payments/route.ts` | Process payment | Checkout flow | active |
| `/api/payments/square` | POST | `app/api/payments/square/route.ts` | Square payment processing | Checkout flow | active |
| `/api/payments/refund` | POST | `app/api/payments/refund/route.ts` | Refund payment | Admin | active |

### 3.6 Auth (Customer)

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/auth/login` | POST | `app/api/auth/login/route.ts` | Customer login | Login page | active |
| `/api/auth/logout` | POST | `app/api/auth/logout/route.ts` | Customer logout | Profile | active |
| `/api/auth/register` | POST | `app/api/auth/register/route.ts` | Customer registration | Register page | active |
| `/api/auth/session` | GET | `app/api/auth/session/route.ts` | Session check | Auth context | active |
| `/api/auth/forgot-password` | POST | `app/api/auth/forgot-password/route.ts` | Password reset request | Forgot password page | active |
| `/api/auth/reset-password` | POST | `app/api/auth/reset-password/route.ts` | Password reset | Reset password page | active |

### 3.7 User Profile

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/customer/profile` | GET | `app/api/customer/profile/route.ts` | Customer profile | Profile page | active |
| `/api/user/profile` | GET/PUT | `app/api/user/profile/route.ts` | User profile | Profile page | active |
| `/api/user/orders` | GET | `app/api/user/orders/route.ts` | User orders | Profile orders | active |
| `/api/user/favorites` | GET/POST | `app/api/user/favorites/route.ts` | User favorites | Profile | active |
| `/api/user/rewards` | GET | `app/api/user/rewards/route.js` | User rewards | Profile rewards | active |
| `/api/user/stats` | GET | `app/api/user/stats/route.ts` | User stats | Profile | active |
| `/api/user/email-preferences` | GET/PUT | `app/api/user/email-preferences/route.ts` | Email preferences | Profile settings | active |
| `/api/user/challenge` | GET/POST | `app/api/user/challenge/route.ts` | Wellness challenge | Challenge page | active |
| `/api/user/challenge/checkin` | POST | `app/api/user/challenge/checkin/route.ts` | Challenge check-in | Challenge page | active |

### 3.8 Markets

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/markets` | GET | `app/api/markets/route.ts` | Markets list | Markets page | active |
| `/api/markets/warm` | GET | `app/api/markets/warm/route.ts` | Warm market cache | Cache warming | active |
| `/api/market/today` | GET | `app/api/market/today/route.ts` | Today's market info | Market banner | active |

### 3.9 Menus

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/menus` | GET | `app/api/menus/route.ts` | Menus list | Menu pages | active |
| `/api/menus/current` | GET | `app/api/menus/current/route.ts` | Current menu | Weekly menu page | active |

### 3.10 Inventory

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/inventory` | GET | `app/api/inventory/route.ts` | Inventory check | Product pages | active |
| `/api/inventory/lock` | POST | `app/api/inventory/lock/route.ts` | Lock inventory | Checkout | active |
| `/api/inventory/release` | POST | `app/api/inventory/release/route.ts` | Release inventory | Checkout | active |
| `/api/inventory/confirm` | POST | `app/api/inventory/confirm/route.ts` | Confirm inventory | Checkout | active |

### 3.11 Preorder

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/preorder` | POST | `app/api/preorder/route.ts` | Preorder operations | Preorder page | active |
| `/api/preorder/confirm` | POST | `app/api/preorder/confirm/route.ts` | Confirm preorder | Preorder page | active |
| `/api/preorder/cancel` | POST | `app/api/preorder/cancel/route.ts` | Cancel preorder | Preorder page | active |
| `/api/preorder/status` | GET | `app/api/preorder/status/route.ts` | Preorder status | Preorder status page | active |

### 3.12 Fresh Batch

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/fresh-batch/requests` | POST | `app/api/fresh-batch/requests/route.ts` | Submit flavor request | Request a flavor page | active |

### 3.13 Queue

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/queue/join` | POST | `app/api/queue/join/route.js` | Join order queue | Order page | active |
| `/api/queue/active` | GET | `app/api/queue/active/route.js` | Active queue status | Queue page | active |
| `/api/queue/position/[id]` | GET | `app/api/queue/position/[id]/route.js` | Queue position | Queue page | active |
| `/api/queue/update` | POST | `app/api/queue/update/route.ts` | Update queue | Vendor queue | active |

### 3.14 Delivery & Shipping

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/delivery/quote` | POST | `app/api/delivery/quote/route.ts` | Delivery quote | Checkout | active |
| `/api/shipping/rates` | GET | `app/api/shipping/rates/route.ts` | Shipping rates | Checkout | active |

### 3.15 Coupons

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/coupons/validate` | POST | `app/api/coupons/validate/route.ts` | Validate coupon | Checkout | active |

### 3.16 Contact & Lead

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/contact` | POST | `app/api/contact/route.ts` | Contact form submission | Contact page | active |
| `/api/lead` | POST | `app/api/lead/route.ts` | Lead capture | Various forms | active |

### 3.17 Newsletter

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/newsletter/subscribe` | POST | `app/api/newsletter/subscribe/route.ts` | Newsletter subscribe | Newsletter signup | active |
| `/api/unsubscribe` | GET | `app/api/unsubscribe/route.ts` | Unsubscribe | Email links | active |

### 3.18 Notifications

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/notifications` | GET | `app/api/notifications/route.ts` | User notifications | Notification UI | active |

### 3.19 Quiz

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/quiz` | GET | `app/api/quiz/route.ts` | Quiz data | Quiz page | active |

### 3.20 Search

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/search/enhanced` | GET | `app/api/search/enhanced/route.ts` | Enhanced search | Search bar | active |

### 3.21 SEO

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/seo/analyze` | GET | `app/api/seo/analyze/route.ts` | SEO analysis | Development | active |

### 3.22 Analytics

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/analytics` | POST | `app/api/analytics/route.ts` | Analytics events | Client-side | active |
| `/api/analytics/web-vitals` | POST | `app/api/analytics/web-vitals/route.ts` | Web vitals | WebVitals component | active |
| `/api/csp-report` | POST | `app/api/csp-report/route.ts` | CSP violation report | Browser | active |

### 3.23 Errors

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/errors/list` | GET | `app/api/errors/list/route.ts` | Error list | Admin errors page | active |
| `/api/errors/summary` | GET | `app/api/errors/summary/route.ts` | Error summary | Admin errors page | active |

### 3.24 Reports

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/reports/daily` | GET | `app/api/reports/daily/route.ts` | Daily report | Admin | active |

### 3.25 Retention

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/retention/winback` | POST | `app/api/retention/winback/route.ts` | Winback campaign trigger | Automation | active |

### 3.26 Returns

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/returns/create` | POST | `app/api/returns/create/route.ts` | Create return request | Returns flow | active |

### 3.27 Subscriptions

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/subscriptions` | GET/POST | `app/api/subscriptions/route.ts` | Subscription management | Subscription pages | active |
| `/api/subscriptions/gratitude-box` | POST | `app/api/subscriptions/gratitude-box/route.ts` | Gratitude Box order | Gratitude Box page | active |

### 3.28 Rewards

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/rewards/add-points` | POST | `app/api/rewards/add-points/route.js` | Add reward points | Rewards system | active |
| `/api/rewards/passport` | GET | `app/api/rewards/passport/route.js` | Rewards passport | Rewards page | active |

### 3.29 Gratitude Rewards

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/gratitude/account` | GET | `app/api/gratitude/account/route.ts` | Gratitude account | Gratitude page | active |
| `/api/gratitude/earn` | POST | `app/api/gratitude/earn/route.ts` | Earn gratitude points | Various | active |
| `/api/gratitude/redeem` | POST | `app/api/gratitude/redeem/route.ts` | Redeem gratitude points | Gratitude page | active |
| `/api/gratitude/rewards` | GET | `app/api/gratitude/rewards/route.ts` | Rewards catalog | Gratitude page | active |
| `/api/gratitude/transactions` | GET | `app/api/gratitude/transactions/route.ts` | Reward transactions | Gratitude page | active |
| `/api/gratitude/referral/code` | GET | `app/api/gratitude/referral/code/route.ts` | Get referral code | Referral UI | active |
| `/api/gratitude/referral/track` | POST | `app/api/gratitude/referral/track/route.ts` | Track referral | Referral system | active |
| `/api/gratitude/webhook` | POST | `app/api/gratitude/webhook/route.ts` | Gratitude webhook | External | active |

### 3.30 Instagram

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/instagram/posts` | GET | `app/api/instagram/posts/route.ts` | Instagram posts feed | Instagram feed component | active |
| `/api/instagram/post/[slug]` | GET | `app/api/instagram/post/[slug]/route.ts` | Single Instagram post | Instagram post page | active |
| `/api/instagram/sync` | POST | `app/api/instagram/sync/route.ts` | Sync Instagram feed | Cron/Admin | active |

### 3.31 OAuth

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/oauth/square/authorize` | GET | `app/api/oauth/square/authorize/route.ts` | Square OAuth authorize | Admin Square OAuth page | active |
| `/api/oauth/square/callback` | GET | `app/api/oauth/square/callback/route.ts` | Square OAuth callback | Square OAuth flow | active |
| `/api/oauth/square/status` | GET | `app/api/oauth/square/status/route.ts` | Square OAuth status | Admin Square OAuth page | active |

### 3.32 Calendar

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/ics/market-route` | GET | `app/api/ics/market-route/route.js` | ICS calendar export | Calendar links | active |

---

## 4. Cron / Webhook Endpoints

### 4.1 Cron Jobs

| Endpoint | Method | Location | Purpose | Schedule | Status |
|----------|--------|----------|---------|----------|--------|
| `/api/cron/daily-report` | GET | `app/api/cron/daily-report/route.ts` | Daily admin report | Daily (Vercel Cron) | active |
| `/api/cron/owner-alerts` | GET | `app/api/cron/owner-alerts/route.ts` | Owner alert queue processor | Every 5 min (Vercel Cron) | active |
| `/api/cron/cleanup-abandoned-orders` | GET | `app/api/cron/cleanup-abandoned-orders/route.ts` | Cleanup abandoned orders | Periodic | active |
| `/api/cron/cleanup-locks` | GET | `app/api/cron/cleanup-locks/route.ts` | Cleanup stale inventory locks | Periodic | active |

### 4.2 Webhooks

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/webhooks/square` | POST | `app/api/webhooks/square/route.ts` | Square webhook handler (orders, payments) | Square | active |
| `/api/webhooks/square/payment` | POST | `app/api/webhooks/square/payment/route.ts` | Square payment webhook | Square | active |
| `/api/webhooks/resend` | POST | `app/api/webhooks/resend/route.js` | Resend email webhook | Resend | active |

---

## 5. Untracked / Experimental Endpoints

| Endpoint | Method | Location | Purpose | Caller | Status |
|----------|--------|----------|---------|--------|--------|
| `/api/admin/sanitize-products` | POST | `app/api/admin/sanitize-products/route.ts` | Sanitize product data in DB | Admin (untracked) | experimental |
| `/api/admin/sanitize` | POST | `app/api/admin/sanitize/route.ts` | General data sanitization | Admin (untracked) | experimental |
| `/api/admin/token-status` | GET | `app/api/admin/token-status/route.ts` | Check admin token status | Admin (untracked) | experimental |
| `/api/token-status` | GET | `app/api/token-status/route.ts` | Check token status | Development (untracked) | experimental |

---

## 6. Legacy / Deprecated Endpoints

| Endpoint | Method | Location | Purpose | Status |
|----------|--------|----------|---------|--------|
| `/api/checkout` | POST | `app/api/checkout/route.ts` | Legacy checkout — returns 410 | deprecated |
| `/api/pay/process` | POST | `app/api/pay/process/route.ts` | Legacy payment — returns 410 | deprecated |
| `pages/api/menu.ts` | GET | `pages/api/menu.ts` | Legacy Pages Router menu API | deprecated |

---

## 7. API Summary

| Category | Count | Notes |
|----------|-------|-------|
| Admin API | 30 | Full CRUD for all business entities |
| Customer/public API | 90+ | Covers all customer-facing operations |
| Cron jobs | 4 | Vercel Cron-triggered |
| Webhooks | 3 | Square (2) + Resend (1) |
| Deprecated | 3 | Returns 410 or legacy Pages Router |
| Experimental (untracked) | 4 | Not yet committed |
| **Total** | **~130** | |

### Key Observations

1. **Two deprecated endpoints still live**: `/api/checkout` and `/api/pay/process` return 410 but remain in the codebase. They should be removed.

2. **Duplicate reward systems**: Both `/api/rewards/*` and `/api/gratitude/*` exist, suggesting two parallel reward implementations.

3. **High endpoint count for a small business**: ~130 API endpoints is substantial. Many may be unused or redundant.

4. **No API versioning**: All routes are unversioned. The `lib/middleware/versioned-api.ts` exists but doesn't appear to be used.

5. **Auth inconsistency**: Some customer endpoints require auth (user/*), others don't. The customer auth system appears partially broken (account page shows "temporarily unavailable").

6. **Debug/diagnostic endpoints exposed**: `/api/square/diagnose`, `/api/debug/square`, `/api/square/test-rest` are publicly accessible (no auth) and should be restricted.
