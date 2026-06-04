# Taste of Gratitude — Full Production Alignment Audit

> **Audit Date**: June 3, 2026
> **Codebase**: `~/Gratog-live` (tasteofgratitude.shop)
> **Auditor**: Automated deep-dive against live source
> **Status**: FINDINGS VERIFIED — actionable

---

## Table of Contents

1. [Architecture Summary](#architecture-summary)
2. [Technology Stack](#technology-stack)
3. [Route Map](#route-map)
4. [Database Models](#database-models)
5. [Critical Findings](#critical-findings)
6. [Production Readiness Scorecard](#production-readiness-scorecard)
7. [Protected Systems (Do Not Touch)](#protected-systems-do-not-touch)
8. [Recommended Removals](#recommended-removals)
9. [What Must Be Built](#what-must-be-built)
10. [Phased Roadmap](#phased-roadmap)

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel (Edge + Serverless)            │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │ Next.js  │  │ API Routes│  │ Middleware (Edge)    │  │
│  │ App Router│  │ ~80 routes│  │ Admin auth guard     │  │
│  └────┬─────┘  └─────┬────┘  └──────────────────────┘  │
│       │              │                                   │
│  ┌────┴──────────────┴────┐                             │
│  │   Square SDK v43.2.0    │                             │
│  │   (Payments, Catalog,   │                             │
│  │    Orders, Customers)   │                             │
│  └────────────┬────────────┘                             │
│               │                                          │
│  ┌────────────┴────────────┐  ┌───────────────────────┐ │
│  │  MongoDB (Mongoose +    │  │ Redis (optional cache) │ │
│  │  native driver)         │  │ + LRU in-memory        │ │
│  └─────────────────────────┘  └───────────────────────┘ │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────────┐ │
│  │ Resend   │  │ Twilio   │  │ PostHog + Sentry + GA4 │ │
│  │ (Email)  │  │ (SMS)    │  │ (Analytics/Monitoring)  │ │
│  └──────────┘  └──────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | Next.js (App Router) | 15.3.4 |
| **Runtime** | React | 19.1.0 |
| **Language** | Mixed TypeScript / JavaScript | ~158,593 LOC |
| **Package Manager** | npm | — |
| **Database** | MongoDB (Mongoose + native driver) | Mongoose 8.14 |
| **Payments** | Square SDK (Web Payments SDK, in-app tokenization) | v43.2.0 |
| **Email** | Resend | v6.5.2 |
| **SMS** | Twilio | v5.3.5 |
| **State Management** | Zustand, SWR | 5.0.3, 2.3.6 |
| **UI** | Tailwind CSS, Radix UI, shadcn/ui, Framer Motion, Lucide | Tailwind 3.4, Framer 12 |
| **Analytics** | PostHog, Google Analytics, Sentry | Sentry 10 |
| **Deployment** | Vercel | Production: tasteofgratitude.shop |
| **Cache** | Redis (optional), LRU in-memory | — |
| **Auth** | JWT via jose (Edge-compatible), cookie-based admin auth | Middleware-protected |
| **PWA** | Service worker, manifest.json | — |
| **Testing** | Vitest (unit), Playwright (e2e), k6 (load), Lighthouse CI | — |

---

## Route Map

### Public Pages (~40+)

| Route | Purpose | Notes |
|-------|---------|-------|
| `/` | Homepage | Static + ISR, HomePageClient.jsx (844 lines) |
| `/about` | About page | ⚠️ GENERIC — uses stock Unsplash image, no founder story |
| `/catalog` | Product catalog | — |
| `/product/[slug]` | Product detail | — |
| `/cart` | Cart page | — |
| `/checkout` | Checkout | Square Web Payments SDK |
| `/checkout/square` | Alternative Square checkout | ⚠️ Redundant path |
| `/checkout/success` | Order confirmation | — |
| `/markets` | Market listings | ⚠️ HARDCODED: Serenbe, Dunwoody, Sandy Springs |
| `/preorder` | Preorder flow | $60 min, boba restricted |
| `/preorder/status` | Preorder status tracking | — |
| `/order/menu` | Mobile menu | Market-day in-person ordering, NOT a menu display |
| `/order/[id]` | Order detail | — |
| `/order/checkout` | Order checkout | ⚠️ Redundant checkout path |
| `/order/start` | Order start | — |
| `/order/complete` | Order complete | — |
| `/order/success` | Order success | — |
| `/order-v2` | Alias for /checkout | ⚠️ Redundant |
| `/pay` | Pay flow | Separate payment UI |
| `/explore` | Interactive features hub | 3D, games, learn, ingredients |
| `/explore/ingredients` | Ingredient explorer | — |
| `/explore/games/*` | 4 wellness games | memory-match, ingredient-quiz, benefit-sort, ingredient-rush |
| `/explore/showcase` | 3D AR product showcase | ⚠️ Feature bloat |
| `/explore/learn` | Learning modules | — |
| `/gratitude` | Rewards dashboard | ⚠️ STUB — hardcoded temp customer ID |
| `/gratitude/rewards` | Rewards catalog | — |
| `/contact` | Contact form | — |
| `/faq` | FAQ | — |
| `/reviews` | Reviews page | — |
| `/info-board` | Info board | — |
| `/quiz` | Wellness quiz | — |
| `/policies`, `/privacy`, `/terms` | Legal pages | — |
| `/subscriptions` | Subscription page | — |
| `/passport` | Market passport | ⚠️ Feature bloat |
| `/wishlist` | Wishlist | — |
| `/rewards` | Rewards page | — |
| `/ugc`, `/ugc/spicy-bloom` | User generated content | ⚠️ Feature bloat |
| `/profile/*` | User profile, orders, rewards, settings, challenge | — |
| `/account/*` | Account page + subscriptions | — |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Auth | — |
| `/diagnostic` | Diagnostic page | — |
| `/offline` | PWA offline page | — |
| `/(site)/community` | Community page | — |
| `/(site)/instagram/[slug]` | Instagram posts | ⚠️ Feature bloat |

### Admin Pages (~20)

| Route | Purpose | Notes |
|-------|---------|-------|
| `/admin` | Dashboard | Orders, revenue, Square sync |
| `/admin/login` | Admin login | — |
| `/admin/products` | Product management | — |
| `/admin/products/[id]` | Product detail edit | — |
| `/admin/orders` | Order management | — |
| `/admin/customers` | Customer management | — |
| `/admin/markets` | Market management | — |
| `/admin/market-day` | Market day dashboard | — |
| `/admin/market-setup` | Market setup | — |
| `/admin/inventory` | Inventory management | — |
| `/admin/analytics` | Analytics | — |
| `/admin/campaigns` | Email campaigns | — |
| `/admin/coupons` | Coupon management | — |
| `/admin/reviews` | Review management | — |
| `/admin/interactions` | Customer interactions | — |
| `/admin/waitlist` | Waitlist management | — |
| `/admin/queue` | Queue management | — |
| `/admin/settings` | Settings | — |
| `/admin/setup` | Initial setup | — |
| `/admin/qr-generator` | QR code generator | — |
| `/admin/square-oauth` | Square OAuth | — |

> **Missing from admin**: Menu upload, Canva link management, brochure system, public preview.

### API Routes (~80+)

| Category | Routes |
|----------|--------|
| **Core Commerce** | `/api/products`, `/api/catalog`, `/api/cart`, `/api/orders/create`, `/api/payments`, `/api/preorder` |
| **Admin** | `/api/admin/*` (products, orders, customers, campaigns, coupons, inventory, markets, reviews, notifications, auth) |
| **Auth** | `/api/auth/*` (login, register, logout, session, forgot-password, reset-password) |
| **Square** | `/api/square/*` (config, diagnose, test-rest, validate-token), `/api/webhooks/square` |
| **Rewards/Gratitude** | `/api/gratitude/*` (account, earn, redeem, referral, rewards, transactions, webhook) |
| **Market** | `/api/market/today`, `/api/markets` |
| **User** | `/api/user/*` (profile, orders, favorites, stats, rewards, challenge, email-preferences) |
| **Other** | health, analytics, cron, delivery, inventory, newsletter, notifications, payments, queue, reports, returns, search, seo, shipping, subscriptions, unsubscribe |

---

## Database Models (MongoDB)

| Model | Purpose | Notes |
|-------|---------|-------|
| `MarketSchedule` | Market locations with coordinates, hours, days, active status | Exists but pages use hardcoded data instead |
| `MarketOrder` | Orders with items, customer info, status workflow, payment tracking | Proper status workflow |
| `DailyInventory` | Per-market per-day inventory with sold counts | Well-structured |
| `admin_users` | Admin user accounts | Raw MongoDB collection |
| `orders` | Order records | Raw MongoDB collection |
| `product_reviews` | Customer reviews | Raw MongoDB collection |
| `products` | Product catalog | Implied from API usage |

---

## Critical Findings

### 🔴 CRITICAL ISSUES

#### 1. About Page Has NO Founder Story
**File**: `app/about/page.js`

- Uses generic stock Unsplash photo
- Says "Crafted with gratitude, rooted in wellness" — generic tagline
- Does NOT mention Jenneisha Glover
- Does NOT mention the health journey, relapse, sea moss discovery, Atlanta move
- "Why Sea Moss" section uses generic "healing properties" language
- Claims "92 of the 102 minerals" — FDA-risky claim used widely across codebase
- **EMOTIONAL MISALIGNMENT**: reads like a generic supplement brand, not a founder story

#### 2. Homepage Has NO Story Section
**File**: `components/home/HomePageClient.jsx` (844 lines)

- Zero founder storytelling
- Hero shows "Rich Mineral Content / One Daily Scoop" — sounds like a supplement ad
- No mention of Jenneisha, no mention of the journey
- No "why we exist" section
- No weekly menu section
- No market schedule on homepage
- Has "Preorder Now for Saturday Market Pickup" badge — good, but disconnected from story

#### 3. No Menu/Canva Upload System Exists

- Zero files reference "canva upload", "menu upload", or "brochure upload"
- No admin page for menu management
- No database model for menus/brochures
- No public menu library page
- No featured weekly menu section
- The `/order/menu` page is a market-day mobile ordering page, NOT a menu display

#### 4. Markets Are Hardcoded
**Files**: `app/markets/page.tsx`, `app/preorder/page.tsx`, `lib/preorder/rules.ts`

- 3 markets hardcoded in MULTIPLE files: Serenbe, Dunwoody, Sandy Springs
- `MarketSchedule` model exists but market pages don't use it
- `lib/preorder/rules.ts` has its own `MARKET_CONFIGS` constant
- At least **3 different sources of truth** for market data

#### 5. Gratitude Rewards System Is A Stub
**File**: `app/gratitude/page.jsx`

- Uses `const customerId = 'temp-customer-id'` — hardcoded placeholder
- Full rewards API exists (7+ routes) but customer identity is broken
- Unusable without auth fix

#### 6. Compliance-Risky Copy Throughout

| Claim | Location | Risk |
|-------|----------|------|
| "healing properties" | About page | Medical claim |
| "92 of the 102 minerals our bodies need" | Multiple pages | Unverified factual claim |
| "Thyroid function and metabolism" | Benefits section | Drug-like claim |
| "Energy levels and mental clarity" | Benefits section | Medical-adjacent claim |
| Health signal mapping (thyroid, immunity) | `lib/health-benefits.js` | Structural FDA risk |

Footer has FDA disclaimer but body copy is still risky. Disclaimer does not immunize against specific health claims in marketing copy.

---

### 🟡 SIGNIFICANT ISSUES

#### 7. Feature Bloat / Dead Features

The following features add complexity without clear business value for a market-first wellness brand:

- **Explore section**: 4 games (memory-match, ingredient-quiz, benefit-sort, ingredient-rush), 3D AR viewer, kiosk mode, particle systems
- **Instagram feed integration**
- **Market passport system**
- **UGC challenges** ("spicy-bloom")
- **Spin wheel**, exit intent modals, live chat widget
- **AI newsletter generator**
- **Music/background audio system** with full context provider
- **Shipping service**, delivery zones/radius/pricing
- **Language switcher** (en/es/fr translations)
- **Multi-currency support** (referenced in package.json description)

#### 8. Multiple Checkout Paths

| Path | Type | Status |
|------|------|--------|
| `/checkout` | CheckoutRoot | ✅ Canonical |
| `/checkout/square` | Alternative Square checkout | ⚠️ Redundant |
| `/order/checkout` | Order checkout | ⚠️ Redundant |
| `/order-v2` | Alias for /checkout | ⚠️ Redundant |
| `/pay` | Separate pay flow | ⚠️ Redundant |
| `/api/checkout/route.ts` | DEPRECATED | Returns 410 Gone |
| `/api/create-checkout` | Referenced by services/checkout.ts | ⚠️ Unclear status |
| `/api/payments`, `/api/pay-flow/payment`, `/api/pay/process`, `/api/payments/square` | Multiple payment routes | ⚠️ Confusing |

This is a revenue risk — customer confusion leads to abandoned carts.

#### 9. Demo Products Fallback

- `lib/demo-products.js` has full product catalog with prices ($35, $28, etc.)
- Disabled in production by default but `ALLOW_DEMO_STOREFRONT_FALLBACK` exists
- Demo prices may not match Square catalog prices
- Products use Unsplash stock photos

#### 10. Product Images Are Minimal

`public/images/` contains only:
- `gratog-bg.PNG`
- `product-image-unavailable.svg`
- `sea-moss-default.jpg`
- `sea-moss-default.svg`

Products rely on Square catalog images or Unsplash placeholders.

#### 11. Admin Has No Menu Management

Admin navigation includes: Dashboard, Customers, Orders, Products, Reviews, Markets, Inventory, Coupons, Campaigns, Interactions, Waitlist, Analytics, Settings.

**Missing**: Menu upload, Canva link management, brochure system, public preview.

---

### 🟢 WHAT WORKS WELL

#### 12. Square Integration Is Solid
- Clean token/environment validation in `lib/square.ts`
- Sandbox/production mismatch detection
- Proper error handling
- Web Payments SDK tokenization
- Order creation → payment flow documented

#### 13. Admin Auth Is Properly Implemented
- Edge-compatible JWT (jose library)
- Cookie-based with Bearer token fallback
- Middleware-protected routes
- Proper login/logout/reset-password flow
- Role checks

#### 14. Preorder System Has Real Business Logic
- $60 minimum for non-boba items
- Boba max 2 qty preorder limit
- Market-specific cutoff times
- Proper cutoff logic (Friday 6PM for Saturday markets, Saturday 6PM for Sunday)

#### 15. Database Schema Is Well-Structured
- `MarketOrder` has proper status workflow
- `DailyInventory` has per-market per-day tracking
- Proper indexes defined

#### 16. Error Handling Is Comprehensive
- Every route has `error.tsx` boundary
- Loading states on major pages
- Sentry integration
- Logger utility used throughout

#### 17. Security Headers Properly Configured
- `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`
- Strict referrer policy
- Permissions policy
- Service worker cache control

#### 18. Vercel Deployment Is Well-Configured
- Function timeouts set appropriately
- Cron jobs defined
- Redirect handling for old domains
- Cache headers for static assets

---

## Production Readiness Scorecard

| Category | Score | Notes |
|----------|-------|-------|
| **Payment Security** | 8/10 | Square integration solid, token validation good, deprecated checkout returns 410 |
| **Auth Security** | 8/10 | Edge JWT, middleware-protected, proper cookie handling |
| **Data Durability** | 7/10 | MongoDB with proper indexes, but some in-memory state in frontend |
| **Error Handling** | 8/10 | Error boundaries everywhere, Sentry, structured logging |
| **Story Alignment** | 2/10 | Generic supplement brand feel, no founder story, no market culture |
| **Menu System** | 0/10 | Does not exist |
| **Admin Completeness** | 5/10 | Good basics, missing menu/content/Canva management |
| **Feature Focus** | 3/10 | Massive feature bloat (games, AR, music, i18n, kiosk) |
| **Compliance** | 4/10 | FDA-risky claims throughout, footer disclaimer insufficient |
| **Mobile UX** | 6/10 | Responsive design exists but complex navigation |
| **Customer Trust** | 4/10 | No founder face, no real story, generic wellness copy |
| **Operational Readiness** | 5/10 | Preorder logic good, market data fragmented |

### Overall Scores

| Dimension | Score |
|-----------|-------|
| **Production Readiness** | **6/10** |
| **Story Alignment** | **2/10** |
| **UX / Trust** | **4/10** |
| **Operational Readiness** | **5/10** |

---

## Protected Systems (Do Not Touch)

These systems are working correctly and must not be modified without explicit justification:

- **Square integration** — `lib/square.ts`, payment flows
- **Admin auth system** — `middleware.ts`, `lib/admin-auth.js`, `lib/admin-session.ts`
- **MongoDB models** — `MarketSchedule`, `MarketOrder`, `DailyInventory`
- **Preorder business rules** — `lib/preorder/rules.ts`
- **Vercel deployment config** — `vercel.json`
- **Security headers**
- **Error boundary pattern**

---

## Recommended Removals

The following features should be hidden or removed to reduce complexity and sharpen brand focus:

| Feature | Reason |
|---------|--------|
| Explore games section (4 games, kiosk mode, particle systems) | No business value for market brand |
| 3D AR showcase | Engineering novelty, not customer need |
| Background music system | Unnecessary complexity |
| Instagram feed integration | Maintenance burden, low ROI |
| Market passport | Unused feature |
| Language switcher (i18n for es/fr) | Premature internationalization |
| Spin wheel, exit intent modal | Spammy UX patterns |
| UGC challenges | No user base to sustain |
| Live chat widget (hardcoded FAQ answers) | Not real chat, misleading |
| Multiple redundant checkout paths | Revenue risk from confusion |

---

## What Must Be Built

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 1 | **Founder Story System** | 🔴 Critical | Real Jenneisha story on about page and homepage |
| 2 | **Canva Menu Upload System** | 🔴 Critical | Admin upload, public display, featured weekly menu |
| 3 | **Menu Library Page** | 🔴 Critical | Public `/menu` route showing current and past menus |
| 4 | **Homepage Story Section** | 🔴 Critical | Founder-driven section, not supplement-ad copy |
| 5 | **Homepage Weekly Menu** | 🟡 High | Featured current menu on homepage |
| 6 | **Homepage Market Schedule** | 🟡 High | Live market info pulled from database |
| 7 | **Compliance Copy Overhaul** | 🔴 Critical | Replace risky claims with safe language sitewide |
| 8 | **Admin Menu Management** | 🟡 High | Upload, publish, archive, preview for menus |
| 9 | **Market Data Unification** | 🟡 High | Single source of truth from database, not hardcoded |

---

## Phased Roadmap

### Phase 1: Story + Compliance (Immediate)
- [ ] Rewrite about page with real founder story (Jenneisha Glover)
- [ ] Add homepage story section
- [ ] Audit and fix all compliance-risky copy
- [ ] Remove "92 minerals" hard claims sitewide
- [ ] Replace "healing properties" with safe language
- [ ] Review `lib/health-benefits.js` for structural FDA risk

### Phase 2: Menu System (Week 1)
- [ ] Create `Menu` MongoDB model (title, image URL, PDF URL, Canva link, week date, active flag)
- [ ] Build admin menu upload page (`/admin/menus`)
- [ ] Build public `/menu` page with current + archive
- [ ] Add homepage featured menu section
- [ ] Support image/PDF/Canva link uploads

### Phase 3: Market Unification (Week 1–2)
- [ ] Unify market data sources to `MarketSchedule` database model
- [ ] Refactor `app/markets/page.tsx` to read from database
- [ ] Refactor `app/preorder/page.tsx` to read from database
- [ ] Refactor `lib/preorder/rules.ts` to read from database
- [ ] Add homepage market schedule component

### Phase 4: Feature Cleanup (Week 2–3)
- [ ] Hide or remove bloat features (games, AR, music, passport, i18n)
- [ ] Consolidate checkout paths to single canonical flow
- [ ] Fix gratitude rewards customer auth (replace hardcoded ID)
- [ ] Simplify navigation to core flows
- [ ] Audit and remove dead API routes

### Phase 5: Admin Enhancement (Week 3–4)
- [ ] Add menu management to admin sidebar
- [ ] Add content publishing workflow (draft → published → archived)
- [ ] Add public preview capability from admin
- [ ] Improve mobile admin UX
- [ ] Add admin dashboard metrics for menu views

---

*This audit is a living document. Update as fixes are implemented.*
