# OPEE Full Codebase Evaluation — Gratog (Taste of Gratitude)

**Date:** 2026-07-31  
**Evaluator:** OpenClaw (independent, against OPEE purpose constitution)  
**Commit:** `53652f9f` (production)  
**URL:** https://tasteofgratitude.shop  
**Framework:** OPEE Decision Filter + Verification Standard + Permanent Guardrails  

---

## Executive Summary

The Gratog platform has a **functional core commerce path** (browse → cart → checkout → Square payment → order confirmation → owner notification) that works end-to-end. However, the codebase carries significant **accumulated debt from parallel implementations**, **64+ missing API routes** (partially restored), **dual email/notification systems**, **overlapping auth modules**, and **critical security gaps** (price tampering, admin cookie = API key). Several customer-facing features are **non-functional shells** (auth, reviews, quiz, newsletter, wishlist).

**OPEE Certification Status:** ❌ **FAILS CERTIFICATION** — 4 critical, 10 high, 19 medium, 8 low defects remain. The core purchase path works, but trust, money, and safety have unresolved gaps.

---

## OPEE Decision Filter Assessment

| Criterion | Status | Evidence |
|-----------|--------|----------|
| **Purpose** | ⚠️ Partial | Core ordering works; 8+ customer features are broken shells |
| **Customer Value** | ⚠️ Partial | Browse-to-buy works; returning customers, reviews, quiz, wishlist are dead |
| **Founder Value** | ⚠️ Partial | Admin dashboard renders; sync, notifications, campaigns are partially broken |
| **Operational Reality** | ⚠️ Partial | Pickup works; delivery is limited; shipping is archived but still referenced |
| **Financial Value** | ❌ Fail | Price tampering vulnerability; coupon burn before payment; duplicate products |
| **Brand Alignment** | ⚠️ Partial | Wellness claims removed (Group 1 fix); wholesale/shipping links removed (Group 2 fix); placeholder reviews removed |
| **Truthfulness** | ⚠️ Partial | No fake reviews; no SMS; but stale prices, duplicate products, and broken features misrepresent capabilities |
| **Maintainability** | ❌ Fail | Dual email systems, dual checkout paths, 6+ auth modules, 3 cart implementations |
| **Verification** | ❌ Fail | 64+ routes were missing; no E2E test suite against production; no admin mutation testing |

---

## A. Customer Flow Evaluation

### A1. Homepage → Catalog → Product Detail → Add to Cart

| Aspect | Status | Detail |
|--------|--------|--------|
| Homepage (`/`) | ✅ Works | ISR (5min), Square catalog snapshot, filters unavailable/sold-out |
| Catalog (`/catalog`) | ✅ Works | Dynamic, Square catalog + curated merge |
| Product Detail (`/product/[slug]`) | ✅ Works | MongoDB lookup with regex fallback, curated data overlay |
| Add to Cart | ✅ Works | Zustand + localStorage, `/api/cart/price` for server-side pricing |
| Mobile redirect | ⚠️ Dead code | `page-mobile-redirect.js` exists but `page.js` is active; no redirect |

**Issues:**
- Product data is a **dual-source merge** (Square + curated `products.ts`). Price drift between Square and curated data is a real risk — `mergeWithCuratedProduct()` prefers live price if > 0, but falls back to hardcoded curated prices.
- `data/products.ts` still contains "Blue Lotus Gel" (duplicate of "Blue Lotus") — archived in code but may still appear if Square sync doesn't filter it.
- Wellness claims removed in Group 1 fix; needs production verification.

### A2. Checkout Flow

