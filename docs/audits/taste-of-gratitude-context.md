# Taste of Gratitude — Product, Architecture, and Production Context Audit

Generated: 2026-07-22
Branch audited: `main`
Repository: `https://github.com/wizelements/Gratog.git`
Production URL: `https://tasteofgratitude.shop`

---

## 1. Repository and Runtime

| Field | Verified value | Source |
|---|---|---|
| Framework | Next.js 15.3.4 (App Router) | `package.json` |
| React | 19.1.0 | `package.json` |
| Runtime target | Node.js 22.22.3 (local); Vercel Functions on deploy | `package.json`, `vercel.json` |
| Package manager | npm (lockfile `package-lock.json` present) | `package.json`, repo status |
| Deployment platform | Vercel | `.vercel/project.json`, `vercel.json` |
| Vercel project ID | `prj_HnwKt5XyWC1Evcrv3mZLa3cdpDcG` | `.vercel/project.json` |
| Vercel org ID | `team_HLmyvqEhI158ahAD2U1p7MxM` | `.vercel/project.json` |
| Project name in Vercel | `gratog` | `.vercel/project.json` |
| App version | `2.0.0` | `package.json` |

### Uncommitted work present (do not modify without owner approval)

`git status --short` shows:

- `M lib/square-api.ts`
- `M package-lock.json`
- `M package.json`
- `M scripts/verify-square-auth.js`
- Multiple `.bak-20260709-*` backup files left by a prior pass:
  - `app/api/analytics/route.ts.bak-20260709-125402`
  - `app/api/analytics/route.ts.bak-20260709-213731`
  - `app/api/markets/warm/route.ts.bak-20260709-125402`
  - `app/api/preorder/route.ts.bak-20260709-215015`
  - `app/api/preorder/status/route.ts.bak-20260709-213731`
  - `app/api/retention/winback/route.ts.bak-20260709-125402`
  - `app/api/retention/winback/route.ts.bak-20260709-213731`
  - `app/api/subscriptions/gratitude-box/route.ts.bak-20260709-215015`
  - `app/api/webhooks/square/route.ts.bak-20260709-215015`
  - `app/preorder/PreorderClientPage.tsx.bak-20260709-215015`
  - `app/preorder/page.tsx.bak-20260709-125402`
  - `components/subscriptions/GratitudeBoxPage.tsx.bak-20260709-215015`
  - `lib/preorder/repository.ts.bak-20260709-215015`
  - `lib/square-api.ts.bak-20260709-215015`
  - `models/MarketOrder.ts.bak-20260709-215015`
  - `utils/analytics.ts.bak-20260709-213731`

These appear to be prior-fix snapshots. They should be archived or removed, not left in the working tree, but this audit treats them as read-only evidence.

---

## 2. Data and Service Architecture

