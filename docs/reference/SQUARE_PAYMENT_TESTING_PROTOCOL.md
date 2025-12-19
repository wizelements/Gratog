# Square Payment Integration - Complete Testing Protocol

## 🎯 Purpose

This document provides a **complete, scrutinous, and systematic** approach to testing every aspect of Square payment integration. Follow this protocol to identify and fix ALL issues before production deployment.

---

## 📋 Pre-Test Checklist

### Environment Setup
- [ ] `.env` file exists with all required variables
- [ ] `NEXT_PUBLIC_SQUARE_APPLICATION_ID` set
- [ ] `NEXT_PUBLIC_SQUARE_LOCATION_ID` set
- [ ] `SQUARE_ACCESS_TOKEN` set (production token starts with `EAAA`)
- [ ] `SQUARE_ENVIRONMENT=production`
- [ ] MongoDB running and accessible
- [ ] Application server running (port 3000)

### Vercel Production Setup
- [ ] All environment variables set in Vercel dashboard
- [ ] Variables include `NEXT_PUBLIC_` prefix where needed
- [ ] Latest deployment successful
- [ ] No build errors in deployment logs

### Square Developer Dashboard
- [ ] Application created and configured
- [ ] OAuth redirect URLs include production domain
- [ ] Webhook URLs configured
- [ ] API permissions enabled (PAYMENTS_WRITE, ORDERS_WRITE)
- [ ] Test mode disabled (using production credentials)

---

## 🧪 Test Execution Plan

### Phase 1: Environment & Configuration (15 min)

#### 1.1 Local Environment Test
```bash
cd /app
bash scripts/diagnose-square-production.sh
```

**Expected Results:**
- ✓ All environment variables present
- ✓ Correct token format
- ✓ Environment matches token type
- ✓ No placeholder values

**Common Failures:**
- ❌ Missing `NEXT_PUBLIC_` prefixed variables
- ❌ Sandbox token with production environment
- ❌ Whitespace in credentials

---

#### 1.2 Production Environment Test
```bash
# Visit diagnostic page
open https://gratog.vercel.app/diagnostic
```

**Check Each Item:**
- [ ] NEXT_PUBLIC_SQUARE_APPLICATION_ID: GREEN (not "NOT SET")
- [ ] NEXT_PUBLIC_SQUARE_LOCATION_ID: GREEN
- [ ] Square.js Script: "Loaded" (not "Not Loaded")
- [ ] Square Payments Init: "Success"
- [ ] Current Domain: matches your deployment

**Common Failures:**
- ❌ Environment variables show "NOT SET" → Add to Vercel
- ❌ Square.js shows "Not Loaded" → Ad blocker or CSP issue
- ❌ Square Payments Init fails → Invalid credentials

---

### Phase 2: API Endpoint Testing (30 min)

#### 2.1 Health Check
```bash
curl http://localhost:3000/api/health
```

**Expected:** `{"status":"healthy","database":"connected"}`

**Common Failures:**
- ❌ 500 error → MongoDB not running
- ❌ Timeout → Server not running

---

#### 2.2 Payments API Validation Tests
```bash
# Test 1: Missing sourceId (should fail with 400)
curl -X POST http://localhost:3000/api/payments \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"amountCents\":1000}'

# Expected: {\"error\":\"Payment source ID (token) is required\"}
# Status: 400

# Test 2: Zero amount (should fail with 400)
curl -X POST http://localhost:3000/api/payments \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"sourceId\":\"test\",\"amountCents\":0}'

# Expected: {\"error\":\"Valid amount in cents is required\"}
# Status: 400

# Test 3: Negative amount (should fail with 400)
curl -X POST http://localhost:3000/api/payments \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"sourceId\":\"test\",\"amountCents\":-100}'

# Expected: {\"error\":\"Valid amount in cents is required\"}
# Status: 400

# Test 4: Valid structure (will fail on Square side but validates API)
curl -X POST http://localhost:3000/api/payments \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"sourceId\":\"cnon:card-nonce-ok\",\"amountCents\":1000,\"orderId\":\"test-123\"}'

# Expected: 500 with \"Card nonce not found\" (correct - test nonce doesn't work with production)
# This PROVES the API is reaching Square correctly
```

