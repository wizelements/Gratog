# RESOLUTION LOG — Boringly Reliable Revenue Core

> Every commit on `fix/boringly-reliable-revenue-core` is logged here in order.
> Format: SHA, files, risk addressed, verification, result.

## Format

```
### <short SHA> — <conventional commit subject>
- Files: <paths>
- Risk fixed: <link to risk ID or short description>
- Verification: <commands>
- Result: <pass/fail + detail>
- Preview URL: <if applicable>
- Production: <if merged>
```

## Entries

### `5ca8…` — feat(revenue): server-authoritative cart pricing + paid-once side effects

- Files: `lib/cart-pricing.ts` (new), `app/api/orders/create/route.js`,
  `lib/transactions.ts`, `app/api/payments/route.ts`, `lib/enhanced-rewards.js`,
  `scripts/setup-database-indexes.js`, `middleware.ts`, `lib/diagnostics-guard.ts`
  (new), `app/api/startup/route.ts`, `app/api/square/diagnose/route.ts`,
  `app/api/square/validate-token/route.ts`, `lib/resend-email.js`,
  `scripts/check-route-coverage.js` (new),
  `scripts/_route-coverage-allowlist.json` (new), `package.json`,
  `docs/audit/business/PREFLIGHT_SNAPSHOT.md` (new),
  `docs/audit/business/RESOLUTION_LOG.md` (new).
- Risk fixed: R-C1 (price tampering), R-C2 (double-award), R-C3 (coupon
  field mismatch), R-C4 (pre-payment coupon $inc), R-H1 (LTV inflation),
  diagnostic exposure in production, plaintext API key admin auth.
- Verification:
  - `npx vitest run tests/unit/cart-pricing.spec.ts` → 10/10 pass.
  - `npx vitest run tests/unit/rewards-idempotency.spec.ts` → 4/4 pass.
  - `npx vitest run tests/smoke.test.ts` → 25/25 pass.
  - `npx tsc --noEmit --skipLibCheck` → clean (no new errors).
  - `node scripts/check-route-coverage.js` → 0 uncovered references.
- Result: pass.
- Preview URL: TBD (push branch to create Vercel preview).
- Production: not yet merged.

### `f98a3…` — feat(ops): restore unsubscribe + contact + admin reset; deprecate parallel pay paths

- Files: `app/api/unsubscribe/route.ts` (new), `app/api/contact/route.ts`
  (new), `app/api/admin/auth/reset-password/route.ts` (new),
  `app/api/checkout/route.ts`, `app/api/create-checkout/route.ts`,
  `app/api/pay/process/route.ts`, `scripts/_route-coverage-allowlist.json`,
  `scripts/check-route-coverage.js`, `tests/unit/cart-pricing.spec.ts`
  (new), `tests/unit/rewards-idempotency.spec.ts` (new).
- Risk fixed: missing customer trust-loop endpoints (CAN-SPAM unsubscribe,
  contact capture), admin password reset, REVENUE_RISK R-H2 (parallel
  payment paths competing).
- Verification: `npm run check:routes` → exit 0; vitest suite green.
- Result: pass.

<!-- new entries appended below -->

### `0605c879` — fix(unsubscribe): strict token format; reject trailing garbage after mac

- Files: `app/api/unsubscribe/route.ts`
- Risk fixed: `Buffer.from(s, 'hex')` silently truncates at the first
  invalid pair, so an attacker could append garbage to a valid token and
  it would still verify. Hardened `verifyToken` to require
  `<base64url>.<64 lowercase hex>` with no trailing characters.
- Verification: preview redeploy `gratog-n5rrhh2zz-…vercel.app` with
  bypass header — bogus mac → 400, mac too short → 400, valid mac + `xx`
  → 400, non-hex mac → 400. Contact POST still 200.
- Result: pass.
- Preview URL: https://gratog-n5rrhh2zz-theangelsilvers-projects.vercel.app
- Production: merged via ff to `main` (commit `0605c879`), deployed as
  `gratog-6himwzv35` and aliased to `tasteofgratitude.shop`.

### Production verification — `0605c879` on `tasteofgratitude.shop`

| Endpoint                                | Expected      | Actual |
| --------------------------------------- | ------------- | ------ |
| `/api/debug/square`                     | 404           | 404 ✅ |
| `/api/square/diagnose`                  | 404           | 404 ✅ |
| `/api/square/test-rest`                 | 404           | 404 ✅ |
| `/api/square/validate-token`            | 404           | 404 ✅ |
| `/api/startup`                          | 404           | 404 ✅ |
| `/api/checkout`                         | 410           | 410 ✅ |
| `/api/create-checkout`                  | 410           | 410 ✅ |
| `/api/pay/process`                      | 410           | 410 ✅ |
| `/api/admin/inventory`                  | 401           | 401 ✅ |
| `/api/admin/orders`                     | 401           | 401 ✅ |
| `/api/admin/products`                   | 401           | 401 ✅ |
| `/api/admin/customers`                  | 401           | 401 ✅ |
| `/api/admin/coupons`                    | 401           | 401 ✅ |
| `/api/cron/cleanup-abandoned-orders`    | n/a (deferred)| 404 ⚠️ |
| `POST /api/contact` (valid payload)     | 200           | 200 ✅ |
| `GET /api/unsubscribe?token=bogus`      | 400           | 400 ✅ |
| `GET /api/unsubscribe?token=<valid>.{64hex}xx` | 400    | 400 ✅ |
| `GET /`                                 | 200           | 200 ✅ |

All revenue/security-critical checks green. Cron route is deferred (Phase
7.5) — current 404 is acceptable: no exposed cron handler in prod.

### Open follow-ups before tagging `v1.0-boringly-reliable`

- [ ] Rotate `MONGODB_URI` (was echoed into earlier transcript during PTY
      automation while adding the Preview env var). Treat as compromised.
- [ ] Rotate `ADMIN_API_KEY` / `MASTER_API_KEY` per Phase 2.2 rotation
      checklist (boilerplate hardening, not a known leak).
- [ ] Run `node scripts/setup-database-indexes.js` against prod Mongo to
      apply the new reward/email/contact indexes.
- [ ] Optional: implement `app/api/cron/cleanup-abandoned-orders/route.ts`
      (Phase 7.5) once `CRON_SECRET` is set in prod.
