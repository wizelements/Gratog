# Taste of Gratitude — Master Issue Registry

**Remediation:** OPEE Master System Remediation  
**Branch:** `fix/tog-master-system-remediation` from `feat/fresh-batch-request-system` (`060490c2`)  
**Date:** 2026-07-24  
**Status:** Stage 1 in progress — P0-001 fixed

---

## How to read this registry

- **Severity:** P0 (critical), P1 (high), P2 (medium), P3 (optimization).
- **Environment:** `prod` = production at `tasteofgratitude.shop`; `preview` = Vercel preview for PR #7; `local` = PRoot workspace; `all` = affects all.
- **Owner decision required:** `YES` means the fix needs owner input before it can be finalized.
- **Implementation status:** `open`, `in-progress`, `fixed`, `wontfix`, `blocked`.
- **Verification status:** `unverified`, `unit-tested`, `preview-verified`, `prod-verified`.

---

## P0 — Critical Issues

### P0-001 — Fresh Batch form promises SMS updates that cannot be delivered

| Field | Value |
|---|---|
| **Title** | Fresh Batch form promises SMS updates that cannot be delivered |
| **Severity** | P0 |
| **Area** | Customer communication / no-SMS compliance |
| **Route / file** | `/request-a-flavor`, `app/request-a-flavor/RequestFlavorClient.tsx`, `lib/batches/validation.ts`, `app/api/fresh-batch/requests/route.ts` |
| **Environment** | all |
| **Reproduction steps** | 1. Visit `/request-a-flavor`. 2. Check the "Send me text updates about this request" checkbox. 3. Submit. 4. No SMS infrastructure exists to fulfill the promise. |
| **Expected behavior** | No SMS promise is shown to customers; phone is optional and only used for contact if needed. |
| **Actual behavior** | Form collects `smsConsent`, stores it in `fresh_batch_requests.smsConsent`, and labels it "Send me text updates about this request. Standard rates may apply." Twilio/SMS infrastructure was removed in the no-SMS remediation. |
| **Evidence** | `RequestFlavorClient.tsx:422-423`; `validation.ts:91,111-117`; `app/api/fresh-batch/requests/route.ts:81`. No `lib/sms.ts` or Twilio send path exists for fresh-batch updates. |
| **Customer impact** | Customers consent to text updates they will never receive; broken promise; potential TCPA/telemarketing compliance risk if phone numbers are stored with consent language. |
| **Business impact** | Legal/compliance exposure; operational inconsistency with email-first strategy. |
| **Security impact** | Low direct security impact, but consent records are misleading. |
| **Data-integrity impact** | Database contains `smsConsent=true` records tied to phone numbers with no fulfillment path. |
| **Root cause** | Fresh-batch form reused a phone/consent pattern without reconciling it with the no-SMS remediation that removed Twilio. |
| **Recommended fix** | Remove SMS consent UI, client field, schema field, and server persistence from fresh-batch flow. Keep phone optional as a contact method only. Update confirmation copy to email-only. |
| **Owner decision required** | NO |
| **Implementation status** | fixed |
| **Verification status** | unverified |
| **Commit reference** | TBD |

---

### P0-002 — Admin setup routes require an existing admin session, blocking first-time bootstrap

