# PREFLIGHT SNAPSHOT — Boringly Reliable Revenue Core

> Recorded immediately before executing the "boringly reliable" remediation plan.

## Branch & Commit

- **Working branch:** `fix/boringly-reliable-revenue-core` (created from `main`)
- **Base branch:** `main`
- **Base commit SHA:** `f9d20e98f60b26e47968d06f3abeb40c61464f44`
- **Known-good tag:** `known-good-before-boring-reliable` (pointing at `f9d20e98`)
- **Last commit message:** `chore: remove accidental empty route file and tmp audit output`

## Vercel Target

- **Project ID:** `prj_HnwKt5XyWC1Evcrv3mZLa3cdpDcG`
- **Org ID:** `team_HLmyvqEhI158ahAD2U1p7MxM`
- **Project name:** `gratog`
- **Production URL:** `https://gratog.com` (canonical)

## Environment Snapshot (variable NAMES only, no values)

### Present in `.env.local`

`ADMIN_DEFAULT_EMAIL`, `ADMIN_DEFAULT_PASSWORD`, `ADMIN_PHONE`, `ADMIN_SETUP_SECRET`,
`CRON_SECRET`, `DATABASE_NAME`, `FEATURE_CHECKOUT_V2`, `INIT_SECRET`, `JWT_SECRET`,
`MONGODB_URI`, `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_FULFILLMENT_DELIVERY`,
`NEXT_PUBLIC_SQUARE_APPLICATION_ID`, `NEXT_PUBLIC_SQUARE_LOCATION_ID`,
`PREORDER_STAFF_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `SQUARE_ACCESS_TOKEN`,
`SQUARE_CHAT_WEBHOOK_URL`, `SQUARE_ENVIRONMENT`, `SQUARE_LOCATION_ID`,
`SQUARE_MOCK_MODE`, `SQUARE_TEAM_EMAIL`, `SQUARE_WEBHOOK_SIGNATURE_KEY`,
`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`.

### Present in `.env.production`

Adds: `OPENAI_API_KEY`, `RESEND_WEBHOOK_SECRET`, `STAFF_EMAIL`, `SYNC_SECRET`,
`NX_DAEMON`, `TURBO_*`, `VERCEL_*` (Vercel provisioned).

### Missing / not yet rotated

- `ADMIN_API_KEY` — referenced by legacy `middleware.ts` and order-create
  rewards call. **Removed in this remediation** in favor of JWT admin sessions.
- `MASTER_API_KEY` — same. Removed.
- `RESEND_WEBHOOK_SECRET` — present in production env file, **must verify
  present in Vercel project env** before merging Phase 4 changes.

## Database Backup

- MongoDB host: Atlas cluster declared in `MONGODB_URI` (`gratog` database).
- Backup strategy: Atlas continuous cloud backup (point-in-time, default 7-day
  retention). No manual snapshot taken before this work; relying on Atlas PITR.
- Recovery RPO: ≤1 minute, RTO: ~15 minutes via Atlas restore.

## Rollback Path

1. **Application:** in Vercel UI → Deployments → promote the last known-good
   production deployment (corresponds to commit `f9d20e98`).
2. **Code:** `git checkout known-good-before-boring-reliable` and force-deploy
   if Vercel cannot promote.
3. **Database:** Atlas PITR restore to a timestamp prior to first merge of this
   branch. Only required if Phase 3 / Phase 4 writes corrupt collections.
4. **Secrets:** any rotated secret (admin session, JWT) must be reverted in
   Vercel env vars in lockstep with the code rollback.

## Test / Verification Commands

```bash
npm run check:routes      # added in Phase 1
npm run typecheck
npm test                  # vitest unit + integration
npm run test:smoke
npm run build             # production build sanity
```

## Branch Discipline

- Atomic commits using Conventional Commits (`fix:`, `feat:`, `chore:`,
  `docs:`, `test:`).
- Every commit is logged in [RESOLUTION_LOG.md](./RESOLUTION_LOG.md) with the
  files touched, the risk fixed, the test command, and the result.
- No tag of `v1.0-boringly-reliable` until production validation passes per
  Phase 9 scorecard.