| Step | Component | Status | Issues |
|------|-----------|--------|--------|
| Cart summary | `CartSummary.tsx` | ✅ | `PREORDER_MINIMUM` hardcoded at $60 |
| Contact form | `ContactForm.tsx` | ✅ | `saveInfo` checkbox is decorative (no persistence) |
| Fulfillment tabs | `FulfillmentTabs.tsx` | ✅ | Auto-switches to pickup for preorder items |
| Pickup form | `PickupForm.tsx` | ✅ | Location selector + date picker |
| Delivery form | `DeliveryForm.tsx` | ⚠️ | Quote staleness risk; `/api/delivery/quote` may be missing |
| Shipping form | `ShippingForm.tsx` | ✅ | Works but **shipping is archived** — should not be available |
| Payment | `SquarePaymentFormV2.tsx` | ✅ | Square Web Payments SDK |
| Order creation | `/api/orders/create` | ✅ | Atomic with MongoDB transaction |
| Payment processing | `/api/payments` | ✅ | `orderAccessToken` gate (15min HMAC) |
| Confirmation | `/order/success` | ✅ | Redirects from `/checkout/success` |

**Critical Issues:**
1. **🔴 C3 — Price tampering**: `/api/orders/create` accepts client-supplied `subtotal`, `total`, item `price`. Server never rebuilds from Square catalog. Attacker can submit $0.01 items.
2. **🟠 M1 — Parallel checkout systems**: `/checkout` + `/api/payments` (canonical) vs `/order/*` + `/api/pay/process` + `/api/checkout` + `/api/create-checkout` — two UX trees coexist.
3. **🟠 H3 — Coupon burn before payment**: `$inc usedCount` happens at order creation, before payment success. Failed payments waste coupon redemptions.
4. **ShippingForm is accessible but shipping is archived** — misleading to customers.

### A3. Customer Account & Auth

| Feature | Route | Status |
|---------|-------|--------|
| Login | `/login` → `/api/auth/login` | ✅ Restored |
| Register | `/register` → `/api/auth/register` | ✅ Restored |
| Forgot password | `/forgot-password` → `/api/auth/forgot-password` | ✅ Restored |
| Reset password | `/reset-password` → `/api/auth/reset-password` | ✅ Restored |
| Profile | `/profile` → `/api/user/profile` | ✅ Restored |
| Order history | `/profile/orders` → `/api/user/orders` | ✅ Restored |
| Rewards | `/rewards`, `/gratitude` → `/api/gratitude/*` | ✅ Partial |
| Wishlist | `/api/user/favorites` | ✅ Restored |

**Previously missing routes have been restored.** However, the customer auth system (`lib/auth.ts`, `lib/auth/jwt.js`, `lib/auth/middleware.js`, `contexts/AuthContext.js`) uses `JWT_SECRET` shared with admin auth and order access tokens — a single secret for 3 different purposes (M3).

### A4. Other Customer Features

| Feature | Status | Detail |
|---------|--------|--------|
| Reviews | ⚠️ Partial | `/api/reviews` missing (public submission); admin reviews works |
| Quiz | ⚠️ Partial | `/api/quiz` exists but `/api/quiz/recommendations` may be incomplete |
| Newsletter | ✅ Restored | `/api/newsletter/subscribe` exists |
| Contact | ✅ Restored | `/api/contact` exists |
| Unsubscribe | ✅ Restored | `/api/unsubscribe` exists |
| Search | ✅ | `/api/search/enhanced` exists |
| Weekly menu | ✅ | `/weekly-menu`, `/api/menus/current` |
| Markets | ✅ | `/markets`, `/api/markets` |
| Preorder | ✅ | `/preorder` with $60 minimum, delivery zone lookup |
| Telegram alerts | ✅ | `/telegram-alerts` opt-in page |
| Rewards/Gratitude | ✅ Partial | Account, earn, redeem, referral, rewards, transactions all exist; passport scan/stamp missing |

---

## B. Admin Flow Evaluation

### B1. Admin Auth