| Concern | Provider / implementation | Evidence |
|---|---|---|
| Primary database | MongoDB via Mongoose + native driver | `package.json`, `lib/db-optimized.ts`, models |
| Order persistence | `MarketOrder` Mongoose model (preorders) + `orders` collection (cart/checkout) | `models/MarketOrder.ts`, `app/api/orders/create/route.js`, `app/api/checkout/route.ts` |
| Product catalog | Square Catalog is the live source; local `unified_products` collection is derived | `lib/square-api-edge.ts`, `lib/product-sync-engine.js`, `lib/storefront-products.js` |
| Payments | Square SDK v43.2.0 + direct REST client (`lib/square-api.ts`) | `package.json`, `lib/square-api.ts`, `app/api/checkout/route.ts` |
| Payment links | Square Online Checkout payment links (`/v2/online-checkout/payment-links`) | `lib/square-api.ts` line ~384 |
| Webhooks | Square webhooks (`app/api/webhooks/square/route.ts`) | `app/api/webhooks/square/route.ts` |
| Email | Resend (`resend` package) with queued + immediate send paths | `lib/email/resend-client.js`, `lib/email/service.js`, `lib/email/templates.js` |
| SMS | Twilio package installed but code has mock fallback (`lib/sms-mock.js`) and production guard (`lib/sms.ts`) | `package.json`, `lib/sms-mock.js`, `lib/sms.ts` |
| Auth | JWT-based local auth for customers; separate admin auth (JWT + bcrypt) | `lib/auth.ts`, `app/api/auth/*`, `app/api/admin/auth/*` |
| Analytics | GA4 (`NEXT_PUBLIC_GTAG_ID`), PostHog optional, internal analytics events | `.env.example`, `lib/analytics.ts`, `utils/analytics.ts` |
| Error tracking | Sentry optional (`NEXT_PUBLIC_SENTRY_DSN`) | `.env.example` |
| Cache | In-memory per-request in edge; Upstash Redis optional; Vercel CDN headers | `vercel.json`, `lib/cache.ts` |
| Storage | No dedicated media storage found; product images are external URLs (`editmysite.com`) or `/images/*` | `data/products.ts`, `public/images/` |
| Cron | 4 Vercel cron jobs configured | `vercel.json` |

---

## 3. Contradictions and Conflicts Found

### 3.1 Square catalog names/prices vs. curated product data

- **Live `/api/catalog`** returns Square items with `name: "Unnamed Product"`, `price: 0`, `available: true`.
- **Live `/api/storefront/square-catalog`** throws: `Cannot mix BigInt and other types, use explicit conversions`.
- **Homepage / weekly menu / catalog** display curated products from `data/products.ts` with real names and prices ($10–$12 drinks, $20–$25 gels).
- **Sitemap** indexes Square IDs as `/product/<square-id>` (e.g. `/product/OAMZ3IUIU75QRNH7WJETSPX6`) but those pages likely render the same curated product fallback or error.

**Implication:** Customers may see one price/name on the homepage/weekly menu and a different (or broken) price when the cart/checkout tries to use Square data. This is a P0 commerce-risk issue.

### 3.2 Two product namespaces

1. **Curated local products** (`data/products.ts`): slugs like `kissed-by-gods`, `supplemint`, `grateful-greens-gel`.
2. **Square catalog IDs** (`/api/catalog`): opaque IDs like `OAMZ3IUIU75QRNH7WJETSPX6`.

There is no visible reconciliation table mapping local slugs to Square variation IDs. `lib/storefront-products.js` attempts `mergeWithCuratedProduct` by name/slug, but if Square items have no name, the merge will fail.

### 3.3 Weekly menu vs. Square availability

- `data/weeklyMenu.ts` builds week range from local browser/server time and filters `data/products.ts` by `activeWeeklyMenu: true`.
- There is no evidence the weekly menu is driven by Square inventory or admin publish state.
- `activeWeeklyMenu` is hardcoded in `data/products.ts`.

**Implication:** The founder cannot update the weekly menu without a code deploy. Stale menus and sold-out items can persist.

### 3.4 SMS is not actually connected

- `lib/sms.ts` requires `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` and returns early with `console.warn('Twilio not configured, skipping SMS')` if absent.
- `lib/sms-mock.js` is a mock that logs only.
- Homepage and weekly-menu CTAs promise "menu texts" and "SMS updates".

**Implication:** Phone capture is a waitlist, not a functioning SMS program. Copy must be truthful or SMS must be wired.

### 3.5 Bundles are placeholders

- `data/bundles.ts` stores `checkoutMode: 'square-compatible-placeholder'` and savings text like:
  - "Bundle pricing ready for Square setup; founder can activate savings when bundle SKUs are created."
  - "Perfect subscription precursor: set a weekly bundle discount once Square bundle inventory is active."
- Bundles on the homepage link to `/catalog?search=<product name>`, not a real bundle SKU.

**Implication:** Bundle savings are advertised without existing Square SKUs. This is customer-facing roadmap language.

