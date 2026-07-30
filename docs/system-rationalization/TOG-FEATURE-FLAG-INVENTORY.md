# TOG-FEATURE-FLAG-INVENTORY.md

Taste of Gratitude — Feature Flag Inventory

Generated: 2026-07-29 19:20 EDT
Authority: Native Termux workspace

---

## 1. Feature Flags

| Flag | Type | Default / Usage | Purpose | Status | Recommendation |
|------|------|-----------------|---------|--------|--------------|
| FEATURE_CHECKOUT_V2 | env | unknown | Enable checkout v2 | Unknown | Verify; if active, deprecate v1 |
| FEATURE_INVENTORY_LOCKING | env | unknown | Lock inventory during checkout | Unknown | Verify; likely valuable |
| FEATURE_ENHANCED_SEARCH | env | unknown | Enhanced search | Unknown | Verify usage |
| FEATURE_RETURNS_ENABLED | env | unknown | Returns portal | Unknown | Likely archive |
| FEATURE_SUBSCRIPTIONS_ENABLED | env | unknown | Subscriptions | Unknown | Likely archive |
| FEATURE_MOBILE_ADMIN | env | unknown | Mobile admin UI | Unknown | Likely archive |
| NEXT_PUBLIC_FULFILLMENT_DELIVERY | public env | unknown | Show delivery option | Unknown | Verify operational readiness |
| NEXT_PUBLIC_ENABLE_DEMO_PRODUCTS | public env | unknown | Show demo products | Unknown | Disable in production |
| NEXT_PUBLIC_CATALOG_SOURCE | public env | unknown | Catalog source selector | Unknown | Should be `square` |
| ALLOW_DEMO_STOREFRONT_FALLBACK | env | unknown | Fallback to demo products | Unknown | Disable in production |
| ALLOW_SANDBOX_PRODUCTS | env | unknown | Allow sandbox products | Unknown | Disable in production |
| SQUARE_MOCK_MODE | env | unknown | Mock Square responses | Unknown | Must be false in production |
| SQUARE_SKIP_WEBHOOK_VERIFICATION | env | unknown | Skip webhook HMAC | Unknown | Must be unset in production |
| TOG_SKIP_LIVE | env | unknown | Skip live checks | Unknown | Disable in production |
| NEXT_PUBLIC_CHECKOUT_DIAGNOSTICS | public env | unknown | Checkout diagnostics | Unknown | Disable in production |

## 2. Runtime Feature Checks

Beyond env flags, code contains many runtime checks:
- `process.env.NODE_ENV === 'production'` guards diagnostic routes.
- `process.env.VERCEL_ENV` checks for preview vs production.
- `process.env.DEBUG` / `VERBOSE` control logging verbosity.

## 3. Recommendations

1. Audit Vercel production env values for all flags above.
2. Disable any flag that exposes demo/sandbox/diagnostic behavior in production.
3. Document active flags and their business purpose.
4. Consolidate feature flags into a single source of truth (e.g., `lib/site-config.ts` + env).

---

*Next: TOG-SYSTEM-DEPENDENCY-MAP.md*
