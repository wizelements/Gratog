# Payment Issues - Debug Guide

## Current Status (2026-04-26 14:30 UTC)

### ✅ What's Working:
1. All API endpoints are deployed and responding (401/400 = working)
2. Webhook endpoint exists at `/api/webhooks/square`
3. Order creation endpoint exists
4. Payment endpoint exists

### ❓ What's Unknown:
1. **Specific error message** - What exact error are users seeing?
2. **Square webhook configuration** - Is webhook URL set correctly in Square Dashboard?
3. **Database connection** - Is MongoDB properly connected?
4. **Environment variables** - Are all secrets configured in Vercel?

---

## 🔍 DEBUG CHECKLIST

### 1. Check Square Webhook Configuration
Go to: https://developer.squareup.com/apps
- Select your app
- Go to "Webhooks" section
- Verify webhook URL is: `https://tasteofgratitude.shop/api/webhooks/square`
- Should be POST method
- Should subscribe to: `payment.updated`, `payment.completed`

### 2. Check Vercel Environment Variables
Go to: https://vercel.com/wizelements/gratog/settings/environment-variables
Required variables:
- `SQUARE_ACCESS_TOKEN` 
- `SQUARE_LOCATION_ID`
- `SQUARE_ENVIRONMENT` (should be "production" or "sandbox")
- `MONGODB_URI`
- `WEBHOOK_SIGNATURE_KEY`

### 3. Check Vercel Function Logs
Go to: https://vercel.com/wizelements/gratog/logs
- Filter by "Functions"
- Look for errors in:
  - `/api/webhooks/square`
  - `/api/payments`
  - `/api/orders/create`

### 4. Test Order Flow Manually
```bash
# Step 1: Create order
curl -X POST https://tasteofgratitude.shop/api/orders/create \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {"email":"test@test.com","name":"Test","phone":"5555555555"},
    "cart": [{"name":"Test Item","price":10.00,"quantity":1}],
    "fulfillmentType": "pickup_market"
  }'

# Step 2: Check if order exists
curl "https://tasteofgratitude.shop/api/orders/by-ref?orderRef=ORDER_NUMBER"

# Step 3: Check webhook delivery in Square Dashboard
```

---

## 🚨 COMMON ISSUES

### Issue 1: Webhook URL Wrong
**Symptom**: Webhooks not firing, orders not updating  
**Fix**: Ensure Square webhook URL points to `/api/webhooks/square` NOT `/api/payments/square`

### Issue 2: Database Connection Failed
**Symptom**: 500 errors on order creation  
**Fix**: Check `MONGODB_URI` is set in Vercel environment variables

### Issue 3: Square Credentials Invalid
**Symptom**: Orders created but payments fail  
**Fix**: Verify `SQUARE_ACCESS_TOKEN` is current and not expired

### Issue 4: Webhook Signature Mismatch
**Symptom**: Webhooks return 401  
**Fix**: Ensure `WEBHOOK_SIGNATURE_KEY` matches Square's signature key

### Issue 5: Wrong Collection Being Used
**Symptom**: Orders created but not found by webhooks  
**Fix**: The code now checks both `orders` and `marketorders` collections

---

## 📝 CODE CHANGES MADE

1. **Webhook handler** - Changed from PUT to POST in `/api/payments/square/route.ts`
2. **Status mapping** - Standardized status values (CONFIRMED, PENDING_PAYMENT, etc.)
3. **MarketOrder support** - Added MarketOrder lookup to webhook handlers
4. **Order lookup** - Added MarketOrder to `/api/orders/by-ref`

---

## 🔧 QUICK FIXES TO TRY

### Option 1: Re-deploy
```bash
git commit --allow-empty -m "trigger: redeploy"
git push origin main
```

### Option 2: Check Environment Variables
Make sure these are set in Vercel:
```
SQUARE_ACCESS_TOKEN=sq0atp-...
SQUARE_LOCATION_ID=L...
SQUARE_ENVIRONMENT=sandbox (or production)
MONGODB_URI=mongodb+srv://...
WEBHOOK_SIGNATURE_KEY=...
```

### Option 3: Test with Debug Logging
Add temporary debug logs to webhook handler to see what's happening.

---

## 📊 WHAT I NEED FROM YOU

To diagnose further, please provide:

1. **Exact error message** - What do users see?
2. **Vercel logs** - Any errors in Functions logs?
3. **Square webhook logs** - Are webhooks being delivered?
4. **Order ID example** - A specific order that failed
5. **Test steps** - Exact steps to reproduce the issue

---

## 🎯 NEXT ACTIONS

Choose one:

**A. Provide error details**
- Screenshot of error
- Vercel Function logs
- Square webhook delivery logs

**B. Test specific flow**
- Create test order
- Share order ID
- Check if webhook fired

**C. Rollback changes**
```bash
git revert e6253b9 6e017e3 1e999ee 193eeb7 --no-commit
git commit -m "Revert: Payment fixes causing issues"
git push origin main
```

**D. Add more debugging**
- I can add extensive logging to trace the issue

---

*Debug guide created: 2026-04-26*
*Current deployment: e6253b9*