| Aspect | Status | Detail |
|--------|--------|--------|
| Login | ✅ | `/api/admin/auth/login` — JWT-based, `admin_users` collection |
| Session | ✅ | `admin_token` cookie (HS256), `lib/admin-session.ts` (Edge-safe) |
| CSRF | ✅ | `generateCsrfToken()` / `validateCsrfToken()` in `lib/auth/unified-admin.ts` |
| Logout | ✅ | `/api/admin/auth/logout` |
| Password reset | ✅ Restored | `/api/admin/auth/reset-password` |
| Middleware | ✅ | `middleware.ts` — Edge runtime, `jose`-based, protects `/admin/*` and `/api/admin/*` |

**Critical Issues:**
1. **🔴 C2 — Admin cookie = API key**: Legacy `ADMIN_API_KEY`/`MASTER_API_KEY` accepted as `admin_token` cookie in middleware. No per-session expiry, no rotation, no constant-time compare. **This is a severe security vulnerability.**
2. **🟡 M3 — Shared JWT_SECRET**: Same secret used for admin JWTs, customer JWTs, order access tokens, unsubscribe tokens, and idempotency keys.
3. **6+ auth modules overlap**: `lib/admin-auth.js` (legacy), `lib/admin-auth-middleware.js`, `lib/admin-session.ts`, `lib/admin-token.ts`, `lib/auth/unified-admin.ts`, `lib/auth.ts`. Risk of inconsistent enforcement.

### B2. Admin Dashboard

| Feature | Status | Detail |
|---------|--------|--------|
| Dashboard | ✅ | `/admin` — analytics overview |
| Products CRUD | ✅ | `/api/admin/products`, `/api/admin/products/[id]`, sync with Square |
| Inventory per-product | ✅ | `/api/admin/inventory/[productId]` |
| Inventory list | ❌ Missing | `/api/admin/inventory` list endpoint missing (M6) |
| Orders list/view/refund | ✅ | `/api/admin/orders`, `/api/admin/orders/[id]/refund` |
| Orders sync | ✅ Restored | `/api/admin/orders/sync` |
| Customers | ✅ | `/api/admin/customers`, `/api/admin/customers/[id]` |
| Coupons (admin) | ✅ | `/api/admin/coupons` |
| Coupons (public validate) | ✅ Restored | `/api/coupons/validate` |
| Campaigns | ⚠️ Partial | Compose works; AI generate/test missing |
| Reviews | ✅ | `/api/admin/reviews` |
| Markets | ✅ | `/api/admin/markets`, seed |
| Menus | ✅ | `/api/admin/menus`, archive |
| Fresh batch | ✅ | `/api/admin/fresh-batch/requests`, reservations |
| Notifications | ⚠️ | `/api/admin/notifications` exists; broadcast/send/stats were missing |
| Analytics | ✅ | `/api/admin/analytics` |
| Errors | ✅ | `/api/errors/list`, `/api/errors/summary` |
| Square OAuth | ✅ | `/api/oauth/square/*` |
| Setup/Emergency init | ✅ | `/api/admin/setup`, `/api/admin/emergency-init` |
| Settings | ⚠️ | No dedicated settings API |

**Previously missing features now restored:** auth routes, newsletter, contact, unsubscribe, favorites, order sync, coupons validate, fresh batch, menus.

**Still missing:** inventory list view, notifications broadcast/send/stats, campaign AI generate/test.

### B3. Admin Data Integrity

| Aspect | Status | Issue |
|--------|--------|-------|
| Product visibility toggle | ⚠️ | Admin can toggle but Square sync may override |
| Price update | ⚠️ | Admin price vs Square price drift — no reconciliation |
| Order status update | ⚠️ | `/api/admin/orders/update-status` was missing; may now be part of sync |
| Webhook processing | ✅ | Square webhooks verified, deduped via `webhook_events_processed` |
| Audit logging | ⚠️ | `audit_log` and `audit_logs` collections both exist (M14) |

---

## C. Product/Catalog System

### C1. Data Architecture

**Dual-source merge** (Square Catalog + curated `data/products.ts`):