| Field | Value |
|---|---|
| **Title** | Admin setup routes require an existing admin session, blocking first-time bootstrap |
| **Severity** | P0 |
| **Area** | Admin authentication / operations |
| **Route / file** | `/api/admin/setup/route.ts`, `/api/admin/emergency-init/route.ts`, `/admin/setup/page.js` |
| **Environment** | all |
| **Reproduction steps** | 1. Start with empty `admin_users` collection. 2. Visit `/admin/setup`. 3. Submit setup secret. 4. `POST /api/admin/setup` calls `requireAdminSession(request)` and returns 401. |
| **Expected behavior** | First-time admin creation is possible with a strong setup secret, rate limiting, and audit logging; route is disabled in production after first admin exists. |
| **Actual behavior** | Both `/api/admin/setup` and `/api/admin/emergency-init` call `requireAdminSession(request)` at the top, making them unusable for bootstrap. |
| **Evidence** | `app/api/admin/setup/route.ts:71`; `app/api/admin/emergency-init/route.ts:20`. Both routes import `requireAdminSession` and return 401 if no session. |
| **Customer impact** | None direct. |
| **Business impact** | Owner cannot create the first admin account through the app; requires manual database insertion or a code change. |
| **Security impact** | The routes are accidentally safe from anonymous abuse but broken for legitimate use. A future "fix" could over-correct and expose them. |
| **Data-integrity impact** | None. |
| **Root cause** | Hardening refactor applied `requireAdminSession` to setup routes without preserving the public first-run exception. |
| **Recommended fix** | Remove `requireAdminSession` from setup/emergency-init `POST` handlers. Keep setup secret, rate limiting, disabled-after-use or env-disabled logic, and audit logging. Add `ADMIN_SETUP_DISABLED=true` and `EMERGENCY_INIT_DISABLED=true` defaults for production. |
| **Owner decision required** | NO |
| **Implementation status** | open |
| **Verification status** | unverified |
| **Commit reference** | TBD |

---

### P0-003 — Homepage and catalog may display fallback/curated products with stale prices and unverified availability

| Field | Value |
|---|---|
| **Title** | Homepage and catalog may display fallback/curated products with stale prices and unverified availability |
| **Severity** | P0 |
| **Area** | Commerce / product authority |
| **Route / file** | `app/page.js`, `lib/storefront-products.js`, `data/products.ts`, `data/weeklyMenu.ts`, `components/catalog/CatalogPageClient.jsx` |
| **Environment** | prod, preview |
| **Reproduction steps** | 1. Load homepage in production. 2. `getHomepageCatalogData` calls `getStorefrontCatalogSnapshot({})`. 3. If unified/Square products are missing, `buildCuratedCatalogSnapshot` returns curated products with `isFallback: true`. 4. Homepage does not check `isFallback` and renders products. |
| **Expected behavior** | Curated fallback should only be used as a last resort, with clear owner review; homepage should not render fallback products as confirmed available inventory; $0/inactive products must be excluded. |
| **Actual behavior** | Homepage filter only excludes `sold_out`; it does not exclude `inactive`, `$0`, or `isFallback` products. Catalog page similarly renders curated fallback. |
| **Evidence** | `app/page.js:28-40` filters only on `available`, `purchaseStatus`, `availability`, `squareEcomAvailable`; `lib/storefront-products.js:108-115` builds curated fallback; `data/products.ts` contains `price: 0` archived products. |
| **Customer impact** | Customers may see products that are not actually available or have wrong prices; could attempt to order items that cannot be fulfilled. |
| **Business impact** | Over-promising availability; potential refunds/anger; conversion loss if prices are wrong. |
| **Security impact** | Low. |
| **Data-integrity impact** | Curated file becomes source of truth for public display instead of verified inventory/Square. |
| **Root cause** | Storefront snapshot has fallback logic; consumers do not respect fallback flag or filter inactive/zero-price items. |
| **Recommended fix** | 1. In homepage/catalog consumers, reject `isFallback` products or render them with an explicit "not confirmed" state. 2. Exclude `inactive` category, `price <= 0`, and `inventoryStatus === 'inactive'`. 3. Add a build-time warning/alert when fallback is active. |
| **Owner decision required** | YES — owner must confirm whether curated file or Square catalog is the operational authority, and which products are actually available this week. |
| **Implementation status** | open |
| **Verification status** | unverified |
| **Commit reference** | TBD |

---

### P0-004 — Batch planner UI remains a placeholder; owner cannot complete request-to-pickup workflow

