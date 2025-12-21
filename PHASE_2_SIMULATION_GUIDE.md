# Phase 2: Browser Testing - Simulation & Execution Guide
**What Successful Testing Looks Like + Personal Execution Checklist**

**Date:** December 20, 2025 | **Phase:** 2a & 2b | **Duration:** 25 minutes

---

## 📊 PART 1: SUCCESSFUL EXECUTION SIMULATION

This section shows what you should see at each step if payment testing succeeds.

---

### STEP 1: Open Browser - SIMULATION

**What you do:**
- Open Chrome/Firefox/Safari
- Navigate to: http://localhost:3000

**What you should see (Success):**
```
┌─────────────────────────────────────────────────────────┐
│ Taste of Gratitude - Home                     🛒 Cart   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Welcome to Taste of Gratitude Market                    │
│ Fresh local products, handpicked with gratitude         │
│                                                          │
│ FEATURED PRODUCTS:                                      │
│                                                          │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│ │ Organic      │  │ Local        │  │ Artisan      │  │
│ │ Vegetables   │  │ Honey        │  │ Bread        │  │
│ │ $12.99       │  │ $18.50       │  │ $6.99        │  │
│ │ Add to Cart  │  │ Add to Cart  │  │ Add to Cart  │  │
│ └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│ [More products below...]                               │
└─────────────────────────────────────────────────────────┘
```

**Status:** ✅ PASS

---

### STEP 2: Browse Products - SIMULATION

**What you do:**
- Scroll down and observe 5+ products
- Note prices and descriptions

**What you should see:**
- Multiple product cards
- Images loading
- Prices displayed clearly ($XX.XX format)
- "Add to Cart" buttons on each

**Example products visible:**
- Organic Vegetables - $12.99
- Local Honey - $18.50
- Artisan Bread - $6.99
- Fresh Produce Box - $24.99
- Specialty Items - $15.00+

**Status:** ✅ PASS

---

### STEP 3: Add Items to Cart - SIMULATION

**What you do:**
```
Click "Add to Cart" on Product 1 (e.g., Vegetables $12.99)
Click "Add to Cart" on Product 2 (e.g., Honey $18.50)
Click "Add to Cart" on Product 3 (e.g., Bread $6.99)
```

**What you should see after each click:**
```
First click:
  Cart icon shows: 🛒 1
  Small confirmation: "Item added to cart"
  
Second click:
  Cart icon shows: 🛒 2
  Small confirmation: "Item added to cart"
  
Third click:
  Cart icon shows: 🛒 3
  Small confirmation: "Item added to cart"
```

**Status:** ✅ PASS

---

### STEP 4: View Cart - SIMULATION

**What you do:**
- Click cart icon (top right)

**What you should see:**
```
┌─────────────────────────────────────────────────────────┐
│ Shopping Cart                              × Close       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ITEMS IN CART:                                          │
│                                                          │
│ □ Organic Vegetables                   $12.99 × 1     │
│ □ Local Honey                          $18.50 × 1     │
│ □ Artisan Bread                         $6.99 × 1     │
│                                                          │
│ SUBTOTAL:                                 $38.48        │
│                                                          │
│ [PROCEED TO CHECKOUT] ────────────────────────────────│
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Record:** 
- Item count: 3 ✓
- Subtotal: ~$38-40 ✓

**Status:** ✅ PASS

---

### STEP 5: Customer Information - SIMULATION

**What you do:**
- Click "Proceed to Checkout"
- Select "Guest Checkout"
- Fill in:
  - Email: test-customer@example.com
  - Name: Test Customer
  - Phone: (404) 555-0001

**What you should see:**
```
┌─────────────────────────────────────────────────────────┐
│ Checkout - Customer Information                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ○ Guest Checkout  ○ Sign In                            │
│                                                          │
│ Email:  [test-customer@example.com]                    │
│ Name:   [Test Customer]                                │
│ Phone:  [(404) 555-0001]                               │
│                                                          │
│ [CONTINUE TO FULFILLMENT]                              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Status:** ✅ PASS (all fields accepted, no validation errors)

---

### STEP 6: Fulfillment Selection - SIMULATION

**What you do:**
- Select fulfillment method
- Choose: "Pickup at Market"

