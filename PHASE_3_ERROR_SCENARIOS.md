# Phase 3: Error Scenario Testing
**Comprehensive Error Handling & Edge Case Validation**

**Date:** December 20, 2025 | **Phase:** 3 (Optional) | **Status:** 🟠 Ready (after Phase 2)

---

## 🎯 Overview

**Purpose:** Validate that the payment system properly handles error cases and rejected payments

**Duration:** 40 minutes (optional, after Phase 2 success)

**Requirements:** 
- Phase 2 must be successful first
- Server still running
- Same test environment

**Test Cards:** 4 different scenarios available

---

## 📋 Phase 3 Scenarios

### Scenario A: Declined Card (10 minutes)
### Scenario B: Insufficient Funds (10 minutes)  
### Scenario C: Lost/Stolen Card (10 minutes)
### Scenario D: Multiple Payment Attempts (10 minutes)

---

## 🔴 SCENARIO A: DECLINED CARD (10 minutes)

**Purpose:** Verify payment is properly rejected and order remains pending

**Test Card:**
```
Card Number: 4000 0200 0000 0000
Expiration: 12/25
CVV: 123
ZIP: 12345
Expected Result: ❌ DECLINED
```

### Execution Steps

#### Step 1: Start New Checkout (3 min)
```
Action: Repeat Phase 2 steps 1-7
├─ Navigate to http://localhost:3000
├─ Add 2-3 items to cart
├─ Proceed to checkout
├─ Enter customer info
└─ Select fulfillment method

Expected: Reach payment form
Status: ☐ PASS  ☐ FAIL
```

#### Step 2: Enter Declined Card (2 min)
```
Action: Fill payment form with declined test card
Card Number: 4000 0200 0000 0000
Expiration: 12/25
CVV: 123
ZIP: 12345

Expected: Form accepts input
Status: ☐ PASS  ☐ FAIL

Card entered: ☐ CONFIRMED
```

#### Step 3: Submit Payment (1 min)
```
Action: Click "Pay" button
Expected: Error message appears within 10 seconds

Status: ☐ PASS  ☐ FAIL

Error message visible: ☐ YES
Error says "declined": ☐ YES
```

#### Step 4: Verify Order NOT Updated (2 min)
```
Action: Check that order remains in pending status
Method: Check database or reload page

Expected: 
- Order status: "pending" (NOT "paid")
- No payment record created
- Can retry payment

Status: ☐ PASS  ☐ FAIL

Order status: pending ☐
No payment created: ☐
Can retry: ☐ YES (form still visible)
```

#### Step 5: Verify No Email Sent (2 min)
```
Action: Check email inbox
Expected: NO confirmation email received
Duration: Wait 2 minutes

Status: ☐ PASS  ☐ FAIL

Email received: ☐ NO (correct - test passed)
               ☐ YES (incorrect - payment should fail)
```

### Scenario A Results
```
DECLINED CARD TEST RESULTS:

Error message shown: ☐ YES / ☐ NO
Error mentions "declined": ☐ YES / ☐ NO
Order status "pending": ☐ YES / ☐ NO
No payment created: ☐ YES / ☐ NO
No email sent: ☐ YES / ☐ NO
Can retry: ☐ YES / ☐ NO

Overall: ☐ PASS ✅ / ☐ FAIL ❌
```

---

## ⚠️ SCENARIO B: INSUFFICIENT FUNDS (10 minutes)

**Purpose:** Verify insufficient funds error is properly handled

**Test Card:**
```
Card Number: 4000 0300 0000 0000
Expiration: 12/25
CVV: 123
ZIP: 12345
Expected Result: ⚠️ INSUFFICIENT FUNDS ERROR
```

### Execution Steps

#### Step 1: Start New Checkout (3 min)
```
Action: Begin new payment flow
└─ Navigate to cart (fresh items)
└─ Add items
└─ Complete customer info & fulfillment
└─ Reach payment form

Status: ☐ PASS  ☐ FAIL
```

