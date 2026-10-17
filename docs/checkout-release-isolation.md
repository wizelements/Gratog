# Taste of Gratitude checkout release gate (October 17, 2026)

## Preview is denied until the database target is verified

At runtime, Vercel Preview requires an **explicit** `PREVIEW_MONGODB_DATABASE_NAME` (for example `gratog_preview`).
The name must end in `_preview`, `_staging`, `_sandbox` or `_test`. The shared connector rejects
any actual connected MongoDB database whose name does not exactly match this expected value.
User authentication now uses this same connector. A missing or mismatched variable fails closed.

**This is only an execution safeguard, not independent proof of isolation.** Before any stateful
Preview test, an authorized administrator must independently verify the Vercel Preview
`MONGODB_URI` points to a dedicated preview database, and that Production `MONGODB_URI`
selects a different database (ideally a different database user and cluster). Restrict database
permissions so Preview credentials have no access to Production collections. Do not copy a
Production MongoDB URI into Preview and merely change the expected database name.

Vercel API currently returns 403 for listing project variables, and the available
GratitudePC Vercel CLI has no login. These facts block independent verification.

## Square protection

Square Preview requests must use `SQUARE_ENVIRONMENT=sandbox`. The common Square
SDK refuses recognized production access tokens when configured for Sandbox.
A protected GitHub Actions sandbox run proved actual provider-side payment, rejection,
idempotency and refund, but does not prove the deployed application callbacks.

## Remaining release acceptance

1. Independently verify Vercel Preview and Production DB identities, cluster access grants,
   the active deployment commit, and Square/environment variables without publishing secrets.
2. End-to-end test a real Square sandbox purchase created **through Preview** with its own
   isolated order, Square transaction, signed webhook, inventory claim and notification records.
   Test a genuine decline, partial/full refund, webhook retries, and regular & market orders.
3. Run browser tests (mobile/desktop) against that exact deployed SHA. The CI checkout browser
   suite uses mocked payment routes and does not count as an actual provider flow.
4. Verify database indexes and migration readiness; resolve webhook orphan events and
   notification delivery failures; confirm production rollback plan.
5. Keep PR #35 draft and do **not** promote production until all acceptance evidence is green.

Production orders and funds must never be used as fixtures for certification.
