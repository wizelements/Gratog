# 🔐 Square OAuth Setup - Complete Guide

## ✅ What I've Built for You

I've created a **complete OAuth authorization flow** to get valid Square tokens with proper permissions.

### New Features Added:
1. **OAuth Authorization Initiator** - `/app/app/api/oauth/square/authorize/route.ts`
2. **OAuth Callback Handler** - `/app/app/api/oauth/square/callback/route.ts`
3. **Configuration Status API** - `/app/app/api/oauth/square/status/route.ts`
4. **Admin OAuth Page** - `/app/app/admin/square-oauth/page.tsx`

---

## 🎯 YOUR REDIRECT URLs

### Callback URL (REQUIRED in Square Dashboard):
```
https://typebug-hunter.preview.emergentagent.com/api/oauth/square/callback
```

### Authorization URLs (Visit These After Step 1):

**Production:**
```
https://connect.squareup.com/oauth2/authorize?client_id=sq0idp-V1fV-MwsU5lET4rvzHKnIw&scope=MERCHANT_PROFILE_READ%20ITEMS_READ%20ITEMS_WRITE%20ORDERS_READ%20ORDERS_WRITE%20PAYMENTS_READ%20PAYMENTS_WRITE%20CUSTOMERS_READ%20CUSTOMERS_WRITE%20INVENTORY_READ%20INVENTORY_WRITE&state=RANDOM&redirect_uri=https://typebug-hunter.preview.emergentagent.com/api/oauth/square/callback
```

**Sandbox:**
```
https://connect.squareupsandbox.com/oauth2/authorize?client_id=sandbox-sq0idb-yygbGJe58k9ZsmpZhJ6kjA&scope=MERCHANT_PROFILE_READ%20ITEMS_READ%20ITEMS_WRITE%20ORDERS_READ%20ORDERS_WRITE%20PAYMENTS_READ%20PAYMENTS_WRITE%20CUSTOMERS_READ%20CUSTOMERS_WRITE%20INVENTORY_READ%20INVENTORY_WRITE&state=RANDOM&redirect_uri=https://typebug-hunter.preview.emergentagent.com/api/oauth/square/callback
```

---

## 📋 STEP-BY-STEP SETUP

### STEP 1: Add Redirect URL in Square Dashboard (5 minutes)

1. **Open Square Developer Console:**
   🔗 https://developer.squareup.com/apps

2. **Select Your Application:**
   - Production App ID: `sq0idp-V1fV-MwsU5lET4rvzHKnIw`
   - Click on it to open

3. **Navigate to OAuth Tab:**
   - Look for **"OAuth"** in the left sidebar
   - Click on it

4. **Add Redirect URL:**
   - Find the **"Redirect URL"** section (might say "Redirect URLs" or "OAuth Redirect URIs")
   - Click **"+ Add URL"** or **"Add Redirect URL"**
   - Paste this EXACTLY (no trailing slash!):
     ```
     https://typebug-hunter.preview.emergentagent.com/api/oauth/square/callback
     ```
   - Click **"Save"**

5. **Do the Same for Sandbox:**
   - Switch to **Sandbox** tab (if separate)
   - Or if you have a separate sandbox app, repeat for that app
   - Add the SAME callback URL

6. **Verify:**
   - The callback URL should now appear in the list
   - Make sure there are NO trailing slashes
   - URL must match EXACTLY

---

### STEP 2: Get Client Secret (REQUIRED)

**IMPORTANT:** You need your **Client Secret** to exchange the authorization code for tokens.

1. **In the same OAuth tab:**
   - Look for **"Client Secret"**
   - Click **"Show"** to reveal it
   - **Copy it immediately**

2. **Add to Environment Variables:**
   ```bash
   # Edit /app/.env and add:
   SQUARE_CLIENT_SECRET=<paste_your_client_secret_here>
   ```

3. **Restart application:**
   ```bash
   sudo supervisorctl restart nextjs
   ```

---

### STEP 3: Authorize Your Application (3 minutes)

