# TOG-ROUTE-MAP.md — Taste of Gratitude Route Map

Generated: 2026-07-29 18:47 EDT
Authority: Native Termux workspace

---

## 1. Public Page Routes

| Route | Type | Auth | Customer | Admin | Mission | Notes |
|-------|------|------|----------|-------|---------|-------|
| `/` | page | no | yes | no | customer | Homepage, static ISR, revalidates every 5 min |
| `/about` | page | no | yes | no | customer | About/story page |
| `/account` | page | no | yes | no | customer | Shows "temporarily unavailable" — broken |
| `/account/subscriptions` | page | no | yes | no | customer | Subscription management |
| `/account/subscriptions/[id]` | page | no | yes | no | customer | Single subscription |
| `/cart` | page | no | yes | no | commerce | Redirects to `/checkout` |
| `/catalog` | page | no | yes | no | commerce | Product catalog, SSR, revalidates 5 min |
| `/checkout` | page | no | yes | no | commerce | Checkout flow, Square Web Payments |
| `/checkout/square` | page | no | yes | no | commerce | Square checkout page |
| `/checkout/success` | page | no | yes | no | commerce | Order success page |
| `/contact` | page | no | yes | no | customer | Contact form |
| `/explore` | page | no | yes | no | customer | Explore hub |
| `/explore/ingredients` | page | no | yes | no | customer | Ingredient explorer (46 ingredients) |
| `/explore/ingredients/[slug]` | page | no | yes | no | customer | Single ingredient detail |
| `/explore/learn` | page | no | yes | no | customer | Learning center |
| `/explore/learn/[slug]` | page | no | yes | no | customer | Single learning article |
| `/faq` | page | no | yes | no | customer | FAQ page |
| `/forgot-password` | page | no | yes | no | customer | Password reset request |
| `/gratitude` | page | no | yes | no | customer | Gratitude rewards dashboard |
| `/gratitude/rewards` | page | no | yes | no | customer | Rewards page |
| `/info-board` | page | no | yes | no | customer | Kiosk-ready product info (no selling) |
| `/login` | page | no | yes | no | customer | Customer login |
| `/markets` | page | no | yes | no | customer | Market info (Serenbe, Dunwoody) |
| `/menu` | page | no | yes | no | commerce | Redirects to `/weekly-menu` |
| `/offline` | page | no | yes | no | infrastructure | Offline fallback |
| `/order` | page | no | yes | no | commerce | Redirects to `/checkout` |
| `/order/start` | page | no | yes | no | commerce | Order start — market selection |
| `/order/menu` | page | no | yes | no | commerce | Order from weekly menu |
| `/order/[id]` | page | no | yes | no | commerce | Order detail |
| `/order/[id]/queue` | page | no | yes | no | commerce | Queue position |
| `/order/complete` | page | no | yes | no | commerce | Order completion |
| `/order/success` | page | no | yes | no | commerce | Order success (enhanced + legacy) |
| `/order/status/[id]` | page | no | yes | no | commerce | Order status lookup |
| `/policies` | page | no | yes | no | customer | Store policies |
| `/preorder` | page | no | yes | no | commerce | Preorder flow |
| `/preorder/status` | page | no | yes | no | commerce | Preorder status lookup |
| `/privacy` | page | no | yes | no | customer | Privacy policy |
| `/product/[slug]` | page | no | yes | no | commerce | Product detail |
| `/profile` | page | no | yes | no | customer | Customer profile |
| `/profile/challenge` | page | no | yes | no | customer | Wellness challenge |
| `/profile/orders` | page | no | yes | no | customer | Order history |
| `/profile/rewards` | page | no | yes | no | customer | Rewards dashboard |
| `/profile/settings` | page | no | yes | no | customer | Profile settings |
| `/quiz` | page | no | yes | no | customer | Product recommendation quiz |
| `/register` | page | no | yes | no | customer | Customer registration |
| `/request-a-flavor` | page | no | yes | no | customer | Fresh batch flavor request |
| `/reset-password` | page | no | yes | no | customer | Password reset form |
| `/reviews` | page | no | yes | no | customer | Product reviews |
| `/rewards` | page | no | yes | no | customer | Redirects to `/catalog` |
| `/subscriptions` | page | no | yes | no | commerce | Redirects to `/catalog` |
| `/subscriptions/gratitude-box` | page | no | yes | no | commerce | Gratitude Box pilot |
| `/telegram-alerts` | page | no | yes | no | customer | Telegram opt-in page |
| `/terms` | page | no | yes | no | customer | Terms of service |
| `/unsubscribe` | page | no | yes | no | customer | Email unsubscribe |
| `/vendor/queue` | page | no | yes | no | commerce | Staff order queue (market operations) |
| `/weekly-menu` | page | no | yes | no | commerce | Weekly menu landing, SSR |
| `/wholesale` | page | no | yes | no | customer | Wholesale/partner inquiries |
| `/(site)/community` | page | no | yes | no | customer | Redirects to `/about` — deprecated |
| `/(site)/instagram/[slug]` | page | no | yes | no | customer | Instagram post display |

