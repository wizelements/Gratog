# 🟦 Square Dashboard - URLs to Configure

**Production Domain:** `https://gratog.vercel.app`

---

## 📋 COMPLETE URL CONFIGURATION LIST

### 🔐 **1. OAuth Redirect URLs**
**Location in Square:** Developer Dashboard → Applications → Your App → OAuth

**Add These URLs:**

```
https://gratog.vercel.app/api/oauth/square/callback
```

**What it does:**
- Handles OAuth authorization after admin connects Square account
- Receives authorization code and exchanges for access token
- Redirects back to admin panel with success/error status

**Testing:**
- Visit: `/admin/square-oauth` in your app
- Click "Connect Square Account"
- Square redirects here after authorization

---

### 🪝 **2. Webhook URLs** 
**Location in Square:** Developer Dashboard → Webhooks

**Primary Webhook URL:**
```
https://gratog.vercel.app/api/square-webhook
```

**Webhook Signature Key:**
- Copy from Square Dashboard → Webhooks → Signature Key
- Add to Vercel env: `SQUARE_WEBHOOK_SIGNATURE_KEY`

**Events to Subscribe To:**

**Payment Events:**
- ✅ `payment.created` - New payment created
- ✅ `payment.updated` - Payment status changed

**Order Events:**
- ✅ `order.created` - New order placed
- ✅ `order.updated` - Order status changed
- ✅ `order.fulfilled` - Order ready for pickup/delivery

**Inventory Events:**
- ✅ `inventory.count.updated` - Stock levels changed
- ✅ `catalog.version.updated` - Product catalog modified

**What it does:**
- Real-time order status updates
- Automatic customer notifications (email/SMS)
- Inventory synchronization
- Payment confirmation tracking

---

### 📱 **3. Point of Sale (POS) Callback URL**
**Location in Square:** Developer Dashboard → Point of Sale API

**POS Web Callback URL:**
```
https://gratog.vercel.app/api/pos/callback
```

**What it does:**
- Receives payment confirmations from Square POS app (mobile)
- Handles in-person sales at farmers markets
- Updates order tracking system

**Use Case:**
- Customer pays via Square POS at farmers market
- Transaction data sent to this URL
- Order recorded in your system
- Customer receives confirmation email

---

### 🌐 **4. Web Payments SDK Allowed Domains**
**Location in Square:** Developer Dashboard → Web Payments SDK

**Add This Domain:**
```
gratog.vercel.app
```

**Also add (for local development):**
```
localhost
```

**What it does:**
- Allows Web Payments SDK to load on your domain
- Enables checkout page payment forms
- Required for `/checkout/square` page

---

### 🔄 **5. Additional Callback URLs (Alternative Routes)**

Your app also has these alternative OAuth endpoints:

**Alternative OAuth Route:**
```
https://gratog.vercel.app/api/square/oauth/authorize
```

**Note:** This is similar to the main OAuth but may be used for specific flows. Add both to be safe.

---

## 📝 SQUARE DASHBOARD CONFIGURATION GUIDE

### **Step-by-Step Setup:**

### **1. OAuth Configuration**

1. Go to: https://developer.squareup.com/apps
2. Click your application
3. Click **"OAuth"** in sidebar
4. Under **"Redirect URL"**, click **"Add URL"**
5. Paste: `https://gratog.vercel.app/api/oauth/square/callback`
6. Click **"Save"**

**Required Scopes:**
- ✅ `MERCHANT_PROFILE_READ`
- ✅ `PAYMENTS_READ`
- ✅ `PAYMENTS_WRITE`
- ✅ `ORDERS_READ`
- ✅ `ORDERS_WRITE`
- ✅ `ITEMS_READ`
- ✅ `ITEMS_WRITE`
- ✅ `INVENTORY_READ`
- ✅ `CUSTOMERS_READ`
- ✅ `CUSTOMERS_WRITE`

