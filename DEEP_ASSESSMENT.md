# Gratog Deep Assessment — CRITICAL ISSUES FOUND
**Date:** 2026-05-22 23:15 EDT  
**Status:** 🔴 5 CRITICAL ISSUES IDENTIFIED

---

## Executive Summary

Deep assessment of Gratog production codebase revealed **5 critical issues** that will cause failures or degraded functionality. These issues are **already present in production** and require immediate attention.

| Priority | Issue | Impact | Location |
|----------|-------|--------|----------|
| 🔴 CRITICAL | Missing STRIPE_WEBHOOK_SECRET | Stripe webhooks fail-closed | `.env.production` |
| 🔴 CRITICAL | MONGODB_URI has newline character | Connection failures | `.env.production` line |
| 🟡 HIGH | Hardcoded webhook signature key | Security risk | `.env.production` |
| 🟡 HIGH | Duplicate Mongoose index warnings | Performance degradation | `models/` (various) |
| 🟡 HIGH | next-sitemap env parsing error | Build warnings | `next-sitemap` postbuild |

---

## Critical Issues

### 1. 🔴 MISSING STRIPE_WEBHOOK_SECRET

**Impact:** Stripe webhooks will be **rejected in production** (fail-closed)

**Evidence from startup-validator.ts:**
```typescript
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!stripeWebhookSecret && isProduction) {
  errors.push('STRIPE_WEBHOOK_SECRET not configured — Stripe webhooks will be rejected (fail-closed)');
}
```

**Evidence from Vercel build:**
```
❌ Startup validation failed:
- STRIPE_WEBHOOK_SECRET not configured — Stripe webhooks will be rejected (fail-closed)
```

**Verification:**
```bash
$ grep STRIPE_WEBHOOK_SECRET .env.production
# (no output — NOT PRESENT)
```

**Fix Required:**
```bash
# Add to .env.production
STRIPE_WEBHOOK_SECRET="whsec_..."
```

---

### 2. 🔴 MONGODB_URI Has Trailing Newline

**Impact:** MongoDB connection string parsing failures

**Evidence from .env.production:**
```
$ grep "MONGODB_URI" .env.production | od -c | tail -3
0000220   d   e   0   \   n   "  \n
                              ↑↑↑↑
                              Trailing \\n + newline in quotes
```

**Current value:**
```
MONGODB_URI="mongodb+srv://Togratitude:$gratitud3$@gratitude0.1ckskrv.mongodb.net/taste_of_gratitude?retryWrites=true&w=majority&appName=Gratitude0\n"
```

**Problem:** The `\n` is literal text inside the quoted string, not an escape sequence. This creates an invalid connection string.

**Fix Required:**
```bash
# Remove the \\n from the value
MONGODB_URI="mongodb+srv://Togratitude:$gratitud3$@gratitude0.1ckskrv.mongodb.net/taste_of_gratitude?retryWrites=true&w=majority&appName=Gratitude0"
```

---

### 3. 🟡 Hardcoded Webhook Signature Key

**Impact:** Security risk — signature key stored in repo

**Evidence:**
```
$ grep SQUARE_WEBHOOK_SIGNATURE_KEY .env.production
SQUARE_WEBHOOK_SIGNATURE_KEY="taste-of-gratitude-webhook-key-2024"
```

**Problem:** The webhook signature key should be:
1. A cryptographically random value
2. Rotated periodically
3. Stored in Vercel environment (not in repo)

**Current key format:** Human-readable, predictable pattern

**Fix Required:**
```bash
# Generate new random key
openssl rand -hex 32

# Add to Vercel dashboard (not .env.production)
vercel env add SQUARE_WEBHOOK_SECRET production
```

---

### 4. 🟡 Duplicate Mongoose Index Warnings

**Impact:** Build warnings, potential performance issues

**Evidence from Vercel build:**
```
(node:340) [MONGOOSE] Warning: Duplicate schema index on {"orderNumber":1} found. 
This is often due to declaring an index using both "index: true" and "schema.index()". 
Please remove the duplicate index definition.
```

**Root cause:** Schema declares `orderNumber: { type: String, index: true }` AND `schema.index({ orderNumber: 1 })`