## 2. Admin Page Routes

| Route | Type | Auth | Customer | Admin | Mission | Notes |
|-------|------|------|----------|-------|---------|-------|
| `/admin` | page | admin | no | yes | admin | Dashboard |
| `/admin/analytics` | page | admin | no | yes | admin | Analytics dashboard |
| `/admin/campaigns` | page | admin | no | yes | admin | Campaign management |
| `/admin/campaigns/new` | page | admin | no | yes | admin | New campaign |
| `/admin/coupons` | page | admin | no | yes | admin | Coupon management |
| `/admin/customers` | page | admin | no | yes | admin | Customer management |
| `/admin/emails` | page | admin | no | yes | admin | Email management |
| `/admin/errors` | page | admin | no | yes | admin | Error log viewer |
| `/admin/forgot-password` | page | admin | no | yes | admin | Admin password reset |
| `/admin/fresh-batches` | page | admin | no | yes | admin | Fresh batch requests |
| `/admin/fresh-batches/planner` | page | admin | no | yes | admin | Batch planner |
| `/admin/interactions` | page | admin | no | yes | admin | Customer interactions |
| `/admin/inventory` | page | admin | no | yes | admin | Inventory management |
| `/admin/login` | page | no | no | yes | admin | Admin login (public) |
| `/admin/market-day` | page | admin | no | yes | admin | Market day dashboard |
| `/admin/market-setup` | page | admin | no | yes | admin | Market setup |
| `/admin/markets` | page | admin | no | yes | admin | Market management |
| `/admin/menus` | page | admin | no | yes | admin | Menu management |
| `/admin/orders` | page | admin | no | yes | admin | Order management |
| `/admin/products` | page | admin | no | yes | admin | Product management |
| `/admin/products/[id]` | page | admin | no | yes | admin | Product detail/edit |
| `/admin/qr-generator` | page | admin | no | yes | admin | QR code generator |
| `/admin/queue` | page | admin | no | yes | admin | Queue management |
| `/admin/reset-password` | page | admin | no | yes | admin | Admin password reset form |
| `/admin/reviews` | page | admin | no | yes | admin | Review management |
| `/admin/settings` | page | admin | no | yes | admin | Admin settings |
| `/admin/setup` | page | admin | no | yes | admin | Initial setup |
| `/admin/square-oauth` | page | admin | no | yes | admin | Square OAuth flow |
| `/admin/waitlist` | page | admin | no | yes | admin | Waitlist management |

## 3. API Routes

### 3.1 Admin API

