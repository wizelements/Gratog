# Production Runbook

**Status**: IN-EFFECT  
**Last Updated**: 2026-06-06  
**Owner**: Taste of Gratitude engineering lane

## Overview

Operational runbook for safe Gratog/Taste of Gratitude production work from the Termux + Vercel lane.

## Deployment Lane Rules

Allowed on Termux:

- source edits
- targeted static tests
- targeted lint
- git commit/push through Gratog deploy guard
- Vercel deployment polling
- production HTTP smoke checks

Not allowed on Termux unless explicitly approved:

- local `npm run build`
- local Playwright/browser E2E
- local Lighthouse/Web Vitals
- large OOM-prone full test suites

## Pre-Deploy Checks

```bash
npm run check:route-governance
npx vitest run tests/navigation-coherence.test.ts tests/route-governance.test.ts tests/pwa-cache-governance.test.ts --reporter=verbose
ESLINT_USE_FLAT_CONFIG=false npx eslint app/rewards/page.tsx app/gratitude/rewards/page.jsx app/reviews/page.jsx 'app/(site)/community/page.tsx' app/subscriptions/page.js app/sitemap.ts lib/pwa.ts public/sw.js tests/route-governance.test.ts tests/pwa-cache-governance.test.ts
```

Use the Gratog guard for push/deploy:

```bash
bash "$HOME/.config/agents/skills/guarding-gratog-deployments/scripts/gratog-deploy-guard.sh" --target production --mode deploy --execute --skip-tests --commit-message "<message>"
```

`--skip-tests` is only acceptable here because heavy local build/browser checks are intentionally not run on the device; targeted checks must be run before guard execution.

## Post-Deploy Verification

```bash
bash scripts/verify-production-closure.sh
```

Expected unauthenticated boundaries:

- `/admin` redirects to `/admin/login`
- `/api/admin/orders` returns `401`
- `POST /api/orders` returns `410`
- unauthenticated inventory and order-status mutations return `401`

Expected retired route behavior:

- `/rewards` -> `/catalog`
- `/gratitude/rewards` -> `/catalog`
- `/reviews` -> `/catalog`
- `/community` -> `/about`
- `/subscriptions` -> `/catalog`

## Authenticated Admin Smoke

Only run with approved credentials available as environment variables. Do not print credentials.

```bash
ADMIN_EMAIL='...' ADMIN_PASSWORD='...' bash scripts/verify-production-closure.sh
```

Proves:

- admin login succeeds
- `/api/admin/auth/me` returns session user
- dashboard read APIs return `200`

## Payment Test Runbook

Real payment verification requires owner approval and browser execution.

1. Choose an approved low-cost SKU or owner-approved test product.
2. Record starting product/inventory state.
3. Complete one production checkout in a browser.
4. Record app order ID, Square payment/order ID, amount, timestamp, and customer email.
5. Verify admin order status, item quantities, total, payment status, and Square IDs.
6. Verify customer/staff emails.
7. Refresh/retry the success path and prove no duplicate charge.
8. Refund/cancel test payment if required.
9. Record evidence in `docs/production-closure-evidence-2026-06.md`.

## PWA Cache Incident Response

If stale checkout/admin behavior is reported:

1. Check production `sw.js` version.
2. Confirm `/sw.js` and `/manifest.json` have `no-cache, no-store, must-revalidate`.
3. Verify `sw.js` has no offline order replay strings.
4. If user is stuck on old SW, instruct them to unregister service worker or clear site data.
5. Bump service worker version and redeploy if code changed.

## Rollback

Rollback target must be a known Vercel deployment ID and commit SHA. After rollback, rerun `scripts/verify-production-closure.sh` and record evidence.
