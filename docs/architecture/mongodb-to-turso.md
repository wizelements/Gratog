# MongoDB to Turso decision record

Status: implementation in progress; production cutover is not authorized.

Gratog is replacing its runtime MongoDB dependency with Turso to reduce operational cost and centralize relational integrity. The migration runs on native Windows with sequential, bounded batches and no WSL, Docker, VM, local Mongo server, local production-scale SQLite copy, or Turso CLI requirement.

`@tursodatabase/serverless` is the selected driver because it is fetch-only, has no native dependency, supports parameterized statements and atomic bounded batches, and fits Vercel. No ORM is introduced. `lib/db/turso.ts` is the single runtime client boundary.

Mongo `_id` values remain their string representation. Square catalog, variation, customer, order, payment, and event IDs remain unchanged external identifiers. Money is stored as integer cents; legacy dollar-valued fields are converted exactly and existing `*Cents`/Square minor-unit values are preserved. Timestamps are ISO-8601 UTC text. Queryable relationships become tables; immutable provider snapshots and low-query operational metadata may remain validated JSON.

Square remains authoritative for catalog identity and provider payment state. Turso owns application orders, customer state, local inventory policy, menus, rewards, idempotency, and provider mappings. Inventory changes and webhook side effects are protected with unique event keys. Order creation and related writes use short destination transactions.

Migration reads by `_id` with BSON-type-preserving checkpoints, defaults to batches of 100 and concurrency one, uses stable-key upserts, quarantines validation errors without values, and fingerprints canonical source records. An independent process re-reads Mongo and compares Turso provenance fingerprints.

The initial verified Mongo archive is a rollback baseline, not a live cutover snapshot. Cutover requires a final watermark, delta migration or short write freeze, independent parity, and application verification. Mongo is retained through a stabilization window; retirement is a separate explicit operation.
