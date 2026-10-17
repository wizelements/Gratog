# Turso recovery architecture and release law

**Status: schema/contract recovery only. No live Turso migration or deployment is authorized by these changes.**

## Branch provenance
- Current application base: `fix/vorax-recovery-integrity-20261016` (checkout release candidate, unmerged).
- Historical SQL source: `migration/mongodb-to-turso` at `6c6c5ab`.
- All 11 historical schema migrations are preserved exactly, followed by new `0012_checkout_payment_invariants.sql` for modern checkout contracts.
- Historical migration totals (851 orders, 1,209 items, $21,621.48 order value) are **not** current production parity proof.

## Observed incompatibilities
1. The old SQLite schema has no native equivalent of the latest Mongo `checkout_stock_claims`, `square_refund_entries`, unique `orders.checkoutAttemptKey`, or claimed/sent notification tracking. Migration 0012 introduces those structural boundaries but does not convert runtime handlers.
2. Production checkout still uses MongoDB transactions with snapshot reads, majority writes, conditional stock updates, and exactly-once claim semantics. These must be ported to actual Turso write transactions with conditional row counts and idempotent replay; no cross-provider transaction exists with Square.
3. Two order namespaces (`orders`, `marketorders`) and unifying reporting, unique refund IDs, webhook event deduplication, and notification retry states all need explicit model mapping. Partial source attribution is unacceptable.
4. Historical ETL scripts hardcode `taste_of_gratitude`, baseline row counts, and migration version `0003`; do not reuse in a live delta without removing those assumptions and re-verifying source identity.
5. Generic dual-writing Mongo and Turso on a payment request is **not** atomic and is not an acceptable consistency guarantee.

## Recovery tracks (parallel, but promotion sequential)
- **Model/Schema:** Inventory ownership, purchase+preorder states, payment IDs, refund ledger, webhook lifecycle, capacity limits, user/reward data, catalogs, market schedules and role permissions; prove FK/cardinality/index invariants.
- **Runtime adaptation:** Define a bounded storage abstraction with explicit Mongo and Turso implementations for each transaction. Port stock reservation/release/commit first, then order admission, idempotency/retries, signed webhook reconciliation, refunds, notification outbox, auth and analytics. No request may mix backends in a non-atomic mutation.
- **Historical and delta ETL:** Signed/checksummed read-only Mongo snapshot; immutable checkpoints, reject reports, idempotent inserts and source fingerprints; map all order histories and payment states; then incremental catch-up with sequence/watermark and reconciliation.
- **Payment authority:** Square alone is final authority on captured/refunded amounts. Reconcile stored payment IDs, currencies, refund totals and unsettled/unknown states, including orphan webhook handling.
- **Validation:** SQLite local deterministic tests plus genuine Turso staging concurrency (multi-client 24-buyer race), fault injection, simulated provider timeouts, real Square Sandbox capture/decline/partial+full refund, duplicate/out-of-order signed webhooks, Resend confirmed delivery, browser tests on mobile and desktop, authenticated admin flows, and 13 previously skipped tests.
- **Operations:** Backup/PITR restore drill, least-privilege database keys, Vercel Preview/Production separation, read-only shadow comparisons, observed latency/budgets, metrics and alerts, cutover and reverse-cutover evidence.

## Release gates (all mandatory)
G0. Freeze exact checkout commit and unrelated write paths; enumerate all Mongo collections and direct model callers with source ownership.
G1. Validate complete Turso schema including runtime migrations and indexes; local tests are not sufficient to prove remote concurrency.
G2. Migrate every active domain with zero unexplained rejects/orphans and 100% key and fingerprint equivalence.
G3. Reconcile **fresh** Mongo source snapshot and Turso: exact IDs, order/order-item counts, per-status counts, cents by source/date, unique Square IDs, paid/refunded balances, inventory by SKU, member/customer linkages.
G4. Catch up all changes since the snapshot with verified checkpoint/watermark; compare at quiescent watermark to catch writes during ETL.
G5. Prove real Turso multi-client atomic final-stock sale, idempotent retries, multi-item all-or-nothing, refund exactly once, and no duplicate notifications.
G6. Prove actual application Preview checkout->Square Sandbox->signed webhook->Turso order/inventory/email, preorder payment links, partial/full refunds, retry and cancel paths, on desktop and mobile.
G7. Run sustained, recovery, security, permission and rollback drills; verify a guaranteed route back to Mongo without losing post-cutover writes.
G8. Only then authorize controlled production freeze, final delta, production config swap and read-only acceptance; monitor and retain Mongo rollback until formally released.

## Current evidence and blockers
- 12 local migrations successfully produce 41 tables using Node's SQLite runtime (not a Turso production service).
- Structural regression: local invariant tests cover last-unit stock, idempotent replay, refund deduplication and unique notifications.
- There is **no evidence** that Turso runtime adapters, real remote writes, latest data parity, Preview database secret isolation, end-to-end Square/Turso/Resend proof or rollback drill have passed.
- Keep all production database credentials, Square keys and Vercel tokens in protected managers; never print or commit them. Staging tests must not write to production.


