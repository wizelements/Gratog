# SECURITY CURL MATRIX — Phase 9 verification

> **Preview:** `https://gratog-r1jkwdp1x-theangelsilvers-projects.vercel.app`
> **Branch / commit:** `fix/boringly-reliable-revenue-core` @ `cbd6b497`
> **Bypass header:** `x-vercel-protection-bypass: <user-supplied token>`
> Date executed: 2026-05-31

## v1.0-boringly-reliable production re-run (2026-06-01)

Production target: `gratog-6himwzv35` / https://tasteofgratitude.shop @ `0605c879`.
No bypass header; clean unauthenticated client.

| Endpoint | Status | Expected | Result |
| --- | :---: | :---: | :---: |
| `GET /` | 200 | 200 | ✅ |
| `GET /api/debug/square` | 404 | 404 | ✅ |
| `GET /api/square/diagnose` | 404 | 404 | ✅ |
| `GET /api/square/test-rest` | 404 | 404 | ✅ |
| `GET /api/square/validate-token` | 404 | 404 | ✅ |
| `GET /api/startup` | 404 | 404 | ✅ |
| `GET /api/pay/process` | 410 | 410 | ✅ |
| `GET /api/checkout` | 410 | 410 | ✅ |
| `GET /api/create-checkout` | 410 | 410 | ✅ |
| `GET /api/admin/auth/me` | 401 (`ADMIN_AUTH_REQUIRED`) | 401 | ✅ |
| `GET /api/admin/inventory` | 401 (`ADMIN_AUTH_REQUIRED`) | 401 | ✅ |
| `GET /api/contact` | 405 | 4xx | ✅ |
| `GET /api/unsubscribe` (no token) | 400 | 4xx | ✅ |

Security headers on 401: HSTS preload, `x-frame-options: DENY`,
`x-content-type-options: nosniff`, restrictive `permissions-policy`.


## A. Diagnostic endpoints

| Endpoint | Preview status | Notes |
| --- | --- | --- |
| `GET /api/debug/square` | **404** ✅ | guarded by `NODE_ENV === 'production'` (Next sets NODE_ENV=production for any Vercel build, including preview, which is why this is already 404 here) |
| `GET /api/square/test-rest` | **404** ✅ | same guard |
| `GET /api/square/diagnose` | **401** ✅ | `blockInProduction()` is preview-aware (only blocks when `VERCEL_ENV === 'production'`); on preview the admin-session check fires next and correctly rejects unauthenticated requests with 401. On production it will return 404 first. |
| `GET /api/square/validate-token` | **401** ✅ | same pattern |
| `GET /api/startup` | **500** ⚠️ | preview environment lacks `MONGODB_URI` so `validateStartupConfig()` throws; on production `blockInProduction()` short-circuits to **404** before the validator runs. |

## B. Deprecated payment paths (must all be 410)

| Endpoint | GET | POST |
| --- | --- | --- |
| `/api/checkout` | **410** ✅ | **410** ✅ |
| `/api/create-checkout` | **410** ✅ | **410** ✅ |
| `/api/pay/process` | **410** ✅ | **410** ✅ |

Each response carries `Deprecation: true`, `Sunset`, and a `Link: </api/orders/create>; rel="successor-version"` (or `/api/payments` for `pay/process`).

## C. Admin routes (unauthenticated)

| Endpoint | Status | Body |
| --- | --- | --- |
| `GET /api/admin/inventory` | **401** ✅ | `{"success":false,"error":"Unauthorized","code":"ADMIN_AUTH_REQUIRED"}` |
| `GET /api/admin/orders` | **401** ✅ | same |
| `GET /api/admin/products` | **401** ✅ | same |
| `GET /api/admin/customers` | **401** ✅ | same |
| `GET /api/admin/coupons` | **401** ✅ | same |

Proves the new edge-safe `middleware.ts` (`lib/admin-session.verifyAdminToken`) is correctly rejecting requests without a valid signed JWT. No plaintext `ADMIN_API_KEY` / `MASTER_API_KEY` is consulted.

## D. Customer-facing new endpoints

| Test | Status | Body |
| --- | --- | --- |
| `POST /api/contact` (valid payload) | **500** ⚠️ | `MONGODB_URI is not defined` in preview env (logged) — code path is correct; will be **200** in production where MONGODB_URI is set. |
| `POST /api/contact` (missing message) | **400** ✅ | `{"success":false,"error":"Validation failed","details":{"message":["Required"]}}` |
| `POST /api/unsubscribe` (email fallback) | **200** ✅ | `{"success":true,"message":"If that email was subscribed, it has been removed."}` |
| `GET /api/unsubscribe?token=bogus` | **400** ✅ | `{"success":false,"error":"Invalid or expired unsubscribe link"}` |
| `POST /api/admin/auth/reset-password` (request stage) | **200** ✅ | `{"success":true,"message":"If an admin account exists for that email, a reset link has been sent."}` |

The 500 on `/api/contact` and `/api/startup` are not regressions — they are preview-env config gaps. Vercel env audit confirms `MONGODB_URI` is set in **Production** only (and Development), not Preview. Either:
- accept that preview deploys cannot DB-write (and run smoke tests with mocked DB), or
- add `MONGODB_URI` to the Preview environment in the Vercel dashboard.

## E. Build & runtime sanity

- Build commit: `cbd6b497` — ● **Ready** in 2m (Edge bundle compiles after switching middleware to `lib/admin-session`).
- Edge-Runtime mongoose error from `12eb2dad` was a real regression caught by Vercel CI; resolved before any merge happened. Documented in commit `cbd6b497`.

## F. What's still required before tagging `v1.0-boringly-reliable`

1. Merge `fix/boringly-reliable-revenue-core` → `main`, redeploy.
2. Re-run sections A and B against `https://tasteofgratitude.shop` — expect:
   - `/api/startup` → **404** (was 200)
   - `/api/checkout`, `/api/create-checkout`, `/api/pay/process` → **410** (currently 200/405)
   - `/api/debug/square`, `/api/square/test-rest` → **404** (already true)
3. Run section D's `POST /api/contact` against production with `MONGODB_URI` set → expect **200** + a row in `contact_messages`.
4. Run `node scripts/setup-database-indexes.js` against production Mongo to install the new unique idx on `reward_transactions(email, orderId, type)` plus the `email_sends`, `contact_messages`, `newsletter_subscribers` indexes.
5. Smoke a real $1 sandbox order on production, then verify with Mongo shell:
   - `email_sends.findOne({ orderId: <id> })` returns the order_confirmation row.
   - `reward_transactions.findOne({ orderId: <id> })` returns exactly one row.
   - `coupons.findOne({ code: <code> }).usageHistory` contains the orderId exactly once.
   - `customers.findOne({ email: <e> }).totalSpent` incremented by exactly the paid amount.
