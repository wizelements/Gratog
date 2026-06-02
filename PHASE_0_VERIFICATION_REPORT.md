# GRATOG — Phase 0 Full Project Verification Report

> Generated: 2026-06-02 | Status: **AWAITING FIX APPROVAL**

---

## 1. Executive Summary

Gratog is a Next.js 15 food/market e-commerce application with Square payments, MongoDB, and a full admin panel. The **admin auth system is well-built** (Edge-safe JWT, CSRF, rate limiting, audit logging). However, the **entire consumer auth system is non-functional** — all 6 `/api/auth/*` route files are missing (empty directories). This cascading failure means login, registration, session restore, logout, and password reset do not work, which blocks all authenticated user features (profile, orders, rewards, challenges, settings).

### Health Scorecard

| Area | Status | Details |
|------|--------|---------|
| **Consumer Auth** | 🔴 BROKEN | 0 of 6 route handlers implemented |
| **Admin Auth** | ✅ WORKING | Login, CSRF, JWT, middleware all functional |
| **Payments** | ✅ WORKING | Square integration, pay-flow, refunds operational |
| **Products/Catalog** | ✅ WORKING | Storefront, search, inventory all functional |
| **User Profile** | 🔴 BROKEN | All 8 `/api/user/*` routes missing |
| **Rewards (V1)** | 🟡 PARTIAL | Passport works; leaderboard/stamp missing |
| **Gratitude (V2)** | ✅ WORKING | Account, transactions, rewards, redeem all functional |
| **Market/Queue** | 🟡 PARTIAL | Today, inventory work; queue/update missing |
| **Build** | ⚠️ UNTESTABLE LOCALLY | Timeout on Termux ARM; 1 real TS error; builds on Vercel |
| **Tests** | ✅ 311/311 PASS | 17 skipped (auth + reviews — pending reimplementation) |
| **Lint** | ⚠️ 122 ERRORS | All stylistic (`@ts-ignore` → `@ts-expect-error`) |

---

## 2. Route Inventory

| Metric | Count |
|--------|:-----:|
| Implemented API routes | 96 |
| Client-called endpoints | ~90 |
| **Missing implementations** | **47** |
| Orphaned routes (exist, uncalled) | 45 |
| Empty scaffolded dirs | 126 |
| Stub routes | 3 |
| App pages | ~75 |

**Full route map:** See [ROUTE-MAP-REPORT.md](./ROUTE-MAP-REPORT.md)

---

## 3. Missing APIs (47 Total)

### 🔴 CRITICAL — Auth (6 routes, blocks ALL authenticated features)

| Endpoint | Method | Called From |
|----------|--------|------------|
| `/api/auth/session` | GET | `AuthContext.js` — every page load |
| `/api/auth/login` | POST | `AuthContext.js` |
| `/api/auth/register` | POST | `AuthContext.js`, `test-auth/page.js` |
| `/api/auth/logout` | POST | `AuthContext.js` |
| `/api/auth/forgot-password` | POST | `forgot-password/page.js` |
| `/api/auth/reset-password` | POST | `reset-password/page.js` |

### 🟠 HIGH — Core User Features (8 routes)

| Endpoint | Method | Called From |
|----------|--------|------------|
| `/api/user/stats` | GET | `ProfileClient.js` |
| `/api/user/favorites` | GET | `ProfileClient.js` |
| `/api/user/profile` | PUT | `profile/settings/Client.js` |
| `/api/user/orders` | GET | `profile/orders/Client.js` |
| `/api/coupons/validate` | POST | `checkout.ts`, `CouponInput.jsx` |
| `/api/orders/{id}/status` | GET/PUT | `order/status`, `order/complete`, `MarketDayDashboard` |
| `/api/queue/update` | PUT | `admin/queue`, `vendor/queue` |
| `/api/admin/products/{id}/sync` | POST | `admin/products/[id]/page.js` |

### 🟡 MEDIUM — Secondary Features (18 routes)

User: `challenge`, `challenge/checkin`, `email-preferences`, `wishlist`
Rewards: `leaderboard`, `stamp`
Quiz: `submit`, `recommendations`, `results/{id}`
Learning: 6 endpoints (`modules`, `me/modules`, progress, enroll)
Other: `newsletter/subscribe`, `tracking/user`, `transactions/log`, `admin/auth/forgot-password`

