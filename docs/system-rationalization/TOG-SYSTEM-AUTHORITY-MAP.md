# TOG-SYSTEM-AUTHORITY-MAP.md

Taste of Gratitude — System Authority and Runtime Baseline

Generated: 2026-07-29 18:45 EDT
Authority: Native Termux workspace

---

## 1. Runtime Authority

- **Operating environment:** Native Termux (Android/Linux, aarch64)
- **User:** u0_a342
- **HOME:** /data/data/com.termux/files/home
- **OpenClaw workspace:** /data/data/com.termux/files/home/.openclaw/workspace
- **Canonical project checkout:** /data/data/com.termux/files/home/.openclaw/workspace/Gratog
- **PRoot mirror:** /root/.openclaw/workspace/Gratog (currently read-only, not authoritative)

Per SESSION_BRIEFING.md and ACTIVE_CONTEXT.md, all Taste of Gratitude runtime authority, edits, and verification must use the Termux path. PRoot is a non-authoritative coding mirror only.

---

## 2. Source Control Authority

| Field | Value |
|-------|-------|
| Canonical repository | https://github.com/wizelements/Gratog.git |
| Local checkout | /data/data/com.termux/files/home/.openclaw/workspace/Gratog |
| Default branch | main |
| Active local branch | main |
| Local HEAD | f57c65270170ce98f54eb9b0066aa58c782f9da1 |
| origin/main | f57c65270170ce98f54eb9b0066aa58c782f9da1 |
| Local vs origin | synced |
| Git dirty state | yes (`gitDirty: 1` in Vercel metadata) |

## 3. Commit History (recent)

```
f57c6527 (HEAD -> main, origin/main, origin/HEAD) docs(audit): MongoDB menus verification report for 2026-07-28
6145c3da Merge branch 'fix/tog-commerce-truth-alignment' into main — commerce truth alignment
7d5d90d4 fix(tog): commerce truth alignment — sanitize wellness language, fix product IDs/Square URLs, filter inactive products, SSR markets
64e5571e fix(types): resolve TypeScript errors in fresh-batch system
2c707a75 chore: clean up debug test files, fix test assertions for content and admin transitions
2dbf1f23 fix(content): remove health-oriented public labels and unused wellnessSupport field
79306165 fix(admin): remove requireAdminSession from setup and emergency-init routes
b218242b fix(fresh-batch): remove SMS consent from request flow
060490c2 feat(admin): add state-machine guards, audit log, idempotency, Square webhook, and admin tests
49c67804 docs(admin): add admin verification verdict
be1dfe72 docs(admin): add control-plane, traceability, state-machine, permissions, and data-integrity audits
```

## 4. Working Tree State

### Modified files (10)
- `app/api/cron/cleanup-abandoned-orders/route.ts`
- `app/api/markets/warm/route.ts`
- `app/page.js`
- `app/weekly-menu/page.tsx`
- `components/home/HomePageClient.jsx`
- `data/weeklyMenu.ts`
- `lib/menus/schema.ts`
- `package-lock.json`
- `scripts/tog-funnel-check.js`
- `vercel.json`

### Notable untracked files
- Audit reports: `TOG-ALERTS-VERIFICATION-2026-07-28.md`, `TOG-CATALOG-VERIFICATION-2026-07-28.md`, `TOG-PAYMENT-VERIFICATION-2026-07-28.md`, `TOG-PERFORMANCE-VERIFICATION-2026-07-28.md`, `TOG-MONGODB-VERIFICATION-2026-07-28.md`
- Debug/diagnostic JSONs: `catalog.json`, `create-order.json`, `debug-square.json`, `diagnose-square.json`, `health-payments.json`, `order-response.json`, `payment-request.json`, `payment-response.json`, `square-config.json`, `square-test-rest.json`, `storefront-catalog.json`, `validate-token.json`
- Sanitization scripts: `api/sanitize-mongo.js`, `app/api/admin/sanitize-products/route.ts`, `app/api/admin/sanitize/route.ts`, `sanitize-mongo-direct.mjs`, `scripts/sanitize-mongo-products.mjs`, `scripts/mongo-check.mjs`, `scripts/archive-expired-menus.ts`
- Token-status routes: `app/api/admin/token-status/route.ts`, `app/api/token-status/route.ts`
- Legacy `pages/api/menu.ts`
- New menu modules: `lib/menu-schema.ts`, `lib/menus/week-utils.ts`, `lib/weekly-menu.ts`
- New docs: `docs/business/TASTE-OF-GRATITUDE-PURPOSE.md`

### Observations
- The working tree contains substantial uncommitted audit, sanitization, and diagnostic artifacts from the 2026-07-28 verification pass.
- These files must be preserved and classified during rationalization; they are not currently part of the committed baseline.
- `package-lock.json` is modified with ~7,500 line changes and should be reconciled before any deployment.

## 5. Deployment Authority

