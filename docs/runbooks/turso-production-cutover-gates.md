# Taste of Gratitude Turso production release law
October 17, 2026 — PR #41 is **draft**; operational cutover is prohibited.

## Authority
- Existing live domain: https://tasteofgratitude.shop
- Current public application remains on MongoDB (the Turso toggle intentionally refuses to activate).
- Isolated Turso: `gratog-migration-cert-20261017` (staging ONLY)
- Good Square Sandbox/Turso provider transaction evidence: GitHub run 39048085038, 14/14 backend checks.
- Read-only public desktop/mobile browser proof: GitHub run 39051086748, 12/12 tests against the current Mongo storefront.
- Latest recovered branch SHA is pinned in PR #41 and **must be freshly retested** after every commit.

## Confirmed gaps — NO GO
1. Public Preview health is `degraded`: Preview database isolation denies Mongo access. Do not bypass the guard or point Preview at production Mongo.
2. Checkout routes, market preorder, subscriptions/rewards, webhook order lookup, and receipts are not fully Turso-native. Database adapters in PR #41 are independent modules, not live routing.
3. Real Square Sandbox charge/refund succeeded against Turso staging, but signed HTTP webhook delivery to the exact deployed Preview callback has not been verified.
4. Resend sending domain `tasteofgratitude.shop` is verified; **no recent real customer/staff notification delivery proof** is available (no sends in the checked window).
5. Square catalog identity conflict: one Square ID is attributed to Pineapple Mango Lemonade in the unified catalog and Vitamin Sea in the Square cache; another conflicts on Sweet Potato Chai. No mutation or automatic name correction is permitted before authoritative Square catalog readback.
6. Historical source-staging parity is a non-atomic read; last delta under production write freeze and restored production backup/PITR must be proved.
7. Production rollback of Vercel code **alone** does not restore post-cutover orders/payments into Mongo; reverse-delta must reconcile captured/refunded Square payments before rollback is safe.
8. All 13 skipped tests need independent disposition.

## Exact preflight and rollback procedure
1. Freeze exact application SHA. Independent operator verifies signed evidence artifacts and hashes; set `GITHUB_SHA` for `node scripts/release/check-turso-cutover.mjs <evidence.json>`. Fail closed on any missing or stale evidence.
2. Capture read-only Mongo source snapshot and a **tested, restorable** consistent backup/PITR checkpoint (not just row counts), provider payment and refund watermarks, Turso schema version and query indexes.
3. Verify dedicated, least-privileged Turso Preview and production identities, inbound signed webhook endpoint with per-subscription key, shipping/Georgia restrictions, and verified catalog IDs and amounts.
4. Perform real isolated Preview checkout->Square Sandbox capture->signed event->order/inventory->customer and staff delivery->refund; reconcile Web Payments and hosted market-payment-link flows; desktop/mobile and admin sign-in.
5. Test reverse-delta in an isolated restore clone. If Mongo cannot safely ingest any Turso writes made after the cutover, **do not cut over**.
6. Only after a fresh full source/destination equivalence check at a write-freeze watermark, perform the supervised production migration and independently check status, live order counts, refund ledger, inventory, staff notifications, and domain routing.
7. Keep the known-good Vercel production deployment ID pinned and Mongo live/available through the rollback window. To roll back code use Vercel's authenticated rollback control to the exact tested deployment (e.g., via `vercel rollback` with the pinned deployment ID). Before accepting rollback as successful, reconcile any Turso-originated Square captures/refunds and changed orders into Mongo; never simply switch code while customer data diverges.
8. Re-run production-safe browser tests, health endpoints, webhook signature rejection, and duplicate-payment defenses. No live financial test charges or refunds in Production.

## Production deployment baseline, inspected read-only
- Current READY production deployment: `dpl_DhzW3hwdJ8JMPvVsDh2q2iDdz8yY`, main commit `64d5c7f621a391ba650b9113d7c03338699b8073` (workflow registration only).
- Earlier READY code rollback candidate: `dpl_AYvcChAGH1orR54Eb2LyvLkFGp4k`, main commit `52369ebc4428617ec03c6d414784eb1e59332019`.
- These are **candidate availability** checks, NOT a performed rollback or proof that reverting the code can recover orders after a database cutover.

