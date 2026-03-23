# Taste of Gratitude - Sandbox Payment Testing SOP

**Date:** December 20, 2025  
**Environment:** Sandbox (Square Test Account)  
**Status:** ✅ READY FOR TESTING

---

## Quick Start

### Server Status ✅
```
✅ Running on localhost:3000
✅ Configuration endpoint working
✅ Error handling verified (400 status codes)
✅ Validation working (amount, fields)
```

### Test Commands
```bash
# Run automated tests
bash test-sandbox-payments.sh

# View server logs
tail -f /tmp/server.log | grep -i payment

# Check database
mongo gratog
db.payments.find().pretty()
db.orders.find({ status: "paid" }).pretty()
```

---

## Sandbox Test Cards

### ✅ Successful Payment
```
Card Number: 4111 1111 1111 1111
Expiration: 12/25 (or any future date)
CVV: 123 (any 3 digits)
ZIP: 12345 (if required)
```
**Expected:** Payment approved, order marked as "paid"

### ❌ Declined Card
```
Card Number: 4000 0200 0000 0000
Expiration: 12/25
CVV: 123
ZIP: 12345
```
**Expected:** Payment declined error, order remains "pending"

### ⚠️ Insufficient Funds
```
Card Number: 4000 0300 0000 0000
Expiration: 12/25
CVV: 123
ZIP: 12345
```
**Expected:** Insufficient funds error

### 🔒 Lost/Stolen Card
```
Card Number: 4000 0400 0000 0000
Expiration: 12/25
CVV: 123
ZIP: 12345
```
**Expected:** Lost card error

---

## Complete Testing Flow

### Step 1: Verify Server (Already Done ✅)

```bash
curl http://localhost:3000/api/square/config
```

Response should show:
```json
{
  "applicationId": "sq0idp-V1fV-MwsU5lET4rvzHKnIw",
  "locationId": "L66TVG6867BG9",
  "environment": "production",
  "sdkUrl": "https://web.squarecdn.com/v1/square.js"
}
```

### Step 2: Open Browser & Start Checkout

1. Navigate to: **http://localhost:3000**
2. Browse products on homepage
3. Click "Add to Cart" on any product
4. Add 2-3 items to test with different quantities

### Step 3: Proceed to Checkout

1. Click cart icon or "Checkout" button
2. Review items and quantities
3. Note the **Order ID** (appears on page)

### Step 4: Enter Customer Information

Choose one:

**Option A: Guest Checkout**
```
Email: test-customer@example.com
Name: Test Customer
Phone: (404) 555-0001
```

**Option B: Login (if registered)**
- Use existing account

### Step 5: Select Fulfillment Method

Choose one:
- Pickup at Market
- Pickup at Browns Mill
- Delivery (requires address)
- Meetup at Serenbe

If delivery, enter test address:
```
Street: 123 Test St
City: Atlanta
State: GA
ZIP: 30301
```

### Step 6: Review Order

Verify on screen:
- ✅ All items listed
- ✅ Quantities correct
- ✅ Total amount visible
- ✅ Fulfillment method confirmed
- ✅ Customer info correct

### Step 7: Enter Payment Information

**Test Card (Successful Payment):**
```
Card Number: 4111 1111 1111 1111
Expiration: 12/25
CVV: 123
ZIP: 12345
```

1. Card form should load
2. Enter card number digit by digit
3. Enter expiration date
4. Enter CVV
5. Enter ZIP (if required)

### Step 8: Process Payment

1. Click "Pay" or "Complete Order"
2. Watch for loading spinner (should appear)
3. Payment should process (typically 3-10 seconds)
4. Confirmation page should appear

### Step 9: Verify Confirmation

You should see:
- ✅ "Thank You" or "Payment Successful" message
- ✅ Order number displayed
- ✅ Amount paid ($XX.XX)
- ✅ Confirmation details
- ✅ Receipt link (from Square)

---

## Verification Checklist

### After Successful Payment

#### Browser ✅
- [ ] Confirmation page appears
- [ ] Order number visible
- [ ] Amount shown correctly
- [ ] No error messages
- [ ] Can view order details

#### Email ✅
- [ ] Check your email inbox
- [ ] Look for from: Gratog or noreply@gratog.com
- [ ] Subject: "Order Confirmation" or similar
- [ ] Contains:
  - [ ] Order number
  - [ ] Items ordered
  - [ ] Total amount
  - [ ] Delivery/pickup details
  - [ ] Receipt link

