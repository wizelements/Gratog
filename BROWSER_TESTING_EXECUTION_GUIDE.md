# Browser Testing Execution Guide - Phase 2
**Step-by-Step Instructions for Manual Payment Testing**

**Date:** December 20, 2025 | **Phase:** 2a & 2b | **Duration:** 25 minutes

---

## 🎯 Objective
Execute a complete end-to-end payment flow through the browser and verify all components work correctly.

---

## ⏱️ Timeline
- **Phase 2a (Payment):** 15 minutes
- **Phase 2b (Verification):** 10 minutes
- **Total:** 25 minutes

---

## Phase 2a: Successful Payment Execution (15 minutes)

### Step 1: Open Browser (1 minute)

**Action:**
1. Open your web browser (Chrome, Firefox, Safari, or Edge)
2. Navigate to: `http://localhost:3000`
3. Wait for page to load (should be immediate)

**Expected:**
- Homepage loads with product listings
- Navigation menu visible
- Cart icon in top right
- Products displayed in grid or list

**If page doesn't load:**
- Check: Is server running? Run: `curl http://localhost:3000/api/square/config`
- Try hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Check: No errors in browser console (`F12`)

---

### Step 2: Browse Products (2 minutes)

**Action:**
1. Scroll through homepage
2. Review available products
3. Note the prices and descriptions

**Expected:**
- 5+ products visible
- Product images load
- Prices displayed clearly
- "Add to Cart" buttons visible for each product

**Products might include:**
- Grateful products/gifts
- Market items
- Specialty items

---

### Step 3: Add Items to Cart (3 minutes)

**Action:**
1. Click "Add to Cart" on first product
   - Note the quantity (typically 1)
   - Confirm price
2. Repeat for 2 more products (add 3 items total)
3. Observe cart counter in top right (should show 3)

**Expected after each add:**
- Cart number increases in header
- Brief confirmation or toast message
- Page stays on same location
- "Add to Cart" button remains clickable

**Example cart items:**
- Item 1: Product A - $20.00 x 1
- Item 2: Product B - $15.00 x 1  
- Item 3: Product C - $25.00 x 1
- **Estimated Total:** ~$60.00

---

### Step 4: View Cart/Proceed to Checkout (2 minutes)

**Action:**
1. Click cart icon (top right corner)
   OR click "Checkout" button if visible
2. Review items in cart:
   - All 3 items visible
   - Quantities correct
   - Prices accurate
   - Subtotal displayed
3. Click "Proceed to Checkout" or "Continue" button

**Expected:**
- Cart page/modal shows all items
- Item count: 3
- Subtotal calculation correct
- Checkout button prominent

**Note:** Record the **Order ID** if visible (looks like: order-abc123)

---

### Step 5: Customer Information Entry (2 minutes)

**Action:**
1. Select guest checkout (no account needed)
2. Fill in customer information:
   ```
   Email: test-customer@example.com
   Name: Test Customer
   Phone: (404) 555-0001
   ```
3. Click "Continue" or "Next"

**Expected:**
- Form accepts input without errors
- All fields required
- Email format validated
- Phone number validated
- Form submission succeeds

**If validation errors appear:**
- Make sure email format is: `test-customer@example.com`
- Make sure phone includes parentheses and dash: `(404) 555-0001`
- Try again

---

### Step 6: Select Fulfillment Method (2 minutes)

**Action:**
1. Choose fulfillment method (pick one):
   - **Pickup at Market** ← Recommended (easiest)
   - Pickup at Browns Mill
   - Delivery (requires full address)
   - Meetup at Serenbe

2. If selecting **Delivery**, enter address:
   ```
   Street: 123 Test St
   City: Atlanta
   State: GA
   ZIP: 30301
   ```
3. Click "Continue" or "Confirm"

**Expected:**
- Options displayed clearly
- Selection saved
- If delivery selected, address form appears
- Can proceed to next step

**Recommended:** Select "Pickup at Market" for simplicity

---

### Step 7: Review Order Summary (2 minutes)

**Action:**
1. Review order summary page showing:
   - All items listed with quantities
   - Individual item prices
   - Subtotal
   - Tax (if applicable)
   - Fees (if applicable)
   - **Final Total Amount**
   - Fulfillment details
   - Delivery/pickup location
2. **Important:** Note the **Total Amount** (e.g., $60.00)
3. Click "Continue to Payment" or "Pay" button

