# Native account and staff operations — integrated candidate

Release disposition: **HOLD. Production cutover is not authorized by this work.**

This candidate extends integrated source `9ec0f713258d7cbc5c4bfe467c8e7610a8bb5a53`, preserving its protected Preview provisioning and branch isolation. It includes the earlier work represented by PRs #41, #50 and #51 without changing production configuration.

## Implemented boundaries

- Customer registration, password login, profile, session lookup and logout use normalized Turso accounts and persistent, hashed session identifiers when Turso is selected. Single-use reset consumption rotates the password and revokes sessions in one transaction. Existing user IDs and password hashes are retained. Guest contact records are not claimed through an unverified signup email.
- Account history, favorite purchase summaries, counts, rewards, daily check-in and email preference APIs have explicit SQL branches. Check-in and reward credit share one transaction. Customer history and summaries require immutable account ownership rather than email matching.
- Administrator authorization through the primary server facade, middleware and legacy wrappers revalidates current database state and session epochs. Disable/reactivate, role changes and credential fingerprint changes cannot revive old Turso tokens. Native password login verifies current credentials again inside the transaction that persists its login audit.
- Staff inventory reads and adjustments use the existing stock ledger, optimistic versions, a durable retry key and a transactional inventory event. Checkout changes invalidate stale stock versions. A revoked administrator is denied inside the adjustment transaction, including when replaying a receipt. Historical negative stock remains visible pending reconciliation.
- Menu reads, creation, modification, activation and archival use SQL. Activation, child rows and audit receipts commit together; a missing menu cannot deactivate the current menu. Archival preserves historical identity.
- Release verification fetches successful exact-commit GitHub runs and reviewed workflow blobs, validates GitHub artifact metadata and hashes, and inspects gate payload coverage and database/schema/checkpoint bindings. Bare pass flags and arbitrary URLs cannot release production.

## Schema and migration

New migrations are `0016_admin_session_epoch.sql`, `0017_customer_identity.sql`, `0019_staff_inventory.sql` and `0020_menu_operations.sql`. The unused `0018` number remains reserved for unfinished fulfillment work and does not indicate an applied migration.

The staging schema verifier now requires every migration present in the candidate instead of silently accepting an older hard-coded prefix. Customer normalization preserves the complete users source document and rejects unresolved explicit customer links or duplicate normalized identities. Source replays cannot reactivate a newer disabled identity.

Pre-epoch administrator tokens and stateless customer tokens require a fresh password login. New durable sessions are designed to survive application restarts. Real deployed account continuity and browser lifecycle verification remain required.

## Executed validation

Reproduce the isolated SQL/security/source checks with:

```sh
node --experimental-vm-modules --test tests/migration/*.test.mjs tests/release/*.test.mjs
npm test -- --reporter=dot
npm run typecheck:ci
```

The integration workflow installs locked dependencies before dependency-backed SQL tests. Provider secrets are absent from that job. A Next.js build uses placeholder credentials and is build evidence only; it does not establish live database or customer readiness.

## Mandatory unresolved conditions

1. Many other application operations still require native routing and behavior verification. In particular, staff fulfillment/reporting and historical sync, daily market inventory, product writes, other loyalty/subscription/coupon paths and operational jobs are not certified by these adapters. Rejection of an unsupported Turso operation is a blocker, not successful migration.
2. Account welcome/reset email delivery and provider delivery-event reconciliation still require a native operational notification path and deployed proof. SQL reset consumption alone does not complete password recovery.
3. The current production Square token is not available through the on-device environment pull. A fresh authenticated Mongo catalog snapshot succeeded, but authenticated Square catalog/inventory comparison could not run. The OPEE registry reports metadata linked, vault not enrolled, no vault client and production operations disabled. No credential value was logged.
4. Schema application, fresh normalization/parity, real admin/customer browser flows, exact-deployment Square Sandbox recertification and notification delivery are not yet verified for this candidate. Earlier Sandbox certification is not inherited automatically.
5. Final production writer consistency, a current recoverable backup, full-row Turso restoration and preservation of every post-cutover mutation remain mandatory. The existing `_id` resume cursor is not an incremental change stream; the existing financial reverse replay does not cover all customer/admin/catalog/market mutations.
6. The strengthened release verifier deliberately requires genuine version-2 evidence artifacts. Existing workflows do not yet produce all required payloads; its fixture-based passing test is not release evidence. Producers must be implemented/reviewed before release authority can be issued.

The conservative import inventory may still find Mongo references inside dual-provider files. Neither that static count nor the existence of a SQL branch proves runtime exclusivity. Production stays on its existing Mongo deployment until every release condition is supported by actual evidence.