**What you should see:**
```
┌─────────────────────────────────────────────────────────┐
│ Checkout - Fulfillment Method                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ◉ Pickup at Market      (Ready in 1 hour)             │
│ ○ Pickup at Browns Mill (Ready in 2 hours)            │
│ ○ Delivery              (Next day)                      │
│ ○ Meetup at Serenbe     (By appointment)              │
│                                                          │
│ Pickup Location: The Gratitude Market, Atlanta, GA      │
│ Address: 123 Market St, Atlanta, GA 30301              │
│                                                          │
│ [CONTINUE TO REVIEW]                                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Status:** ✅ PASS

---

### STEP 7: Review Order - SIMULATION

**What you do:**
- Review order summary

**What you should see:**
```
┌─────────────────────────────────────────────────────────┐
│ Checkout - Order Summary                                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ORDER ID: order-20251220-47293                          │
│                                                          │
│ ITEMS:                                                  │
│   Organic Vegetables        $12.99 × 1 = $12.99        │
│   Local Honey              $18.50 × 1 = $18.50        │
│   Artisan Bread             $6.99 × 1 = $6.99         │
│                                                          │
│ Subtotal:                                   $38.48      │
│ Tax:                                         $3.08      │
│ Delivery Fee:                                 $0.00      │
│ ─────────────────────────────────────────────           │
│ TOTAL:                                      $41.56      │
│                                                          │
│ FULFILLMENT:                                            │
│ Pickup at Market, Atlanta, GA                          │
│ Ready: Today, 4:00 PM                                  │
│                                                          │
│ [CONTINUE TO PAYMENT]                                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Record:**
- Order ID: order-20251220-47293 (example)
- Total: $41.56 (example)

**Status:** ✅ PASS

---

### STEP 8: Payment Form Loads - SIMULATION

**What you do:**
- Wait for payment form to appear

**What you should see:**
```
┌─────────────────────────────────────────────────────────┐
│ Checkout - Payment Information                           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ CARD DETAILS                                            │
│ (Powered by Square)                                     │
│                                                          │
│ [____________________________]  Card Number             │
│                                                          │
│ [______]           [___]         Exp Date    CVV        │
│                                                          │
│ [__________]                    ZIP Code                │
│                                                          │
│ ☐ Save this card for future purchases                 │
│                                                          │
│ [PAY $41.56]  [CANCEL]                                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Status:** ✅ PASS (form loaded, ready for input)

---

### STEP 9: Enter Card Information - SIMULATION

**What you do:**
```
Card Number field: Type 4111 1111 1111 1111
Expiration field: Type 12/25
CVV field: Type 123
ZIP field: Type 12345
```

**What you should see:**
```
┌─────────────────────────────────────────────────────────┐
│ Checkout - Payment Information                           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ CARD DETAILS                                            │
│ (Powered by Square)                                     │
│                                                          │
│ [•••• •••• •••• 1111]  Card Number          ✓ Valid   │
│                                                          │
│ [12/25]            [123]       Exp Date    CVV         │
│                                                          │
│ [12345]              ZIP Code               ✓ Valid    │
│                                                          │
│ ☑ Save this card for future purchases                 │
│                                                          │
│ [PAY $41.56]  [CANCEL]                                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Status:** ✅ PASS (all fields filled, no error messages)

---

### STEP 10: Submit Payment - SIMULATION

**What you do:**
- Click [PAY $41.56] button

**What you should see (in sequence):**

**Moment 1 (immediately):**
```
┌─────────────────────────────────────────────────────────┐
│ Processing Payment...                                    │
│                                                          │
│ ⟳ ⟳ ⟳  Loading...  ⟳ ⟳ ⟳                            │
│                                                          │
│ Please wait while we process your payment               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Moment 2 (after 3-10 seconds):**
```
[Page automatically redirects to confirmation page]
```

**Status:** ✅ PASS (payment processes, no errors)

---

### STEP 11: Confirmation Page - SIMULATION

**What you should see:**
```
┌─────────────────────────────────────────────────────────┐
│ ✓ THANK YOU FOR YOUR ORDER                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Your payment has been successfully processed!           │
│                                                          │
│ ORDER NUMBER: #order-20251220-47293                    │
│                                                          │
│ AMOUNT PAID: $41.56                                    │
│                                                          │
│ PAYMENT METHOD: Visa ending in 1111                    │
│                                                          │
│ STATUS: ✓ COMPLETED                                   │
│                                                          │
│ WHAT'S NEXT:                                            │
│ Your order is being prepared for pickup at:            │
│ The Gratitude Market, Atlanta, GA                      │
│ Pickup time: Today, 4:00 PM                            │
│                                                          │
│ You will receive a confirmation email shortly.          │
│                                                          │
│ [VIEW ORDER DETAILS] [PRINT RECEIPT] [CONTINUE SHOPPING]│
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Record:**
- Order Number: order-20251220-47293
- Amount: $41.56
- Status: COMPLETED ✓
- Card: Visa 1111 ✓

