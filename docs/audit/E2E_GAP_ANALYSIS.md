# E2E_GAP_ANALYSIS — Gratog Platform

> Code-verified at commit `f9d20e98`. 40 test files across `tests/` and `__tests__/`.

## 1. Test taxonomy

| Category | Files |
|---|---|
| Smoke / hydration | `tests/smoke.test.ts`, `tests/hydration-*.test.ts`, `tests/music-button-render.test.ts` |
| Navigation / URL consistency | `tests/navigation-coherence.test.ts`, `tests/url-consistency.test.ts` |
| Storefront / product | `tests/storefront-{integrity,query}.test.ts`, `tests/product-enhancements.test.ts`, `tests/sandbox-filtering.test.ts`, `tests/learning-center.test.ts` |
| SEO | `tests/seo-jsonld.test.ts` |
| Reviews | `tests/reviews-flow.test.ts` |
| Rewards | `tests/rewards.test.js`, `tests/db/rewards.db.test.ts` |
| Auth | `tests/auth-register-route.test.ts` |
| Unit (cart/inventory/shipping/totals/subscriptions/fulfillment/registration) | `tests/unit/*.spec.ts` |
| Square (env, SDK init, API endpoints, frontend, payment flow, edge cases) | `tests/square/*.spec.ts` (6 files) |
| API (payment-flow, square-payment-flow, square-comprehensive) | `tests/api/*.spec.ts` |
| Admin | `__tests__/admin/validation.test.ts`, `__tests__/admin/auth.test.ts` |
| Payment integration | `__tests__/payment.integration.test.ts` |
| E2E | `tests/e2e/comprehensive-test-suite.spec.js` (Playwright) |
| Misc | `tests/button-positioning.test.ts`, `tests/unhandled-rejections.test.ts` |

## 2. Covered today (✅)

- Square SDK init & env config.
- Square Payment flow (sandbox).
- Cart + totals + shipping unit math.
- Rewards math + DB shape.
- Registration unit (but `/api/auth/register` is missing on disk — see contradictions).
- Reviews UI flow.
- SEO JSON-LD presence.
- Music button does not crash hydration.
- Navigation coherence.
- Hydration safety.
- Admin auth + validation.
- Subscription unit logic.
- Fulfillment logic unit.

## 3. Notable gaps (❌)

| Area | Gap |
|---|---|
| **Real Square sandbox guest checkout** | No headless-browser test that uses Square test card to walk full flow from `/catalog` to `/order/success`. |
| **`orderAccessToken` flow** | Unit-tested in isolation; no end-to-end assertion that guest payment succeeds via that token. |
| **Resend webhook** | Signature unit-tested (restored); no test that asserts `email_sends` rows get updated correctly. |
| **Customer login flow** | Cannot be tested — backing route missing. |
| **Password reset (customer + admin)** | Cannot be tested — routes missing. |
| **Contact form** | No test — route missing. |
| **Newsletter subscribe** | No test — route missing. |
| **Quiz submit/recommendations** | No test — routes missing. |
| **Reviews submission** | Has flow test, but `/api/reviews` route is missing, so the test likely mocks or skips. Verify. |
| **`/api/recommendations`** | No test — route missing. |
| **Admin orders sync + status update** | No test — routes missing. |
| **Coupons (public)** | No test — routes missing. |
| **Wishlist** | No test — route missing. |
| **Subscriptions plans listing** | No test — route missing. |
| **Unsubscribe** | No test — route missing. |
| **Notifications (admin)** | No test — routes missing. |
| **Inventory race conditions** | Unit tests cover happy path; no concurrency/double-spend test on real Mongo. |
| **Coupon $inc rollback on payment failure** | Not tested. |
| **Price tamper resistance** | Not tested (and currently vulnerable, see SECURITY_AUDIT). |
| **Square webhook → admin orders sync** | Webhook signature tested; full reconciliation not. |
| **PWA offline cache** | No regression test. |
| **Service worker version bump** | No automated guard. |

## 4. False confidence areas

| Test | What it does | What it doesn't catch |
|---|---|---|
| `__tests__/payment.integration.test.ts` | Asserts payment route shape | Doesn't catch missing `orderAccessToken` for guest (caught manually). |
| `tests/auth-register-route.test.ts` | Tests handler import/shape | Doesn't catch that the route file is *missing* (cleanup commit). The test must be mocking the import. |
| `tests/rewards.test.js` | Math unit | Doesn't catch that `/api/rewards/add-points` was deleted by `04768656` (caught only after order failure). |
| `tests/storefront-*` | Catalog responses | Doesn't catch 64 missing referenced routes. |

> **Recommended check:** add a CI guard that scans `_api-refs.txt` vs `_routes-existing.txt` and fails if any new reference resolves to nothing.

## 5. Coverage by surface

| Surface | Tested? |
|---|---|
| Square payment | ✅ Strong |
| Order creation | ⚠️ Partial |
| Order success rendering | ⚠️ Indirect |
| Customer auth | ❌ No (routes missing) |
| Admin auth | ✅ Unit |
| Email send | ❌ No live test |
| Email webhook | ✅ Signature |
| Inventory | ✅ Unit |
| Cart math | ✅ Unit |
| Reviews | ⚠️ UI test only |
| Quiz | ❌ |
| Newsletter | ❌ |
| Wishlist | ❌ |
| Notifications | ❌ |
| Search | ❌ no test for `/api/search/enhanced` |
| Subscriptions | ⚠️ unit only |
| Coupons | ❌ |

## 6. Recommended additions (audit-only, do not implement)

1. **Route-presence guard** in CI: `node scripts/check-route-coverage.js` that fails on referenced-but-missing routes.
2. **Playwright sandbox checkout** test driving `/catalog → /order/success` with Square test card.
3. **Email webhook → email_sends invariant** test.
4. **Price tamper test** — submit altered `total` to `/api/orders/create`, assert server rebuilds and rejects.
5. **Concurrency test** for inventory `consumeInventoryForPaidOrder`.
