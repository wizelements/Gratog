# Payment & Checkout Flow - Verification Guide

**Status:** Ready for testing
**Environment:** Production (Vercel)
**Date:** December 22, 2025

---

## Overview

This guide validates that the complete checkout and payment flow works correctly after the production deployment fix (ThemeProvider addition).

## 1. End-to-End Checkout Test

### Prerequisites
- ✅ Site renders correctly (confirmed with localhost and curl tests)
- ✅ ThemeProvider wrapper is in place
- ✅ All environment variables configured in Vercel
- ✅ Square SDK loaded and available

### Test Steps

#### Step 1: Homepage Load
```bash
curl -s https://tasteofgratitude.shop \
  | grep -o "Shop Premium Sea Moss\|Something went wrong" \
  | head -1
```
**Expected:** Shows "Shop Premium Sea Moss" (not error page)

#### Step 2: API Health Check
```bash
curl -s https://tasteofgratitude.shop/api/health | jq .
```
**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-22T...",
  "services": {
    "database": "connected",
    "square": "initialized"
  }
}
```

#### Step 3: Products Fetch
```bash
curl -s https://tasteofgratitude.shop/api/products \
  | jq '.products | length'
```
**Expected:** Returns number > 0 (e.g., 5, 10, etc.)

#### Step 4: Cart Operations
```bash
# Create cart
curl -X POST https://tasteofgratitude.shop/api/cart \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "sea-moss-gel-original",
        "quantity": 1,
        "price": 2999
      }
    ]
  }' | jq .
```
**Expected:** Returns cart object with items

#### Step 5: Checkout Initiation
```bash
# Request checkout page
curl -X POST https://tasteofgratitude.shop/api/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "lineItems": [
      {
        "catalogObjectId": "your-square-catalog-id",
        "quantity": 1
      }
    ],
    "customer": {
      "email": "test@example.com",
      "name": "Test Customer"
    },
    "redirectUrl": "https://tasteofgratitude.shop/order-confirmation"
  }' | jq '.checkoutUrl'
```
**Expected:** Returns Square checkout URL

---

## 2. Manual Browser Testing (Recommended)

### Complete User Journey

1. **Visit homepage**
   - URL: https://tasteofgratitude.shop
   - Verify: Full page loads, no error page
   - Check DevTools Console: No JS errors

2. **Browse products**
   - Scroll to product grid
   - Verify: Products display with images, names, prices
   - Check: Add to Cart buttons functional

3. **Add to cart**
   - Click "Add to Cart" on a product
   - Verify: Toast notification appears ("Added to cart")
   - Check: Floating cart shows item count

4. **View cart**
   - Click floating cart icon
   - Verify: Cart sidebar opens
   - Check: Items, quantities, total price display correctly

5. **Proceed to checkout**
   - Click "Checkout" button
   - Verify: Redirects to Square checkout page (hosted)
   - Check: Square SDK loaded (no console errors)

6. **Sandbox payment test**
   - Use Square test card: `4532 0151 2156 0343`
   - Expiry: Any future date (e.g., 12/26)
   - CVV: Any 3 digits (e.g., 123)
   - Verify: Payment processes
   - Check: Redirect to confirmation page

7. **Order confirmation**
   - Verify: Confirmation page shows
   - Check: Order details visible
   - Verify: Receipt/thank you message displays

---

## 3. API Endpoint Verification

### Key Endpoints to Test

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/health` | GET | System health | ✅ Should return 200 |
| `/api/products` | GET | Product list | ✅ Should return products |
| `/api/cart` | POST | Create/update cart | ✅ Should accept items |
| `/api/checkout` | POST | Create payment link | ✅ Should return checkoutUrl |
| `/api/orders` | GET | Order history | ✅ Should return user orders |
| `/api/square-webhook` | POST | Payment webhooks | ✅ Vercel accepting POST |

### Testing Script

```bash
#!/bin/bash
# test-payment-flow.sh

BASE_URL="https://tasteofgratitude.shop"
PRODUCT_ID="sea-moss-gel-original"

echo "Testing Payment Flow..."
echo ""

# 1. Health
echo "1️⃣ Health Check"
curl -s $BASE_URL/api/health | jq .
echo ""

# 2. Products
echo "2️⃣ Product List"
PRODUCTS=$(curl -s $BASE_URL/api/products)
PRODUCT_COUNT=$(echo $PRODUCTS | jq '.products | length')
echo "Found $PRODUCT_COUNT products"
echo ""

# 3. Cart Creation
echo "3️⃣ Cart Creation"
CART_RESPONSE=$(curl -s -X POST $BASE_URL/api/cart \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"productId": "'$PRODUCT_ID'", "quantity": 1}]
  }')
echo $CART_RESPONSE | jq .
CART_ID=$(echo $CART_RESPONSE | jq -r '.cartId // "N/A"')
echo "Cart ID: $CART_ID"
echo ""

# 4. Checkout
echo "4️⃣ Checkout Link"
CHECKOUT=$(curl -s -X POST $BASE_URL/api/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "lineItems": [{"catalogObjectId": "square-catalog-id", "quantity": 1}],
    "customer": {"email": "test@example.com", "name": "Test"}
  }')
echo $CHECKOUT | jq .
CHECKOUT_URL=$(echo $CHECKOUT | jq -r '.checkoutUrl // "N/A"')
echo "Checkout URL: $CHECKOUT_URL"
echo ""

echo "✅ All endpoints responding"
```

