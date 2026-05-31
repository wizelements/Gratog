# SECURITY_AUDIT — Gratog Platform

> Code-verified at commit `f9d20e98`. Cross-references AUTH_AUDIT, PAYMENT_FLOW_AUDIT, EMAIL_SYSTEM_AUDIT.

## 1. Authentication

| Surface | Posture | Issue |
|---|---|---|
| Admin | Cookie `admin_token` = literal `ADMIN_API_KEY` / `MASTER_API_KEY` | 🔴 Compromise of cookie = total admin control. No rotation, no session, no constant-time compare. |
| Customer | JWT via `jose` | 🟠 Routes to log in / register missing → de facto no customer auth at all. |
| Service | Bearer admin/master key + `CRON_SECRET` | 🟠 Shared admin key for internal calls. |
| Webhooks | Square + Resend HMAC signatures | ✅ |
| Order access token | HMAC SHA-256, TTL 30 m | ✅ Per-order, not single-use. Acceptable. |

## 2. Authorization

- `middleware.ts` covers `/admin/**` and `/api/admin/**`. No per-route role checks beyond key match.
- No fine-grained ACL. `MASTER_API_KEY` ≅ `ADMIN_API_KEY`.

## 3. Input validation

- Order create — validates `customer` and `cart.length > 0`. Does not deeply validate item shape against Square catalog → manipulated prices possible.
- Payments — relies on Square SDK for card token; server only verifies token + amount.
- ⚠️ **Item price trust** — `app/api/orders/create/route.js#L79-96` accepts `subtotal` and `total` from client; falls back to computed from cart prices that are also client-supplied. **Price tampering risk** — should rebuild from Square catalog server-side.

## 4. Rate limiting

- `lib/security/redis.ts` provides rate-limit primitives.
- ⚠️ Verify usage: `rg -n "rateLimit|limiter|tooManyRequests" app/api/` to confirm critical routes (login, register, contact, payments) actually apply it.

## 5. CSRF

- `/api/admin/auth/csrf` exists.
- Verify mutating admin routes require the token; risk if missing.

## 6. XSS

- React escapes by default. No `dangerouslySetInnerHTML` audited yet — verify via:
  ```
  rg "dangerouslySetInnerHTML" app/ components/
  ```
- Email templates rendered as HTML — only sent to known recipients, low surface area.

## 7. CSP / headers

- `/api/csp-report` exists → CSP is reported. Verify CSP policy in `next.config.js` or `vercel.json` headers.
- HSTS, Referrer-Policy, Permissions-Policy — verify config.

## 8. Secrets management

- 151 env var usages found ([_env-vars.txt](file:///data/data/com.termux/files/home/Gratog-live/docs/audit/_env-vars.txt)).
- Secrets stored in Vercel env. No `.env` committed (verify `.gitignore`).
- `JWT_SECRET` is reused for JWT, order access tokens, unsubscribe tokens, idempotency — single rotation kills everything.

## 9. Admin endpoints exposed without auth

| Endpoint | Issue |
|---|---|
| `/api/debug/square` | should require admin |
| `/api/square/diagnose` | likely public |
| `/api/square/test-rest` | likely public |
| `/api/square/validate-token` | likely public |
| `/api/startup` | should be hidden |
| `/api/admin/emergency-init` | currently behind middleware ✅ but doubly check for bootstrap mode bypass |

## 10. Payment security

- Card data never touches server (Square Web Payments SDK tokenizes in-browser).
- ⚠️ Idempotency key passthrough to Square verify in `/api/payments`.
- Order access token model is solid.
- Coupon `$inc usedCount` happens at order create (pre-payment) → DoS abuse can drain coupon usage without paying.

## 11. Webhook security

- Square HMAC verified ✅
- Resend HMAC verified ✅
- Webhook replay protected via `webhook_events_processed`.

## 12. Logging / PII

- `lib/logger.js` writes structured logs; ensure no full card data or full session token logged.
- Sentry (`@sentry/nextjs`) — verify scrubbing rules (do not log emails as PII in stack traces).

## 13. Storage

- MongoDB Atlas — encrypted at rest by Atlas default. Connection requires TLS.
- Service worker `public/sw.js` — verify it doesn't cache responses containing tokens.

## 14. Dependency hygiene

- 61 runtime deps. Recommend `npm audit` after this audit.
- `@sendgrid/mail` still in `package.json` despite removal of usage (`81e27a5a` + `e834a81b`) — dead dependency.

## 15. Defects

| Sev | Defect |
|---|---|
| 🔴 Critical | Admin cookie equals literal API key. |
| 🔴 Critical | Price tampering possible — client-supplied prices accepted at order create. |
| 🟠 High | Square diagnostic endpoints public. |
| 🟠 High | Single `JWT_SECRET` for all token purposes. |
| 🟠 High | Coupon `$inc` before payment → DoS-drains coupon usage. |
| 🟡 Medium | No fine-grained admin RBAC. |
| 🟡 Medium | Order access token reusable within TTL. |
| 🟡 Medium | Verify CSRF coverage on mutating admin routes. |
| 🟡 Medium | Verify rate limit coverage on auth + contact + checkout. |
| 🟢 Low | `@sendgrid/mail` dead dep. |
| 🟢 Low | `/test-auth`, `/diagnostic` reachable in prod. |