**Validation Checklist:**
- [ ] Missing sourceId → 400 error
- [ ] Zero amount → 400 error
- [ ] Negative amount → 400 error
- [ ] Test nonce → 500 \"Card nonce not found\" (expected!)

**Common Failures:**
- ❌ 401 Unauthorized → Token invalid or environment mismatch
- ❌ 500 \"SQUARE_ACCESS_TOKEN not configured\" → Missing env var
- ❌ Timeout → Square API unreachable

---

#### 2.3 Order Creation Tests
```bash
# Test 1: Missing cart (should fail)
curl -X POST http://localhost:3000/api/orders/create \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"customer\":{\"name\":\"Test\",\"email\":\"test@example.com\",\"phone\":\"4045551234\"},\"fulfillmentType\":\"pickup\"}'

# Expected: {\"error\":\"Cart is required\"}
# Status: 400

# Test 2: Invalid email (should fail)
curl -X POST http://localhost:3000/api/orders/create \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"cart\":[{\"id\":\"1\",\"name\":\"Test\",\"price\":10,\"quantity\":1,\"variationId\":\"VAR_123\"}],\"customer\":{\"name\":\"Test\",\"email\":\"invalid-email\",\"phone\":\"4045551234\"},\"fulfillmentType\":\"pickup\"}'

# Expected: {\"error\":\"Invalid email format\"}
# Status: 400

# Test 3: Valid pickup order
curl -X POST http://localhost:3000/api/orders/create \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"cart\":[{\"id\":\"1\",\"name\":\"Test Product\",\"price\":15.00,\"quantity\":2,\"variationId\":\"HMOFD754ENI27FH2PGAUJANK\"}],\"customer\":{\"name\":\"Test User\",\"email\":\"test@example.com\",\"phone\":\"4045551234\"},\"fulfillmentType\":\"pickup\"}'

# Expected: Order created successfully with orderNumber, squareOrderId, paymentLink
# Status: 200

# Test 4: Delivery with invalid ZIP (should fail)
curl -X POST http://localhost:3000/api/orders/create \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"cart\":[{\"id\":\"1\",\"name\":\"Test\",\"price\":40,\"quantity\":1,\"variationId\":\"VAR_123\"}],\"customer\":{\"name\":\"Test\",\"email\":\"test@example.com\",\"phone\":\"4045551234\"},\"fulfillmentType\":\"delivery\",\"deliveryAddress\":{\"street\":\"123 Main\",\"city\":\"LA\",\"state\":\"CA\",\"zip\":\"90210\"},\"deliveryTimeSlot\":\"morning\"}'

# Expected: {\"error\":\"We're not in your area yet\"}
# Status: 400

# Test 5: Delivery below minimum (should fail)
curl -X POST http://localhost:3000/api/orders/create \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"cart\":[{\"id\":\"1\",\"name\":\"Test\",\"price\":10,\"quantity\":1,\"variationId\":\"VAR_123\"}],\"customer\":{\"name\":\"Test\",\"email\":\"test@example.com\",\"phone\":\"4045551234\"},\"fulfillmentType\":\"delivery\",\"deliveryAddress\":{\"street\":\"123 Peachtree\",\"city\":\"Atlanta\",\"state\":\"GA\",\"zip\":\"30310\"},\"deliveryTimeSlot\":\"morning\"}'

# Expected: {\"error\":\"Minimum order for delivery is $30.00\"}
# Status: 400

# Test 6: Delivery with correct fee ($6.99 for < $75)
curl -X POST http://localhost:3000/api/orders/create \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"cart\":[{\"id\":\"1\",\"name\":\"Test\",\"price\":40,\"quantity\":1,\"variationId\":\"HMOFD754ENI27FH2PGAUJANK\"}],\"customer\":{\"name\":\"Test\",\"email\":\"test@example.com\",\"phone\":\"4045551234\"},\"fulfillmentType\":\"delivery\",\"deliveryAddress\":{\"street\":\"123 Peachtree\",\"city\":\"Atlanta\",\"state\":\"GA\",\"zip\":\"30310\"},\"deliveryTimeSlot\":\"afternoon\"}'

# Expected: deliveryFee: 6.99, total: 46.99
# Status: 200

# Test 7: Free delivery for >= $75
curl -X POST http://localhost:3000/api/orders/create \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"cart\":[{\"id\":\"1\",\"name\":\"Test\",\"price\":25,\"quantity\":3,\"variationId\":\"HMOFD754ENI27FH2PGAUJANK\"}],\"customer\":{\"name\":\"Test\",\"email\":\"test@example.com\",\"phone\":\"4045551234\"},\"fulfillmentType\":\"delivery\",\"deliveryAddress\":{\"street\":\"123 Peachtree\",\"city\":\"Atlanta\",\"state\":\"GA\",\"zip\":\"30310\"},\"deliveryTimeSlot\":\"afternoon\"}'

# Expected: deliveryFee: 0, total: 75
# Status: 200

# Test 8: Tip inclusion in total
curl -X POST http://localhost:3000/api/orders/create \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"cart\":[{\"id\":\"1\",\"name\":\"Test\",\"price\":30,\"quantity\":1,\"variationId\":\"HMOFD754ENI27FH2PGAUJANK\"}],\"customer\":{\"name\":\"Test\",\"email\":\"test@example.com\",\"phone\":\"4045551234\"},\"fulfillmentType\":\"pickup\",\"deliveryTip\":5}'

# Expected: tip: 5, total: 35 (30 + 5)
# Status: 200
```