#### Step 2: Enter Insufficient Funds Card (2 min)
```
Action: Fill payment form
Card Number: 4000 0300 0000 0000
Expiration: 12/25
CVV: 123
ZIP: 12345

Status: ☐ PASS  ☐ FAIL
Card entered: ☐ CONFIRMED
```

#### Step 3: Submit Payment (1 min)
```
Action: Click "Pay"
Expected: Error about insufficient funds

Status: ☐ PASS  ☐ FAIL

Error appears: ☐ YES
Error message: ________________________________________
```

#### Step 4: Verify Order Remains Pending (2 min)
```
Action: Check order status
Expected: Still "pending", not "paid"

Status: ☐ PASS  ☐ FAIL

Order status: pending ☐
Payment record created: ☐ NO (correct)
```

#### Step 5: Retry with Valid Card (2 min)
```
Action: Clear form and enter valid card
Card: 4111 1111 1111 1111
Exp: 12/25
CVV: 123

Expected: Payment processes successfully this time

Status: ☐ PASS  ☐ FAIL

Valid card accepted: ☐ YES
Payment successful: ☐ YES
Confirmation appears: ☐ YES
```

### Scenario B Results
```
INSUFFICIENT FUNDS TEST RESULTS:

Error shown: ☐ YES / ☐ NO
Correct error message: ☐ YES / ☐ NO
Order status "pending": ☐ YES / ☐ NO
Retry successful: ☐ YES / ☐ NO
No duplicate charge: ☐ YES / ☐ NO

Overall: ☐ PASS ✅ / ☐ FAIL ❌
```

---

## 🔒 SCENARIO C: LOST/STOLEN CARD (10 minutes)

**Purpose:** Verify lost/stolen card is properly rejected

**Test Card:**
```
Card Number: 4000 0400 0000 0000
Expiration: 12/25
CVV: 123
ZIP: 12345
Expected Result: 🔒 LOST/STOLEN CARD ERROR
```

### Execution Steps

#### Step 1: Start Checkout (3 min)
```
Action: Fresh checkout flow
└─ Add items to cart
└─ Complete customer information
└─ Select fulfillment
└─ Reach payment form

Status: ☐ PASS  ☐ FAIL
```

#### Step 2: Enter Lost Card (2 min)
```
Action: Fill payment form
Card: 4000 0400 0000 0000
Exp: 12/25
CVV: 123

Status: ☐ PASS  ☐ FAIL
Entered: ☐ YES
```

#### Step 3: Submit Payment (1 min)
```
Action: Click "Pay"
Expected: Lost/stolen card error

Status: ☐ PASS  ☐ FAIL

Error shown: ☐ YES
Error type: lost/stolen card ☐
```

#### Step 4: Verify No Payment Created (2 min)
```
Action: Check system state
Expected: 
- No payment record
- Order still pending
- No email sent

Status: ☐ PASS  ☐ FAIL

No payment: ☐ YES
Pending order: ☐ YES
No email: ☐ YES
```

#### Step 5: Can Retry (2 min)
```
Action: Try different card
Card: 4111 1111 1111 1111
Expected: Succeeds

Status: ☐ PASS  ☐ FAIL

Successful: ☐ YES
```

### Scenario C Results
```
LOST/STOLEN CARD TEST RESULTS:

Error shown: ☐ YES / ☐ NO
Correct error: ☐ YES / ☐ NO
No payment created: ☐ YES / ☐ NO
Order pending: ☐ YES / ☐ NO
Can retry: ☐ YES / ☐ NO

Overall: ☐ PASS ✅ / ☐ FAIL ❌
```

---

## 📊 SCENARIO D: MULTIPLE PAYMENT ATTEMPTS (10 minutes)

**Purpose:** Verify proper handling of:
- Multiple payments with same customer
- Duplicate prevention
- Order linking

### Execution Steps

#### Step 1: First Payment - Success (5 min)
```
Action: Complete successful payment
Card: 4111 1111 1111 1111

Status: ☐ PASS  ☐ FAIL

Order 1:
  Order ID: _______________
  Status: paid ☐
  Email received: ☐ YES
  Amount: $_______________
```

