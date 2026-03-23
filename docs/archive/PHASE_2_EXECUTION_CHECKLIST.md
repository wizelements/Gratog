# Phase 2: Browser Testing - Execution Checklist
**Real-time Test Tracking & Results Documentation**

**Date:** December 20, 2025 | **Phase:** 2a & 2b | **Status:** 🟡 Ready to Execute

---

## 🎯 Quick Reference Before Starting

| Info | Value |
|------|-------|
| **URL** | http://localhost:3000 |
| **Test Card** | 4111 1111 1111 1111 |
| **Expiration** | 12/25 |
| **CVV** | 123 |
| **ZIP** | 12345 |
| **Customer Email** | test-customer@example.com |
| **Duration** | 25 minutes |
| **Risk** | LOW (Sandbox) |

---

## ⏱️ PHASE 2a: PAYMENT EXECUTION (15 minutes)

### PRE-TEST VERIFICATION (1 min)
Before starting, verify:

- [ ] Server running: `curl http://localhost:3000/api/square/config` returns JSON
- [ ] No console errors: Ready to test
- [ ] Internet connection: Working
- [ ] Email account ready: Can check test-customer@example.com OR use your email
- [ ] Square Dashboard tab open: https://connect.squareupsandbox.com (optional, for real-time check)

---

### TEST EXECUTION STEPS

#### ✅ Step 1: Open Browser (1 min)
```
Action: Navigate to http://localhost:3000
Expected: Homepage loads with products
Status: ☐ PASS  ☐ FAIL

Notes: ________________________________________
```

#### ✅ Step 2: Browse Products (2 min)
```
Action: Scroll and review products
Expected: 5+ products visible with prices
Status: ☐ PASS  ☐ FAIL

Products visible: ________________________________________
```

#### ✅ Step 3: Add Items to Cart (3 min)
```
Action: Click "Add to Cart" on 3 different products
Expected: Cart count increases to 3
Status: ☐ PASS  ☐ FAIL

Item 1: ________________________________________
Item 2: ________________________________________
Item 3: ________________________________________
Cart Count: 3 ☐ CONFIRMED
```

#### ✅ Step 4: View Cart & Checkout (2 min)
```
Action: Click cart → Click "Proceed to Checkout"
Expected: Cart page shows all 3 items
Status: ☐ PASS  ☐ FAIL

Items visible: ☐ 3 items confirmed
Order ID (if shown): ________________________________________
Subtotal: $________
```

#### ✅ Step 5: Customer Information (2 min)
```
Action: Enter guest checkout info
Expected: Form accepts information
Status: ☐ PASS  ☐ FAIL

Email entered: test-customer@example.com ☐
Name entered: Test Customer ☐
Phone entered: (404) 555-0001 ☐
Form submitted: ☐ SUCCESS
```

#### ✅ Step 6: Fulfillment Selection (2 min)
```
Action: Select fulfillment method
Expected: Selection accepted, proceed button available
Status: ☐ PASS  ☐ FAIL

Method selected: ☐ Pickup at Market
                 ☐ Pickup at Browns Mill
                 ☐ Delivery
                 ☐ Meetup at Serenbe

If Delivery: Address entered ☐
             123 Test St
             Atlanta, GA 30301
```

#### ✅ Step 7: Review Order (2 min)
```
Action: Review order summary page
Expected: All items, total, fulfillment method shown
Status: ☐ PASS  ☐ FAIL

Items count: 3 ☐
Order Total: $________
Fulfillment: ________________________________________
"Continue to Payment" visible: ☐ YES
```

#### ✅ Step 8: Payment Form Loads (1 min)
```
Action: Wait for payment form to appear
Expected: Card entry form loads from Square SDK
Status: ☐ PASS  ☐ FAIL

Card Number field visible: ☐
Expiration field visible: ☐
CVV field visible: ☐
ZIP field visible: ☐
No JavaScript errors: ☐
```

#### ✅ Step 9: Enter Payment Card (2 min)
```
Action: Fill in card fields
Expected: All fields accept input without errors
Status: ☐ PASS  ☐ FAIL

Card Number entered: 4111 1111 1111 1111 ☐
Expiration entered: 12/25 ☐
CVV entered: 123 ☐
ZIP entered: 12345 ☐

Form validation: ☐ No red errors
               ☐ All fields green/accepted
```

#### ✅ Step 10: Submit Payment (1 min)
```
Action: Click "Pay" button, wait for response
Expected: Loading indicator, then redirect to confirmation
Status: ☐ PASS  ☐ FAIL

"Pay" button clicked: ☐ YES
Loading spinner visible: ☐ YES
Wait time: ___ seconds
Redirected to confirmation: ☐ YES
Page loaded successfully: ☐ YES
```

