# TOG-CODE-INVENTORY.md — Taste of Gratitude Codebase Inventory

Generated: 2026-07-29 18:47 EDT
Authority: Native Termux workspace
Source: `/data/data/com.termux/files/home/.openclaw/workspace/Gratog`

---

## 1. Overview

| Metric | Value |
|--------|-------|
| Total files (source) | ~746 |
| Total lines (source) | ~126k |
| Framework | Next.js 15 (App Router) |
| Language | TypeScript + JavaScript (mixed) |
| CSS | Tailwind CSS |
| Database | MongoDB (Mongoose) |
| Payment | Square (SDK + REST) |
| Hosting | Vercel |
| Package manager | npm |

---

## 2. App Route Directories (Pages)

### 2.1 Customer-Facing Routes

| Route | Purpose | Files | Lines | Mission | Status |
|-------|---------|-------|-------|---------|--------|
| `/` (page.js) | Homepage — static ISR, hero + CTA | 1 | ~150 | customer | active |
| `/layout.js` | Root layout — header, footer, PWA, analytics, auth | 1 | ~200 | infrastructure | active |
| `/cart/` | Redirects to `/checkout` | 1 | 5 | commerce | active (redirect) |
| `/catalog/` | Product catalog — fetches from Square via storefront-products | 1 | 38 | commerce | active |
| `/checkout/` | Checkout flow — Square Web Payments SDK, fulfillment tabs | 10 | 512 | commerce | active |
| `/checkout/square/` | Square checkout page | 2 | ~50 | commerce | active |
| `/checkout/success/` | Order success page | 3 | ~100 | commerce | active |
| `/contact/` | Contact form — email, phone, market location | 3 | 239 | customer | active |
| `/faq/` | FAQ page | 3 | 363 | customer | active |
| `/about/` | About / story page | 3 | 202 | customer | active |
| `/explore/` | Explore hub — ingredients, learn | 13 | 1,640 | customer | active |
| `/explore/ingredients/` | Ingredient explorer — 46 ingredients | 3 | ~400 | customer | active |
| `/explore/learn/` | Learning center — educational content | 5 | ~800 | customer | active |
| `/info-board/` | Kiosk-ready product info board (no selling) | 2 | 347 | customer | active |
| `/login/` | Customer login page | 1 | 171 | customer | partial |
| `/register/` | Customer registration | 2 | 551 | customer | partial |
| `/forgot-password/` | Password reset request | 2 | 153 | customer | partial |
| `/reset-password/` | Password reset form | 2 | 201 | customer | partial |
| `/account/` | Account page — shows "temporarily unavailable" | 6 | 214 | customer | broken |
| `/profile/` | Customer profile — orders, rewards, settings, challenge | 21 | 1,524 | customer | partial |
| `/profile/orders/` | Order history | 3 | ~200 | customer | partial |
| `/profile/rewards/` | Rewards dashboard | 3 | ~200 | customer | partial |
| `/profile/settings/` | Profile settings | 3 | ~150 | customer | partial |
| `/profile/challenge/` | Wellness challenge | 3 | ~200 | customer | experimental |
| `/order/` | Redirects to `/checkout` | 1 | 5 | commerce | active (redirect) |
| `/order/start/` | Order start — market selection, product browsing | 1 | ~400 | commerce | active |
| `/order/menu/` | Order from weekly menu | 3 | ~200 | commerce | active |
| `/order/[id]/` | Order detail page | 3 | ~200 | commerce | active |
| `/order/[id]/queue/` | Order queue position | 3 | ~100 | commerce | active |
| `/order/complete/` | Order completion | 3 | ~100 | commerce | active |
| `/order/success/` | Order success (enhanced + legacy) | 4 | ~500 | commerce | active |
| `/order/status/[id]/` | Order status lookup | 3 | ~200 | commerce | active |
| `/weekly-menu/` | Weekly menu landing — SSR, market pickups | 1 | 27 | commerce | active |
| `/markets/` | Markets page — Serenbe, Dunwoody info | 4 | 725 | customer | active |
| `/menu/` | Redirects to `/weekly-menu` | 3 | 42 | commerce | active (redirect) |
| `/preorder/` | Preorder flow — market preorder | 9 | 1,804 | commerce | active |
| `/preorder/status/` | Preorder status lookup | 4 | ~200 | commerce | active |
| `/product/[slug]/` | Product detail page | 4 | 1,038 | commerce | active |
| `/request-a-flavor/` | Fresh batch request — request a flavor | 2 | 529 | customer | active |
| `/quiz/` | Product recommendation quiz | 2 | 177 | customer | active |
| `/reviews/` | Product reviews | 2 | 29 | customer | partial |
| `/rewards/` | Redirects to `/catalog` | 1 | 5 | customer | active (redirect) |
| `/gratitude/` | Gratitude rewards dashboard | 4 | 306 | customer | partial |
| `/gratitude/rewards/` | Rewards page | 2 | ~50 | customer | partial |
| `/subscriptions/` | Redirects to `/catalog` | 1 | 5 | commerce | active (redirect) |
| `/subscriptions/gratitude-box/` | Gratitude Box pilot — curated bundles | 3 | 53 | commerce | experimental |
| `/wholesale/` | Wholesale / partner inquiries | 1 | 147 | customer | active |
| `/telegram-alerts/` | Telegram opt-in page | 1 | 104 | customer | active |
| `/policies/` | Store policies | 2 | 275 | customer | active |
| `/privacy/` | Privacy policy | 2 | 202 | customer | active |
| `/terms/` | Terms of service | 2 | 278 | customer | active |
| `/unsubscribe/` | Email unsubscribe | 2 | 145 | customer | active |
| `/offline/` | Offline fallback page | 2 | 67 | infrastructure | active |
| `/robots.ts` | Robots.txt generation | 1 | ~20 | infrastructure | active |
| `/sitemap.ts` | Sitemap generation | 1 | ~30 | infrastructure | active |
| `/(site)/community/` | Redirects to `/about` | 1 | 5 | customer | deprecated |
| `/(site)/instagram/[slug]/` | Instagram post display | 2 | ~150 | customer | partial |

### 2.2 Admin Routes

