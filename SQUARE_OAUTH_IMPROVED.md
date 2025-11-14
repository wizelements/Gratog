# Square OAuth Configuration - Improved Guide

## 🎯 Understanding Square Authentication Errors

### Error Categories

**401 UNAUTHORIZED**
- **Meaning**: Invalid/expired token OR wrong environment (sandbox vs production)
- **When it happens**: 
  - Token has been revoked
  - Token has expired
  - Using sandbox token against production API (or vice versa)
  - Token format is incorrect
- **How to diagnose**: Use `RetrieveTokenStatus` endpoint to confirm token validity
- **Solution**: Regenerate token OR verify environment matches

**403 FORBIDDEN**
- **Meaning**: Valid token but missing required scope for the endpoint
- **When it happens**:
  - Token was generated before scope was enabled
  - Scope was not selected when creating token
  - Using read-only scope on write endpoint (e.g., PAYMENTS_READ on create payment)
- **How to diagnose**: Check token scopes via `RetrieveTokenStatus`
- **Solution**: Enable required scopes in Dashboard → Generate NEW token

---

## 🔧 Method 1: OAuth Flow (For Third-Party Apps)

### Step 1: Build Authorization URL

**Sandbox:**
```
https://connect.squareupsandbox.com/oauth2/authorize?
  client_id=sandbox-sq0idb-YOUR_APP_ID&
  scope=MERCHANT_PROFILE_READ+ITEMS_READ+ORDERS_READ+ORDERS_WRITE+PAYMENTS_READ+PAYMENTS_WRITE&
  session=false&
  state=RANDOM_STATE_STRING&
  redirect_uri=https://your-domain.com/api/square/oauth/callback
```

**Production:**
```
https://connect.squareup.com/oauth2/authorize?
  client_id=sq0idp-YOUR_APP_ID&
  scope=MERCHANT_PROFILE_READ+ITEMS_READ+ORDERS_READ+ORDERS_WRITE+PAYMENTS_READ+PAYMENTS_WRITE&
  session=false&
  state=RANDOM_STATE_STRING&
  redirect_uri=https://your-domain.com/api/square/oauth/callback
```

**Required Scopes** (space or + delimited):
- `MERCHANT_PROFILE_READ` - Access location info
- `ITEMS_READ` - Read catalog products
- `ORDERS_READ` - Query order status
- `ORDERS_WRITE` - Create orders
- `PAYMENTS_READ` - Query payment status  
- `PAYMENTS_WRITE` - Process payments
- `INVENTORY_READ` - Monitor inventory (optional)
- `CUSTOMERS_READ` - Access customers (optional)
- `CUSTOMERS_WRITE` - Create customers (optional)

### Step 2: Exchange Authorization Code

After user authorizes, Square redirects to your callback with `code`:

```bash
curl -X POST https://connect.squareup.com/oauth2/token \
  -H "Content-Type: application/json" \
  -H "Square-Version: 2025-10-16" \
  -d '{
    "client_id": "sq0idp-YOUR_APP_ID",
    "client_secret": "sq0csp-YOUR_APP_SECRET",
    "code": "AUTHORIZATION_CODE_FROM_CALLBACK",
    "grant_type": "authorization_code",
    "redirect_uri": "https://your-domain.com/api/square/oauth/callback"
  }'
```

**Response:**
```json
{
  "access_token": "EAAAl...",
  "token_type": "bearer",
  "expires_at": "2026-01-15T00:00:00Z",
  "merchant_id": "MLG...",
  "refresh_token": "..."
}
```

---

## 🔑 Method 2: Personal Access Token (Simplest)

### For Your Own Business

1. **Go to Square Developer Dashboard**
   - Visit: https://developer.squareup.com/apps
   - Select your application

2. **Enable OAuth Scopes**
   - Navigate to: **OAuth** tab
   - Under **Permissions**, enable all required scopes:
     - ☑️ MERCHANT_PROFILE_READ
     - ☑️ ITEMS_READ
     - ☑️ ORDERS_READ
     - ☑️ ORDERS_WRITE
     - ☑️ PAYMENTS_READ
     - ☑️ PAYMENTS_WRITE
   - Click **Save**

3. **Generate Access Token**
   - Navigate to: **Credentials** tab
   - Under **Production** section:
     - Click **Show** next to "Access token"
     - OR click **Regenerate** if token already exists
   - Copy the FULL token (starts with `EAAA` or `sq0atp-`)
   - ⚠️ **Important**: Save immediately - you cannot view it again!

4. **Note Your Credentials**
   - **Application ID**: `sq0idp-...` (from Credentials page)
   - **Access Token**: `EAAA...` or `sq0atp-...` (just generated)
   - **Location ID**: Get from Locations API or Dashboard

---

## ✅ Validate Your Token

### Official Token Status Endpoint

**Production:**
```bash
curl -X POST https://connect.squareup.com/oauth2/token/status \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Square-Version: 2025-10-16"
```

**Sandbox:**
```bash
curl -X POST https://connect.squareupsandbox.com/oauth2/token/status \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Square-Version: 2025-10-16"
```

**Expected Response (Valid Token with Scopes):**
```json
{
  "scopes": [
    "MERCHANT_PROFILE_READ",
    "ITEMS_READ",
    "ORDERS_READ",
    "ORDERS_WRITE",
    "PAYMENTS_READ",
    "PAYMENTS_WRITE"
  ],
  "expires_at": null,
  "client_id": "sq0idp-V1fV-MwsU5lET4rvzHKnIw",
  "merchant_id": "MLG3XYZ123"
}
```

