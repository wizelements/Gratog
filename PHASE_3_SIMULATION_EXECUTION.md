# Phase 3: Error Scenarios - Simulation & Execution Guide
**What Error Testing Looks Like + Personal Execution Checklist**

**Date:** December 20, 2025 | **Phase:** 3 (Optional) | **Duration:** 40 minutes

---

## ⚠️ WHEN TO EXECUTE PHASE 3

**ONLY if Phase 2 was successful (7+/8 criteria passed)**

If Phase 2 failed: Skip Phase 3, go to Phase 4

---

## 🎯 WHAT PHASE 3 TESTS

Testing how payment system handles errors:
- Declined cards → should show error, order stays pending
- Insufficient funds → should show error, can retry
- Lost/stolen cards → should show error, no payment created
- Multiple payments → should create separate records, no duplicates

---

## 📊 PART 1: ERROR SCENARIO SIMULATIONS

---

### SCENARIO A: DECLINED CARD (10 minutes)

#### What Happens (Simulation)

**Steps (same as Phase 2, steps 1-9):**
1. Navigate to http://localhost:3000
2. Add items to cart
3. Checkout (customer info & fulfillment)
4. Fill payment form with **DECLINED test card**:
   - Card: **4000 0200 0000 0000** ← Different card!
   - Exp: 12/25
   - CVV: 123
   - ZIP: 12345

**What you should see (DECLINED - expected!):**

```
┌─────────────────────────────────────────────────────────┐
│ Payment Processing...                                    │
│                                                          │
│ ⟳ Loading... ⟳                                         │
│                                                          │
└─────────────────────────────────────────────────────────┘

[After 5-10 seconds...]

┌─────────────────────────────────────────────────────────┐
│ ✗ PAYMENT DECLINED                                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Your payment has been declined.                         │
│                                                          │
│ Error: Card was declined by issuer                     │
│                                                          │
│ Please try another payment method or contact your bank. │
│                                                          │
│ [RETRY]  [USE DIFFERENT CARD]  [CANCEL]               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**What should NOT happen:**
- ❌ No confirmation page
- ❌ No email sent
- ❌ No order status change to "paid"
- ❌ No payment record created

**Verification (expected):**
```
Order status: pending (NOT paid)
Email received: NO (correct behavior)
Payment in Square: NO (correct, no payment created)
```

**Status:** ✅ PASS (error properly handled)

---

#### Your Execution: Scenario A

```
SCENARIO A: DECLINED CARD

TEST CARD: 4000 0200 0000 0000

ACTION: Repeat checkout steps 1-9 with declined card

EXPECTED: Error message "declined"

ACTUAL RESULTS:
  Error message visible: ☐ YES  ☐ NO
  Error says "declined": ☐ YES  ☐ NO
  Error description: __________________________________

NEXT ACTION AVAILABLE:
  ☐ Retry button
  ☐ Try different card
  ☐ Cancel button

VERIFICATION (post-error):
  Order still pending: ☐ YES  ☐ NO
  Email sent: ☐ NO (correct)  ☐ YES (wrong)
  Payment created: ☐ NO (correct)  ☐ YES (wrong)

SCENARIO A RESULT:
  ☐ ✅ PASS (error properly handled)
  ☐ ❌ FAIL (unexpected behavior)

NOTES: _____________________________________________
```

---

### SCENARIO B: INSUFFICIENT FUNDS (10 minutes)

#### What Happens (Simulation)

**Steps (same as Phase 2, steps 1-9, but with different card):**
1. Start fresh checkout
2. Add items to cart
3. Proceed to payment form
4. Fill payment with **INSUFFICIENT FUNDS card**:
   - Card: **4000 0300 0000 0000** ← Different card!
   - Exp: 12/25
   - CVV: 123
   - ZIP: 12345

**What you should see (INSUFFICIENT FUNDS - expected!):**

```
┌─────────────────────────────────────────────────────────┐
│ Payment Processing...                                    │
│                                                          │
│ ⟳ Loading... ⟳                                         │
│                                                          │
└─────────────────────────────────────────────────────────┘

[After 5-10 seconds...]

┌─────────────────────────────────────────────────────────┐
│ ✗ INSUFFICIENT FUNDS                                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ This card does not have sufficient funds.              │
│                                                          │
│ Error: Insufficient funds available on card            │
│                                                          │
│ Please try another payment method.                      │
│                                                          │
│ [RETRY]  [USE DIFFERENT CARD]  [CANCEL]               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Then: RETRY WITH VALID CARD:**
- Click [RETRY] or [USE DIFFERENT CARD]
- Enter valid test card: 4111 1111 1111 1111
- Should succeed (like Phase 2)