**Validation Checklist:**
- [ ] Missing cart → 400
- [ ] Invalid email → 400
- [ ] Valid pickup order → 200 with Square payment link
- [ ] Invalid ZIP → 400 with user-friendly message
- [ ] Below minimum delivery → 400
- [ ] Delivery fee $6.99 applied for < $75
- [ ] Free delivery for >= $75
- [ ] Tip included in total

**Common Failures:**
- ❌ Delivery fee not applied → Integration bug
- ❌ Tip not in total → Calculation bug
- ❌ No Square payment link → Square API error
- ❌ Invalid variationId → Catalog not synced

---

#### 2.4 Checkout API Tests
```bash
# Test 1: Empty line items (should fail)
curl -X POST http://localhost:3000/api/checkout \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"lineItems\":[]}'

# Expected: {\"error\":\"Line items array is required\"}
# Status: 400

# Test 2: Missing catalogObjectId (should fail)
curl -X POST http://localhost:3000/api/checkout \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"lineItems\":[{\"quantity\":1}]}'

# Expected: {\"error\":\"Each line item must have catalogObjectId and quantity\"}
# Status: 400

# Test 3: Valid checkout with real catalog ID
curl -X POST http://localhost:3000/api/checkout \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"lineItems\":[{\"catalogObjectId\":\"HMOFD754ENI27FH2PGAUJANK\",\"quantity\":2}]}'

# Expected: {\"paymentLink\":\"https://square.link/u/...\",\"paymentLinkId\":\"...\",\"orderId\":\"...\"}
# Status: 200
```

**Validation Checklist:**
- [ ] Empty items → 400
- [ ] Missing catalogObjectId → 400
- [ ] Valid request → 200 with Square payment link URL

---

### Phase 3: Frontend Integration Testing (20 min)

#### 3.1 Browser Console Test
```javascript
// Open browser DevTools (F12) and run in console:

// Test 1: Check Square.js loaded
console.log('Square.js loaded:', typeof window.Square !== 'undefined');
// Expected: true

// Test 2: Check environment variables
console.log('App ID:', process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID);
console.log('Location ID:', process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID);
// Expected: Both should have values, not undefined

// Test 3: Try to initialize Square
try {
  const appId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;
  const payments = window.Square.payments(appId, locationId);
  console.log('Square payments initialized:', !!payments);
} catch (error) {
  console.error('Square init error:', error);
}
// Expected: No errors, payments object created
```

#### 3.2 Payment Form Visual Test
1. Navigate to `/order` page
2. Add items to cart (if empty)
3. Fill customer information
4. Select pickup or delivery
5. Click \"Continue to Payment\" or \"Place Order\"

**Visual Checks:**
- [ ] Payment form container renders
- [ ] Square card input appears (iframe with card number field)
- [ ] CVV and ZIP fields visible
- [ ] \"Pay Now\" button enabled
- [ ] No \"Square not configured\" error
- [ ] No \"SDK failed to load\" error

**Common Failures:**
- ❌ Blank payment area → Square.js not loaded
- ❌ \"Square not configured\" → Environment variables missing
- ❌ Infinite loading spinner → Initialization timeout

---