#### Option A: Use the Admin Page (Easiest)
1. Visit: **https://typebug-hunter.preview.emergentagent.com/admin/square-oauth**
2. Click **"Authorize Production"** (or Sandbox for testing)
3. Log in to Square as the account owner
4. Review permissions on the consent screen
5. Click **"Allow"** to authorize
6. You'll be redirected back with your new tokens displayed

#### Option B: Use Direct Authorization URL
1. Open this URL in your browser (Production):
   ```
   https://connect.squareup.com/oauth2/authorize?client_id=sq0idp-V1fV-MwsU5lET4rvzHKnIw&scope=MERCHANT_PROFILE_READ%20ITEMS_READ%20ITEMS_WRITE%20ORDERS_READ%20ORDERS_WRITE%20PAYMENTS_READ%20PAYMENTS_WRITE%20CUSTOMERS_READ%20CUSTOMERS_WRITE%20INVENTORY_READ%20INVENTORY_WRITE&state=OAUTH123&redirect_uri=https://typebug-hunter.preview.emergentagent.com/api/oauth/square/callback
   ```

2. Or for Sandbox:
   ```
   https://connect.squareupsandbox.com/oauth2/authorize?client_id=sandbox-sq0idb-yygbGJe58k9ZsmpZhJ6kjA&scope=MERCHANT_PROFILE_READ%20ITEMS_READ%20ITEMS_WRITE%20ORDERS_READ%20ORDERS_WRITE%20PAYMENTS_READ%20PAYMENTS_WRITE%20CUSTOMERS_READ%20CUSTOMERS_WRITE%20INVENTORY_READ%20INVENTORY_WRITE&state=OAUTH123&redirect_uri=https://typebug-hunter.preview.emergentagent.com/api/oauth/square/callback
   ```

3. **Log in** with your Square account credentials

4. **Review permissions** on the consent screen

5. **Click "Allow"** to authorize the app

6. **You'll be redirected** to the callback page with your new tokens

---

### STEP 4: Copy and Configure New Tokens (2 minutes)

After authorization, you'll see a page with your tokens:

1. **Copy the Access Token** (click the copy button)

2. **Update .env file:**
   ```bash
   # Edit /app/.env
   SQUARE_ACCESS_TOKEN=<paste_your_new_token_here>
   SQUARE_ENVIRONMENT=production  # or 'sandbox' if you used sandbox
   SQUARE_MOCK_MODE=false
   ```

3. **Save the Refresh Token** (if provided):
   - Store securely for renewing expired tokens
   - Add to .env: `SQUARE_REFRESH_TOKEN=<refresh_token>`

---

### STEP 5: Test Credentials (1 minute)

```bash
cd /app
node test-square-credentials.js
```

**Expected Output:**
```
✅ Test 1: Listing Locations - PASS
✅ Test 2: Getting Location - PASS
✅ Test 3: Listing Catalog - PASS
✅ Test 4: Testing Orders API - PASS

🎉 ALL TESTS PASSED - Credentials are VALID!
```

---

### STEP 6: Sync Catalog (2 minutes)

```bash
node scripts/syncCatalog.js
```

**Expected Output:**
```
✅ Connected to Square successfully
📦 Total objects retrieved: [your products]
✅ Saved [X] items
✅ Catalog sync completed
```

---

### STEP 7: Restart and Go Live (1 minute)

```bash
# Restart application to load new env variables
sudo supervisorctl restart nextjs

# Visit your site
# https://typebug-hunter.preview.emergentagent.com

# Test a real payment!
```

---

## 🎯 Quick Reference

### What to Configure in Square Dashboard

**Location:** Developer Console → Your App → OAuth

**Setting:** Redirect URLs

**Value to Add:**
```
https://typebug-hunter.preview.emergentagent.com/api/oauth/square/callback
```

**Also Need:** Client Secret (from same OAuth page)

---

## 🔧 Troubleshooting

### Issue: "Redirect URI mismatch"

**Cause:** URL in Square Dashboard doesn't match exactly

**Check:**
- No trailing slash in callback URL
- HTTPS (not HTTP)
- Exact domain match
- No extra query parameters

**Fix:** Update Square Dashboard to match exactly:
```
https://typebug-hunter.preview.emergentagent.com/api/oauth/square/callback
```

