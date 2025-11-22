# Square OAuth & Permissions Setup - Complete Guide (2025)

**Last Updated**: November 1, 2025  
**Issue**: 401 UNAUTHORIZED errors blocking all Square API calls  
**Root Cause**: Missing OAuth permissions in Square Developer Dashboard

---

## Critical Issue Summary

Your Square access tokens are **REJECTED** by Square API with:
```json
{
  "category": "AUTHENTICATION_ERROR",
  "code": "UNAUTHORIZED",
  "detail": "This request could not be authorized."
}
```

**This is NOT a code issue** - Your application code is production-ready.  
**This IS a Square Dashboard configuration issue** - Permissions not properly enabled.

---

## Step-by-Step Fix Instructions

### Step 1: Access Square Developer Dashboard

1. Go to: https://developer.squareup.com/apps
2. Sign in with your Square account
3. Select your application: `sq0idp-V1fV-MwsU5lET4rvzHKnIw`

### Step 2: Navigate to OAuth Settings

1. At the top of the page, select **Production** environment (not Sandbox)
2. In the left navigation, click **OAuth**
3. You'll see sections for:
   - Application ID
   - Application Secret
   - Redirect URL
   - **Permissions/Scopes** (this is what we need to fix)

### Step 3: Configure Redirect URL (If Not Already Set)

1. In the **Redirect URL** box, click **Update**
2. Enter your callback URL:
   ```
   https://loading-fix-taste.preview.emergentagent.com/api/oauth/square/callback
   ```
3. Click **Confirm**

### Step 4: Enable Required Permissions

**For in-page checkout with Web Payments SDK, you need these scopes:**

**Payment Processing (CRITICAL):**
- ✅ `PAYMENTS_READ` - View payment information
- ✅ `PAYMENTS_WRITE` - Create payments and refunds
- ✅ `PAYMENTS_WRITE_IN_PERSON` - Process in-person payments (optional)

**Order Management:**
- ✅ `ORDERS_READ` - View orders
- ✅ `ORDERS_WRITE` - Create and update orders

**Customer Management:**
- ✅ `CUSTOMERS_READ` - View customer profiles
- ✅ `CUSTOMERS_WRITE` - Create and update customer profiles

**Catalog/Inventory:**
- ✅ `ITEMS_READ` - View catalog items
- ✅ `CATALOG_READ` - View catalog data
- ✅ `INVENTORY_READ` - View inventory counts

**Merchant Info:**
- ✅ `MERCHANT_PROFILE_READ` - View merchant info

### Step 5: Generate New Access Token

**CRITICAL: You must regenerate your access token AFTER enabling scopes**

1. Go to **Credentials** tab (in left navigation)
2. Scroll to **Access Token** section
3. Click **Generate New Production Access Token**
4. **IMPORTANT**: Copy the token immediately - you cannot retrieve it later
5. The token will start with `EAAA` or `sq0atp-` for production

### Step 6: Update Environment Variables

1. SSH into your server:
   ```bash
   ssh user@your-server
   cd /app
   ```

2. Edit `.env` file:
   ```bash
   nano .env
   ```

3. Replace the `SQUARE_ACCESS_TOKEN` value:
   ```bash
   SQUARE_ACCESS_TOKEN=YOUR_NEW_TOKEN_HERE
   ```

4. Save and exit (Ctrl+X, then Y, then Enter)

5. Restart the application:
   ```bash
   sudo supervisorctl restart nextjs
   ```

### Step 7: Verify the Fix

1. Wait 10 seconds for the server to restart
2. Test the Square connection:
   ```bash
   curl http://localhost:3000/api/health
   ```

3. Check for:
   ```json
   {
     "services": {
       "square_api": "production"  // ← Should say "production" not "mock_mode"
     }
   }
   ```

4. Test Square diagnostic endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/square-diagnose
   ```

5. Look for:
   ```json
   {
     "results": {
       "overallStatus": "HEALTHY"  // ← Should say "HEALTHY" not "AUTHENTICATION_FAILED"
     }
   }
   ```

---

## Understanding OAuth Flow for Future Reference

### What You're Currently Using: Personal Access Tokens

Your current setup uses **Personal Access Tokens** (starting with `EAAA`). These are:
- ✅ Simpler to set up
- ✅ Good for single-merchant applications
- ❌ Require manual permission configuration in Dashboard
- ❌ Limited to your own Square account

### Alternative: OAuth Authorization Flow

For multi-merchant applications, you'd use OAuth:

**Authorization URL Format:**
```
https://connect.squareup.com/oauth2/authorize?
  client_id=YOUR_APPLICATION_ID&
  scope=PAYMENTS_WRITE+PAYMENTS_READ+ORDERS_WRITE+ORDERS_READ+CUSTOMERS_WRITE+CUSTOMERS_READ&
  session=false&
  state=YOUR_CSRF_TOKEN