#### 3.3 Card Input Test
1. Click into card number field
2. Enter test card: `4111 1111 1111 1111`
3. Enter expiration: `12/25`
4. Enter CVV: `123`
5. Enter ZIP: `12345`

**Visual Checks:**
- [ ] Fields accept input
- [ ] Card number formats with spaces
- [ ] Expiration validates format
- [ ] CVV accepts 3-4 digits
- [ ] No iframe errors in console

**Common Failures:**
- ❌ Cannot type in fields → Square SDK init failed
- ❌ Fields disappear after typing → Re-rendering issue
- ❌ Console errors → CSP blocking Square domains

---

### Phase 4: Payment Processing Testing (30 min)

#### 4.1 Successful Payment Flow
```
SCENARIO 1: Pickup Order - No Delivery Fee
─────────────────────────────────────────────
Cart: 2x Product ($15 each) = $30
Tip: $3
Expected Total: $33

Steps:
1. Add 2 items to cart
2. Go to /order page
3. Fill customer info (test@example.com)
4. Select \"Pickup\"
5. Choose pickup location
6. Add $3 tip
7. Verify total shows $33
8. Fill payment form
9. Click \"Pay Now\"

Expected Results:
✓ Order created with status \"pending\"
✓ Payment processes successfully  
✓ Order status updates to \"paid\" or \"completed\"
✓ Redirect to /order/success page
✓ Success page shows order number
✓ Success page shows \"PAID\" badge
✓ Payment details displayed (card last 4 digits)
✓ Confirmation email sent

Common Failures:
❌ Payment fails with \"Card nonce not found\" → Using test nonce with production API (expected)\n❌ Order status stays \"pending\" → Status update logic broken\n❌ No redirect after payment → onPaymentSuccess not working\n❌ Success page shows no data → URL parameters missing
```

```
SCENARIO 2: Delivery Order < $75 - With Delivery Fee
──────────────────────────────────────────────────────
Cart: 1x Product ($40)
Delivery Fee: $6.99
Tip: $2
Expected Total: $48.99

Steps:
1. Add $40 product to cart
2. Go to /order page
3. Fill customer info
4. Select \"Delivery\"
5. Enter Atlanta ZIP: 30310
6. Select delivery time slot
7. Add $2 tip
8. Verify total shows $48.99 (40 + 6.99 + 2)
9. Complete payment

Expected Results:
✓ Delivery fee $6.99 shown in summary
✓ Total includes fee and tip
✓ Order creates successfully
✓ Payment processes
✓ Order marked as \"delivery\"

Common Failures:
❌ Delivery fee shows $0 → calculateDeliveryFee not called
❌ Tip not in total → Tip calculation broken
❌ Invalid ZIP not rejected → Validation disabled
```

```
SCENARIO 3: Delivery Order >= $75 - Free Delivery
────────────────────────────────────────────────────
Cart: 3x Product ($25 each) = $75
Delivery Fee: $0 (free)
Tip: $5
Expected Total: $80

Steps:
1. Add 3x $25 products ($75 total)
2. Select delivery to Atlanta (30310)
3. Add $5 tip
4. Verify total shows $80 (75 + 0 + 5)
5. Complete payment

Expected Results:
✓ Delivery fee shows $0\n✓ \"Free Delivery!\" message shown
✓ Total correct: $80

Common Failures:
❌ Still charged $6.99 → Threshold check broken (should be >= not >)
❌ Total shows $81.99 → Including fee when shouldn't
```

---

#### 4.2 Error Scenarios Testing

```
SCENARIO 4: Declined Card
─────────────────────────
Use card: 4000 0000 0000 0002 (test decline)

Expected Results:
✓ Payment fails gracefully
✓ Error message: \"Card declined\" or similar
✓ Form resets to allow retry
✓ Order status stays \"pending\"
✓ Can retry payment

Common Failures:
❌ App crashes → No error handling
❌ Form stays disabled → State not reset
❌ No error message → Error UI broken
```

```
SCENARIO 5: Network Timeout
───────────────────────────
Simulate by throttling network in DevTools

Expected Results:
✓ Shows loading state
✓ Eventually times out with error
✓ Retry option available

Common Failures:
❌ Infinite loading → No timeout
❌ No error message → Timeout not caught
```

