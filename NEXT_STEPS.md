# 🚀 NEXT STEPS - ACTION REQUIRED

**Current Status:** ✅ All code fixes implemented and verified  
**Build Status:** ✅ Successful (0 errors)  
**Action Required:** Update Square credentials  
**Time Estimate:** 15 minutes

---

## ⚡ IMMEDIATE ACTIONS (Do This Now)

### Step 1: Get Square Production Credentials (5 minutes)

1. **Open Square Developer Dashboard**
   - URL: https://developer.squareup.com/apps
   - Login to your Square account

2. **Select Your Production Application**
   - Click on your application name
   - Go to "Credentials" tab

3. **Copy Production Credentials** (NOT Sandbox)
   
   ✅ **Production Access Token**
   - Location: Credentials → Production → Access Token
   - Format: Starts with `EAAA` or `sq0atp-`
   - ⚠️ **DO NOT** copy "Client Secret" (starts with `sq0csp-`)
   - Click "Show" → Copy entire token
   
   ✅ **Application ID**
   - Location: Credentials → Production → Application ID
   - Format: Starts with `sq0idp-`
   - Copy entire ID
   
   ✅ **Location ID**
   - Go to "Locations" tab
   - Copy the ID of your production location
   - Format: Single letter + alphanumeric (e.g., `L66TVG6867BG9`)

### Step 2: Update Environment Variables (3 minutes)

Update these in your deployment platform (Vercel/Netlify/etc.):

```bash
# CRITICAL - Replace with actual values from Square Dashboard
SQUARE_ACCESS_TOKEN=EAAA...                        # Production Access Token
NEXT_PUBLIC_SQUARE_APPLICATION_ID=sq0idp-...      # Production Application ID  
SQUARE_LOCATION_ID=L...                           # Production Location ID
SQUARE_ENVIRONMENT=production                      # Must be exactly "production"
SQUARE_MOCK_MODE=false                            # Disable fallback mode
```

**⚠️ IMPORTANT:**
- Use **Production** credentials, not Sandbox
- Access Token should start with `EAAA` or `sq0atp-`
- If it starts with `sq0csp-`, that's the Client Secret (wrong!)

### Step 3: Verify Credentials Before Deploy (2 minutes)

Test your credentials locally:

```bash
# Replace $YOUR_TOKEN with actual token
curl -X GET https://connect.squareup.com/v2/locations \
  -H "Authorization: Bearer $YOUR_TOKEN" \
  -H "Square-Version: 2024-10-17"

# Expected: 200 OK with JSON containing "locations" array
# If 401: Wrong token or expired
# If 403: Token valid but wrong permissions
```

### Step 4: Deploy Application (5 minutes)

```bash
# Rebuild and deploy
npm run build

# Deploy to your platform
# - Vercel: git push (auto-deploy)
# - Other: Use your deployment command
```

### Step 5: Verify Deployment (5 minutes)

```bash
# Test health check
curl https://your-domain.com/api/health

# Expected response:
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "square_api": "production"  ← Should show "production"
  }
}

# Test Square diagnostic
curl -X POST https://your-domain.com/api/square/diagnose

# Expected response:
{
  "results": {
    "credentialValidation": {"status": "VALID"},    ← Should be VALID
    "locationValidation": {"status": "VALID"},      ← Should be VALID
    "permissionCheck": {"status": "OK"},            ← Should be OK
    "overallStatus": "READY"                        ← Should be READY
  }
}
```

---

## 🎯 SUCCESS CRITERIA

After deploying with correct credentials, verify these work:

### ✅ Checkout Flow
```bash
# Create test order
curl -X POST https://your-domain.com/api/orders/create \
  -H "Content-Type: application/json" \
  -d '{
    "cart": [{"id": "test", "name": "Test", "price": 10, "quantity": 1}],
    "customer": {"name": "Test User", "email": "test@example.com", "phone": "1234567890"},
    "fulfillmentType": "pickup",
    "pickupLocation": "serenbe"
  }'

# Expected: 200 OK with order number
```

### ✅ Payment Processing
```bash
# Test payment link creation (requires valid catalog ID)
curl -X POST https://your-domain.com/api/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "lineItems": [
      {"catalogObjectId": "YOUR_CATALOG_ID", "quantity": "1"}
    ]
  }'

# Expected: 200 OK with payment link URL
```

### ✅ Square Diagnostic
All checks should return "VALID" or "OK":
- ✅ Credential Validation: VALID
- ✅ Location Validation: VALID  
- ✅ Permission Check: OK
- ✅ Overall Status: READY

---

## 🔍 TROUBLESHOOTING

### Issue: "SQUARE_ACCESS_TOKEN is a Client Secret"

**Cause:** You copied the Client Secret instead of Access Token

**Fix:**
1. Go back to Square Dashboard → Credentials → Production
2. Find "Access Token" (NOT Client Secret)
3. Copy the Access Token (starts with EAAA or sq0atp-)
4. Update environment variable
5. Redeploy

