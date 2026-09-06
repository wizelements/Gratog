# MongoDB to Turso cutover

## Precheck and backup verification

Verify Git SHA, target identity, free memory, Mongo reachability, backup size and SHA, archive dry-run, schema versions, and zero critical rejections.

## Source and target capture

Record source exact counts and watermark. Record target schema/version/counts. Never treat the recovery archive as the live cutover snapshot.

## Initial and delta migration

Apply schema to a positively identified staging target, migrate batches of 100 at concurrency one, reconcile, then execute the delta procedure in `mongodb-turso-delta-migration.md`. Freeze writes for collections without reliable update markers.

## Final parity and go/no-go

Require zero missing/extra critical IDs, fingerprint mismatches, financial delta, orphans, critical rejections, and status-distribution differences. Require tests, lint, typecheck, build, security review, and feature smokes. Any failure is NO-GO.

## Environment switch and deployment

Set server-only `DATABASE_PROVIDER=turso` with database-scoped credentials, deploy, and smoke-test storefront, menus, order creation without charging, admin visibility, inventory, rewards and duplicate webhooks.

## Rollback

Freeze writes. Preserve and export all Turso writes since cutover. Reconcile/replay them into Mongo before switching `DATABASE_PROVIDER=mongodb`. Never discard post-cutover orders or payments. Prefer roll-forward when reverse parity cannot be proven.

## Monitoring and retirement

Monitor database errors, latency, payment/webhook processing, inventory and order totals through the stabilization window. Mongo retirement requires a separate approval after stable operation, verified backups, and expiration of rollback need.
