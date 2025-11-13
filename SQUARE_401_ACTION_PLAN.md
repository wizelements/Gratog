# Square 401 Error Elimination - Complete Action Plan

## Executive Summary

**Status**: ✅ Diagnostic Complete | ❌ Authentication Failing  
**Root Cause Identified**: Square Access Token authentication failure  
**Impact**: Payment processing, catalog sync, and order management blocked  
**Solution**: Access token regeneration required

---

## 🔴 Critical Findings

### Authentication Test Results

```
Test Suite: 6 tests
✅ PASSED: 3 tests (50%)
❌ FAILED: 3 tests (50%)

PASSED:
- Configuration validation
- Token format validation
- Webhook signature key configuration

FAILED:
- API connectivity (401 UNAUTHORIZED)
- Catalog access (401 UNAUTHORIZED)
- Payments API capability (401 UNAUTHORIZED)
```

### Square API Error

```json
{
  "category": "AUTHENTICATION_ERROR",
  "code": "UNAUTHORIZED",
  "detail": "This request could not be authorized."
}
```

**This error appears on ALL Square API endpoints**, indicating the access token itself is the issue, not specific API permissions.

---

## 🎯 Required Actions

### IMMEDIATE (User Action Required)

1. **Regenerate Square Access Token**
   ```
   Location: Square Developer Dashboard > Your App > Credentials > Production
   Action: Generate new Production Access Token
   Required Scopes:
     - PAYMENTS_READ
     - PAYMENTS_WRITE
     - ORDERS_READ
     - ORDERS_WRITE
     - CATALOG_READ
     - INVENTORY_READ
     - ITEMS_READ
     - ITEMS_WRITE
   ```

2. **Update Environment Variable**
   ```bash
   # Update .env file
   SQUARE_ACCESS_TOKEN=<new_token_from_square_dashboard>
   ```

3. **Restart Application**
   ```bash
   sudo supervisorctl restart nextjs
   ```

4. **Verify Fix**
   ```bash
   curl http://localhost:3000/api/square/diagnose
   ```
   Expected: `"overallStatus": "HEALTHY"`

### AFTER TOKEN IS FIXED

1. **Sync Square Catalog**
   ```bash
   cd /app
   node scripts/syncCatalog.js
   ```

2. **Configure Square Webhooks**
   - Webhook URL: `https://taste-gratitude-pay.preview.emergentagent.com/api/webhooks/square`
   - Subscribe to events:
     - `payment.created`
     - `payment.updated`
     - `order.created`
     - `order.updated`
     - `inventory.count.updated`
     - `catalog.version.updated`

3. **Test Payment Flows**
   - Web Payments SDK (in-page checkout)
   - Payment Links (Square-hosted checkout)
   - Webhook notifications

---

## 🛠️ Technical Implementation Completed

### ✅ Diagnostic System Created

**New Endpoint**: `/api/square/diagnose`

Tests performed:
- ✅ Configuration validation
- ✅ Access token format validation
- ✅ Square API connectivity check
- ✅ Location validation
- ✅ Catalog API access test
- ✅ Payments API capability test
- ✅ Webhook configuration check

**Output**: Comprehensive JSON report with:
- Test results
- Error details
- Recommendations
- Overall health status

### ✅ Webhook Security Hardened

Updated `/app/app/api/webhooks/square/route.ts`:
- Added `runtime = 'nodejs'` for proper crypto operations
- Raw body parsing for signature verification
- HMAC SHA-256 signature validation
- Timing-safe comparison to prevent timing attacks

### ✅ Documentation Created

Files generated:
1. **SQUARE_401_FIX_GUIDE.md** - Comprehensive fix guide
2. **Diagnostic endpoint** - Real-time authentication testing

---

## 🔐 Security Considerations

### Webhook Signature Verification

Current implementation:
```typescript
// Parse Square signature format: "v=1,t=<signature>"
const stringToSign = requestUrl + requestBody;
const hmac = crypto.createHmac('sha256', SQUARE_WEBHOOK_SIGNATURE_KEY);
hmac.update(stringToSign);
const calculatedSignature = hmac.digest('base64');

// Timing-safe comparison
crypto.timingSafeEqual(
  Buffer.from(calculatedSignature),
  Buffer.from(signatureValue)
);
```