| Route | Purpose | Files | Lines | Mission | Status |
|-------|---------|-------|-------|---------|--------|
| `/admin/` | Admin dashboard — overview, stats, quick actions | 1 | ~400 | admin | active |
| `/admin/layout.js` | Admin layout — sidebar nav, auth check | 1 | ~300 | admin | active |
| `/admin/login/` | Admin login page | 1 | ~100 | admin | active |
| `/admin/analytics/` | Analytics dashboard | 2 | ~200 | admin | active |
| `/admin/campaigns/` | Email campaign management | 3 | ~300 | admin | active |
| `/admin/campaigns/new/` | Create new campaign | 2 | ~100 | admin | active |
| `/admin/coupons/` | Coupon management | 2 | ~200 | admin | active |
| `/admin/customers/` | Customer management | 2 | ~200 | admin | active |
| `/admin/emails/` | Email management | 1 | ~100 | admin | active |
| `/admin/errors/` | Error log viewer | 2 | ~100 | admin | active |
| `/admin/forgot-password/` | Admin password reset | 2 | ~100 | admin | active |
| `/admin/reset-password/` | Admin password reset form | 2 | ~100 | admin | active |
| `/admin/fresh-batches/` | Fresh batch request management | 1 | ~200 | admin | active |
| `/admin/fresh-batches/planner/` | Batch planner | 1 | ~200 | admin | active |
| `/admin/interactions/` | Customer interactions | 2 | ~100 | admin | active |
| `/admin/inventory/` | Inventory management | 2 | ~200 | admin | active |
| `/admin/market-day/` | Market day dashboard | 2 | ~200 | admin | active |
| `/admin/market-setup/` | Market setup | 2 | ~200 | admin | active |
| `/admin/markets/` | Market management | 3 | ~300 | admin | active |
| `/admin/menus/` | Menu management | 3 | ~300 | admin | active |
| `/admin/orders/` | Order management | 3 | ~400 | admin | active |
| `/admin/products/` | Product management | 6 | ~600 | admin | active |
| `/admin/products/[id]/` | Product detail/edit | 3 | ~300 | admin | active |
| `/admin/qr-generator/` | QR code generator | 2 | ~100 | admin | active |
| `/admin/queue/` | Queue management | 2 | ~200 | admin | active |
| `/admin/reviews/` | Review management | 2 | ~100 | admin | active |
| `/admin/settings/` | Admin settings | 2 | ~200 | admin | active |
| `/admin/setup/` | Initial admin setup | 2 | ~100 | admin | active |
| `/admin/square-oauth/` | Square OAuth flow | 2 | ~100 | admin | active |
| `/admin/waitlist/` | Waitlist management | 2 | ~100 | admin | active |

### 2.3 Vendor Route

| Route | Purpose | Files | Lines | Mission | Status |
|-------|---------|-------|-------|---------|--------|
| `/vendor/queue/` | Real-time staff order queue — market operations | 2 | 949 | commerce | active |

---

## 3. API Routes (`/api/`)

### 3.1 Admin API (30 routes)

| Route | Purpose | Status |
|-------|---------|--------|
| `/api/admin/analytics` | Admin analytics data | active |
| `/api/admin/auth/csrf` | CSRF token | active |
| `/api/admin/auth/login` | Admin login | active |
| `/api/admin/auth/logout` | Admin logout | active |
| `/api/admin/auth/me` | Current admin session | active |
| `/api/admin/auth/reset-password` | Admin password reset | active |
| `/api/admin/campaigns` | Campaign CRUD | active |
| `/api/admin/campaigns/send` | Send campaign | active |
| `/api/admin/coupons/[id]` | Coupon CRUD | active |
| `/api/admin/coupons` | Coupon list | active |
| `/api/admin/customers/[id]` | Customer detail | active |
| `/api/admin/customers` | Customer list | active |
| `/api/admin/emails` | Email management | active |
| `/api/admin/emergency-init` | Emergency system init | active |
| `/api/admin/fresh-batch/requests` | Fresh batch requests | active |
| `/api/admin/fresh-batch/reservations` | Fresh batch reservations | active |
| `/api/admin/inventory/[productId]` | Inventory update | active |
| `/api/admin/markets` | Market CRUD | active |
| `/api/admin/markets/seed` | Seed market data | active |
| `/api/admin/menus` | Menu CRUD | active |
| `/api/admin/menus/archive` | Archive menus | active |
| `/api/admin/notifications` | Notification management | active |
| `/api/admin/orders` | Order management | active |
| `/api/admin/orders/[id]/refund` | Order refund | active |
| `/api/admin/orders/sync` | Sync orders | active |
| `/api/admin/products` | Product CRUD | active |
| `/api/admin/products/[id]` | Product detail | active |
| `/api/admin/products/[id]/sync` | Sync single product | active |
| `/api/admin/reviews` | Review management | active |
| `/api/admin/setup` | System setup | active |

**Untracked admin API routes (new/uncommitted):**
| Route | Purpose | Status |
|-------|---------|--------|
| `/api/admin/sanitize-products` | Sanitize product data | experimental |
| `/api/admin/sanitize` | General data sanitization | experimental |
| `/api/admin/token-status` | Token status check | experimental |
| `/api/admin/menus/archive/` | Menu archive (new) | experimental |

### 3.2 Customer / Public API (50+ routes)

| Route | Purpose | Status |
|-------|---------|--------|
| `/api/health` | Health check | active |
| `/api/health/payments` | Payment health check | active |
| `/api/startup` | Startup validation | active |
| `/api/catalog` | Catalog data | active |
| `/api/storefront/catalog` | Storefront catalog | active |
| `/api/storefront/square-catalog` | Direct Square catalog fetch | active |
| `/api/products` | Products list | active |
| `/api/cart` | Cart operations | active |
| `/api/cart/price` | Cart pricing | active |
| `/api/checkout` | **DEPRECATED** — returns 410 Gone | deprecated |
| `/api/create-checkout` | Create checkout session | active |
| `/api/orders` | Orders list | active |
| `/api/orders/create` | Create order | active |
| `/api/orders/[id]/status` | Order status | active |
| `/api/orders/by-ref` | Order lookup by reference | active |
| `/api/orders/search` | Order search | active |
| `/api/pay/process` | **DEPRECATED** — returns 410 Gone | deprecated |
| `/api/payments` | Process payment | active |
| `/api/payments/square` | Square payment | active |
| `/api/payments/refund` | Refund payment | active |
| `/api/square/config` | Square client config | active |
| `/api/square/diagnose` | Square diagnostics | active |
| `/api/square/test-rest` | Square REST test | active |
| `/api/square/validate-token` | Square token validation | active |
| `/api/auth/login` | Customer login | active |
| `/api/auth/logout` | Customer logout | active |
| `/api/auth/register` | Customer registration | active |
| `/api/auth/session` | Session check | active |
| `/api/auth/forgot-password` | Password reset request | active |
| `/api/auth/reset-password` | Password reset | active |
| `/api/customer/profile` | Customer profile | active |
| `/api/user/profile` | User profile | active |
| `/api/user/orders` | User orders | active |
| `/api/user/favorites` | User favorites | active |
| `/api/user/rewards` | User rewards | active |
| `/api/user/stats` | User stats | active |
| `/api/user/email-preferences` | Email preferences | active |
| `/api/user/challenge` | Wellness challenge | active |
| `/api/user/challenge/checkin` | Challenge check-in | active |
| `/api/markets` | Markets list | active |
| `/api/markets/warm` | Warm market cache | active |
| `/api/market/today` | Today's market | active |
| `/api/menus` | Menus list | active |
| `/api/menus/current` | Current menu | active |
| `/api/inventory` | Inventory check | active |
| `/api/inventory/lock` | Lock inventory | active |
| `/api/inventory/release` | Release inventory | active |
| `/api/inventory/confirm` | Confirm inventory | active |
| `/api/preorder` | Preorder operations | active |
| `/api/preorder/confirm` | Confirm preorder | active |
| `/api/preorder/cancel` | Cancel preorder | active |
| `/api/preorder/status` | Preorder status | active |
| `/api/fresh-batch/requests` | Fresh batch requests | active |
| `/api/queue/join` | Join queue | active |
| `/api/queue/active` | Active queue | active |
| `/api/queue/position/[id]` | Queue position | active |
| `/api/queue/update` | Update queue | active |
| `/api/delivery/quote` | Delivery quote | active |
| `/api/shipping/rates` | Shipping rates | active |
| `/api/coupons/validate` | Validate coupon | active |
| `/api/contact` | Contact form | active |
| `/api/lead` | Lead capture | active |
| `/api/newsletter/subscribe` | Newsletter subscribe | active |
| `/api/unsubscribe` | Unsubscribe | active |
| `/api/notifications` | Notifications | active |
| `/api/quiz` | Quiz data | active |
| `/api/search/enhanced` | Enhanced search | active |
| `/api/seo/analyze` | SEO analysis | active |
| `/api/analytics` | Analytics | active |
| `/api/analytics/web-vitals` | Web vitals | active |
| `/api/csp-report` | CSP violation report | active |
| `/api/errors/list` | Error list | active |
| `/api/errors/summary` | Error summary | active |
| `/api/reports/daily` | Daily report | active |
| `/api/retention/winback` | Winback campaign | active |
| `/api/returns/create` | Return request | active |
| `/api/subscriptions` | Subscriptions | active |
| `/api/subscriptions/gratitude-box` | Gratitude Box | active |
| `/api/rewards/add-points` | Add reward points | active |
| `/api/rewards/passport` | Rewards passport | active |
| `/api/gratitude/account` | Gratitude account | active |
| `/api/gratitude/earn` | Earn rewards | active |
| `/api/gratitude/redeem` | Redeem rewards | active |
| `/api/gratitude/rewards` | Rewards data | active |
| `/api/gratitude/transactions` | Reward transactions | active |
| `/api/gratitude/referral/code` | Referral code | active |
| `/api/gratitude/referral/track` | Track referral | active |
| `/api/gratitude/webhook` | Gratitude webhook | active |
| `/api/instagram/posts` | Instagram posts | active |
| `/api/instagram/post/[slug]` | Single Instagram post | active |
| `/api/instagram/sync` | Sync Instagram | active |
| `/api/oauth/square/authorize` | Square OAuth authorize | active |
| `/api/oauth/square/callback` | Square OAuth callback | active |
| `/api/oauth/square/status` | Square OAuth status | active |
| `/api/ics/market-route` | ICS calendar export | active |
| `/api/debug/square` | Square debug | active |
| `/api/token-status` | Token status (untracked) | experimental |