**Expected:**
- All items correctly listed
- Prices accurate
- Total calculation correct
- Fulfillment location confirmed
- "Proceed to Payment" button visible and clickable

**Record:**
- Order total amount
- Number of items
- Fulfillment method selected

---

### Step 8: Payment Form Loads (1 minute)

**Action:**
1. Wait for payment form to load
2. Observe the payment section with:
   - Card number field
   - Expiration date field
   - CVV/CVC field
   - ZIP/Postal code field (optional)

**Expected:**
- Card form loads from Square Web Payments SDK
- Fields are empty and ready for input
- Form is clearly visible
- No JavaScript errors in console

**If form doesn't load:**
- Hard refresh: `Ctrl+Shift+R` or `Cmd+Shift+R`
- Check browser console for errors: Press `F12`
- Check that `/api/square/config` returns data:
  ```bash
  curl http://localhost:3000/api/square/config
  ```

---

### Step 9: Enter Test Card Information (2 minutes)

**Action:**
1. Click card number field
2. Enter card number: **4111 1111 1111 1111**
   - Type slowly if autocomplete interferes
   - Spaces should be handled automatically
3. Tab to expiration field
4. Enter expiration: **12/25**
   - Format: MM/YY
   - Should auto-format with slash
5. Tab to CVV field
6. Enter CVV: **123**
7. If ZIP field present, enter: **12345**

**Expected:**
- Card number field accepts input
- Number may be masked (shown as ••••)
- Expiration field shows: 12/25
- CVV field hidden/masked
- Form validates each field
- No error messages

**Field values:**
```
Card Number: 4111 1111 1111 1111
Expiration: 12/25
CVV: 123
ZIP: 12345 (if requested)
```

**Visual confirmation:**
- Fields filled in
- No red error borders
- Cursor moves between fields smoothly

---

### Step 10: Submit Payment (1 minute)

**Action:**
1. Review form is complete:
   - Card number: filled ✓
   - Expiration: filled ✓
   - CVV: filled ✓
2. Click **"Pay"** or **"Complete Order"** button
3. Watch for loading indicator (spinner)
4. Wait for response (typically 3-10 seconds)

**Expected during payment:**
- Loading spinner appears
- Button becomes disabled
- Page may dim slightly
- Browser may show loading indicator
- No page reload (happens in background)

**Expected after payment:**
- Page redirects to confirmation
- No error messages
- Order number displayed
- Amount confirmed
- Success message visible

---

## Phase 2b: Verification (10 minutes)

### Step 11: Verify Confirmation Page (2 minutes)

**On the confirmation page, you should see:**

**Required elements:**
- [ ] "Thank You" or "Payment Successful" message
- [ ] Order number (e.g., "Order #12345")
- [ ] Amount paid (e.g., "$60.00")
- [ ] Payment status: "Completed" or "Paid"
- [ ] Last 4 digits of card: "1111"
- [ ] Date/time of payment
- [ ] Fulfillment details (pickup/delivery location)
- [ ] Confirmation button/link to view details

**Record:**
```
✓ Order Number: ________________
✓ Total Amount: ________________
✓ Status: ________________
✓ Card Last 4: ________________
✓ Confirmation Date: ________________
```

---

### Step 12: Check Email Inbox (4 minutes)

**Action:**
1. Open email (Gmail, Outlook, etc.)
2. Wait up to 2 minutes for email delivery
3. Look for email from: **noreply@gratog.com**
4. Subject line should contain: "Order Confirmation" or similar
5. Click to open email

**Expected email contents:**
- [ ] From: noreply@gratog.com
- [ ] Subject: Contains "Order Confirmation"
- [ ] Order number matches confirmation page
- [ ] Items listed with quantities
- [ ] Total amount matches
- [ ] Fulfillment location
- [ ] Delivery/pickup instructions
- [ ] Receipt link (clickable)
- [ ] Professional formatting

**If email not received within 2 minutes:**
1. Check spam/junk folder
2. Check all email folders
3. Refresh email (F5 or refresh button)
4. Check email address used: `test-customer@example.com`
5. Wait another minute

**Email example content:**
```
Order Confirmation from Taste of Gratitude

Order #12345
Date: Dec 20, 2025

Items:
- Product A x1: $20.00
- Product B x1: $15.00
- Product C x1: $25.00

Subtotal: $60.00
Tax: $4.50
Total: $64.50

Fulfillment: Pickup at Market
Location: [Address]

Receipt: [Link to Square receipt]
```

