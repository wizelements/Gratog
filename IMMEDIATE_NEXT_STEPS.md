# 📋 IMMEDIATE NEXT STEPS
## Payment Fixes - What Needs to Happen Next

---

## STATUS: 6/7 Fixes Complete ✅

All code changes are done. Now we need testing & deployment.

---

## PHASE 1: CODE REVIEW (30 minutes)

### Before Merging PR:
- [ ] **Review each modified file:**
  - `lib/square-rest.ts` - Check timeout implementation
  - `components/checkout/SquarePaymentForm.tsx` - Check both timeouts
  - `app/api/webhooks/square/route.ts` - Check dedup logic
  - `app/api/payments/route.ts` - Check trace ID usage
  - `next.config.js` - Check CSP headers
  - `lib/square-retry.ts` - Review retry logic
  - `lib/request-context.ts` - Review trace ID context

- [ ] **Verify:**
  - No console.errors in modified code
  - All imports are correct
  - No breaking changes to existing code
  - Comments explain WHY each change exists

- [ ] **Check timeout values are reasonable:**
  - Backend: 8 seconds ✓
  - SDK: 10 seconds ✓
  - Browser: 15 seconds ✓

---

## PHASE 2: LOCAL TESTING (45 minutes)

### Run Test Suite:
```bash
# Install dependencies (if needed)
npm install

# Type checking
npm run typecheck

# Unit tests (existing)
npm run test:unit

# E2E smoke tests (existing)
npm run test:e2e:smoke
```

### Expected Results:
- [ ] `npm run typecheck` - No errors
- [ ] `npm run test:unit` - All pass
- [ ] `npm run test:e2e:smoke` - At least 80% pass

### If Tests Fail:
- Check error messages
- Most common: import issues (fix file paths)
- Second common: timeout too aggressive (increase by 2s)
- Third: CSP headers blocking (add domain to CSP)

---

## PHASE 3: MANUAL SMOKE TESTS (15 minutes)

**Do NOT deploy to production before these pass:**

### 3.1: Start Dev Server
```bash
npm run dev
# Should start without errors
# Open http://localhost:3000 in browser
```

### 3.2: Test Normal Payment
1. Add item to cart
2. Go to checkout
3. Enter sandbox card: **4532 0155 0016 4662**
4. Click "Pay"
5. **Expected:** Success within 2-3 seconds
6. **Check trace ID in DevTools:**
   - Open Network tab
   - Look for POST to `/api/payments`
   - Click "Response" tab
   - Should see `"traceId": "trace_..."`

### 3.3: Test SDK Load
1. Open DevTools > Network
2. Throttle to "Slow 3G"
3. Reload page
4. Watch network tab for Square SDK load
5. **Expected:** Either loads or shows timeout error (not hang)

### 3.4: Test Error Handling
1. Use invalid card: **4000002500001001** (declined card)
2. Click "Pay"
3. **Expected:** Clear error message within 5 seconds
4. Check browser console - should see error logged

### 3.5: Test Webhook (Manual)
This requires test access to Square Dashboard - skip if not available.

---

## PHASE 4: ENVIRONMENT SETUP (15 minutes)

**Before deploying to production, verify Vercel environment:**

### 4.1: Check Vercel Environment Variables
Go to Vercel Dashboard > [Project] > Settings > Environment Variables

**Must exist:**
- [ ] `SQUARE_ACCESS_TOKEN` - **Production token** (starts with `EAAA` or `sq0atp`)
- [ ] `NEXT_PUBLIC_SQUARE_APPLICATION_ID` - Application ID (starts with `sq0idp`)
- [ ] `SQUARE_ENVIRONMENT` - Value: `production` (or `sandbox` for staging)
- [ ] `SQUARE_LOCATION_ID` - Location ID
- [ ] `SQUARE_WEBHOOK_SIGNATURE_KEY` - From Square Dashboard

**How to get:**
1. Log in to Square Dashboard: https://squareup.com/apps
2. Credentials > Production > Copy token
3. Business Info > Locations > Copy location ID
4. Webhooks > Configuration > Copy signature key

### 4.2: Check Square Dashboard
Go to Square Dashboard > Applications

**Verify:**
- [ ] Application ID set ✓
- [ ] Location ID set ✓
- [ ] Webhook endpoint: `https://tasteofgratitude.shop/api/webhooks/square` ✓
- [ ] Webhook events subscribed: `payment.created`, `payment.updated` ✓
- [ ] Webhook signature key matches `SQUARE_WEBHOOK_SIGNATURE_KEY` ✓
- [ ] Domain whitelisted: `tasteofgratitude.shop` ✓
- [ ] Domain whitelisted: `gratog.vercel.app` ✓ (for preview deploys)

---

## PHASE 5: CREATE & REVIEW PR (15 minutes)

### 5.1: Create Pull Request
```bash
git checkout -b fix/payment-timeout-sdk
git add .
git commit -m "CRITICAL: Add payment timeout protection + webhook dedup

- FIX: Add 8s timeout to Square REST API client
- FIX: Add 10s timeout to SDK loading
- FIX: Add 15s timeout to payment request
- FIX: Add webhook event deduplication
- ADD: Retry logic with exponential backoff
- ADD: Request trace IDs for debugging
- ADD: CSP headers for security

These changes eliminate timeout hangs and prevent double-charges
from webhook retries.

Test: Manual smoke tests pass, timeouts work as expected.
Migration: No database schema changes required.
Rollback: Revert commit if any issues."

git push origin fix/payment-timeout-sdk
```