### 3.3 Cron / Webhook Routes

| Route | Purpose | Status |
|-------|---------|--------|
| `/api/cron/daily-report` | Daily admin report (Vercel Cron) | active |
| `/api/cron/owner-alerts` | Owner alert queue processor (Vercel Cron) | active |
| `/api/cron/cleanup-abandoned-orders` | Cleanup abandoned orders | active |
| `/api/cron/cleanup-locks` | Cleanup stale locks | active |
| `/api/webhooks/square` | Square webhook handler | active |
| `/api/webhooks/square/payment` | Square payment webhook | active |
| `/api/webhooks/resend` | Resend webhook | active |

---

## 4. Key Library Modules (`lib/`)

### 4.1 Core Infrastructure

| Module | Purpose | Files | Lines | Status |
|--------|---------|-------|-------|--------|
| `lib/logger.ts` | Logging utility | 1 | ~100 | active |
| `lib/database.ts` | MongoDB connection wrapper | 1 | ~200 | active |
| `lib/db-optimized.ts` | Optimized DB connection (pooled) | 1 | ~200 | active |
| `lib/db-client.js` | DB client | 1 | ~100 | active |
| `lib/db-admin.js` | Admin DB operations | 1 | ~200 | active |
| `lib/db-customers.js` | Customer DB operations | 1 | ~200 | active |
| `lib/db/users.js` | User DB operations | 1 | ~150 | active |
| `lib/cache.ts` | Cache layer | 1 | ~100 | active |
| `lib/redis.ts` | Redis client | 1 | ~100 | active |
| `lib/redis-idempotency.ts` | Redis idempotency | 1 | ~200 | active |
| `lib/redis-idempotency-stub.ts` | Redis idempotency stub (fallback) | 1 | ~100 | active |
| `lib/rate-limit.ts` | Rate limiting | 1 | ~100 | active |
| `lib/retry.ts` | Retry utility | 1 | ~50 | active |
| `lib/error-tracker.ts` | Error tracking | 1 | ~100 | active |
| `lib/health-monitor.ts` | Health monitoring | 1 | ~100 | active |
| `lib/monitoring.ts` | Monitoring | 1 | ~100 | active |
| `lib/monitoring-dashboard.ts` | Monitoring dashboard | 1 | ~100 | active |
| `lib/request-context.ts` | Request context | 1 | ~50 | active |
| `lib/response-optimizer.js` | Response optimization | 1 | ~100 | active |
| `lib/response-sanitizer.ts` | Response sanitization | 1 | ~100 | active |
| `lib/secure-storage.ts` | Secure storage | 1 | ~50 | active |
| `lib/site-config.ts` | Site configuration constants | 1 | ~100 | active |
| `lib/utils.ts` | General utilities | 1 | ~100 | active |
| `lib/money.ts` | Money/currency utilities | 1 | ~100 | active |
| `lib/date-utils.ts` | Date utilities | 1 | ~100 | active |
| `lib/pwa.ts` | PWA utilities | 1 | ~50 | active |
| `lib/haptics.ts` | Haptic feedback | 1 | ~50 | active |
| `lib/startup-validator.ts` | Startup validation | 1 | ~100 | active |
| `lib/diagnostics-guard.ts` | Diagnostics guard | 1 | ~100 | active |

### 4.2 Authentication & Security

| Module | Purpose | Files | Lines | Status |
|--------|---------|-------|-------|--------|
| `lib/auth-config.ts` | Auth configuration | 1 | ~100 | active |
| `lib/auth.ts` | Auth utilities | 1 | ~200 | active |
| `lib/auth/jwt.js` | JWT handling | 1 | ~200 | active |
| `lib/auth/middleware.js` | Auth middleware | 1 | ~200 | active |
| `lib/auth/validation.js` | Auth validation | 1 | ~200 | active |
| `lib/auth/unified-admin.ts` | Unified admin auth | 1 | ~200 | active |
| `lib/admin-auth.js` | Admin auth | 1 | ~200 | active |
| `lib/admin-auth-middleware.js` | Admin auth middleware | 1 | ~200 | active |
| `lib/admin-session.ts` | Admin session (Edge-safe) | 1 | ~100 | active |
| `lib/admin-token.ts` | Admin token | 1 | ~100 | active |
| `lib/admin-fetch.ts` | Admin fetch client | 1 | ~100 | active |
| `lib/security/index.ts` | Security module (RBAC, audit) | 1 | ~500 | active |
| `lib/security/redis.ts` | Security Redis | 1 | ~200 | active |
| `lib/middleware/admin.ts` | Admin middleware | 1 | ~200 | active |
| `lib/middleware/versioned-api.ts` | API versioning middleware | 1 | ~200 | active |

### 4.3 Square / Payments