**Status:** ✅ PASS

---

### STEP 12: Check Email - SIMULATION

**What you should see (in email inbox):**

**From:** noreply@gratog.com  
**Subject:** Order Confirmation #order-20251220-47293  
**Time:** Received within 2 minutes

**Email Content:**
```
┌─────────────────────────────────────────────────────────┐
│ Taste of Gratitude - Order Confirmation                 │
│                                                          │
│ Thank you for your order, Test Customer!               │
│                                                          │
│ ORDER #order-20251220-47293                            │
│ Date: December 20, 2025                                │
│                                                          │
│ ITEMS ORDERED:                                          │
│   Organic Vegetables      $12.99 × 1                   │
│   Local Honey             $18.50 × 1                   │
│   Artisan Bread            $6.99 × 1                   │
│                                                          │
│ Subtotal:                           $38.48              │
│ Tax:                                 $3.08              │
│ Total:                              $41.56              │
│                                                          │
│ PAYMENT METHOD: Visa ending in 1111                    │
│                                                          │
│ FULFILLMENT:                                            │
│ Pickup at The Gratitude Market                         │
│ 123 Market St, Atlanta, GA 30301                       │
│ Ready: Today at 4:00 PM                                │
│                                                          │
│ [VIEW RECEIPT] [TRACK ORDER] [CONTACT SUPPORT]        │
│                                                          │
│ Thank you for your purchase!                           │
│ The Taste of Gratitude Team                            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Status:** ✅ PASS

---

### STEP 13: Check Square Dashboard - SIMULATION

**What you do:**
1. Open new tab
2. Go to: https://connect.squareupsandbox.com
3. Login with Square test account
4. Navigate to: Transactions > Payments

**What you should see:**
```
┌─────────────────────────────────────────────────────────┐
│ Square Dashboard - Payments                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ RECENT TRANSACTIONS:                                    │
│                                                          │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Amount: $41.56                                   │  │
│ │ Card: Visa ending in 1111                       │  │
│ │ Status: ✓ COMPLETED                             │  │
│ │ Date: Dec 20, 2025 at 11:47 PM                 │  │
│ │ Order ID: order-20251220-47293                 │  │
│ │ Receipt: [RECEIPT LINK - clickable]            │  │
│ │                                                  │  │
│ │ [VIEW DETAILS]                                  │  │
│ └──────────────────────────────────────────────────┘  │
│                                                          │
│ [Earlier transactions...]                              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Click on transaction to see full details:**
```
┌─────────────────────────────────────────────────────────┐
│ Payment Details                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Payment ID: cnp_abc123def456                           │
│ Amount: $41.56 USD                                     │
│ Status: COMPLETED                                      │
│ Timestamp: 2025-12-20T23:47:15Z                       │
│                                                          │
│ CARD INFORMATION:                                       │
│ Brand: Visa                                             │
│ Last 4: 1111                                            │
│ Exp: 12/25                                              │
│                                                          │
│ CUSTOMER:                                               │
│ Email: test-customer@example.com                       │
│ Name: Test Customer                                    │
│                                                          │
│ RECEIPT:                                                │
│ https://squareup.com/receipts/abc123... [OPEN]        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Status:** ✅ PASS

---

## ✅ SUCCESSFUL PHASE 2 RESULTS

**All 8 criteria met:**
- ✅ Confirmation page appears
- ✅ Order number displayed
- ✅ Amount shown correctly
- ✅ No error messages
- ✅ Email received (< 2 min)
- ✅ Email contains order details
- ✅ Payment in Square Dashboard
- ✅ Square status is "Completed"

**Overall Result: 🟢 SUCCESSFUL**

---

## 📋 PART 2: YOUR PERSONAL EXECUTION CHECKLIST

Now follow these steps yourself and track your results.

### ✅ STEP 1: Open Browser

```
ACTION: Navigate to http://localhost:3000

