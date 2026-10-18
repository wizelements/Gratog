# One Vercel production release authority — October 18, 2026

The verified production Vercel project is Git-connected to `wizelements/Gratog` (`main`). Vercel deploys commits directly. The legacy `.github/workflows/deploy.yml` independently attempted a second production deployment with `amondnet/vercel-action@v25`, deprecated CLI v25, explicit production secrets and project IDs. It failed on GitHub run 39124478536 with `Could not retrieve Project Settings`, despite the legitimate exact-commit Vercel deployment `dpl_DYKCefr68Xu9bU2QQgUQCFLSnhM4` being READY and public browser verification passing.

**Change:** retire the duplicate publisher. `Production Closure Governance`, GitHub security scanning, the Vercel SHA-based deployment status and independent production health monitoring remain. This does not turn on Turso, migrate a database or mutate Square, Resend or real orders.

Release evidence must tie a GitHub SHA to Vercel's READY **production** deployment, domain routing and customer-safe desktop/mobile browser and health regressions. A Vercel Preview READY status alone is not production approval. This release authority remains subject to catalog, provider, recoverability, notification and Turso cutover gates.

Rollback: use the previously certified production deployment ID in Vercel, not a separate GitHub Action pushing stale assets. Preserve historical DB continuity and separately reconcile payment/refund events.