| Module | Purpose | Files | Lines | Status |
|--------|---------|-------|-------|--------|
| `lib/square.ts` | Square SDK client factory | 1 | ~200 | active |
| `lib/square-api.ts` | Square REST API client | 1 | ~500 | active |
| `lib/square-guard.ts` | Square environment guard | 1 | ~100 | active |
| `lib/square-env-validator.ts` | Square env validation | 1 | ~100 | active |
| `lib/square-oauth-helper.ts` | Square OAuth helper | 1 | ~100 | active |
| `lib/square-price-serializer.ts` | Price serialization | 1 | ~200 | active |
| `lib/square-visibility.js` | Product visibility | 1 | ~200 | active |
| `lib/square-customer.ts` | Square customer | 1 | ~100 | active |
| `lib/square-orders-sync.js` | Order sync | 1 | ~200 | active |
| `lib/square/catalogSync.js` | Catalog sync | 1 | ~300 | active |
| `lib/square/syncSingleItem.js` | Single item sync | 1 | ~200 | active |
| `lib/square/syncToUnified.js` | Sync to unified format | 1 | ~200 | active |
| `lib/payments/index.ts` | Payment module | 1 | ~100 | active |
| `lib/payments/config.ts` | Payment config | 1 | ~100 | active |
| `lib/payment-orchestrator.js` | Payment orchestration | 1 | ~200 | active |
| `lib/simple-square-redirect.js` | Simple Square redirect | 1 | ~100 | active |
| `lib/sandbox-detection.js` | Sandbox detection | 1 | ~100 | active |

### 4.4 Cart & Checkout

| Module | Purpose | Files | Lines | Status |
|--------|---------|-------|-------|--------|
| `lib/cart-engine.ts` | Cart engine (unified) | 1 | ~500 | active |
| `lib/cart-pricing.ts` | Cart pricing | 1 | ~200 | active |
| `lib/cartUtils.js` | Cart utilities | 1 | ~200 | active |
| `lib/unified-cart.js` | Unified cart | 1 | ~200 | active |
| `lib/actions/cart.ts` | Cart server actions | 1 | ~200 | active |
| `lib/checkout-telemetry.ts` | Checkout observability | 1 | ~200 | active |
| `lib/order-utils.ts` | Order utilities | 1 | ~200 | active |
| `lib/order-access-token.js` | Order access token | 1 | ~100 | active |
| `lib/purchase-status.js` | Purchase status | 1 | ~100 | active |
| `lib/fulfillment.ts` | Fulfillment logic | 1 | ~200 | active |
| `lib/delivery-fees.ts` | Delivery fees | 1 | ~100 | active |
| `lib/delivery-pricing.js` | Delivery pricing | 1 | ~100 | active |
| `lib/delivery-radius.js` | Delivery radius | 1 | ~100 | active |
| `lib/delivery-zones.js` | Delivery zones | 1 | ~100 | active |
| `lib/shipping-service.ts` | Shipping service | 1 | ~200 | active |
| `lib/pricing.ts` | Pricing utilities | 1 | ~100 | active |

### 4.5 Products & Catalog

| Module | Purpose | Files | Lines | Status |
|--------|---------|-------|-------|--------|
| `lib/products.js` | Product utilities | 1 | ~200 | active |
| `lib/product-normalizer.js` | Product normalization | 1 | ~200 | active |
| `lib/product-enhancements.js` | Product enhancements | 1 | ~200 | active |
| `lib/product-sync-engine.js` | Product sync engine | 1 | ~300 | active |
| `lib/catalog-api.ts` | Catalog API | 1 | ~200 | active |
| `lib/storefront-products.js` | Storefront product data | 1 | ~300 | active |
| `lib/storefront-query.js` | Storefront query | 1 | ~200 | active |
| `lib/storefront-integrity.js` | Storefront integrity | 1 | ~200 | active |
| `lib/demo-products.js` | Demo/fallback products | 1 | ~200 | active |
| `lib/normalizeVariants.ts` | Variant normalization | 1 | ~100 | active |
| `lib/status-normalization.js` | Status normalization | 1 | ~100 | active |
| `lib/inventory-sync.js` | Inventory sync | 1 | ~200 | active |
| `lib/inventory-lock.ts` | Inventory locking | 1 | ~200 | active |
| `lib/custom-inventory.js` | Custom inventory | 1 | ~200 | active |

### 4.6 Email & Communication

| Module | Purpose | Files | Lines | Status |
|--------|---------|-------|-------|--------|
| `lib/resend-email.js` | Resend email client | 1 | ~200 | active |
| `lib/email/resend-client.js` | Resend client wrapper | 1 | ~100 | active |
| `lib/email/service.js` | Email service (templates, send) | 1 | ~500 | active |
| `lib/email/templates.js` | Email templates | 1 | ~300 | active |
| `lib/email/unsubscribe-tokens.ts` | Unsubscribe tokens | 1 | ~100 | active |
| `lib/email-config.js` | Email configuration | 1 | ~100 | active |
| `lib/email-queue.js` | Email queue | 1 | ~200 | active |
| `lib/email-templates.js` | Email templates (legacy) | 1 | ~200 | active |
| `lib/owner-alerts.ts` | Owner alert router (Telegram + Resend) | 1 | ~300 | active |
| `lib/staff-notifications.js` | Staff notifications | 1 | ~200 | active |
| `lib/push-notifications.ts` | Push notifications | 1 | ~100 | active |
| `lib/notifications.ts` | Notifications (not found in listing) | — | — | — |

### 4.7 Marketing & Campaigns

| Module | Purpose | Files | Lines | Status |
|--------|---------|-------|-------|--------|
| `lib/campaign-manager.js` | Campaign management | 1 | ~300 | active |
| `lib/ai-newsletter.js` | AI newsletter generation | 1 | ~300 | active |
| `lib/nurture-sequence.js` | Nurture email sequence | 1 | ~200 | active |
| `lib/quiz-utils.js` | Quiz utilities | 1 | ~100 | active |
| `lib/quiz-emails.js` | Quiz email triggers | 1 | ~100 | active |
| `lib/adaptive-recommendations.js` | Adaptive recommendations | 1 | ~200 | active |

### 4.8 Rewards & Gratitude

| Module | Purpose | Files | Lines | Status |
|--------|---------|-------|-------|--------|
| `lib/gratitude/core.js` | Gratitude rewards core | 1 | ~500 | active |
| `lib/gratitude/accounts.js` | Gratitude accounts | 1 | ~300 | active |
| `lib/gratitude/referrals.js` | Referral system | 1 | ~300 | active |
| `lib/gratitude/rewards-catalog.js` | Rewards catalog | 1 | ~200 | active |
| `lib/gratitude/transactions.js` | Reward transactions | 1 | ~300 | active |
| `lib/enhanced-rewards.js` | Enhanced rewards | 1 | ~200 | active |
| `lib/rewards-audit-logger.js` | Rewards audit log | 1 | ~100 | active |
| `lib/rewards-fraud-detection.js` | Rewards fraud detection | 1 | ~200 | active |
| `lib/rewards-secure.js` | Secure rewards | 1 | ~200 | active |
| `lib/rewards-security.js` | Rewards security | 1 | ~200 | active |

### 4.9 Fresh Batch System