### 3.6 Subscription flow is one-time only

- `/subscriptions/gratitude-box` creates a single Square payment link.
- No recurring charge loop or Square subscription plan exists.
- Homepage and retention blocks mention "subscription waitlist" and "weekly wellness boxes can recur automatically."

**Implication:** Subscription is a waitlist, not a live recurring product.

### 3.7 Rewards/loyalty features are largely inactive

- FAQ describes "Gratitude Passport", "Spin & Win", "stamps", "referral rewards", "community challenges".
- API routes exist (`/api/gratitude/*`, `/api/rewards/*`) but the FAQ wording admits backend reward rules are "finalized" (not live).
- Spin & Win is referenced as a coupon source, but no evidence it is deployed as a real game.

**Implication:** Marketing copy advertises features that are not fully implemented.

### 3.8 Memory pressure

- Live `/api/health` reports 93% memory usage on a small Vercel function instance.
- Build script sets `--max-old-space-size=2048`.

**Implication:** Risk of OOM during builds or heavy catalog syncs.

---

## 4. Cron Jobs

Configured in `vercel.json`:

| Path | Schedule | Purpose | Notes |
|---|---|---|---|
| `/api/cron/cleanup-abandoned-orders` | `15 * * * *` | Abandoned-cart recovery email | Sends recovery email after 45 min; marks abandoned after 24h |
| `/api/cron/daily-report` | `0 14 * * 1-5` | Daily SMS report to admin | Uses `sendDailyReport` from `lib/sms.ts`; no-op if Twilio not configured |
| `/api/markets/warm` | `0 18 * * 3` | Weekly market warm / menu prep | Likely primes cache/market data |
| `/api/retention/winback` | `0 14 * * 0` | Win-back email campaign | Uses `WINBACK_COUPON_CODE` (default `WINBACK10`) |

The `.env.example` lists additional cron descriptions that do not appear in `vercel.json` (pickup reminders, morning reminders, email scheduler, subscription reminders, missed-pickup follow-up). This suggests cron config drift.

---

## 5. Security Headers and Redirects

`vercel.json` applies sensible security headers and noindex/nofollow/cache-control for `/admin`, `/cart`, `/checkout`, `/order`, `/preorder`, `/profile`, `/vendor`.

Redirects include:
- `/shop` → `/catalog`
- `/rewards` → `/catalog`
- `/gratitude/rewards` → `/catalog`
- `/reviews` → `/catalog`
- `/community` → `/about`
- Old policy paths → consolidated `/policies` / `/privacy`
- Old Vercel preview domains → canonical `tasteofgratitude.shop`

---

## 6. Build/Test Tooling

| Tool | Status |
|---|---|
| Lint | `next lint` |
| Type check | `tsc --noEmit --skipLibCheck` (script tolerates errors) |
| Unit tests | vitest |
| E2E tests | Playwright |
| Performance | Lighthouse CI, k6 |
| Route governance | `check:routes`, `check:route-governance` |

---

## 7. Owner Decisions Required (initial list)

1. **Canonical price authority:** Should curated `data/products.ts` prices or Square catalog prices be the source of truth?
2. **Square catalog cleanup:** Square items currently have no name/price. Should they be renamed and priced in Square, or should the site stop using Square catalog as the live source?
3. **Weekly-menu process:** Should the weekly menu be admin-editable (database-driven) or continue as hardcoded TS?
4. **SMS:** Connect Twilio or rewrite copy as a phone waitlist?
5. **Bundles/subscriptions:** Remove placeholder savings or create real Square bundle/subscription SKUs?
6. **Rewards:** Remove public rewards/Spin & Win/challenge language until live, or finish implementation?
7. **Product slug ↔ Square ID mapping:** Who creates and owns this mapping?
8. **Shipping scope:** FAQ promises nationwide USPS shipping with ice packs; verify fulfillment capability and cost before advertising.