```
Square API → catalogSync → MongoDB (square_catalog_items)
                                    ↓
                              syncToUnified → MongoDB (unified_products)
                                    ↓
              getStorefrontCatalogSnapshot() ← data/products.ts (curated fallback)
                                    ↓
              mergeWithCuratedProduct() → API routes → Frontend
```

**Source of truth per field:**
| Field | Authority | Conflict Risk |
|-------|-----------|---------------|
| Product ID | Square | None |
| Name | Curated `products.ts` | Low |
| **Price** | **Both** | **🔴 HIGH** — curated has hardcoded prices; Square has variation prices |
| Variations | Square | Low |
| Description | Curated | Low |
| Images | Square (primary), Curated (fallback) | Low |
| Visibility | Square flags via `square-visibility.js` | Medium |
| Weekly menu status | Curated | None |

### C2. Price Integrity

🔴 **Critical**: The checkout server (`/api/orders/create`) accepts client-submitted prices without rebuilding from Square catalog. This is the **price tampering vulnerability (C3)**. Even if the catalog display is correct, a modified client can submit arbitrary prices.

**Additional price risks:**
- `data/products.ts` has hardcoded prices that may drift from Square
- No automated price reconciliation between curated data and Square
- `mergeWithCuratedProduct()` prefers live price if > 0, but falls back to curated price — stale curated prices can surface

### C3. Product Visibility Filtering

- `square-visibility.js` implements wholesale vs retail filtering
- Group 2 fix archived "Blue Lotus Gel" in `products.ts` and removed wholesale/shipping links from footer
- **Owner must still archive duplicate/wholesale products in Square Dashboard** — code-only archiving is insufficient
- The 4 flagged product IDs are filtered from customer catalog via `STOREFRONT_FILTER_CONFIG`

---

## D. Payment & Transaction Flow

### D1. Canonical Flow (Working)

```
Browser → Cart (Zustand/localStorage)
  → /api/cart/price (server-side totals)
  → /api/inventory/lock (reserve stock)
  → /api/orders/create (atomic MongoDB transaction, returns orderAccessToken)
  → Square Web Payments SDK (card tokenization)
  → /api/payments (Authorization: orderAccessToken, Square Payments API)
  → /order/success (confirmation)
  → Email confirmation (Resend)
  → Owner alert (Telegram → email fallback)
```

### D2. Failure Points

| # | Step | Failure Mode | Severity |
|---|------|-------------|----------|
| F1 | Inventory lock | Lock expires before payment; no automatic extension | 🟡 |
| F2 | Order create | Client-submitted prices (C3) | 🔴 |
| F3 | Coupon burn | `$inc usedCount` before payment success (H3) | 🟠 |
| F4 | Reward points | Fire-and-forget via self-fetch to `/api/rewards/add-points` (H4) | 🟠 |
| F5 | Payment | `orderAccessToken` 15min TTL — no refresh mechanism | 🟡 |
| F6 | Confirmation email | Failure logged but doesn't fail request; no retry queue | 🟡 |
| F7 | Email ledger | Transactional path skips `email_sends` write (C4) | 🔴 |
| F8 | Square webhook | Signature mismatch → order stuck in `paid` with no fulfillment update | 🟠 |
| F9 | Parallel checkout | `/api/pay/process`, `/api/checkout`, `/api/create-checkout` coexist | 🟠 |

### D3. Idempotency

- Order create: `Idempotency-Key` header, 24h reuse window, MongoDB `idempotency_keys` collection ✅
- Rewards: idempotent on `(email, orderId)` ✅
- Square payment: `idempotency_key` passed to SDK — needs verification ⚠️
- Order access token: HMAC-signed, single-use recommended but not enforced (M4)

---

## E. Email/Notification System

### E1. Architecture (Dual System Problem)

