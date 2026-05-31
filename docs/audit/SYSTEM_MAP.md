# SYSTEM_MAP — Gratog Platform Architecture

> Generated read-only from code at commit `f9d20e98`. Every claim cites a real file.

## 1. Top-level architecture

```diagram
                    ╭───────────────────────────────────────────╮
                    │ CUSTOMER (browser / PWA)                  │
                    │  - mobile-first, Service Worker (sw.js)   │
                    │  - Square Web Payments SDK loaded         │
                    ╰────────────────────┬──────────────────────╯
                                         │ HTTPS
                                         ▼
   ╭─────────────────────────────────────────────────────────────────────────╮
   │           Next.js 15.3 App Router  (deployed on Vercel)                  │
   │                                                                          │
   │  ╭───────────────╮   ╭──────────────────╮   ╭───────────────────────╮   │
   │  │ Public pages  │   │ Customer pages   │   │ Admin pages           │   │
   │  │ /, /catalog,  │   │ /checkout,       │   │ /admin/* (protected   │   │
   │  │ /product/*,   │   │ /order/success,  │   │ by middleware.ts and  │   │
   │  │ /quiz, ...    │   │ /profile, ...    │   │ admin_token cookie)   │   │
   │  ╰───────────────╯   ╰──────────────────╯   ╰───────────────────────╯   │
   │                              │                                          │
   │  ╭─────────────────────── API Routes (/api/*) ─────────────────────────╮ │
   │  │  Existing: 93 route files (see _routes-existing.txt)                │ │
   │  │  Referenced-but-missing: 64 (see _missing-routes.txt) — many        │ │
   │  │  deleted by cleanup commit 04768656                                 │ │
   │  ╰─────────────────────────────────────────────────────────────────────╯ │
   ╰─────────────────────────────────────────────────────────────────────────╯
              │                  │                  │              │
              ▼                  ▼                  ▼              ▼
   ╭────────────────╮  ╭────────────────╮  ╭───────────────╮  ╭────────────╮
   │ MongoDB Atlas  │  │ Square API     │  │ Resend API    │  │ Sentry     │
   │ via mongoose   │  │ - Catalog      │  │ - Send mail   │  │ error log  │
   │ ^8.x (driver   │  │ - Payments     │  │ - Webhook     │  │            │
   │ wraps mongodb  │  │ - Customers    │  │   events      │  │            │
   │ v6 client)     │  │ - Orders       │  │               │  │            │
   ╰────────────────╯  ╰────────────────╯  ╰───────────────╯  ╰────────────╯
                                │
                                ▼
                       ╭──────────────────╮
                       │ Square Webhooks  │
                       │ → /api/webhooks/ │
                       │   square         │
                       ╰──────────────────╯
```

## 2. Repository inventory (factual counts)

| Area | Count | Source |
|---|---|---|
| App files (`.ts/.tsx/.js/.jsx` under `app/`) | 331 | `find app -type f` |
| Components | 207 | `find components -type f` |
| Lib modules | 183 | `find lib -type f` |
| Services | 2 | `find services -type f` |
| Adapters | 3 | `find adapters -type f` |
| Stores (Zustand) | 3 | `find stores -type f` |
| Hooks | 9 | `find hooks -type f` |
| Tests | 40 | `find tests __tests__` |
| Scripts | 33 | `find scripts -type f` |
| **API routes (existing)** | **93** | `docs/audit/_routes-existing.txt` |
| **API routes referenced in code** | **138** | `docs/audit/_api-refs.txt` |
| **Missing routes (referenced, no file)** | **64** | `docs/audit/_missing-routes.txt` |
| Pages (`page.*`) | 95 (68 public, 27 admin) | `find app -name page.*` |
| MongoDB collections referenced | 58 | `docs/audit/_collections.txt` |
| Env vars referenced | 151 | `docs/audit/_env-vars.txt` |
| Runtime dependencies | 61 | `package.json` |
| Dev dependencies | 20 | `package.json` |

## 3. Frontend stack

| Layer | Choice | Source |
|---|---|---|
| Framework | Next.js 15.3 App Router | `package.json#dependencies.next` |
| UI primitives | Radix UI + shadcn/ui style | `components/ui/*` |
| Styling | Tailwind CSS | `tailwind.config.*` |
| Animation | framer-motion | `package.json#framer-motion` |
| Icons | lucide-react | usage in checkout, etc. |
| State management | Zustand (`stores/checkout.ts`, `cart.ts`, `rewards.ts`) | `stores/` |
| Toasts | sonner | layout.js |
| Forms | controlled components + custom validators (no react-hook-form found) | `CheckoutRoot.tsx#L60-122` |
| PWA | custom service worker `public/sw.js` + `lib/pwa.ts` | `public/sw.js`, `lib/pwa.ts` |
| Music background | custom `BackgroundMusic` + `MusicControls` provider | `app/layout.js#L168-179` |

## 4. Backend stack

