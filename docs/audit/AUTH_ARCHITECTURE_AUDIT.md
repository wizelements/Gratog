# Gratog Authentication Architecture & Database Audit

> Generated: 2026-06-02 | Scope: Full codebase auth review

---

## 1. Auth Function Inventory

### 1A. Core JWT Layer

| File | Function | Purpose | Status |
|------|----------|---------|--------|
| `lib/auth/jwt.js` | `generateToken(userId, email)` | Generate user JWT (jose/HS256, 7d expiry) | ✅ Working |
| `lib/auth/jwt.js` | `verifyToken(token)` | Verify user JWT, return payload or null | ✅ Working |
| `lib/auth/jwt.js` | `hashPassword(password)` | bcrypt hash (cost 10) | ✅ Working |
| `lib/auth/jwt.js` | `comparePassword(password, hash)` | bcrypt compare | ✅ Working |

### 1B. User Auth Middleware

| File | Function | Purpose | Status |
|------|----------|---------|--------|
| `lib/auth/middleware.js` | `requireAuth(request)` | Extract & verify user JWT from Bearer header or `auth_token` cookie | ✅ Working |
| `lib/auth/middleware.js` | `optionalAuth(request)` | Same but returns null instead of throwing | ✅ Working |
| `lib/auth/middleware.js` | `verifyAuth(request)` | Returns userId or null | ✅ Working |

### 1C. User DB Operations

| File | Function | Purpose | Status |
|------|----------|---------|--------|
| `lib/db/users.js` | `createUser({name, email, passwordHash, phone, avatar})` | Insert user with uuid, check email uniqueness | ✅ Working |
| `lib/db/users.js` | `findUserByEmail(email)` | Lookup user by email (includes passwordHash) | ✅ Working |
| `lib/db/users.js` | `findUserById(userId)` | Lookup user by custom `id` field (strips passwordHash) | ✅ Working |
| `lib/db/users.js` | `updateUser(userId, updates)` | Allow-listed update: name, phone, avatar only | ✅ Working |
| `lib/db/users.js` | `initializeUserRewards(userId)` | Create rewards doc in `rewards` collection | ✅ Working |
| `lib/db/users.js` | `initializeUserChallenge(userId)` | Create challenge doc in `challenges` collection | ✅ Working |

### 1D. Admin Auth — Unified System