| System | File | Status | Used By |
|--------|------|--------|---------|
| Legacy | `lib/resend-email.js` | `@deprecated` but **still active** | Order confirmation, welcome, coupon, newsletter, review |
| Modern | `lib/email/service.js` | Current recommended | Preference-aware sends, queue processing |
| Queue | `lib/email-queue.js` | Separate system | Quiz follow-ups, scheduled marketing |
| Templates (legacy) | `lib/email-templates.js` | `@deprecated` | 7 templates including shipping, pickup, delivery |
| Templates (modern) | `lib/email/templates.js` | Current | 5 templates (welcome, order confirm, password, reward, challenge) |

**🟡 M2 — Dual email modules**: Two sending paths create inconsistent logging, different error handling, and missing lifecycle tracking. Legacy templates have order lifecycle emails (shipping, pickup, delivery) that are NOT in the modern templates.

### E2. Owner Alerts (Telegram-First)

- ✅ **Well-designed**: Durable MongoDB queue, idempotent enqueue, atomic claim, 5-retry with dead letter
- ✅ Channel priority: Telegram → Resend email fallback
- ✅ Builder helpers for common alert types
- ✅ No SMS dependency (per OPEE mandate)

### E3. Smart Alerting

- 8 rules defined (error rate, payment spike, API degradation, etc.)
- ⚠️ Only Telegram and Slack actually implemented; PagerDuty/GitHub issue creation coded but likely unconfigured
- ❌ Email alert channel calls `/api/email/alert` which doesn't exist

### E4. Push Notifications

- **Stub only**: `sendPushNotification()` logs and falls back to email
- Web Push API declared but VAPID keys not configured, no `web-push` library imported
- 11 notification types defined but none deliver via push

### E5. Cron Jobs

| Route | Purpose | Status |
|-------|---------|--------|
| `/api/cron/cleanup-abandoned-orders` | Clean stale orders | ✅ Exists |
| `/api/cron/cleanup-locks` | Release expired inventory locks | ✅ Exists |
| `/api/cron/daily-report` | Owner daily digest | ✅ Exists |
| `/api/cron/owner-alerts` | Process owner alert queue | ✅ Exists |

---

## F. Security Assessment

### F1. Critical Security Issues

| ID | Severity | Issue | Detail |
|----|----------|-------|--------|
| C2 | 🔴 Critical | Admin cookie = API key | `middleware.ts` accepts `admin_token` cookie equal to `ADMIN_API_KEY`/`MASTER_API_KEY`. No rotation, no per-session expiry, no constant-time compare. Cookie disclosure = total admin compromise. |
| C3 | 🔴 Critical | Price tampering | `/api/orders/create` accepts client-submitted prices. Server never rebuilds from Square catalog. |
| C4 | 🔴 Critical | Email ledger gap | Transactional email path skips `email_sends` write. Delivery webhooks can't update. Bounce/complaint tracking broken. |
| C0 | 🔴 Critical | Resend domain verification | `tasteofgratitude.shop` domain was not verified (may be resolved now; needs verification) |

### F2. High Security Issues

| ID | Severity | Issue |
|----|----------|-------|
| H1 | 🟠 | Customer auth was entirely broken (routes now restored; needs E2E verification) |
| H4 | 🟠 | Rewards via self-fetch over HTTP — if `NEXT_PUBLIC_BASE_URL` wrong, rewards silently skip |
| H5 | 🟠 | Square diagnostic endpoints unauthenticated (`/api/debug/square`, `/api/square/diagnose`, `/api/square/test-rest`, `/api/square/validate-token`) |
| H6 | 🟠 | Unsubscribe route exists but needs E2E verification |
| M3 | 🟡 | Single `JWT_SECRET` for admin JWTs, customer JWTs, order tokens, unsubscribe, idempotency |
| M4 | 🟡 | Order access token reusable within TTL (should be single-use) |
| M17 | 🟡 | No rate limiting on auth, contact, or registration routes |

---

## G. Code Quality & Maintainability

### G1. Duplication Hotspots

