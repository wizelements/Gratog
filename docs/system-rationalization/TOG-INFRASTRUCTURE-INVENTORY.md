# TOG-INFRASTRUCTURE-INVENTORY.md

Taste of Gratitude — Infrastructure Inventory

Generated: 2026-07-29 19:05 EDT
Authority: Native Termux workspace
Status: Partial — live runtime verification blocked by degraded gateway/exec.

---

## 1. Hosting & Deployment

| System | Detail |
|--------|--------|
| Host | Vercel |
| Project | gratog |
| Project ID | prj_HnwKt5XyWC1Evcrv3mZLa3cdpDcG |
| Scope | theangelsilvers-projects |
| Framework | Next.js 15 (App Router) |
| Node runtime | nodejs (lambdaRuntimeStats: 6) |
| Production domain | https://tasteofgratitude.shop |
| Production deployment | dpl_5YfkFjmke2qxYa5tG2jgweaimDX2 |
| Production deployment URL | https://gratog-o068el5iq-theangelsilvers-projects.vercel.app |
| Production commit | f57c65270170ce98f54eb9b0066aa58c782f9da1 |
| Production status | READY (deployed 2026-07-28 18:01:59 EDT) |
| Git link | GitHub wizelements/Gratog |

### Deployment health warning
- Last 50 Vercel deployments: 30 ERROR, 20 READY.
- Most recent production-targeted deployments are failing. The public domain is served by the last successful build.
- This is a **P0 deployability risk**: HEAD may not build cleanly on Vercel.

## 2. Serverless Functions (vercel.json)

| Route/Pattern | maxDuration | Notes |
|---------------|-------------|-------|
| `app/api/**/*.{ts,js}` | 30s | Default |
| `app/api/orders/create/route.js` | 60s | Order creation |
| `app/api/payments/route.ts` | 60s | Payment processing |
| `app/api/checkout/route.ts` | 60s | Checkout |
| `app/api/webhooks/square/route.ts` | 60s | Square webhooks |
| `app/api/admin/menus/archive/route.ts` | 30s | Menu archive cron |
| `app/api/cron/cleanup-abandoned-orders/route.ts` | 60s | Abandoned order cleanup |
| `app/api/cron/owner-alerts/route.ts` | 30s | Owner alerts |

## 3. Vercel Cron Jobs

| Path | Schedule | Purpose |
|------|----------|---------|
| `/api/admin/menus/archive` | `0 6 * * 1` | Archive expired menus |
| `/api/cron/cleanup-abandoned-orders` | `15 * * * *` | Cleanup abandoned orders |
| `/api/cron/daily-report` | `0 14 * * 1-5` | Daily owner report (weekdays) |
| `/api/markets/warm` | `0 18 * * 3` | Warm market cache / weekly warm email |
| `/api/retention/winback` | `0 14 * * 0` | Winback campaign |
| `/api/cron/owner-alerts` | `*/5 * * * *` | Owner alert queue processor |

### Cron auth
- All cron routes require `Authorization: Bearer <CRON_SECRET>`.
- `WEEKLY_WARM_CRON_SECRET` is also referenced for the markets/warm route.

## 4. HTTP Headers & Redirects

- Strict security headers applied globally: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy.
- `/admin/*`, `/cart/*`, `/checkout/*`, `/order/*` marked `noindex, nofollow` and uncached.
- Static assets cached long-term; dynamic commerce paths uncached.
- Redirects consolidate legacy paths (`/shop` → `/catalog`, `/terms-of-service` → `/terms`, `/shipping` → `/policies#shipping`, `/rewards` → `/catalog`, `/subscriptions` → `/catalog`, etc.).
- Domain aliases redirect to canonical `tasteofgratitude.shop`.

## 5. Database

| System | Detail |
|--------|--------|
| Primary DB | MongoDB |
| Connection env | MONGODB_URI, MONGO_URL, DATABASE_NAME, DB_NAME |
| ODM | Mongoose |
| Known collections (from audit reports) | orders (811 docs), marketorders (4), owner_alert_queue (3 historical, 0 pending), email_sends (106), menus (1 active), users, products, inventory, campaigns, customers, subscribers, queue_positions |
| Known issue | `menus` collection has one active document dated June 8, 2026, while code expects current week (July 27 – Aug 3, 2026). |

