# Manual Payment Testing Steps

## Quick Start

**Server Status:** ✅ Running on localhost:3000

### Step 1: Navigate to Checkout

Open your browser and go to:
```
http://localhost:3000
```

### Step 2: Add Items to Cart

1. Browse products on the homepage
2. Click "Add to Cart" or "Quick Add" on any product
3. Add multiple items if desired
4. Cart should update in header

### Step 3: Proceed to Checkout

1. Click cart icon or "Go to Checkout" button
2. Review items and quantities
3. Proceed to checkout flow

### Step 4: Enter Customer Information

Choose one of:

**Option A: Guest Checkout**
```
Email: test-customer@example.com
Name: John Doe
Phone: (404) 555-0001
```

**Option B: Login (if registered)**
1. Click "Login" or sign up
2. Use existing account credentials

### Step 5: Select Fulfillment Method

Choose one:
- Pickup at Market
- Pickup at Browns Mill
- Delivery
- Meetup at Serenbe

If delivery selected, enter address:
```
Street: 123 Test Street
City: Atlanta
State: GA
ZIP: 30301
```

### Step 6: Review Order

Verify:
- All items listed
- Quantities correct
- Total amount visible
- Fulfillment method confirmed

**Note order ID from page (for later verification)**

### Step 7: Process Payment

1. Payment form should load with card input field
2. Enter test card details:

**Successful Payment:**
```
Card Number: 4111 1111 1111 1111
Expiration: 12/25
CVV: 123
ZIP: 12345 (if required)
```

3. Click "Pay" or "Complete Order"
4. Watch for loading spinner
5. Should see confirmation page

---

## Test Cards for Different Scenarios

### ✅ Successful Payment
- **Card:** 4111 1111 1111 1111
- **Status:** Approved
- **Expected:** Payment succeeds, order marked as paid

### ❌ Declined Card
- **Card:** 4000 0200 0000 0000
- **Status:** Declined
- **Expected:** Error message, order remains pending

### ⚠️ Insufficient Funds
- **Card:** 4000 0300 0000 0000
- **Status:** Insufficient funds
- **Expected:** Error message, try different card

### 🔍 Lost/Stolen Card
- **Card:** 4000 0400 0000 0000
- **Status:** Reported lost/stolen
- **Expected:** Error message

---

## Verification Steps After Payment

### 1. Check Browser Confirmation

You should see:
- ✅ "Payment Successful" or "Thank You" message
- Order number
- Amount paid
- Confirmation details
- Receipt link (from Square)

### 2. Check Your Email

Look for:
- **From:** Gratog or noreply@gratog.com
- **Subject:** Order Confirmation or Thank You
- **Contains:**
  - Order number
  - Items ordered
  - Total amount paid
  - Delivery/pickup details
  - Estimated delivery time

**Test Email:** Check your test email inbox

### 3. Check Square Dashboard

1. Go to: https://connect.squareup.com
2. Login to your Square account
3. Navigate to: **Transactions** → **Payments**
4. Look for recent payment matching:
   - Amount (should match order total)
   - Card: VISA ending in 1111
   - Status: Completed
   - Recent timestamp

### 4. Verify in Database (Developer)

```bash
# Connect to MongoDB
mongo gratog

# Check order status
db.orders.findOne({ status: "paid" }, { sort: { createdAt: -1 } })

# Should show:
{
  id: "order-123",
  status: "paid",                    # ← Should be "paid"
  paymentStatus: "COMPLETED",        # ← Should show Square status
  squarePaymentId: "cnp_...",        # ← Should have payment ID
  paidAt: ISODate(...),              # ← Should have timestamp
  timeline: [
    {
      status: "paid",
      message: "Payment completed successfully",
      squarePaymentId: "cnp_..."
    }
  ]
}

# Check payment record
db.payments.findOne({}, { sort: { createdAt: -1 } })

# Should show:
{
  squarePaymentId: "cnp_...",
  status: "COMPLETED",
  amountMoney: { amount: 5000n, currency: "USD" },
  cardDetails: {
    brand: "VISA",
    last4: "1111"
  },
  receiptUrl: "https://square.com/receipts/...",
  orderId: "order-123"
}
```

### 5. Check Server Logs

```bash
# Terminal where server is running
# Look for log entries like:

2025-12-20 23:30:45 [API] Processing Square Web Payment
2025-12-20 23:30:46 [API] Square payment completed
2025-12-20 23:30:46 [API] Payment record saved
2025-12-20 23:30:46 [API] Order status updated
2025-12-20 23:30:47 [API] Confirmation email sent
```

---

## Error Scenarios Testing

### Scenario 1: Declined Card

1. Enter declined card (4000 0200 0000 0000)
2. Click Pay
3. **Expected:** Error message shows
4. **Verify:**
   - Order still pending in database
   - No payment record created
   - No email sent
   - User can retry with different card