---

### Step 13: Verify Square Dashboard (3 minutes)

**Action:**
1. Open new browser tab
2. Navigate to: **https://connect.squareupsandbox.com**
3. Login with Square test account (if needed)
4. Click: **Transactions** → **Payments**
5. Look for recent payment at top of list

**Expected payment details:**
- [ ] Payment amount: Matches order total (e.g., $64.50)
- [ ] Card: VISA ending in 1111
- [ ] Status: "Completed"
- [ ] Timestamp: Recent (within last 5 minutes)
- [ ] Customer name: "Test Customer" (or email)
- [ ] Receipt URL: Present and clickable

**Click on payment to see:**
- [ ] Order ID visible
- [ ] Customer info
- [ ] Card details (brand, last 4)
- [ ] Amount breakdown
- [ ] Receipt link working
- [ ] Full payment details

**Square Dashboard path:**
```
1. https://connect.squareupsandbox.com
2. Transactions menu → Payments
3. Find recent payment (top of list)
4. Click to view details
```

---

### Step 14: Verify Database (Optional, 1 minute)

**If you have database access:**

**Action:**
1. Open terminal
2. Connect to database: `mongo gratog` (if local) or use Atlas UI
3. Check orders: `db.orders.find({ status: "paid" }).pretty()`
4. Check payments: `db.payments.find().pretty()`

**Expected order document:**
```javascript
{
  _id: ObjectId(...),
  id: "order-12345",
  status: "paid",
  paymentStatus: "COMPLETED",
  squarePaymentId: "cnp_abc123...",
  paidAt: ISODate("2025-12-20T..."),
  customerEmail: "test-customer@example.com",
  customerName: "Test Customer",
  items: [
    { name: "Product A", price: 2000, quantity: 1 },
    { name: "Product B", price: 1500, quantity: 1 },
    { name: "Product C", price: 2500, quantity: 1 }
  ],
  total: 6450,
  fulfillment: "pickup",
  location: "Market",
  timeline: [
    {
      status: "paid",
      message: "Payment completed successfully",
      squarePaymentId: "cnp_...",
      timestamp: ISODate(...)
    }
  ]
}
```

**Expected payment document:**
```javascript
{
  _id: ObjectId(...),
  squarePaymentId: "cnp_abc123...",
  orderId: "order-12345",
  status: "COMPLETED",
  amountMoney: { amount: 6450, currency: "USD" },
  cardDetails: {
    brand: "VISA",
    last4: "1111"
  },
  receiptUrl: "https://square.com/receipts/...",
  createdAt: ISODate("2025-12-20T..."),
  updatedAt: ISODate("2025-12-20T...")
}
```

---

## ✅ Success Verification Checklist

### Browser (Immediate)
- [ ] Confirmation page appears ✓
- [ ] Order number displayed ✓
- [ ] Amount shown correctly ✓
- [ ] No error messages ✓
- [ ] Card last 4 shown (1111) ✓

### Email (Within 2 min)
- [ ] Email received ✓
- [ ] From correct sender ✓
- [ ] Order details included ✓
- [ ] Receipt link present ✓
- [ ] Professional format ✓

### Square Dashboard (Immediate)
- [ ] Payment visible ✓
- [ ] Amount correct ✓
- [ ] Card ending 1111 ✓
- [ ] Status "Completed" ✓
- [ ] Receipt URL works ✓

### Database (Optional)
- [ ] Order status "paid" ✓
- [ ] Payment record created ✓
- [ ] Order ID matches ✓
- [ ] Amount correct ✓

---

## 📊 Results Recording

### Test Payment Summary
```
Date: _______________
Time: _______________
Test Card: 4111 1111 1111 1111
Card Exp: 12/25
Amount: $_______________

Order Number: _______________
Customer Email: test-customer@example.com
Fulfillment: _______________

Status: ✓ SUCCESSFUL
```