**Response (Invalid Token):**
```json
{
  "errors": [{
    "category": "AUTHENTICATION_ERROR",
    "code": "UNAUTHORIZED",
    "detail": "The access token is invalid or expired"
  }]
}
```

**Response (Valid Token, No Scopes):**
```json
{
  "scopes": [],  ← PROBLEM: Empty array means no permissions
  "expires_at": null,
  "client_id": "sq0idp-...",
  "merchant_id": "..."
}
```

---

## 🧪 Scope Smoke Tests

Test each scope to distinguish 401 vs 403 errors:

### Test 1: Baseline - Locations API
**Required Scope**: `MERCHANT_PROFILE_READ`

```bash
curl -X GET https://connect.squareup.com/v2/locations \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Square-Version: 2025-10-16"
```

**Possible Outcomes:**
- ✅ **200 OK**: Token valid + has MERCHANT_PROFILE_READ
- ❌ **401 UNAUTHORIZED**: Token invalid/expired OR wrong environment
- ⚠️  **403 FORBIDDEN**: Token valid but missing MERCHANT_PROFILE_READ scope

### Test 2: Payments API
**Required Scope**: `PAYMENTS_READ`

```bash
curl -X GET "https://connect.squareup.com/v2/payments?limit=1" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Square-Version: 2025-10-16"
```

**Possible Outcomes:**
- ✅ **200 OK**: Has PAYMENTS_READ scope
- ⚠️  **403 FORBIDDEN**: Missing PAYMENTS_READ scope

### Test 3: Catalog API  
**Required Scope**: `ITEMS_READ`

```bash
curl -X GET "https://connect.squareup.com/v2/catalog/list?types=ITEM&limit=1" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Square-Version: 2025-10-16"
```

**Possible Outcomes:**
- ✅ **200 OK**: Has ITEMS_READ scope
- ⚠️  **403 FORBIDDEN**: Missing ITEMS_READ scope

### Test 4: Orders API
**Required Scope**: `ORDERS_READ`

```bash
curl -X POST https://connect.squareup.com/v2/orders/search \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Square-Version: 2025-10-16" \
  -d '{"limit": 1}'
```

**Possible Outcomes:**
- ✅ **200 OK**: Has ORDERS_READ scope
- ⚠️  **403 FORBIDDEN**: Missing ORDERS_READ scope

---

## 🚀 Quick Start: Use Our Utilities

### Generate OAuth URL
```bash
curl "https://typebug-hunter.preview.emergentagent.com/api/square/oauth/authorize?environment=production"
```

### Validate Current Token (Quick)
```bash
curl "https://typebug-hunter.preview.emergentagent.com/api/square/validate-token"
```

### Validate Current Token (Comprehensive with Scope Tests)
```bash
curl "https://typebug-hunter.preview.emergentagent.com/api/square/validate-token?comprehensive=true"
```

### Test New Token Before Deploying
```bash
curl -X POST https://typebug-hunter.preview.emergentagent.com/api/square/validate-token \
  -H "Content-Type: application/json" \
  -d '{
    "accessToken": "YOUR_NEW_TOKEN",
    "environment": "production"
  }'
```

---

## 📋 Troubleshooting Checklist

### Getting 401 UNAUTHORIZED?

```bash
# Step 1: Verify token with official endpoint
curl -X POST https://connect.squareup.com/oauth2/token/status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Square-Version: 2025-10-16"
```

**If token status returns 401:**
- ✅ Token is invalid/expired → Regenerate in Dashboard
- ✅ Check you're using correct environment (prod vs sandbox)
- ✅ Verify no typos/spaces in token string

**If token status returns 200 but scopes array is empty:**
- ✅ Enable required scopes in Dashboard → OAuth
- ✅ Generate NEW token (old tokens don't inherit scopes)

### Getting 403 FORBIDDEN?

```bash
# Step 1: Check token scopes
curl -X POST https://connect.squareup.com/oauth2/token/status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Square-Version: 2025-10-16"
```

**If scopes array is missing required scope:**
- ✅ Enable missing scope in Dashboard → OAuth → Permissions
- ✅ Click "Save"
- ✅ Go to Credentials → Regenerate access token
- ✅ Old tokens do NOT automatically get new scopes

---

## 🔒 Security Best Practices

1. **Never expose access tokens in client-side code**
   - Use environment variables
   - Keep tokens server-side only

2. **Use minimum required scopes**
   - Only enable scopes your app actually needs
   - Review and remove unused scopes

3. **Rotate tokens periodically**
   - Regenerate tokens every 90 days
   - Immediately revoke if compromised

4. **Use separate tokens for environments**
   - Sandbox token for testing
   - Production token for live
   - Never mix environments

5. **Monitor token usage**
   - Set up alerts for auth failures
   - Check Square Dashboard regularly
   - Use webhook signatures for security

---

## 📞 Additional Resources

- **Square OAuth Documentation**: https://developer.squareup.com/docs/oauth-api/overview
- **Square API Reference**: https://developer.squareup.com/reference/square
- **Developer Dashboard**: https://developer.squareup.com/apps
- **Token Status Endpoint**: https://developer.squareup.com/reference/square/oauth-api/retrieve-token-status

---

**Ready to proceed?** Follow this improved guide to set up OAuth properly with scope validation!