## No false completion
Passing local SQLite or direct Square Sandbox tests alone does not authorize a customer-facing deployment. The mechanical release gate refuses absent/partial evidence, and the existing `DATABASE_PROVIDER=turso` guard remains on until complete certified routing exists.

## October 17 follow-up — isolated HTTP buyer adapters and restoration evidence

Latest feature-branch additions are **not production cutover certification**.
They implement an opt-in Preview-specific HTTP buyer path behind
`DATABASE_PROVIDER=turso`, `VERCEL_ENV=preview`, and an exact
`VERCEL_GIT_COMMIT_REF=feat/turso-checkout-recovery-20261017` check.
`TURSO_STAGING_DATABASE_URL` is bound to that branch only, and the runtime
requires a dedicated `TURSO_STAGING_AUTH_TOKEN`; no production Turso token
can satisfy its database-host identity guard.

The Preview-only buyer path now uses Turso for server-side price verification,
idempotent order creation, stock reservation, Sandbox Square order/payment
readback, payment finalization, guest payment-status checks, and signed
Square-event reconciliation. It queues customer/staff notices exactly once
and sends **QA-only** messages to Resend's test recipient when configured.
Provider acceptance is not the same as confirmed delivery.

**Important limitations, fail-closed rather than waived:**
- The Vercel branch-scoped staging token and explicit Preview provider toggle
  have not been certified. Use `GET /api/certification/turso-ready` on the
  exact branch Preview to assess isolated Turso readback and Square Sandbox
  identity without touching production. HTTP readiness does not certify pay/refund.
- Real production Square catalog authority is still unresolved. Initial Preview
  buyer availability is deliberately restricted to two independently observed
  $11.99 variations (Strawberry Bliss and Pineapple Mango Lemonade). Other items
  may be displayed but cannot pass protected server-side payment validation.
- Blue Lotus 16oz has a staging product variation at 3600 cents but staging
  current inventory is **-6**; provider was earlier observed at 3500 cents.
  It must remain unavailable. Do not turn negative counts into fictitious stock.
- Square ID F2YVC7OVRYJU575JXROKFHFT has a name/provenance conflict
  (Vitamin Sea vs Pineapple Mango). It must never be auto-reconciled by name.
- Preview delivery, shipping, promotions, market preorders, membership, rewards,
  refunds initiated by a logged-in administrator, and all remaining Mongo
  reader/admin routes are **not** Turso-native yet.
- The real Square Sandbox subscription currently targets the separate
  `fix/vorax-recovery...` Preview, not the Turso feature branch. The read-only
  subscription gate rightly fails on a mismatched target; no provider-signed
  callback to the Turso Preview can be claimed.
- Resend QA-only sends are accepted if configured, but durable delivered-state
  correlation to the payment/order and live customer/staff inboxes are not certified.

### Recovery and skipped-suite evidence

A disposable Turso branch clone of `gratog-migration-cert-20261017`
was created, compared to its source, tested with a clone-only schema/write
canary, and removed. The restore verification passed for 864 orders, 40
products, three payment records, 2,303,702 historical order cents, and 93
aggregate stock units; SQLite integrity was `ok`. Evidence:
`test-results/turso-staging-restore-drill.json`. This is **not Mongo
PITR**, not consistent live Mongo source backup, and not reverse-delta
cutover recovery. The latter must still be tested on an isolated Mongo
restore clone using actual post-cutover Square payment/refund IDs.

The original 13 Vitest skips were inventoried. One nonexistent WhatsNewModal
SSR test has been replaced by an active regression forbidding references
to the removed component. Twelve remain blocked: seven customer reviews
API flow tests and five genuine Mongo replica-set concurrency tests.
Evidence: `test-results/turso-skipped-test-inventory.json`. Do not set
`skippedTests.pass=true` until the remaining functionality is enabled and
proved or a formally justified product exclusion is recorded.

The production rollback candidate must be re-inspected immediately before
the final approval. Never use the historical deployment IDs earlier in this
runbook without refreshing current Vercel state.
