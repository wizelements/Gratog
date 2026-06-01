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
      **Explicitly deferred for the 2026-06-01 release verification per
      operator instruction "without rotating Mongo credentials".**
- [x] ~~Rotate `ADMIN_API_KEY` / `MASTER_API_KEY` per Phase 2.2 rotation
      checklist~~. **No rotation needed** — 2026-06-01 audit shows these
      env vars are not present in Vercel production. All remaining code
      references are dead code or fail-closed under `undefined`. See
      [ADMIN_KEY_AUDIT.md](./ADMIN_KEY_AUDIT.md).
- [x] Run `node scripts/setup-database-indexes.js` against prod Mongo to
      apply the new reward/email/contact indexes — **done 2026-06-01**.
      See [MONGO_INDEX_VERIFICATION.md](./MONGO_INDEX_VERIFICATION.md).
- [ ] Optional: implement `app/api/cron/cleanup-abandoned-orders/route.ts`
      (Phase 7.5) once `CRON_SECRET` is set in prod.

### 2026-06-01 — v1.0-boringly-reliable verification cycle (Amp)

- **Production deployment under test:** `gratog-6himwzv35`
- **Production commit under test:** `0605c879`
- **Docs commit prior:** `46e49df6`
- **Result:** **TAG NOT CUT.** Two blockers identified — see
  [FINAL_SCORECARD.md](./FINAL_SCORECARD.md).
- **Cleared:** admin key audit (ADMIN_KEY_AUDIT.md), index verification
  (MONGO_INDEX_VERIFICATION.md), post-index curl matrix
  (SECURITY_CURL_MATRIX.md and FINAL_VALIDATION_REPORT.md), LTV audit
  (CUSTOMER_LTV_BACKFILL_REPORT.md), rollback documentation
  (ROLLBACK_DRILL.md and RUNBOOK.md).
- **Both blockers cleared 2026-06-01 (later same day):**
  1. Operator updated the DKIM TXT record at Namecheap; Resend
     re-verified `tasteofgratitude.shop`. Control + production
     `email_sends` rows now show `status: "sent"` with messageIds
     `9ea7df01-…`, `f6590daf-…`, `72ef97c9-…`.
  2. Real live order placed:
     `0ca234e0-eb0b-4397-82f6-bfa14bf4f81f` (order# `F4F81F`, 1× Kissed
     by Gods @ $11.99). `paidEffectsAppliedAt` set exactly once; one
     `reward_transactions` row (12 pts); one `email_sends` row
     (`status: "sent"`); one `payment_records` row (COMPLETED);
     `customers.totalOrders=1`, `totalSpent=11.99`. Square
     `payment.updated` webhook replayed against
     `/api/webhooks/square` → all counters unchanged
     (idempotency confirmed).

### 2026-06-01 — Defects discovered + fixed during live verification

- `e1a1576a` — fix(db): expose native MongoClient so withTransaction /
  endSession work. Without this, every `POST /api/orders/create` 500'd
  with `d.endSession is not a function`. Root cause: mongoose 8's
  `Connection.startSession` returns a Promise; we were treating it as
  sync.
- `a498b0cf` — fix(payments): restore inline `createSquareOrder` block.
  The boringly-reliable revenue-core refactor removed the only Square
  order creation site while still demanding `squareOrderId` on the
  order. Every payment attempt 409'd with `MISSING_SQUARE_ORDER_ID`.
  Restored from `00db3847`, with Square line items now built from the
  stored server-priced `order.items` (not client lineItems) so
  server-authoritative pricing is preserved.

### Tag

`v1.0-boringly-reliable` cut on commit `a498b0cf`.
