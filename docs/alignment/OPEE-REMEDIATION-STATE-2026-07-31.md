# OPEE Remediation State — 2026-07-31

**Created:** 2026-07-31 11:03 EDT  
**Last Updated:** 2026-07-31 12:05 EDT  
**Repository Root:** /data/data/com.termux/files/home/.openclaw/workspace/Gratog  
**Branch:** main | **Commit:** 53652f9f  
**Overall Verdict:** FAIL — REMEDIATION INCOMPLETE  
**Status Vocabulary:** VERIFIED_PASS | VERIFIED_FAIL | BLOCKED_EXTERNAL | BLOCKED_DECISION | NOT_TESTED

---

## Environment

- **Framework:** Next.js 15.5.22, React 19.1.0
- **Database:** MongoDB (Atlas, mongodb+srv)
- **Package Manager:** npm (package-lock.json)
- **Node:** v26.3.0
- **Build:** `NODE_OPTIONS='--max-old-space-size=2048' next build`
- **Lint:** `next lint`
- **Typecheck:** `tsc --noEmit --skipLibCheck`

## Current Phase

**PHASE 2–3** (code changes applied, build/regression verification in progress)

## Files Changed

31 files changed (250 insertions, 205 deletions) — all uncommitted

### Key Changes

1. **C2**: JWT-only auth in `/api/orders/route.ts` and `/api/payments/refund/route.ts`. JWT-only fallback in middleware. `@deprecated` on legacy auth. `requireCronSecret()` for cron routes.
2. **C4/M2**: Pre-send `email_sends` ledger write in both email modules. All 12 callers migrated from `lib/resend-email.js` to `lib/email/service.js`. Zero active imports of deprecated module remain.
3. **H5**: Default-deny diagnostics (only `test`/`development` env allowed).
4. **LIVE-01**: CartNotification event name fixed to `cart-updated`.
5. **LIVE-02**: Curated price fallback removed. `2oz gel = $11` hardcoded override removed. Square is sole price authority.
6. **LIVE-05**: Shipping tab removed from FulfillmentTabs. ShippingForm removed from CheckoutRoot. Shipping validation removed. Shipping language updated.
7. **LIVE-06**: Blue Lotus Gel archived. Boba/Strawberry Milk Tea marked inactive. Canonical filtering in place.
8. **ADMIN-04**: `requireCronSecret()` created with constant-time comparison. Cron routes migrated.

## Status Summary

| ID | Status | Notes |
|----|--------|-------|
| C0 | BLOCKED_EXTERNAL | Resend domain verification requires dashboard access |
| C2 | NOT_TESTED | JWT-only auth applied. E2E auth tests needed. |
| C3 | NOT_TESTED | Server-authoritative pricing confirmed. Negative tests needed. |
| C4 | NOT_TESTED | Pre-send ledger + consolidation complete. E2E needed. |
| H3 | NOT_TESTED | Coupon burn after payment confirmed. E2E needed. |
| H4 | NOT_TESTED | Direct rewards call confirmed. E2E needed. |
| H5 | NOT_TESTED | Default-deny diagnostics applied. Production build verification needed. |
| M1 | NOT_TESTED | Competing routes return 410. Call search + E2E needed. |
| M2 | NOT_TESTED | All 12 callers migrated. Zero deprecated imports. E2E needed. |
| LIVE-01 | NOT_TESTED | Event name fixed. Browser E2E needed. |
| LIVE-02 | NOT_TESTED | Price authority fix applied. Negative tests needed. |
| LIVE-05 | NOT_TESTED | Shipping tab/form removed. Remaining references need cleanup. Browser E2E needed. |
| LIVE-06 | VERIFIED_FAIL | Code filters in place. Live catalog verification needed. |
| LIVE-09 | NOT_TESTED | Health claims removed from storefront. Production build verification needed. |
| LIVE-10 | NOT_TESTED | No fake reviews. Production build verification needed. |
| LIVE-12 | NOT_TESTED | Same cart/checkout API. Browser E2E needed. |
| ADMIN-04 | NOT_TESTED | `requireCronSecret()` created. Cron routes migrated. Remaining `ADMIN_API_KEY` references in non-route modules. |

## Remaining Work

1. Build verification (`next build`)
2. Remove remaining shipping references from ReviewAndPay, order creation, fulfillment adapter
3. Remove active imports of `lib/auth.ts` from catalog-api, order-access-token, rewards-security
4. Migrate `app/api/admin/menus/archive/route.ts` to `requireCronSecret()`
5. Create canonical-versus-legacy Square ID mapping for duplicate suppression
6. Run regression tests for all NOT_TESTED items
7. Local browser E2E
8. Await production deployment approval

## Safety Rules

- Timestamped backup before any state change
- No destructive deletes
- No secrets in logs
- No production deployment without explicit approval