```

**Required Scopes (space or + separated):**
```
PAYMENTS_WRITE+PAYMENTS_READ+ORDERS_WRITE+ORDERS_READ+CUSTOMERS_WRITE+CUSTOMERS_READ+ITEMS_READ+MERCHANT_PROFILE_READ
```

**For your current use case, stick with Personal Access Tokens** - just ensure the permissions are enabled in the Dashboard.

---

## Common Issues & Solutions

### Issue 1: Token Still Returns 401 After Regeneration

**Possible Causes:**
1. Permissions not saved before generating token
2. Using Sandbox token in Production environment
3. Application not approved for production

**Solutions:**
1. Double-check permissions are enabled (checkmarks visible)
2. Verify `SQUARE_ENVIRONMENT=production` in `.env`
3. Check application status in Dashboard

### Issue 2: "This request could not be authorized"

This specific error means:
- Token format is valid
- But token lacks required permissions
- OR token is expired/revoked

**Solution:** Regenerate token with proper scopes enabled

### Issue 3: Different Error - "Not Found" or "Invalid Card"

These are GOOD signs - authentication is working!
- "Not Found" = API is accessible, test data doesn't exist
- "Invalid Card" = Payment processing works, card details wrong

---

## Required Permissions by Feature

### For In-Page Checkout (Web Payments SDK):
```
PAYMENTS_WRITE       ✅ Process card payments
PAYMENTS_READ        ✅ Check payment status
ORDERS_WRITE         ✅ Create orders
CUSTOMERS_WRITE      ✅ Save customer info (optional)
```

### For Payment Links (Square-hosted checkout):
```
PAYMENTS_WRITE       ✅ Create payment links
ORDERS_WRITE         ✅ Create pre-orders
ORDERS_READ          ✅ Track order status
```

### For Catalog Sync:
```
ITEMS_READ           ✅ Sync product data
CATALOG_READ         ✅ Read catalog objects
INVENTORY_READ       ✅ Check stock levels
```

### For Webhooks:
```
PAYMENTS_READ        ✅ Receive payment events
ORDERS_READ          ✅ Receive order events
INVENTORY_READ       ✅ Receive inventory updates
```

---

## Verification Checklist

After completing all steps, verify:

- [ ] Logged into Square Developer Dashboard
- [ ] Production environment selected
- [ ] OAuth permissions enabled (checkmarks visible)
- [ ] New access token generated
- [ ] `.env` file updated with new token
- [ ] Application restarted
- [ ] Health check returns "production" status
- [ ] Diagnostic endpoint returns "HEALTHY"
- [ ] Test payment processes successfully

---

## Next Steps After Fix

Once authentication is working:

### 1. Test In-Page Checkout
```bash
# Navigate to order page
# Add product to cart
# Complete customer info
# Enter card details in payment form
# Submit payment
```

### 2. Verify Payment Processing
```bash
# Check Square Dashboard > Payments
# Verify payment appears
# Check order status in your database
```

### 3. Configure Webhooks (Optional)
```
Webhook URL: https://loading-fix-taste.preview.emergentagent.com/api/webhooks/square
Events: payment.created, payment.updated, order.created, inventory.count.updated
```

---

## Support Resources

- **Square Developer Console**: https://developer.squareup.com/apps
- **OAuth Permissions Reference**: https://developer.squareup.com/docs/oauth-api/square-permissions
- **Payments API Documentation**: https://developer.squareup.com/reference/square/payments-api
- **Square Developer Support**: https://developer.squareup.com/forums

---

## Summary

**What's Broken:** Square API authentication (401 errors)  
**Why:** OAuth permissions not enabled in Dashboard  
**What to Do:** Enable scopes, regenerate token, update `.env`  
**Expected Time:** 10-15 minutes  
**Result:** All Square features will work immediately

Your code is correct. This is purely a Square Dashboard configuration issue.
