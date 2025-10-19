# Square Point of Sale API - Web Callback URLs Configuration Guide

## 🔗 Your Web Callback URL for Square POS

**Primary Callback URL** (Add this in Square Dashboard):
```
https://square-payments-2.preview.emergentagent.com/api/pos/callback
```

---

## 📋 How to Configure in Square Dashboard

### Step 1: Access Square Developer Dashboard
1. Go to https://developer.squareup.com
2. Sign in with your Square account
3. Select your application (or create a new one)

### Step 2: Add Point of Sale Web Callback URL
1. Click on "Point of Sale API" in the left sidebar
2. Scroll to **"Web callback URLs"** section
3. Click **"Add callback URL"**
4. Enter: `https://square-payments-2.preview.emergentagent.com/api/pos/callback`
5. Click **"Save"**

### Step 3: Configure Additional Callbacks (Optional)
You can add multiple callback URLs for different purposes:

**Success Callback** (for successful transactions only):
```
https://square-payments-2.preview.emergentagent.com/api/pos/callback?type=success
```

**Error Callback** (for failed/cancelled transactions):
```
https://square-payments-2.preview.emergentagent.com/api/pos/callback?type=error
```

---

## 🎯 ALL YOUR CALLBACK URLs (Complete Reference)

### 1. Point of Sale API (Mobile/Tablet Payments)
```
https://square-payments-2.preview.emergentagent.com/api/pos/callback
```
**Purpose**: Receive payment notifications when transactions are completed via Square POS app on iOS/Android  
**Method**: GET (with query parameters)  
**Parameters Received**:
- `transaction_id` - Square transaction ID
- `client_transaction_id` - Your custom transaction ID
- `amount` - Payment amount in cents
- `currency_code` - USD
- `status` - 'ok', 'error', or 'cancel'
- `com.squareup.pos.RECEIPT_URL` - Receipt URL
- Custom params: `orderId`, `customerEmail` (if you passed them)

---

### 2. Square OAuth (API Authentication)
```
https://square-payments-2.preview.emergentagent.com/api/oauth/square/callback
```
**Purpose**: OAuth flow callback for obtaining API access tokens  
**Configure in**: Square Developer Dashboard → OAuth → Redirect URL  
**Method**: GET  
**Status**: ✅ Already implemented

---

### 3. Square Webhooks (Order/Payment Events)
```
https://square-payments-2.preview.emergentagent.com/api/webhooks/square
```
**Purpose**: Receive real-time notifications for payment.created, order.updated, etc.  
**Configure in**: Square Developer Dashboard → Webhooks → Add Endpoint  
**Method**: POST  
**Events to Subscribe**:
- `payment.created`
- `payment.updated`
- `order.created`
- `order.updated`
- `inventory.count.updated`
- `catalog.version.updated`

**Signature Key** (from your .env): `jdpVqg2RUVe7XnNt_GGS2Q`  
**Status**: ✅ Handler implemented, waiting for webhook configuration

---

### 4. Square Online Store Return URL
```
https://square-payments-2.preview.emergentagent.com/checkout/success?orderId={order_id}&total={total}
```
**Purpose**: Customer return URL after completing payment on Square Online store  
**Configure in**: Square Online → Settings → Checkout Settings → Return URL  
**Method**: GET (browser redirect)  
**Status**: ✅ Success page created and ready

---

## 🔧 What Each Callback Does

### POS Callback Handler (`/api/pos/callback`)
**When it's called**: After customer pays via Square POS app (in-person at market booth)

**What it does**:
1. ✅ Receives transaction details (ID, amount, status)
2. ✅ Updates order in database (status → 'paid')
3. ✅ Awards reward points ($1 = 1 point)
4. ✅ Redirects to success page if payment successful
5. ✅ Redirects to error page if payment failed
6. ✅ Redirects to order page if cancelled

**Response Codes**:
- Success → Redirect to `/checkout/success`
- Error → Redirect to `/checkout/error`
- Cancel → Redirect to `/order?status=cancelled`

### Success Page (`/checkout/success`)
**When it's called**: After Square payment (Online OR POS) completes

**What it does**:
1. ✅ Displays order confirmation with details
2. ✅ Shows purchased items with images
3. ✅ Awards reward points for purchase automatically
4. ✅ Triggers post-purchase spin wheel for $20+ orders
5. ✅ Creates coupon code for next order discount
6. ✅ Shows fulfillment details (pickup/delivery)
7. ✅ Provides action buttons (View Passport, Check Rewards, Shop More)