EXPECTED: Homepage with products loads
ACTUAL RESULT: ____________________________________

STATUS: ☐ PASS  ☐ FAIL
```

### ✅ STEP 2: Browse Products

```
ACTION: Scroll and view 5+ products

EXPECTED: Product cards visible, prices shown
ACTUAL RESULT: ____________________________________

Products I see:
  1. ________________________________________
  2. ________________________________________
  3. ________________________________________

STATUS: ☐ PASS  ☐ FAIL
```

### ✅ STEP 3: Add Items to Cart

```
ACTION: Click "Add to Cart" on 3 products

PRODUCT 1: ______________________________
PRODUCT 2: ______________________________
PRODUCT 3: ______________________________

CART COUNT AFTER: 3 ☐ CONFIRMED

EXPECTED: Cart number increases to 3
ACTUAL: ________________________________________

STATUS: ☐ PASS  ☐ FAIL
```

### ✅ STEP 4: View Cart

```
ACTION: Click cart icon

ITEMS VISIBLE: ______ items
SUBTOTAL: $__________
TOTAL: $__________

EXPECTED: 3 items, subtotal calculated
ACTUAL: ________________________________________

STATUS: ☐ PASS  ☐ FAIL
```

### ✅ STEP 5: Customer Information

```
ACTION: Fill guest checkout form
  Email: test-customer@example.com
  Name: Test Customer
  Phone: (404) 555-0001

EXPECTED: Form accepts all fields
ACTUAL: ________________________________________

Form validation errors: ☐ NONE  ☐ YES (list): ___

STATUS: ☐ PASS  ☐ FAIL
```

### ✅ STEP 6: Fulfillment Selection

```
ACTION: Select fulfillment method

METHOD SELECTED: ☐ Pickup at Market
                 ☐ Pickup at Browns Mill
                 ☐ Delivery
                 ☐ Meetup at Serenbe

IF DELIVERY - Address: ________________________________________

EXPECTED: Selection accepted
ACTUAL: ________________________________________

STATUS: ☐ PASS  ☐ FAIL
```

### ✅ STEP 7: Review Order

```
ACTION: View order summary

ORDER ID: __________________
SUBTOTAL: $__________
TAX: $__________
TOTAL: $__________

ITEMS COUNT: ______

EXPECTED: All items shown, total correct
ACTUAL: ________________________________________

STATUS: ☐ PASS  ☐ FAIL
```

### ✅ STEP 8: Payment Form

```
ACTION: Wait for payment form to load

EXPECTED: Card form visible, no errors
ACTUAL: ________________________________________

Form fields visible:
  ☐ Card Number
  ☐ Expiration
  ☐ CVV
  ☐ ZIP

JavaScript errors: ☐ NONE  ☐ YES (describe): ___

STATUS: ☐ PASS  ☐ FAIL
```

### ✅ STEP 9: Enter Card

```
ACTION: Fill card information
  Card: 4111 1111 1111 1111
  Exp: 12/25
  CVV: 123
  ZIP: 12345

CARD FIELD: ________________________________________
ACCEPTED: ☐ YES  ☐ NO

EXP FIELD: ________________________________________
ACCEPTED: ☐ YES  ☐ NO

CVV FIELD: ________________________________________
ACCEPTED: ☐ YES  ☐ NO

ZIP FIELD: ________________________________________
ACCEPTED: ☐ YES  ☐ NO

ERROR MESSAGES: ☐ NONE  ☐ YES (list): ___________

STATUS: ☐ PASS  ☐ FAIL
```

### ✅ STEP 10: Submit Payment

```
ACTION: Click "Pay" button
TIME: __________ (record time)

EXPECTED: Loading spinner, then confirmation (3-10 sec)

LOADING VISIBLE: ☐ YES  ☐ NO
LOAD TIME: __________ seconds

EXPECTED: Redirects to confirmation
ACTUAL: ________________________________________

PAGE REDIRECTED: ☐ YES  ☐ NO
ERRORS: ☐ NONE  ☐ YES (describe): ___________