#### Step 2: Second Payment - Different Customer, Same Card (3 min)
```
Action: New checkout with different customer
Card: 4111 1111 1111 1111
Email: test-customer-2@example.com

Status: ☐ PASS  ☐ FAIL

Order 2:
  Order ID: _______________
  Status: paid ☐
  Different from Order 1: ☐ YES
```

#### Step 3: Verify No Duplicate Charges (2 min)
```
Action: Check Square Dashboard
Expected: 2 separate transactions

Status: ☐ PASS  ☐ FAIL

Transaction 1 visible: ☐ YES
Transaction 2 visible: ☐ YES
Separate records: ☐ YES
No duplicates: ☐ YES
Total charges: 2 ☐
```

### Scenario D Results
```
MULTIPLE PAYMENTS TEST RESULTS:

Payment 1 successful: ☐ YES / ☐ NO
Payment 2 successful: ☐ YES / ☐ NO
Both visible in Square: ☐ YES / ☐ NO
No duplicates: ☐ YES / ☐ NO
Database records correct: ☐ YES / ☐ NO

Overall: ☐ PASS ✅ / ☐ FAIL ❌
```

---

## ✅ ERROR SCENARIO VERIFICATION CHECKLIST

### Scenario A: Declined Card
- [ ] Error message displayed
- [ ] Order remains "pending"
- [ ] No payment record created
- [ ] No email sent
- [ ] Can retry with different card
- [ ] **Result:** ☐ PASS / ☐ FAIL

### Scenario B: Insufficient Funds
- [ ] Error message displayed
- [ ] Order remains "pending"
- [ ] No payment record created
- [ ] Retry with valid card succeeds
- [ ] No duplicate charge
- [ ] **Result:** ☐ PASS / ☐ FAIL

### Scenario C: Lost/Stolen Card
- [ ] Error message displayed
- [ ] Order remains "pending"
- [ ] No payment record created
- [ ] Can retry successfully
- [ ] No email sent
- [ ] **Result:** ☐ PASS / ☐ FAIL

### Scenario D: Multiple Payments
- [ ] Payment 1 successful & recorded
- [ ] Payment 2 successful & recorded
- [ ] Both visible in Square Dashboard
- [ ] No duplicate charges
- [ ] Separate order records
- [ ] **Result:** ☐ PASS / ☐ FAIL

---

## 📊 PHASE 3 SUMMARY

```
SCENARIO A: Declined Card
Status: ☐ PASS  ☐ FAIL
Time: ___ minutes

SCENARIO B: Insufficient Funds
Status: ☐ PASS  ☐ FAIL
Time: ___ minutes

SCENARIO C: Lost/Stolen Card
Status: ☐ PASS  ☐ FAIL
Time: ___ minutes

SCENARIO D: Multiple Payments
Status: ☐ PASS  ☐ FAIL
Time: ___ minutes

═══════════════════════════════════════════
PHASE 3 OVERALL RESULT:

Scenarios Passed: ___ / 4
Pass Rate: ____%

☐ ALL PASSED (100%) ✅
☐ MOSTLY PASSED (75%+) ✅
☐ SOME FAILURES (<75%) ⚠️
```

---

## 🎯 Success Criteria for Phase 3

**Phase 3 is SUCCESSFUL if:**

| Scenario | Criterion | Status |
|----------|-----------|--------|
| A | Error shown + order pending | ☐ YES |
| B | Error shown + can retry | ☐ YES |
| C | Error shown + no payment | ☐ YES |
| D | 2 payments + no dupes | ☐ YES |

**Minimum:** 3/4 scenarios passing = ✅ SUCCESS

---

## 📝 Error Scenario Notes

```
SCENARIO A - DECLINED CARD:
_________________________________________________________________

SCENARIO B - INSUFFICIENT FUNDS:
_________________________________________________________________

SCENARIO C - LOST/STOLEN CARD:
_________________________________________________________________

SCENARIO D - MULTIPLE PAYMENTS:
_________________________________________________________________

GENERAL OBSERVATIONS:
_________________________________________________________________

UNEXPECTED BEHAVIOR:
_________________________________________________________________
```