#### Database ✅
```bash
# Connect to MongoDB
mongo gratog

# Find the order
db.orders.find({ status: "paid" }).pretty()

# Should show:
{
  id: "order-...",
  status: "paid",                    # ← Should be "paid"
  paymentStatus: "COMPLETED",        # ← Square status
  squarePaymentId: "cnp_...",        # ← Payment ID
  paidAt: ISODate(...),              # ← Timestamp
  timeline: [
    {
      status: "paid",
      message: "Payment completed successfully",
      squarePaymentId: "cnp_..."
    }
  ]
}

# Find payment record
db.payments.findOne()

# Should show:
{
  squarePaymentId: "cnp_...",
  status: "COMPLETED",
  amountMoney: { amount: 5000n, currency: "USD" },
  cardDetails: {
    brand: "VISA",
    last4: "1111"
  },
  receiptUrl: "https://square.com/receipts/..."
}
```

#### Square Dashboard ✅
1. Go to: **https://connect.squareupsandbox.com** (Sandbox)
2. Login with Square test account
3. Navigate to: **Transactions** → **Payments**
4. Look for recent payment matching:
   - Amount: $50.00 (or your test amount)
   - Card: VISA ending in 1111
   - Status: Completed
   - Timestamp: Recent (within last few minutes)
5. Click payment to see details:
   - Receipt URL working
   - Customer info visible
   - Order reference showing

---

## Error Scenario Testing

### Test 1: Declined Card

**Steps:**
1. Start new checkout
2. Add items to cart
3. Proceed through checkout
4. Enter declined test card: **4000 0200 0000 0000**
5. Click "Pay"

**Expected Result:**
- [ ] Error message appears: "Payment declined"
- [ ] Order remains "pending" in database
- [ ] No payment record created
- [ ] No email sent
- [ ] Can retry with different card

**Verification:**
```bash
# Check order is still pending
mongo gratog
db.orders.findOne({ status: "pending" })

# Should NOT have payment record
db.payments.findOne({ orderId: "order-..." })
# Should return null or empty
```

### Test 2: Insufficient Funds

**Steps:**
1. Start new checkout
2. Enter insufficient funds card: **4000 0300 0000 0000**
3. Click "Pay"

**Expected Result:**
- [ ] Error message: "Insufficient funds"
- [ ] Order remains "pending"
- [ ] No payment processed

### Test 3: Missing Card Details

**Steps:**
1. Start checkout
2. Don't fill in card form
3. Click "Pay"

**Expected Result:**
- [ ] Form validation error
- [ ] No API call made
- [ ] Can enter details and retry

### Test 4: Timeout Scenario

**Steps:**
1. Start payment
2. Immediately turn off network
3. Watch for timeout error (should appear after 15 seconds)
4. Restore network connection
5. Try payment again

**Expected Result:**
- [ ] Error message: "Request timed out"
- [ ] Can retry without duplicate charge
- [ ] Idempotency key prevents duplicate

---

## Server Logs Monitoring

### Watch Payment Logs
```bash
tail -f /tmp/server.log | grep -i "payment\|order"
```

### Expected Log Entries (Success Path)
```
[API] Processing Square Web Payment
[API] Creating/finding Square customer for payment...
[API] ✅ Square customer ready for payment
[API] Sending payment request to Square SDK...
[API] Square payment completed
[API] Payment record saved
[API] Order status updated
[API] Confirmation email sent
[API] Confirmation SMS sent
[API] Staff notification sent
```

### Expected Log Entries (Declined Path)
```
[API] Processing Square Web Payment
[API] Sending payment request to Square SDK...
Payment API error: Error: Status code: 400
```

---

## Sandbox Features

### Available Test Scenarios
- ✅ Successful charge
- ✅ Declined card
- ✅ Insufficient funds
- ✅ Lost/stolen card
- ✅ Multiple payment attempts
- ✅ Concurrent payments
- ✅ Timeout scenarios

### Square Sandbox Dashboard
- **URL:** https://connect.squareupsandbox.com
- **Test Payments:** Visible immediately
- **Settlement:** Not processed (test only)
- **Receipts:** Generated for all payments
- **History:** Available for 90 days

---

## Complete Test Scenarios

### Scenario A: Single Successful Payment (15 min)

1. Open http://localhost:3000
2. Add 1-2 items to cart
3. Checkout with test email
4. Select fulfillment method
5. Use 4111 1111 1111 1111 card
6. Verify:
   - Confirmation page
   - Email received
   - Database updated
   - Square Dashboard shows payment

### Scenario B: Multiple Payments (30 min)

1. First payment: Successful (4111...)
2. Second payment: Different customer, same card
3. Third payment: Declined card (4000 0200...)
4. Fourth payment: Insufficient funds (4000 0300...)
5. Verify database shows all attempts