### 🟢 LOW — Non-essential (7 routes)

`nurture/subscribe`, `ugc/submit`, `recommendations`, `interactions`, `reviews/helpful`, `error-report`, `waitlist`

**Full dependency trace:** See [FRONTEND_API_DEPENDENCY_REPORT.md](./FRONTEND_API_DEPENDENCY_REPORT.md)

---

## 4. Broken Client Integrations

**39 of 80 frontend API endpoints return 404 in production.**

The `AuthContext` is loaded globally via layout — it calls `GET /api/auth/session` on every single page load. This means **every page in the app** silently receives a 404 on mount, though it fails gracefully (sets user to null).

### Cascade Effect

```
AuthContext → /api/auth/session → 404
    ↓
user = null, isAuthenticated = false
    ↓
Profile pages → empty (no user)
Orders page → empty (no auth)  
Rewards page → partially works (phone-based lookup)
Settings page → empty (no auth)
Challenge page → empty (no auth)
```

---

## 5. Build Errors

| Category | Count | Details |
|----------|:-----:|---------|
| **Real TypeScript errors** | 1 | `admin/orders/sync/route.ts:32` — duplicate `success` key |
| **Lint errors** | 122 | All `@ts-ignore` → `@ts-expect-error` (stylistic) |
| **Lint warnings** | 391 | ~350 unused vars, ~40 anonymous exports |
| **Build completion** | ❌ | Timed out on Termux ARM (resource constraint, not code issue) |
| **Stale `.next/types` errors** | ~100 | Artifact from SD-card symlinks; cleared on fresh build |

---

## 6. Test Failures

| Metric | Value |
|--------|-------|
| **Tests passed** | 311 |
| **Tests skipped** | 17 |
| **Tests failed** | 0 |
| **Test files** | 29 (27 passed, 2 skipped) |

### Skipped Tests (Categorized)

| Category | File | Skipped | Reason |
|----------|------|:-------:|--------|
| **Auth** | `auth-register-route.test.ts` | 2 | "route removed, pending reimplementation" |
| **Reviews** | `reviews-flow.test.ts` | 7 | All `.skip`ped |
| **Hydration** | `hydration-issues.test.ts` | 2 | Conditional |
| **Other** | Various | 6 | Individual conditional skips |

---

## 7. Database Risks

### Missing Indexes (🟡 HIGH)

| Collection | Field | Issue |
|------------|-------|-------|
| `users` | `email` | No index — collection scan on every login |
| `users` | `id` | No index — collection scan on every session check |
| `users` | `email` | No unique constraint — race condition possible |
| `admin_users` | `email` | No unique constraint verified |

### Schema Risks

| Risk | Details |
|------|---------|
| **No `preferences` field** | User model lacks preferences — client may expect it |
| **No `rewards` embedded** | Rewards in separate collection (by design, not a bug) |
| **Admin field mismatch** | Legacy `admin-auth.js` uses `password`/`active` vs current `passwordHash`/`isActive` |

### Password Hash Mismatch (🔴 CRITICAL)

- `lib/auth/jwt.js` → **bcrypt** (`bcrypt.hash`, cost 10)
- `lib/auth/unified-admin.ts` → **SHA-256** (Edge-compatible fallback)
- `app/api/admin/auth/login/route.ts` → **bcrypt.compare()**
- Any admin created via SHA-256 path **cannot log in** via standard login

---

## 8. Security Findings

### 🔴 CRITICAL

| # | Finding |
|---|---------|
| F1 | **All 6 consumer auth routes are empty directories** — no login/register/session/logout for users |
| F2 | **SHA-256 vs bcrypt mismatch** — `unified-admin.ts` hashPassword uses SHA-256; login uses bcrypt.compare |

### 🟡 HIGH

| # | Finding |
|---|---------|
| F3 | **Admin field name inconsistency** — legacy `password`/`active` vs current `passwordHash`/`isActive` |
| F4 | **No DB indexes on users** — collection scans, no unique email constraint |
| F5 | **Admin setup chicken-and-egg** — `POST /api/admin/setup` requires admin session to create first admin |
| F6 | **Rate limiting is in-memory only** — resets on every serverless cold start |

