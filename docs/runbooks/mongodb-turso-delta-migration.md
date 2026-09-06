# MongoDB to Turso delta migration

1. Record a UTC migration watermark and exact Mongo counts before the initial run.
2. Run the bounded idempotent migration and independent verifier.
3. Query entities with reliable `updatedAt`/event timestamps since the watermark; use `_id` ordering only for inserts, not updates.
4. Place affected Gratog write paths in a short maintenance freeze if a collection lacks a reliable update marker.
5. Capture a final watermark, rerun changed entities with stable-key upserts, and verify IDs, fingerprints, financial aggregates, relationships, and status distributions.
6. Switch configuration only after zero unexplained critical differences.

Rollback after Turso accepts production writes requires freezing writes, exporting the Turso change ledger since cutover, replaying those changes into Mongo with business-specific validation, independently reconciling, and only then switching back. If reverse reconciliation cannot be proven, roll-forward repair is safer than a blind provider switch.