```
SCENARIO 6: Insufficient Funds
──────────────────────────────
Use card: 4000 0000 0000 9995 (insufficient funds)

Expected Results:
✓ Specific error: \"Insufficient funds\"
✓ Helpful message to user
✓ Form allows retry

Common Failures:
❌ Generic error → Not parsing Square error codes
❌ No user guidance → Poor UX
```

---

### Phase 5: Webhook & Order Sync Testing (20 min)

#### 5.1 Webhook Endpoint Test
```bash
# Test webhook GET endpoint
curl http://localhost:3000/api/webhooks/square

# Expected: {\"status\":\"active\",\"webhookTypes\":[...],\"environment\":\"production\"}
# Status: 200

# Test payment.updated webhook
curl -X POST http://localhost:3000/api/webhooks/square \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\n    \"type\":\"payment.updated\",\n    \"event_id\":\"test-event-123\",\n    \"data\":{\n      \"object\":{\n        \"payment\":{\n          \"id\":\"test-payment-123\",\n          \"status\":\"COMPLETED\",\n          \"amount_money\":{\"amount\":2000,\"currency\":\"USD\"},\n          \"order_id\":\"test-order-123\"\n        }\n      }\n    }\n  }'

# Expected: {\"received\":true,\"eventType\":\"payment.updated\"}
# Status: 200
```

**Webhook Checklist:**
- [ ] GET endpoint returns status
- [ ] POST accepts payment.updated
- [ ] POST accepts order.updated
- [ ] Events logged to database
- [ ] Order status synced

**Common Failures:**
- ❌ 500 error → Event structure validation failing
- ❌ No database updates → Handler not processing correctly
- ❌ Signature verification fails → Missing webhook signature key

---

#### 5.2 Order Status Sync Test
```
Manual Test Flow:
1. Create order via API
2. Note the order ID
3. Process payment (or simulate webhook)
4. Check order status in database

Database Query:
mongosh taste_of_gratitude --eval \"db.orders.findOne({id: 'ORDER_ID_HERE'})\"\n\nExpected Fields:
- status: \"paid\" or \"completed\"\n- squarePaymentId: present\n- payment.status: \"COMPLETED\"\n- payment.cardDetails: present
```

---

### Phase 6: Security & Edge Cases (30 min)

#### 6.1 Input Validation Tests
```bash
# SQL Injection attempt
curl -X POST http://localhost:3000/api/orders/create \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"cart\":[{\"id\":\"\\'; DROP TABLE orders; --\",\"name\":\"Test\",\"price\":10,\"quantity\":1}],\"customer\":{\"name\":\"Test\",\"email\":\"test@example.com\",\"phone\":\"1234567890\"},\"fulfillmentType\":\"pickup\"}'

# Expected: Handled safely, no SQL execution
# Status: 200 or 400

# XSS attempt
curl -X POST http://localhost:3000/api/orders/create \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"cart\":[{\"id\":\"1\",\"name\":\"<script>alert(1)</script>\",\"price\":10,\"quantity\":1,\"variationId\":\"VAR_123\"}],\"customer\":{\"name\":\"<script>alert(2)</script>\",\"email\":\"test@example.com\",\"phone\":\"1234567890\"},\"fulfillmentType\":\"pickup\"}'

# Expected: Input sanitized or escaped
# Response should not contain <script> tags
```

**Security Checklist:**
- [ ] SQL injection prevented
- [ ] XSS attempts sanitized
- [ ] Error messages don't expose credentials
- [ ] Rate limiting active
- [ ] CORS properly configured

---

#### 6.2 Edge Case Tests
```bash
# Extremely large amount
curl -X POST http://localhost:3000/api/payments \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"sourceId\":\"test\",\"amountCents\":999999999}'

# Fractional cents
curl -X POST http://localhost:3000/api/payments \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"sourceId\":\"test\",\"amountCents\":10.5}'

# Negative quantity
curl -X POST http://localhost:3000/api/orders/create \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"cart\":[{\"id\":\"1\",\"name\":\"Test\",\"price\":10,\"quantity\":-5,\"variationId\":\"VAR_123\"}],\"customer\":{\"name\":\"Test\",\"email\":\"test@example.com\",\"phone\":\"1234567890\"},\"fulfillmentType\":\"pickup\"}'

# Long input strings\ncurl -X POST http://localhost:3000/api/orders/create \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"cart\":[{\"id\":\"1\",\"name\":\"'$(python3 -c 'print(\"A\"*10000)')'\",\"price\":10,\"quantity\":1,\"variationId\":\"VAR_123\"}],\"customer\":{\"name\":\"Test\",\"email\":\"test@example.com\",\"phone\":\"1234567890\"},\"fulfillmentType\":\"pickup\"}'
```

