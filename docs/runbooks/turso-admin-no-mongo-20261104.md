# Taste of Gratitude — Turso-native administrator recovery

Date: 2026-11-04. Target: https://tasteofgratitude.shop. Owner: Cod3BlackAgency.

## Why this change exists
MongoDB is no longer an available operating dependency. The previous admin login, password reset, setup, logout, and CSRF flows used MongoDB (often indirectly via legacy helpers). A successful email-provider setup did not make those password resets usable.

## New isolated admin capability
- Server-side Turso via TURSO_DATABASE_URL + TURSO_AUTH_TOKEN and @libsql/client.
- Serverless-compatible schema initialization: tog_admin_users, tog_admin_resets, tog_admin_audit, and tog_admin_login_limits.
- Two pre-approved administrator inboxes: silverwatkins@gmail.com and jenneisha.glover@gmail.com. New records have **no password** until claimed by the receiving owner via a private, single-use reset link.
- Public admin setup POST is disabled; arbitrary signup is never allowed.
- Account login, /me, CSRF, logout, password changes and recovery never open a MongoDB connection.
- Passwords use bcrypt cost 12; recovery tokens use cryptographic random bytes and SHA-256 hashes.
- Each reset link expires in 30 minutes; token consumption and password modification run in a database write transaction. Issuing is throttled per account in Turso.
- An admin JWT carries sessionVersion. Every protected admin request is revalidated in Turso by ID, email, role, active state, and session version. Rotating a password revokes old JWTs and legacy no-epoch JWTs.
- Reset messages go directly to verified Resend sender support@tasteofgratitude.shop. No mock delivery and no MongoDB email logging. A provider-accepted message is **not** proof of final inbox delivery.
- Reset URLs are created only from the canonical trusted HTTPS origin; request Host/Origin headers cannot control the link.
- Admin dashboard displays unavailable instead of fabricated zero when Mongo-dependent business APIs are inaccessible.

## Config and release conditions
The production Vercel project already lists TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, JWT_SECRET, and RESEND_API_KEY. Their secret values were not available for external readback. Do not use the known migration-cert/staging database as production; the runtime rejects a matching hostname.

1. On an isolated candidate, run node --test tests/turso-admin-recovery.test.mjs, npm run typecheck:ci, and npm run build.
2. Stage a deployment with production environment but without domain assignment; invoke a harmless reset request for a non-admin email. A generic 200 response proves the new Turso connection and idempotent bootstrap completed without sending an email.
3. Confirm the Turso production database is the correct isolated database. Request resets separately for the two owner inboxes.
4. Confirm a provider message ID, final delivery when available, private link consumption, unique password login, and session-revocation behavior.
5. Promote only the tested staged production deployment and repeat the checks on tasteofgratitude.shop. Keep the previous Vercel deployment ID for rollback.

## Business data limitation: not a completed full-site cutover
A route scan of main before this change found 87 API route files still referencing MongoDB, 26 of them under app/api/admin. Live admin orders and products are among them. This release isolates **admin account authentication and recovery**, but DOES NOT recover historical MongoDB orders, customer profiles, legacy stock records, or other merchant data. Existing Turso migration branches contain partial adapters and proof against isolated Turso; they are not production equivalence proof. Do not claim "zero orders" where a provider is unreachable. Do not run live Square charges/refunds as migration tests, and do not automatically write replacement stock or reverse-delta estimates.

## Operational recovery
A past administrator password hash cannot be reconstructed without the inaccessible source. The two allowlisted email-controlled new account records provide a secure new-account recovery path, rather than a fictitious database transfer. If production Turso credentials are absent or point to a staging database, the admin system fails closed and directs operators to restore the appropriate Vercel Turso connection. Do not fall back to MongoDB.
