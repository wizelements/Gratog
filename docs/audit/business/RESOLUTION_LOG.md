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