### Scenario 2: Missing Card Details

1. Click Pay without filling card form
2. **Expected:** Form validation error
3. **Verify:**
   - Error message displayed
   - No API call made

### Scenario 3: Network Timeout

1. Click Pay
2. Immediately close browser DevTools Network tab (to simulate slow connection)
3. **Expected:** Timeout error after 15 seconds
4. **Verify:**
   - Error message: "Payment timed out"
   - Can retry without duplicate charge

### Scenario 4: Invalid Amount

1. Modify form data in DevTools to send 0 or negative amount
2. Click Pay
3. **Expected:** 400 error response
4. **Verify:**
   - Error message: "Valid amount required"
   - Order not updated

---

## Performance Checklist

### Page Load Performance

- [ ] Checkout page loads in < 3 seconds
- [ ] Card form loads in < 2 seconds
- [ ] No console errors
- [ ] All images load
- [ ] Mobile responsive

### Payment Processing Performance

- [ ] Click "Pay" → loading shows immediately
- [ ] Payment processes within 10 seconds
- [ ] Response includes payment details
- [ ] Page responds to user input

### Database Performance

- [ ] Order record created quickly
- [ ] Payment record saved within 100ms
- [ ] Timeline updated

---

## Mobile Testing

### iOS Safari

1. Visit http://localhost:3000 on iPhone
2. Add items to cart
3. Go to checkout
4. Test card entry (might use native keyboard)
5. Test Apple Pay (if available):
   - Should show Apple Pay button
   - Click and complete with Face ID/Touch ID

### Android Chrome

1. Visit http://localhost:3000 on Android phone
2. Add items to cart
3. Go to checkout
4. Test card entry
5. Test Google Pay (if available):
   - Should show Google Pay button
   - Select saved card or enter new

---

## Admin/Staff Notification Testing

### Check Order Notifications

After successful payment, verify staff receives notification:

1. **Email Notification:**
   - Subject: "New Order" or "Ready for Fulfillment"
   - Contains order details and pickup/delivery location
   - Contains list of items

2. **Dashboard Notification:**
   - New order appears in admin dashboard
   - Shows as "needs fulfillment"
   - Contains all order details

---

## Complete Verification Checklist

### ✅ Before Payment
- [ ] Server running (localhost:3000)
- [ ] Checkout page loads
- [ ] Products visible
- [ ] Cart functional
- [ ] Checkout flow works

### ✅ During Payment
- [ ] Card form loads
- [ ] Square SDK initialized
- [ ] Card field accepts input
- [ ] Pay button clickable
- [ ] Processing spinner shows

### ✅ After Payment (Success)
- [ ] Confirmation page displays
- [ ] Order number visible
- [ ] Amount shown
- [ ] Email received
- [ ] Database updated (order status = "paid")
- [ ] Payment record created
- [ ] Square Dashboard shows payment

### ✅ Error Handling
- [ ] Declined card shows error
- [ ] Error doesn't crash app
- [ ] Can retry payment
- [ ] Order not marked as paid
- [ ] No duplicate charges on retry

### ✅ Security
- [ ] No card details in logs
- [ ] No tokens exposed in URL
- [ ] HTTPS enforced (if production)
- [ ] Sensitive data masked in DB

---

## Troubleshooting Common Issues

### Issue: Card form doesn't load

**Solutions:**
1. Hard refresh page (Ctrl+Shift+R or Cmd+Shift+R)
2. Check browser console for errors
3. Verify localhost:3000 is accessible
4. Check if /api/square/config returns data:
   ```bash
   curl http://localhost:3000/api/square/config
   ```
5. Restart dev server if needed

### Issue: Payment fails with 400 error

**Check:**
- Card number is valid (4111 1111 1111 1111)
- Expiration is in future (12/25)
- CVV is 3 digits (123)
- Card not declined (use 4111... for success)
- Amount > 0

### Issue: Payment fails with 503 error

**Check:**
- Square credentials configured in .env.local
- Square account active
- Internet connectivity
- Square API status: https://status.square.com

### Issue: Email not received

**Check:**
- Resend configured in .env.local
- Email service active
- Check spam folder
- Server logs for email errors:
  ```bash
  tail -f /tmp/server.log | grep -i "email\|mail"
  ```

### Issue: Order not in database

**Check:**
- MongoDB connection working
- Database name correct (gratog)
- Check server logs for DB errors

---

## Next Steps

1. **First Test:** Try successful payment
2. **Error Test:** Try declined card
3. **Verification:** Check all three sources (browser, email, database)
4. **Square:** Verify in Square Dashboard
5. **Admin:** Check staff notifications
6. **Performance:** Monitor response times

---

## Support

If payment processing fails:
1. Check server logs: `tail -f /tmp/server.log`
2. Check browser console (F12 → Console tab)
3. Check Square Dashboard for payment details
4. Verify .env.local has Square credentials

