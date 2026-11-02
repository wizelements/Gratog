# Turso application routing audit — 2026-10-18

**Release decision: HOLD.** Source commit audited: `8e21c66f33c5849d409f02b5635514dcabc34ed1` on `feat/turso-checkout-recovery-20261017`.

## Reproducible source inventory

```bash
node scripts/release/inventory-turso-routing.mjs --out migration-artifacts/turso-route-audit-20261018.json
node scripts/release/inventory-turso-routing.mjs --strict  # must exit 2 until all routes are reviewed
node --test tests/release/turso-routing-inventory.test.mjs
```

The conservative source/import graph inspects 748 source files and identifies:

| Entry points and dependencies | Count |
| --- | ---: |
| Next.js API routes | 142 |
| Pages | 93 |
| Layout/template/default candidates | 12 |
| Middleware | 1 |
| Configured Vercel cron jobs | 6 |
| Entrypoints with reachable MongoDB references | 115 |
| Turso-reachable entries not certified as Turso-only | 1 |
| Entrypoints without statically demonstrable database authority | 132 |
| Unresolved local import references across entrypoint graphs | 116 |

The separate literal collection-call scanner found **712 Mongo collection handles**, including **359 reads** and **346 writes**; **162 calls** were dynamic or lacked a reliable literal collection/mode classification. These are *static findings*, not a list of uniquely executed database operations. The counts must not be interpreted as production traffic measurements.

The highest-risk remaining conversion surfaces include the Square payment webhook, payment creation, preorder, customer and admin order management, product/inventory writes, rewards, notifications, and cron jobs. Each requires independent Turso read/write, authorization, transaction/idempotency and behavioral verification.

## Source-truth limitations

- This is a fail-closed **discovery** instrument, not evidence that a route actually runs under Turso. Statically Turso-reachable does not mean Turso-only. Absence of detected Mongo calls does not mean migrated.
- Dynamic imports, injected dependencies, shell jobs outside the Next.js tree, runtime flags, external integrations and unlisted schedules require manual tracing and executed tests.
- The 116 unresolved relative/alias references are open audit items, not automatically incorrect application imports.
- All webhook, cron, checkout, browser, notification, inventory and administration branches must be tested independently against one frozen deployment commit.
- The pre-existing production checkout cutover guard must remain effective. Do **not** remove it by changing `DATABASE_PROVIDER`.
- No production data or Square catalog was modified by this inspection.

## Gate handoff

A separate deployed Preview Sandbox test at the same source SHA recorded HTTP checkout, $11.99 Square payment, signed webhook handling, full refund, and two Resend delivery receipts. The branch's existing restore evidence includes 59-source-collection encrypted snapshot and 7,919-document isolated restore. These narrower proofs do **not** satisfy application routing, fresh cutover-watermark parity, live production catalog authority, full desktop/mobile checkout coverage, or a completed reverse-delta rollback.

The independently generated catalog discrepancy report has `releaseSafe=false`: 46 products with findings. It requires owner/provider-backed dispositions without blind Square production mutations.

**No merge, Turso production provider activation, production promotion or MongoDB retirement is authorized by this audit.**
