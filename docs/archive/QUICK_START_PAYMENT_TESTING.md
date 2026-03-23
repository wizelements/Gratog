# Quick Start: Payment Testing Reference Card

## 🟢 Phase 1: API Tests - COMPLETE ✅

```bash
bash test-sandbox-payments.sh
```

**Results:**
- ✅ Configuration endpoint: 200 OK
- ✅ Error handling: 400 status codes
- ✅ Validation: Working
- ✅ Performance: 55ms (excellent)
- ✅ 7/7 tests passing

---

## 🟡 Phase 2: Browser Testing - READY

### Start Here
```
URL: http://localhost:3000
```

### Quick Test (15 minutes)
1. Add 2-3 items to cart
2. Checkout → Guest checkout
3. Email: test-customer@example.com
4. Fulfillment: Pickup at Market
5. Card: 4111 1111 1111 1111
6. Exp: 12/25 | CVV: 123 | ZIP: 12345
7. Click "Pay"
8. ✅ Confirmation page = SUCCESS

### Verify Results (10 minutes)
- [ ] Confirmation shows order #, amount
- [ ] Check email inbox (test-customer@example.com)
  - Should arrive < 2 min
  - From: noreply@gratog.com
- [ ] Square Dashboard: https://connect.squareupsandbox.com
  - Find payment in Transactions > Payments
  - Status: Completed
  - Amount: Correct

---

## 📋 Test Cards

| Purpose | Card | Result |
|---------|------|--------|
| ✅ Success | 4111 1111 1111 1111 | Payment approved |
| ❌ Decline | 4000 0200 0000 0000 | Payment declined |
| ⚠️ Insufficient | 4000 0300 0000 0000 | Insufficient funds |

**All cards:**
- Exp: 12/25 (any future date)
- CVV: 123 (any 3 digits)
- ZIP: 12345

---

## 🛠️ Commands

### Monitor Server
```bash
# Check if running
curl http://localhost:3000/api/square/config

# View payment logs
tail -f /tmp/server.log | grep -i payment

# Check database (if accessible)
mongo gratog
db.orders.find({ status: "paid" }).pretty()
db.payments.find().pretty()
```

### Square Dashboard
```
Sandbox: https://connect.squareupsandbox.com
Live: https://connect.squareup.com
```

---

## ✅ Success Checklist

### Before Payment
- [ ] http://localhost:3000 loads
- [ ] Products display
- [ ] Cart works
- [ ] Checkout accessible

### During Payment
- [ ] Card form loads
- [ ] Form accepts input
- [ ] "Pay" button clickable
- [ ] Loading spinner appears
- [ ] Payment processes (3-10 sec)

### After Payment
- [ ] Confirmation page appears
- [ ] Order # displayed
- [ ] Amount correct
- [ ] No errors shown

### Verification
- [ ] Email received < 2 min
- [ ] Contains order details
- [ ] Square Dashboard shows payment
- [ ] Status: Completed

---

## ⚠️ Troubleshooting

**Card form doesn't load?**
→ Hard refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)

**Payment fails with 400?**
→ Check card: 4111 1111 1111 1111, Exp: 12/25

**Payment fails with 503?**
→ Check: https://status.square.com

**Email not received?**
→ Check spam folder, wait up to 2 min

**Order not in database?**
→ Verify payment succeeded on confirmation page

---

## 📊 Summary

| Phase | Status | Duration | What's Next |
|-------|--------|----------|------------|
| 1: API | ✅ Complete | 5 min | Done |
| 2a: Payment | 🟡 Ready | 15 min | Open browser |
| 2b: Verify | 🟡 Ready | 10 min | Check email/Square |
| 2c: Errors | 🟠 Optional | 10 min | Test declined card |
| 2d: Multiple | 🟠 Optional | 20 min | Run 3+ payments |

**Total minimum time:** 30 minutes (Phase 1 + 2a + 2b)

---

## 🎯 Goal

**Verify the complete payment flow works end-to-end:**
1. ✅ Customer adds items
2. ✅ Enters payment card
3. ✅ Payment processes
4. ✅ Gets confirmation
5. ✅ Receives email
6. ✅ Payment appears in Square Dashboard

---

## 📞 Key Files

- **API:** `/app/api/payments/route.ts`
- **Form:** `/components/checkout/SquarePaymentForm.tsx`
- **Config:** `/app/api/square/config/route.ts`
- **Full Guide:** `/TESTING_EXECUTION_SUMMARY.md`

---

**Status:** 🟡 Ready for browser testing  
**Start:** http://localhost:3000  
**Time:** 30 minutes minimum  
**Risk:** Low (Sandbox environment)