| Field | Value |
|-------|-------|
| Vercel scope | theangelsilvers-projects |
| Vercel project | gratog |
| Vercel project ID | prj_HnwKt5XyWC1Evcrv3mZLa3cdpDcG |
| Framework | nextjs |
| Git link | GitHub / wizelements / Gratog |
| Production domain | https://tasteofgratitude.shop |
| Production deployment ID | dpl_5YfkFjmke2qxYa5tG2jgweaimDX2 |
| Production deployment URL | https://gratog-o068el5iq-theangelsilvers-projects.vercel.app |
| Production status | READY |
| Production commit | f57c65270170ce98f54eb9b0066aa58c782f9da1 |
| Production created | 2026-07-28 18:01:59 EDT |
| Aliases | tasteofgratitude.shop, gratog.vercel.app, taste-og.vercel.app, gratog-theangelsilvers-projects.vercel.app, gratog-git-main-theangelsilvers-projects.vercel.app |

### Deployment health note
- Last 50 Vercel deployments: 30 in `ERROR`, 20 in `READY`.
- Most recent `READY` production deployment is `dpl_5YfkFjmke2qxYa5tG2jgweaimDX2` (f57c6527).
- Subsequent production-targeted deployments are failing. The public domain is currently served by the last successful build.
- This is a P0 risk: the repository may not be deployable from HEAD without repair.

## 6. Provider Authority

| Provider | Purpose | Authority Status |
|----------|---------|------------------|
| Square | Payments, catalog, orders | Active production environment referenced |
| Resend | Transactional and marketing email | Active |
| MongoDB | Application database | Active (MONGODB_URI configured) |
| Vercel | Hosting, serverless functions, cron | Active |
| Telegram | Owner alerts | Active (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID configured) |
| Redis / Upstash | Caching, idempotency, queue | Referenced but unverified usage |
| Sentry | Error tracking | Referenced (NEXT_PUBLIC_SENTRY_DSN, SENTRY_AUTH_TOKEN) |
| PostHog | Product analytics | Referenced (NEXT_PUBLIC_POSTHOG_KEY) |
| Google Analytics | Web analytics | Referenced (NEXT_PUBLIC_GTAG_ID / NEXT_PUBLIC_GA_ID) |
| Instagram | Social integration | Referenced (INSTAGRAM_ACCESS_TOKEN) |
| ShipEngine / EasyPost | Shipping rates | Referenced but unverified |
| Twilio | SMS | Code references remain; .env.example notes Twilio removed; likely inactive |
| Stripe | Subscription placeholders | Referenced but unverified |
| OpenAI | AI newsletter / content | Referenced (OPENAI_API_KEY) |

## 7. Database Authority

- **Primary database:** MongoDB (MONGODB_URI / MONGO_URL)
- **Database name:** DATABASE_NAME or DB_NAME
- **ORM/ODM:** Mongoose (lib/models has only QueuePosition.js; most schemas appear inline or in lib/db-*.js files)
- **Status:** Active but schema drift is suspected. Recent audit/sanitization scripts indicate legacy collections and product/menu data may need reconciliation.

## 8. Product Authority

- **Primary product source:** Square catalog (runtime fetch via `/api/storefront/square-catalog`)
- **Static fallback:** `data/products.ts`, `lib/demo-products.js`, `lib/storefront-products.js`
- **Weekly menu:** `data/weeklyMenu.ts` (static) + new `lib/menus/` modules (uncommitted)
- **Current reconciliation status:** Recent commits removed stale `FLAVOR_TO_PRODUCT_IDS` references and fixed Square URL mismatches. Product data is fetched from Square at runtime; static files serve fallback/seed data.

## 9. Order Authority

- **Payment:** Square (create order, process payment, webhooks)
- **Order records:** MongoDB + Square
- **Webhook reconciliation:** `/api/webhooks/square/route.ts`, `/api/webhooks/square/payment/route.ts`
- **Verified:** 2026-07-28 payment verification report confirms Square REST order creation and payment simulation succeeded.

## 10. Communication Authority

- **Customer email:** Resend (lib/resend-email.js, lib/email/service.js)
- **Owner alerts:** Telegram primary + Resend fallback (lib/owner-alerts.ts)
- **SMS:** Twilio code remains but provider was removed per no-SMS remediation; not operational
- **Marketing automation:** campaign-manager.js, ai-newsletter.js, nurture-sequence.js

## 11. Known Risks at Baseline

1. **Deployability risk:** Recent production deployments are failing. HEAD may not build cleanly on Vercel.
2. **Working-tree risk:** Uncommitted audit/debug/sanitization files and a large package-lock.json diff must be reconciled before alignment changes.
3. **Environment-variable sprawl:** 190 unique env vars referenced in code; Vercel project has 49 env entries with duplicates and legacy names.
4. **Codebase size:** 746 files, ~126k lines. High surface area for duplication and dead code.
5. **Provider drift:** Multiple providers referenced for same concerns (shipping: ShipEngine + EasyPost; analytics: PostHog + GA + Sentry; cache: Redis + Upstash).
6. **Feature flag uncertainty:** Many `FEATURE_*` flags exist; their current production state is unknown.

## 12. Pre-Alignment Gate

Before executing broad alignment changes, the following must be resolved:
- [ ] Confirm why recent Vercel deployments are failing and fix build/deploy.
- [ ] Commit or remove uncommitted audit/debug/sanitization artifacts.
- [ ] Reconcile package-lock.json.
- [ ] Map every active route and API to a mission purpose.
- [ ] Identify duplicate systems and authoritative sources.
- [ ] Verify current production behavior end-to-end.

---

*Next deliverable: TOG-BUSINESS-PURPOSE-SUMMARY.md*
