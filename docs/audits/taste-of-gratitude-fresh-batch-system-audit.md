# Taste of Gratitude — Fresh Batch Request System Audit

**Branch:** `feat/fresh-batch-request-system`  
**Stacked on:** `feat/content-seo-cleanup` (`8c378621`)  
**Audit date:** 2026-07-24  
**Status:** Phase 0 — read-only audit complete. No customer-facing code changed.

---

## 1. Executive Summary

The Taste of Gratitude storefront already has most of the raw ingredients for a production-ready Fresh Batch Request System. The critical gaps are not in routing, payments, email, or admin authentication — they are in **demand-collection persistence**, a **configurable batch-decision engine**, and **owner-controlled batch planning**. The system can be built by extending existing primitives rather than replacing them.

Key reuse opportunities:

- **Lead capture** (`/api/lead`, `lead_intents` collection, `RetentionForm`) can carry a new `fresh_batch_request` intent.
- **Market data** (`data/markets.ts`, `lib/markets/repository.ts`, `/api/markets`) can supply pickup-location choices.
- **Product data** (`data/products.ts`) can supply claim-safe curated flavors and flavor profiles.
- **Square payment links** (`lib/square-api.ts` `createPaymentLink`) can create owner-confirmed reservation/deposit links.
- **Resend** (`lib/resend-email.js`, `lib/email/service.js`) can deliver all transactional request updates.
- **Admin dashboard** (`app/admin/page.js`, `adminFetch`, `requireAdminSession`) can host the request inbox and batch planner.
- **MongoDB + `db-optimized.ts`** can persist requests, batch campaigns, and reservations in new collections.
- **Preorder rules + repository** (`lib/preorder/rules.ts`, `lib/preorder/repository.ts`) provide a proven pattern for cutoff windows, waitlist counters, and atomic counters.

The most important design rule is that **a customer request must never be treated as a paid order**. Payment must remain behind an explicit owner approval and a server-generated Square payment link.

---

## 2. Current Reusable Architecture

### 2.1 Customer-facing surfaces

| Surface | File(s) | Reuse for fresh-batch system |
|---|---|---|
| Homepage hero | `app/page.js`, `components/home/HomePageClient.jsx` | Replace image-dependent hero with typography + request-led hero. Keep `JsonLd` schema helpers. |
| Markets page | `app/markets/page.tsx` | Reuse market cards, directions logic, retention form placement. Route CTA to `/request-a-flavor`. |
| Preorder page | `app/preorder/page.tsx`, `app/preorder/PreorderClientPage.tsx` | Reuse quantity steppers, market selector, and payment-link flow. Do not call `/api/preorder` for requests. |
| Product detail | `app/product/[slug]/ProductDetailClient.jsx` | Add "Request this flavor" CTA when limited/sold out. |
| Lead forms | `components/RetentionForm.jsx` | Extend props for flavor/profile/quantity/market fields; submit to new `/api/fresh-batch/requests`. |
| Weekly menu | `data/weeklyMenu.ts`, `app/weekly-menu/` | Keep as owner-confirmed availability. Add banner pointing to request flow. |

### 2.2 API routes

| Route | Purpose | Reuse |
|---|---|---|
| `app/api/lead/route.ts` | Generic intent capture (newsletter, weekly_menu_email, preorder_intent_no_market, email_signup) | Add `fresh_batch_request` to intent enum, but prefer a dedicated `/api/fresh-batch/requests` for request semantics, pricing, and validation. |
| `app/api/markets/route.ts` | Public active markets | Used as the source of truth for `preferredMarketId`. |
| `app/api/preorder/route.ts` | Paid market preorder with Square link | Do **not** reuse for requests; reuse its `createPaymentLink` integration pattern for reservation phase. |
| `app/api/checkout/route.ts` | Deprecated 410 route | Not used. |
| `app/api/payments/route.ts` | Web Payments SDK payments | Not used for fresh-batch; reservation links use `lib/square-api.ts`. |
| `app/api/storefront/square-catalog/route.ts` | Direct Square catalog fetch | Use only for verification, not for request pricing. Pricing must come from curated data or owner-configured batch prices. |
| `app/api/contact/route.ts` | Contact form with rate limiting | Reuse rate-limit helper shape for request form. |

### 2.3 Data layer

