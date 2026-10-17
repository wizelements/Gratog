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
