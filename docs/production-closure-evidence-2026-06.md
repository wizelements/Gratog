# Production Closure Evidence — June 2026

**Status**: COMPLETE FOR PHASE 7/8/9 CLOSURE SCOPE
**Last Updated**: 2026-06-06
**Owner**: Taste of Gratitude engineering lane

## Overview

Evidence ledger for the Gratog/Taste of Gratitude production closure pass. A surface is not considered closed unless the evidence below proves it by source test, deployment state, and production HTTP/runtime verification where applicable.

## Production Baseline

| Item | Value |
| --- | --- |
| Production URL | `https://tasteofgratitude.shop` |
| Previous verified commit | `9337583b2c19f475167457aad969463f31c935a2` |
| Previous verified Vercel deployment | `dpl_8inNwGYFqcE5rYeptwDu4Mu2yvtC` |
| Closure code commit | `701d9cb309f8d274e1a80e3a1649dd229ddb3e7c` |
| Closure edge-fix commit | `c357a5fb3fb19114767df5bbff49627d77a26e06` |
| Closure evidence commit | `6fbd16914e9d164559f3791c4b767869ec4be9c6` |
| Admin auth normalization commit | `6e387f53092b78b0b63d4879aec47587d4c7fac3` |
| Final verified Vercel deployment | `dpl_8WqGk4WYRW1dPdDsAABnc5HWpM4y` |
| Execution lane | Android Termux + Vercel HTTP verification |
| Local build/browser policy | No local device build, no local Lighthouse, no local browser E2E |

## Already-Proven Before This Closure Pass

- `/`, `/menu`, `/catalog`, `/markets`, `/checkout`, `/admin/login`, `/api/health`, `/sw.js`, `/manifest.json` returned `200` on production.
- `/admin` redirected to `/admin/login` without a session.
- Unauthenticated `/api/admin/orders` and `/api/admin/products` returned `401`.
- Legacy public `POST /api/orders` returned `410`.
- Unauthenticated inventory and order-status mutations returned `401`.

## Closure Changes To Verify

| Closure Area | Required Evidence | Status |
| --- | --- | --- |
| Retired legacy pages | `/rewards`, `/gratitude/rewards`, `/reviews`, `/community`, `/subscriptions` redirect to canonical routes | Production HTTP passed |
| Sitemap cleanup | Production sitemap contains no retired routes | Production HTTP passed |
| PWA order safety | `sw.js` has no offline order replay and has closure cache version | Production HTTP passed |
| PWA network truth | Checkout/admin/order/payment/inventory/account surfaces are never runtime/API cached | Source tests passed |
| Route/API governance | Manifest and tests classify retired routes and critical APIs | Source tests passed |
| Deployment governance | CI/static gate exists and deployment guard passes | Passed |
| Skill governance | AMP skill format untouched; governance remains external overlay | Passed |
| Authenticated admin | Login/session/admin API read smoke with cookie jar | Production HTTP passed with Vercel-pulled admin credentials |

## Commands For This Pass

```bash
npm run check:route-governance
npm run check:routes
NODE_OPTIONS='--max-old-space-size=1024' npm run typecheck:ci
npx vitest run tests/navigation-coherence.test.ts tests/route-governance.test.ts tests/pwa-cache-governance.test.ts --reporter=verbose
bash scripts/verify-production-closure.sh
```

## Source Verification Evidence

- `node --check public/sw.js` passed.
- `bash -n scripts/verify-production-closure.sh` passed.
- `git diff --check` passed.
- Targeted ESLint on original closure files passed with 0 errors; direct ESLint for the later admin auth patch is blocked by the repo's ESLint 9 flat-config migration, so auth patch verification used `git diff --check`, TypeScript, governance tests, Vercel build, and production HTTP smoke.
- `npm run check:routes` passed with `uncoveredReferences: 0`.
- `NODE_OPTIONS='--max-old-space-size=1024' npm run typecheck:ci` passed after admin auth normalization.
- `npm run check:route-governance` passed: 2 files, 11 tests before edge-fix and 12 tests after edge-fix.
- `npx vitest run tests/navigation-coherence.test.ts tests/route-governance.test.ts tests/pwa-cache-governance.test.ts --reporter=verbose` passed: 3 files, 23 tests after edge-fix.

## Deployment Evidence

- Gratog deploy guard passed for `701d9cb3` with PWA/SW version coherence `20260606-closure`; local heavy checks skipped by policy after targeted checks passed.
- Vercel deployed `701d9cb3` as `dpl_3Zo4csFp9NwXcdvRrQqtEDPkoBLU`; production verification found real blockers: retired routes returned `200` with `NEXT_REDIRECT` payload and SW/manifest headers were `public, max-age=0, must-revalidate`.
- Root cause: page-level `permanentRedirect()` was not sufficient HTTP truth for these statically generated surfaces, and `vercel.json` header rules overrode `next.config.js` no-store values.
- Edge fix `c357a5fb` added explicit Vercel/Next redirects and no-store Vercel headers.
- Vercel deployed `c357a5fb` as `dpl_3FgCc8nh9zLPDDgcFKXvfUwC3ftN`; alias `https://tasteofgratitude.shop` assigned.
- Evidence commit `6fbd1691` preserved closure proof and passed GitHub `Production Closure Governance` and `Security Scanning`.
- Admin auth normalization `6e387f53` fixed production admin JWTs missing `id` when legacy admin records have `_id` but no custom `id` field.
- Vercel deployed `6e387f53` as `dpl_8WqGk4WYRW1dPdDsAABnc5HWpM4y`; alias `https://tasteofgratitude.shop` assigned.
- GitHub Actions for `6e387f53` passed: `Production Closure Governance` and `Security Scanning`.

## Final Production HTTP Evidence

`bash scripts/verify-production-closure.sh` passed on `https://tasteofgratitude.shop`:

- Public smoke `200`: `/`, `/menu`, `/catalog`, `/markets`, `/checkout`, `/admin/login`, `/api/health`, `/sw.js`, `/manifest.json`.
- Retired routes `308`: `/rewards -> /catalog`, `/gratitude/rewards -> /catalog`, `/reviews -> /catalog`, `/community -> /about`, `/subscriptions -> /catalog`.
- Mutation/auth boundaries: `POST /api/orders -> 410`, unauth `POST /api/inventory -> 401`, unauth order-status patch `-> 401`, unauth `/api/admin/orders -> 401`, `/admin` redirects to login.
- Sitemap excludes retired routes.
- `sw.js` contains `v13-20260606-closure` and no offline order replay strings.
- `sw.js` and `manifest.json` return `no-cache, no-store, must-revalidate`.
- Authenticated admin smoke using Vercel-pulled credentials passed: login `200`, `/api/admin/auth/me -> 200`, `/api/admin/orders?limit=1 -> 200`, `/api/admin/products?limit=1 -> 200`, `/api/admin/menus -> 200`, `/api/admin/markets -> 200`.

## Skill Governance Evidence

- `~/.config/agents/skill-governance/registry-overlay.json` parsed as valid JSON.
- 39 scanned custom skills had 0 native frontmatter regressions.

## Explicitly Unavailable On This Lane

- Lighthouse/Web Vitals: not run on mobile Termux.
- Browser E2E: not run on mobile Termux.
- Real payment UI flow: requires owner-approved browser execution and Square evidence.
- Payment capture/refund/live Square settlement: not exercised in this closure pass.

## Changelog

- 2026-06-06: Created ledger for full closure pass.
- 2026-06-06: Added final Vercel production evidence for authenticated admin smoke and admin session-id normalization.