**Status**: ✅ Secure implementation with Node.js runtime

### Access Token Storage

Current: Environment variables (`.env`)  
Recommendation: Use secure secrets management for production:
- Kubernetes Secrets
- AWS Secrets Manager
- HashiCorp Vault

---

## 📊 Current vs Target State

### Current State
```
Authentication: ❌ FAILING
Catalog Sync: ❌ BLOCKED (401)
Payment Processing: ❌ BLOCKED (401)
Webhooks: ⚠️ CONFIGURED (untested)
Order Management: ❌ BLOCKED (401)
```

### Target State (After Fix)
```
Authentication: ✅ HEALTHY
Catalog Sync: ✅ SYNCED (products in database)
Payment Processing: ✅ LIVE (Web SDK + Payment Links)
Webhooks: ✅ RECEIVING (real-time updates)
Order Management: ✅ OPERATIONAL (create/track orders)
```

---

## 🧪 Testing Checklist

After token regeneration:

- [ ] Diagnostic endpoint shows "HEALTHY"
- [ ] Locations API returns location list
- [ ] Catalog API returns items
- [ ] Payments API accessible (404 for test ID is OK)
- [ ] Sync catalog script completes successfully
- [ ] Web Payments SDK processes test payment
- [ ] Payment Link creates successfully
- [ ] Webhook endpoint receives test event
- [ ] Order creation works end-to-end

---

## 🚨 Potential Issues & Solutions

### Issue 1: New token still fails (401)

**Causes:**
- Wrong app selected in dashboard
- Missing OAuth scopes
- Location access not granted

**Solution:**
1. Double-check Application ID matches: `sq0idp-V1fV-MwsU5lET4rvzHKnIw`
2. Verify all required scopes are checked
3. Ensure location `LYSFJ7XXCPQG5` is accessible

### Issue 2: Webhook signature verification fails

**Causes:**
- Wrong signature key
- URL mismatch (http vs https)
- Body parsing issues

**Solution:**
1. Copy exact signature key from Square Dashboard
2. Ensure webhook URL matches exactly (including protocol)
3. Runtime is set to 'nodejs' (already done)

### Issue 3: Catalog sync fails

**Causes:**
- No items in Square catalog
- Permission issues
- Network/timeout problems

**Solution:**
1. Create items in Square POS/Dashboard first
2. Verify CATALOG_READ scope
3. Check network connectivity to Square API

---

## 📞 Support Resources

- **Square Developer Dashboard**: https://developer.squareup.com/apps
- **Square API Status**: https://status.squareup.com
- **Square API Docs**: https://developer.squareup.com/docs
- **Square Developer Support**: https://developer.squareup.com/support

---

## 📝 Implementation Notes

### What Was Done

1. **Created diagnostic endpoint** (`/api/square/diagnose`)
   - Tests all Square API access points
   - Provides detailed error analysis
   - Gives actionable recommendations

2. **Hardened webhook security**
   - Added Node.js runtime enforcement
   - Implemented proper HMAC verification
   - Added timing-safe comparison

3. **Generated documentation**
   - Fix guide for 401 errors
   - This action plan
   - Testing procedures

### What Needs User Action

1. **Regenerate Square Access Token** (CRITICAL)
2. **Update .env file with new token**
3. **Restart application**
4. **Run catalog sync**
5. **Configure webhooks in Square Dashboard**

---

## ✅ Completion Criteria

401 errors will be eliminated when:

1. ✅ Diagnostic endpoint returns `"overallStatus": "HEALTHY"`
2. ✅ All 6 tests in diagnostic pass
3. ✅ Square API calls return data (not 401)
4. ✅ Payment processing works end-to-end
5. ✅ Webhooks receive and process events

---

**Last Updated**: 2025-10-28 23:30 UTC  
**Next Action**: User must regenerate Square Access Token  
**Estimated Time to Fix**: 10-15 minutes (user action required)