| Route | Method | Auth | Customer | Admin | Mission | Notes |
|-------|--------|------|----------|-------|---------|-------|
| `/api/admin/analytics` | GET | admin | no | yes | admin | Analytics data |
| `/api/admin/auth/csrf` | GET | none | no | yes | admin | CSRF token (public) |
| `/api/admin/auth/login` | POST | none | no | yes | admin | Admin login (public) |
| `/api/admin/auth/logout` | POST | none | no | yes | admin | Admin logout (public) |
| `/api/admin/auth/me` | GET | admin | no | yes | admin | Current session |
| `/api/admin/auth/reset-password` | POST | none | no | yes | admin | Password reset (public) |
| `/api/admin/campaigns` | GET/POST | admin | no | yes | admin | Campaign CRUD |
| `/api/admin/campaigns/send` | POST | admin | no | yes | admin | Send campaign |
| `/api/admin/coupons/[id]` | GET/PUT/DELETE | admin | no | yes | admin | Coupon CRUD |
| `/api/admin/coupons` | GET/POST | admin | no | yes | admin | Coupon list |
| `/api/admin/customers/[id]` | GET/PUT | admin | no | yes | admin | Customer detail |
| `/api/admin/customers` | GET | admin | no | yes | admin | Customer list |
| `/api/admin/emails` | GET/POST | admin | no | yes | admin | Email management |
| `/api/admin/emergency-init` | POST | admin | no | yes | admin | Emergency init |
| `/api/admin/fresh-batch/requests` | GET/POST | admin | no | yes | admin | Batch requests |
| `/api/admin/fresh-batch/reservations` | GET/POST | admin | no | yes | admin | Batch reservations |
| `/api/admin/inventory/[productId]` | PUT | admin | no | yes | admin | Inventory update |
| `/api/admin/markets` | GET/POST | admin | no | yes | admin | Market CRUD |
| `/api/admin/markets/seed` | POST | admin | no | yes | admin | Seed markets |
| `/api/admin/menus` | GET/POST | admin | no | yes | admin | Menu CRUD |
| `/api/admin/menus/archive` | POST | admin | no | yes | admin | Archive menus |
| `/api/admin/notifications` | GET/POST | admin | no | yes | admin | Notifications |
| `/api/admin/orders` | GET | admin | no | yes | admin | Order list |
| `/api/admin/orders/[id]/refund` | POST | admin | no | yes | admin | Refund order |
| `/api/admin/orders/sync` | POST | admin | no | yes | admin | Sync orders |
| `/api/admin/products` | GET/POST | admin | no | yes | admin | Product CRUD |
| `/api/admin/products/[id]` | GET/PUT/DELETE | admin | no | yes | admin | Product detail |
| `/api/admin/products/[id]/sync` | POST | admin | no | yes | admin | Sync product |
| `/api/admin/reviews` | GET/POST | admin | no | yes | admin | Review management |
| `/api/admin/setup` | POST | admin | no | yes | admin | System setup |

### 3.2 Customer / Public API

