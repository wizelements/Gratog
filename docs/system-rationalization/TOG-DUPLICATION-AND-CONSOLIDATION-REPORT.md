# TOG-DUPLICATION-AND-CONSOLIDATION-REPORT.md

Taste of Gratitude — Duplication and Consolidation Report

Generated: 2026-07-29 19:27 EDT
Authority: Native Termux workspace

---

## 1. Duplicate Systems

### 1.1 Cart Systems
- `lib/cart-engine.ts` — primary cart engine
- `lib/cart-pricing.ts` — cart pricing
- `lib/unified-cart.js` — older unified cart
- `lib/actions/cart.ts` — server actions
- `lib/cartUtils.js` — legacy utilities

**Recommendation:** Consolidate on `lib/cart-engine.ts`; archive others after dependency analysis.

### 1.2 Email Systems
- `lib/email/service.js` — current email service
- `lib/resend-email.js` — Resend client wrapper
- `lib/email/templates.js` — templates
- `lib/email-templates.js` — legacy templates

**Recommendation:** Consolidate on `lib/email/service.js`; archive `lib/email-templates.js`.

### 1.3 Product Data Sources
- Square catalog (runtime, authoritative)
- `data/products.ts` — static product data
- `lib/demo-products.js` — demo/fallback products
- `lib/storefront-products.js` — storefront helpers

**Recommendation:** Keep Square as authority; use static files only for seed/fallback; remove stale demo data from production.

### 1.4 Weekly Menu / Menu Systems
- `data/weeklyMenu.ts` — static weekly menu
- `lib/menus/*` — new modular menu system (uncommitted)
- `lib/menu-schema.ts`, `lib/weekly-menu.ts` — untracked duplicates
- MongoDB `menus` collection — stale active document

**Recommendation:** Use `data/weeklyMenu.ts` + `lib/menus/*` as canonical; remove stale DB menu or make DB optional; delete `lib/menu-schema.ts` and `lib/weekly-menu.ts` if redundant.

### 1.5 Rewards / Gratitude Systems
- `lib/gratitude/*` — Gratitude rewards v2
- `lib/enhanced-rewards.js`
- `lib/rewards-audit-logger.js`
- `lib/rewards-fraud-detection.js`
- `lib/rewards-secure.js`
- `lib/rewards-security.js`

**Recommendation:** Consolidate to one rewards system or archive all rewards until the business is ready to operate a loyalty program.

### 1.6 Admin Auth Systems
- `lib/admin-session.ts`
- `lib/admin-auth.js`
- `lib/admin-auth-middleware.js`
- `lib/auth/unified-admin.ts`
- `lib/admin-token.ts`

**Recommendation:** Consolidate on `lib/admin-session.ts`; remove legacy `admin-auth.js` and `unified-admin.ts` after fixing any bcrypt/SHA-256 mismatch.

### 1.7 Search Systems
- `lib/search-enhanced.ts`
- `lib/search/enhanced-search.js`
- `/api/search/enhanced`

**Recommendation:** Consolidate on `lib/search-enhanced.ts`.

### 1.8 SEO Systems
- `lib/seo/*`
- `lib/seo.js`

**Recommendation:** Consolidate on `lib/seo/*`; archive `lib/seo.js`.

### 1.9 Market / Menu Modules
- `lib/markets.ts` vs `lib/markets/*`
- `lib/menus/schema.ts` vs `lib/menu-schema.ts` vs `lib/weekly-menu.ts`

**Recommendation:** Use directory-based modules; remove flat legacy files.

### 1.10 Payment Forms
- `components/checkout/SquarePaymentForm.tsx`
- `components/checkout/SquarePaymentFormV2.tsx`

**Recommendation:** Consolidate to one Square payment form; remove the older version after verifying idempotency behavior.

## 2. Duplicate Provider Integrations

| Concern | Providers | Action |
|---------|-----------|--------|
| Payments | Square, Stripe | Remove Stripe |
| Shipping rates | ShipEngine, EasyPost | Pick one or remove both |
| Analytics | PostHog, GA, Sentry | Consolidate to one primary |
| Cache | Redis, Upstash | Consolidate to one |
| Monitoring webhooks | Slack, PagerDuty, generic | Consolidate or remove |

## 3. Consolidation Roadmap

### Phase A — Safe consolidation (no data loss)
1. Remove legacy email template file.
2. Remove legacy SEO utility file.
3. Remove legacy search utility file.
4. Remove legacy flat market/menu files.
5. Remove deprecated `/api/checkout` and `/api/pay/process` 410 handlers if no callers.

### Phase B — Feature consolidation (requires verification)
1. Consolidate cart systems.
2. Consolidate rewards/gratitude systems.
3. Consolidate admin auth systems.
4. Consolidate payment forms.
5. Consolidate product data authority to Square.

### Phase C — Provider consolidation (requires owner decision)
1. Remove/archive Stripe.
2. Decide on shipping provider or remove shipping.
3. Decide on analytics provider.
4. Decide on cache backend.

---

*Next: TOG-SECURITY-AND-PRIVACY-SURFACE-REPORT.md*
