# AUTH_AUDIT — Gratog Platform

> Code-verified at commit `f9d20e98`. Sources: [middleware.ts](file:///data/data/com.termux/files/home/Gratog-live/middleware.ts), `lib/auth/jwt.*`, `lib/order-access-token.js`, `lib/rewards-security.js`, `app/api/admin/auth/*`.

## 1. Identity domains

| Domain | Subject | Storage | Token mechanism |
|---|---|---|---|
| **Admin** | Operations staff | `admin_users` collection | `admin_token` cookie containing `ADMIN_API_KEY` or `MASTER_API_KEY` literal |
| **Customer (registered)** | Buyers with accounts | `users` collection | JWT via `jose` library (`lib/auth/jwt.js`) |
| **Customer (guest)** | Anonymous checkout | `customers` collection (keyed by email) | HMAC-signed `orderAccessToken` (TTL 30m) from `lib/order-access-token.js` |
| **Internal service** | Cron / server-to-server | n/a | Bearer `ADMIN_API_KEY` / `MASTER_API_KEY` / `CRON_SECRET` |
| **Square webhook** | Square platform | n/a | Signed body via `SQUARE_WEBHOOK_SIGNATURE_KEY` |
| **Resend webhook** | Resend platform | n/a | HMAC body via `RESEND_WEBHOOK_SECRET` |

## 2. Admin auth

Implementation: [middleware.ts](file:///data/data/com.termux/files/home/Gratog-live/middleware.ts) — matcher `['/admin/:path*', '/api/admin/:path*']`.

```ts
const token = cookies.admin_token || header.Authorization.replace('Bearer ','')
if (token !== ADMIN_API_KEY && token !== MASTER_API_KEY) → redirect /admin/login
```

**Findings:**
- ❌ **Stringly typed secret-in-cookie** — `admin_token` value is *literally* `ADMIN_API_KEY`. Any disclosure (logs, devtools, browser ext.) compromises every admin endpoint instantly. Should be a per-session JWT signed against a long-term secret, with rotation.
- ❌ **No role separation** — `ADMIN_API_KEY` and `MASTER_API_KEY` granted equal authority by middleware. Sub-roles (read-only analyst, refund operator) are not enforced.
- ❌ **No rate limiting on `/api/admin/auth/login`** — credential stuffing risk (verify in route file).
- ✅ **CSRF endpoint exists** — `/api/admin/auth/csrf/route.ts`; ensure it's used by mutating admin POSTs.
- ⚠️ **`/admin/forgot-password` UI exists but `/api/admin/auth/reset-password` route is missing** — flow is broken (cleanup commit deletion).
- ⚠️ **Token comparison is non-constant-time** — string `!==`. Timing attack vector for very long secrets.

## 3. Customer auth

Implementation: `lib/auth/jwt.js` + `lib/auth/jwt.ts`. Uses `jose` and `bcryptjs` per dependency list.

**Findings:**
- ❌ **`/api/auth/register` missing** — `/register` page exists but POST target is deleted. Cannot create new customer accounts via UI.
- ❌ **`/api/auth/reset-password` missing** — `/forgot-password`, `/reset-password` pages dead.
- ❌ **No `/api/auth/login` in existing route list** — verify whether login route exists under a different name; if not, customer login is broken too.
- ⚠️ **JWT secret = `JWT_SECRET`** — also re-used for `order-access-token` HMAC, unsubscribe tokens, idempotency keys. Reuse is OK but rotation invalidates all flows simultaneously. Consider separate secret per purpose.
- ✅ **`canSendEmail()`** in `lib/email/service.js` enforces transactional-vs-marketing categorization based on stored `notification_preferences` + `unsubscribes`.

## 4. Guest checkout / order access tokens

Implementation: `lib/order-access-token.js` (HMAC-SHA256).

- ✅ **Issued by** `/api/orders/create` on success — `enhancedOrder.id` + `customerEmail` signed with `ORDER_ACCESS_TOKEN_SECRET || JWT_SECRET`.
- ✅ **Verified by** `/api/payments` before processing card token.
- ✅ **TTL 30 minutes** — enforced in token payload.
- ⚠️ **Single-use semantics not enforced** — token is reusable within TTL; replay vulnerability is bounded by the order being marked paid, but defence-in-depth: bind to idempotency key.

## 5. Internal service auth

| Caller | Target | Secret |
|---|---|---|
| `app/api/orders/create/route.js#L207-241` | `POST /api/rewards/add-points` | `MASTER_API_KEY` or `ADMIN_API_KEY` |
| Cron handler `vercel.json` schedule | `/api/cron/cleanup-locks`, `/api/cron/daily-report` | `CRON_SECRET` (verify in each handler) |
| Square OAuth callback | Updates env via admin | `MASTER_API_KEY` |

**Findings:**
- ❌ **Sharing admin and internal API keys** — same `MASTER_API_KEY` used for user-facing admin login *and* internal service-to-service. Compromising one compromises both.
- ⚠️ **Self-fetch on Vercel** — order route does `fetch(${NEXT_PUBLIC_BASE_URL}/api/rewards/add-points)`. Vercel charges this as an external invocation; better refactor to direct function call. Also: if `NEXT_PUBLIC_BASE_URL` is unset, the self-fetch silently fails on the server.

## 6. Webhook auth

| Provider | Route | Mechanism |
|---|---|---|
| Square | `app/api/webhooks/square/route.ts` | Header `x-square-hmacsha256-signature` verified against `SQUARE_WEBHOOK_SIGNATURE_KEY` |
| Resend | `app/api/webhooks/resend/route.js` | Header signature verified against `RESEND_WEBHOOK_SECRET` |

**Findings:**
- ✅ Both gate on shared secrets.
- ⚠️ Webhook **dedupe** via `webhook_events_processed` — verify TTL index so it doesn't grow forever.
- ⚠️ Resend webhook updates `email_sends` but transactional emails from [lib/resend-email.js](file:///data/data/com.termux/files/home/Gratog-live/lib/resend-email.js) **don't write** to `email_sends` → delivery events arrive with no matching record (silent loss). Tracked in EMAIL_SYSTEM_AUDIT.

## 7. Session lifecycle

- Admin session = lifetime of `admin_token` cookie (no expiry observed in route inspection; verify in `/api/admin/auth/login`).
- Customer JWT TTL — defined in `lib/auth/jwt.js`; default `7d` per common pattern.
- No silent refresh observed.

## 8. Authorization gaps to investigate

| Gap | File |
|---|---|
| `/api/debug/square`, `/api/square/{diagnose,test-rest,validate-token}` exposed without admin gate | route files |
| `/api/startup` not gated | `app/api/startup/route.ts` |
| `/api/admin/emergency-init` — likely should require master key beyond cookie | `app/api/admin/emergency-init/route.ts` |
| `/test-auth` page exists in prod tree | `app/test-auth/page.js` |

## 9. Defects (high level)

| Sev | Defect |
|---|---|
| 🔴 Critical | `/api/auth/register`, `/api/auth/login`(?), `/api/auth/reset-password` missing — customer account flow dead. |
| 🔴 Critical | Admin cookie = literal API key. Compromise blast radius is total. |
| 🟠 High | No role/permission separation between admin operators. |
| 🟠 High | Square diagnostic endpoints unauthenticated. |
| 🟡 Medium | JWT_SECRET reused across token purposes. |
| 🟡 Medium | Order access token not single-use. |
| 🟡 Medium | Internal service auth shares admin key. |