| Field | Value |
|---|---|
| **Title** | Batch planner UI remains a placeholder; owner cannot complete request-to-pickup workflow |
| **Severity** | P0 |
| **Area** | Admin workflow / fresh batch |
| **Route / file** | `/admin/fresh-batches/planner/page.tsx`, `/admin/fresh-batches/page.tsx`, `app/admin/layout.js` |
| **Environment** | preview, local |
| **Reproduction steps** | 1. Log in to admin. 2. Visit `/admin/fresh-batches`. 3. Click "Planner" or visit `/admin/fresh-batches/planner`. 4. See construction/placeholder message. 5. Try to create a batch, assign requests, or create a reservation from UI. |
| **Expected behavior** | Owner can group requests, propose a batch, set volume/price/market, approve, and create reservations with Square links. |
| **Actual behavior** | Planner page is a placeholder. Request inbox is a minimal list with bulk status updates but no grouping, volume math, or reservation UI. Fresh-batch pages are not linked from admin sidebar. |
| **Evidence** | `docs/audits/taste-of-gratitude-admin-verification.md` verdict: "Batch planner UI — Placeholder"; `taste-of-gratitude-admin-control-plane-audit.md`: "/admin/fresh-batches/planner — Placeholder"; direct read of `app/admin/fresh-batches/planner/page.tsx` shows construction notice. |
| **Customer impact** | Customer requests are persisted but may sit unactioned because the operational workflow is incomplete. |
| **Business impact** | Fresh Batch Request System cannot be operated by the owner without engineering support. |
| **Security impact** | None. |
| **Data-integrity impact** | Request status transitions can be performed, but batch/reservation creation requires direct API use. |
| **Root cause** | Backend APIs were implemented before the UI. |
| **Recommended fix** | Build batch planner UI on top of existing APIs; add sidebar nav link; add request detail drawer with create-reservation action; add volume math and capacity guard display. |
| **Owner decision required** | YES — owner must confirm batch planning fields (setup fee, deposit percent, process loss, shelf life, target margins). |
| **Implementation status** | open |
| **Verification status** | unverified |
| **Commit reference** | TBD |

---

### P0-005 — `wellnessSupport` and `healthBenefits` fields still expose health-oriented labels publicly

| Field | Value |
|---|---|
| **Title** | `wellnessSupport` and `healthBenefits` fields still expose health-oriented labels publicly |
| **Severity** | P0 |
| **Area** | Content / claims compliance |
| **Route / file** | `data/products.ts`, `lib/health-benefits.js`, `app/product/[slug]/page.jsx`, `components/catalog/CatalogPageClient.jsx` |
| **Environment** | prod, preview |
| **Reproduction steps** | 1. Visit any product page or catalog. 2. Inspect rendered product cards/detail. 3. Observe "Wellness Shots" category, "wellnessSupport" tags, or health-benefit labels. |
| **Expected behavior** | No public claim implies treatment, cure, or physiological outcome. Category names like "Wellness Shots" are acceptable if clearly flavor/format; fields named `healthBenefits` should not be rendered. |
| **Actual behavior** | `data/products.ts` includes `wellnessSupport` arrays and `category: 'shots'` with admin label "Wellness Shots". `lib/health-benefits.js` enriches products with `healthBenefits`, `healthBenefitLabels`, and `primaryHealthBenefit`. Catalog page copy says "small-batch wellness". |
| **Evidence** | `data/products.ts:26`; `app/api/admin/products/route.ts:53` category enum includes `'Wellness Shots'`; `lib/health-benefits.js:317-319`; `components/catalog/CatalogPageClient.jsx:443` "small-batch wellness"; product-detail page passes `wellnessSupport`. |
| **Customer impact** | Customers may interpret labels as health claims; FDA/FTC risk for food/beverage business. |
| **Business impact** | Compliance exposure; prior content cleanup explicitly targeted unsupported claims. |
| **Security impact** | None. |
| **Data-integrity impact** | Data fields contain health-oriented names even when values are claim-safe. |
| **Root cause** | Content cleanup addressed the worst public copy but did not rename internal data fields or restructure the health-benefits enrichment module. |
| **Recommended fix** | 1. Stop rendering `healthBenefits`/`healthBenefitLabels` in public components. 2. Rename internal fields to `flavorProfileTags`/`preferenceDimensions` if still needed. 3. Remove "small-batch wellness" copy from catalog. 4. Review product descriptions for any remaining functional language. |
| **Owner decision required** | YES — owner must approve final category names and copy. |
| **Implementation status** | open |
| **Verification status** | unverified |
| **Commit reference** | TBD |

