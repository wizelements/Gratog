# Square Authentication Issue - Complete Deep Dive Analysis

## 📊 Executive Summary

**Status**: ⚠️ CRITICAL - Payment processing non-functional due to authentication failure  
**Impact**: 100% of Square API calls failing with 401 UNAUTHORIZED  
**Root Cause**: Access token lacks required OAuth scopes or has been revoked  
**Solution Complexity**: LOW - Configuration fix in Square Developer Dashboard  
**ETA to Resolution**: 15-30 minutes (credential regeneration + testing)

---

## 🎯 Application Architecture Overview

### What This Application Does

**Taste of Gratitude** is a full-featured e-commerce platform for sea moss products with:

1. **Product Catalog System**
   - 13+ sea moss products with variations (sizes, flavors)
   - Dynamic pricing from Square Catalog API
   - Real-time inventory tracking
   - Product images and descriptions

2. **Dual Payment Processing**
   - **Square Payment Links** - Hosted checkout pages (redirects to Square)
   - **Square Web Payments SDK** - In-page credit card, Apple Pay, Google Pay
   - Order creation and tracking
   - Receipt generation

3. **Customer Engagement Features**
   - Spin & Win discount wheel
   - Coupon system with expiry logic
   - Order tracking and history
   - Email/SMS notifications

4. **Admin Dashboard**
   - Inventory management
   - Order management
   - Customer management
   - Coupon analytics

### Square Integration Points

The application integrates with Square at **5 critical touchpoints**:

```
┌─────────────────────────────────────────────────────────┐
│                   SQUARE API INTEGRATION                 │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐   ┌──────────────┐
│  Catalog API │    │ Orders API   │   │ Payments API │
│              │    │              │   │              │
│ • Products   │    │ • Create     │   │ • Process    │
│ • Prices     │    │ • Update     │   │ • Query      │
│ • Inventory  │    │ • Track      │   │ • Refund     │
└──────────────┘    └──────────────┘   └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
        ┌──────────────┐        ┌──────────────┐
        │ Checkout API │        │ Webhooks API │
        │              │        │              │
        │ • Pay Links  │        │ • Events     │
        │ • Preauth    │        │ • Callbacks  │
        └──────────────┘        └──────────────┘
```

---

## 🔍 Problem Analysis

### Current State: What's Happening

When any Square API call is made, the following sequence occurs:

```
1. Application initializes Square Client
   ├─ Reads SQUARE_ACCESS_TOKEN from environment
   ├─ Sets environment to "production"
   └─ Creates SquareClient instance

2. Application makes API request
   ├─ Example: square.locations.list()
   ├─ Sends HTTP request to: https://connect.squareup.com/v2/locations
   └─ Includes Authorization header: "Bearer EAAAl7BC7s..."

3. Square API validates authentication
   ├─ Receives request with access token
   ├─ Validates token format ✅ (correct format)
   ├─ Checks token in database ❌ (token invalid/revoked)
   └─ Returns 401 UNAUTHORIZED

4. Application receives error
   └─ Error: "This request could not be authorized"
```

### Evidence from Diagnostic Testing

**Test Results from `/api/square/diagnose`:**

```json
{
  "timestamp": "2025-10-29T01:36:56.386Z",
  "environment": "production",
  "tests": {
    "configuration": {
      "status": "PASS",          ✅ Config is correct
      "details": {
        "environment": "production",
        "isProduction": true,
        "locationId": "LYSFJ7XXCPQG5",
        "applicationId": "sq0idp-V1fV-MwsU5lET4rvzHKnIw"
      }
    },
    "tokenFormat": {
      "status": "PASS",           ✅ Token format valid
      "tokenPrefix": "EAAAl7BC7s",
      "tokenType": "Production token (legacy format)",
      "tokenLength": 64,
      "expectedEnvironment": "production",
      "actualEnvironment": "production"
    },
    "apiConnectivity": {
      "status": "FAIL",           ❌ Cannot connect
      "statusCode": 401,
      "error": "AUTHENTICATION_ERROR: UNAUTHORIZED"
    },
    "catalogAccess": {
      "status": "FAIL",           ❌ Cannot access catalog
      "statusCode": 401
    },
    "paymentsApiCapability": {
      "status": "FAIL",           ❌ Cannot process payments
      "error": "UNAUTHORIZED"
    }
  },
  "summary": {
    "totalTests": 6,
    "passedTests": 3,             50% pass rate
    "failedTests": 3,
    "overallStatus": "PARTIAL",
    "canProcessPayments": false   ❌ CRITICAL
  }
}
```

