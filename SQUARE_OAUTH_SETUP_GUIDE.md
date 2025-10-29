# Square OAuth Scopes Setup Guide

## 🎯 Required OAuth Scopes for Taste of Gratitude

Your application needs these specific permissions to function properly:

### **Critical Scopes** (Must Have):
- ✅ **PAYMENTS_WRITE** - Process payments via Web Payments SDK and Payment Links
- ✅ **PAYMENTS_READ** - Query payment status and retrieve payment details
- ✅ **ORDERS_WRITE** - Create and manage orders
- ✅ **ORDERS_READ** - Query order status and details
- ✅ **ITEMS_READ** - Read catalog items (products, variations, pricing)
- ✅ **MERCHANT_PROFILE_READ** - Access location information

### **Optional Scopes** (Recommended):
- 🔔 **INVENTORY_READ** - Monitor inventory levels (for stock management)
- 🔔 **CUSTOMERS_READ** - Access customer information
- 🔔 **CUSTOMERS_WRITE** - Create/update customer records

---

## 📋 Step-by-Step Setup Instructions

### **Step 1: Access Square Developer Dashboard**
1. Go to: https://developer.squareup.com/apps
2. Sign in with your Square account
3. Select your application (or create a new one)

### **Step 2: Navigate to OAuth Section**
1. In your application dashboard, click on **"OAuth"** in the left sidebar
2. Scroll to the **"Permissions"** or **"Scopes"** section

### **Step 3: Enable Required Scopes**

**For Production Environment:**
1. Switch to **"Production"** tab
2. Enable the following scopes by checking their boxes:
   - [x] PAYMENTS_WRITE
   - [x] PAYMENTS_READ
   - [x] ORDERS_WRITE
   - [x] ORDERS_READ
   - [x] ITEMS_READ
   - [x] MERCHANT_PROFILE_READ
   - [x] INVENTORY_READ (optional)
   - [x] CUSTOMERS_READ (optional)
   - [x] CUSTOMERS_WRITE (optional)

3. Click **"Save"** at the bottom

### **Step 4: Generate New Access Token**

**Option A: Personal Access Token (Simplest - Your Own Business)**
1. Go to **"Credentials"** in the left sidebar
2. Under **"Production"** section, find **"Access token"**
3. Click **"Show"** or **"Regenerate"** button
4. Copy the new access token (starts with `EAAA` or `sq0atp-`)
5. **Important:** Save this token securely - you won't be able to see it again!

**Option B: OAuth Flow (For Third-Party Apps)**
1. Go to **"OAuth"** section
2. Set up your redirect URL: `https://gratitude-ecom.preview.emergentagent.com/api/oauth/callback`
3. Note your **Application ID** and **Application Secret**
4. Implement OAuth flow (requires more setup)

### **Step 5: Get Your Application ID and Location ID**

**Application ID:**
1. Go to **"Credentials"** section
2. Copy **"Production Application ID"** (starts with `sq0idp-`)

**Location ID:**
1. Go to **"Locations"** section (or check Square Dashboard)
2. Copy your primary location ID
3. Or use API: `curl -X GET https://connect.squareup.com/v2/locations -H "Authorization: Bearer YOUR_NEW_TOKEN"`

---

## 🔧 Update Your Environment Variables

After generating your new token, update `/app/.env`:

```bash
# Square Production Configuration
SQUARE_ENVIRONMENT=production

# New Access Token with OAuth Scopes
SQUARE_ACCESS_TOKEN=YOUR_NEW_TOKEN_HERE
# Should start with: EAAA or sq0atp-

# Application ID (Production)
NEXT_PUBLIC_SQUARE_APPLICATION_ID=sq0idp-YOUR_APP_ID
SQUARE_APPLICATION_ID=sq0idp-YOUR_APP_ID

# Location ID
SQUARE_LOCATION_ID=YOUR_LOCATION_ID
NEXT_PUBLIC_SQUARE_LOCATION_ID=YOUR_LOCATION_ID

# Webhook Signature (from Webhooks section)
SQUARE_WEBHOOK_SIGNATURE_KEY=your-webhook-signature-key
```

