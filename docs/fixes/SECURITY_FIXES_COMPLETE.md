# Admin Security Fixes - Complete

**Date:** December 18, 2025

## Summary

A comprehensive security audit was performed on the admin/customer separation. **8 security issues** were identified and fixed.

## Critical Issues Fixed

### 1. 🔴 CRITICAL: `/api/admin/auth/me` Mock Bypass
**Before:** Returned a hardcoded mock admin user without ANY token validation - anyone could access admin features.

**After:** Now properly validates `admin_token` cookie using `getAdminSession()` and returns 401 if not authenticated.

### 2. 🟠 HIGH: Middleware Only Protected Pages, Not APIs
**Before:** Middleware only protected `/admin/*` pages, not `/api/admin/*` endpoints.

**After:** Middleware now protects both `/admin/:path*` AND `/api/admin/:path*` routes as a defense-in-depth measure.

### 3. 🟠 HIGH: Inconsistent Auth Checks
**Before:** Routes used various auth methods: `verifyToken()`, `requireAdmin()` from different modules, some with role checks, some without.

**After:** All admin API routes now use the unified `requireAdmin()` from `@/lib/admin-session` which:
- Validates JWT signature
- Checks token expiry
- Enforces `role === 'admin'`

### 4. 🟡 MEDIUM: Dual Token Formats
**Before:** Two incompatible token shapes (`{userId, email, role}` vs `{id, email, role, name}`).

**After:** Standardized on `{id, email, role, name}` format. Login now uses `generateAdminToken()` which produces the correct shape.

### 5. 🟡 MEDIUM: Setup/Init Endpoint Exposure
**Before:** `/api/admin/setup` GET leaked admin email.

**After:** 
- In production, only returns `{setupRequired: boolean}`
- Added `ADMIN_SETUP_DISABLED` and `ADMIN_INIT_DISABLED` env vars to disable after setup
- Warnings logged if secrets are too short

## Files Changed

### New Files
- `lib/admin-session.ts` - **Single source of truth** for admin authentication

### Updated Files
- `middleware.ts` - Extended to protect `/api/admin/*`
- `lib/admin-auth-middleware.js` - Now uses unified session
- `components/admin/ProtectedRoute.js` - Properly handles 401 responses
- `app/api/admin/auth/me/route.js` - Fixed critical mock bypass
- `app/api/admin/auth/login/route.js` - Uses new token format
- `app/api/admin/auth/logout/route.js` - Uses unified cookie helper
- `app/api/admin/setup/route.js` - Hardened with env controls
- `app/api/admin/init/route.js` - Hardened with env controls
- All other `/api/admin/*` routes - Use unified `requireAdmin()`

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        middleware.ts                         │
│  First line of defense - blocks unauthenticated requests    │
│  to /admin/* pages AND /api/admin/* endpoints               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    lib/admin-session.ts                      │
│  SINGLE SOURCE OF TRUTH for admin auth:                     │
│  - verifyAdminToken()  - Validate JWT                       │
│  - generateAdminToken() - Create standardized JWT           │
│  - requireAdmin()      - Throw if not authenticated         │
│  - getAdminSession()   - Get session or null                │
│  - withAdminAuth()     - HOF for route handlers             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Route Handlers                        │
│  Each route calls requireAdmin() for defense-in-depth       │
│  Even if middleware is bypassed, routes are protected       │
└─────────────────────────────────────────────────────────────┘
```

## Token Format (Standardized)

```json
{
  "id": "user_mongodb_id",
  "email": "admin@example.com",
  "role": "admin",
  "name": "Admin User",
  "iat": 1702900000,
  "exp": 1703504800
}
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | **Required in production.** Should be 32+ characters. |
| `ADMIN_SETUP_SECRET` | Required for `/api/admin/setup`. Should be 32+ characters. |
| `INIT_SECRET` | Required for `/api/admin/init`. Should be 32+ characters. |
| `ADMIN_DEFAULT_EMAIL` | Default admin email for setup. |
| `ADMIN_DEFAULT_PASSWORD` | Default admin password for setup. |
| `ADMIN_SETUP_DISABLED` | Set to `true` to disable setup endpoint. |
| `ADMIN_INIT_DISABLED` | Set to `true` to disable init endpoint. |

## Recommendations

1. **After deploying**, set `ADMIN_SETUP_DISABLED=true` and `ADMIN_INIT_DISABLED=true` in Vercel env vars
2. Rotate JWT_SECRET if it was previously weak or exposed
3. Ensure all secrets are 32+ characters
4. Review audit logs periodically (`/api/admin/audit-logs`)

## Testing

Build verified: ✅ `npm run build` completed successfully