| Layer | Location | Notes |
|---|---|---|
| MongoDB connection | `lib/db-optimized.ts` (`connectToDatabase`) | Cached mongoose connection returning native `client`/`db`. Use for new collections. |
| Lead persistence | `lead_intents`, `newsletter_subscribers` | Upsert by email/phone. Marketing consent is separate from transactional updates. |
| Preorder persistence | `marketorders`, `market_counters` | Proven atomic counter pattern. Fresh batch can use `batch_counters` for campaign IDs. |
| Product source | `data/products.ts` (curated) + `square_catalog_items` / `unified_products` | Use curated data as authority for slugs, names, prices; Square IDs for payment links only after owner approval. |
| Market source | `data/markets.ts` + `markets` collection | Public markets from `data/markets.ts`; admin-managed markets from DB. |
| Email sends ledger | `email_sends` | Every customer email must be recorded here. |
| Owner alerts | `lib/owner-alerts.ts`, `lib/event-queue.ts` | Reuse to notify owner of new requests, thresholds reached, and batch approvals. |

### 2.4 Payments

| Component | Reuse |
|---|---|
| `lib/square.ts` (`getSquareClient`, getters) | Use for payment-link creation and order creation. |
| `lib/square-api.ts` (`createPaymentLink`) | Primary path for reservation/deposit links. Accepts `lineItems`, `referenceId`, `redirectUrl`, `metadata`, `idempotencyKey`. |
| `lib/square-price-serializer.ts` (`safeSquareCents`, `validateStorefrontItem`) | Use to validate Square-derived prices, but fresh-batch prices must be server-side and owner-approved. |
| `lib/pricing.ts` (`formatCurrency`) | Use for display formatting only. |

### 2.5 Email

| Component | Reuse |
|---|---|
| `lib/resend-email.js` (`sendEmail`) | Sends via Resend and records to `email_sends`. Supports `emailType`, `template`, `metadata`. Use `emailType: 'transactional'` for request updates. |
| `lib/email/service.js` (`queueEmail`) | Queue-based alternative if async processing is needed. |
| `lib/email/templates.js` | Base style wrapper exists. Add fresh-batch templates in a new `lib/batches/email-templates.ts` module. |
| `lib/email-config.js` (`getFromAddress`, `EMAIL_SENDERS`) | Use `hello@tasteofgratitude.shop` for transactional batch mail. |

### 2.6 Admin

| Component | Reuse |
|---|---|
| `app/admin/page.js` | Add a "Fresh Batch Requests" card linking to `/admin/fresh-batches`. |
| `lib/auth/unified-admin.ts` (`requireAdminSession`) | Protect all new admin API routes and pages. |
| `lib/admin-fetch.ts` (`adminFetch`) | Client-side admin data fetching with CSRF. |
| `app/api/admin/products/route.ts`, `app/api/admin/markets/route.ts` | Pattern for admin CRUD routes: `withAdminMiddleware`/`requireAdminSession`, Zod validation, repository function, revalidation. |

---

## 3. Current Data Flows (Relevant)

### 3.1 Lead capture flow

```
RetentionForm (client)
  → POST /api/lead
    → Zod validation
    → connectToDatabase
    → upsert lead_intents
    → conditional upsert newsletter_subscribers
    → return { success, persisted, id }
```

This flow is fast and reliable, but it is intentionally generic. A fresh-batch request needs:
- Quantity and unit conversion.
- Flavor/profile validation against curated data.
- Preferred market association.
- A separate request collection with statuses.
- Owner notification.

### 3.2 Preorder paid flow

```
PreorderClientPage
  → POST /api/preorder
    → market + customer + cart validation
    → resolvePreorderCartItems (curated/Square catalog lookup)
    → atomic waitlist number
    → insert marketorders (status PENDING_PAYMENT)
    → createPaymentLink (Square)
    → update marketorders with paymentLinkId / paymentUrl
    → return { orderNumber, payment }
```

The fresh-batch reservation phase will mirror this, but with key differences:
- Reservation is created **after** owner approval, not on customer submit.
- Price is computed server-side from owner-confirmed batch configuration, not from a storefront cart.
- Deposit may be less than full amount.

### 3.3 Market public flow

```
app/markets/page.tsx
  → fetch /api/markets
    → getActiveMarkets (DB) + getActiveMarketPickups (data file)
    → normalizePublicMarket
    → render cards with RetentionForm
```

The fresh-batch form will use `/api/markets` (or import `getActiveMarketPickups`) for the market selector.

