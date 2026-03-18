# Taste of Gratitude — Second-Pass Hardening Validation

**Date:** 2026-03-04  
**Repo:** `wizelements/Gratog` (`main`)  
**Workspace:** `/data/data/com.termux/files/home/Gratog-live`  
**Goal:** Deep regression pass + fixed-vs-open remediation matrix + deploy-readiness recommendation

## Validation Evidence

1. `npm run lint` → passed with warnings only.
2. `npm run test:unit` → passed.
3. `npm run build` → passed with known warnings.
4. `BASE_URL=http://127.0.0.1:3000 npm run test:api` against live `next start` server → failed (9 tests, Square suite).
5. `npm run test:e2e:smoke` → blocked by environment (`Unsupported platform: android`).

## Regression Summary

Production hardening changes are largely in place and behaving as expected for static validation (lint/unit/build). The main regression risk remains runtime payment-path behavior and diagnostics consistency in Square integration tests. This is currently the primary blocker for confident production push readiness.

## Fixed-vs-Open Matrix

| Area | Status | Evidence | Risk Level | Notes |
|---|---|---|---|---|
| CSP restored in Report-Only mode | Fixed | `middleware.ts` sets `Content-Security-Policy-Report-Only` + `report-uri /api/security/csp-report`; endpoint exists at `app/api/security/csp-report/route.js` | Low | Correct phased rollout pattern is in place. |
| CORS tightened | Fixed | `next.config.js` uses origin default `https://tasteofgratitude.shop` + credentials `false` | Low | Wide-open `*` + credentials exposure removed. |
| Build safety re-enabled | Fixed | `next.config.js` has `ignoreDuringBuilds: false` and `ignoreBuildErrors: false` | Low | Silent bad deploys no longer allowed. |
| Webhook signature timing hardening | Fixed | `app/api/subscriptions/webhook/route.js` uses `crypto.timingSafeEqual` | Low | Direct string compare removed. |
| Webhook idempotency | Fixed | `subscription_webhook_events` unique index + dedupe short-circuit in webhook route | Low | Duplicate event reprocessing mitigated. |
| Stable webhook verification URL | Fixed | `SQUARE_SUBSCRIPTIONS_WEBHOOK_URL` fallback to `${SITE_URL}/api/subscriptions/webhook` | Low | Avoids proxy/query drift issues. |
| Subscription create gating + abuse control | Fixed (partial) | `FEATURE_SUBSCRIPTIONS_ENABLED` gate + `RateLimit.check` + required `cardNonce` | Medium | Stronger than before, but still no explicit email ownership verification flow. |
| Billing history authorization | Fixed | `app/api/subscriptions/[id]/billing-history/route.js` validates signed token and email ownership | Low | Prior IDOR risk addressed. |
| Admin CSRF + strict cookie posture | Fixed | `middleware.ts` enforces `x-csrf-token` on mutating admin APIs; `setAdminCookie` and login CSRF cookie use `sameSite: 'strict'` | Low | Defense-in-depth implemented. |
| Subscription ops cron scheduling | Fixed | `vercel.json` includes `/api/cron/subscription-reminders`, `/api/cron/cleanup-abandoned-orders`, `/api/cron/missed-pickup` | Low | Previously missing jobs now scheduled. |
| Subscription route timeout hardening | Fixed | `vercel.json` sets 60s maxDuration for subscription routes/webhook | Low | Prevents default-timeout truncation. |
| CRON secret file removal from repo | Fixed | `CRON_SECRET` is deleted in worktree; `.gitignore` updated in remediation set | Low | Continue secret rotation in Vercel if not already done. |
| Domain/email centralization | Fixed (major) | `lib/site-config.js` with `.shop` URL/emails; `lib/email.js` uses centralized constants and List-Unsubscribe headers | Low | Prior `.net` sprawl materially reduced. |
| Email unsubscribe headers | Fixed | `lib/email.js` sets `List-Unsubscribe` and `List-Unsubscribe-Post` | Low | Better mailbox compliance posture. |
| Square script scope | Fixed | Square SDK script moved to `app/checkout/layout.js`; absent from root `app/layout.js` | Low | Reduces global JS load. |
| Subscription customer-facing routes | Fixed | `app/account/subscriptions/page.js` + `app/account/subscriptions/[id]/page.js` exist | Low | Prior 404 manage-link gap addressed. |
| Helpful vote abuse prevention | Fixed | `app/api/reviews/helpful/route.js` now rate-limited by IP | Low | Basic spam resistance added. |
| Newsletter endpoint rate limiting | Fixed | `app/api/newsletter/subscribe/route.js` uses `RateLimit.check` | Low | Reduces abuse and bot spam pressure. |
| Checkout endpoint rate limiting | Fixed | `app/api/checkout/route.ts` uses `RateLimit.check` | Low | Abuse surface reduced. |
| Square integration runtime tests | Open (critical) | 9 failures in `tests/api/square-comprehensive.spec.ts` and `tests/api/square-payment-flow.spec.ts` | High | Status-code contract mismatch (unexpected 503), missing `traceId` fields, `/api/checkout` status endpoint mismatch. |
| Playwright smoke validation | Open (env-blocked) | `npm run test:e2e:smoke` fails: `Unsupported platform: android` | Medium | Cannot validate browser smoke in current environment; requires Linux/macOS/Windows runner. |
| Home/catalog SSR performance migration | Open | `app/page.js` and `app/catalog/page.js` still `'use client'` | Medium | SEO/LCP optimization still pending. |
| Structured data reliability cleanup | Open (partial) | `seo/schemas.js` still monolithic JS with fallback review defaults; not yet extracted into pure testable module | Medium | Better than before, but still not final architecture target. |
| Visible hardcoded social-proof counts | Open | `app/page.js` still renders hardcoded `847` in testimonial stats | Medium | Should be dynamic or policy-safe wording aligned with verifiable source. |
| Metadata viewport warnings | Open | Build emits repeated "Unsupported metadata viewport" warnings across routes | Low | Non-fatal, but noisy and should be standardized with Next viewport export pattern. |