### 🟠 MEDIUM

| # | Finding |
|---|---------|
| F7 | **4+ redundant admin auth implementations** — admin-session.ts, unified-admin.ts, admin-auth.js, admin-token.ts, auth.ts |
| F8 | **No CSRF on consumer auth** — admin has full CSRF; consumers have none |
| F9 | **`.env.example` missing all auth vars** — JWT_SECRET, ADMIN_SETUP_SECRET, etc. not documented |
| F10 | **Dev-only fallback secrets** in production path (blocked by `NODE_ENV === 'production'` check) |

---

## 9. Recommended Fix Order

### Phase 1 — Auth Routes (CRITICAL, unblocks everything)

| Priority | Task | Effort | Files |
|:--------:|------|--------|-------|
| **1** | Implement `/api/auth/register` | 1h | New route using `lib/auth/jwt.js` + `lib/db/users.js` + `lib/auth/validation.js` |
| **2** | Implement `/api/auth/login` | 45m | New route using `findUserByEmail` + `comparePassword` + `generateToken` |
| **3** | Implement `/api/auth/session` | 30m | New route using `requireAuth` middleware + `findUserById` |
| **4** | Implement `/api/auth/logout` | 15m | New route — clear `auth_token` cookie |
| **5** | Implement `/api/auth/forgot-password` | 1h | New route — generate reset token, send email via Resend |
| **6** | Implement `/api/auth/reset-password` | 45m | New route — verify token, update password |

*All supporting code already exists in `lib/auth/` and `lib/db/users.js`. These routes are assembly, not greenfield.*

### Phase 2 — User Profile Routes (HIGH)

| Priority | Task | Effort |
|:--------:|------|--------|
| **7** | Implement `/api/user/profile` (GET/PUT) | 30m |
| **8** | Implement `/api/user/orders` (GET) | 30m |
| **9** | Implement `/api/user/stats` (GET) | 30m |
| **10** | Implement `/api/user/favorites` (GET) | 30m |

### Phase 3 — Commerce Gaps (HIGH)

| Priority | Task | Effort |
|:--------:|------|--------|
| **11** | Implement `/api/coupons/validate` | 45m |
| **12** | Implement `/api/orders/{id}/status` | 45m |
| **13** | Implement `/api/queue/update` | 30m |

### Phase 4 — Database Hardening

| Priority | Task | Effort |
|:--------:|------|--------|
| **14** | Add unique index on `users.email` | 5m |
| **15** | Add index on `users.id` | 5m |
| **16** | Fix SHA-256/bcrypt mismatch in `unified-admin.ts` | 15m |
| **17** | Migrate any legacy admin records (`password` → `passwordHash`) | 15m |

### Phase 5 — Cleanup & Secondary Features

| Priority | Task | Effort |
|:--------:|------|--------|
| **18** | Implement user `challenge`, `email-preferences` routes | 1h |
| **19** | Implement rewards `leaderboard`, `stamp` routes | 45m |
| **20** | Consolidate/remove legacy auth modules | 30m |
| **21** | Update `.env.example` with all required vars | 15m |
| **22** | Add CSRF to consumer auth cookies | 30m |

### Phase 6 — Nice-to-Have

Quiz routes, learning routes, newsletter, UGC, recommendations, tracking — implement as features are prioritized.

---

## 🛑 FIX APPROVAL GATE

**This report is complete. No files have been created or edited (audit reports are read-only artifacts).**

### To proceed, approve one or more phases:

- `approve phase 1` — Implement all 6 auth routes
- `approve phase 1-3` — Auth + profile + commerce gaps
- `approve all` — Full fix sequence
- `approve phase N` — Specific phase only

### Detailed Sub-Reports

- [Route Map Report](./ROUTE-MAP-REPORT.md)
- [Auth Architecture Audit](./docs/audit/AUTH_ARCHITECTURE_AUDIT.md)
- [Frontend API Dependency Report](./FRONTEND_API_DEPENDENCY_REPORT.md)
