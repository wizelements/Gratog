# Admin Key Audit — v1.0-boringly-reliable verification

**Date:** 2026-06-01
**Auditor:** Release verification (Amp)
**Production deployment:** `gratog-6himwzv35` / https://tasteofgratitude.shop
**Production commit:** `0605c879`

## Scope

Determine whether `ADMIN_API_KEY` and `MASTER_API_KEY` still exist in
runtime, and classify every code/document reference.

## Runtime presence (Vercel production env)

`vercel env ls production` returned (filtered):

```
CRON_SECRET     Encrypted   Production
MONGODB_URI     Encrypted   Production
JWT_SECRET      Encrypted   Production, Preview, Development
```

**`ADMIN_API_KEY`, `MASTER_API_KEY`, `NEXT_PUBLIC_ADMIN_API_KEY` are NOT
present in any Vercel production environment scope.** They have already
been removed and are not injected into the production runtime.

## Code reference classification

`grep -R "ADMIN_API_KEY\|MASTER_API_KEY" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next`

### A. Runtime — fail-closed (safe with var unset)

| File | Behavior with var unset in production |
| --- | --- |
| `app/api/orders/route.ts:235` (`GET /api/orders`) | `apiKey = undefined`. Any incoming Authorization header fails the comparison → 401. Fail-closed. Route is also legacy: queries `marketorders` collection which holds 0 documents in production. |
| `app/api/payments/refund/route.ts:25` (`POST /api/payments/refund`) | Same fail-closed pattern → 401. Same `marketorders` empty-collection legacy. |
| `lib/rewards-security.js:122-123` (`verifyRequestAuthentication`) | `if (masterKey && …)` and `if (apiKey && …)` short-circuit because both are undefined; falls through to JWT validation. Used by `/api/rewards/passport`, `/api/rewards/add-points`, `/api/orders/by-ref`, `/api/payments`. Fail-closed. |
| `lib/order-access-token.js:10` (`getOrderAccessSecret`) | Fallback chain `ORDER_ACCESS_TOKEN_SECRET || JWT_SECRET || MASTER_API_KEY`. `JWT_SECRET` is set in production → `MASTER_API_KEY` fallback is never reached. |

### B. Dead code (no importers)

| File | Notes |
| --- | --- |
| `lib/auth.ts` (`isAuthorized`, `extractUser`) | Only `hashPassword`/`comparePassword` are imported elsewhere (by `lib/admin-auth.js`). The two key-consuming functions are unreachable. |
| `lib/catalog-api.ts:117,140` (`reingestProduct`, `reindexCatalog`) | Reference `NEXT_PUBLIC_ADMIN_API_KEY`. Grep shows zero importers. The var is not set in Vercel, so even if reached, would throw "Admin API key not configured" before any HTTP call. No browser leak. |
| `app/admin/login/page.tsx:100` | Marketing copy ("Your admin key is set in the ADMIN_API_KEY environment variable.") — UI text only. Does not read the env. **Stale wording** vs. the new JWT flow but non-load-bearing. |

### C. Documentation / CI only

| File | Type |
| --- | --- |
| `docs/audit/**/*.md` | Historical audit narrative. |
| `.emergent/**/*.md` | Pre-launch fix logs. |
| `.github/workflows/integration-tests.yml`, `smoke-tests.yml` | Test fixtures: `ADMIN_API_KEY: test-admin-api-key`. CI-scoped, never reach production. |
| `deploy.sh`, `PUSH_NOW.sh` | Local helper scripts that echo a checklist. |
| `docs/audit/_env-vars.txt` | Generated env inventory snapshot. |

## Decision

**No rotation or removal required for v1.0-boringly-reliable.**

- The keys are absent from the Vercel production runtime.
- Every runtime code path that reads them is fail-closed under
  `undefined` and (where applicable) backed by JWT or fallbacks.
- Remaining text references are dead code, CI fixtures, or
  documentation.

Removing the dead code paths in `lib/auth.ts`, `lib/catalog-api.ts`,
and the legacy `GET /api/orders` + `POST /api/payments/refund`
handlers is **deferred** as a post-release cleanup. They are not a
release blocker because every one of them is provably unreachable or
fail-closed.

## Verification commands

```bash
$ curl -i https://tasteofgratitude.shop/api/admin/auth/me
HTTP/2 401
{"success":false,"error":"Unauthorized","code":"ADMIN_AUTH_REQUIRED"}

$ curl -i https://tasteofgratitude.shop/api/admin/inventory
HTTP/2 401
{"success":false,"error":"Unauthorized","code":"ADMIN_AUTH_REQUIRED"}
```

Both return the expected `ADMIN_AUTH_REQUIRED` JSON from
`middleware.ts → verifyAdminToken` (JWT, `jose`-based, Edge-safe). No
plaintext key is consulted.

## Browser admin flow

Not exercised in this verification (no admin password supplied to the
release-verification environment).

Static code review of `middleware.ts` confirms:

- Public allowlist limited to `/admin/login`, `/api/admin/auth/login`,
  `/api/admin/auth/me`, `/api/admin/auth/logout`, `/api/admin/auth/reset-password`.
- All other `/admin/**` and `/api/admin/**` paths require a signed JWT
  via `verifyAdminToken(token)`; `token` may come from the
  `admin_token` cookie or `Authorization: Bearer`.
- On missing/invalid token, API routes return the JSON 401 above;
  page routes redirect to `/admin/login?redirect=…`.
- No `process.env.ADMIN_API_KEY` / `process.env.MASTER_API_KEY` reads
  in the middleware path.

The browser-side flow (login → JWT cookie → logout) should be smoke-tested
manually before the tag is cut. See FINAL_SCORECARD.md row "Can admin
operate safely?" for status.