---

## 🎯 PHASE 2b: VERIFICATION (10 minutes)

### ✅ Step 11: Verify Confirmation Page (2 min)

```
CONFIRMATION PAGE ELEMENTS:

Order Information:
  ☐ "Thank You" or "Payment Successful" message visible
  ☐ Order Number displayed: #________
  ☐ Total Amount displayed: $________
  ☐ Payment Status: ________________
  ☐ Card Last 4 digits shown: 1111 ☐

Fulfillment Details:
  ☐ Fulfillment method confirmed
  ☐ Pickup/Delivery location shown
  ☐ Instructions visible (if applicable)

Links & Actions:
  ☐ Receipt link present
  ☐ Order details link present
  ☐ No error messages visible

Overall Status: ☐ PASS  ☐ FAIL

RECORD THIS INFO FOR LATER VERIFICATION:
Order Number: _______________
Total Amount: $_______________
Payment Status: _______________
Card Last 4: 1111
Confirmation Time: _______________
```

---

### ✅ Step 12: Verify Email Delivery (4 min)

```
EMAIL VERIFICATION:

Timing:
  Start checking: _____ (current time)
  Email received at: _____ 
  Delivery time: _____ minutes

Email Source:
  ☐ Email received from: noreply@gratog.com
  ☐ Subject contains: "Order Confirmation"
  ☐ Email address: test-customer@example.com

Email Content:
  ☐ Order number matches confirmation page
  ☐ Items listed with quantities
  ☐ Total amount matches
  ☐ Fulfillment method shown
  ☐ Pickup/delivery location shown
  ☐ Receipt link included
  ☐ Professional formatting
  ☐ No spam indicators

Overall Status: ☐ PASS  ☐ FAIL

IF NOT RECEIVED WITHIN 2 MIN:
  ☐ Checked spam folder
  ☐ Checked all inboxes
  ☐ Refreshed email (F5)
  ☐ Waited full 2 minutes
  
Not received? Status: ☐ DELAYED  ☐ FAILED
```

---

### ✅ Step 13: Verify Square Dashboard (3 min)

```
SQUARE DASHBOARD VERIFICATION:

Login & Navigation:
  ☐ Logged into: https://connect.squareupsandbox.com
  ☐ Environment: SANDBOX ✓ (not Production)
  ☐ Navigated to: Transactions > Payments
  ☐ Recent payment visible at top of list

Payment Details:
  ☐ Amount matches order total: $________
  ☐ Card type shown: VISA ✓
  ☐ Card last 4: 1111 ✓
  ☐ Status: COMPLETED ✓
  ☐ Timestamp: Recent (within 5 min) ✓

Receipt Verification:
  ☐ Click payment to view full details
  ☐ Order ID visible: _______________
  ☐ Customer name visible: Test Customer
  ☐ Receipt URL present
  ☐ Receipt URL working (can open)

Overall Status: ☐ PASS  ☐ FAIL

SQUARE PAYMENT ID (if visible): _______________
Payment found at time: _______________
```

---

### ✅ Step 14: Verify Database (Optional, 1 min)

```
DATABASE VERIFICATION (Optional):

If database access available:

Order Check:
  Command: db.orders.find({ status: "paid" }).pretty()
  
  ☐ Order found with status: "paid"
  ☐ Order ID matches: _______________
  ☐ Customer email: test-customer@example.com
  ☐ Items count: 3
  ☐ Total amount: $________
  ☐ Payment status: COMPLETED

Payment Check:
  Command: db.payments.find().pretty()
  
  ☐ Payment record created
  ☐ Status: COMPLETED
  ☐ Amount matches: $________
  ☐ Card last 4: 1111
  ☐ Receipt URL present

Overall Status: ☐ PASS  ☐ FAIL  ☐ N/A (no access)
```

---

## 📊 FINAL RESULTS SUMMARY

### Test Completion Status

```
PHASE 2a: PAYMENT EXECUTION
├─ Step 1-4 (Browse & Checkout): ☐ PASS  ☐ FAIL
├─ Step 5-7 (Info & Review): ☐ PASS  ☐ FAIL
├─ Step 8-10 (Payment): ☐ PASS  ☐ FAIL
└─ Overall Phase 2a: ☐ PASS  ☐ FAIL

PHASE 2b: VERIFICATION
├─ Step 11 (Confirmation): ☐ PASS  ☐ FAIL
├─ Step 12 (Email): ☐ PASS  ☐ FAIL
├─ Step 13 (Square Dashboard): ☐ PASS  ☐ FAIL
├─ Step 14 (Database): ☐ PASS  ☐ FAIL  ☐ N/A
└─ Overall Phase 2b: ☐ PASS  ☐ FAIL
```

---

### Success Criteria Checklist