---

### **2. Webhook Configuration**

1. Go to: https://developer.squareup.com/apps
2. Click your application
3. Click **"Webhooks"** in sidebar
4. Click **"Add endpoint"**
5. Paste: `https://gratog.vercel.app/api/square-webhook`
6. Select **Production** environment
7. Click **"Add endpoint"**

**Subscribe to Events:**

**Payment Events:**
```
☑ payment.created
☑ payment.updated
```

**Order Events:**
```
☑ order.created
☑ order.updated
☑ order.fulfilled
```

**Catalog Events:**
```
☑ catalog.version.updated
```

**Inventory Events:**
```
☑ inventory.count.updated
```

**Save Signature Key:**
- After creating webhook, copy the **Signature Key**
- Add to Vercel: `SQUARE_WEBHOOK_SIGNATURE_KEY=your_key_here`

---

### **3. Point of Sale API**

1. Go to: https://developer.squareup.com/apps
2. Click your application
3. Click **"Point of Sale API"** in sidebar
4. Under **"Web Callback URL"**, paste:
   ```
   https://gratog.vercel.app/api/pos/callback
   ```
5. Click **"Save"**

**What this enables:**
- In-person sales at farmers markets
- Mobile POS transactions
- Market booth checkout

---

### **4. Web Payments SDK**

1. Go to: https://developer.squareup.com/apps
2. Click your application
3. Click **"Web Payments SDK"** in sidebar
4. Under **"Allowed Domains"**, add:
   ```
   gratog.vercel.app
   localhost (for testing)
   ```
5. Click **"Save"**

---

## 🔧 VERCEL ENVIRONMENT VARIABLES

After configuring Square, add these to Vercel:

```bash
# Square Configuration
SQUARE_ACCESS_TOKEN=EAAAyour_production_access_token
SQUARE_LOCATION_ID=Lyour_main_location_id
NEXT_PUBLIC_SQUARE_APPLICATION_ID=sq0idp-your_app_id
SQUARE_APPLICATION_SECRET=sq0csp-your_app_secret
SQUARE_ENVIRONMENT=production
SQUARE_WEBHOOK_SIGNATURE_KEY=your_webhook_signature_key

# Base URL (Important!)
NEXT_PUBLIC_BASE_URL=https://gratog.vercel.app
```

**How to Add:**
1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable above
5. Redeploy after adding all

---

## ✅ QUICK REFERENCE CHECKLIST

**Copy-Paste Ready URLs for Square Dashboard:**

### OAuth Redirect URL:
```
https://gratog.vercel.app/api/oauth/square/callback
```

### Webhook URL:
```
https://gratog.vercel.app/api/square-webhook
```

### POS Callback URL:
```
https://gratog.vercel.app/api/pos/callback
```

### Web Payments SDK Domain:
```
gratog.vercel.app
```

---

## 🧪 TESTING YOUR CONFIGURATION

### **Test OAuth:**
```
1. Visit: https://gratog.vercel.app/admin/square-oauth
2. Click "Connect Square Account"
3. Authorize on Square
4. Should redirect back with success message
```

### **Test Webhook:**
```
1. Make a test payment in Square Dashboard
2. Check webhook logs in Square Dashboard
3. Verify delivery status shows "Success"
4. Check Vercel logs for webhook received
```

### **Test POS:**
```
1. Open Square POS app on mobile
2. Process a test transaction
3. Check if order appears in admin panel
4. Verify customer receives confirmation
```

### **Test Web Payments:**
```
1. Visit: https://gratog.vercel.app/checkout/square
2. Payment form should load
3. Test card: 4111 1111 1111 1111
4. Complete test transaction
```

---

## 🔍 TROUBLESHOOTING

### **"Invalid Redirect URI" Error:**
**Problem:** OAuth fails with redirect URI error  
**Fix:** Double-check the exact URL in Square matches:
```
https://gratog.vercel.app/api/oauth/square/callback
```
- No trailing slash
- Exact match required
- Case sensitive

