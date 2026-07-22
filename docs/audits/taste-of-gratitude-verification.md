# Taste of Gratitude — Verification Log

Generated: 2026-07-22

This file records the probes and checks performed during the audit. It will be updated as implementation proceeds.

---

## Live Production Probes

| Probe | Time (CDT) | Result | Evidence |
|---|---|---|---|
| `GET https://tasteofgratitude.shop/` | 2026-07-22 ~12:14 | HTTP 200, HTML payload | Rendered homepage with weekly menu, retention forms, bundle cards |
| `GET /api/health` | 2026-07-22 ~12:14 | `{"status":"degraded/healthy", "memory":{"percentage":96/93}}` | Server/DB OK; memory pressure flagged |
| `GET /api/catalog` | 2026-07-22 ~12:14 | 15+ items, all `name: "Unnamed Product"`, `price: 0` | Saved JSON in `/tmp` during probe |
| `GET /api/storefront/square-catalog` | 2026-07-22 ~12:14 | `{"success":false,"error":"Cannot mix BigInt and other types, use explicit conversions"}` | Confirms BigInt serialization crash |
| `GET /api/health/payments` | 2026-07-22 ~12:29 | Square production OK; has access token, location ID, application ID | Payment provider auth is configured |
| `GET /subscriptions/gratitude-box` | 2026-07-22 ~12:14 | Page renders | One-time payment-link page |
| `GET /weekly-menu` | 2026-07-22 ~12:14 | Page renders | Shows curated weekly products |
| `GET /robots.txt` | 2026-07-22 ~17:26 | Returns disallow list | Correctly blocks admin/api/checkout/cart/etc. |
| `GET /sitemap.xml` | 2026-07-22 ~17:26 | Returns ~50 URLs including Square-ID product URLs | Needs reconciliation |

## Post-Implementation Verification (2026-07-22)

| Check | Method | Result |
|---|---|---|
| BigInt serialization fix | Code review of `app/api/storefront/square-catalog/route.ts` | Added explicit `Number()` conversion for `priceMoney.amount` values |
| `.bak` file cleanup | `git status --short` | All 16 `.bak` files removed |
| Duplicate admin pages | `ls app/admin/analytics app/admin/login` | Removed `page.js` duplicates; kept `page.tsx` |
| Bundle savings text | Read `data/bundles.ts` | Removed placeholder/roadmap savings language |
| FAQ classes | Grep `app/faq/page.js` for `--emerald` | No malformed Tailwind classes remain |
| FAQ inactive features | Read `app/faq/page.js` | Rewards/workshops/challenges rewritten as waitlist |
| Product rename | Grep `Grateful Defense` / `Healing Harmony` | Only legacy comment remains; display names updated |
| Gratitude Box consistency | Read metadata + component | Renamed to "pilot / waitlist" throughout |
| Quiz SMS opt-in | Read `app/quiz/QuizClient.jsx` | Default unchecked |
| Homepage hero | Read `components/home/HomePageClient.jsx` | Single primary CTA "View this week's menu"; SMS card converted to email waitlist |
| Community proof | Read `components/home/HomePageClient.jsx` | Placeholder quotes removed; honest review-collection note |
| Retention prompts | Read `components/home/HomePageClient.jsx` | Simplified to single email waitlist |
| About page | Read `app/about/page.js` | Removed product-caused-recovery implication; softened sourcing claim |
| Health-benefit keywords | Grep `lib/health-benefits.js` | Removed "92 minerals", "mineral rich", "antioxidants", "vitamin c", "collagen", "elasticity" |
| JS syntax | `node --check` | `app/about/page.js`, `app/faq/page.js`, `lib/health-benefits.js`, `lib/demo-products.js` pass |
| Type check | `npx tsc --noEmit --skipLibCheck` | **Hung / could not complete in PRoot** — risk noted |
| Lint | `npx eslint` on changed files | **Hung / could not complete in PRoot** — risk noted |

---

## Not Yet Verified (Requires Implementation or Owner Input)

1. End-to-end checkout with real Square payment link creation.
2. Webhook delivery and order persistence after Square payment.
3. Customer confirmation email send path (`lib/preorder/square-notifications.ts`).
4. Admin notification email/SMS path.
5. Actual Twilio send with credentials.
6. Abandoned-cart cron behavior with real `CRON_SECRET`.
7. Winback cron behavior with real `WEEKLY_WARM_CRON_SECRET`.
8. Admin login and product/weekly-menu edit flow.
9. Mobile navigation and 404/error states across all breakpoints.
10. Accessibility scan (headings, landmarks, alt text, color contrast).
11. Structured-data validation with Google's Rich Results Test.
12. Broken-link crawl across internal and external links.

---

## Verification Checklist for Implementation Phase

- [x] Fix `/api/storefront/square-catalog` BigInt serialization.
- [ ] Fix `/api/catalog` to return real names/prices OR switch checkout to curated prices (owner decision required).
- [ ] Verify `/api/products` returns consistent, non-$0 prices.
- [x] Verify homepage hero simplified to single primary CTA (source review).
- [ ] Verify homepage → weekly menu → product → cart → checkout → Square payment link (requires deployed runtime test).
- [ ] Verify order persistence in `MarketOrder` / `orders` after webhook.
- [ ] Verify customer confirmation email (Resend).
- [ ] Verify admin notification email/SMS.
- [ ] Verify `/preorder` market selection and fulfillment instructions.
- [ ] Verify `/cart` totals match product detail prices.
- [ ] Run `next lint` (hung in PRoot; run in normal environment).
- [ ] Run `tsc --noEmit --skipLibCheck` (hung in PRoot; run in normal environment).
- [ ] Run `vitest` and Playwright core journeys.
- [ ] Run Lighthouse and Core Web Vitals on mobile and desktop.
- [ ] Validate sitemap and robots.txt.
- [ ] Re-test `/api/health` memory after changes.
- [ ] Capture before/after screenshots once a headless browser is available.