**Test is SUCCESSFUL if:**

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Confirmation page appears | ☐ YES / ☐ NO |
| 2 | Order number visible | ☐ YES / ☐ NO |
| 3 | Amount shown correctly | ☐ YES / ☐ NO |
| 4 | No error messages | ☐ YES / ☐ NO |
| 5 | Email received (< 2 min) | ☐ YES / ☐ NO |
| 6 | Email contains order details | ☐ YES / ☐ NO |
| 7 | Payment in Square Dashboard | ☐ YES / ☐ NO |
| 8 | Square status: "Completed" | ☐ YES / ☐ NO |

**RESULT:** 
- If 7-8 criteria met: ✅ **SUCCESSFUL**
- If 5-6 criteria met: ⚠️ **PARTIAL SUCCESS**
- If <5 criteria met: ❌ **FAILED**

---

## 🎯 Test Payment Record

```
═══════════════════════════════════════════════════════════
TEST PAYMENT SUMMARY
═══════════════════════════════════════════════════════════

Test Date: _______________
Test Time: _______________
Tester Name: _______________

PAYMENT DETAILS:
  Order Number: _______________
  Order Amount: $_______________
  Card Used: 4111 1111 1111 1111
  Fulfillment Method: _______________
  Customer Email: test-customer@example.com

VERIFICATION RESULTS:
  Confirmation Page: ☐ PASS  ☐ FAIL
  Email Delivery: ☐ PASS  ☐ FAIL  ☐ DELAYED
  Square Dashboard: ☐ PASS  ☐ FAIL
  Database Records: ☐ PASS  ☐ FAIL  ☐ N/A

OVERALL RESULT:
  ☐ SUCCESSFUL ✅
  ☐ PARTIAL SUCCESS ⚠️
  ☐ FAILED ❌

NOTES & OBSERVATIONS:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

ISSUES ENCOUNTERED:
_________________________________________________________________
_________________________________________________________________

═══════════════════════════════════════════════════════════
```

---

## 📝 Detailed Notes Section

```
STEP-BY-STEP OBSERVATIONS:

Step 1-4 (Browse & Checkout):
_________________________________________________________________

Step 5-7 (Customer Info & Order Review):
_________________________________________________________________

Step 8-10 (Payment Entry & Submission):
_________________________________________________________________

Step 11 (Confirmation Page):
_________________________________________________________________

Step 12 (Email Verification):
_________________________________________________________________

Step 13 (Square Dashboard):
_________________________________________________________________

Step 14 (Database):
_________________________________________________________________

OVERALL OBSERVATIONS:
_________________________________________________________________
```

---

## 🚨 Troubleshooting During Test

If any step fails, use this quick reference:

| Issue | Solution | Step |
|-------|----------|------|
| Page doesn't load | Hard refresh Ctrl+Shift+R | 1 |
| Cart doesn't work | Reload page, try again | 3 |
| Card form missing | Clear cache, hard refresh | 8 |
| Card entry fails | Check number: 4111... Exp: 12/25 | 9 |
| Payment fails | Check server logs, try again | 10 |
| Email delayed | Check spam, wait 2 min, refresh | 12 |
| Not in Square | Refresh dashboard, check Sandbox | 13 |

---

## ⏭️ Next Steps

### If Phase 2 SUCCESSFUL ✅
1. Document results (this checklist)
2. Take screenshots of:
   - Confirmation page
   - Email
   - Square Dashboard
3. **Optional:** Proceed to Phase 3 (error scenarios)

### If Phase 2 PARTIAL ⚠️
1. Document which parts failed
2. Identify issue
3. Retry failed step
4. Document findings

### If Phase 2 FAILED ❌
1. Check server logs: `tail -f /tmp/server.log | grep -i payment`
2. Review troubleshooting guide
3. Retry entire test
4. Contact support if persists

---

## 📞 Support Commands

```bash
# Check server
curl http://localhost:3000/api/square/config

# View logs (real-time)
tail -f /tmp/server.log | grep -i payment

# Check database
mongo gratog
db.orders.find({ status: "paid" }).pretty()
db.payments.find().pretty()

# Stop server
ps aux | grep "next dev" | grep -v grep | awk '{print $2}' | xargs kill -9

# Restart server
npm run dev
```

---

## 🎯 When Done

After completing Phase 2:

1. ✅ Save this checklist with results
2. ✅ Take screenshots of key screens
3. ✅ Review all success criteria
4. ✅ Decide on Phase 3 (optional error testing)
5. ✅ Document in final report

---

**Status:** 🟡 Ready to Execute  
**Duration:** 25 minutes  
**Confidence:** HIGH  
**Risk:** LOW

**Ready to start? Begin at Step 1: Open Browser to http://localhost:3000**