### 5.2: Open PR on GitHub
- Set title: `[CRITICAL] Add payment timeout protection + webhook dedup`
- Set labels: `critical`, `payment`, `security`
- Request review from: Eng lead, QA lead
- Link to: `CRITICAL_FIXES_SUMMARY.md` in description

### 5.3: PR Checklist
```markdown
## Testing
- [ ] All tests pass locally
- [ ] Manual smoke tests complete
- [ ] No timeout errors observed

## Environment
- [ ] Vercel env vars verified
- [ ] Square Dashboard config verified
- [ ] CSP headers tested (no violations)

## Rollback
- [ ] Rollback plan verified
- [ ] Webhook dedup collection can be dropped if needed
- [ ] No production traffic affected
```

---

## PHASE 6: MERGE & DEPLOY (30 minutes)

### 6.1: Get Approval
- [ ] Eng lead code review: ✓ Pass
- [ ] QA lead test review: ✓ Pass
- [ ] No blocking comments

### 6.2: Merge to Main
```bash
# On GitHub: Click "Merge pull request"
# Or via CLI:
git checkout main
git pull
git merge fix/payment-timeout-sdk
git push origin main
```

### 6.3: Vercel Deployment
- [ ] Watch Vercel Dashboard for deployment status
- [ ] Should auto-deploy to production
- [ ] Wait for "Ready" status (2-3 minutes)

### 6.4: Verify Deployment
1. Open https://tasteofgratitude.shop in production
2. Try payment again
3. Verify trace ID in response
4. Check Sentry for errors (should be near-zero for payment)

---

## PHASE 7: MONITORING (Week 1)

### Day 1: Intensive Monitoring
- [ ] Monitor Sentry error dashboard every 30 minutes
- [ ] Watch Vercel logs for payment errors
- [ ] Check MongoDB: orders collection status
- [ ] Check Square Dashboard: payment records

**What to look for:**
- Zero "timeout" errors ✓
- Payment success rate > 98% ✓
- No double-charges ✓
- Webhook dedup working ✓

### Week 1: Ongoing Monitoring
- [ ] Daily error rate check
- [ ] Payment metrics in dashboard
- [ ] Webhook delivery rate
- [ ] Customer feedback about timeouts

**Success Criteria:**
- ✅ 0 timeout errors
- ✅ 99%+ payment success rate
- ✅ <2s P95 latency
- ✅ 100% webhook delivery

---

## TIMELINE

| Phase | Tasks | Time | Owner | Status |
|-------|-------|------|-------|--------|
| 1 | Code Review | 30 min | Eng Lead | ⏳ TODO |
| 2 | Local Testing | 45 min | Dev + QA | ⏳ TODO |
| 3 | Smoke Tests | 15 min | QA | ⏳ TODO |
| 4 | Env Setup | 15 min | DevOps | ⏳ TODO |
| 5 | Create PR | 15 min | Dev | ⏳ TODO |
| 6 | Merge & Deploy | 30 min | Dev + DevOps | ⏳ TODO |
| 7 | Monitoring | Ongoing | Team | ⏳ TODO |

**Total: ~2.5 hours** from code review to production deployment

---

## RISK MITIGATION

### If Tests Fail
- **Timeout too aggressive?** → Increase by 2 seconds
- **Import errors?** → Check file paths, re-run `npm install`
- **CSP blocking?** → Add domain to CSP in `next.config.js`

### If Deployment Issues
- **Vercel build fails?** → Check build logs, likely TypeScript error
- **Environment vars missing?** → Add to Vercel > Settings > Environment Variables
- **Payment fails in production?** → Check trace ID, search Sentry

### If Production Errors
- **Timeout errors still occurring?** → Increase timeout values (too aggressive)
- **Double-charges?** → Check webhook dedup logic, manually inspect `webhook_events_processed`
- **SDK not loading?** → Check CSP errors in DevTools, whitelist domain

### If Need to Rollback
```bash
git revert <commit-hash>
git push  # Auto-deploys to Vercel
# Monitor error rate drop (should be instant)
```

---

## CONTACTS

**If you need help:**
- **Timeout questions:** Check `lib/square-rest.ts` comments
- **SDK loading:** Check `components/checkout/SquarePaymentForm.tsx` comments
- **Webhook dedup:** Check `app/api/webhooks/square/route.ts` comments
- **Trace IDs:** Check `lib/request-context.ts` and usage in `app/api/payments/route.ts`
- **CSP issues:** Check `next.config.js` and Chrome DevTools console

**All code includes inline comments explaining WHY each change exists.**

---

## SUCCESS

Once all steps complete:

✅ Payment timeouts eliminated  
✅ Webhook double-charges prevented  
✅ Debugging traces in place  
✅ Full security headers set  
✅ Team trained on new system  

**Estimated timeline:** 2-3 hours from now

---

**Prepared by:** Amp - Payment Reliability Team  
**Date:** December 20, 2025  
**Status:** Ready for immediate action