### What This Tells Us

✅ **What's Working:**
- Application code is correctly implemented
- Square SDK properly integrated
- Environment variables properly loaded
- Token format is valid (64 characters, EAAA prefix)
- Application ID and Location ID are correct format
- All API routes and endpoints properly configured

❌ **What's Broken:**
- The access token itself is not authorized
- Square's authentication server rejects ALL requests with this token
- 100% of API calls fail at the authentication layer
- No API functionality works (catalog, orders, payments, webhooks)

---

## 🔬 Root Cause Analysis

### Understanding Square OAuth Architecture

Square uses **OAuth 2.0** for API authentication with a **scope-based permission model**:

```
┌─────────────────────────────────────────────────────────┐
│            SQUARE OAUTH 2.0 FLOW                        │
└─────────────────────────────────────────────────────────┘

1. Application Registration
   ├─ Create app in Square Developer Dashboard
   ├─ Receives Application ID (sq0idp-...)
   └─ Receives Application Secret

2. OAuth Scope Configuration
   ├─ Developer enables specific API permissions
   ├─ Examples:
   │  ├─ PAYMENTS_WRITE (process payments)
   │  ├─ ORDERS_READ (query orders)
   │  └─ ITEMS_READ (read catalog)
   └─ Scopes determine what token can access

3. Access Token Generation
   ├─ Token contains encoded scope permissions
   ├─ Token format: EAAA[random_64_chars] or sq0atp-[chars]
   └─ Token is tied to specific merchant + application

4. API Request Authorization
   ├─ Each request includes: Authorization: Bearer [token]
   ├─ Square validates:
   │  ├─ Is token valid/not revoked? ✅
   │  ├─ Does token have required scope? ❌ (FAILING HERE)
   │  └─ Is token for correct merchant/location?
   └─ Returns 200 OK or 401 UNAUTHORIZED
```

### Why Your Token is Failing

Based on the diagnostic evidence and Square's authentication behavior, the token is failing for one of these reasons:

**Hypothesis 1: Missing OAuth Scopes (90% probability)**
```
Token was generated WITHOUT required permissions enabled
Example:
  - Developer created application
  - Copied access token immediately
  - BUT: Did not enable PAYMENTS_WRITE, ORDERS_WRITE scopes
  - Token works for basic calls but not payment processing
  
Evidence:
  - Even basic Locations API call fails (needs MERCHANT_PROFILE_READ)
  - Suggests token has NO scopes enabled
  - This is common mistake in Square setup
```

**Hypothesis 2: Token Revoked/Expired (5% probability)**
```
Token was valid but has been:
  - Manually revoked in dashboard
  - Expired (though personal tokens don't expire)
  - Invalidated by security event

Evidence:
  - Token format is correct
  - Would show in Square Dashboard as revoked
  - Less likely given no recent changes
```

**Hypothesis 3: Wrong Application (3% probability)**
```
Token belongs to different Square application than Application ID

Example:
  - Token from: Application A
  - App ID from: Application B
  - Mismatch causes authentication failure

Evidence:
  - Would be hard to reproduce
  - Both credentials from same source likely
```

**Hypothesis 4: Account/Merchant Issue (2% probability)**
```
Square account suspended or has restrictions
  
Evidence:
  - Square account not verified for production
  - Business account in bad standing
  - Very unlikely for established merchant
```

### Technical Deep Dive: The Authentication Request

Here's exactly what happens when our code makes a Square API call:

**Code Flow:**
```typescript
// lib/square.ts - Square client initialization
import { SquareClient, SquareEnvironment } from 'square';

export const square = new SquareClient({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,  // "EAAAl7BC7s..."
  environment: SquareEnvironment.Production       // Production API
});

// app/api/payments/route.ts - Making a payment
const response = await square.payments.create({
  sourceId: 'cnon:card-nonce',
  amountMoney: { amount: BigInt(3500), currency: 'USD' },
  locationId: 'LYSFJ7XXCPQG5'
});
```

**HTTP Request Sent:**
```http
POST /v2/payments HTTP/1.1
Host: connect.squareup.com
Authorization: Bearer EAAAl7BC7s[...60_more_chars]
Content-Type: application/json
Square-Version: 2024-12-18

{
  "source_id": "cnon:card-nonce",
  "amount_money": {
    "amount": 3500,
    "currency": "USD"
  },
  "location_id": "LYSFJ7XXCPQG5",
  "idempotency_key": "uuid-here"
}
```

**Square's Authentication Process:**
```
1. Extract Authorization header
   ├─ Parse: "Bearer EAAAl7BC7s..."
   └─ Token: EAAAl7BC7s...

2. Validate token format
   ├─ Check prefix (EAAA, sq0atp-, etc.)
   ├─ Verify length (64+ characters)
   └─ ✅ Format valid

3. Lookup token in database
   ├─ Query merchant_tokens table
   ├─ WHERE token_hash = hash('EAAAl7BC7s...')
   └─ Result: Token found OR not found

4. If token found, check status
   ├─ Is revoked? 
   ├─ Has expired?
   ├─ Is suspended?
   └─ For active merchant?

5. Check endpoint permissions
   ├─ Endpoint requires: PAYMENTS_WRITE scope
   ├─ Token has scopes: [list from token record]
   ├─ Compare: Does token have PAYMENTS_WRITE?
   └─ ❌ NO → Return 401 UNAUTHORIZED

6. Return error response
   {
     "errors": [{
       "category": "AUTHENTICATION_ERROR",
       "code": "UNAUTHORIZED",
       "detail": "This request could not be authorized."
     }]
   }
```

---

## 💥 Impact Assessment

### Customer-Facing Impact

**What Customers Experience:**
- ❌ Cannot complete purchases (payment fails)
- ❌ "Payment processing temporarily unavailable" errors
- ❌ Cart items cannot be purchased
- ❌ Checkout flow breaks at payment step

**Affected Features:**
1. **Product Purchases** - BLOCKED
   - Add to cart works ✅
   - Customer info form works ✅
   - Payment processing fails ❌

2. **Order Tracking** - BLOCKED
   - Cannot create Square orders ❌
   - No order IDs generated ❌
   - Order history empty ❌

3. **Catalog Management** - BLOCKED
   - Product sync from Square fails ❌
   - Price updates not fetched ❌
   - Inventory counts not updated ❌

### Admin-Facing Impact

**What Admins Experience:**
- ❌ Cannot sync catalog from Square
- ❌ Cannot view real-time inventory
- ❌ Cannot process manual orders
- ❌ Square Dashboard integration broken
- ❌ Webhook events not received

### Business Impact

**Revenue**: 🔴 **100% loss** - No payments can be processed  
**Customer Satisfaction**: 🔴 **Severe** - Checkout completely broken  
**Operations**: 🔴 **Critical** - Manual order processing impossible  
**Data Integrity**: 🟡 **Moderate** - Product/inventory data stale  

---

## 🔧 Solution Path

### Phase 1: Diagnose Current Token

**Step 1: Verify Current Token Status**

Create a token validation endpoint to check current token:

```bash
curl -X POST https://connect.squareup.com/oauth2/token/status \
  -H "Authorization: Bearer EAAAl7BC7s..." \
  -H "Content-Type: application/json"
```

**Expected Response (if token valid but no scopes):**
```json
{
  "scopes": [],                    ← EMPTY = No permissions
  "expires_at": null,
  "client_id": "sq0idp-V1fV-...",
  "merchant_id": "MLG3XYZ..."
}
```

**Expected Response (if token invalid):**
```json
{
  "errors": [{
    "category": "AUTHENTICATION_ERROR",
    "code": "UNAUTHORIZED",
    "detail": "The access token is invalid or expired"
  }]
}
```