---

## ✅ Verify Token Permissions

### **Method 1: Use Our Diagnostic Endpoint**
```bash
curl https://gratitude-ecom.preview.emergentagent.com/api/square/diagnose
```

Expected output should show:
- ✅ Configuration: PASS
- ✅ Token Format: PASS
- ✅ API Connectivity: PASS
- ✅ Catalog Access: PASS
- ✅ Payments API Capability: PASS

### **Method 2: Test with Square's Token Status API**
```bash
curl -X POST https://connect.squareup.com/oauth2/token/status \
  -H "Authorization: Bearer YOUR_NEW_TOKEN" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "scopes": [
    "PAYMENTS_WRITE",
    "PAYMENTS_READ",
    "ORDERS_WRITE",
    "ORDERS_READ",
    "ITEMS_READ",
    "MERCHANT_PROFILE_READ"
  ],
  "expires_at": null,
  "merchant_id": "YOUR_MERCHANT_ID"
}
```

### **Method 3: Test Locations API**
```bash
curl -X GET https://connect.squareup.com/v2/locations \
  -H "Authorization: Bearer YOUR_NEW_TOKEN"
```

Should return your business locations without 401 error.

---

## 🚨 Common Issues & Solutions

### **Issue 1: Still Getting 401 UNAUTHORIZED**
**Solutions:**
- ✅ Verify you copied the FULL token (no spaces or line breaks)
- ✅ Ensure token is from "Production" section (not Sandbox)
- ✅ Check that SQUARE_ENVIRONMENT=production in .env
- ✅ Restart your Next.js server: `sudo supervisorctl restart nextjs`
- ✅ Clear browser cache and test again

### **Issue 2: "Invalid Scopes" Error**
**Solutions:**
- ✅ Regenerate token AFTER enabling all required scopes
- ✅ Old tokens don't automatically get new scopes
- ✅ Must generate fresh token after changing permissions

### **Issue 3: Token Works But Payments Fail**
**Solutions:**
- ✅ Verify PAYMENTS_WRITE scope is enabled (not just PAYMENTS_READ)
- ✅ Check that your Square account is verified for production payments
- ✅ Ensure location has payment processing enabled

### **Issue 4: "Location Not Found"**
**Solutions:**
- ✅ Verify SQUARE_LOCATION_ID matches one returned by Locations API
- ✅ Location must be active and enabled for payments
- ✅ Both SQUARE_LOCATION_ID and NEXT_PUBLIC_SQUARE_LOCATION_ID must match

---

## 🎉 After Setup - Test Your Integration

1. **Test the diagnostic endpoint:**
   ```bash
   curl https://gratitude-ecom.preview.emergentagent.com/api/square/diagnose
   ```

2. **Restart the server:**
   ```bash
   sudo supervisorctl restart nextjs
   ```

3. **Test a payment flow:**
   - Visit: https://gratitude-ecom.preview.emergentagent.com/order
   - Add products to cart
   - Complete checkout with Square test card: `4111 1111 1111 1111`

4. **Check for success:**
   - Payment should complete without errors
   - Order should be created in Square Dashboard
   - No 401 errors in server logs

---

## 📞 Need Help?

If you're still experiencing issues after following this guide:

1. **Share these details:**
   - Token format (first 10 characters, e.g., `EAAA...`)
   - Application ID format (e.g., `sq0idp-...`)
   - Environment setting (production/sandbox)
   - Specific error messages from diagnostic endpoint

2. **Check Square Developer Forums:**
   - https://developer.squareup.com/forums

3. **Square Support:**
   - https://squareup.com/help

---

## 🔒 Security Best Practices

- ✅ Never commit access tokens to Git
- ✅ Use `.env` files (already in `.gitignore`)
- ✅ Regenerate tokens if compromised
- ✅ Use separate tokens for production vs sandbox
- ✅ Enable webhook signature verification
- ✅ Rotate tokens periodically

---

**Ready to proceed?** After setting up your OAuth scopes and generating a new token, share the new credentials and I'll help you configure and test them!