| File | Function | Purpose | Status |
|------|----------|---------|--------|
| `lib/admin-session.ts` | `verifyAdminToken(token)` | Verify admin JWT, require role=admin\|super_admin (Edge-safe, jose) | ✅ Working — **used by middleware.ts** |
| `lib/admin-session.ts` | `generateAdminToken(admin)` | Generate admin JWT (HS256, 7d) | ✅ Working |
| `lib/admin-session.ts` | `getAdminSession(request)` | Extract admin session from `admin_token` cookie | ✅ Working |
| `lib/admin-session.ts` | `requireAdmin(request)` | Throw `AdminAuthError` if no valid session | ✅ Working |
| `lib/admin-session.ts` | `shouldRotateToken(payload)` | Check if token >1d old | ✅ Working |
| `lib/admin-session.ts` | `refreshTokenIfNeeded(req, res)` | Auto-rotate token on response | ✅ Working |
| `lib/admin-session.ts` | `setAdminCookie / clearAdminCookie` | Cookie helpers (httpOnly, secure, strict, 7d) | ✅ Working |
| `lib/admin-session.ts` | `withAdminAuth(handler)` | HOF wrapper for route handlers | ✅ Working |
| `lib/auth/unified-admin.ts` | `generateAdminToken` | Same as admin-session but with DB validation in `getAdminSession` | ✅ Working |
| `lib/auth/unified-admin.ts` | `verifyAdminToken` | Same + logging | ✅ Working |
| `lib/auth/unified-admin.ts` | `getAdminSession(request)` | Verify + check admin still active in DB | ✅ Working |
| `lib/auth/unified-admin.ts` | `hashPassword / verifyPassword` | ⚠️ **SHA-256 based** (NOT bcrypt) — Edge-compatible fallback | ⚠️ INCOMPATIBLE (see finding #1) |
| `lib/auth/unified-admin.ts` | `validateCsrfToken(request)` | Compare x-csrf-token header with admin_csrf cookie | ✅ Working |
| `lib/auth/unified-admin.ts` | `findAdminByEmail / updateAdminLastLogin` | DB helpers | ✅ Working |

### 1E. Legacy / Redundant Admin Auth

| File | Function | Purpose | Status |
|------|----------|---------|--------|
| `lib/admin-auth.js` | `createAdminToken / verifyAdminToken / loginAdmin / createAdminUser` | **LEGACY** — duplicates unified-admin, uses `password` field (not `passwordHash`) | ⚠️ Superseded — field mismatch risk |
| `lib/admin-token.ts` | `verifyAdminCookieToken / decodeTokenPayload / isTokenExpired` | **LEGACY** — duplicates admin-session.ts | ⚠️ Superseded |
| `lib/auth.ts` | `isAuthorized / extractUser` | **LEGACY** — static API key comparison, no JWT | ⚠️ Superseded — "In production, replace with JWT" comments remain |
| `lib/auth-config.ts` | `JWT_SECRET / ADMIN_SETUP_SECRET / CRON_SECRET / SYNC_SECRET` | Centralized secret management with prod enforcement | ✅ Working |

### 1F. Auth Middleware Layers

| File | Function | Purpose | Status |
|------|----------|---------|--------|
| `lib/admin-auth-middleware.js` | `requireAdminAuth(handler)` | HOF — uses `getAdminSession` from admin-session.ts | ✅ Working |
| `lib/middleware/admin.ts` | `withAdminMiddleware(handler, config)` | Full-featured: auth + RBAC + rate limit + CSRF + audit | ✅ Working |
| `lib/rewards-security.js` | `verifyRequestAuthentication(request)` | Multi-source auth: master key, admin key, JWT header, JWT cookie | ✅ Working |

### 1G. Validation

| File | Function | Purpose | Status |
|------|----------|---------|--------|
| `lib/auth/validation.js` | `validateRegistration / validateEmail / validatePassword / validateName / validatePhone` | Input validation for consumer registration | ✅ Working |

### 1H. Client-Side Auth

| File | Function | Purpose | Status |
|------|----------|---------|--------|
| `contexts/AuthContext.js` | `AuthProvider / useAuth` | React context: login, register, logout, session check | ✅ Working — **but calls nonexistent routes** |
| `lib/admin-fetch.ts` | `adminFetch / adminApi` | Admin client fetch with CSRF, auto-redirect on 401 | ✅ Working |
| `lib/secure-storage.ts` | `SecureStorage` | sessionStorage wrapper with TTL, used for rewards/checkout | ✅ Working |

---

## 2. Auth Context / Provider Analysis

**File:** `contexts/AuthContext.js`

### State Management
- `user` (object | null), `loading` (boolean)
- On mount: calls `GET /api/auth/session` to restore session
- Exposes: `login`, `register`, `logout`, `isAuthenticated`

### API Endpoints Called
| Action | Endpoint | Method |
|--------|----------|--------|
| Session restore | `/api/auth/session` | GET |
| Login | `/api/auth/login` | POST |
| Register | `/api/auth/register` | POST |
| Logout | `/api/auth/logout` | POST |

### Session Restore Flow
1. Component mounts → `checkSession()` fires
2. `GET /api/auth/session` — expects `{ success: true, user: {...} }` response
3. If user present, sets state; otherwise leaves null
4. `loading` set to false after check

---

## 3. Middleware Review

**File:** `middleware.ts`

### Scope
- **Matcher:** `/admin/:path*` and `/api/admin/:path*` only
- **Consumer routes (`/api/auth/*`, `/api/user/*`, etc.) are UNPROTECTED by middleware** — they rely on per-route auth checks

### How It Works
1. Non-admin paths → `NextResponse.next()` (pass-through)
2. Public admin paths (login, logout, reset-password API) → pass-through
3. All other admin paths → extract `admin_token` cookie (or Bearer header)
4. Verify with `verifyAdminToken()` from `lib/admin-session.ts` (Edge-safe jose)
5. Invalid → API routes get 401 JSON; pages redirect to `/admin/login?redirect=...`

### Edge Runtime Safety
- ✅ Only imports `jose` and `admin-session.ts`
- ✅ Explicit warning comment about NOT importing `unified-admin.ts` (mongoose chain)
- ✅ No MongoDB/mongoose imports in middleware

---

## 4. Auth Flow Trace

### 4A. Consumer Registration Flow

```
Frontend (AuthContext)                    Backend
─────────────────────                    ───────
register(name, email, password,
  confirmPassword, phone)
    ↓
POST /api/auth/register ──────────────→  ❌ ROUTE FILE MISSING
    ↓                                    (directory exists but EMPTY)
Expected flow (from test file):
  1. validateRegistration(data)
  2. hashPassword(password)             → lib/auth/jwt.js
  3. createUser({...})                  → lib/db/users.js
  4. initializeUserRewards(userId)      → lib/db/users.js
  5. initializeUserChallenge(userId)    → lib/db/users.js
  6. generateToken(userId, email)       → lib/auth/jwt.js
  7. Set auth_token cookie
  8. Reconcile pending_customers
  9. Return { success: true, user }
```

**🔴 BROKEN: All 6 consumer auth route files are missing:**
- `app/api/auth/register/route.ts` — EMPTY DIRECTORY
- `app/api/auth/login/route.ts` — EMPTY DIRECTORY
- `app/api/auth/session/route.ts` — EMPTY DIRECTORY
- `app/api/auth/logout/route.ts` — EMPTY DIRECTORY
- `app/api/auth/forgot-password/route.ts` — EMPTY DIRECTORY
- `app/api/auth/reset-password/route.ts` — EMPTY DIRECTORY

### 4B. Consumer Login Flow (BROKEN)

```
Frontend: POST /api/auth/login { email, password }
Backend:  ❌ ROUTE MISSING
Expected:
  1. findUserByEmail(email)
  2. comparePassword(password, user.passwordHash)
  3. generateToken(userId, email)
  4. Set auth_token cookie
  5. Return { success: true, user }
```

### 4C. Consumer Session Restore (BROKEN)

```
Frontend: GET /api/auth/session (on every page load)
Backend:  ❌ ROUTE MISSING
Expected:
  1. Read auth_token cookie
  2. verifyToken(token)
  3. findUserById(payload.userId)
  4. Return { success: true, user } or { success: false }
```

### 4D. Consumer Logout (BROKEN)

```
Frontend: POST /api/auth/logout
Backend:  ❌ ROUTE MISSING
Expected:
  1. Clear auth_token cookie
  2. Return { success: true }
```

### 4E. Consumer Password Reset (BROKEN)

```
Frontend: POST /api/auth/forgot-password
Backend:  ❌ ROUTE MISSING
Frontend: POST /api/auth/reset-password
Backend:  ❌ ROUTE MISSING
```

### 4F. Admin Login Flow ✅

```
Frontend: POST /api/admin/auth/login { email, password, rememberMe }
Backend (app/api/admin/auth/login/route.ts):
  1. Rate limit check (5/15min per IP)
  2. Zod validation (email, password, rememberMe)
  3. Find admin in admin_users collection
  4. Check isActive !== false
  5. bcrypt.compare(password, admin.passwordHash)
  6. generateAdminToken() → jose HS256 JWT
  7. generateCsrfToken()
  8. Update lastLogin + loginHistory
  9. Insert audit_logs entry
  10. Set admin_token cookie (httpOnly, secure, strict)
  11. Set admin_csrf cookie (readable by JS)
  12. Return { success: true, user }
```

### 4G. Admin Password Reset Flow ✅

```
Phase 1: POST /api/admin/auth/reset-password { email }
  → Generate secure token, store SHA-256 hash in admin_password_resets (30min TTL)
  → Email reset link via Resend
  → Always returns 200 (no email enumeration)

Phase 2: POST /api/admin/auth/reset-password { token, newPassword }
  → Hash token, find unused/unexpired record
  → Atomic single-use claim
  → bcrypt.hash(newPassword, 12)
  → Update admin passwordHash + tokenVersion
```

### 4H. Admin Setup Flow ✅

```
POST /api/admin/setup { secret, email?, password?, name? }
  → Rate limited (5/15min)
  → requireAdminSession (requires existing admin — chicken-and-egg issue?)
  → Validate ADMIN_SETUP_SECRET
  → bcrypt.hash(password, 12)
  → Insert into admin_users (id, email, passwordHash, role, isActive, mustChangePassword)
```

---

## 5. Database Model Inventory

### 5A. Mongoose Models (in `models/`)

| Model | Collection | File | Indexes |
|-------|-----------|------|---------|
| MarketOrder | marketorders | `models/MarketOrder.ts` | marketId+status+createdAt, status+createdAt, customerPhone, orderNumber |
| DailyInventory | dailyinventories | `models/DailyInventory.ts` | marketId+date, date+isClosed |
| MarketSchedule | marketschedules | `models/MarketSchedule.ts` | days+isActive |
| QueuePosition | queuepositions | `lib/models/QueuePosition.js` | marketId+status+position, marketId+createdAt, orderId(unique), orderRef, marketId, position, status |

### 5B. Schemaless Collections (via raw MongoDB driver)

| Collection | Used By | Key Fields |
|------------|---------|------------|
| `users` | `lib/db/users.js` | id(uuid), name, email, passwordHash, phone, avatar, joinedAt, createdAt, updatedAt |
| `rewards` | `lib/db/users.js` | id(uuid), userId, points, lifetimePoints, history[], createdAt, updatedAt |
| `challenges` | `lib/db/users.js` | id(uuid), userId, streakDays, lastCheckIn, totalCheckIns, createdAt, updatedAt |
| `admin_users` | `lib/auth/unified-admin.ts`, admin routes | id, email, passwordHash, name, role, isActive, mustChangePassword, lastLogin, createdAt |
| `admin_password_resets` | reset-password route | adminId, email, tokenHash, expiresAt, consumed, createdAt |
| `audit_logs` | unified-admin, admin routes | timestamp, adminId, adminEmail, action, resource, details, ipAddress, userAgent, success |
| `products` | `lib/database.ts` | slug, title, description, brand, category, handle, source_id, active, hash, version |
| `variants` | `lib/database.ts` | product_id, sku, option_values, price_cents, currency |
| `inventory_levels` | `lib/database.ts` | variant_id, quantity, status, last_checked_at |
| `images` | `lib/database.ts` | product_id, url, width, height, alt, position |
| `links` | `lib/database.ts` | product_id, url, last_crawled_at, last_hash, crawl_status |
| `events` | `lib/database.ts` | type, entity, entity_id, payload, created_at |

### 5C. User Model Field Verification

| Required Field | Present? | Notes |
|---------------|----------|-------|
| id | ✅ | UUID v4 via `uuid` package (custom `id`, not MongoDB `_id`) |
| email | ✅ | Checked for uniqueness at insert time |
| phone | ✅ | Optional, defaults to null |
| password_hash | ⚠️ | Stored as `passwordHash` (camelCase, not snake_case) |
| rewards | ❌ | **Separate collection** — not embedded in user doc |
| preferences | ❌ | **Not implemented** — no preferences field exists |

### 5D. Missing Indexes on User Collection
- ⚠️ No index on `email` — `findUserByEmail` does collection scan
- ⚠️ No index on `id` — `findUserById` does collection scan
- ⚠️ No unique constraint on `email` (enforced at app level only, race condition possible)

### 5E. Admin User Model — Field Inconsistency

| Field | `admin-auth.js` (legacy) | `unified-admin.ts` | Login route | Setup route |
|-------|--------------------------|---------------------|-------------|-------------|
| Password field | `password` | `passwordHash` | `passwordHash` | `passwordHash` |
| Active field | `active` | `isActive` | `isActive` | `isActive` |
| ID format | `admin_${randomUUID()}` | `admin.id \|\| admin._id` | `admin.id` | `admin_${Date.now()}_...` |

The legacy `admin-auth.js` stores password as `password` and checks `active`, while the current system uses `passwordHash` and `isActive`. **If any admin was created via the legacy module, login via the current system would fail.**

---

## 6. Environment Variable Status

### 6A. Auth-Critical Variables

| Variable | .env.example | .env.local | .env.production | Required For |
|----------|-------------|-----------|----------------|-------------|
| `JWT_SECRET` | ❌ Missing | ✅ Set | ✅ Set | All JWT operations |
| `ADMIN_SETUP_SECRET` | ❌ Missing | ✅ Set | ❌ Missing | Admin setup endpoint |
| `ADMIN_DEFAULT_EMAIL` | ❌ Missing | ✅ Set | ✅ Set | Admin setup fallback |
| `ADMIN_DEFAULT_PASSWORD` | ❌ Missing | ✅ Set | ✅ Set | Admin setup fallback |
| `ADMIN_API_KEY` | ❌ Missing | ❌ Missing | ❌ Missing | Legacy auth.ts (if used) |
| `MASTER_API_KEY` | ❌ Missing | ❌ Missing | ❌ Missing | Legacy auth.ts / rewards-security |
| `CRON_SECRET` | ✅ Listed | ✅ Set | ✅ Set | Cron job auth |
| `SYNC_SECRET` | ❌ Missing | ❌ Missing | ✅ Set | Sync endpoint auth |
| `MONGODB_URI` | ✅ Listed | ✅ Set | ✅ Set | All DB operations |

### 6B. Other Variables

| Variable | .env.local | .env.production | Notes |
|----------|-----------|----------------|-------|
| `NEXT_PUBLIC_BASE_URL` | ✅ Set | ✅ Set | |
| `SQUARE_ACCESS_TOKEN` | ✅ Set | ✅ Set | |
| `SQUARE_ENVIRONMENT` | ✅ Set | ✅ Set | |
| `RESEND_API_KEY` | ✅ Set | ✅ Set | Email provider |
| `TWILIO_*` | ✅ Set (local) | ❌ Missing (prod) | SMS not in production env file |
| `SENTRY_*` | ❌ Missing | ❌ Missing | In .env.example but not set |
| `REDIS_URL` | ❌ Missing | ❌ Missing | In .env.example; rate limiting is in-memory |

### 6C. .env.example Gaps
The `.env.example` is **missing** all auth-related variables:
- `JWT_SECRET`
- `ADMIN_SETUP_SECRET`
- `ADMIN_DEFAULT_EMAIL`
- `ADMIN_DEFAULT_PASSWORD`
- `ADMIN_API_KEY`
- `MASTER_API_KEY`
- `SYNC_SECRET`
- `INIT_SECRET`

---

## 7. Security Findings

### 🔴 CRITICAL

**F1: All 6 consumer auth API routes are EMPTY directories**
- `app/api/auth/{login,register,session,logout,forgot-password,reset-password}/` — directories exist but contain NO route files
- `AuthContext.js` calls these endpoints, meaning: login, registration, session restore, and logout are **completely non-functional** for consumers
- The test file (`tests/auth-register-route.test.ts`) is marked `.skip` with note "route removed, pending reimplementation"
- **Impact:** No consumer can register, log in, or use any authenticated feature

**F2: Password hashing mismatch in `unified-admin.ts`**
- `hashPassword()` in `lib/auth/unified-admin.ts` uses SHA-256 (Edge-compatible)
- `hashPassword()` in `lib/auth.ts` and `lib/auth/jwt.js` uses bcrypt
- The admin login route (`app/api/admin/auth/login/route.ts`) uses `bcrypt.compare()`
- If any code path uses `unified-admin.ts`'s `hashPassword()` to create a password, that admin **cannot log in** via the standard login route

### 🟡 HIGH

**F3: Admin user field name inconsistency**
- Legacy `admin-auth.js` stores password as `password` + active as `active`
- Current system expects `passwordHash` + `isActive`
- Any admin created via legacy code has a broken record

**F4: No database indexes on `users` collection**
- No index on `email` or `id` fields
- All user lookups do collection scans
- No unique constraint on email at DB level (app-level check is race-condition vulnerable)

**F5: `admin/setup` endpoint requires admin session to create first admin (chicken-and-egg)**
- Line 76: `const session = await requireAdminSession(request)` — must be authenticated to create the first admin
- The `GET` handler (check if setup needed) is unprotected, but `POST` is
- There's also an `emergency-init` endpoint that may bypass this

**F6: Rate limiting is entirely in-memory**
- All rate limit stores use `Map()` — reset on every deploy/restart
- Serverless (Vercel) means each cold start resets rate limits
- `REDIS_URL` is in `.env.example` but not set anywhere

### 🟠 MEDIUM

**F7: 4+ redundant admin auth implementations**
- `lib/admin-session.ts` — canonical (Edge-safe)
- `lib/auth/unified-admin.ts` — canonical (server-side, with DB checks)
- `lib/admin-auth.js` — legacy (different field names)
- `lib/admin-token.ts` — legacy (duplicate of admin-session)
- `lib/auth.ts` — legacy (static API key comparison)
- Creates confusion about which to use; legacy modules may be imported by some routes

**F8: CSRF not enforced on consumer routes**
- Consumer auth uses simple JWT cookies with no CSRF protection
- Admin auth has full CSRF (header + cookie validation) — consumers do not

**F9: `.env.example` missing all auth variables**
- A new developer would have no idea which auth env vars are needed

**F10: Dev secrets are weak and predictable**
- `dev-only-insecure-secret-do-not-use-in-production` used across all modules
- `development-only-insecure-key` in jwt.js
- `dev-setup-secret`, `dev-cron-secret`, `dev-sync-secret` in auth-config.ts

---

## 8. Summary & Recommended Actions

### Must Fix (Blocking)
1. **Implement all 6 consumer auth routes** — registration, login, session, logout, forgot-password, reset-password
2. **Standardize admin password field** — migrate any `password` → `passwordHash`, `active` → `isActive`
3. **Fix setup endpoint** — remove `requireAdminSession` from POST or add a bootstrap path

### Should Fix (High Priority)
4. **Add MongoDB indexes** — `users.email` (unique), `users.id` (unique), `admin_users.email` (unique)
5. **Remove or deprecate legacy auth modules** — admin-auth.js, admin-token.ts, auth.ts
6. **Add CSRF to consumer auth** if cookie-based auth is used
7. **Update `.env.example`** with all required auth variables

### Nice to Have
8. Move rate limiting to Redis when `REDIS_URL` is configured
9. Consolidate the 4 admin auth modules into 2 (Edge-safe + server-side)
10. Add `preferences` field to user model or document that it's intentionally omitted
