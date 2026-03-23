# Taste of Gratitude — Full End-to-End Evaluation

**Date:** March 4, 2026  
**Repo:** git@github.com:wizelements/Gratog.git (branch: `main`)  
**Live URL:** https://tasteofgratitude.shop  
**Stack:** Next.js 15.5.9 App Router · React 19 · MongoDB · Square SDK 43.2 · SendGrid · Sentry · Vercel  
**Codebase:** ~34,000 lines across 200+ source files, 85+ components, 48 API route directories  
**Tests:** Vitest (unit) + Playwright (E2E) — 12 subscription tests passing  

---

## Executive Summary

Taste of Gratitude is a **feature-rich, production-deployed** sea moss wellness e-commerce platform with strong foundations: Square payments, real product catalog sync, PWA support, admin panel, rewards system, quiz recommendations, Instagram integration, and a newly-integrated subscription system. The platform is live, processing orders, and generating revenue.

**However, it carries avoidable business risk** from:
1. **Disabled security controls** — CSP off, CORS wide open, no rate limiting
2. **Build safety disabled** — TypeScript & ESLint errors ignored during builds
3. **Subscription operations gaps** — Cron not scheduled, customer portal doesn't exist, hardcoded coupons
4. **Email domain mismatch** — `.net` used in 20+ places instead of `.shop`
5. **Documentation debt** — 184 markdown files in root, most outdated

The platform's **biggest revenue opportunity** is the subscription system (P1 integration just shipped), but it needs the operational infrastructure to support it before launch.

---

## Table of Contents