---

## 🐛 Common Issues in Error Testing

| Issue | Expected | Actual | Solution |
|-------|----------|--------|----------|
| Error not shown | Error message | Page goes blank | Check logs, page refresh |
| Email sent on error | None | Received | Bug in logic |
| Order marked paid | Pending | Paid | Bug in error handling |
| Duplicate charge | 1 charge | 2 charges | Idempotency issue |
| Can't retry | Form still open | Form closed | Page reload needed |

---

## ⏭️ After Phase 3

### If All Scenarios Pass ✅
1. Error handling is robust
2. System properly rejects invalid payments
3. Orders protected from invalid charges
4. Ready for production

### If Some Scenarios Fail ⚠️
1. Identify specific failures
2. Review error handling code
3. Check server logs for details
4. Fix and re-test

### Error Logs to Check
```bash
# View payment processing logs
tail -f /tmp/server.log | grep -i "error\|payment"

# Check specific payment
db.payments.find({ status: { $ne: "COMPLETED" } }).pretty()
```

---

## 📞 Debugging Commands

```bash
# View all error logs
tail -100 /tmp/server.log | grep -i error

# Monitor real-time
tail -f /tmp/server.log

# Check all orders (paid and pending)
mongo gratog
db.orders.find({}, { orderId: 1, status: 1, createdAt: 1 }).pretty()

# Check all payments
db.payments.find({}, { squarePaymentId: 1, status: 1, createdAt: 1 }).pretty()

# Count by status
db.orders.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }])
```

---

## 🎯 Phase 3 Workflow

```
START PHASE 3
│
├─ Scenario A: Declined Card (10 min)
│  ├─ Checkout flow
│  ├─ Enter 4000 0200 0000 0000
│  ├─ Verify error
│  └─ ☐ PASS / FAIL
│
├─ Scenario B: Insufficient Funds (10 min)
│  ├─ Checkout flow
│  ├─ Enter 4000 0300 0000 0000
│  ├─ Verify error
│  ├─ Retry with valid card
│  └─ ☐ PASS / FAIL
│
├─ Scenario C: Lost Card (10 min)
│  ├─ Checkout flow
│  ├─ Enter 4000 0400 0000 0000
│  ├─ Verify error
│  └─ ☐ PASS / FAIL
│
├─ Scenario D: Multiple Payments (10 min)
│  ├─ Payment 1: Success
│  ├─ Payment 2: Success
│  ├─ Verify no dupes
│  └─ ☐ PASS / FAIL
│
└─ PHASE 3 COMPLETE
   Results: ___ / 4 passed
```

---

## 📊 Phase 3 Final Report Template

```
═══════════════════════════════════════════════════════════
PHASE 3: ERROR SCENARIO TESTING - FINAL REPORT
═══════════════════════════════════════════════════════════

Date: _______________
Tester: _______________
Duration: ___ minutes

SCENARIO RESULTS:
├─ A (Declined): ☐ PASS  ☐ FAIL
├─ B (Insufficient): ☐ PASS  ☐ FAIL
├─ C (Lost Card): ☐ PASS  ☐ FAIL
└─ D (Multiple): ☐ PASS  ☐ FAIL

PASS RATE: ___ / 4 (_%)

ISSUES FOUND:
_________________________________________________________________
_________________________________________________________________

RECOMMENDATIONS:
_________________________________________________________________
_________________________________________________________________

OVERALL ASSESSMENT:
☐ Error handling is robust
☐ Minor issues found
☐ Major issues found

═══════════════════════════════════════════════════════════
```

---

**Status:** 🟠 Phase 3 (Optional, execute after Phase 2 success)

**Next:** Execute Phase 2 first, then return here for Phase 3

**Total Testing Time:** Phase 1 (5 min) + Phase 2 (25 min) + Phase 3 (40 min) = **70 minutes complete**