---

## P1 — High Issues

### P1-001 — Weekly menu date range is computed at module load and cached in serverless environment

| Field | Value |
|---|---|
| **Title** | Weekly menu date range is computed at module load and cached in serverless environment |
| **Severity** | P1 |
| **Area** | Content / availability accuracy |
| **Route / file** | `data/weeklyMenu.ts` |
| **Environment** | prod, preview |
| **Reproduction** | Load `/weekly-menu` after the week changes; date range may still show the previous week until a new deployment. |
| **Expected** | Weekly menu date range should be computed per request or at least invalidated on schedule boundaries. |
| **Actual** | `weekStart`/`weekEnd` are computed at top-level module evaluation and stored in `WEEKLY_MENU`. In a long-lived serverless container, this will not update when the week changes. |
| **Evidence** | `data/weeklyMenu.ts:13-22` computes range at module load. |
| **Customer impact** | Customers see stale "This Week" dates; confusion about ordering windows. |
| **Business impact** | Operational confusion; incorrect urgency. |
| **Recommended fix** | Convert `WEEKLY_MENU` to a factory function or compute date range inside page/API route. |
| **Owner decision required** | NO |
| **Implementation status** | open |
| **Verification status** | unverified |
| **Commit reference** | TBD |

---

### P1-002 — `app/api/admin/emergency-init/route.ts` uses `requireAdminSession` and may still be reachable

| Field | Value |
|---|---|
| **Title** | Emergency admin init route requires existing admin session and may remain active |
| **Severity** | P1 |
| **Area** | Security / admin |
| **Route / file** | `/api/admin/emergency-init` |
| **Environment** | all |
| **Reproduction** | Anonymous POST to `/api/admin/emergency-init` returns 401 because of `requireAdminSession`; with an admin session and correct `EMERGENCY_ADMIN_SECRET`, it creates another admin. |
| **Expected** | Either remove the route entirely or make it a one-time bootstrap tool with strong controls. |
| **Actual** | Route exists and can create admins once authenticated; the `requireAdminSession` requirement is accidental, not designed. |
| **Evidence** | `app/api/admin/emergency-init/route.ts`. |
| **Customer impact** | None if route is protected; operational risk if protection is removed incorrectly. |
| **Business impact** | Privilege-escalation risk if session is compromised. |
| **Security impact** | Medium-high: any admin can create another admin if they know the emergency secret. |
| **Recommended fix** | Remove `/api/admin/emergency-init` if `/api/admin/setup` is fixed; otherwise restrict it to `super_admin` and require explicit owner approval. |
| **Owner decision required** | NO |
| **Implementation status** | open |
| **Verification status** | unverified |
| **Commit reference** | TBD |

---

### P1-003 — Square webhook handler exists but reconciliation logic for reservations is unverified