| Module | Purpose | Files | Lines | Status |
|--------|---------|-------|-------|--------|
| `lib/batches/types.ts` | Batch types | 1 | ~200 | active |
| `lib/batches/state-machine.ts` | State machine guards | 1 | ~300 | active |
| `lib/batches/repository.ts` | Batch repository | 1 | ~200 | active |
| `lib/batches/validation.ts` | Batch validation | 1 | ~200 | active |
| `lib/batches/pricing.ts` | Batch pricing | 1 | ~100 | active |
| `lib/batches/quantity-converter.ts` | Quantity conversion | 1 | ~100 | active |
| `lib/batches/square-reservations.ts` | Square reservations | 1 | ~200 | active |
| `lib/batches/audit-log.ts` | Batch audit log | 1 | ~100 | active |
| `lib/batches/batch-decision-engine.ts` | Batch decision engine | 1 | ~200 | active |
| `lib/batches/email-templates.ts` | Batch email templates | 1 | ~200 | active |

### 4.10 Markets & Menus

| Module | Purpose | Files | Lines | Status |
|--------|---------|-------|-------|--------|
| `lib/markets/index.ts` | Markets module | 1 | ~50 | active |
| `lib/markets/types.ts` | Market types | 1 | ~100 | active |
| `lib/markets/schema.ts` | Market schema | 1 | ~100 | active |
| `lib/markets/repository.ts` | Market repository | 1 | ~200 | active |
| `lib/markets.ts` | Markets (legacy) | 1 | ~200 | active |
| `lib/menus/index.ts` | Menus module | 1 | ~50 | active |
| `lib/menus/types.ts` | Menu types | 1 | ~100 | active |
| `lib/menus/schema.ts` | Menu schema | 1 | ~100 | active |
| `lib/menus/repository.ts` | Menu repository | 1 | ~200 | active |
| `lib/menus/week-utils.ts` | Week utilities (untracked) | 1 | ~100 | experimental |
| `lib/menu-schema.ts` | Menu schema (untracked) | 1 | ~100 | experimental |
| `lib/weekly-menu.ts` | Weekly menu (untracked) | 1 | ~100 | experimental |

### 4.11 Preorder

| Module | Purpose | Files | Lines | Status |
|--------|---------|-------|-------|--------|
| `lib/preorder/repository.ts` | Preorder repository | 1 | ~200 | active |
| `lib/preorder/rules.ts` | Preorder rules | 1 | ~100 | active |
| `lib/preorder/square-notifications.ts` | Square notifications | 1 | ~100 | active |
| `lib/preorder/tokens.ts` | Preorder tokens | 1 | ~100 | active |
| `lib/preorder/waitlist.ts` | Preorder waitlist | 1 | ~100 | active |

### 4.12 SEO & Content

| Module | Purpose | Files | Lines | Status |
|--------|---------|-------|-------|--------|
| `lib/seo/index.ts` | SEO module | 1 | ~50 | active |
| `lib/seo/metadata.ts` | Metadata generation | 1 | ~300 | active |
| `lib/seo/meta-tags.ts` | Meta tags | 1 | ~200 | active |
| `lib/seo/structured-data.tsx` | Structured data (JSON-LD) | 1 | ~300 | active |
| `lib/seo/rich-snippets.ts` | Rich snippets | 1 | ~200 | active |
| `lib/seo/local-business.ts` | Local business schema | 1 | ~200 | active |
| `lib/seo/content-optimizer.ts` | Content optimizer | 1 | ~200 | active |
| `lib/seo.js` | SEO utilities (legacy) | 1 | ~200 | active |
| `lib/crawler.ts` | Web crawler | 1 | ~200 | active |
| `lib/ingredient-data-extended.js` | Extended ingredient data | 1 | ~500 | active |
| `lib/ingredient-taxonomy.js` | Ingredient taxonomy | 1 | ~200 | active |
| `lib/health-benefits.js` | Health benefit data | 1 | ~300 | active |
| `lib/learning/default-modules.js` | Learning modules | 1 | ~1000 | active |
| `lib/learning/service.js` | Learning service | 1 | ~800 | active |

### 4.13 Analytics

| Module | Purpose | Files | Lines | Status |
|--------|---------|-------|-------|--------|
| `lib/analytics.ts` | Analytics core | 1 | ~200 | active |
| `lib/analytics-default.ts` | Default analytics | 1 | ~100 | active |
| `lib/analytics-events.js` | Analytics events | 1 | ~200 | active |
| `lib/unified-analytics.js` | Unified analytics | 1 | ~200 | active |
| `lib/ga4-analytics.js` | Google Analytics 4 | 1 | ~200 | active |
| `lib/admin-analytics.js` | Admin analytics | 1 | ~200 | active |
| `lib/client-logger.js` | Client-side logger | 1 | ~100 | active |

### 4.14 Validation

| Module | Purpose | Files | Lines | Status |
|--------|---------|-------|-------|--------|
| `lib/validation/index.ts` | Validation module | 1 | ~200 | active |
| `lib/validation/cart.ts` | Cart validation | 1 | ~200 | active |
| `lib/validation/customer.ts` | Customer validation | 1 | ~200 | active |
| `lib/validation/fulfillment.ts` | Fulfillment validation | 1 | ~200 | active |
| `lib/validation/sanitize.ts` | Sanitization | 1 | ~200 | active |
| `lib/validation/api-versioning.ts` | API versioning | 1 | ~200 | active |

### 4.15 Other

| Module | Purpose | Files | Lines | Status |
|--------|---------|-------|-------|--------|
| `lib/subscription-access.ts` | Subscription access | 1 | ~100 | active |
| `lib/subscription-practical.ts` | Practical subscriptions | 1 | ~100 | active |
| `lib/subscription-tiers.js` | Subscription tiers | 1 | ~100 | active |
| `lib/returns.ts` | Returns | 1 | ~100 | active |
| `lib/review-visibility.js` | Review visibility | 1 | ~100 | active |
| `lib/transactions.ts` | Transactions | 1 | ~100 | active |
| `lib/queue-integration.js` | Queue integration | 1 | ~200 | active |
| `lib/enhanced-order-tracking.js` | Enhanced order tracking | 1 | ~200 | active |
| `lib/event-queue.ts` | Event queue | 1 | ~100 | active |
| `lib/idempotency.ts` | Idempotency | 1 | ~100 | active |
| `lib/critical-operations.ts` | Critical operations | 1 | ~100 | active |
| `lib/smart-alerting.ts` | Smart alerting | 1 | ~100 | active |
| `lib/search-enhanced.ts` | Enhanced search | 1 | ~200 | active |
| `lib/search/enhanced-search.js` | Enhanced search (legacy) | 1 | ~300 | active |
| `lib/i18n/config.js` | i18n config | 1 | ~50 | dormant |
| `lib/i18n/index.js` | i18n index | 1 | ~100 | dormant |
| `lib/models/QueuePosition.js` | Queue position Mongoose model | 1 | ~135 | active |
| `lib/overlay-presence.js` | Overlay presence | 1 | ~100 | active |

---

## 5. Components (`components/`)

### 5.1 Shared / UI Components