### Issue: "Invalid client_id"

**Cause:** Using wrong Application ID for environment

**Fix:**
- Production: Use `sq0idp-V1fV-MwsU5lET4rvzHKnIw`
- Sandbox: Use `sandbox-sq0idb-yygbGJe58k9ZsmpZhJ6kjA`

### Issue: "Client secret required"

**Cause:** Missing `SQUARE_CLIENT_SECRET` in .env

**Fix:**
1. Get from Square Dashboard → OAuth tab
2. Add to .env: `SQUARE_CLIENT_SECRET=your_secret`
3. Restart: `sudo supervisorctl restart nextjs`

### Issue: Still getting 401 after OAuth

**Possible Causes:**
1. Wrong environment (production token with sandbox environment)
2. Token not updated in .env
3. Application not restarted

**Fix:**
```bash
# Verify .env has new token
cat /app/.env | grep SQUARE_ACCESS_TOKEN

# Restart
sudo supervisorctl restart nextjs

# Test
node test-square-credentials.js
```

---

## 🎨 Using the Admin OAuth Page

**URL:** https://typebug-hunter.preview.emergentagent.com/admin/square-oauth

**Features:**
- ✅ Visual step-by-step guide
- ✅ One-click authorization buttons
- ✅ Automatic token display
- ✅ Copy-to-clipboard buttons
- ✅ Environment selection (Production/Sandbox)

**Recommended:** Use this page for the easiest setup experience.

---

## 📊 What Permissions Do

| Scope | What It Allows |
|-------|---------------|
| `MERCHANT_PROFILE_READ` | Read business name, locations |
| `ITEMS_READ` | View product catalog |
| `ITEMS_WRITE` | Update products, inventory |
| `ORDERS_READ` | View customer orders |
| `ORDERS_WRITE` | Create new orders, update status |
| `PAYMENTS_READ` | View payment transactions |
| `PAYMENTS_WRITE` | Process credit card payments |
| `CUSTOMERS_READ` | View customer information |
| `CUSTOMERS_WRITE` | Create customer profiles |
| `INVENTORY_READ` | Check stock levels |
| `INVENTORY_WRITE` | Update inventory counts |

All these scopes are **included automatically** in the authorization URLs.

---

## ✅ Success Checklist

After completing OAuth:
- [ ] Redirect URL added in Square Dashboard
- [ ] Client Secret added to .env
- [ ] Authorization completed (clicked "Allow")
- [ ] New access token received
- [ ] Access token added to .env
- [ ] `SQUARE_MOCK_MODE=false` in .env
- [ ] Application restarted
- [ ] `test-square-credentials.js` shows all tests PASS
- [ ] Catalog synced successfully
- [ ] Real payment tested

---

## 🚀 After OAuth is Complete

Once you have valid tokens:

```bash
# Your application will automatically:
✅ Connect to Square's live API
✅ Sync product catalog
✅ Process real payments
✅ Track inventory in real-time
✅ Receive webhook notifications
✅ Manage orders through Square
```

**No code changes needed** - just environment configuration!

---

## 📞 Quick Links

- **Admin OAuth Page:** https://typebug-hunter.preview.emergentagent.com/admin/square-oauth
- **Square Developer Console:** https://developer.squareup.com/apps
- **OAuth Status API:** https://typebug-hunter.preview.emergentagent.com/api/oauth/square/status
- **Square OAuth Docs:** https://developer.squareup.com/docs/oauth-api/overview

---

## 🎯 TL;DR - Fastest Path

```bash
# 1. Add Client Secret to .env first!
SQUARE_CLIENT_SECRET=<get_from_dashboard>

# 2. Restart
sudo supervisorctl restart nextjs

# 3. Visit this page and click "Authorize Production"
https://typebug-hunter.preview.emergentagent.com/admin/square-oauth

# 4. Log in to Square and click "Allow"

# 5. Copy the token shown and update .env

# 6. Test
node test-square-credentials.js

# 7. Sync and go live!
node scripts/syncCatalog.js
```

**Time: 10-15 minutes total**

---

**Current Status:** OAuth flow implemented and ready to use. You just need to add the redirect URL and client secret, then authorize!