1. [What's Working Well](#1-whats-working-well)
2. [Security — Critical Fixes](#2-security--critical-fixes)
3. [Architecture & Code Quality](#3-architecture--code-quality)
4. [Performance](#4-performance)
5. [SEO & Structured Data](#5-seo--structured-data)
6. [E-commerce & Payments](#6-e-commerce--payments)
7. [Subscription System (P1)](#7-subscription-system-p1)
8. [Email System](#8-email-system)
9. [Testing & Quality Assurance](#9-testing--quality-assurance)
10. [Deployment & DevOps](#10-deployment--devops)
11. [UX & Accessibility](#11-ux--accessibility)
12. [Business Logic & Revenue Gaps](#12-business-logic--revenue-gaps)
13. [Documentation & Codebase Hygiene](#13-documentation--codebase-hygiene)
14. [Prioritized Action Plan](#14-prioritized-action-plan)
15. [Revenue-Driving Improvements](#15-revenue-driving-improvements)

---

## 1. What's Working Well

### ✅ Strong Foundations
- **Square SDK integration** (`lib/square.ts`) — excellent env validation, deprecation patterns, token/environment mismatch detection
- **Product catalog** synced from Square with health benefit enrichment, intelligent categorization
- **Checkout flow** — working Square Web Payments with real payment processing
- **Admin panel** — JWT-protected with token rotation, sliding window expiration, defense-in-depth (middleware + route-level)
- **PWA** — full implementation with service worker, install prompt, offline support, update notifier
- **Rewards/Passport system** — gamification with points, verified badges, spin wheel
- **Health benefit filtering** — unique UX differentiator, collapsible "more goals", benefit descriptions
- **Quiz recommendation engine** — personalized product suggestions driving conversions
- **Email infrastructure** — SendGrid (primary) + Resend (fallback) with rich HTML templates
- **Cron-based scheduling** — 7 cron jobs for reminders, campaigns, cleanup (no setTimeout anti-pattern)
- **Error tracking** — Sentry client + server + edge instrumentation
- **Multi-fulfillment** — pickup (multiple markets), delivery (zone-based), shipping

### ✅ Recent P1 Integration (Just Shipped)
- Full subscription lifecycle API (create, skip, pause, cancel, update-payment, billing-history, webhook)
- Shared subscription-tiers module with validation helpers
- 8 subscription email templates (welcome, renewal, retry, canceled, skipped, paused, winback)
- Enhanced ProductReviews with rating breakdown bars, helpful voting, RatingBadge export
- Enhanced catalog with results counter, low-result warnings, mobile filter FAB + bottom sheet
- SEO schemas extended (SubscriptionSchema, AggregateRatingSchema, validateSchema)
- 12 passing unit tests

---

## 2. Security — Critical Fixes

### 🔴 CRITICAL: Content Security Policy Disabled
**Files:** `middleware.ts` (CSP commented out), `next.config.js` (CSP removed)  
**Risk:** Every `dangerouslySetInnerHTML` usage (JSON-LD, email previews) is an XSS vector without CSP.  
**Fix:**
1. Start with `Content-Security-Policy-Report-Only` header for 48 hours
2. Allow Square domains explicitly: `https://web.squarecdn.com`, `https://js.squareup.com`, `https://pci-connect.squareup.com`
3. Enforce after verifying no breakage
4. Monitor reports via Sentry or a CSP reporting endpoint

### 🔴 CRITICAL: CORS Wide Open with Credentials
**File:** `next.config.js` line 155-159
```js
{ key: "Access-Control-Allow-Origin", value: process.env.CORS_ORIGINS || "*" }
{ key: "Access-Control-Allow-Credentials", value: "true" }
```
**Risk:** Any website on the internet can make credentialed cross-origin requests to your API. Combined with cookie-based admin auth, this is a CSRF attack surface.  
**Fix:** Restrict to `https://tasteofgratitude.shop` and set `Access-Control-Allow-Credentials: false` unless specifically needed.

### 🔴 CRITICAL: Build Safety Disabled
**File:** `next.config.js` lines 7-13
```js
eslint: { ignoreDuringBuilds: true },
typescript: { ignoreBuildErrors: true },
```
**Risk:** Broken code deploys silently. TypeScript errors that catch null dereferences, missing props, and type mismatches are all suppressed.  
**Fix:** Re-enable both. Fix or `@ts-expect-error` the specific issues rather than globally suppressing.

### 🟡 HIGH: Webhook Signature Verification Uses Timing-Vulnerable Compare
**File:** `app/api/subscriptions/webhook/route.js` line 14
```js
return signatureHeader === expectedSignature; // timing leak
```
**Fix:** Use `crypto.timingSafeEqual()` with Buffer comparison. Also use a configured stable URL (not `request.url` which can vary with proxies/querystrings).

### 🟡 HIGH: No Webhook Idempotency
**File:** `app/api/subscriptions/webhook/route.js`  
**Risk:** Square can retry webhook delivery. Same event processed twice = duplicate emails, double payment records.  
**Fix:** Store `event.event_id` in `subscription_events` with a unique index. Check existence before processing.

### 🟡 HIGH: No Rate Limiting
**Affected endpoints:** Subscription create, checkout, admin login, review submission, newsletter signup  
**Fix:** Add Vercel's built-in rate limiting or a simple sliding-window counter in MongoDB/Redis for critical endpoints.

### 🟡 MEDIUM: Admin Cookie Needs CSRF Protection
**Fix:** Set `SameSite=Strict` on `admin_token` cookie. Require `X-CSRF-Token` header for mutating admin API calls.

### 🟡 MEDIUM: Helpful Vote Has No Abuse Prevention
**File:** `app/api/reviews/helpful/route.js`  
**Risk:** Anyone can spam helpful/not-helpful votes without authentication or IP throttling.  
**Fix:** Rate limit by IP or require a lightweight session identifier.

---

## 3. Architecture & Code Quality

### 🔴 Homepage & Catalog Are Heavy Client Components
**Files:** `app/page.js`, `app/catalog/page.js`  
Both are `'use client'` and fetch products client-side via `useEffect`, meaning:
- **SEO:** Search engines see loading skeletons, not products
- **Performance:** Double render (SSR empty → client hydration → fetch → re-render)
- **LCP:** Delayed because content depends on client-side API call

**Fix:** Convert to Server Components with ISR:
```js
// app/page.js (server component)
export const revalidate = 300; // 5 min cache
export default async function HomePage() {
  const products = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/products`, {
    next: { revalidate: 300 }
  }).then(r => r.json());
  // Render products server-side, keep QuickAddButton as client island
}
```

### 🟡 Square SDK Loaded Globally
**File:** `app/layout.js` lines 122-128
```html
<link rel="preload" as="script" href="https://web.squarecdn.com/v1/square.js" />
<script src="https://web.squarecdn.com/v1/square.js" async />
```
**Impact:** ~150KB loaded on every page (homepage, about, FAQ, etc.)  
**Fix:** Move to `app/checkout/layout.js` only, using `next/script`.

### 🟡 Deprecated Components Not Cleaned Up
**Examples:** `SquarePaymentForm.jsx.deprecated`, `SquareWebPaymentForm.jsx.deprecated`  
**Fix:** Delete deprecated files. If needed for reference, they exist in git history.

### 🟡 Duplicate `Breadcrumbs` Components
**Files:** `components/Breadcrumbs.jsx` AND `components/Breadcrumbs.tsx`  
**Fix:** Keep the TypeScript version, update all imports, delete the JSX one.

### 🟡 Schemas.js Contains JSX, Preventing Test Coverage
**File:** `seo/schemas.js` — `injectSchema()` returns JSX `<script>` tag  
**Fix:** Extract pure data functions to `seo/schemas.ts` (testable), create `components/JsonLd.tsx` for the React component.

### 🟡 Mixed .js/.ts/.jsx/.tsx Without Clear Convention
**Pattern:** Some lib modules are `.ts`, others `.js`. Some components are `.jsx`, others `.tsx`.  
**Fix:** Establish convention: `.ts`/`.tsx` for new files. Migrate gradually.

---

## 4. Performance

### Key Optimizations Needed

| Issue | Impact | Fix | Effort |
|-------|--------|-----|--------|
| Square SDK on every page | +150KB JS on non-checkout pages | Move to checkout-only | S |
| Client-side product fetch on homepage | Slow LCP, no SSR content | Server Component + ISR | M |
| `window.location.href` for navigation | Full page reload, no prefetch | Use `<Link>` or `router.push` | S |
| Parallax on hero `translateY(${scrollY})` | Layout thrashing on scroll | Use CSS `will-change: transform` or remove | S |
| 109 dependencies in package.json | Large bundle | Audit unused deps (three.js needed?) | M |
| Custom webpack splitChunks with `sideEffects: false` | May break packages | Remove custom config, let Next.js optimize | S |

### What's Already Good
- `sharp` for image optimization ✅
- WebP/AVIF formats enabled ✅
- 1-year cache TTL for images ✅
- `removeConsole` in production ✅
- Preconnect to Square/Unsplash CDNs ✅

---

## 5. SEO & Structured Data

### 🔴 Hardcoded Fake Review Counts
**Files:**
- `seo/schemas.js` → `OrganizationSchema`: `ratingValue: '4.9', reviewCount: '847'`
- `app/page.js` → inline structured data: `ratingValue: '4.9', reviewCount: '847'`
- `app/page.js` → visible text: "4.9 / 5.0 (847 reviews)"

**Risk:** Google's review rich results policy explicitly prohibits fabricated review counts. Penalty = loss of all rich snippets.

**Fix:**
1. **Immediate:** Remove `aggregateRating` from `OrganizationSchema` unless backed by real data
2. **Proper:** Pull real review aggregates from MongoDB and inject dynamically
3. **Already done:** `ProductSchema()` accepts `reviews` param for dynamic data — use it everywhere

### 🟡 Canonical URL Issues
**File:** `app/layout.js` line 108
```html
<link rel="canonical" href="https://tasteofgratitude.shop" />
```
This hardcodes the homepage canonical on **every page**, telling Google all pages are duplicates of the homepage.

**Fix:** Remove from `<head>` — use Next.js metadata `alternates.canonical` per route:
```js
// Per page
export const metadata = {
  alternates: { canonical: 'https://tasteofgratitude.shop/catalog' }
};
```

### 🟡 Structured Data Uses `window.location` (Empty on Server)
**File:** `app/page.js` lines 106-107
```js
url: typeof window !== 'undefined' ? window.location.origin : '',
```
This renders empty strings during SSR, producing invalid structured data.

**Fix:** Use `process.env.NEXT_PUBLIC_APP_URL` or the metadata constant.

### 🟡 Duplicate Viewport Meta Tags
**File:** `app/layout.js` has viewport in both `metadata` export (line 32) AND a manual `<meta name="viewport">` tag (line 104).  
**Fix:** Remove the manual tag — Next.js handles it via metadata.

### 🟡 Duplicate `apple-mobile-web-app-status-bar-style` Meta Tags
**File:** `app/layout.js` lines 94 AND 105 — same meta tag twice.  
**Fix:** Remove the duplicate.

---

## 6. E-commerce & Payments

### ✅ What's Strong
- Square Web Payments integration with env validation and mismatch detection
- Multi-fulfillment (pickup at Serenbe/Peachtree markets, delivery with zone pricing, shipping)
- Order confirmation emails with fulfillment-specific details
- Admin order management panel
- Stripe as secondary payment option

### 🟡 Missing: Idempotency Keys on Payment Calls
**Risk:** Network retries can cause duplicate charges.  
**Fix:** Pass `idempotencyKey` (UUID) on all Square `createOrder`/`createPayment`/`subscriptions.create` calls.

### 🟡 Missing: Cart Abandonment Recovery
**Opportunity:** Capture email early in checkout flow, trigger reminder email after 2-4 hours if checkout not completed.  
**Implementation:** Store `{ email, cartSnapshot, startedAt }` in `abandoned_carts` collection. Add cron job to send recovery emails.

### 🟡 Missing: Inventory Low-Stock Alerts
**Current state:** Products always show "InStock" in schema.  
**Fix:** Check Square inventory, show "LowStock" or "OutOfStock" when appropriate. Add admin notifications for low inventory.

---

## 7. Subscription System (P1)

### ✅ What Shipped Successfully
- 7 API routes covering full lifecycle (create, skip, pause, cancel, update-payment, billing-history, webhook)
- Shared `subscription-tiers.js` module with validation + retry schedule
- 8 email templates integrated into existing template system
- Square subscription API integration using correct `SquareClient` new API
- MongoDB persistence with status tracking and retry counts
- Cron-based pre-renewal reminders and winback emails
- 12 passing unit tests

### 🔴 CRITICAL: Cron Not Scheduled in Vercel
**File:** `vercel.json` — `/api/cron/subscription-reminders` is NOT listed  
**Impact:** Pre-renewal reminders and winback emails will NEVER run  
**Fix:** Add to `vercel.json`:
```json
{ "path": "/api/cron/subscription-reminders", "schedule": "0 15 * * *" }
```
(10:00 AM EST = 15:00 UTC)

### 🔴 CRITICAL: No Customer Subscription Portal
**Impact:** Every subscription email links to `/account/subscriptions` and `/account/subscriptions/${id}` — these pages don't exist. Customers clicking "Manage Subscription" hit a 404.

**Fix (MVP):**
1. Create `app/account/subscriptions/page.js` — token-authenticated view of customer's subscriptions
2. Create `app/account/subscriptions/[id]/page.js` — single subscription management (skip/pause/cancel)
3. Generate signed magic links (JWT with email + subscriptionId, 1-hour expiry) in emails
4. Validate token in the pages before showing data

### 🔴 CRITICAL: Subscription Create Route Has No Customer Auth
**File:** `app/api/subscriptions/create/route.js`  
**Risk:** Anyone can POST to create subscriptions for any email address. No verification that the requester owns the email.  
**Fix:** Require either:
- A valid card nonce (proof of payment method ownership)
- Email verification step before subscription activation
- reCAPTCHA or similar bot protection

### 🟡 Hardcoded Coupon Codes Not Validated
**Files:** `subscriptionCanceledTemplate` uses `COMEBACK20`, `winbackSpecialOfferTemplate` uses `WINBACK20`  
**Impact:** Codes are displayed but never validated at checkout. Anyone seeing the email can share the code with unlimited use.  
**Fix:** Create `coupons` collection with validation:
```js
{ code, discount, type, maxRedemptions, perCustomerLimit, validUntil, source, enabled }
```

### 🟡 Subscription Billing History Route Has No Auth
**File:** `app/api/subscriptions/[id]/billing-history/route.js`  
**Risk:** Any user can view any subscription's billing history by guessing the MongoDB ObjectId.  
**Fix:** Require signed token or verify email ownership before returning data.

### 🟡 Missing: Subscription Analytics Dashboard
**Impact:** No visibility into MRR, churn rate, retry success rate, tier distribution.  
**Fix:** Add admin dashboard page with aggregated MongoDB queries:
```js
// Active subs by tier
db.collection('subscriptions').aggregate([
  { $match: { status: 'active' } },
  { $group: { _id: '$planId', count: { $sum: 1 }, mrr: { $sum: '$monthlyPrice' } } }
])
```

### 🟡 Missing: Subscription Feature Flag
**Impact:** Subscription UI/API accessible immediately on deploy, before testing in production sandbox.  
**Fix:** Add `FEATURE_SUBSCRIPTIONS_ENABLED=true` env var, gate API routes and UI behind it.

---

## 8. Email System

### 🔴 Wrong Domain in Templates
**File:** `lib/email-templates.js` line 17
```js
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://tasteofgratitude.net';
```
**Additional occurrences:** 20+ references to `tasteofgratitude.net` across:
- `lib/email.js` (from address default)
- `lib/email-config.js` (domain constant)
- `lib/email-mock.js` (from address)
- `lib/resend-email.js` (footer links)
- `lib/quiz-emails.js` (contact info)
- `lib/seo/local-business.ts` (email, website URL)
- `lib/seo/structured-data.tsx` (contact email)
- `lib/staff-notifications.js` (staff email)
- `app/terms/page.js`, `app/privacy/page.js`, `app/contact/page.js` (legal/contact pages)
- `components/Footer.jsx` (global footer)

**Fix:** Centralize domain in a single config:
```js
// lib/config.js
export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tasteofgratitude.shop';
export const CONTACT_EMAIL = 'hello@tasteofgratitude.shop'; // or keep .net if that's verified
export const SUPPORT_EMAIL = CONTACT_EMAIL;
```
Then search-replace all hardcoded `.net` references.

### 🟡 Unsubscribe Link Is Not Functional
**File:** `lib/email-templates.js` line 74
```html
<a href="${BASE_URL}/unsubscribe?email={{email}}">Unsubscribe</a>
```
- `{{email}}` is a literal string, not interpolated
- No signed token = anyone can unsubscribe anyone
- CAN-SPAM requires working unsubscribe

**Fix:**
1. Generate HMAC-signed unsubscribe token: `sign(email + listType + expiry)`
2. Create proper `/api/unsubscribe` endpoint that validates token
3. Actually interpolate the email variable

### 🟡 No Email Retry Logic
**File:** `lib/email.js` — single attempt, failure silently returns `{ success: false }`  
**Fix:** Add minimal retry (3 attempts with exponential backoff):
```js
for (let i = 0; i < 3; i++) {
  try { return await sgMail.send(msg); }
  catch (e) { if (i === 2) throw e; await new Promise(r => setTimeout(r, 200 * (i + 1))); }
}
```

### 🟡 No List-Unsubscribe Header
**Impact:** Gmail/Yahoo may flag emails or reduce deliverability without proper `List-Unsubscribe` header.  
**Fix:** Add `List-Unsubscribe` and `List-Unsubscribe-Post` headers to all marketing emails.

---

## 9. Testing & Quality Assurance

### Current State
| Type | Framework | Count | Coverage |
|------|-----------|-------|----------|
| Unit | Vitest | 12 tests | Subscription tiers, validation, retry | 
| E2E | Playwright | Config exists | Unknown run status |
| Integration | Vitest + supertest | Config exists | Unknown |
| Load | k6 | Config exists | Unknown |
| Lighthouse | LHCI | Configured | Unknown |

### 🔴 Critical Missing Tests
1. **Webhook signature verification** — test valid/invalid/replay signatures
2. **Webhook idempotency** — test duplicate event processing
3. **Subscription API auth** — test unauthorized access to billing history, management endpoints
4. **Payment failure flow** — test all 4 retry attempts → final cancellation
5. **Cron authentication** — test missing/invalid Bearer token

### 🟡 Missing Test Areas
- Checkout flow E2E (Playwright smoke)
- Email template rendering (ensure no broken HTML)
- Schema validation (once JSX extracted from schemas.js)
- Cart operations (add, remove, quantity, coupon application)
- Admin auth (login, token rotation, unauthorized access)

### 🟡 Schema Module Untestable
**Issue:** `seo/schemas.js` contains JSX in `injectSchema()` which Vitest can't parse with `.js` extension.  
**Fix:** Rename to `.jsx` or extract pure functions to `.ts` file.

---

## 10. Deployment & DevOps

### 🔴 Subscription Cron Missing from Vercel
**(Covered in Section 7)**

### 🟡 Subscription Routes Need Higher Timeout
**File:** `vercel.json` — subscription API routes use default 30s timeout  
**Fix:** Add explicit timeout for subscription and webhook routes:
```json
{
  "app/api/subscriptions/**/route.js": { "maxDuration": 60 },
  "app/api/subscriptions/webhook/route.js": { "maxDuration": 60 }
}
```

### 🟡 CRON_SECRET Committed to Repo
**File:** `CRON_SECRET` file exists in repo root  
**Risk:** Cron authentication secret exposed in git history  
**Fix:** Delete file, ensure secret is only in Vercel env vars. Add to `.gitignore`.

### 🟡 Environment Variable Sprawl
**Observation:** Multiple env var names for the same concept:
- `NEXT_PUBLIC_BASE_URL` vs `NEXT_PUBLIC_APP_URL` vs hardcoded domains
- `SENDGRID_FROM_EMAIL` vs hardcoded `hello@tasteofgratitude.net`

**Fix:** Document all required env vars in `.env.example` with clear naming.

### ✅ What's Good
- Vercel deployment with preview branches
- GitHub Actions CI (workflows exist)
- Sentry error tracking configured
- Health check cron every 5 minutes
- Husky for pre-commit hooks

---

## 11. UX & Accessibility

### 🟡 Navigation Uses `window.location.href` Instead of Client-Side Routing
**Files:** `app/page.js` lines 212, 699
```js
onClick={() => window.location.href = '/catalog'}
```
**Impact:** Full page reload instead of smooth SPA transition. Loses React state, no prefetching.  
**Fix:** Use `<Link href="/catalog">` or `router.push('/catalog')`.

### 🟡 No `prefers-reduced-motion` Support
**Impact:** Users with motion sensitivity see all animations (fade-ins, parallax, hover scales).  
**Fix:** Add CSS:
```css
@media (prefers-reduced-motion: reduce) {
  .fade-in-section, .animate-in { transition: none !important; opacity: 1 !important; }
  * { animation-duration: 0.01ms !important; }
}
```

### 🟡 Background Music Auto-Consideration
**Observation:** Background music system exists (`BackgroundMusic.tsx`, `MusicControls.tsx`).  
**Fix:** Ensure music never auto-plays (browsers block this anyway). Default to muted. Respect `prefers-reduced-motion`.

### ✅ What's Good
- ARIA roles on filter buttons (`role="radiogroup"`, `role="radio"`)
- `aria-live="polite"` on results counter
- Skip links component exists
- Loading/empty states with proper indicators
- Mobile-first responsive design
- Keyboard-accessible FAQ accordion

---

## 12. Business Logic & Revenue Gaps

### 🔴 Revenue-Critical Gaps

| Gap | Revenue Impact | Fix Effort |
|-----|---------------|------------|
| No subscription customer portal | Subscribers can't self-serve → support burden, churn | L (1-2 days) |
| No subscription landing page | No way to browse/compare plans | M (1 day) |
| Coupons not validated | Revenue leakage from unlimited coupon use | M |
| No abandoned cart recovery | Lost conversions (industry avg 70% abandon rate) | M |
| No referral tracking | Missing viral growth loop | M |

### 🟡 Growth Opportunities

| Opportunity | Expected Impact | Implementation |
|-------------|----------------|---------------|
| **Subscription landing page** (`/subscriptions`) | Drive MRR from browsing traffic | Show plans, comparison table, FAQ, CTA |
| **Auto-reorder reminders** | Increase repeat purchases by 20-30% | "Running low?" email 3 weeks after purchase |
| **Bundle upsell at checkout** | Increase AOV by 15-25% | "Complete your wellness kit" suggestions |
| **Review incentives** | 5x review submissions | Points already exist, need prominence |
| **Social proof on product pages** | Increase conversion 10-15% | Show RatingBadge component (already built!) |
| **SMS notifications** | Higher open rate (98% vs 20% email) | Twilio already in deps, `lib/sms.js` exists |
| **Loyalty tiers** | Increase LTV | Bronze/Silver/Gold based on order history |

---

## 13. Documentation & Codebase Hygiene

### 🟡 184 Markdown Files in Root Directory
Most are from past audit sessions, implementation notes, and debugging logs. They create noise and make the repo look unmaintained.

**Fix:**
1. Create organized structure:
```
docs/
├── ARCHITECTURE.md        # Current system architecture
├── RUNBOOK.md             # Cron jobs, webhooks, payments ops guide
├── SECURITY.md            # CSP, CORS, secrets management
├── SUBSCRIPTION_GUIDE.md  # Subscription system documentation
├── DEPLOYMENT.md          # Vercel deployment guide
└── archive/               # Move all old .md files here
```
2. Add `P1_INTEGRATION_MAP.md` to `docs/` (reference document, not root clutter)
3. Delete truly obsolete files (BRIDGE_*, WINDOWS_*, ANDROID_* are from other projects)

### 🟡 Deprecated Files Still in Repo
- `SquarePaymentForm.jsx.deprecated`
- `SquareWebPaymentForm.jsx.deprecated`
- `package.json.optimized`
- Various test scripts (`test-square-prod.js`, `test-abliterate.js`, etc.)

**Fix:** Delete. Git history preserves everything.

---

## 14. Prioritized Action Plan

### 🔴 P0 — Same Day (Prevents Breaches & Silent Failures)

| # | Action | File(s) | Effort |
|---|--------|---------|--------|
| 1 | Add subscription cron to vercel.json | `vercel.json` | 10 min |
| 2 | Tighten CORS to tasteofgratitude.shop only | `next.config.js` | 15 min |
| 3 | Fix webhook signature to use timingSafeEqual | `app/api/subscriptions/webhook/route.js` | 30 min |
| 4 | Delete CRON_SECRET file from repo | `CRON_SECRET` | 5 min |
| 5 | Re-enable TypeScript + ESLint build checks | `next.config.js` | 1-3 hours |

### 🟡 P1 — This Week (Revenue & Operations)

| # | Action | Effort |
|---|--------|--------|
| 6 | Fix email domain (.net → .shop) across 20+ files | 2 hours |
| 7 | Create customer subscription portal (/account/subscriptions) | 1-2 days |
| 8 | Add webhook idempotency (event_id dedup) | 1 hour |
| 9 | Create subscription landing page (/subscriptions) | 1 day |
| 10 | Implement coupon validation system | 4 hours |
| 11 | Fix unsubscribe link with signed tokens | 2 hours |
| 12 | Remove hardcoded fake review counts from SEO schemas | 1 hour |

### 🟢 P2 — Next 2 Weeks (Quality & Growth)

| # | Action | Effort |
|---|--------|--------|
| 13 | CSP Report-Only → Enforce | 3 hours |
| 14 | Convert homepage to Server Component + ISR | 1 day |
| 15 | Move Square SDK to checkout-only | 1 hour |
| 16 | Add critical test coverage (webhooks, auth, payments) | 2 days |
| 17 | Cart abandonment recovery emails | 1 day |
| 18 | Subscription analytics admin dashboard | 1 day |
| 19 | Documentation cleanup (184 → organized /docs/) | 2 hours |
| 20 | Remove canonical URL from global layout | 15 min |

---

## 15. Revenue-Driving Improvements

### Immediate Revenue Impact (Do First)

1. **Subscription Landing Page** — Without a page to browse plans, the subscription system has no discovery path. Create `/subscriptions` with plan comparison, pricing, FAQ, and "Start Now" CTA.

2. **Abandoned Cart Recovery** — ~70% of carts are abandoned industry-wide. Even recovering 5% is significant.

3. **Auto-Reorder Reminders** — Sea moss gel lasts ~3-4 weeks. Send "Running low?" email at day 21 with one-click reorder.

4. **SMS for Order Updates** — Twilio is already in dependencies. SMS has 98% open rate vs 20% for email. Use for shipping, delivery, and pickup notifications.

5. **Review-to-Purchase Loop** — `RatingBadge` component is already built but not used on product cards in the catalog grid. Adding it shows social proof where purchasing decisions happen.

### Medium-Term Revenue Growth

6. **Loyalty Tiers** — Bronze (0-99 points), Silver (100-499), Gold (500+). Gold members get early access to new flavors, exclusive bundles, 15% off subscriptions.

7. **Referral Program** — "Give $5, Get $5" referral links. The rewards system already exists; extend it with referral tracking.

8. **Bundle Builder** — Let customers create custom bundles (pick 3 products, save 20%). The `ProductBundles` component exists but could be more interactive.

9. **Subscription Gifting** — "Gift a subscription" option for holidays/occasions. High LTV if recipient converts to self-pay.

10. **Wholesale/B2B Portal** — Separate pricing tier for wellness practitioners, juice bars, spas who buy in bulk.

---

## Appendix: File Reference

### Key Architecture Files
| File | Purpose |
|------|---------|
| `lib/square.ts` | Square SDK client factory with env validation |
| `lib/db-optimized.js` | MongoDB connection pooling |
| `lib/email.js` | SendGrid email service |
| `lib/email-templates.js` | HTML email template functions |
| `lib/subscription-tiers.js` | Subscription plan definitions & validation |
| `lib/health-benefits.js` | Product health benefit enrichment |
| `lib/analytics.js` | PostHog + custom analytics |
| `lib/auth-config.ts` | Cron & admin auth secrets |
| `middleware.ts` | Admin auth, HTTPS, security headers |
| `seo/schemas.js` | JSON-LD structured data |

### Subscription API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/subscriptions/create` | POST | Create new subscription |
| `/api/subscriptions/[id]/skip` | POST | Skip next shipment |
| `/api/subscriptions/[id]/pause` | POST | Pause subscription |
| `/api/subscriptions/[id]/cancel` | POST | Cancel subscription |
| `/api/subscriptions/[id]/update-payment` | POST | Update payment method |
| `/api/subscriptions/[id]/billing-history` | GET | View billing history |
| `/api/subscriptions/webhook` | POST | Square webhook handler |
| `/api/cron/subscription-reminders` | POST | Pre-renewal + winback |

### Cron Jobs (vercel.json)
| Path | Schedule | Status |
|------|----------|--------|
| `/api/cron/health-check` | Every 5 min | ✅ Active |
| `/api/cron/scheduled-campaigns` | Every 5 min | ✅ Active |
| `/api/cron/pickup-reminders` | Fri 9am | ✅ Active |
| `/api/cron/morning-reminders` | Sat 8am | ✅ Active |
| `/api/quiz/email-scheduler` | Hourly | ✅ Active |
| `/api/cron/subscription-reminders` | — | 🔴 NOT SCHEDULED |
| `/api/cron/cleanup-abandoned-orders` | — | ⚠️ NOT SCHEDULED |
| `/api/cron/missed-pickup` | — | ⚠️ NOT SCHEDULED |

---

*Generated by Amp · March 4, 2026*  
*Commit: 04a16ca (P1 Integration) pushed to main*