| Field | Value |
|---|---|
| **Title** | Square webhook reconciliation for reservations is implemented but not end-to-end verified |
| **Severity** | P1 |
| **Area** | Payments / data integrity |
| **Route / file** | `/api/webhooks/square/payment/route.ts`, `lib/batches/state-machine.ts`, `lib/batches/audit-log.ts` |
| **Environment** | prod, preview |
| **Reproduction** | Cannot reproduce without a real Square payment event. |
| **Expected** | Square webhook updates `batch_reservations.paymentStatus` from `pending` → `deposit_paid`/`fully_paid`, deduplicates by `event_id`, logs to audit, and triggers pickup-ready email. |
| **Actual** | Code exists in commit `060490c2` but no end-to-end test evidence is documented. |
| **Evidence** | `docs/audits/taste-of-gratitude-admin-verification.md` lists "Square webhook reconciliation — Not implemented" as P0, but `060490c2` suggests it was added. Need to verify file contents. |
| **Customer impact** | If webhook fails silently, customer pays but reservation stays "pending"; owner does not see payment; pickup email never sends. |
| **Business impact** | Revenue recognition errors; operational chaos. |
| **Recommended fix** | Read and verify the webhook implementation; add a manual "Sync Square" button in admin; add webhook simulation test. |
| **Owner decision required** | NO |
| **Implementation status** | open |
| **Verification status** | unverified |
| **Commit reference** | TBD |

---

### P1-004 — Homepage metadata and hero imply "reserve a gallon" before owner approval

| Field | Value |
|---|---|
| **Title** | Homepage metadata and hero imply "reserve a gallon" before owner approval |
| **Severity** | P1 |
| **Area** | Content / conversion |
| **Route / file** | `app/page.js`, `components/home/HomePageClient.jsx` |
| **Environment** | prod, preview |
| **Reproduction** | View homepage title and hero copy. |
| **Expected** | Copy reflects the actual flow: request → owner confirmation → payment → reservation. |
| **Actual** | Title says "Reserve a Gallon"; hero says "Request a flavor, reserve a gallon, or meet us at the market". |
| **Evidence** | `app/page.js:8`. |
| **Customer impact** | Customers may expect immediate reservation rather than owner-confirmed batch. |
| **Business impact** | Expectation mismatch; support burden. |
| **Recommended fix** | Update title/description to "Request a flavor for a shared batch" and clarify that payment happens only after owner confirms. |
| **Owner decision required** | NO |
| **Implementation status** | open |
| **Verification status** | unverified |
| **Commit reference** | TBD |

---

### P1-005 — Admin fresh-batch pages are not linked from admin sidebar navigation

| Field | Value |
|---|---|
| **Title** | Admin fresh-batch pages are not linked from admin sidebar navigation |
| **Severity** | P1 |
| **Area** | Admin UX |
| **Route / file** | `/admin/fresh-batches`, `/admin/fresh-batches/planner`, `app/admin/layout.js` |
| **Environment** | preview, local |
| **Reproduction** | Log in to admin; look for "Fresh Batches" in sidebar. |
| **Expected** | Fresh Batches appears in admin navigation. |
| **Actual** | Pages are reachable by direct URL only. |
| **Evidence** | `taste-of-gratitude-admin-control-plane-audit.md` notes "Fresh Batch pages are unlinked". |
| **Customer impact** | Owner may not know the feature exists. |
| **Business impact** | Feature adoption blocked. |
| **Recommended fix** | Add Fresh Batches nav item to `app/admin/layout.js`. |
| **Owner decision required** | NO |
| **Implementation status** | open |
| **Verification status** | unverified |
| **Commit reference** | TBD |

---

## P2 — Medium Issues

### P2-001 — Abandoned-cart recovery email subject uses "wellness order" language

| Field | Value |
|---|---|
| **Title** | Abandoned-cart recovery email subject uses "wellness order" language |
| **Severity** | P2 |
| **Area** | Email copy / claims |
| **Route / file** | `/api/cron/cleanup-abandoned-orders/route.ts` |
| **Environment** | prod, preview |
| **Reproduction** | Trigger abandoned-cart recovery email. |
| **Expected** | Subject and body describe the cart/order, not "wellness". |
| **Actual** | Subject is "Your wellness order is still waiting." |
| **Evidence** | `app/api/cron/cleanup-abandoned-orders/route.ts:112`. |
| **Customer impact** | Minor; consistent with broader wellness terminology. |
| **Business impact** | Low compliance friction. |
| **Recommended fix** | Change to "Your Taste of Gratitude order is still waiting." |
| **Owner decision required** | NO |
| **Implementation status** | open |
| **Verification status** | unverified |
| **Commit reference** | TBD |