## Deep Regression Findings (Square Runtime)

### Failing Assertions Snapshot

1. Status expectations fail due to `503` responses where tests allow only `[200, 400, 500]`.
2. API responses expected to include `traceId` are returning `undefined` in multiple flows.
3. `GET /api/checkout` health/status behavior differs from test contract (returns `500` instead of expected `200` service response).

### Impact

These failures indicate runtime contract drift in critical payment surfaces. Even with successful build/lint/unit checks, push readiness should be considered **conditional** until Square integration suite is reconciled.

## Push Readiness Verdict

**Verdict: Not fully push-ready for payment-critical confidence gates.**

Security and subscription hardening improvements are substantial and mostly validated. However, unresolved Square integration regressions are production-risking for payment observability and expected response contracts.

## Next-Step Checklist

1. Normalize payment API status contracts so unavailable/degraded cases return statuses expected by tests (or update tests to explicit new contract if intentional).
2. Ensure all Square payment/checkout error and success payloads include a stable `traceId` field.
3. Fix `GET /api/checkout` status endpoint behavior to return deterministic service-health payload (`200`) when no params are provided.
4. Re-run `npm run test:api` against live `next start` until zero failures.
5. Execute Playwright smoke in a supported non-Android CI runner and capture report artifact.
6. Convert `app/page.js` and `app/catalog/page.js` toward Server Component + ISR pattern to remove SEO/LCP debt.
7. Replace hardcoded homepage review/claims counters with DB-backed aggregates or policy-safe static copy.
8. Complete structured data module split (`seo/schemas` pure data + React JSON-LD renderer) and add direct tests.
9. Resolve metadata viewport warnings by migrating to dedicated `viewport` export pattern.
10. After these close, run final release gate: lint + unit + integration + build + e2e smoke.

## Commands Run

- `npm run lint`
- `npm run test:unit`
- `npm run build`
- `BASE_URL=http://127.0.0.1:3000 npm run test:api` (with live `npm run start`)
- `npm run test:e2e:smoke`

---

**Prepared by:** Amp second-pass remediation continuation