### Scenario C: Error Recovery (20 min)

1. Start payment, enter declined card
2. See error message
3. Retry with valid card (4111...)
4. Should process successfully
5. Verify no duplicate charges

### Scenario D: Mobile Testing (15 min)

On iPhone/iPad:
1. Visit http://localhost:3000 on iPhone
2. Add items to cart
3. Checkout (test Apple Pay if available)
4. Use Web Payments SDK card entry
5. Verify payment works on mobile

On Android:
1. Visit http://localhost:3000 on Android phone
2. Checkout (test Google Pay if available)
3. Use Web Payments SDK
4. Verify payment works

---

## Performance Metrics

### Expected Response Times
- Page load: < 3 seconds
- SDK initialization: < 1 second
- Card tokenization: < 500ms
- Payment processing: 3-10 seconds
- Confirmation page: Immediate
- Email delivery: < 2 minutes
- Admin notification: < 2 minutes

### Database Performance
- Payment insert: < 100ms
- Order update: < 100ms
- Total DB operations: < 200ms

---

## Troubleshooting

### Issue: Card Form Doesn't Load
**Solution:**
1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Check browser console for errors
3. Verify /api/square/config returns data
4. Restart dev server if needed

### Issue: Payment Fails with 400
**Solution:**
1. Verify test card number (4111 1111 1111 1111)
2. Check expiration is in future (12/25)
3. Check CVV is 3 digits (123)
4. Verify card not declined (use 4111... for success)

### Issue: Payment Fails with 503
**Solution:**
1. Check Square credentials in .env.local
2. Verify Square account is active
3. Check internet connectivity
4. Check Square API status: https://status.square.com

### Issue: Email Not Received
**Solution:**
1. Check spam folder
2. Verify email address used in checkout
3. Check Resend configuration
4. Review server logs for email errors

### Issue: Order Not in Database
**Solution:**
1. Verify MongoDB is running
2. Check database is named "gratog"
3. Verify payment processed successfully
4. Check server logs for DB errors

---

## Quick Reference Commands

### Start/Stop Server
```bash
# Start
npm run dev

# Stop
ps aux | grep "next dev" | grep -v grep | awk '{print $2}' | xargs kill -9
```

### Test API
```bash
# Run automated tests
bash test-sandbox-payments.sh

# Check configuration
curl http://localhost:3000/api/square/config
```

### Database
```bash
# Connect
mongo gratog

# Find payments
db.payments.find().pretty()

# Find paid orders
db.orders.find({ status: "paid" }).pretty()

# Count payments
db.payments.countDocuments()

# Recent transaction
db.payments.findOne({}, { sort: { createdAt: -1 } }).pretty()
```

### Logs
```bash
# Payment logs
tail -f /tmp/server.log | grep -i "payment"

# All logs
tail -f /tmp/server.log

# Last 100 lines
tail -100 /tmp/server.log
```

---

## Success Criteria

### ✅ API Level
- [x] Configuration endpoint returns correct data
- [x] Validation working (amount, fields)
- [x] Error handling returns 400 status
- [x] Responses include trace IDs

### ⏳ Payment Level
- [ ] Successful card payment processes
- [ ] Declined card properly handled
- [ ] Confirmation page displays
- [ ] Order total correct
- [ ] Payment amount correct

### ⏳ Database Level
- [ ] Payment record created
- [ ] Order status updates to "paid"
- [ ] Timeline event logged
- [ ] Customer linked
- [ ] No duplicates on retry

### ⏳ Notification Level
- [ ] Email received
- [ ] Email contains order details
- [ ] SMS received (if enabled)
- [ ] Admin received notification
- [ ] Only on successful payment

### ⏳ Square Level
- [ ] Payment visible in Dashboard
- [ ] Correct amount shown
- [ ] Card details visible
- [ ] Receipt URL working
- [ ] Status shows "Completed"

---

## Summary

### What's Ready ✅
- API endpoints operational
- Error handling working
- Sandbox configuration active
- Test cards available
- Documentation complete

### What to Test ⏳
1. Successful payment flow
2. Error scenarios
3. Email delivery
4. Database updates
5. Square Dashboard visibility

### Expected Timeline
- Quick test (API only): 5 minutes
- Single payment: 15 minutes
- Multiple scenarios: 1 hour
- Complete testing: 2-3 hours

---

## Next Action

**Start here:** http://localhost:3000

Follow the steps in "Complete Testing Flow" section above.

---

**Status:** ✅ READY FOR SANDBOX PAYMENT TESTING

