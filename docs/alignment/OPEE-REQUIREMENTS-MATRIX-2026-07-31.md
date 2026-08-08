# OPEE Requirements Matrix — 2026-07-31

**Created:** 2026-07-31  
**Last Updated:** 2026-07-31 11:30 EDT  
**Repository:** /data/data/com.termux/files/home/.openclaw/workspace/Gratog  
**Branch:** main | **Commit:** 53652f9f  
**Overall Verdict:** FAIL — REMEDIATION INCOMPLETE

**Status vocabulary:** VERIFIED_PASS | VERIFIED_FAIL | BLOCKED_EXTERNAL | BLOCKED_DECISION | NOT_TESTED  
No other status values are permitted.

---

## P0 — Critical (Trust, Money, Safety)

### C0 — Resend Domain Verification
| Field | Value |
|-------|-------|
| Severity | 🔴 Critical |
| Status | **BLOCKED_EXTERNAL** |
| Blocker | Requires Resend dashboard access to verify `tasteofgratitude.shop` or `hello@tasteofgratitude.shop` domain |
| Evidence Required | Resend domain verification status; successful email send with `messageId` and `email_sends` row |
| Next Action | Attempt read-only domain-status check via Resend API; if unavailable, provide dashboard verification steps |

### C2 — Admin Authentication
| Field | Value |
|-------|-------|
| Severity | 🔴 Critical |
| Status | **NOT_TESTED** |
| Code Changes Applied | Replaced `ADMIN_API_KEY` auth in `/api/orders/route.ts` and `/api/payments/refund/route.ts` with `requireAdmin()` from `lib/admin-session.ts`. Added JWT-only fallback in `middleware.ts`. Added `@deprecated` to `lib/auth.ts` and `lib/admin-auth.js`. |
| Evidence Required | (1) Cryptographic JWT signature verification (HS256 via jose). (2) Algorithm allowlist enforcement. (3) Expiration enforcement. (4) Session rotation. (5) Logout invalidation. (6) Rejection of raw API keys. (7) Rejection of malformed JWTs. (8) Identical enforcement across ALL admin APIs. (9) Zero active imports of deprecated auth modules. (10) Cron routes use separate `requireCronSecret()` with constant-time comparison. |
| Remaining Work | Cron route auth consolidation (`requireCronSecret()`). Deprecation is not consolidation — must migrate all callers. |
| Negative Tests Required | Forged JWT, expired JWT, revoked JWT, raw API key, malformed JWT, missing JWT, wrong algorithm |

### C3 — Client-Controlled Order Prices
| Field | Value |
|-------|-------|
| Severity | 🔴 Critical |
| Status | **NOT_TESTED** |
| Code Changes Applied | None needed — `priceCart()` already rebuilds from catalog |
| Evidence Required | (1) MongoDB is a synchronized Square snapshot with freshness/identity guarantees. (2) Missing Square variation → fail closed. (3) Stale snapshot → fail closed. (4) Wrong currency → fail closed. (5) Curated-price fallback → fail closed. (6) Client submits $0.01 → server charges Square price. (7) Client submits old variation price → server charges current Square price. |
| Remaining Work | Verify `priceCart()` source is Square-authoritative, not independently-maintained MongoDB. If MongoDB contains independently-maintained prices, status becomes VERIFIED_FAIL. |
| Negative Tests Required | $0.01 price, old variation, Square/MongoDB mismatch, missing variation, stale snapshot, wrong currency, curated fallback |

### C4 — Transactional Email Ledger
| Field | Value |
|-------|-------|
| Severity | 🔴 Critical |
| Status | **VERIFIED_FAIL** |
| Code Changes Applied | Added pre-send `email_sends` row (status: 'pending') in both `lib/resend-email.js` and `lib/email/service.js`. Added post-send update to 'sent'/'failed'. |
| Why VERIFIED_FAIL | Two competing email systems remain active. Adding similar ledger writes to both does not satisfy consolidation. Requires: (1) One canonical email service. (2) Pending row before provider call. (3) Unique idempotency key. (4) Resend provider ID stored. (5) Explicit sent/failed state. (6) Webhook signature verification. (7) Delivery/bounce/complaint updates. (8) Duplicate-event protection. (9) Out-of-order-event handling. (10) Crash recovery. (11) Zero active deprecated callers. |
| Remaining Work | Migrate all callers from `lib/resend-email.js` to `lib/email/service.js`. Convert `resend-email.js` to compatibility wrapper or archive after zero imports proven. |

---

## P1 — High (Customer Success)

### H3 — Coupon Use Recorded Before Payment
| Field | Value |
|-------|-------|
| Severity | 🟠 High |
| Status | **NOT_TESTED** |
| Evidence Required | (1) Failed-payment path does not increment `usedCount`. (2) Duplicate payment webhook is idempotent. (3) Database-side-effect evidence: `coupons.usedCount` unchanged after order creation, incremented after confirmed payment. |
| Negative Tests Required | Failed payment → usedCount unchanged; duplicate webhook → usedCount incremented exactly once |

### H4 — Rewards Depend on HTTP Self-Fetch
| Field | Value |
|-------|-------|
| Severity | 🟠 High |
| Status | **NOT_TESTED** |
| Evidence Required | (1) Failed-payment path does not award points. (2) Duplicate payment webhook awards points exactly once. (3) `rewardsSystem.addPoints()` is called in-process, not via HTTP. |
| Negative Tests Required | Failed payment → no points; duplicate webhook → points awarded exactly once |