| Component | Purpose | Status |
|-----------|---------|--------|
| `components/ui/*` | shadcn/ui component library (~40 components) | active |
| `components/Header.jsx` | Site header | active |
| `components/Footer.tsx` | Site footer | active |
| `components/BottomNav.jsx` | Mobile bottom navigation | active |
| `components/DesktopNav.tsx` | Desktop navigation | active |
| `components/MegaMenu.jsx` | Mega menu | active |
| `components/NavigationMenu.tsx` (in ui/) | Navigation menu | active |
| `components/SearchBar.jsx` | Search bar | active |
| `components/Breadcrumbs.tsx` | Breadcrumbs | active |
| `components/ErrorBoundary.jsx` | Error boundary | active |
| `components/LoadingSpinner.jsx` | Loading spinner | active |
| `components/SkeletonProductCard.jsx` | Skeleton loading card | active |
| `components/ClientOnly.tsx` | Client-only wrapper | active |
| `components/ClientPageWrapper.tsx` | Client page wrapper | active |
| `components/SearchParamsProvider.tsx` | Search params provider | active |
| `components/SkipLinks.jsx` | Accessibility skip links | active |

### 5.2 Commerce Components

| Component | Purpose | Status |
|-----------|---------|--------|
| `components/ProductCard.jsx` | Product card | active |
| `components/EnhancedProductCard.jsx` | Enhanced product card | active |
| `components/ProductImage.jsx` | Product image | active |
| `components/ProductReviews.jsx` | Product reviews | active |
| `components/VariantSelector.jsx` | Variant selector | active |
| `components/QuickAddButton.jsx` | Quick add to cart | active |
| `components/SquareProductButton.jsx` | Square product button | active |
| `components/CartBadge.tsx` | Cart badge | active |
| `components/FloatingCart.jsx` | Floating cart | active |
| `components/CouponInput.jsx` | Coupon input | active |
| `components/SubscriptionSelector.jsx` | Subscription selector | active |
| `components/CheckoutProgress.jsx` | Checkout progress | active |
| `components/EnhancedFulfillmentSelector.jsx` | Fulfillment selector | active |
| `components/EnhancedMarketCard.jsx` | Market card | active |
| `components/InfoBoardProductCard.jsx` | Info board product card | active |
| `components/InventoryBadge.jsx` | Inventory badge | active |
| `components/StarRating.jsx` | Star rating | active |
| `components/IngredientsSchema.tsx` | Ingredients schema | active |
| `components/JsonLd.tsx` | JSON-LD structured data | active |
| `components/SEOHead.tsx` | SEO head | active |

### 5.3 Checkout Components

| Component | Purpose | Status |
|-----------|---------|--------|
| `components/checkout/CheckoutRoot.tsx` | Checkout root | active |
| `components/checkout/CheckoutProgress.tsx` | Checkout progress | active |
| `components/checkout/CheckoutErrorBoundary.tsx` | Checkout error boundary | active |
| `components/checkout/CartSummary.tsx` | Cart summary | active |
| `components/checkout/ContactForm.tsx` | Contact form | active |
| `components/checkout/DeliveryForm.tsx` | Delivery form | active |
| `components/checkout/FulfillmentTabs.tsx` | Fulfillment tabs | active |
| `components/checkout/PickupForm.tsx` | Pickup form | active |
| `components/checkout/ShippingForm.tsx` | Shipping form | active |
| `components/checkout/ReviewAndPay.tsx` | Review and pay | active |
| `components/checkout/PaymentErrorUI.tsx` | Payment error UI | active |
| `components/checkout/PaymentStateMachine.tsx` | Payment state machine | active |
| `components/checkout/SquarePaymentForm.tsx` | Square payment form | active |
| `components/checkout/SquarePaymentFormV2.tsx` | Square payment form v2 | active |

### 5.4 Home & Catalog

| Component | Purpose | Status |
|-----------|---------|--------|
| `components/home/HomePageClient.jsx` | Homepage client component | active |
| `components/catalog/CatalogPageClient.jsx` | Catalog page client | active |
| `components/weekly-menu/WeeklyMenuPage.tsx` | Weekly menu page | active |
| `components/HeroSection.tsx` | Hero section | active |

### 5.5 Market Components

| Component | Purpose | Status |
|-----------|---------|--------|
| `components/market/InventoryManager.tsx` | Market inventory manager | active |
| `components/market/LiveLocationBanner.tsx` | Live location banner | active |
| `components/market/MarketDayDashboard.tsx` | Market day dashboard | active |
| `components/market/MarketStatusSection.tsx` | Market status section | active |
| `components/market/PWAPrompts.tsx` | PWA prompts | active |
| `components/market/index.ts` | Market module index | active |

### 5.6 Admin Components

| Component | Purpose | Status |
|-----------|---------|--------|
| `components/admin/ProtectedRoute.js` | Admin route protection | active |
| `components/admin/MobileLayout.tsx` | Admin mobile layout | active |
| `components/admin/MobileCard.tsx` | Admin mobile card | active |
| `components/admin/QuickActions.tsx` | Admin quick actions | active |
| `components/AdminLayoutWrapper.jsx` | Admin layout wrapper | active |

### 5.7 PWA Components

| Component | Purpose | Status |
|-----------|---------|--------|
| `components/PWAInitializer.tsx` | PWA initialization | active |
| `components/PWAPrompt.tsx` | PWA install prompt | active |
| `components/PWAUpdateNotifier.tsx` | PWA update notifier | active |
| `components/PWADiagnostics.tsx` | PWA diagnostics | active |

### 5.8 Other Components

| Component | Purpose | Status |
|-----------|---------|--------|
| `components/AddToCalendarButton.jsx` | Add to calendar | active |
| `components/CookieConsent.tsx` | Cookie consent | active |
| `components/ContactInfo.jsx` | Contact info | active |
| `components/CustomerLayout.jsx` | Customer layout | active |
| `components/HelpCenter.jsx` | Help center | active |
| `components/InstagramFeed.jsx` | Instagram feed | active |
| `components/NewsletterSignup.jsx` | Newsletter signup | active |
| `components/OptimizedImage.jsx` | Optimized image | active |
| `components/RetentionForm.jsx` | Retention/lead form | active |
| `components/explore/interactive/*` | Ingredient explorer components | active |
| `components/ingredients/*` | Ingredient showcase components | active |
| `components/psychology/ScarcityBadge.jsx` | Scarcity badge | active |
| `components/psychology/SoldOutBadge.jsx` | Sold out badge | active |
| `components/preorder/BundleSuggestions.tsx` | Bundle suggestions | active |
| `components/subscriptions/GratitudeBoxPage.tsx` | Gratitude Box page | active |
| `components/analytics/GoogleAnalytics.jsx` | Google Analytics | active |
| `components/analytics/WebVitals.tsx` | Web vitals | active |
| `components/cart/CartNotification.jsx` | Cart notification | active |
| `components/cart/EnhancedFloatingCart.jsx` | Enhanced floating cart | active |

---

## 6. Data Files (`data/`)

| File | Purpose | Lines | Status |
|------|---------|-------|--------|
| `data/products.ts` | Static product definitions (fallback) | ~800 | active |
| `data/weeklyMenu.ts` | Weekly menu builder | ~300 | active |
| `data/markets.ts` | Market pickup locations | ~200 | active |
| `data/bundles.ts` | Product bundles | ~200 | active |
| `data/quiz.ts` | Quiz questions and logic | ~200 | active |
| `data/ingredients/product-ingredients-map.ts` | Product-ingredient mapping | ~200 | active |
| `data/ingredients/shared-ingredients.ts` | Shared ingredient data | ~200 | active |