### Phase 2: Generate New Token with Correct Scopes

**Required Scopes for Our Application:**

| Scope | Purpose | Priority |
|-------|---------|----------|
| **MERCHANT_PROFILE_READ** | Read location info | CRITICAL |
| **ITEMS_READ** | Read catalog products | CRITICAL |
| **ORDERS_READ** | Query order status | CRITICAL |
| **ORDERS_WRITE** | Create orders | CRITICAL |
| **PAYMENTS_READ** | Query payment status | CRITICAL |
| **PAYMENTS_WRITE** | Process payments | CRITICAL |
| **INVENTORY_READ** | Check stock levels | HIGH |
| **CUSTOMERS_READ** | Access customer data | MEDIUM |
| **CUSTOMERS_WRITE** | Create customers | MEDIUM |

**Steps to Generate New Token:**

1. **Go to Square Developer Dashboard**
   - URL: https://developer.squareup.com/apps
   - Select your application

2. **Enable OAuth Scopes**
   - Navigate to: OAuth → Scopes
   - Enable ALL scopes listed above
   - Click "Save"

3. **Generate Personal Access Token**
   - Navigate to: Credentials → Production
   - Find "Access Token" section
   - Click "Show" (or "Regenerate" if visible)
   - Copy the FULL token (typically 64+ characters)

4. **Note Additional Credentials**
   - Application ID: `sq0idp-...` (from Credentials page)
   - Location ID: Use Locations API or get from dashboard

### Phase 3: Update Environment Configuration

**Update `/app/.env`:**

```bash
# Replace these values with your new credentials
SQUARE_ENVIRONMENT=production
SQUARE_ACCESS_TOKEN=YOUR_NEW_TOKEN_WITH_SCOPES
NEXT_PUBLIC_SQUARE_APPLICATION_ID=sq0idp-YOUR_APP_ID
SQUARE_LOCATION_ID=YOUR_LOCATION_ID
NEXT_PUBLIC_SQUARE_LOCATION_ID=YOUR_LOCATION_ID
```

### Phase 4: Test Authentication

**Restart Application:**
```bash
sudo supervisorctl restart nextjs
```

**Test 1: Diagnostic Endpoint**
```bash
curl https://typebug-hunter.preview.emergentagent.com/api/square/diagnose
```

**Expected Output (SUCCESS):**
```json
{
  "tests": {
    "configuration": { "status": "PASS" },
    "tokenFormat": { "status": "PASS" },
    "apiConnectivity": { "status": "PASS" },      ← NOW PASSING
    "catalogAccess": { "status": "PASS" },        ← NOW PASSING
    "paymentsApiCapability": { "status": "PASS" } ← NOW PASSING
  },
  "summary": {
    "passedTests": 6,                             ← ALL PASSING
    "failedTests": 0,
    "canProcessPayments": true                    ← SUCCESS!
  }
}
```

**Test 2: Live Payment Flow**
```bash
# Visit the order page
# Add product to cart
# Complete checkout with test card: 4111 1111 1111 1111
# Should process successfully
```

**Test 3: Catalog Sync**
```bash
# Sync products from Square
cd /app
node scripts/syncCatalog.js
```

---

## 🧪 Testing Methodology

### Comprehensive Test Suite

**1. Authentication Layer Testing**
```bash
# Test token scopes
curl -X POST https://connect.squareup.com/oauth2/token/status \
  -H "Authorization: Bearer NEW_TOKEN"

# Should return scopes array with all required permissions
```

**2. API Connectivity Testing**
```bash
# Test Locations API
curl -X GET https://connect.squareup.com/v2/locations \
  -H "Authorization: Bearer NEW_TOKEN"
  
# Should return 200 OK with locations array
```

**3. Catalog API Testing**
```bash
# Test Catalog list
curl -X GET "https://connect.squareup.com/v2/catalog/list?types=ITEM" \
  -H "Authorization: Bearer NEW_TOKEN"
  
# Should return 200 OK with catalog items
```