### H5 — Unauthenticated Square Diagnostics
| Field | Value |
|-------|-------|
| Severity | 🟠 High |
| Status | **NOT_TESTED** |
| Code Changes Applied | Added `VERCEL_ENV === 'production'` check to debug routes |
| Why NOT_TESTED | `VERCEL_ENV === 'production'` may fail open outside Vercel or with missing configuration. Must use default-deny: diagnostics enabled only through explicit local/test configuration; production and missing-classification return 404; no credentials disclosed. |
| Remaining Work | Convert to default-deny: `if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'development') return 404`. Verify against production build. |

### LIVE-02 — Cross-Route Price Drift
| Field | Value |
|-------|-------|
| Severity | 🔴 Critical (elevated from Medium — affects money and customer trust) |
| Status | **VERIFIED_FAIL** |
| Root Cause | `data/products.ts` contains hardcoded curated prices. `mergeWithCuratedProduct()` prefers Square prices but falls back to curated prices. The `2oz gel sample = $11` hardcoded rule can override Square prices. MongoDB may contain independently-maintained sellable prices. |
| Required Fix | Square is the sole price authority. MongoDB may serve only as a synchronized Square catalog snapshot with explicit freshness state. Missing, stale, unmatched, or conflicting Square records must fail closed. |

### LIVE-05 — Shipping Still Available in Checkout
| Field | Value |
|-------|-------|
| Severity | 🟠 High |
| Status | **NOT_TESTED** |
| Code Changes Applied | Removed broken wholesale `<Link>` from Footer. Fixed policies page description. |
| Remaining Work | Remove: Shipping tab from FulfillmentTabs, ShippingForm fields, shipping checkout branches, "Eligible shipping" language, Shipping Policy navigation, shipping-specific validation and order states. Keep local delivery only where its eligibility, fee, service area, checkout validation, and admin fulfillment process genuinely work. |

### LIVE-06 — Duplicate Products in Public Catalog
| Field | Value |
|-------|-------|
| Severity | 🟠 High |
| Status | **VERIFIED_FAIL** |
| Root Cause | Public duplicate product identities were previously exposed. Code inspection alone cannot override live evidence. Canonical-versus-legacy mapping and storefront suppression required. |
| Required Fix | (1) Retrieve relevant Square IDs read-only. (2) Produce canonical-versus-legacy mapping. (3) Suppress legacy duplicates from storefront immediately through canonical ID mapping. (4) Confirm carts and existing orders remain readable. (5) Prepare Square archival plan listing exact IDs. (6) Request approval before mutating Square. Use "Grateful Defense" as intended public name. Remove/hide Strawberry Milk Tea/Boba. |

### LIVE-09 — Health Claims
| Field | Value |
|-------|-------|
| Severity | 🟠 High |
| Status | **NOT_TESTED** |
| Evidence Required | Production build verification that no health claims appear on storefront. `lib/health-benefits.js` is internal-only. |

### LIVE-10 — Unsupported Social-Proof Language
| Field | Value |
|-------|-------|
| Severity | 🟡 Medium |
| Status | **NOT_TESTED** |
| Evidence Required | Production build verification that no fake reviews or unsupported social-proof language appears. |

---

## P2 — Medium (Operational Efficiency)

### M1 — Competing Checkout Systems
| Field | Value |
|-------|-------|
| Severity | 🟡 Medium |
| Status | **NOT_TESTED** |
| Evidence Required | (1) No public component calls deprecated routes. (2) No admin component calls deprecated routes. (3) No mobile/PWA code calls deprecated routes. (4) No webhook or background task calls deprecated routes. (5) Canonical replacement passes E2E. |

### M2 — Competing Email Systems
| Field | Value |
|-------|-------|
| Severity | 🟡 Medium |
| Status | **VERIFIED_FAIL** |
| Root Cause | Two active email implementations (`lib/resend-email.js` with 14 callers and `lib/email/service.js` with 6 callers) remain. Both write to `email_sends` with different schemas. Consolidation required. |

### ADMIN-04 — Overlapping Authentication Enforcement
| Field | Value |
|-------|-------|
| Severity | 🟡 Medium |
| Status | **NOT_TESTED** |
| Required Fix | Consolidate interactive admin auth to `lib/auth/unified-admin.ts` (Node) + `lib/admin-session.ts` (Edge). Create `requireCronSecret()` for machine-to-machine routes with constant-time comparison. Never allow admin JWT to substitute for cron secret or vice versa. |

### LIVE-01 — Cart Notification Event Mismatch
| Field | Value |
|-------|-------|
| Severity | 🟡 Medium |
| Status | **NOT_TESTED** |
| Code Changes Applied | Changed `CartNotification.jsx` event listener from `cartUpdated` to `cart-updated` |
| Evidence Required | Browser E2E: header cart opens, notification opens cart, quantities render, checkout reachable, keyboard works, state survives navigation |

### LIVE-11 — Unlabeled Controls and Overlay Collisions
| Field | Value |
|-------|-------|
| Severity | 🟡 Medium |
| Status | **NOT_TESTED** |
| Evidence Required | Browser E2E: aria-labels present, overlay stacking correct, keyboard navigation works |

### LIVE-12 — Catalog vs Preorder
| Field | Value |
|-------|-------|
| Severity | 🟡 Medium |
| Status | **NOT_TESTED** |
| Evidence Required | Browser E2E: same cart engine, same checkout API, same payment flow confirmed |

---

*Matrix uses only authorized status vocabulary: VERIFIED_PASS | VERIFIED_FAIL | BLOCKED_EXTERNAL | BLOCKED_DECISION | NOT_TESTED*