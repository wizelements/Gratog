# Full Payment Testing Plan - December 20, 2025

## Test Objectives

1. **Customer Payment Flow** - End-to-end from cart to payment completion
2. **Order Status Tracking** - Database updates and Square synchronization
3. **Admin Notifications** - Order notifications to staff
4. **Customer Notifications** - Confirmation emails and SMS
5. **Square Dashboard** - Payment visibility in Square account
6. **Error Scenarios** - Declined cards, invalid tokens, timeouts

---

## Environment Setup

### Square Configuration ✅
- **Environment:** Production account
- **Access Token:** Configured
- **Application ID:** sq0idp-V1fV-MwsU5lET4rvzHKnIw
- **Location ID:** L66TVG6867BG9
- **Webhook Signature:** Configured

### Server Status
- **Dev Server:** Starting on localhost:3000
- **Database:** MongoDB connection required
- **Email Service:** Resend configured
- **SMS Service:** Twilio configured

---

## Test Flow Sequence

### Phase 1: Customer Creates Order (MANUAL)
1. Navigate to http://localhost:3000
2. Browse products and add to cart
3. Proceed to checkout
4. Enter guest information or login
5. Select fulfillment method (pickup/delivery)
6. Note the order ID

### Phase 2: Payment Processing (AUTOMATED)
1. Process payment via API with test card
2. Verify payment success
3. Check payment status in database
4. Verify order status updates to "paid"

### Phase 3: Admin Notifications
1. Check if admin received order notification
2. Verify notification contains order details
3. Check admin dashboard for new orders

### Phase 4: Customer Notifications
1. Check customer inbox for confirmation email
2. Verify SMS delivery (if enabled)
3. Check order history in customer account

### Phase 5: Square Dashboard Verification
1. Login to Square Dashboard
2. Navigate to Payments section
3. Verify payment appears with correct amount
4. Check transaction details and receipt

### Phase 6: Error Scenarios
1. Declined card test
2. Invalid token test
3. Network timeout test

---

## Test Cards Available

**From Square Sandbox:**
- `4111 1111 1111 1111` - Valid payment (requires zip: 12345)
- `4000 0200 0000 0000` - Card declined
- `4000 0300 0000 0000` - Insufficient funds
- `4000 0400 0000 0000` - Lost card
- Exp Date: Any future date (e.g., 12/25)
- CVV: Any 3 digits (e.g., 123)

---

## API Testing Details

### Endpoint: POST /api/payments

**Test Case 1: Valid Payment**
```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -d '{
    "sourceId": "cnp:card-nonce-ok",
    "amountCents": 5000,
    "currency": "USD",
    "idempotencyKey": "test-'$(date +%s)'",
    "customer": {
      "email": "test-'$(date +%s)'@example.com",
      "name": "Test Customer",
      "phone": "+14155552671"
    },
    "orderId": "order-test-'$(date +%s)'"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "payment": {
    "id": "cnp_...",
    "status": "COMPLETED",
    "amountPaid": "50.00",
    "currency": "USD",
    "receiptUrl": "https://...",
    "cardLast4": "1111",
    "cardBrand": "VISA"
  },
  "orderId": "order-test-..."
}
```

**Test Case 2: Declined Card (Error Scenario)**
```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -d '{
    "sourceId": "cnp:card-nonce-declined",
    "amountCents": 5000,
    "currency": "USD",
    "idempotencyKey": "declined-'$(date +%s)'"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Payment declined - please try a different payment method",
  "traceId": "..."
}
```

---

## Database Verification

### Check Payment Record
```javascript
db.payments.findOne({ 
  orderId: "order-test-..." 
})
// Should show:
// - squarePaymentId: set
// - status: "COMPLETED"
// - amountMoney: { amount: 5000, currency: "USD" }
// - cardDetails: { brand: "VISA", last4: "1111", ... }
```

### Check Order Status
```javascript
db.orders.findOne({ 
  id: "order-test-..." 
})
// Should show:
// - status: "paid"
// - paymentStatus: "COMPLETED"
// - squarePaymentId: set
// - timeline: [{ status: "paid", ... }]
// - paidAt: timestamp
```

---

## Notification Verification

### Customer Email Notification
- **Expected:** Order confirmation email from Gratog
- **Contains:** Order number, items, total, delivery/pickup details
- **Sent to:** Customer email address

### Admin/Staff Notification
- **Expected:** Order ready for fulfillment notification
- **Contains:** Order details, items, pickup/delivery location
- **Sent to:** Staff email/phone

---

## Square Dashboard Verification

1. Navigate to https://connect.squareup.com (Production)
2. Go to **Transactions** → **Payments**
3. Verify payment appears with:
   - Correct amount ($50.00)
   - Correct timestamp
   - VISA ending in 1111
   - Status: COMPLETED
4. Click on payment to see receipt

---

## Test Execution Plan

### Test Run 1: Single Valid Payment
```bash
# Start server
npm run dev

# In another terminal, run payment test
./test-payment-single.sh
```

### Test Run 2: Multiple Payments
```bash
# Test concurrent payments to verify idempotency
./test-payment-batch.sh
```

### Test Run 3: Error Scenarios
```bash
# Test declined card, invalid token, missing fields
./test-payment-errors.sh
```

### Test Run 4: Full E2E Flow
```bash
# Browser-based test: add to cart → checkout → pay → confirm
npx playwright test e2e/payment-flows.spec.ts --headed
```

---

## Expected Test Results

### ✅ Payment Processing
- [ ] Valid payment processes successfully
- [ ] Invalid token returns 400 (not 500)
- [ ] Declined card returns 400
- [ ] Missing amount returns 400
- [ ] Response includes payment ID and status

### ✅ Database Updates
- [ ] Payment record created
- [ ] Order status updates to "paid"
- [ ] Timeline events logged
- [ ] Card details stored (brand, last4)

### ✅ Notifications
- [ ] Customer receives confirmation email
- [ ] Customer receives SMS (if enabled)
- [ ] Admin receives order notification
- [ ] Staff receives fulfillment notification

### ✅ Square Dashboard
- [ ] Payment visible in Square Dashboard
- [ ] Amount correct
- [ ] Timestamp correct
- [ ] Card details visible
- [ ] Receipt URL working

### ✅ Error Handling
- [ ] Proper error messages (no tech jargon)
- [ ] Trace IDs for debugging
- [ ] Status codes correct (400 for client errors)
- [ ] No secrets leaked in responses

---

## Monitoring During Test

### Server Logs
```bash
# Watch for payment processing logs
tail -f .next/logs/payment.log
# Or in dev server output
npm run dev
```

### Database Logs
```bash
# Monitor MongoDB for inserts/updates
# Check payment and order collections
```

### Email Logs
```bash
# Check Resend for sent emails
# Verify delivery status
```

---

## Rollback Plan

If issues are found:
1. Check environment variables
2. Verify Square credentials are current
3. Review error logs for details
4. Check database connectivity
5. Test with different payment method

---

## Sign-Off Checklist

- [ ] All API endpoints returning correct status codes
- [ ] Payments processing successfully in Square
- [ ] Order status updating in database
- [ ] Customer notifications being sent
- [ ] Admin notifications being sent
- [ ] Square Dashboard shows payments
- [ ] Error scenarios handled gracefully
- [ ] No sensitive data leaked
- [ ] Performance is acceptable
- [ ] Logging is working

---

## Test Status

**Created:** December 20, 2025  
**Status:** READY FOR EXECUTION  
**Estimated Duration:** 2 hours (manual + automated)