### Database status
- Connection verified in 2026-07-28 alerts verification.
- Schema/index drift suspected; recent audit/sanitization scripts indicate legacy collections and stale menu data.

## 6. Caching

| Layer | Detail |
|-------|--------|
| Redis client | `lib/redis.ts` |
| Redis idempotency | `lib/redis-idempotency.ts` / stub fallback |
| Upstash Redis | UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN |
| In-app cache | `lib/cache.ts` |
| CDN | Vercel Edge Network |
| PWA cache | Service worker / manifest |

### Status
- Redis/Upstash referenced in code but real production usage unverified due to runtime degradation.
- Cache invalidation paths exist around product/order updates.

## 7. PWA / Service Worker

| Component | Detail |
|-----------|--------|
| Manifest | `/manifest.json` |
| Service worker | `/sw.js` |
| PWA utilities | `lib/pwa.ts` |
| Components | PWADiagnostics, PWAInitializer, PWAPrompt, PWAUpdateNotifier |
| Offline page | `/offline` |

### Status
- PWA install prompt and offline fallback exist.
- Real installation usage unverified.
- Risk: stale product/menu data in service-worker cache.

## 8. Monitoring & Observability

| System | Detail |
|--------|--------|
| Sentry | `@sentry/nextjs` dependency; NEXT_PUBLIC_SENTRY_DSN, SENTRY_AUTH_TOKEN |
| Error tracker | `lib/error-tracker.ts` |
| Health monitor | `lib/health-monitor.ts` |
| Monitoring dashboard | `lib/monitoring-dashboard.ts` |
| Web vitals | `/api/analytics/web-vitals` |
| Admin errors page | `/admin/errors` + `/api/errors/list`, `/api/errors/summary` |
| Vercel health cron | historically configured (not in current vercel.json) |

### Status
- Sentry DSN and auth token configured; actual event ingestion unverified.
- Admin error viewer exists but usage unverified.

## 9. Security Infrastructure

| Control | Detail |
|---------|--------|
| Admin auth | Edge-safe JWT (`jose`), CSRF, rate limiting, audit logging |
| Customer auth | JWT cookie-based (`lib/auth/jwt.js`) |
| Rate limiting | `lib/rate-limit.ts` (in-memory, resets on cold start) |
| Input validation | `lib/validation/*`, `zod` |
| Webhook signature | Square webhook signature verification |
| CSP | CSP report endpoint `/api/csp-report` |
| Diagnostics guard | `lib/diagnostics-guard.ts` blocks debug routes in production |

### Known risks
- Multiple overlapping auth implementations (admin-session.ts, unified-admin.ts, admin-auth.js, admin-token.ts, auth.ts).
- Rate limiting in-memory only.
- Debug routes blocked in production but several token-status/sanitize routes are untracked and may lack auth.

## 10. Build / Quality Systems

| System | Detail |
|--------|--------|
| Build | `next build` with 2GB max-old-space-size |
| Lint | `next lint` |
| Type check | `tsc --noEmit --skipLibCheck` |
| Unit tests | vitest |
| E2E tests | Playwright |
| Load tests | k6 (script in e2e/k6/smoke.js) |
| Lighthouse | @lhci/cli |
| Coverage | @vitest/coverage-v8 |
| Husky | installed but `prepare` skips it |

### Status
- Local build times out on Termux ARM; Vercel builds currently failing for recent commits.
- 311/311 tests passed in prior Phase 0 report, but 17 skipped (auth + reviews).
- 122 lint errors reported (mostly `@ts-ignore` → `@ts-expect-error`).

## 11. Unverified / Blocked Items

Due to runtime degradation (exec/web_fetch returning empty), the following could not be live-verified in this pass:
- Current Vercel env values (names only pulled; values not inspected).
- Redis/Upstash connectivity and actual cache hit rates.
- Sentry event ingestion.
- Real PWA install metrics.
- Live webhook logs.
- Database index list and exact collection schema.

---

*Next: TOG-PROVIDER-INVENTORY.md*
