# TOG-SYSTEM-DEPENDENCY-MAP.md

Taste of Gratitude — System Dependency Map

Generated: 2026-07-29 19:22 EDT
Authority: Native Termux workspace
Status: High-level dependency map based on code inventory; detailed static analysis blocked by runtime degradation.

---

## 1. Core Commerce Dependency Chain

```
Customer Browser
  → Next.js App Router
    → Layout (Header/Footer/PWA/Analytics/AuthContext)
      → Homepage / Catalog / Product / Weekly Menu
        → components (ProductCard, QuickAddButton, FloatingCart)
          → /api/storefront/square-catalog  (Square catalog)
            → lib/square-api.ts
              → Square REST API
          → /api/cart, /api/cart/price
            → lib/cart-engine.ts, lib/cart-pricing.ts
          → /checkout
            → components/checkout/*
              → /api/orders/create
                → MongoDB orders collection
                → Square create order
              → Square Web Payments SDK
              → /api/payments
                → Square create payment
                → MongoDB payment_records
                → lib/owner-alerts.ts (Telegram + Resend)
                → lib/email/service.js (Resend customer email)
              → /api/webhooks/square
                → Square signature verification
                → MongoDB order update
                → owner alerts / customer email
```

## 2. Admin Dependency Chain

```
Admin Browser
  → /admin/login
    → /api/admin/auth/login
      → lib/admin-session.ts / lib/auth/unified-admin.ts
        → MongoDB admin_users
  → /admin/*
    → AdminLayoutWrapper (auth check)
      → /api/admin/*
        → MongoDB collections
        → Square API (products, orders sync)
        → Resend (campaigns, emails)
```

## 3. Weekly Menu / Markets Chain

```
/data/weeklyMenu.ts (static)
  + lib/menus/week-utils.ts (uncommitted date fix)
  → /weekly-menu, / (homepage), /markets/warm cron
    → /api/menus/current
      → MongoDB menus collection (currently stale)
    → /api/markets/warm
      → Resend email to subscribers
```

## 4. Notification Chain

```
Order event / cron
  → lib/owner-alerts.ts
    → Telegram API (primary)
    → lib/email/service.js → Resend (fallback)
  → lib/staff-notifications.js
    → Resend (STAFF_EMAIL)
  → lib/email/service.js
    → Resend (customer confirmations)
```

## 5. Key Dependencies by System

| System | Depends On | Depended On By |
|--------|-----------|----------------|
| Square API | SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID | Payments, orders, webhooks, admin sync |
| MongoDB | MONGODB_URI | Orders, users, admin, menus, inventory, campaigns |
| Resend | RESEND_API_KEY | Customer email, owner alerts, campaigns |
| Telegram | TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID | Owner alerts |
| Redis/Upstash | REDIS_URL / Upstash | Cache, idempotency, queue (if used) |
| Vercel Cron | CRON_SECRET | Daily report, owner alerts, cleanup, winback, warm |

## 6. Duplication / Overlap Map

| Concern | Systems | Recommended Authority |
|---------|---------|----------------------|
| Cart | `lib/cart-engine.ts`, `lib/cart-pricing.ts`, `lib/unified-cart.js`, `lib/actions/cart.ts`, `lib/cartUtils.js` | `lib/cart-engine.ts` |
| Email | `lib/resend-email.js`, `lib/email/service.js`, `lib/email-templates.js`, `lib/email/templates.js` | `lib/email/service.js` |
| Product data | Square runtime, `data/products.ts`, `lib/demo-products.js`, `lib/storefront-products.js` | Square runtime |
| Weekly menu | `data/weeklyMenu.ts`, `lib/menus/*`, MongoDB `menus` | `data/weeklyMenu.ts` + `lib/menus/*` (remove stale DB menu) |
| Rewards | `lib/enhanced-rewards.js`, `lib/gratitude/*`, `lib/rewards-*` | Consolidate or archive |
| Search | `lib/search-enhanced.ts`, `lib/search/enhanced-search.js`, `/api/search/enhanced` | `lib/search-enhanced.ts` |
| SEO | `lib/seo/*`, `lib/seo.js` | `lib/seo/*` |
| Admin auth | `lib/admin-session.ts`, `lib/admin-auth.js`, `lib/admin-auth-middleware.js`, `lib/auth/unified-admin.ts`, `lib/admin-token.ts` | `lib/admin-session.ts` |
| Markets | `lib/markets.ts`, `lib/markets/*`, `data/markets.ts` | `lib/markets/*` |
| Menus | `lib/menus/*`, `lib/menu-schema.ts`, `lib/weekly-menu.ts`, `data/weeklyMenu.ts` | `lib/menus/*` + `data/weeklyMenu.ts` |

---

*Next: TOG-SYSTEM-USAGE-REPORT.md*