| Layer | Choice | Source |
|---|---|---|
| Runtime | Next.js API routes (Node 18+, edge in some) | route files |
| Database client | Mongoose ^8 wrapping MongoDB Node driver ^6.21 | [lib/db-optimized.ts](file:///data/data/com.termux/files/home/Gratog-live/lib/db-optimized.ts) |
| Auth | Custom JWT via `jose` + bcryptjs | [lib/auth/jwt.js](file:///data/data/com.termux/files/home/Gratog-live/lib/auth/jwt.js) |
| Admin gate | Middleware checks `admin_token` cookie against `ADMIN_API_KEY` / `MASTER_API_KEY` env | [middleware.ts](file:///data/data/com.termux/files/home/Gratog-live/middleware.ts) |
| Order access tokens | HMAC-signed, 30 min TTL | [lib/order-access-token.js](file:///data/data/com.termux/files/home/Gratog-live/lib/order-access-token.js) |
| Idempotency | DB-backed token store with TTL | [lib/idempotency.ts](file:///data/data/com.termux/files/home/Gratog-live/lib/idempotency.ts) |
| Rate limiting | Redis (`lib/security/redis.ts`) — present but verify usage | `lib/security/redis.ts` |
| Logging | Custom logger | `lib/logger.js` |
| Error tracking | Sentry | `@sentry/nextjs` |

## 5. External services

| Service | Purpose | Env vars | Critical files |
|---|---|---|---|
| **Square** | Catalog source-of-truth, payments, customers, orders | `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, `SQUARE_APPLICATION_ID`, `SQUARE_ENVIRONMENT` | `lib/square-api.ts`, `lib/storefront-products.js`, `lib/square-orders-sync.js` |
| **Resend** | All transactional + marketing email (SendGrid removed) | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_WEBHOOK_SECRET` | `lib/resend-email.js`, `lib/email/service.js`, `lib/email/resend-client.js` |
| **MongoDB Atlas** | Primary datastore | `MONGODB_URI` | `lib/db-optimized.ts` |
| **Sentry** | Error tracking | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | `sentry.*.config.ts` |
| **Vercel** | Hosting, edge functions, env mgmt | n/a | `vercel.json` |
| **Square Webhooks** | Order status, payment events | `SQUARE_WEBHOOK_SIGNATURE_KEY` | `app/api/webhooks/square/route.ts` |
| **Resend Webhooks** | Email delivery, bounce, complaint events | `RESEND_WEBHOOK_SECRET` | `app/api/webhooks/resend/route.js` |

## 6. Critical environment variables (subset)

From `_env-vars.txt` (151 total), the must-have set:

```
# Database
MONGODB_URI

# Auth
JWT_SECRET
ADMIN_API_KEY
MASTER_API_KEY
ORDER_ACCESS_TOKEN_SECRET   (optional, falls back to JWT_SECRET)

# Square
SQUARE_ACCESS_TOKEN
SQUARE_APPLICATION_ID
SQUARE_LOCATION_ID
SQUARE_ENVIRONMENT          (sandbox | production)
SQUARE_WEBHOOK_SIGNATURE_KEY

# Resend
RESEND_API_KEY
RESEND_FROM_EMAIL
RESEND_WEBHOOK_SECRET

# Sentry
NEXT_PUBLIC_SENTRY_DSN
SENTRY_AUTH_TOKEN

# Site
NEXT_PUBLIC_BASE_URL
NEXT_PUBLIC_SITE_URL
SUPPORT_EMAIL
CONTACT_EMAIL

# Cron security
CRON_SECRET
```

## 7. Deploy pipeline

```diagram
git push main ──▶ GitHub (wizelements/Gratog) ──▶ Vercel webhook ──▶ build
                                                                       │
                                                                       │ next build (relaxed lint/ts)
                                                                       ▼
                                                                  static + λ functions
                                                                       │
                                                                       ▼
                                                                  Production
                                                                  domain: tasteofgratitude.shop
```

Build gates currently relaxed in `next.config.js` (eslint ignoreDuringBuilds=true, typescript ignoreBuildErrors=true) per commit `4524ccc5` — gated by `tsc --noEmit` + 273 unit tests in CI instead.

## 8. Major subsystem locations

| Subsystem | Code location |
|---|---|
| Checkout UI | `components/checkout/*` + `app/checkout/page.tsx` |
| Payment | `app/api/payments/route.ts` (canonical), `app/api/pay/process/route.ts` (alternate "Pay Flow") |
| Order persistence | `app/api/orders/create/route.js`, `lib/transactions.ts`, `lib/enhanced-order-tracking.js` |
| Email — simple path | `lib/resend-email.js` (used by 6 modules) |
| Email — advanced path | `lib/email/service.js` (used by admin campaigns + 1 test) |
| Rewards | `lib/enhanced-rewards.js`, `lib/rewards-secure.js`, `app/api/rewards/*` |
| Quiz | `app/quiz/*`, `lib/quiz-*` |
| Inventory | `lib/custom-inventory.js`, `lib/inventory.*` |
| Catalog | `lib/storefront-products.js`, `lib/square-api.ts` |
| Cart | `stores/cart.ts` (Zustand persist) + `adapters/cartAdapter.ts` + `components/cart/*` |
| Admin | `app/admin/*` + `app/api/admin/*` |
| Webhooks | `app/api/webhooks/square/route.ts`, `app/api/webhooks/resend/route.js` |