## October 17 — live isolated staging proof
- Authenticated A16 Turso CLI v1.0.34; isolated database `gratog-migration-cert-20261017`, separate from existing `tasteofgratitude`.
- Actual remote Turso: 41 tables, 12 recorded migrations, `PRAGMA integrity_check = ok`.
- Independently executed **24-client remote concurrency** with `@tursodatabase/serverless` transactionAsync/immediate; 1 reserved, 23 out of stock, stock 0, exactly 1 claim, idempotent replay. Refund ID, webhook ID, outbox constraints passed. Driver `run()` result field is **`changes`**, not `rowsAffected`; first staging-only harness incorrectly assumed `rowsAffected` and demonstrated an unmatched deduction; corrected and retested on a new isolated fixture. Real runtime adapter must check `changes` **inside the same transaction**.
- Latest Mongo read-only source: 59 collections, including 854 regular + 10 market orders, 40 inventory documents. Historical registry had 57; added `market_audit_log` and `menu_audit_log` as migrated operational records.
- Fresh migration dry-run: 39 classified collections, 2,641 valid documents, 0 rejected. Separate derived product projection dry-runs: 40 unified products and 51 Square catalog documents, 0 transform errors.
- Successfully staged all **2,641 classified source records** to isolated Turso: 6,575 target row operations, 0 rejects, 0 retries.
- Independent live Mongo-vs-Turso parity: 39/39 collections, 2,641 source and 2,641 matching provenance records, **0 missing/extra/fingerprint differences**, financial delta of 0 cents for regular and market orders, inventory difference 0 units. A second read-only source fingerprint matched the pre-copy digest. Both snapshots were **non-atomic reads, not a production backup**.
- **Outstanding catalog discrepancy:** Square catalog cache projection (51 items / 55 variations) was not migrated as canonical authority. Independent projection verifier found 51 missing provenance entries, 22 missing target entities, 7 mismatched entities. The 40 unified product projections did pass. Resolve ownership/pricing and catalog reconciliation before application cutover; never overwrite the unified catalog blindly.
- The current deployed checkout runtime still uses MongoDB. No production Turso cutover, payment-to-Turso E2E proof, live-source backup/PITR restore, last-delta catch-up under write freeze, nor rollback drill has occurred.

## Checkout-native Turso adapter (subsequent recovery)
- A separately injectable `lib/checkout/turso-commerce.mjs` implements Turso immediate transactions for order-bound stock reservations, all-or-nothing multi-item rollback, exact replay, proven Square decline release, committed stock claims without double debit, and provider-verified refund entry reconciliation (partial and cumulative).
- The Turso serverless driver reports affected rows as `changes`; the adapter rejects absent/non-integer write acknowledgments and rolls back the transaction.
- **Isolated real Turso staging checks PASS:** full reservation->decline release->retry->capture commit sequence; duplicate amount-tamper prevention, partial/full 1199-cent refund reconciliation, and cleanup. **24 separate Turso connections using the adapter** race for a single unit: 1 successful reservation, 23 out-of-stock, 0 exceptions, exactly 1 claim and 0 remaining stock. No real Square payment was made by these adapter tests.
- These adapter tests use runtime-only, short-lived Turso tokens; no credentials in Git. Remote test scripts refuse URLs without `TURSO_APPROVED_STAGING_NAME=gratog-migration-cert-...`. They are deliberately excluded from no-secret CI and require explicit staging auth.
- `DATABASE_PROVIDER=turso` is now **explicitly blocked** in the existing Mongo-backed `connectToDatabase()` until the application conversion and cutover certification are complete, even for cached connections. This prevents a misleading Vercel flag from silently mixing Mongo-backed payments and Turso bookkeeping. This guard is a deliberate release block that must only be replaced by a certified fully native Turso checkout router.
- The full application remains Mongo-backed: the adapter is not wired into payments, market checkout, authenticated receipts or webhooks. This is not authorization to merge PR #41 or alter production.

## Turso single-order admission
- Added `lib/checkout/turso-order-admission.mjs`: requires caller's server-priced and validated cents/line items, stores order + order items + request-fingerprint ledger in one Turso immediate transaction. A unique `orders.checkout_attempt_key` prevents duplicate admission across workers; a prior request with matching fingerprint returns the existing order while changed payload fails closed.
- Local SQLite transaction unit tests: 5/5 PASS for exact replay, mismatched amount/hash rejection, atomic rollback on missing product, invalid line totals, and ledger corruption/missing conditions.
- Real isolated staging proof: **24 separate Turso clients submitted the same checkout attempt**; 1 created, 23 reused, 0 errors; one stored order and one order item. Changed fingerprint rejected, fixtures cleaned.
- The module does NOT bypass original `priceCart`, does not call Square, and remains separate from the Mongo-backed live route. The complete order read model and all side effects (payment/webhook/customer email/staff alerts) must be ported and certified before cutover.
