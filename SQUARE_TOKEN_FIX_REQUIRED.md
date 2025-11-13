# 🚨 SQUARE TOKEN PERMISSION ISSUE - FALLBACK MODE ENABLED

## Current Status

**Orders are NOW working** with fallback mode enabled.

However, **you will NOT receive Square Dashboard notifications** until the Square token permissions are fixed.

## What's Happening

### ✅ Working Now (Fallback Mode)
- Customers can place orders
- Orders saved to MongoDB
- Confirmation emails/SMS sent
- Success page shows order number
- **BUT**: Orders do NOT appear in Square Dashboard

### ⚠️ Square Integration Status
- **Square Order API**: ❌ Returns "This request could not be authorized"
- **Square Payment Link API**: ❌ Blocked by authorization
- **Root Cause**: Access Token missing required permissions

## The Problem

Your Square Access Token (`EAAA...FFDg`) is missing these required permissions:
- **ORDERS_WRITE** - Create orders in Square
- **PAYMENTS_WRITE** - Create payment links
- **ITEMS_READ** - Read catalog items

## How to Fix (Get Square Notifications Working)

### Step 1: Check Current Token Permissions
1. Go to https://developer.squareup.com/apps
2. Click on your application
3. Go to **"Credentials"** tab
4. Look at **"Personal Access Token"** section

### Step 2: Verify Permissions
Check if these are enabled:
- [x] ORDERS_WRITE
- [x] PAYMENTS_WRITE  
- [x] ITEMS_READ
- [x] MERCHANT_PROFILE_READ

### Step 3: Generate New Token (If Needed)
If permissions are missing:
1. Go to **"Production" > "Access Token"**
2. Click **"Show"** to reveal current token
3. Or click **"Generate New Token"**
4. **Important**: Make sure all required permissions are checked BEFORE generating

### Step 4: Update Environment Variable
```bash
# In /app/.env file, replace the token:
SQUARE_ACCESS_TOKEN=YOUR_NEW_TOKEN_HERE
```

### Step 5: Disable Fallback Mode
```bash
# In /app/.env file, change:
SQUARE_FALLBACK_MODE=false
```

### Step 6: Restart Application
```bash
sudo supervisorctl restart nextjs
```

### Step 7: Test
1. Place a test order
2. Check logs for: `✅ Square Order created successfully`
3. Check Square Dashboard → Orders
4. You should see the order!

## Temporary Fallback Mode

**Current Setting**: `SQUARE_FALLBACK_MODE=true`

This means:
- Orders will succeed even if Square fails
- Local database stores all orders
- You can manually create Square orders later
- Customers get email/SMS confirmations
- **No Square Dashboard notifications** (yet)

## Testing Square Token

Want to test if your token works?

```bash
# Test Square Orders API directly
curl -X POST https://connect.squareup.com/v2/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Square-Version: 2025-10-16" \
  -d '{
    "idempotency_key": "test-123",
    "order": {
      "location_id": "L66TVG6867BG9",
      "line_items": [
        {
          "quantity": "1",
          "name": "Test Item",
          "base_price_money": {
            "amount": 1000,
            "currency": "USD"
          }
        }
      ]
    }
  }'
```

**Expected Response if Token is Good**:
```json
{
  "order": {
    "id": "abc123...",
    "location_id": "L66TVG6867BG9",
    ...
  }
}
```

**Expected Response if Token is Bad**:
```json
{
  "errors": [
    {
      "category": "AUTHENTICATION_ERROR",
      "code": "UNAUTHORIZED",
      "detail": "This request could not be authorized."
    }
  ]
}
```

## Quick Fix Checklist

- [ ] Go to Square Developer Dashboard
- [ ] Check token permissions (ORDERS_WRITE, PAYMENTS_WRITE)
- [ ] Generate new token if needed
- [ ] Update .env with new token
- [ ] Set SQUARE_FALLBACK_MODE=false
- [ ] Restart application
- [ ] Test order placement
- [ ] Check Square Dashboard for order

## Support

**Square Developer Support**:
- https://squareup.com/help/contact
- Developer Discord: https://squ.re/slack

**Documentation**:
- Orders API: https://developer.squareup.com/reference/square/orders-api
- Payment Links: https://developer.squareup.com/reference/square/checkout-api/create-payment-link
- OAuth Scopes: https://developer.squareup.com/docs/oauth-api/square-oauth-scopes

---

**Current Status**: Orders working in fallback mode. Square notifications will work once token permissions are fixed.