---

## 4. Duplicate Systems to Avoid

| Risk | Why | Mitigation |
|---|---|---|
| Second newsletter list | Fresh-batch requests should not create a new subscriber list. | Upsert `newsletter_subscribers` only when `marketingEmailConsent` is explicitly true. Keep `lead_intents` for request tracking. |
| Second preorder pipeline | Requests are not orders. Reusing `/api/preorder` would mix intent and paid order states. | Build `/api/fresh-batch/requests` and `/api/fresh-batch/reservations` as separate collections and routes. |
| Second Square checkout | The deprecated `/api/checkout` is 410. Do not revive it. | Use `lib/square-api.ts` `createPaymentLink` for reservation links. |
| Second product catalog | `square_catalog_items` / `unified_products` can be incomplete. | Curated `data/products.ts` remains the request-time authority for flavor names, slugs, and standard prices. |
| Second admin auth | Multiple admin auth patterns exist (`requireAdmin`, `requireAdminSession`, `withAdminMiddleware`). | Use `requireAdminSession` for new pages and API routes. It is the declared single source of truth. |
| Second inventory system | `inventory` collection is used for storefront availability. | Fresh-batch reserved volume is tracked in `batch_reservations`, not the live inventory collection, until production completes. |

---

## 5. Missing Capabilities

| Capability | Current state | Needed |
|---|---|---|
| Demand-collection request record | None | `fresh_batch_requests` collection + API + validation |
| Batch campaign record | None | `batch_campaigns` collection + planner API |
| Reservation record | Preorder `marketorders` is order-shaped | `batch_reservations` collection shaped around request→batch→payment link |
| Configurable batch decision engine | None | `lib/batches/batch-decision-engine.ts` with category rules and tests |
| Owner request inbox | Admin dashboard exists but no request view | `/admin/fresh-batches` page + `/api/admin/fresh-batch/requests` |
| Owner batch planner | None | `/admin/fresh-batches/planner` + `/api/admin/fresh-batch/batches` |
| Request email templates | Existing generic templates | Fresh-batch-specific templates (request received, threshold reached, batch confirmed, reservation link, etc.) |
| Public request form page | None | `/request-a-flavor` page + `/api/fresh-batch/requests` POST |
| Public batch board | None | Optional Phase 3. Not required for MVP. |
| Category-specific microbatch pricing | `data/products.ts` has 16 oz bottle prices only | Owner-configurable gallon/microbatch pricing + setup fee |
| Process-loss and sampling allocation | None | Configurable in batch planner; tested in decision engine |
| Customer-facing status mapping | Preorder status labels exist | Request/reservation status mapping (e.g., "Collecting requests" → internal `awaiting_threshold`) |

---

## 6. Operational Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Request mistaken for paid order | Critical | UI copy, confirmation email, and data model all clearly distinguish `fresh_batch_requests` from `batch_reservations` and `marketorders`. Payment only after owner approval. |
| One gallon triggers five-gallon production | Critical | Decision engine requires configurable threshold; below threshold routes to microbatch (with setup fee) or demand collection, never auto-standard. |
| Market samples consume reserved inventory | High | Batch planner tracks `reservedGallons`, `samplingOunces`, `actualYieldOunces`. Samples deducted only from unreserved market volume. |
| Unsupported health claims reintroduced | High | Flavor profiles are sensory only (Tropical, Berry-forward, Citrus, etc.). No immunity/detox/thyroid/weight/blood-sugar language. Product `wellnessSupport` arrays are flavor descriptors, not health claims. |
| Fake scarcity / fake counters | High | No public request counters, no countdown timers, no fabricated request counts. Batch board (Phase 3) shows only owner-confirmed statuses. |
| SMS consent auto-created | High | Phone is optional. `smsConsent` is a separate boolean, default false, not auto-set by entering a phone number. |
| Square price mismatch | Medium | Reservation prices are server-calculated from curated/owner data. Catalog IDs are verified before payment-link creation. `safeSquareCents` rejects $0/unnamed items. |
| Owner overload | Medium | Admin inbox groups by flavor/profile/market and shows gallon-equivalent totals. Owner approves/defer/rejects in bulk. |
| PRoot build hangs | Low (known) | Use targeted Vitest locally, Vercel preview for full builds. Do not block commits waiting overnight. |

---

## 7. Recommended Architecture