---

## 7. Scripts (`scripts/`)

| Script | Purpose | Status |
|--------|---------|--------|
| `scripts/syncCatalog.js` / `.ts` | Square catalog sync | active |
| `scripts/create-admin-user.js` | Create admin user | active |
| `scripts/create-first-admin.js` | Create first admin | active |
| `scripts/create-test-user.js` | Create test user | active |
| `scripts/init-admin-user.js` | Initialize admin user | active |
| `scripts/setup-database.js` | Database setup | active |
| `scripts/setup-database-indexes.js` | Database indexes | active |
| `scripts/create-email-indexes.js` | Email indexes | active |
| `scripts/ensure-indexes.ts` | Ensure indexes | active |
| `scripts/initialize-rewards-indexes.js` | Rewards indexes | active |
| `scripts/test-mongodb.js` | MongoDB test | active |
| `scripts/verify-square-auth.js` | Square auth verification | active |
| `scripts/testSquareIntegration.ts` | Square integration test | active |
| `scripts/insert-sandbox-products.js` | Insert sandbox products | active |
| `scripts/remove-sandbox-products.js` | Remove sandbox products | active |
| `scripts/cleanup-sandbox.mjs` | Cleanup sandbox data | active |
| `scripts/test-pay-flow.sh` | Payment flow test | active |
| `scripts/test-payment-api.sh` | Payment API test | active |
| `scripts/diagnose-payments.sh` | Payment diagnostics | active |
| `scripts/verify-payment-fixes.sh` | Verify payment fixes | active |
| `scripts/deploy-production.sh` | Production deploy | active |
| `scripts/deploy-vercel.sh` | Vercel deploy | active |
| `scripts/deploy-docker.sh` | Docker deploy | active |
| `scripts/gratog-deploy-guard.sh` | Deploy guard | active |
| `scripts/verify-deployment.js` | Deployment verification | active |
| `scripts/vercel-health-monitor.js` | Vercel health monitor | active |
| `scripts/monitor-and-fix.js` | Monitor and auto-fix | active |
| `scripts/fix-deployment-issues.js` | Fix deployment issues | active |
| `scripts/fix-all-api-routes.js` | Fix API routes | active |
| `scripts/fix-api-routes.js` | Fix API routes | active |
| `scripts/fix-auth-pages.js` | Fix auth pages | active |
| `scripts/fix-button-types.sh` | Fix button types | active |
| `scripts/fix-use-client-order.js` | Fix use client order | active |
| `scripts/fix-use-client-order-all.js` | Fix use client order (all) | active |
| `scripts/add-edge-runtime.js` | Add edge runtime | active |
| `scripts/add-edge-runtime-all.js` | Add edge runtime (all) | active |
| `scripts/remove-edge-runtime.js` | Remove edge runtime | active |
| `scripts/add-dynamic-to-all-pages.js` | Add dynamic to pages | active |
| `scripts/flatten-app-structure.sh` | Flatten app structure | active |
| `scripts/pre-launch-fixes.sh` | Pre-launch fixes | active |
| `scripts/check-pwa-readiness.js` | PWA readiness check | active |
| `scripts/check-pwa-status.sh` | PWA status check | active |
| `scripts/generate-pwa-icons.js` | Generate PWA icons | active |
| `scripts/check-route-coverage.js` | Route coverage check | active |
| `scripts/run-review-qa-e2e.js` | Review QA e2e | active |
| `scripts/send-review-request-campaign.js` | Review request campaign | active |
| `scripts/weekly-menu-broadcast.ts` | Weekly menu broadcast | active |
| `scripts/pickup-reminders.ts` | Pickup reminders | active |
| `scripts/verify-production-closure.sh` | Production closure verification | active |
| `scripts/catalog-sync-cron.sh` | Catalog sync cron | active |
| `scripts/extract-music-snippets.sh` | Extract music snippets | active |
| `scripts/verify-music-integration.sh` | Verify music integration | active |
| `scripts/verify-products.js` | Product verification | active |
| `scripts/tog-funnel-check.js` | TOG funnel check | active |
| `scripts/tog-telegram-notify.js` | TOG Telegram notify | active |
| `scripts/upsert-menu080626.js` | Upsert menu data | active |
| `scripts/_route-coverage-allowlist.json` | Route coverage allowlist | active |

**Untracked scripts:**
| Script | Purpose | Status |
|--------|---------|--------|
| `scripts/archive-expired-menus.ts` | Archive expired menus | experimental |
| `scripts/mongo-check.mjs` | MongoDB check | experimental |
| `scripts/sanitize-mongo-products.mjs` | Sanitize MongoDB products | experimental |

---

## 8. Models (`models/`)

| Model | Purpose | Lines | Status |
|-------|---------|-------|--------|
| `models/DailyInventory.ts` | Daily inventory Mongoose model | ~70 | active |
| `models/MarketOrder.ts` | Market order Mongoose model | ~70 | active |
| `models/MarketSchedule.ts` | Market schedule Mongoose model | ~70 | active |

---

## 9. Stores & State Management

| File | Purpose | Lines | Status |
|------|---------|-------|--------|
| `stores/checkout.ts` | Checkout state (Zustand) | ~500 | active |
| `stores/rewards.ts` | Rewards state | ~500 | active |
| `stores/wishlist.ts` | Wishlist state | ~200 | active |
| `store/cart.ts` | Cart state (Zustand) | ~200 | active |

---

## 10. Services

| File | Purpose | Lines | Status |
|------|---------|-------|--------|
| `services/checkout.ts` | Checkout service | ~500 | active |
| `services/order.ts` | Order service | ~200 | active |

---

## 11. Hooks

| Hook | Purpose | Status |
|------|---------|--------|
| `hooks/use-mobile.jsx` | Mobile detection | active |
| `hooks/use-toast.js` | Toast notifications | active |
| `hooks/useAnalytics.js` | Analytics hook | active |
| `hooks/useCartEngine.js` | Cart engine hook | active |
| `hooks/useExitIntent.js` | Exit intent detection | active |
| `hooks/usePullToRefresh.tsx` | Pull to refresh | active |
| `hooks/useSearch.js` | Search hook | active |
| `hooks/useSquarePayments.ts` | Square payments hook | active |
| `hooks/useSwipe.ts` | Swipe gesture hook | active |

---

## 12. Adapters

| Adapter | Purpose | Lines | Status |
|---------|---------|-------|--------|
| `adapters/cartAdapter.ts` | Cart adapter | ~150 | active |
| `adapters/fulfillmentAdapter.ts` | Fulfillment adapter | ~150 | active |
| `adapters/totalsAdapter.ts` | Totals adapter | ~100 | active |

---

## 13. Contexts

| Context | Purpose | Status |
|---------|---------|--------|
| `contexts/AuthContext.js` | Auth context provider | active |
| `contexts/LocaleContext.js` | Locale context | dormant |

---

## 14. Types

| File | Purpose | Status |
|------|---------|--------|
| `types/product.ts` | Product type definitions | active |
| `types/square.d.ts` | Square type declarations | active |
| `types/twilio.d.ts` | Twilio type declarations | dormant |
| `types/lucide-react.d.ts` | Lucide React type declarations | active |

---