**Success sequence:**
```
1. First payment (4000 0300...) → ERROR ✓
2. Retry with valid (4111...) → SUCCESS ✓
3. Only ONE payment created (no duplicates) ✓
4. Email sent only for success ✓
5. Square shows only successful payment ✓
```

**Status:** ✅ PASS (error recovered properly)

---

#### Your Execution: Scenario B

```
SCENARIO B: INSUFFICIENT FUNDS

TEST CARD: 4000 0300 0000 0000

ACTION: Attempt checkout, get error, retry with valid card

EXPECTED: Error → Retry succeeds → One payment only

FIRST ATTEMPT (Insufficient Funds):
  Error message visible: ☐ YES  ☐ NO
  Error mentions "insufficient": ☐ YES  ☐ NO
  Retry available: ☐ YES  ☐ NO

SECOND ATTEMPT (Valid Card - 4111 1111 1111 1111):
  Retry button clicked: ☐ YES
  Card form cleared: ☐ YES  ☐ NO
  Can enter new card: ☐ YES  ☐ NO
  
  New payment succeeds: ☐ YES  ☐ NO
  Confirmation appears: ☐ YES  ☐ NO

VERIFICATION (post-recovery):
  NO duplicate charges: ☐ YES (correct)  ☐ NO (wrong)
  Only 1 payment in Square: ☐ YES  ☐ NO
  Email sent: ☐ YES (only for success)  ☐ NO
  Order status: paid ☐ (for successful retry)

SCENARIO B RESULT:
  ☐ ✅ PASS (error recovered, no duplicate)
  ☐ ❌ FAIL (unexpected behavior)

NOTES: _____________________________________________
```

---

### SCENARIO C: LOST/STOLEN CARD (10 minutes)

#### What Happens (Simulation)

**Steps (same as Phase 2, steps 1-9, but with card error):**
1. Start fresh checkout
2. Add items to cart
3. Proceed to payment form
4. Fill payment with **LOST CARD**:
   - Card: **4000 0400 0000 0000** ← Different card!
   - Exp: 12/25
   - CVV: 123
   - ZIP: 12345

**What you should see (LOST CARD - expected!):**

```
┌─────────────────────────────────────────────────────────┐
│ Payment Processing...                                    │
│                                                          │
│ ⟳ Loading... ⟳                                         │
│                                                          │
└─────────────────────────────────────────────────────────┘

[After 5-10 seconds...]

┌─────────────────────────────────────────────────────────┐
│ ✗ CARD ERROR                                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ This card cannot be used for this transaction.         │
│                                                          │
│ Error: Lost or stolen card                             │
│                                                          │
│ Please try a different payment method.                 │
│                                                          │
│ [RETRY]  [USE DIFFERENT CARD]  [CANCEL]               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Then: USE VALID CARD:**
- Click [USE DIFFERENT CARD]
- Enter valid test card: 4111 1111 1111 1111
- Should succeed

**Status:** ✅ PASS (error handled, recovery works)

---

#### Your Execution: Scenario C

```
SCENARIO C: LOST/STOLEN CARD

TEST CARD: 4000 0400 0000 0000

ACTION: Attempt checkout with lost card, retry with valid

EXPECTED: Error → Retry succeeds → One payment only

FIRST ATTEMPT (Lost Card):
  Error message visible: ☐ YES  ☐ NO
  Error mentions "lost" or "stolen": ☐ YES  ☐ NO
  Can retry: ☐ YES  ☐ NO

SECOND ATTEMPT (Valid Card):
  New card form available: ☐ YES  ☐ NO
  Valid card (4111...) succeeds: ☐ YES  ☐ NO
  Confirmation appears: ☐ YES  ☐ NO

VERIFICATION (post-recovery):
  No duplicate charges: ☐ YES (correct)  ☐ NO (wrong)
  Only 1 payment in Square: ☐ YES  ☐ NO
  Order status: paid ☐
  Email sent: ☐ YES  ☐ NO

SCENARIO C RESULT:
  ☐ ✅ PASS (error handled correctly)
  ☐ ❌ FAIL (unexpected behavior)