---

### P2-002 — Markets page uses a fallback product ID `fallback-grateful-defense`

| Field | Value |
|---|---|
| **Title** | Markets page uses a fallback product ID `fallback-grateful-defense` |
| **Severity** | P2 |
| **Area** | Content / data integrity |
| **Route / file** | `app/markets/page.tsx:404` |
| **Environment** | prod, preview |
| **Reproduction** | Read `app/markets/page.tsx` around line 404. |
| **Expected** | No hardcoded fallback products; use real product data or omit if unavailable. |
| **Actual** | A fallback product with ID `fallback-grateful-defense` is referenced. |
| **Evidence** | `app/markets/page.tsx:404`. |
| **Customer impact** | Could render stale/placeholder product info on markets page. |
| **Business impact** | Inconsistent market info. |
| **Recommended fix** | Remove fallback or replace with dynamic lookup with empty-state handling. |
| **Owner decision required** | NO |
| **Implementation status** | open |
| **Verification status** | unverified |
| **Commit reference** | TBD |

---

### P2-003 — `staff-notifications.js` still contains a legacy Twilio path that can send real SMS if env vars are present

| Field | Value |
|---|---|
| **Title** | `staff-notifications.js` still contains a legacy Twilio path that can send real SMS if env vars are present |
| **Severity** | P2 |
| **Area** | Notifications / no-SMS compliance |
| **Route / file** | `lib/staff-notifications.js:579-591` |
| **Environment** | prod |
| **Reproduction** | Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`; trigger staff notification. |
| **Expected** | No SMS path exists in production. |
| **Actual** | If Twilio env vars are present, real SMS is sent for staff notifications. |
| **Evidence** | `lib/staff-notifications.js:566-591`. |
| **Customer impact** | Staff may receive SMS if env is misconfigured, but no customer SMS. |
| **Business impact** | Cost and inconsistency with no-SMS policy. |
| **Recommended fix** | Remove the legacy Twilio branch entirely; rely on Telegram/Resend owner alerts. |
| **Owner decision required** | NO |
| **Implementation status** | open |
| **Verification status** | unverified |
| **Commit reference** | TBD |

---

## P3 — Optimization / Future

### P3-001 — Admin audit-log viewer UI does not exist

| Field | Value |
|---|---|
| **Title** | Admin audit-log viewer UI does not exist |
| **Severity** | P3 |
| **Area** | Admin tooling |
| **Route / file** | N/A |
| **Environment** | all |
| **Reproduction** | Look for `/admin/audit-logs` or audit section in dashboard. |
| **Expected** | Owner can view immutable audit history by request/batch/reservation. |
| **Actual** | No UI exists; audit events are written to `batch_audit_log` only. |
| **Recommended fix** | Build read-only `/admin/audit-logs` with filters. |
| **Owner decision required** | NO |
| **Implementation status** | open |
| **Verification status** | unverified |
| **Commit reference** | TBD |

---

## Summary counts

| Severity | Count |
|---|---|
| P0 | 5 |
| P1 | 5 |
| P2 | 3 |
| P3 | 1 |
| **Total** | **14** |

---

## Next actions

1. Fix P0-001 (SMS consent) immediately.
2. Fix P0-002 (admin setup circular auth) and P1-002 (emergency init route).
3. Read `app/api/webhooks/square/payment/route.ts` to verify P1-003.
4. Build product reconciliation table and resolve P0-003 with owner input.
5. Begin batch planner UI for P0-004.
6. Remove/rename health-benefit public rendering for P0-005.