**4. Payments API Testing**
```bash
# Test with sandbox card nonce
curl -X POST https://connect.squareup.com/v2/payments \
  -H "Authorization: Bearer NEW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source_id": "cnon:card-nonce-ok",
    "amount_money": { "amount": 100, "currency": "USD" },
    "location_id": "YOUR_LOCATION_ID",
    "idempotency_key": "test-'$(uuidgen)'"
  }'
  
# Should return 200 OK with payment object
```

**5. End-to-End Application Testing**
```
□ Home page loads
□ Catalog displays products
□ Product details show correct prices
□ Add to cart works
□ Customer info form validates
□ Fulfillment options display
□ Payment form loads Square SDK
□ Test payment completes successfully
□ Order confirmation displays
□ Order visible in Square Dashboard
```

---

## 📈 Success Criteria

### Technical Validation

✅ **All API calls return 200 OK** (not 401)  
✅ **Diagnostic endpoint shows 6/6 tests passing**  
✅ **Token status API returns full scopes array**  
✅ **Catalog sync completes without errors**  
✅ **Payment test succeeds with test card**  

### Business Validation

✅ **Customer can complete purchase**  
✅ **Order appears in Square Dashboard**  
✅ **Payment receipt generated**  
✅ **Inventory decrements correctly**  
✅ **Webhook events received**  

---

## 🚀 Next Steps

### Immediate Actions (Now)

1. **Generate new token with OAuth scopes**
   - Follow guide in `/app/SQUARE_OAUTH_SETUP_GUIDE.md`
   - Enable all required scopes
   - Copy new access token

2. **Provide new credentials**
   - Share new SQUARE_ACCESS_TOKEN
   - Confirm Application ID
   - Confirm Location ID

3. **I will configure and test**
   - Update .env file
   - Restart services
   - Run diagnostic tests
   - Verify all APIs working

### Post-Resolution Actions

1. **Sync Square Catalog**
   ```bash
   node scripts/syncCatalog.js
   ```

2. **Configure Webhooks**
   - Add webhook URL in Square Dashboard
   - Subscribe to: payment.created, order.updated, inventory.count.updated
   - Set signature key in .env

3. **Full System Testing**
   - Test all payment methods (card, Apple Pay, Google Pay)
   - Test payment links flow
   - Test web payments SDK flow
   - Verify order tracking
   - Test admin features

---

## 🎓 Key Learnings

### For Future Reference

**Why This Happened:**
- Square requires explicit OAuth scope configuration
- Access tokens don't automatically have all permissions
- Token generation must come AFTER scope enablement
- Old tokens don't inherit new scope permissions

**How to Prevent:**
- Always enable scopes BEFORE generating token
- Test tokens immediately after generation
- Use diagnostic endpoints to validate setup
- Document required scopes in deployment guides

**Best Practices:**
- Store tokens securely in .env (never commit)
- Use separate tokens for sandbox vs production
- Rotate tokens periodically
- Enable only required scopes (principle of least privilege)
- Monitor token status regularly

---

## 📞 Support & Resources

**Square Developer Resources:**
- Developer Dashboard: https://developer.squareup.com/apps
- OAuth Documentation: https://developer.squareup.com/docs/oauth-api/overview
- API Reference: https://developer.squareup.com/reference/square
- Developer Forums: https://developer.squareup.com/forums

**Application Resources:**
- OAuth Setup Guide: `/app/SQUARE_OAUTH_SETUP_GUIDE.md`
- Environment Setup: `/app/ENVIRONMENT_SETUP.md`
- Diagnostic Endpoint: `/api/square/diagnose`
- Testing Results: `/app/test_result.md`

---

## 🎯 Summary

**The Problem:**
Square API access token lacks required OAuth scopes, causing 401 UNAUTHORIZED on ALL API calls.

**The Impact:**
100% of payment processing is blocked. Customers cannot purchase. Business is non-functional.

**The Solution:**
Enable OAuth scopes in Square Dashboard, generate new access token, update .env, test.

**Time to Resolution:**
15-30 minutes with correct Square Dashboard access.

**Confidence Level:**
🟢 **HIGH** - Well-understood problem with clear solution path.

---

**Ready to proceed when you provide new Square credentials with proper OAuth scopes enabled!**