| Route | Method | Auth | Customer | Admin | Mission | Notes |
|-------|--------|------|----------|-------|---------|-------|
| `/api/health` | GET | no | no | no | infrastructure | Health check |
| `/api/health/payments` | GET | no | no | no | infrastructure | Payment health |
| `/api/startup` | GET | no | no | no | infrastructure | Startup validation |
| `/api/catalog` | GET | no | yes | no | commerce | Catalog data |
| `/api/storefront/catalog` | GET | no | yes | no | commerce | Storefront catalog |
| `/api/storefront/square-catalog` | GET | no | yes | no | commerce | Direct Square catalog |
| `/api/products` | GET | no | yes | no | commerce | Products list |
| `/api/cart` | GET/POST | no | yes | no | commerce | Cart operations |
| `/api/cart/price` | POST | no | yes | no | commerce | Cart pricing |
| `/api/checkout` | POST | no | yes | no | commerce | **DEPRECATED** — 410 Gone |
| `/api/create-checkout` | POST | no | yes | no | commerce | Create checkout |
| `/api/orders` | GET | no | yes | no | commerce | Orders list |
| `/api/orders/create` | POST | no | yes | no | commerce | Create order |
| `/api/orders/[id]/status` | GET | no | yes | no | commerce | Order status |
| `/api/orders/by-ref` | GET | no | yes | no | commerce | Order by reference |
| `/api/orders/search` | GET | no | yes | no | commerce | Order search |
| `/api/pay/process` | POST | no | yes | no | commerce | **DEPRECATED** — 410 Gone |
| `/api/payments` | POST | no | yes | no | commerce | Process payment |
| `/api/payments/square` | POST | no | yes | no | commerce | Square payment |
| `/api/payments/refund` | POST | no | yes | no | commerce | Refund |
| `/api/square/config` | GET | no | yes | no | commerce | Square client config |
| `/api/square/diagnose` | GET | no | no | no | development | Square diagnostics |
| `/api/square/test-rest` | GET | no | no | no | development | Square REST test |
| `/api/square/validate-token` | GET | no | no | no | development | Token validation |
| `/api/auth/login` | POST | no | yes | no | customer | Customer login |
| `/api/auth/logout` | POST | no | yes | no | customer | Customer logout |
| `/api/auth/register` | POST | no | yes | no | customer | Customer register |
| `/api/auth/session` | GET | no | yes | no | customer | Session check |
| `/api/auth/forgot-password` | POST | no | yes | no | customer | Password reset request |
| `/api/auth/reset-password` | POST | no | yes | no | customer | Password reset |
| `/api/customer/profile` | GET | yes | yes | no | customer | Customer profile |
| `/api/user/profile` | GET | yes | yes | no | customer | User profile |
| `/api/user/orders` | GET | yes | yes | no | customer | User orders |
| `/api/user/favorites` | GET/POST | yes | yes | no | customer | User favorites |
| `/api/user/rewards` | GET | yes | yes | no | customer | User rewards |
| `/api/user/stats` | GET | yes | yes | no | customer | User stats |
| `/api/user/email-preferences` | GET/PUT | yes | yes | no | customer | Email preferences |
| `/api/user/challenge` | GET/POST | yes | yes | no | customer | Wellness challenge |
| `/api/user/challenge/checkin` | POST | yes | yes | no | customer | Challenge check-in |
| `/api/markets` | GET | no | yes | no | customer | Markets list |
| `/api/markets/warm` | GET | no | no | no | infrastructure | Warm market cache |
| `/api/market/today` | GET | no | yes | no | customer | Today's market |
| `/api/menus` | GET | no | yes | no | commerce | Menus list |
| `/api/menus/current` | GET | no | yes | no | commerce | Current menu |
| `/api/inventory` | GET | no | yes | no | commerce | Inventory check |
| `/api/inventory/lock` | POST | no | yes | no | commerce | Lock inventory |
| `/api/inventory/release` | POST | no | yes | no | commerce | Release inventory |
| `/api/inventory/confirm` | POST | no | yes | no | commerce | Confirm inventory |
| `/api/preorder` | POST | no | yes | no | commerce | Preorder operations |
| `/api/preorder/confirm` | POST | no | yes | no | commerce | Confirm preorder |
| `/api/preorder/cancel` | POST | no | yes | no | commerce | Cancel preorder |
| `/api/preorder/status` | GET | no | yes | no | commerce | Preorder status |
| `/api/fresh-batch/requests` | POST | no | yes | no | customer | Fresh batch request |
| `/api/queue/join` | POST | no | yes | no | commerce | Join queue |
| `/api/queue/active` | GET | no | yes | no | commerce | Active queue |
| `/api/queue/position/[id]` | GET | no | yes | no | commerce | Queue position |
| `/api/queue/update` | POST | no | yes | no | commerce | Update queue |
| `/api/delivery/quote` | POST | no | yes | no | commerce | Delivery quote |
| `/api/shipping/rates` | GET | no | yes | no | commerce | Shipping rates |
| `/api/coupons/validate` | POST | no | yes | no | commerce | Validate coupon |
| `/api/contact` | POST | no | yes | no | customer | Contact form |
| `/api/lead` | POST | no | yes | no | customer | Lead capture |
| `/api/newsletter/subscribe` | POST | no | yes | no | customer | Newsletter subscribe |
| `/api/unsubscribe` | GET | no | yes | no | customer | Unsubscribe |
| `/api/notifications` | GET | no | yes | no | customer | Notifications |
| `/api/quiz` | GET | no | yes | no | customer | Quiz data |
| `/api/search/enhanced` | GET | no | yes | no | customer | Enhanced search |
| `/api/seo/analyze` | GET | no | no | no | development | SEO analysis |
| `/api/analytics` | POST | no | no | no | infrastructure | Analytics |
| `/api/analytics/web-vitals` | POST | no | no | no | infrastructure | Web vitals |
| `/api/csp-report` | POST | no | no | no | infrastructure | CSP violation report |
| `/api/errors/list` | GET | no | no | no | development | Error list |
| `/api/errors/summary` | GET | no | no | no | development | Error summary |
| `/api/reports/daily` | GET | no | no | no | infrastructure | Daily report |
| `/api/retention/winback` | POST | no | yes | no | customer | Winback campaign |
| `/api/returns/create` | POST | no | yes | no | commerce | Return request |
| `/api/subscriptions` | GET/POST | no | yes | no | commerce | Subscriptions |
| `/api/subscriptions/gratitude-box` | POST | no | yes | no | commerce | Gratitude Box |
| `/api/rewards/add-points` | POST | no | yes | no | customer | Add reward points |
| `/api/rewards/passport` | GET | no | yes | no | customer | Rewards passport |
| `/api/gratitude/account` | GET | no | yes | no | customer | Gratitude account |
| `/api/gratitude/earn` | POST | no | yes | no | customer | Earn rewards |
| `/api/gratitude/redeem` | POST | no | yes | no | customer | Redeem rewards |
| `/api/gratitude/rewards` | GET | no | yes | no | customer | Rewards data |
| `/api/gratitude/transactions` | GET | no | yes | no | customer | Reward transactions |
| `/api/gratitude/referral/code` | GET | no | yes | no | customer | Referral code |
| `/api/gratitude/referral/track` | POST | no | yes | no | customer | Track referral |
| `/api/gratitude/webhook` | POST | no | no | no | infrastructure | Gratitude webhook |
| `/api/instagram/posts` | GET | no | yes | no | customer | Instagram posts |
| `/api/instagram/post/[slug]` | GET | no | yes | no | customer | Single Instagram post |
| `/api/instagram/sync` | POST | no | no | no | infrastructure | Sync Instagram |
| `/api/oauth/square/authorize` | GET | no | no | no | admin | Square OAuth authorize |
| `/api/oauth/square/callback` | GET | no | no | no | admin | Square OAuth callback |
| `/api/oauth/square/status` | GET | no | no | no | admin | Square OAuth status |
| `/api/ics/market-route` | GET | no | yes | no | customer | ICS calendar export |
| `/api/debug/square` | GET | no | no | no | development | Square debug |