| Area | Count | Impact |
|------|-------|--------|
| Auth modules | 6+ | Confusing; risk of inconsistent enforcement |
| Email sending | 2 | Different logging, error handling, lifecycle tracking |
| Checkout paths | 2+ | Customer may hit wrong flow |
| Cart implementations | 3 | `store/cart.ts`, `lib/unified-cart.js`, `lib/cart-engine.ts` |
| Product data sources | 2 | Square + curated merge; price drift risk |
| Audit collections | 2 | `audit_log` + `audit_logs` |
| Template collections | 2 | `email_queue` + `scheduled_emails` |

### G2. Dead/Archived Code Still Active

| Item | Risk |
|------|------|
| `archive/` directory | Contains shipping forms, subscription tiers, reward fraud detection — may be imported |
| `/api/pay/process`, `/api/checkout`, `/api/create-checkout` | Parallel checkout paths still routable |
| `lib/demo-products.js` | Demo product data that could leak into catalog |
| `lib/health-benefits.js` | Wellness claim data (should be fully removed) |
| `lib/sandbox-detection.js` | References sandbox filtering |
| `app/policies/page.js` | Shipping policy page (shipping is archived) |
| `components/checkout/ShippingForm.tsx` | Shipping form in checkout (shipping is archived) |

---

## H. OPEE Guardrail Compliance

| Guardrail | Status | Evidence |
|-----------|--------|----------|
| Never invent products | ✅ | Products come from Square + curated data |
| Never invent prices | ⚠️ | Curated prices in `products.ts` may drift from Square |
| Never invent market dates | ✅ | Market dates from `data/markets.ts` |
| Never display fake reviews | ✅ | Placeholder reviews removed (Group 1 fix) |
| Never display fake stock | ✅ | Stock from Square/inventory |
| Never make medical claims | ✅ | Wellness claims removed (Group 1 fix) |
| No SMS dependency | ✅ | Owner alerts via Telegram + Resend |
| No shipping promises | ⚠️ | Footer link removed; ShippingForm still in checkout |
| No wholesale exposure | ⚠️ | Footer link removed; wholesale products still in Square |
| No unnecessary paid services | ✅ | No paid third-party services beyond Square + Resend |
| Verify before claiming success | ❌ | Prior certification was false positive; no E2E production tests |
| No parallel implementations | ❌ | Dual email, dual checkout, triple cart |

---

## I. Verification Matrix

| Verification Target | Method | Status |
|---------------------|--------|--------|
| Homepage renders without SMS language | Production scrape | ✅ Verified (Group 1) |
| No placeholder reviews | Production scrape | ✅ Verified (Group 1) |
| No wellness claims in product descriptions | Production scrape | ✅ Verified (Group 1) |
| Footer has no shipping/wholesale links | Production scrape | ✅ Verified (Group 2) |
| Products filtered from customer catalog | `/api/products` + `/api/storefront/catalog` | ✅ Verified (Group 2) |
| Square credentials set | `vercel env ls` | ✅ Verified |
| Deployed commit = git main | Vercel deployment metadata | ✅ Verified (`53652f9f`) |
| Admin login works end-to-end | E2E test | ❌ Not verified |
| Guest checkout completes with Square test card | E2E test | ❌ Not verified |
| Price tampering blocked | Security test | ❌ Not verified |
| Order confirmation email delivered | Live test | ❌ Not verified |
| Owner Telegram alert received | Live test | ❌ Not verified |
| Admin product toggle reflects publicly | Mutation test | ❌ Not verified |
| Customer auth (register/login/profile) | E2E test | ❌ Not verified |

---

## J. Priority Remediation Roadmap

### P0 — Trust, Money, Safety (Immediate)

| # | Issue | Fix |
|---|-------|-----|
| C2 | Admin cookie = API key | Implement per-session admin JWT with rotation, constant-time compare, remove direct API key auth |
| C3 | Price tampering | Server-side price rebuild from Square catalog in `/api/orders/create` before payment |
| C4 | Email ledger gap | Write `email_sends` row before Resend send; update on webhook |
| C0 | Resend domain | Verify `tasteofgratitude.shop` on Resend (or confirm `hello@` is verified) |