**Edge Case Checklist:**
- [ ] Large amounts handled
- [ ] Fractional cents rejected or rounded
- [ ] Negative quantities rejected
- [ ] Long strings rejected or truncated
- [ ] Missing fields return clear errors

---

### Phase 7: End-to-End User Journey (45 min)

#### 7.1 Complete Customer Flow
```
USER STORY: Sarah wants to buy 2 bottles of sea moss gel

Step-by-Step Test:
══════════════════

1. Homepage Visit
   - [ ] Page loads without errors
   - [ ] Products display with images
   - [ ] Prices show correctly
   - [ ] \"Add to Cart\" buttons work

2. Browse Products
   - [ ] Click on product
   - [ ] Product details page loads
   - [ ] Can change quantity
   - [ ] \"Add to Cart\" adds item
   - [ ] Cart badge updates

3. View Cart
   - [ ] Cart shows correct items
   - [ ] Quantities match selections
   - [ ] Prices accurate
   - [ ] Subtotal calculates correctly
   - [ ] Can update quantities
   - [ ] Can remove items

4. Checkout - Customer Info
   - [ ] All fields render
   - [ ] Email validation works
   - [ ] Phone validation works
   - [ ] Required field validation
   - [ ] Can proceed to next step

5. Checkout - Fulfillment
   - [ ] Can select pickup/delivery/shipping
   - [ ] Pickup: shows location selector
   - [ ] Delivery: shows address fields
   - [ ] Delivery: shows time slot selector
   - [ ] Delivery fee calculation correct
   - [ ] Can add tip
   - [ ] Total updates dynamically

6. Checkout - Review
   - [ ] Order summary accurate
   - [ ] All items listed
   - [ ] Prices match cart
   - [ ] Delivery fee correct
   - [ ] Tip included
   - [ ] Total accurate

7. Payment Form
   - [ ] Square payment form renders
   - [ ] Card input field visible
   - [ ] Can enter card details
   - [ ] Real-time validation
   - [ ] \"Pay Now\" button enabled

8. Payment Submission
   - [ ] Click \"Pay Now\"
   - [ ] Shows loading state
   - [ ] Disables form during processing
   - [ ] Tokenizes card successfully
   - [ ] Calls /api/payments
   - [ ] Payment processes
   - [ ] Success response received

9. Success Page
   - [ ] Redirects to /order/success
   - [ ] Shows order number
   - [ ] Shows \"PAID\" badge
   - [ ] Displays order details
   - [ ] Shows payment details
   - [ ] Shows confirmation message
   - [ ] Receipt URL available

10. Post-Purchase
    - [ ] Confirmation email sent
    - [ ] Order in database with \"paid\" status
    - [ ] Square payment ID linked
    - [ ] Cart cleared
```

---

#### 7.2 Error Recovery Flow
```
SCENARIO: User makes mistakes and recovers

Test Flow:
─────────

1. Enter invalid email → See error → Correct it
2. Select delivery with invalid ZIP → See error → Change to pickup
3. Try to pay with empty card → See error → Enter card
4. Payment declined → See error → Try different card
5. Network fails during payment → See timeout → Retry
6. Finally succeeds → Reaches success page

Expected Behavior at Each Error:
✓ Clear, specific error message
✓ Error highlights relevant field
✓ Can correct without starting over
✓ Form state preserved
✓ No data loss
✓ Eventually succeeds
```

---

### Phase 8: Performance & Load Testing (15 min)

#### 8.1 Response Time Tests
```bash
# Order creation
time curl -X POST http://localhost:3000/api/orders/create \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"cart\":[{\"id\":\"1\",\"name\":\"Test\",\"price\":10,\"quantity\":1,\"variationId\":\"HMOFD754ENI27FH2PGAUJANK\"}],\"customer\":{\"name\":\"Test\",\"email\":\"test@example.com\",\"phone\":\"4045551234\"},\"fulfillmentType\":\"pickup\"}'

# Expected: < 5 seconds

# Payment processing
time curl -X POST http://localhost:3000/api/payments \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"sourceId\":\"cnon:card-nonce-ok\",\"amountCents\":1000,\"orderId\":\"test-123\"}'

# Expected: < 3 seconds
```

