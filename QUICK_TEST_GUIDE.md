# 🚀 QUICK TEST GUIDE
## Payment Timeout Fixes - Live at https://tasteofgratitude.shop

---

## 5-MINUTE SMOKE TEST

### Test 1: URL Loads
```
Browser: https://tasteofgratitude.shop
Expected: Page loads, no errors
Check: DevTools Console (F12) - should be clean
```

### Test 2: Add to Cart & Checkout
```
1. Click any product (e.g., "Memory Match" game)
2. Click "Add to Cart"
3. Click "Checkout"
4. Expected: Payment form loads
```

### Test 3: Successful Payment (Sandbox)
```
Card: 4532 0155 0016 4662
Exp: 12/26
CVV: 123

Steps:
1. Enter card in payment form
2. Click "Pay"
3. Expected: Success within 2-3 seconds
4. Check DevTools > Network > POST /api/payments
5. Response should include "traceId": "trace_..."
```

### Test 4: Declined Card (Error Handling)
```
Card: 4000002500001001
Exp: 12/26
CVV: 123

Steps:
1. Enter declined card
2. Click "Pay"
3. Expected: Error message within 5 seconds
4. Should NOT hang or timeout
```

### Test 5: Confirm Order Email
```
1. After successful payment, check inbox
2. Should receive confirmation email immediately
3. Email should show order details
```

---

## VERIFICATION CHECKLIST

| Step | Check | Result |
|------|-------|--------|
| 1 | Site loads | ⏳ |
| 2 | No console errors | ⏳ |
| 3 | Checkout page loads | ⏳ |
| 4 | Payment form displays | ⏳ |
| 5 | Sandbox payment succeeds | ⏳ |
| 6 | Trace ID in response | ⏳ |
| 7 | Confirmation email sent | ⏳ |
| 8 | Declined card error appears | ⏳ |
| 9 | No timeout errors | ⏳ |
| 10 | Order in database | ⏳ |

---

## TRACE ID LOCATION

**In DevTools Network Tab:**
1. Open DevTools (F12)
2. Go to "Network" tab
3. Perform a test payment
4. Look for POST request to `/api/payments`
5. Click on it
6. Go to "Response" tab
7. Should see: `"traceId": "trace_abc123..."`

**Example Response:**
```json
{
  "success": true,
  "traceId": "trace_a1b2c3d4",
  "payment": {
    "id": "sq_payment_id",
    "status": "COMPLETED",
    "amountPaid": "$29.99",
    "receiptUrl": "https://..."
  }
}
```

---

## WEBHOOK VERIFICATION

**Via Square Dashboard:**
1. Go to https://squareup.com/apps
2. Log in
3. Select your app
4. Go to Webhooks
5. Look for recent events:
   - `payment.created` - Should be there
   - `payment.updated` - Should be there
6. Status should show "Successfully delivered"

---

## IF SOMETHING FAILS

### Timeout Errors?
Check if payment is hanging >5 seconds
- Browser: "Payment timeout after 15 seconds"
- This should NOT happen - our fixes prevent it

### Card Declined but No Error?
Check DevTools Console for error messages
- Should see clear error message
- Not a timeout

### No Confirmation Email?
Check:
1. Spam folder
2. Email logs in admin panel
3. Check MongoDB: `db.orders.find({})`

### Trace ID Missing?
Check DevTools Network Response:
- Should have `"traceId"` field
- If missing, review `app/api/payments/route.ts` line 224

---

## SUCCESS CRITERIA

All of these should be true:
- ✅ Payment succeeds in 2-3 seconds
- ✅ Trace ID appears in response
- ✅ Confirmation email sent
- ✅ No timeout errors
- ✅ Declined card shows error (not timeout)
- ✅ No console errors
- ✅ Order appears in database

---

## SUPPORT

**If tests pass:** Deployment successful ✅  
**If any test fails:** Check logs in Vercel Dashboard

---

**Deployment:** December 20, 2025  
**Status:** Live at https://tasteofgratitude.shop  
**Est. Test Time:** 5 minutes