### 3.3 Cron / Webhook API

| Route | Method | Auth | Customer | Admin | Mission | Notes |
|-------|--------|------|----------|-------|---------|-------|
| `/api/cron/daily-report` | GET | CRON_SECRET | no | yes | admin | Daily admin report |
| `/api/cron/owner-alerts` | GET | CRON_SECRET | no | yes | admin | Owner alert queue |
| `/api/cron/cleanup-abandoned-orders` | GET | CRON_SECRET | no | no | commerce | Cleanup abandoned orders |
| `/api/cron/cleanup-locks` | GET | CRON_SECRET | no | no | infrastructure | Cleanup stale locks |
| `/api/webhooks/square` | POST | Square sig | no | no | commerce | Square webhook handler |
| `/api/webhooks/square/payment` | POST | Square sig | no | no | commerce | Square payment webhook |
| `/api/webhooks/resend` | POST | Resend sig | no | no | communication | Resend webhook |

### 3.4 Untracked / Experimental API Routes

| Route | Method | Auth | Customer | Admin | Mission | Notes |
|-------|--------|------|----------|-------|---------|-------|
| `/api/admin/sanitize-products` | POST | admin | no | yes | admin | Sanitize products (untracked) |
| `/api/admin/sanitize` | POST | admin | no | yes | admin | General sanitize (untracked) |
| `/api/admin/token-status` | GET | admin | no | yes | admin | Token status (untracked) |
| `/api/token-status` | GET | no | no | no | development | Token status (untracked) |

---

## 4. Route Summary

| Category | Count |
|----------|-------|
| Public page routes | 55 |
| Admin page routes | 29 |
| Admin API routes | 30 |
| Customer/public API routes | 90+ |
| Cron/webhook API routes | 7 |
| Untracked/experimental API routes | 4 |
| **Total routes** | **~215** |