---

## 📱 How It Works - Complete Flow

### Flow 1: Square Online Checkout (Current Implementation)
```
Customer on your site
  ↓
Adds products to cart
  ↓
Fills customer info
  ↓
Selects fulfillment
  ↓
Clicks "Checkout on Square → $XX.XX"
  ↓
Redirects to: tasteofgratitude.shop/s/order?add=product1&add=product2...
  ↓
Customer completes payment on Square
  ↓
Square redirects to: your-site.com/checkout/success?orderId=XXX
  ↓
Success page awards points, shows confirmation
  ↓
Spin wheel appears for $20+ orders
```

### Flow 2: Square Point of Sale (In-Person Payments)
```
Customer at market booth
  ↓
You enter order in Square POS app (iPad/phone)
  ↓
Add custom data: orderId, customerEmail
  ↓
Customer pays (card/cash/contactless)
  ↓
Square POS sends notification to: your-site.com/api/pos/callback
  ↓
Callback updates order, awards points
  ↓
Redirects to success page
  ↓
Customer sees confirmation + bonus spin
```

### Flow 3: Direct Product Buy (Quick Purchase)
```
Customer clicks "Buy Directly on Square →"
  ↓
Opens: tasteofgratitude.shop/s/order?add=product-name
  ↓
Customer completes purchase on Square
  ↓
Square redirects to your success page
  ↓
Points awarded, confirmation shown
```

---

## ✅ Configuration Checklist

### In Square Developer Dashboard:
- [ ] Add POS Web Callback URL: `https://square-payments-2.preview.emergentagent.com/api/pos/callback`
- [ ] Add OAuth Redirect URL: `https://square-payments-2.preview.emergentagent.com/api/oauth/square/callback`
- [ ] Configure Webhooks endpoint: `https://square-payments-2.preview.emergentagent.com/api/webhooks/square`
- [ ] Subscribe to events: payment.created, payment.updated, order.created, order.updated
- [ ] Set webhook signature key: `jdpVqg2RUVe7XnNt_GGS2Q`

### In Square Online Dashboard:
- [ ] Go to: Square Online → Settings → Checkout
- [ ] Set Return URL: `https://square-payments-2.preview.emergentagent.com/checkout/success`
- [ ] Enable "Pass order ID in return URL" (if available)

### On Your Site (Already Done):
- ✅ POS callback handler created
- ✅ Success page implemented
- ✅ OAuth callback ready
- ✅ Webhook handler ready
- ✅ Reward points auto-award system
- ✅ Post-purchase spin wheel

---

## 🧪 Testing Your Callbacks

### Test POS Callback:
```bash
# Simulate successful POS payment
curl "https://square-payments-2.preview.emergentagent.com/api/pos/callback?status=ok&transaction_id=TEST123&amount=3600&orderId=ORDER-123&customerEmail=test@example.com"

# Should redirect to success page
```

### Test Success Page:
```
https://square-payments-2.preview.emergentagent.com/checkout/success?orderId=ORDER-123&amount=3600&transactionId=TEST123
```

### Test Square Online Flow:
1. Go to: https://tasteofgratitude.shop/s/order?add=elderberry-moss&add=pineapple-basil
2. Complete checkout on Square
3. Should redirect back to your success page

---

## 📞 Support & Next Steps

**If callbacks aren't working**:
1. Check Square Dashboard for webhook delivery logs
2. Check your server logs: `tail -f /var/log/supervisor/nextjs.out.log`
3. Verify URL is accessible: `curl -I https://square-payments-2.preview.emergentagent.com/api/pos/callback`
4. Ensure HTTPS is enabled (Square requires secure callbacks)

**To enable automatic order sync**:
1. Get valid Square API credentials
2. Configure webhooks in Square Dashboard
3. System will auto-update order status on payment
4. Points awarded automatically
5. Inventory updates sync

---

## 🎯 QUICK ANSWER

**Add this URL to Square POS Web Callback URLs**:
```
https://square-payments-2.preview.emergentagent.com/api/pos/callback
```

**That's it!** Your system will now receive payment notifications from Square Point of Sale and automatically:
- Update order status
- Award reward points
- Show confirmation to customers
- Trigger post-purchase spin wheel for $20+ orders

---

**All callback handlers are implemented and ready to receive Square notifications!** ✅