## 15. Tests

| Directory | Files | Lines | Status |
|-----------|-------|-------|--------|
| `__tests__/` | 3 | ~500 | active |
| `tests/` | 57 | ~11,420 | active |
| `e2e/` | 20 | ~4,619 | active |

### Test Categories
- **Unit tests**: `tests/unit/*` — cart, pricing, fulfillment, inventory, shipping, subscriptions, rewards, square sync, batch decision engine
- **Integration tests**: `tests/api/*`, `tests/square/*` — payment flow, square API, auth
- **E2E tests**: `e2e/*` — checkout, critical journeys, full site, payment flows, hardening
- **Admin tests**: `tests/fresh-batch/*` — state machine, auth, transitions, reservations
- **Other**: content quality, hydration, navigation, SEO, PWA, reviews, sandbox filtering

---

## 16. CI/CD & GitHub

| File | Purpose | Status |
|------|---------|--------|
| `.github/workflows/ci.yml` | CI pipeline | active |
| `.github/workflows/deploy.yml` | Deploy workflow | active |
| `.github/workflows/test.yml` | Test workflow | active |
| `.github/workflows/smoke-tests.yml` | Smoke tests | active |
| `.github/workflows/e2e-on-preview.yml` | E2E on preview | active |
| `.github/workflows/pay-flow-e2e.yml` | Payment flow E2E | active |
| `.github/workflows/payment-api-validation.yml` | Payment API validation | active |
| `.github/workflows/security-scanning.yml` | Security scanning | active |
| `.github/workflows/accessibility-audit.yml` | Accessibility audit | active |
| `.github/workflows/cross-browser-e2e.yml` | Cross-browser E2E | active |
| `.github/workflows/visual-regression.yml` | Visual regression | active |
| `.github/workflows/performance-monitoring.yml` | Performance monitoring | active |
| `.github/workflows/health-monitor.yml` | Health monitor | active |
| `.github/workflows/integration-tests.yml` | Integration tests | active |
| `.github/workflows/post-deploy-test.yml` | Post-deploy test | active |
| `.github/workflows/production-closure.yml` | Production closure | active |
| `.github/workflows/release-automation.yml` | Release automation | active |

---

## 17. Documentation (`docs/`)

| Directory | Files | Lines | Status |
|-----------|-------|-------|--------|
| `docs/audit/` | ~30 | ~5,000 | historical |
| `docs/audit/business/` | ~20 | ~4,000 | historical |
| `docs/audit/email/` | ~12 | ~3,000 | historical |
| `docs/audit/orders/` | ~10 | ~2,000 | historical |
| `docs/audits/` | ~25 | ~5,000 | historical |
| `docs/system-rationalization/` | 2 | ~500 | current |
| `docs/business/` | 1 | ~200 | current |
| Other docs | ~10 | ~2,000 | mixed |

---

## 18. Root-Level Files

| File | Purpose | Status |
|------|---------|--------|
| `middleware.ts` | Edge middleware — admin auth, route protection | active |
| `next.config.js` | Next.js configuration | active |
| `vercel.json` | Vercel configuration | active |
| `package.json` | Dependencies and scripts | active |
| `tsconfig.json` | TypeScript configuration | active |
| `tailwind.config.js` | Tailwind CSS configuration | active |
| `postcss.config.js` | PostCSS configuration | active |
| `sentry.client.config.ts` | Sentry client config | active |
| `sentry.edge.config.ts` | Sentry edge config | active |
| `sentry.server.config.ts` | Sentry server config | active |
| `.env.example` | Environment variable template | active |
| `.env.local` | Local env (gitignored) | active |
| `.env.prod` | Production env (gitignored) | active |
| `.env.vercel` | Vercel env (gitignored) | active |
| `vitest.config.ts` | Vitest configuration | active |
| `vitest.db.config.ts` | DB test configuration | active |
| `vitest.integration.config.ts` | Integration test config | active |
| `vitest.square.config.ts` | Square test config | active |
| `playwright.config.ts` | Playwright config | active |
| `playwright.payflow.config.ts` | Payment flow Playwright config | active |
| `playwright.full.config.ts` | Full Playwright config | active |
| `playwright.hardening.config.ts` | Hardening Playwright config | active |
| `playwright.smoke.config.ts` | Smoke Playwright config | active |
| `lighthouserc.js` | Lighthouse CI config | active |
| `ecosystem.config.js` | PM2 ecosystem config | active |
| `jsconfig.json` | JS config | active |
| `next-env.d.ts` | Next.js env types | active |
| `openapi-chatgpt.json` | OpenAPI spec | active |

---

## 19. Legacy / Deprecated

| Item | Location | Status |
|------|----------|--------|
| `pages/api/menu.ts` | Legacy Pages Router API | deprecated |
| `backend/server.py` | Python backend | deprecated |
| `backend/server.py.backup` | Python backup | deprecated |
| `frontend/` | Empty frontend directory | dormant |
| `app/(site)/community/` | Redirects to /about | deprecated |
| `app/api/checkout/` | Returns 410 Gone | deprecated |
| `app/api/pay/process/` | Returns 410 Gone | deprecated |
| `lib/i18n/` | i18n module (unused) | dormant |
| `types/twilio.d.ts` | Twilio types (SMS removed) | dormant |

---

## 20. Summary by Mission Category

| Category | Files (approx) | Lines (approx) | % of Codebase |
|----------|---------------|----------------|---------------|
| **commerce** (cart, checkout, orders, payments, products, preorder) | ~200 | ~30,000 | 24% |
| **customer** (pages, content, explore, quiz, contact, FAQ) | ~100 | ~12,000 | 10% |
| **admin** (dashboard, CRUD, analytics, campaigns) | ~90 | ~15,000 | 12% |
| **data** (static data, types, schemas) | ~20 | ~4,000 | 3% |
| **infrastructure** (DB, cache, auth, middleware, config) | ~80 | ~15,000 | 12% |
| **communication** (email, alerts, notifications, campaigns) | ~30 | ~8,000 | 6% |
| **development** (tests, scripts, CI/CD, docs) | ~200 | ~40,000 | 32% |

---

## 21. Key Observations

1. **High test/script/doc ratio**: ~32% of the codebase is development support (tests, scripts, CI/CD, docs). This is unusually high for a small business site.

2. **Multiple implementations of same concepts**: Cart has 4+ implementations (cart-engine, cartUtils, unified-cart, cart actions). Square has both SDK and REST clients. Email has both legacy and modular templates.

3. **Deprecated endpoints still live**: `/api/checkout` and `/api/pay/process` return 410 but still exist in the codebase. Legacy `pages/api/menu.ts` is untracked.

4. **Admin surface is large**: 30 admin API routes + 25 admin pages = significant maintenance burden for a single-operator business.

5. **Untracked experimental code**: Several new modules (menu-schema, week-utils, sanitize routes) exist only in the working tree and are not committed.

6. **Dormant systems**: i18n module, Twilio types, Python backend, and frontend directory suggest abandoned experiments.

7. **Fresh Batch system is substantial**: 10 lib modules + 2 admin pages + 2 API routes dedicated to the flavor request system.

8. **Gratitude rewards system is complex**: 5 lib modules + 8 API routes + 2 pages for a rewards program whose current production status is unclear.