### 7.1 New collections

- `fresh_batch_requests` — customer demand.
- `batch_campaigns` — owner-approved production batches.
- `batch_reservations` — payment-backed reservations.
- `batch_counters` — atomic campaign/sequence numbers (mirrors `market_counters`).
- `batch_audit_log` — owner decisions and status transitions.

### 7.2 New routes

**Public**
- `app/request-a-flavor/page.tsx` — request form.
- `app/api/fresh-batch/requests/route.ts` — create/list own requests.
- `app/api/fresh-batch/public-batches/route.ts` — optional confirmed batch board (Phase 3).

**Admin**
- `app/admin/fresh-batches/page.tsx` — request inbox + batch list.
- `app/admin/fresh-batches/planner/page.tsx` — batch planner.
- `app/api/admin/fresh-batch/requests/route.ts` — CRUD + approve/defer/reject.
- `app/api/admin/fresh-batch/batches/route.ts` — create/update batch campaigns.
- `app/api/admin/fresh-batch/reservations/route.ts` — create reservation + Square link.

### 7.3 New library modules

- `lib/batches/batch-decision-engine.ts` — rule engine.
- `lib/batches/quantity-converter.ts` — bottle/gallon/ounce conversions with process loss.
- `lib/batches/pricing.ts` — category-specific standard price, microbatch setup fee, deposit.
- `lib/batches/repository.ts` — request/batch/reservation CRUD.
- `lib/batches/email-templates.ts` — transactional templates.
- `lib/batches/validation.ts` — Zod schemas.
- `lib/batches/types.ts` — TypeScript types.

### 7.4 Homepage redesign (Phase 1)

Replace the current hero (image + weekly menu badge) with a photo-free, request-led hero:

- Eyebrow: `Fresh batches guided by customer requests`
- Headline: `Tell us what you want to sip next.`
- Body: `Request a flavor, reserve a gallon, or meet us at the market to sample what is fresh. We confirm availability before you pay.`
- Primary CTA: `Request a flavor` → `/request-a-flavor`
- Secondary CTA: `Find a market` → `/markets`
- Expectation copy below CTAs.
- Keep existing `JsonLd` schemas; update metadata to reflect request-led experience.

### 7.5 Square integration boundary

- Fresh-batch form does **not** call Square.
- Only after owner approval does the server call `createPaymentLink` for the reservation/deposit.
- `lineItems` are built from curated product name + owner-confirmed price + quantity.
- `catalogObjectId` is included only when a valid Square variation ID exists; otherwise item is ad-hoc.
- Idempotency key: `freshbatch_reservation_{reservationId}`.
- Webhook reconciliation: existing Square webhooks update `email_sends` and order status; extend to update `batch_reservations.paymentStatus`.

---

## 8. Database Migration Needs

No destructive migration is required. New collections can be created lazily by the repository layer. Indexes to add:

```js
// fresh_batch_requests
db.fresh_batch_requests.createIndex({ email: 1, createdAt: -1 });
db.fresh_batch_requests.createIndex({ status: 1, createdAt: -1 });
db.fresh_batch_requests.createIndex({ requestedProductSlug: 1, status: 1 });
db.fresh_batch_requests.createIndex({ flavorProfile: 1, status: 1 });
db.fresh_batch_requests.createIndex({ preferredMarketId: 1, status: 1 });

// batch_campaigns
db.batch_campaigns.createIndex({ internalFlavorKey: 1, status: 1 });
db.batch_campaigns.createIndex({ productionDate: 1, status: 1 });
db.batch_campaigns.createIndex({ marketId: 1, status: 1 });

// batch_reservations
db.batch_reservations.createIndex({ requestId: 1 });
db.batch_reservations.createIndex({ batchId: 1 });
db.batch_reservations.createIndex({ customerEmail: 1, createdAt: -1 });
db.batch_reservations.createIndex({ squarePaymentLinkId: 1 }, { sparse: true });
```

A migration script can be provided as `scripts/migrate-fresh-batch-collections.js`, but it is optional for first deployment because the repository can create collections on first write.

---

## 9. Owner Decisions Required

The following inputs are needed before publishing microbatch fees or thresholds. Implementation can proceed with safe defaults and clearly marked assumptions.

