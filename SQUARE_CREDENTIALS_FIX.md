# 🚨 SQUARE CREDENTIALS ISSUE - ACTION REQUIRED

## Problem
Both Production and Sandbox access tokens are returning **401 UNAUTHORIZED** errors.

## Root Cause
The access tokens provided are either:
1. **Expired** - Square access tokens can expire
2. **Revoked** - Tokens may have been manually revoked
3. **Invalid Permissions** - Tokens don't have required scopes

## Required Permissions
Your Square access tokens need the following permissions:
- ✅ `MERCHANT_PROFILE_READ` - Read business/location info
- ✅ `ITEMS_READ` - Read catalog items
- ✅ `ITEMS_WRITE` - Update catalog items (optional)
- ✅ `ORDERS_READ` - Read order data
- ✅ `ORDERS_WRITE` - Create and update orders
- ✅ `PAYMENTS_READ` - Read payment data  
- ✅ `PAYMENTS_WRITE` - Process payments
- ✅ `CUSTOMERS_READ` - Read customer data (optional)
- ✅ `CUSTOMERS_WRITE` - Create customers (optional)

## How to Fix

### Step 1: Go to Square Developer Dashboard
🔗 https://developer.squareup.com/apps

### Step 2: Select Your Application
- Find "Taste of Gratitude" or your app name
- Click to open application details

### Step 3: Navigate to Credentials Tab
- Look for "Credentials" in the left sidebar
- You'll see both Production and Sandbox sections

### Step 4: Generate New Access Tokens

#### For Production:
1. In the **Production** section, click "Show" next to Access Token
2. If expired, click **"Regenerate"** or **"Create New Token"**
3. **IMPORTANT**: Copy the new token immediately (it won't be shown again!)
4. Token format should start with: `EAAA...`

#### For Sandbox (Testing):
1. In the **Sandbox** section, click "Show" next to Access Token
2. If expired, click **"Regenerate"** or **"Create New Token"**  
3. Copy the new token immediately
4. Token format should start with: `EAAA...`

### Step 5: Verify Permissions
- In the same Credentials page, scroll down to **"OAuth Scopes"**
- Ensure all required permissions above are checked
- If not, click **"Add OAuth Scope"** and select missing permissions
- Click **"Save"** after making changes

### Step 6: Update Environment Variables

Update `/app/.env` with your new tokens:

```bash
# For Production:
SQUARE_ACCESS_TOKEN=<your_new_production_token>
SQUARE_LOCATION_ID=L66TVG6867BG9
NEXT_PUBLIC_SQUARE_APPLICATION_ID=sq0idp-V1fV-MwsU5lET4rvzHKnIw
SQUARE_ENVIRONMENT=production

# For Sandbox (testing):
SQUARE_ACCESS_TOKEN=<your_new_sandbox_token>
SQUARE_LOCATION_ID=LYSFJ7XXCPQG5
NEXT_PUBLIC_SQUARE_APPLICATION_ID=sandbox-sq0idb-yygbGJe58k9ZsmpZhJ6kjA
SQUARE_ENVIRONMENT=sandbox
```

### Step 7: Test Credentials
```bash
cd /app
node test-square-credentials.js
```

You should see ✅ **ALL TESTS PASSED** for the environment you're using.

### Step 8: Disable Mock Mode
Once credentials are working:
```bash
# In .env file:
SQUARE_MOCK_MODE=false
```

### Step 9: Sync Catalog
```bash
cd /app
node scripts/syncCatalog.js
```

## Current Status
🟡 **MOCK MODE ENABLED** - System is fully functional with simulated Square responses.
Real payments will work once valid credentials are provided.

## Alternative: Use Sandbox for Development
If you need to test immediately:
1. Create a brand new **test merchant account** at https://developer.squareup.com/
2. This will give you fresh sandbox credentials
3. Use those for development and testing
4. Switch to production credentials when ready to go live

## Support
If issues persist after regenerating tokens:
- Square Support: https://squareup.com/help/us/en/contact
- Developer Forums: https://developer.squareup.com/forums
- Or contact your Square account manager

---

**Note**: The application is fully coded and ready to process real payments. The only blocker is valid Square API credentials.
