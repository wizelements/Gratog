# Square 401 Authentication Error - Root Cause Analysis & Fix Guide

## 🔍 Diagnostic Summary

**Date:** 2025-10-28  
**Status:** ❌ AUTHENTICATION FAILURE  
**Impact:** All Square API calls failing with 401 UNAUTHORIZED

---

## ✅ What's Working

1. **Configuration**: All environment variables properly set
   - `SQUARE_ACCESS_TOKEN`: Present (64 characters, EAAA prefix)
   - `SQUARE_LOCATION_ID`: LYSFJ7XXCPQG5
   - `SQUARE_APPLICATION_ID`: sq0idp-V1fV-MwsU5lET4rvzHKnIw
   - `SQUARE_ENVIRONMENT`: production

2. **Token Format**: Valid production token format (EAAA prefix)

3. **Webhook Configuration**: Signature key configured

---

## ❌ Root Cause

**Square API Response:**
```
Category: AUTHENTICATION_ERROR
Code: UNAUTHORIZED
Detail: "This request could not be authorized."
```

**All API endpoints failing:**
- ❌ Locations API (401)
- ❌ Catalog API (401)
- ❌ Payments API (401)
- ❌ Orders API (401)

**Diagnosis:** The access token format is correct but Square's API is rejecting it. This indicates:

1. **Token is invalid, expired, or revoked**
2. **Missing required OAuth scopes** (PAYMENTS_WRITE, ORDERS_WRITE, CATALOG_READ, INVENTORY_READ)
3. **Application ID and Access Token mismatch** (token from different app)
4. **Token belongs to different Square account**

---

## 🔧 Fix Steps

### Option 1: Regenerate Access Token (Recommended)

1. **Go to Square Developer Dashboard:**
   ```
   https://developer.squareup.com/apps
   ```

2. **Select your application:**
   - Find app with ID: `sq0idp-V1fV-MwsU5lET4rvzHKnIw`
   - Or the app named for "Taste of Gratitude"

3. **Regenerate Production Access Token:**
   - Go to **Credentials** tab
   - Under **Production** section
   - Click **Show** next to "Production Access Token"
   - Click **Regenerate** if token is expired/invalid
   - Copy the new token (starts with `EAAA` or `sq0atp-`)

4. **Verify OAuth Scopes:**
   - Go to **OAuth** tab
   - Ensure these scopes are enabled:
     - ✅ `PAYMENTS_READ`
     - ✅ `PAYMENTS_WRITE`
     - ✅ `ORDERS_READ`
     - ✅ `ORDERS_WRITE`
     - ✅ `CATALOG_READ`
     - ✅ `INVENTORY_READ`
     - ✅ `ITEMS_READ`
     - ✅ `ITEMS_WRITE`

5. **Update .env file:**
   ```bash
   SQUARE_ACCESS_TOKEN=<your_new_production_token>
   ```

6. **Restart application:**
   ```bash
   sudo supervisorctl restart nextjs
   ```

7. **Test authentication:**
   ```bash
   curl http://localhost:3000/api/square/diagnose
   ```

### Option 2: Verify Application Configuration

1. **Check Location Access:**
   - In Square Dashboard, go to **Locations**
   - Verify location `LYSFJ7XXCPQG5` exists
   - Ensure your app has access to this location

2. **Verify Application ID:**
   - Credentials tab → Copy **Application ID**
   - Should match: `sq0idp-V1fV-MwsU5lET4rvzHKnIw`
   - If different, update `NEXT_PUBLIC_SQUARE_APPLICATION_ID` in .env

3. **Check Application Status:**
   - Ensure app is **not in review** or **suspended**
   - Production mode must be **enabled**

### Option 3: Use OAuth Flow (Long-term Solution)

For production apps, using OAuth is more secure than personal access tokens:

1. **Set up OAuth redirect:**
   - Add redirect URL in Square Dashboard
   - URL: `https://taste-gratitude-pay.preview.emergentagent.com/api/auth/square/callback`

2. **Implement OAuth flow:**
   - User authorizes app
   - App receives authorization code
   - Exchange code for access + refresh tokens
   - Store refresh token securely
   - Auto-refresh before expiry

---

## 🧪 Testing After Fix

Run the diagnostic endpoint to verify:
```bash
curl http://localhost:3000/api/square/diagnose | jq '.summary'
```

**Expected result:**
```json
{
  "overallStatus": "HEALTHY",
  "hasAuthenticationIssues": false,
  "canProcessPayments": true,
  "passedTests": 5,
  "failedTests": 0
}
```

---

## 🚀 Next Steps After Authentication is Fixed

1. **Sync Square Catalog:**
   ```bash
   cd /app
   node scripts/syncCatalog.js
   ```

2. **Configure Webhooks:**
   - URL: `https://taste-gratitude-pay.preview.emergentagent.com/api/webhooks/square`
   - Events:
     - `payment.created`
     - `payment.updated`
     - `order.created`
     - `order.updated`
     - `inventory.count.updated`
     - `catalog.version.updated`

3. **Test Payment Flow:**
   - Test Web Payments SDK checkout
   - Test Payment Links creation
   - Verify webhook notifications

---

## 📊 Current Token Information

- **Prefix:** `EAAAl8wKeh...`
- **Length:** 64 characters
- **Type:** Production token (legacy format)
- **Status:** ❌ UNAUTHORIZED
- **Last Tested:** 2025-10-28 23:29:28 UTC

---

## 💡 Common Issues

### "Token has insufficient permissions"
→ Add missing OAuth scopes in Developer Dashboard

### "Application not found"
→ Verify Application ID matches in .env

### "Location not found"
→ Update SQUARE_LOCATION_ID with valid location ID

### "Token expired"
→ Regenerate in Developer Dashboard

---

## 🆘 Need Help?

If issues persist after following this guide:

1. Check Square API Status: https://status.squareup.com
2. Review Square API logs in Developer Dashboard
3. Contact Square Developer Support
4. Check Square API changelog for breaking changes

---

**Generated by:** Square Diagnostic Tool  
**Diagnostic Endpoint:** `/api/square/diagnose`  
**Documentation:** https://developer.squareup.com/docs