**Performance Benchmarks:**
- Health check: < 500ms
- Order creation: < 5s
- Payment processing: < 3s
- Webhook processing: < 1s
- Success page load: < 2s

---

#### 8.2 Concurrent Requests Test
```bash
# Test 10 concurrent order creations
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/orders/create \\\n    -H \"Content-Type: application/json\" \\\n    -d '{\"cart\":[{\"id\":\"'$i'\",\"name\":\"Test\",\"price\":10,\"quantity\":1,\"variationId\":\"HMOFD754ENI27FH2PGAUJANK\"}],\"customer\":{\"name\":\"Test'$i'\",\"email\":\"test'$i'@example.com\",\"phone\":\"4045551234\"},\"fulfillmentType\":\"pickup\"}' &\ndone\nwait

# Expected: All succeed or fail gracefully, no crashes
```

---

### Phase 9: Production Verification (20 min)

#### 9.1 Production Diagnostic
```
Visit: https://gratog.vercel.app/diagnostic

Checklist:
─────────
[ ] Overall Status: GREEN \"Healthy\"
[ ] NEXT_PUBLIC_SQUARE_APPLICATION_ID: PASS
[ ] NEXT_PUBLIC_SQUARE_LOCATION_ID: PASS  
[ ] Square.js Script: PASS \"Loaded\"
[ ] Square Payments Init: PASS \"Success\"
[ ] Current Domain: matches deployment

If ANY fail:
1. Check Vercel environment variables
2. Verify variables have NEXT_PUBLIC_ prefix
3. Redeploy application
4. Check browser console for errors
5. Disable ad blockers
```

---

#### 9.2 Production Payment Test
```
⚠️ WARNING: This will create real payment/order

Test with REAL card (or Square test card if sandbox):
────────────────────────────────────────────────────

1. Visit https://gratog.vercel.app
2. Add item to cart
3. Go to checkout
4. Fill real information
5. Use test card: 4111 1111 1111 1111
6. Complete payment
7. Verify success page
8. Check Square Dashboard for payment
9. Verify order in database

Expected:
✓ Payment appears in Square Dashboard
✓ Order marked as paid
✓ Confirmation email received
✓ No errors in browser console
```

---

## 🐛 Known Issues & Fixes

### Issue 1: Square.js Not Loading
**Symptoms:** Blank payment form, \"SDK failed to load\"

**Root Causes:**
- Ad blocker blocking squarecdn.com
- CSP headers blocking external scripts  
- Slow network connection
- Script tag missing or incorrect

**Fixes:**
1. Disable ad blockers
2. Add to CSP: `script-src 'self' https://web.squarecdn.com;`
3. Change script tag from async to defer
4. Add timeout error message with retry

---

### Issue 2: Environment Variables Not Available
**Symptoms:** \"Square not configured\" error

**Root Causes:**
- Variables not set in Vercel dashboard
- Missing `NEXT_PUBLIC_` prefix
- Deployment using wrong environment
- Variables not updated after change

**Fixes:**
1. Add to Vercel: Settings → Environment Variables
2. Ensure prefix: `NEXT_PUBLIC_SQUARE_APPLICATION_ID`
3. Apply to Production, Preview, and Development
4. Redeploy application
5. Hard refresh browser (Ctrl+Shift+R)

---

### Issue 3: Payment Processing Fails
**Symptoms:** \"Card nonce not found\", 401 errors

**Root Causes:**
- Test nonce used with production API
- Invalid access token
- Token/environment mismatch
- Expired credentials

**Fixes:**
1. For production: Use REAL card or production test cards
2. Verify SQUARE_ENVIRONMENT matches token type
3. Check token in Square Developer Dashboard
4. Regenerate token if expired

---

### Issue 4: Order Status Not Updating
**Symptoms:** Order stays \"pending\" after successful payment

**Root Causes:**
- Status update code not called
- Webhook not configured in Square Dashboard
- Database update failing
- Wrong order ID referenced

**Fixes:**
1. Check /api/payments route updates order status
2. Configure webhook in Square Dashboard
3. Check database logs for errors
4. Verify order ID passed correctly

---

### Issue 5: Delivery Fee Not Applied
**Symptoms:** All orders show $0 delivery fee

