# Taste of Gratitude — Skeptical Customer and Senior Engineering Audit

**Audit date:** October 10–11, 2026 (America/New_York)  
**Site:** https://tasteofgratitude.shop  
**Baseline production commit:** `6ee44cfe8cb3679b245a99a90dbd7df67d63faf3`  
**Fix PR:** [#17](https://github.com/wizelements/Gratog/pull/17)  
**Scope:** Web browsing, first-time Georgia retail customers, market preorders, account entry, error/empty states, mobile responsiveness, catalog integrity, PWA routing, backend order and quote policies. Real charging, merchant Square Online configuration, email sending, order fulfillment and shipping labels were deliberately excluded.

## Executed evidence

- **Public HTTP crawl:** 61 live URLs, including 28 product details; all returned HTTP 200 before changes. This is availability-only, NOT proof of successful interaction.
- **Playwright:** 60 browser page checks (30 desktop/30 mobile), collecting HTTP status, destination after redirect, document title/H1, visible broken image counts, JS exceptions, horizontal overflow, and screenshots.
- **Puppeteer:** 16 separate browser checks (8 desktop/8 mobile) of homepage, catalog, checkout, market preorder, login, markets, FAQ and contact.
- **Focused Playwright shopper:** 390px mobile viewport, 34 catalog cards, added *Healing Harmony* ($36) and verified persisted cart and checkout summary ($36, one item), without creating an order or charging a card.
- **Skeptical customer restrictions:** Live New York delivery rejection returned HTTP 422 code `GEORGIA_ONLY` on baseline; earlier GA-vs-NY-ZIP and legacy Square 410 denial tests also verified.
- All product pages returning HTTP 200 is **not** a good outcome for archived and non-existent items; robots and availability must be honest. A missing product in the preview was still served with HTTP 200 because of Next.js streaming, but included an explicit `noindex` robots tag. This is a remaining soft-404 infrastructure limitation; status-code correctness is not certified.
- Some rapid navigations in the automation returned transient missing H1 or browser context navigation-abort; these require hydrated recheck and are **not automatically categorized as product defects**.

## Confirmed findings and remediation

| Severity | Confirmed issue | Remediation in PR #17 |
|---|---|---|
| **P0 checkout integrity** | User-submitted `isPreorder:true` could bypass stock unavailable checks in server pricing | Server catalog preorder permission controls stock validation, with adversarial unit tests |
| **P0 fulfillment integrity** | Merchant stock zero automatically became preorder even without explicit preorder policy | Explicit merchant preorder opt-in required across inventory snapshot, cart normalization and quick-add |
| **P1 search and UX** | Square archived items appeared in API and search-indexable sitemap/product pages | Filter archived catalog items; render Next.js not-found for missing products with noindex metadata (streamed Next routes may retain HTTP 200), noindex archived pages and block archived checkout |
| **P1 security/performance** | Product URL slug used directly as a Mongo regular expression | Replace with exact-ID / slug lookup |
| **P1 pricing consistency** | Legacy cart preview calculated its own 8% tax and accepted unbounded/noninteger quantity | Delegate to canonical server-authoritative pricing and validate quantities |
| **P1 automated quality** | Preview E2E called a nonexistent npm script; old tests passed after mere navigation | Installable Playwright desktop/mobile customer-journey test suite; repair CI script/config; gate on unit tests |
| **P1 mobile usability** | 390px `/explore` and `/explore/ingredients` header button extended 15px past right screen edge | Stack header controls, allow wrapping and adjust type contrast / mobile spacing |
| **P1 mobile usability** | `/info-board` QR header and decorative visuals extended 16px beyond mobile viewport | Responsive header stacking and word break; decorative elements already clipped inside cards |
| **P1 PWA truthfulness** | Service worker returned cached offline HTML with HTTP 200 on slow navigation, masquerading as successful page load | HTTP 503 + offline marker for offline HTML, 12s navigation timeout, browser test isolation |
| **P2 accessibility** | Checkout cart/details/review headings used H2 or H3 without a primary H1 | Add semantic H1 to all checkout states |
| **P2 mobile checkout** | Shipping form allocated one of six narrow columns for Georgia state entry, unusable on mobile | Responsive single-column mobile address, suitably proportioned tablet/desktop fields |

## Current commerce reality and outstanding independent blockers

- Baseline `/api/products`: **34** listed items, **22** marked `checkoutReady`, 17 positive-stock, 29 flagged preorder, 20 `preorderOnly`, 14 market-exclusive. Flags are not proof of live purchasability; backend policy and real stock also decide.
- Baseline Square `/api/catalog`: **70** returned entries; **46** missing image URLs, **20** missing descriptions and **1** priced at zero. Square merchant inventory, proper photography, descriptions, item-specific fulfillment eligibility and archived flags require real data review.
- Market pickup remains deliberately distinct from regular Georgia shipping and geographically available delivery. Georgia-only address checks do not validate that a carrier can ship every food/beverage item or that all Georgia ZIPs are served by a delivery route.
- **Not certified:** independent Square Online checkout/shipping zones; paid Square sandbox/production authorization, refund, receipts; carrier label and cold-chain/temperature-sensitive shipment; fulfillment inventory decrement under concurrency; real account signup/password reset with a real email inbox; authenticated administrator role/security testing; provider analytics and marketing opt-in delivery.
- Several source descriptions mention disease/inflammation/“detox” benefits. A claims/legal review is recommended prior to promoting these phrases. No invented clinical facts should appear in product copy.
- The retired `/reviews`, `/rewards`, `/subscriptions` paths intentionally redirect to the catalog; do not promise those features as active until independently certified.

## Runbooks

```sh
npm ci
npm run typecheck:ci
npx vitest run tests/georgia-only-orders.test.ts tests/catalog-indexability.test.ts tests/inventory-preorder-boundaries.test.ts tests/cart-price-preview.test.ts tests/unit/cart-pricing.spec.ts
npx playwright install chromium
BASE_URL=https://tasteofgratitude.shop npm run test:e2e:headless
```

The E2E suite must run on isolated preview or live environments in read-only mode; never purchase, mail customers, alter real inventory, or upload merchant credentials merely to pass automated tests. The report is not a claim of 100% certification.