1. Standard batch size per category (default: 5 gallons).
2. Minimum pooled demand to justify a standard batch (default: 3 gallons).
3. Standard gallon price for lemonades, juices, refreshers (if supported).
4. Microbatch setup fee per category.
5. Required deposit percentage or fixed amount.
6. Process-loss percentage (default: 8%).
7. Sampling allocation per batch (default: 16 oz).
8. Maximum weekly custom microbatches.
9. Market-safe core flavors (admin-controlled flag; candidates: Kissed by Gods, Calm Waters juice, Strawberry Bliss, Supplemint).
10. Approved pickup markets (already in `data/markets.ts`: Serenbe, Dunwoody).
11. Request cutoff window before production.
12. Shelf-life window.
13. Cancellation / refund / store-credit policy.
14. Whether phone remains optional (yes, keep optional).
15. Whether fully custom flavor requests are allowed (recommend: profile-based only for food safety).

---

## 10. Implementation Sequence

1. **Docs + economics** (this audit + `taste-of-gratitude-microbatch-economics.md`).
2. **Data model** — types, validation, repository, counters.
3. **Decision engine + tests** — `lib/batches/batch-decision-engine.ts`.
4. **Customer request form** — `/request-a-flavor` + `/api/fresh-batch/requests`.
5. **Owner inbox** — `/admin/fresh-batches` + admin API.
6. **Batch planner** — create/approve batches, group requests.
7. **Reservation + Square links** — `/api/admin/fresh-batch/reservations`.
8. **Email templates** — request received, threshold, confirmed, reservation, pickup, delayed, sold out.
9. **Homepage hero** — photo-free request-led hero.
10. **Tests + verification** — decision engine, request form, payment, UX regressions.
11. **Preview + final report**.

---

## 11. Verification Strategy

| Check | Tool / Command | When |
|---|---|---|
| Decision-engine unit tests | `npx vitest run lib/batches/__tests__/batch-decision-engine.test.ts` | After engine implementation |
| Request-form unit tests | `npx vitest run tests/fresh-batch/request-form.test.ts` | After form implementation |
| Square payment-link mocks | `npx vitest run tests/fresh-batch/payment-links.test.ts` | After reservation API |
| Type-check | `npx tsc --noEmit --skipLibCheck` | Before every push |
| Lint | `npm run lint` | Before every push |
| Full build | Vercel preview | After commits |
| Visual verification | Authenticated Vercel preview or honest blocker note | After build |

---

## 12. Audit Evidence

Files inspected for this audit:

- `app/page.js`
- `components/home/HomePageClient.jsx`
- `app/markets/page.tsx`
- `app/preorder/page.tsx`
- `app/preorder/PreorderClientPage.tsx`
- `app/admin/page.js`
- `app/api/lead/route.ts`
- `app/api/preorder/route.ts`
- `app/api/markets/route.ts`
- `app/api/markets/warm/route.ts`
- `app/api/admin/markets/route.ts`
- `app/api/admin/products/route.ts`
- `app/api/storefront/square-catalog/route.ts`
- `app/api/checkout/route.ts`
- `app/api/payments/route.ts`
- `app/api/contact/route.ts`
- `lib/db-optimized.ts`
- `lib/preorder/repository.ts`
- `lib/preorder/rules.ts`
- `lib/markets/repository.ts`
- `lib/markets/schema.ts`
- `lib/markets/types.ts`
- `lib/square.ts`
- `lib/square-api.ts`
- `lib/square-price-serializer.ts`
- `lib/storefront-products.js`
- `lib/pricing.ts`
- `lib/email/service.js`
- `lib/email/templates.js`
- `lib/resend-email.js`
- `lib/owner-alerts.ts`
- `lib/admin-fetch.ts`
- `lib/auth/unified-admin.ts`
- `lib/validation/customer.ts`
- `lib/analytics.ts`
- `components/RetentionForm.jsx`
- `components/QuickAddButton.jsx`
- `data/products.ts`
- `data/weeklyMenu.ts`
- `data/markets.ts`
- `docs/audits/taste-of-gratitude-verification.md`

---

## 13. Conclusion

The codebase is ready for the Fresh Batch Request System. The safest path is:

1. Keep PR #6 untouched.
2. Build on `feat/fresh-batch-request-system` using the new collections, decision engine, and admin pages described above.
3. Do not publish a microbatch fee until the economics worksheet is filled.
4. Never let a request become an order without owner approval.
5. Verify with targeted tests and Vercel preview, not overnight PRoot builds.