**Root Causes:**
- calculateDeliveryFee() not imported
- Function not called
- Environment variables missing
- Threshold check broken

**Fixes:**
1. Import: `import { calculateDeliveryFee } from '@/lib/delivery-fees'`
2. Call in order creation: `const fee = calculateDeliveryFee(subtotal)`
3. Add to order data: `deliveryFee: fee`
4. Verify DELIVERY_BASE_FEE and DELIVERY_FREE_THRESHOLD in .env

---

### Issue 6: Tip Not In Total
**Symptoms:** Total doesn't include tip amount

**Root Causes:**
- Tip extracted but not added to total
- Variable name mismatch
- Calculation order wrong

**Fixes:**
1. Extract tip: `const tip = orderData.deliveryTip || 0`
2. Include in calculation: `const total = subtotal + deliveryFee + tip - couponDiscount`
3. Add to pricing object: `tip: tip`

---

## 📊 Test Results Template

```markdown
# Square Payment Integration Test Results
Date: [DATE]
Tester: [NAME]
Environment: [Production/Preview/Local]

## Phase 1: Environment Configuration
- [ ] All required env vars present
- [ ] Token format correct
- [ ] Environment matches token
- [ ] No placeholder values

Issues Found:
- [List issues]

## Phase 2: API Endpoints
- [ ] /api/payments validation working
- [ ] /api/checkout creating payment links
- [ ] /api/orders/create handling all scenarios
- [ ] /api/webhooks/square processing events

Issues Found:
- [List issues]

## Phase 3: Frontend Integration
- [ ] Square.js loads successfully
- [ ] Payment form renders
- [ ] Card input accepts data
- [ ] Tokenization works

Issues Found:
- [List issues]

## Phase 4: Payment Processing
- [ ] Successful payment flow complete
- [ ] Delivery fees calculated correctly
- [ ] Tips included in totals
- [ ] Order status updates

Issues Found:
- [List issues]

## Phase 5: Error Handling
- [ ] Declined cards handled
- [ ] Network errors caught
- [ ] User-friendly error messages
- [ ] Retry functionality works

Issues Found:
- [List issues]

## Phase 6: Security
- [ ] SQL injection prevented
- [ ] XSS attacks blocked
- [ ] Input validation working
- [ ] No sensitive data exposed

Issues Found:
- [List issues]

## Overall Assessment
- Total Tests: [X]
- Passed: [X]
- Failed: [X]
- Critical Issues: [X]

Recommendation: [PASS/FAIL - ready for production?]
```

---

## 🚀 Quick Start

### Run All Tests
```bash
# 1. Run automated unit tests
cd /app
yarn test tests/square/

# 2. Run diagnostic script  
bash scripts/diagnose-square-production.sh

# 3. Run full integration test
bash scripts/test-square-integration.sh

# 4. Check production diagnostic
open https://gratog.vercel.app/diagnostic

# 5. Manual end-to-end test
# Follow Phase 7 instructions above
```

### Priority Order
1. **CRITICAL**: Environment variables (Phase 1)
2. **CRITICAL**: API endpoints (Phase 2)
3. **HIGH**: Frontend integration (Phase 3)
4. **HIGH**: Payment processing (Phase 4)
5. **MEDIUM**: Webhooks (Phase 5)
6. **MEDIUM**: Security (Phase 6)
7. **HIGH**: End-to-end flow (Phase 7)

---

## 📞 Support

If issues persist after following this protocol:

1. Check application logs: `tail -f /var/log/supervisor/nextjs.out.log`
2. Check Square Dashboard: Logs → API Logs
3. Review webhook events: Square Dashboard → Webhooks
4. Test in Square Sandbox first
5. Contact Square Support with specific error codes

---

## ✅ Sign-Off Checklist

Before marking payment integration as complete:

- [ ] All automated tests pass
- [ ] All diagnostic checks GREEN
- [ ] Manual end-to-end flow succeeds
- [ ] Error scenarios handled gracefully
- [ ] Security tests pass
- [ ] Production deployment verified
- [ ] Webhooks configured and tested
- [ ] Documentation complete
- [ ] Monitoring in place
- [ ] Team trained on troubleshooting

**Signed off by:** ________________  
**Date:** ________________  
**Production ready:** [ ] YES [ ] NO