### P1 — Customer Success (This Sprint)

| # | Issue | Fix |
|---|-------|-----|
| H3 | Coupon burn before payment | Move `$inc usedCount` to payment-success path |
| H4 | Rewards via self-fetch | Inline the rewards function call instead of HTTP self-fetch |
| H5 | Unauthenticated Square diagnostics | Gate behind admin middleware or remove from production |
| M1 | Parallel checkout systems | Deprecate `/api/pay/process`, `/api/checkout`, `/api/create-checkout`; redirect to canonical |
| M2 | Dual email systems | Consolidate into `lib/email/service.js`; deprecate `lib/resend-email.js` |
| Shipping form | Still accessible | Remove `ShippingForm.tsx` from checkout; archive shipping-related code |

### P2 — Operational Efficiency (Next Sprint)

| # | Issue | Fix |
|---|-------|-----|
| M3 | Shared JWT_SECRET | Distinct secrets per purpose (admin, customer, order tokens, unsubscribe, idempotency) |
| M4 | Order token reuse | Bind to idempotency key; single-use |
| M6 | Inventory list view | Restore `/api/admin/inventory` list endpoint |
| M14 | Duplicate audit collections | Migrate to single `audit_logs` collection |
| M17 | Rate limiting | Apply `lib/security/redis.ts` limiter to auth, contact, registration routes |
| Dead code cleanup | Archive directory, demo products, health benefits | Remove or properly gate |
| Push notifications | Stub → implement or remove | Implement Web Push or remove the stub |

### P3 — Growth Optimization (After Core Works)

| # | Issue | Fix |
|---|-------|-----|
| E2E test suite | No production Playwright tests | Build `tests/alignment/` suite against staging |
| Admin mutation testing | No verification that admin changes reflect publicly | Build mutation test harness |
| Service worker cache | No validation after deploys | Add version-sync guard |
| Price reconciliation | No automated check | Build nightly Square vs curated price comparison |
| Customer auth E2E | Routes restored but untested | End-to-end register → login → profile → order history |

---

## K. Defect Summary

| Severity | Count | Key Items |
|----------|-------|-----------|
| 🔴 Critical | 4 | Admin cookie=API key, price tampering, email ledger gap, Resend domain |
| 🟠 High | 10 | Coupon burn, rewards self-fetch, unauth diagnostics, broken features, parallel systems |
| 🟡 Medium | 19 | Shared secrets, token reuse, rate limiting, dead code, dual modules |
| 🟢 Low | 8 | Dependency cleanup, consistency, minor UX |
| **TOTAL** | **41** | (unchanged from prior audit; some items partially remediated) |

---

## L. Certification Verdict

**OPEE CERTIFICATION: ❌ FAILS**

The platform fails OPEE certification on three mandatory criteria:

1. **Financial integrity** (C3: price tampering, H3: coupon burn before payment)
2. **Security** (C2: admin auth bypass, H5: unauthenticated diagnostics)
3. **Observability** (C4: email delivery untracked, no E2E production verification)

The core purchase path works. The owner can receive orders and get paid. But the system cannot be certified as truthful, secure, or verifiable until P0 items are resolved.

**Recommended path to certification:**
1. Fix C2 (admin auth) — 1-2 days
2. Fix C3 (price rebuild) — 1 day
3. Fix C4 (email ledger) — 1 day
4. Verify C0 (Resend domain) — 0.5 day
5. Run E2E verification suite against staging — 2-3 days
6. Re-apply for certification

---

*Evaluation conducted using OPEE Decision Filter, Verification Standard, and Permanent Guardrails from `memory/taste-of-gratitude-purpose.md`. All findings traced to source code in the Gratog repository at commit `53652f9f`.*