NOTES: _____________________________________________
```

---

### SCENARIO D: MULTIPLE PAYMENTS (10 minutes)

#### What Happens (Simulation)

**Steps:**
1. **Payment 1:** Complete successful payment
   - Customer: test-customer@example.com
   - Card: 4111 1111 1111 1111
   - Result: SUCCESS ✓

2. **Payment 2:** New checkout, different customer
   - Customer: test-customer-2@example.com
   - Card: 4111 1111 1111 1111 (same card)
   - Result: SUCCESS ✓

3. **Verification:** Check that both payments exist

**What you should see in Square Dashboard:**

```
┌─────────────────────────────────────────────────────────┐
│ Square Dashboard - Transactions                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ RECENT PAYMENTS:                                        │
│                                                          │
│ 1. Order #order-20251220-47293                         │
│    Amount: $41.56                                      │
│    Card: Visa 1111                                     │
│    Status: COMPLETED                                   │
│    Time: Today 11:47 PM                                │
│                                                          │
│ 2. Order #order-20251220-47294 (NEW)                   │
│    Amount: $38.99                                      │
│    Card: Visa 1111                                     │
│    Status: COMPLETED                                   │
│    Time: Today 11:52 PM                                │
│                                                          │
│ [Earlier transactions...]                              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Key verification:**
- ✅ 2 separate payment records
- ✅ 2 different order IDs
- ✅ 2 different transactions in Square
- ✅ Same card but different payments (NOT duplicates)
- ✅ Both have COMPLETED status
- ✅ Both visible in dashboard

**Status:** ✅ PASS (multiple payments work correctly)

---

#### Your Execution: Scenario D

```
SCENARIO D: MULTIPLE PAYMENTS

FIRST PAYMENT:
  Customer: test-customer@example.com
  Card: 4111 1111 1111 1111
  
  Order placed: ☐ YES
  Confirmation received: ☐ YES
  Order ID: __________________
  Amount: $__________
  Status: ✓ COMPLETED ☐

SECOND PAYMENT:
  Customer: test-customer-2@example.com (or your email)
  Card: 4111 1111 1111 1111
  
  Order placed: ☐ YES
  Confirmation received: ☐ YES
  Order ID: __________________
  Amount: $__________
  Status: ✓ COMPLETED ☐

VERIFICATION (Square Dashboard):
  Payment 1 visible: ☐ YES
  Payment 2 visible: ☐ YES
  Both are separate: ☐ YES  ☐ NO
  No duplicate charges: ☐ YES (2 payments total, not 3 or 4)
  Both show COMPLETED: ☐ YES

DATABASE CHECK (if accessible):
  Order 1 found: ☐ YES  ☐ NO
  Order 2 found: ☐ YES  ☐ NO
  Both marked "paid": ☐ YES  ☐ NO
  No duplicates: ☐ YES  ☐ NO

SCENARIO D RESULT:
  ☐ ✅ PASS (multiple payments work)
  ☐ ❌ FAIL (unexpected behavior)

NOTES: _____________________________________________
```

---

## 📊 PHASE 3 FINAL RESULTS

### All Scenarios Summary

```
SCENARIO A: Declined Card
  Status: ☐ PASS  ☐ FAIL
  Error handling: ☐ Correct  ☐ Wrong
  Notes: ________________________________________

SCENARIO B: Insufficient Funds
  Status: ☐ PASS  ☐ FAIL
  Recovery works: ☐ YES  ☐ NO
  No duplicates: ☐ YES  ☐ NO
  Notes: ________________________________________

SCENARIO C: Lost/Stolen Card
  Status: ☐ PASS  ☐ FAIL
  Error handling: ☐ Correct  ☐ Wrong
  Recovery works: ☐ YES  ☐ NO
  Notes: ________________________________________

SCENARIO D: Multiple Payments
  Status: ☐ PASS  ☐ FAIL
  Separate records: ☐ YES  ☐ NO
  No duplicates: ☐ YES  ☐ NO
  Notes: ________________________________________

═══════════════════════════════════════════════════════

PHASE 3 OVERALL:
  Scenarios passed: ___ / 4
  Pass rate: ___%

  ☐ ✅ ALL PASSED (100%)
  ☐ ✅ MOSTLY PASSED (75%+)
  ☐ ⚠️  SOME FAILURES (50-74%)
  ☐ ❌ MOSTLY FAILED (<50%)
```

### Issues & Analysis

```
ISSUES ENCOUNTERED:
_________________________________________________________________
_________________________________________________________________

ROOT CAUSES (if issues):
_________________________________________________________________
_________________________________________________________________

RESOLUTIONS ATTEMPTED:
_________________________________________________________________
_________________________________________________________________

IMPACT ASSESSMENT:
  ☐ Critical (blocks production)
  ☐ Major (needs fixing before production)
  ☐ Minor (nice to fix, not blocking)
  ☐ No issues
```

---

## ⏭️ NEXT STEPS

**If Phase 3 mostly successful (3-4/4 scenarios):**
→ Proceed to Phase 4 (final report)

**If Phase 3 has issues:**
→ Document findings
→ May need code fixes
→ Retest after fixes
→ Then Phase 4

---

**Phase 3 Complete. Ready for Phase 4?**