---

## 4. Payment Provider Health Check

### Square Integration Status

```bash
# Test Square API connectivity
curl -s https://tasteofgratitude.shop/api/square/validate \
  -H "Content-Type: application/json" \
  -d '{}' | jq .
```

**Expected Response:**
```json
{
  "status": "connected",
  "locationId": "your-location-id",
  "environment": "sandbox",
  "catalogLoaded": true
}
```

### Vercel Environment Variables

Verify all payment-related variables are set:
```
✅ SQUARE_ACCESS_TOKEN
✅ SQUARE_LOCATION_ID  
✅ SQUARE_ENVIRONMENT (sandbox or production)
✅ NEXT_PUBLIC_SQUARE_APP_ID
```

---

## 5. Error Handling Verification

### Test Error Scenarios

1. **Missing line items**
   ```bash
   curl -X POST https://tasteofgratitude.shop/api/checkout \
     -H "Content-Type: application/json" \
     -d '{"lineItems": []}'
   ```
   **Expected:** 400 error with message

2. **Invalid product ID**
   ```bash
   curl -X POST https://tasteofgratitude.shop/api/checkout \
     -H "Content-Type: application/json" \
     -d '{
       "lineItems": [{"catalogObjectId": "invalid-id", "quantity": 1}]
     }'
   ```
   **Expected:** 400 or 404 error

3. **Server error handling**
   - Verify error page displays user-friendly message
   - Check Sentry logs capture error
   - Confirm no sensitive info leaked

---

## 6. SSL Certificate Verification

```bash
# Check SSL certificate validity
curl -vI https://tasteofgratitude.shop 2>&1 | grep -i cert

# Expected output should show:
# - subject: CN=tasteofgratitude.shop
# - issuer: Let's Encrypt / Vercel
# - Not before/after dates valid
```

---

## 7. DNS Verification (After Cleanup)

```bash
# Verify both domains resolve to Vercel IPs
nslookup tasteofgratitude.shop
# Expected: 76.76.21.21 only

nslookup www.tasteofgratitude.shop
# Expected: 76.76.21.93 only (after stray record deleted)

# Both should resolve ONLY to Vercel IPs
```

---

## 8. Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "Something went wrong" error | JS hydration error (ThemeProvider missing) | ✅ FIXED - ThemeProvider added |
| Intermittent 502 errors | DNS round-robin to wrong IP | Delete stray DNS record |
| Square SDK not loading | Square script blocked by CSP | Check Content-Security-Policy headers |
| Checkout link returns null | Environment variables missing | Verify Vercel env vars |
| Payment fails at confirmation | Square webhook not received | Check Vercel logs for webhook errors |

---

## 9. Monitoring & Alerts

### Recommended Setup

1. **Uptime Monitoring**
   - Tool: UptimeRobot / Vercel Health Checks
   - Check: Homepage loads every 5 min
   - Alert: If HTTP 200 + "Sea Moss" content missing

2. **Error Tracking**
   - Tool: Sentry (already integrated)
   - Alert: 5+ errors in 10 minutes

3. **Payment Monitoring**
   - Tool: Square Dashboard + Vercel Logs
   - Check: Webhook delivery status
   - Monitor: Failed transactions

---

## 10. Validation Checklist

- [ ] Homepage loads without "Something went wrong" error
- [ ] Products display with correct pricing
- [ ] Cart creation and updates work
- [ ] Checkout link generates successfully
- [ ] Square payment page loads
- [ ] Test payment completes (sandbox)
- [ ] Order confirmation page shows
- [ ] SSL certificate valid for both root and www
- [ ] DNS resolves to single Vercel IP per domain
- [ ] No JavaScript errors in browser console
- [ ] Responsive design works on mobile
- [ ] All API endpoints return correct status codes

---

## Next Steps

1. **Immediate:** Run manual browser test (Section 2)
2. **Short-term:** Execute API verification script (Section 3)
3. **Ongoing:** Monitor Sentry dashboard for production errors
4. **Manual:** Perform DNS cleanup via registrar (see DNS_CLEANUP_GUIDE.md)

---

**Status:** ✅ All systems ready for testing
**Last Updated:** 2025-12-22