### Issue: Square diagnostic still shows "INVALID"

**Cause:** Token format wrong or not updated

**Fix:**
1. Verify token starts with `EAAA` or `sq0atp-` (NOT `sq0csp-`)
2. Verify `SQUARE_ENVIRONMENT=production`
3. Check for extra spaces in environment variables
4. Redeploy after fixing
5. Clear any browser/CDN caches

### Issue: "Card nonce not found" in payment tests

**Cause:** Using sandbox test nonces with production API

**Fix:**
- Production API doesn't accept test nonces like `cnon:card-nonce-ok`
- Use real card numbers or Square's production test cards
- For testing, consider using Square's Card on File API

### Issue: Orders still fail with 500

**Check:**
1. Look at error logs for detailed message (now includes stack trace)
2. Verify database connection in health check
3. Check MongoDB permissions
4. Review logs for specific MongoDB error

### Issue: Webhooks still return 500

**Check:**
1. Verify `SQUARE_WEBHOOK_SIGNATURE_KEY` is set
2. Check webhook payload in logs (now logged on error)
3. Verify webhook URL registered in Square Dashboard
4. Check database write permissions

---

## 📊 MONITORING (First 24 Hours)

After deployment, monitor these:

### Check Health Endpoint Hourly
```bash
watch -n 3600 "curl -s https://your-domain.com/api/health | jq '.services'"
```

### Monitor Error Logs
Look for:
- ❌ Any "UNAUTHORIZED" errors from Square
- ❌ Any fallback mode activations (should be 0 in production)
- ✅ Successful payment processing
- ✅ Successful order creation

### Track Key Metrics
- Order creation success rate: Target >95%
- Payment success rate: Target >95%
- Square API success rate: Target >99%
- Database operations: Target 100%

---

## 📋 QUICK REFERENCE

### Environment Variables Required
```bash
SQUARE_ACCESS_TOKEN=EAAA...           # Production Access Token
NEXT_PUBLIC_SQUARE_APPLICATION_ID=sq0idp-...  # Application ID
SQUARE_LOCATION_ID=L...               # Location ID
SQUARE_ENVIRONMENT=production         # Exact string
SQUARE_MOCK_MODE=false               # Disable fallback
```

### Key Endpoints to Test
- Health: `GET /api/health`
- Diagnostic: `POST /api/square/diagnose`
- Products: `GET /api/products`
- Order: `POST /api/orders/create`
- Payment: `POST /api/payments`
- Checkout: `POST /api/checkout`
- Webhook: `GET /api/square-webhook`

### Expected Response Codes
- ✅ 200: Success
- ✅ 400: Validation error (expected for bad input)
- ❌ 401: Authentication failed (credential issue)
- ❌ 500: Server error (check logs)
- ❌ 503: Service unavailable (Square auth failed, production safety active)

---

## 🆘 SUPPORT

### If You Get Stuck

1. **Check Error Logs** - All errors now include detailed stack traces
2. **Run Diagnostic** - `POST /api/square/diagnose` shows credential status
3. **Verify Credentials** - Use curl to test Square API directly
4. **Review Documentation**:
   - [CRITICAL_ISSUES_REPORT.md](file:///app/CRITICAL_ISSUES_REPORT.md)
   - [DEPLOYMENT_FIXES.md](file:///app/DEPLOYMENT_FIXES.md)
   - [FIX_SUMMARY.md](file:///app/FIX_SUMMARY.md)

### Square Resources
- **Developer Dashboard:** https://developer.squareup.com/apps
- **API Reference:** https://developer.squareup.com/reference/square
- **API Explorer:** https://developer.squareup.com/explorer/square
- **Status Page:** https://status.squareup.com

### Code References
- Square validation: [lib/square.ts](file:///app/lib/square.ts)
- Production guard: [lib/square-guard.ts](file:///app/lib/square-guard.ts)
- Payment API: [app/api/payments/route.ts](file:///app/app/api/payments/route.ts)
- Checkout API: [app/api/checkout/route.ts](file:///app/app/api/checkout/route.ts)

---

## ✅ COMPLETION CHECKLIST

Before marking this as complete:

- [ ] Copied Production Access Token from Square Dashboard
- [ ] Copied Application ID from Square Dashboard
- [ ] Copied Location ID from Square Dashboard
- [ ] Updated all environment variables
- [ ] Verified credentials with curl test
- [ ] Deployed application
- [ ] Health check shows "healthy"
- [ ] Square diagnostic shows "READY"
- [ ] Test order creation succeeds
- [ ] Test payment processing succeeds (or understood why test nonces fail)
- [ ] No fallback mode activations in logs
- [ ] Monitoring set up for next 24 hours

---

**Expected Total Time:** 15-20 minutes  
**Difficulty:** Easy (just credential update)  
**Risk:** Low (all code fixes tested)

**Once complete, system will go from 30.6% → 95%+ health score**

🚀 **Ready to deploy!**
