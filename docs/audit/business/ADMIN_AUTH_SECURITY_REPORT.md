# Admin Auth Security Report — v1.0-boringly-reliable

**Date:** 2026-06-01
**Production commit:** `0605c879`
**Production deployment:** `gratog-6himwzv35`

## Identity model

- **Authentication:** Signed JWT issued by `lib/auth/unified-admin.ts`
  (HS256, `JWT_SECRET`). Verified at the Edge by `lib/admin-session.ts`
  using `jose` (no Mongoose / no Node-only imports → Edge-safe).
- **Carrier:** `admin_token` cookie (httpOnly, secure, sameSite). Bearer
  header is also accepted for legitimate API tooling but the cookie is
  canonical.
- **Plaintext API keys:** Not consulted anywhere in the middleware or
  the `/api/admin/**` handlers. See ADMIN_KEY_AUDIT.md.

## Public allowlist (middleware.ts)

```
PUBLIC_ADMIN_ROUTES     = ['/admin/login']
PUBLIC_ADMIN_API_ROUTES = ['/api/admin/auth/login',
                           '/api/admin/auth/me',
                           '/api/admin/auth/logout',
                           '/api/admin/auth/reset-password']
```

All other `/admin/**` and `/api/admin/**` paths are gated.

## Production checks

| Endpoint | Status | Body |
| --- | --- | --- |
| `GET /api/admin/auth/me` (no cookie) | 401 | `{"success":false,"error":"Unauthorized","code":"ADMIN_AUTH_REQUIRED"}` |
| `GET /api/admin/inventory` (no cookie) | 401 | same |

Security headers observed on the 401 response:

```
strict-transport-security: max-age=63072000; includeSubDomains; preload
x-content-type-options: nosniff
x-frame-options: DENY
permissions-policy: camera=(), microphone=(), geolocation=(self), payment=(self)
```

## Open items (post-release, non-blocking)

- Update `app/admin/login/page.tsx` helper copy from "Your admin key is
  set in the ADMIN_API_KEY environment variable." to "Use your admin
  credentials." The page itself does not read the env; only the marketing
  blurb is stale.
- Delete dead `lib/auth.ts` `isAuthorized` / `extractUser` and
  `lib/catalog-api.ts` `reingestProduct` / `reindexCatalog` once the
  release tag is cut.
- Remove `GET /api/orders` and `POST /api/payments/refund` legacy
  handlers (admin operates on `/api/admin/**` endpoints; these target
  the empty `marketorders` collection).