STATUS: ☐ PASS  ☐ FAIL
```

### ✅ STEP 11: Confirmation Page

```
ACTION: Verify confirmation page elements

"Thank You" message visible: ☐ YES  ☐ NO
Order number shown: ________________________________________
Amount shown: $__________
Status shown: __________
Card last 4: 1111 ☐ CONFIRMED

EXPECTED: All elements present, no errors
ACTUAL: ________________________________________

Missing elements: ________________________________________

STATUS: ☐ PASS  ☐ FAIL

🎯 RECORD FOR LATER VERIFICATION:
Order ID: __________________
Amount: $__________
Card Last 4: 1111
Confirmation Time: __________
```

### ✅ STEP 12: Email Verification

```
ACTION: Check email inbox for confirmation

START TIME: __________
CHECKED AT: __________

EMAIL RECEIVED: ☐ YES  ☐ NO
FROM: __________________________________________
SUBJECT: ________________________________________
DELIVERY TIME: __________ minutes

EMAIL CONTAINS:
  ☐ Order number
  ☐ Items ordered
  ☐ Total amount
  ☐ Fulfillment details
  ☐ Receipt link
  ☐ Professional format

EXPECTED: Email received within 2 min, all details present
ACTUAL: ________________________________________

IF NOT RECEIVED:
  ☐ Checked spam folder
  ☐ Refreshed email
  ☐ Waited full 2 minutes
  Still not received after 2 min: ☐ YES  ☐ NO

STATUS: ☐ PASS  ☐ FAIL  ☐ DELAYED
```

### ✅ STEP 13: Square Dashboard

```
ACTION: Login to https://connect.squareupsandbox.com
        Navigate to Transactions > Payments

EXPECTED: Recent payment visible, amount correct

PAYMENT FOUND: ☐ YES  ☐ NO
AMOUNT: $__________
CARD: __________ ending in 1111
STATUS: __________
TIMESTAMP: __________

PAYMENT DETAILS VISIBLE:
  ☐ Order ID
  ☐ Customer name
  ☐ Card details
  ☐ Receipt link
  ☐ All info correct

RECEIPT LINK: ☐ WORKING  ☐ NOT WORKING  ☐ N/A

STATUS: ☐ PASS  ☐ FAIL
```

### ✅ STEP 14: Database (Optional)

```
ACTION: Check database records (if accessible)

COMMAND: mongo gratog
         db.orders.find({ status: "paid" }).pretty()

ORDER RECORD FOUND: ☐ YES  ☐ NO  ☐ N/A
STATUS: __________ (should be "paid")
AMOUNT: $__________
ITEMS: __________
PAYMENT ID: __________

COMMAND: db.payments.find().pretty()

PAYMENT RECORD FOUND: ☐ YES  ☐ NO  ☐ N/A
STATUS: __________ (should be "COMPLETED")
AMOUNT: $__________
CARD LAST 4: 1111

DATABASE RECORDS: ☐ CORRECT  ☐ ERRORS  ☐ N/A

STATUS: ☐ PASS  ☐ FAIL  ☐ N/A
```

---

## 📊 PHASE 2 FINAL RESULTS

### Success Criteria (7 of 8 required)

```
CRITERIA CHECKLIST:

1. ☐ Confirmation page appears
2. ☐ Order number displayed
3. ☐ Amount shown correctly
4. ☐ No error messages
5. ☐ Email received (< 2 min)
6. ☐ Email contains order details
7. ☐ Payment in Square Dashboard
8. ☐ Square status is "Completed"

TOTAL PASSED: ___ / 8

RESULT:
  ☐ ✅ SUCCESS (7-8 passed)
  ☐ ⚠️  PARTIAL (5-6 passed)
  ☐ ❌ FAILED (<5 passed)
```

### Issues & Notes

```
ISSUES ENCOUNTERED:
_________________________________________________________________
_________________________________________________________________

RESOLUTIONS ATTEMPTED:
_________________________________________________________________
_________________________________________________________________

FINAL OBSERVATIONS:
_________________________________________________________________
_________________________________________________________________
```

---

**Now ready for Phase 3 or Phase 4?**
- If 7+ criteria passed: Go to Phase 3 (optional error testing)
- If <7 criteria: Debug and retry
- Skip Phase 3: Go to Phase 4 (final report)