### Results
```
BROWSER CONFIRMATION
├─ Page loads: ✓ Yes / ✗ No
├─ Order # shown: ✓ Yes / ✗ No
├─ Amount correct: ✓ Yes / ✗ No
├─ No errors: ✓ Yes / ✗ No
└─ Payment status: ✓ Yes / ✗ No

EMAIL VERIFICATION
├─ Email received: ✓ Yes / ✗ No
├─ Time received: ___ minutes
├─ Contains order #: ✓ Yes / ✗ No
├─ Contains receipt: ✓ Yes / ✗ No
└─ Professional format: ✓ Yes / ✗ No

SQUARE DASHBOARD
├─ Payment visible: ✓ Yes / ✗ No
├─ Amount matches: ✓ Yes / ✗ No
├─ Card matches: ✓ Yes / ✗ No
├─ Status "Completed": ✓ Yes / ✗ No
└─ Receipt URL works: ✓ Yes / ✗ No

DATABASE (Optional)
├─ Order created: ✓ Yes / ✗ No
├─ Status "paid": ✓ Yes / ✗ No
├─ Payment record: ✓ Yes / ✗ No
└─ Order ID matches: ✓ Yes / ✗ No
```

---

## 🐛 Troubleshooting During Execution

### Issue: Page Doesn't Load
**Solution:**
1. Check server: `curl http://localhost:3000/api/square/config`
2. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
3. Check console: Press `F12` and look for errors
4. Restart server: Stop and run `npm run dev`

### Issue: Cart Doesn't Work
**Solution:**
1. Hard refresh page
2. Try adding items again
3. Check browser console for JavaScript errors
4. Try different product

### Issue: Card Form Doesn't Load
**Solution:**
1. Hard refresh: `Ctrl+Shift+R`
2. Clear browser cache
3. Try different browser
4. Check: `curl http://localhost:3000/api/square/config` returns data

### Issue: Card Entry Fails
**Solution:**
1. Make sure card number: 4111 1111 1111 1111 (spaces auto-inserted)
2. Make sure expiration: 12/25 (future date)
3. Make sure CVV: 123 (any 3 digits)
4. Check for red error messages
5. Try typing slower (let autocomplete work)

### Issue: Payment Fails with Error
**Solution:**
1. Note the error message
2. Check server logs: `tail -f /tmp/server.log | grep -i payment`
3. Verify test card (4111 1111 1111 1111)
4. Try payment again
5. Contact support with error message

### Issue: Email Not Received
**Solution:**
1. Wait up to 2 minutes
2. Check spam/junk folder
3. Check all inboxes
4. Refresh email (F5)
5. Verify email address in confirmation: `test-customer@example.com`

### Issue: Payment Not in Square Dashboard
**Solution:**
1. Make sure you're in **Sandbox** dashboard (not Production)
2. Refresh dashboard (F5)
3. Check Transactions → Payments
4. Look at recent transactions (top of list)
5. May take 30 seconds to appear

---

## ⏱️ Timeline Summary

| Step | Task | Time | Notes |
|------|------|------|-------|
| 1 | Open browser | 1 min | http://localhost:3000 |
| 2 | Browse products | 2 min | Review items |
| 3 | Add to cart | 3 min | Add 3 items |
| 4 | Checkout | 2 min | Review items |
| 5 | Customer info | 2 min | test-customer@example.com |
| 6 | Fulfillment | 2 min | Select pickup/delivery |
| 7 | Review order | 2 min | Confirm total |
| 8 | Payment form | 1 min | Wait to load |
| 9 | Enter card | 2 min | 4111 1111 1111 1111 |
| 10 | Submit payment | 1 min | Click Pay, wait 3-10 sec |
| 11 | Verify confirmation | 2 min | Check page elements |
| 12 | Check email | 4 min | Wait and verify |
| 13 | Square Dashboard | 3 min | Login and verify |
| 14 | Database check | 1 min | Optional |
| **TOTAL** | **Complete Flow** | **~25 min** | **All verification** |

---

## 🎯 Success Criteria

**Successful if all of these are TRUE:**

1. ✅ Confirmation page appears after payment
2. ✅ Order number is visible
3. ✅ Amount shown correctly
4. ✅ Email received within 2 minutes
5. ✅ Email contains order details
6. ✅ Payment visible in Square Dashboard
7. ✅ Square payment status is "Completed"

**All 7 criteria met = SUCCESSFUL TEST ✅**

---

## Next Steps After Successful Test

### Immediate
1. Document results in PAYMENT_TEST_RESULTS.md
2. Take screenshots of confirmation, email, dashboard

### Then (Optional Phase 3)
1. Test declined card: 4000 0200 0000 0000
2. Test insufficient funds: 4000 0300 0000 0000
3. Test multiple payments

### Final
1. Review all results
2. Sign off on testing
3. Prepare for production deployment

---

**Ready to execute?** Start at Step 1: Open browser to http://localhost:3000