### **Webhook Not Receiving Events:**
**Problem:** Webhook shows as inactive or fails  
**Fix:**
1. Verify URL is exactly: `https://gratog.vercel.app/api/square-webhook`
2. Check SQUARE_WEBHOOK_SIGNATURE_KEY is set in Vercel
3. Ensure endpoint is responding (visit URL, should show method not allowed)
4. Check Vercel function logs for errors

### **POS Callback Issues:**
**Problem:** POS transactions don't sync  
**Fix:**
1. Verify URL in Square POS settings
2. Test with Square POS app
3. Check Vercel logs for incoming requests

---

## 📱 MOBILE POS CONFIGURATION

### **Square POS App Settings:**

**iOS App Callback:**
```
tasteofgratitude://callback
```

**Android App Callback:**
```
tasteofgratitude://callback
```

**Web Callback (fallback):**
```
https://gratog.vercel.app/api/pos/callback
```

**Deep Link Setup:**
- Configure in Square Dashboard
- Allows POS app to return to your app after payment

---

## 🎯 PRIORITY ORDER

**Configure in this order for fastest setup:**

1. **🔐 OAuth** (highest priority)
   - Needed to connect Square account
   - Required for admin to manage products
   - First step in setup

2. **🌐 Web Payments SDK** (high priority)
   - Needed for online checkout
   - Required for e-commerce functionality

3. **🪝 Webhooks** (medium priority)
   - Needed for real-time updates
   - Nice to have, not critical for launch
   - Can configure later

4. **📱 POS Callback** (low priority)
   - Only needed for farmers market sales
   - Can skip if only selling online initially

---

## 💡 PRO TIPS

### **Use Environment-Specific URLs:**

**Production:**
```
https://gratog.vercel.app/api/...
```

**Staging (if needed):**
```
https://gratog-staging.vercel.app/api/...
```

**Development:**
```
https://localhost:3000/api/...
```

**Best Practice:**
- Configure production URLs in production Square app
- Use different Square application for development/testing
- Never mix production and test credentials

### **Webhook Verification:**

After adding webhook URL:
1. Click **"Send Test Event"** in Square Dashboard
2. Check if delivery succeeds
3. Verify in Vercel function logs
4. Status should show green checkmark ✅

---

## 📚 ADDITIONAL RESOURCES

### **Square Developer Docs:**
- OAuth: https://developer.squareup.com/docs/oauth-api/overview
- Webhooks: https://developer.squareup.com/docs/webhooks/overview
- Web Payments SDK: https://developer.squareup.com/docs/web-payments/overview
- POS API: https://developer.squareup.com/docs/pos-api/what-it-does

### **Your App Endpoints:**
- OAuth Status: `/api/oauth/square/status`
- Square Diagnostics: `/api/square/diagnose`
- Health Check: `/api/health`

---

## ✨ FINAL CHECKLIST

Before going live, verify:

- [ ] OAuth redirect URL added to Square
- [ ] Web Payments SDK domain added
- [ ] Webhook URL configured with events
- [ ] Webhook signature key in Vercel env
- [ ] POS callback URL added (if using markets)
- [ ] All environment variables in Vercel
- [ ] Test OAuth flow works
- [ ] Test checkout works
- [ ] Test webhook receives events
- [ ] Production mode enabled in Square

---

## 🚀 YOU'RE READY!

Once these URLs are configured in Square Dashboard:
1. ✅ Customers can checkout online
2. ✅ Admin can manage products
3. ✅ Orders sync automatically
4. ✅ Real-time inventory updates
5. ✅ POS sales tracked
6. ✅ Full e-commerce operational!

**Questions?** Check `/api/square/diagnose` endpoint for health check.

---

**Last Updated:** After critical fixes implementation  
**Status:** ✅ Ready for Square configuration