**Files to check:**
- `models/Order.ts` or similar
- Any model with `orderNumber` field

**Fix Required:**
```typescript
// Remove ONE of these declarations:

// Option A: Keep in schema definition
orderNumber: { type: String, index: true }  // ← Keep this
// AND remove: schema.index({ orderNumber: 1 })

// Option B: Keep explicit index
orderNumber: { type: String }  // ← Remove index: true
// AND keep: schema.index({ orderNumber: 1 })
```

---

### 5. 🟡 next-sitemap Environment Parsing Error

**Impact:** Build warnings (non-blocking but noisy)

**Evidence from build:**
```
Failed to load env from /vercel/path0/.env.production TypeError: 
Cannot read properties of undefined (reading 'split')
```

**Related to:** Issue #2 (MONGODB_URI with `\n`)

**Fix:** Same as Issue #2 — clean up malformed env values.

---

## Medium Issues

### 6. 🟠 Missing TODO Items in Code

Found in codebase (non-blocking but technical debt):

| File | TODO | Priority |
|------|------|----------|
| `app/gratitude/rewards/page.jsx` | Get actual customer ID from auth | Medium |
| `app/gratitude/page.jsx` | Get actual customer ID from auth | Medium |
| `app/api/gratitude/webhook/route.ts` | Verify webhook signature | **HIGH** |
| `lib/returns.ts` | Integrate with Square/Stripe for refund | Medium |
| `components/market/PWAPrompts.tsx` | Register service worker for push | Low |

**Critical:** `app/api/gratitude/webhook/route.ts` has unverified webhook signature — security risk.

---

## Summary Table

| Issue | Severity | Fix Complexity | Production Impact |
|-------|----------|----------------|-------------------|
| STRIPE_WEBHOOK_SECRET missing | 🔴 Critical | Low (add env var) | **Webhooks failing** |
| MONGODB_URI newline | 🔴 Critical | Low (edit env) | **Connection failures** |
| Hardcoded webhook key | 🟡 High | Medium (rotate + update) | Security risk |
| Duplicate Mongoose index | 🟡 High | Low (code change) | Performance |
| next-sitemap env error | 🟡 High | Low (fix Issue #2) | Build noise |
| Unverified webhook sig | 🟠 Medium | Medium (add verification) | Security risk |

---

## Immediate Action Required

### Step 1: Fix Critical Env Issues (NOW)
```bash
# 1. Pull Vercel env to local
vercel env pull .env.production

# 2. Fix MONGODB_URI — remove \\n from value
# Edit .env.production manually or via Vercel dashboard

# 3. Add STRIPE_WEBHOOK_SECRET
# Get from Stripe Dashboard → Developers → Webhooks → Signing secret
vercel env add STRIPE_WEBHOOK_SECRET production

# 4. Regenerate SQUARE_WEBHOOK_SIGNATURE_KEY
openssl rand -hex 32
vercel env add SQUARE_WEBHOOK_SIGNATURE_KEY production

# 5. Push to production
vercel --prod
```

### Step 2: Fix Duplicate Index (This Week)
```bash
# Find and fix duplicate index declarations
grep -rn "orderNumber.*index" models/
grep -rn "schema.index.*orderNumber" models/

# Remove one of the duplicate declarations
```

### Step 3: Verify Webhook Signatures (This Week)
```typescript
// Add to app/api/gratitude/webhook/route.ts
import { verifyWebhookSignature } from '@/lib/square';

export async function POST(request: Request) {
  const signature = request.headers.get('x-square-signature');
  const body = await request.text();
  
  if (!verifyWebhookSignature(signature, request.url, body)) {
    return new Response('Invalid signature', { status: 401 });
  }
  // ... rest of handler
}
```

---

## Verification Commands

```bash
# Check env values
cat .env.production | grep -E "(STRIPE|MONGODB|SQUARE_WEBHOOK)" | od -c

# Check for duplicate indexes
grep -rn "orderNumber" models/ | grep -i index

# Check webhook signature verification
grep -rn "verifyWebhookSignature" app/api/
```

---

*Generated by Cod3Black Command Center*  
*Assessment: 2026-05-22 23:15 EDT*
