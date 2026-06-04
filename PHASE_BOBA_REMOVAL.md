# Phase: Remove All Boba References

> **Status:** 🔴 Not Started  
> **Priority:** High  
> **Scope:** 39 files · 244 references  
> **Risk:** Medium-High — touches cart engine, payment validation, preorder rules, navigation, and e2e tests  

---

## Why

Boba is being discontinued from the Taste of Gratitude product line. All code paths, UI elements, business logic, navigation links, and documentation referencing boba must be cleanly removed without breaking the remaining sea moss gel, lemonade, and wellness shot flows.

---

## Step-by-Step Execution Plan

### Step 1: Business Logic & Cart Engine (CRITICAL — do first)
> Remove boba-specific constants, detection functions, and preorder rules.  
> **Risk:** Breaking preorder validation for remaining products.

| File | What to Remove/Change |
|------|----------------------|
| `lib/cart-engine.ts` | Remove `BOBA_PREORDER_MAX_QTY` constant, `isBoba()` detection function, boba-specific quantity limits |
| `lib/preorder/rules.ts` | Remove `BOBA_MAX_QTY` rule, `NON_BOBA_MINIMUM_CENTS` naming (rename to just `PREORDER_MINIMUM_CENTS`), boba category checks |
| `adapters/cartAdapter.ts` | Remove `BOBA_PREORDER_MAX_QTY` re-export |
| `lib/product-enhancements.js` | Remove `marketExclusive` flag logic that targets boba products |
| `lib/storefront-query.js` | Remove boba category filtering/enrichment |
| `lib/ingredient-taxonomy.js` | Remove boba ingredient entries (taro, tapioca pearls, etc. if boba-only) |
| `lib/subscription-practical.ts` | Remove any boba subscription references |

**Validation:** `npm run typecheck` passes, cart works for sea moss products.

---

### Step 2: API Routes (CRITICAL — depends on Step 1)
> Remove boba-specific API logic now that the engine no longer references it.

| File | What to Remove/Change |
|------|----------------------|
| `app/api/cart/route.ts` | Remove boba quantity validation, boba detection in cart items |
| `app/api/payments/route.ts` | Remove boba-specific payment rules |
| `app/api/preorder/route.ts` | Remove boba preorder limits, simplify to flat `$60 minimum` |
| `app/api/market/today/route.ts` | Remove boba availability flags for Serenbe |
| `app/api/storefront/catalog/route.ts` | Remove boba category injection, `marketExclusive` enrichment |
| `app/api/storefront/square-catalog/route.ts` | Remove boba category mapping from Square catalog |

**Validation:** `curl` test catalog API — no boba category returned, no `marketExclusive` flags.

---

### Step 3: UI Components (VISUAL — do after APIs are clean)
> Remove all boba UI elements: nav links, teaser sections, checkout validation displays.

| File | What to Remove/Change |
|------|----------------------|
| `components/home/HomePageClient.jsx` | Remove "Boba Market Exclusive Teaser" section, remove "🧋 Boba at the Market" rotating headline, remove boba flavor mentions (Taro, Strawberry Matcha, Brown Sugar) |
| `components/Header.jsx` | Remove `🧋 Boba` nav link (`/catalog?category=boba`) |
| `components/Footer.tsx` | Remove `🧋 Boba Menu` footer link |
| `components/MegaMenu.jsx` | Remove "🧋 Boba — Serenbe Only" and "🧋 Fresh Boba — Saturdays" menu entries |
| `components/checkout/CartSummary.tsx` | Remove `isBoba()` function, boba item filtering, boba quantity tracker UI, `BOBA_PREORDER_MAX_QTY` import |
| `components/checkout/ReviewAndPay.tsx` | Remove `.includes('BOBA')` validation code checks |
| `components/psychology/SoldOutBadge.jsx` | Remove boba mention from preorder rules text |
| `components/EnhancedMarketCard.jsx` | Remove `'Boba'` from specialties array |

**Validation:** Visual check — no 🧋 icons, no boba text on homepage, nav, footer, checkout.

---

### Step 4: Pages (depends on Step 3)
> Clean boba references from page-level content and configs.

| File | What to Remove/Change |
|------|----------------------|
| `app/about/page.js` | Remove "handcrafted boba at Serenbe Markets" mention |
| `app/markets/page.tsx` | Remove "Boba Tea" from Serenbe featured items, remove boba preorder rules |
| `app/preorder/page.tsx` | Remove boba preorder messaging and limits |
| `app/order/start/page.tsx` | Remove any boba-specific order start logic |
| `app/order/[id]/queue/page.js` | Remove "Your boba is being prepared!" message |
| `app/admin/market-setup/page.tsx` | Remove boba admin configuration options |
| `lib/markets.ts` | Remove boba from market specialty/featured lists |

**Validation:** Navigate all pages — no boba text anywhere.

---

### Step 5: Tests (do after all code changes)
> Delete or rewrite boba-specific tests.

| File | Action |
|------|--------|
| `e2e/serenbe-boba-market.spec.ts` | **DELETE entirely** — all tests are boba-specific |
| `test-with-real-data.sh` | Remove "Brown Sugar Boba" test item, remove boba queue message |

**Validation:** `npx playwright test` and remaining e2e suite passes.

---

### Step 6: Documentation (cleanup — lowest risk)
> Remove boba mentions from all docs/audit reports.

| File | Action |
|------|--------|
| `PREORDER_SETUP.md` | Remove boba preorder limits text |
| `AUDIT_REPORT.md` | Remove `serenbe-boba-market.spec.ts` reference |
| `DEEP_DIVE_ANALYSIS.md` | Remove boba from product portfolio and seasonal specialties |
| `QUICK_TEST.md` | Remove boba test scenarios |
| `VERIFIED_SITE_AUDIT_REPORT.md` | Remove "Handcrafted Boba" audit entries |
| `docs/audits/TOG_FINANCIAL_FLOW_AUDIT.md` | Remove `NON_BOBA_MINIMUM_CENTS`, `BOBA_MAX_QTY` references |
| `docs/audits/TOG_CUSTOMER_PSYCHOLOGY_ANALYSIS.md` | Remove boba restriction UX analysis |
| `docs/audits/TOG_FULL_PRODUCTION_ALIGNMENT_AUDIT.md` | Remove boba alignment entries |
| `docs/audits/TOG_MARKET_OPERATIONS_ANALYSIS.md` | Remove boba operations references |

---

## Post-Removal Checklist

- [ ] `npm run typecheck` — zero errors
- [ ] `npm run build` — builds clean
- [ ] `npm run lint` — no warnings from removed imports
- [ ] Search `rg -ri 'boba' --glob '!node_modules'` returns **0 results**
- [ ] Catalog API returns no boba category
- [ ] Homepage has no boba teaser
- [ ] Navigation has no boba links
- [ ] Checkout flow works for sea moss preorders (no broken validation)
- [ ] Preorder minimum is flat $60 (no boba split logic)
- [ ] All remaining e2e tests pass

---

## What NOT to Touch

- Square catalog products themselves (remove from Square dashboard separately)
- MongoDB product data (archive boba products via admin, not code deletion)
- Serenbe Farmers Market config (keep the market, just remove boba as a featured item)
