# 🚀 DEPLOYMENT & MONITORING GUIDE

Step-by-step guide to safely deploy payment fixes and monitor production.

---

## PRE-DEPLOYMENT CHECKLIST

### Code Review & Testing (Day 1-2)

- [ ] All patches applied and verified
- [ ] No TypeScript errors: `npm run typecheck`
- [ ] No lint errors: `npm run lint`
- [ ] Unit tests pass: `npm run test:unit`
- [ ] All tests pass: `npm run verify`
- [ ] Code reviewed and approved by 1+ team member
- [ ] No merge conflicts with main branch

### Environment Setup (DevOps)

- [ ] Staging environment ready (e.g., `staging.vercel.app`)
- [ ] Production environment ready (e.g., `tasteofgratitude.shop`)
- [ ] Monitoring/alerting systems ready (Sentry, Vercel Analytics)
- [ ] Database backups taken
- [ ] Rollback plan documented

### Square Dashboard Configuration (CRITICAL)

**Sandbox Environment:**
1. Go to: https://developer.squareup.com/apps
2. Select your sandbox app
3. Go to **Credentials** → Copy:
   - Access Token → `SQUARE_ACCESS_TOKEN_SANDBOX`
   - Application ID → `NEXT_PUBLIC_SQUARE_APPLICATION_ID_SANDBOX`

**Production Environment:**
1. Go to: https://developer.squareup.com/apps
2. Select your production app
3. Go to **Credentials** → Copy:
   - Access Token → `SQUARE_ACCESS_TOKEN_PROD`
   - Application ID → `NEXT_PUBLIC_SQUARE_APPLICATION_ID_PROD`

**Webhook Setup:**
1. Go to: **Developers** → **Webhooks**
2. Add endpoint: `https://tasteofgratitude.shop/api/square-webhook`
3. Subscribe to events:
   - ✅ payment.created
   - ✅ payment.updated
   - ✅ payment.completed
   - ✅ payment.failed
   - ✅ refund.created
4. Copy signature key → `SQUARE_WEBHOOK_SIGNATURE_KEY`

**Domain Whitelisting:**
1. Go to: **Developers** → **Web Payments SDK**
2. Add domains:
   - `tasteofgratitude.shop`
   - `gratog.vercel.app`
   - Any preview/staging domains

---

## DEPLOYMENT STRATEGY: Blue-Green Deploy

### Stage 1: Deploy to Staging (Preview Branch)

```bash
# Create feature branch
git checkout -b fix/payment-timeouts

# Apply all patches (from PAYMENT_IMPLEMENTATION_PATCHES.md)
# ... edit files ...

# Verify
npm run typecheck && npm run lint && npm run test:unit

# Commit
git add .
git commit -m "fix: add timeout protection and retry logic to Square payment integration

See: PAYMENT_FORENSICS_AUDIT.md for details"

# Push to feature branch
git push origin fix/payment-timeouts

# Create PR on GitHub
# Link to PR: PAYMENT_FORENSICS_AUDIT.md

# Wait for:
# - Vercel Preview deployment
# - GitHub Checks passing
# - Code review approval
```

### Stage 2: Test in Preview Environment

```bash
# Preview URL: https://<branch-name>.vercel.app

# 1. Set environment variables in Vercel Preview
SQUARE_ACCESS_TOKEN=sq0atp-... (sandbox token)
NEXT_PUBLIC_SQUARE_APPLICATION_ID=sq0idp-... (sandbox app ID)
SQUARE_ENVIRONMENT=sandbox

# 2. Run smoke tests
- Navigate to https://<branch>.vercel.app/checkout
- Add product to cart
- Proceed to payment
- Use test card: 4532 0155 0016 4662
- Submit payment
- Expected: ✅ Success in <5 seconds
- Verify order in Square Dashboard

# 3. Test error handling
- Proceed to payment again
- Use declined card: 5555 5555 5555 4444
- Submit payment
- Expected: ❌ "Card declined" error shown, not generic error

# 4. Test webhook
- Manually trigger webhook in Square Dashboard
- Check logs: `vercel logs https://<branch>.vercel.app`
- Expected: ✅ Webhook received and processed

# 5. Monitor for errors
- Open Sentry dashboard
- Filter by release/environment/branch
- Expected: 0 timeout errors, 0 payment processing errors
```

### Stage 3: Merge to Main (Production Staging)

```bash
# After preview testing passes:

# 1. Merge PR to main
git checkout main
git pull origin main
git merge fix/payment-timeouts
git push origin main

# 2. Wait for Vercel production build
# Monitor: https://vercel.com/dashboard → Deployments

# 3. Set production environment variables
# In Vercel Console:
SQUARE_ACCESS_TOKEN=sq0atp-... (PRODUCTION token)
NEXT_PUBLIC_SQUARE_APPLICATION_ID=sq0idp-... (PRODUCTION app ID)
SQUARE_ENVIRONMENT=production

# 4. Redeploy with new env vars
# Vercel Redeploy button or:
vercel deploy --prod --env SQUARE_ACCESS_TOKEN=... --env SQUARE_ENVIRONMENT=production

# 5. Smoke test production
# Use same test cards in Square production
# (Square test cards work in both sandbox and production)
```

---

## ROLLBACK PLAN (If Issues)

### Automatic Rollback (Vercel)

```bash
# In Vercel Console:
# Deployments → Find previous stable deployment → Click "Promote to Production"

# Or via CLI:
vercel rollback
```

### Manual Rollback

```bash
# Revert the commit
git revert <commit-hash>

# OR: Reset to previous main
git reset --hard <previous-commit>

# Push
git push origin main

# Verify in Vercel
# Previous version should be live within 1-2 minutes
```

### Post-Rollback Verification

```bash
# 1. Monitor error rate in Sentry
#    → Should drop to baseline within 5 minutes

# 2. Test payment with sandbox card
#    → Should work or fail gracefully

# 3. Check logs
vercel logs https://tasteofgratitude.shop --follow

# 4. If successful, investigate root cause
#    → Check error logs from failed deployment
#    → Fix issue locally and re-test
#    → Re-deploy when ready
```

---

## PRODUCTION MONITORING

### Real-Time Monitoring Dashboard

**Set up in Vercel Console:**

1. Go to: Project → Analytics
2. Monitor these metrics:
   - **Function Duration:** Payment requests should be <5s
   - **Error Rate:** Should be <1%
   - **Requests:** Count of payment requests

**Set up in Sentry:**

1. Go to: Project → Alerts → Create Alert Rule
2. Create alerts for:
   - **High Error Rate:** If >5% of payments fail
   - **Slow Transaction:** If P95 latency >10s
   - **Timeout Exception:** If "timeout" errors spike

**Metrics to Track:**

```
payment_attempts{status="success"|"timeout"|"failed",method="card"|"apple_pay"|"google_pay"}
payment_duration_ms{percentile="p50"|"p95"|"p99"}
payment_errors{code="TIMEOUT"|"CARD_DECLINED"|"UNAUTHORIZED"|...}
square_api_latency_ms{endpoint="/v2/payments"}
```

### Daily Monitoring Checklist

```
☐ Check Sentry dashboard - Payment error rate <1%
☐ Check Vercel Analytics - No function timeouts
☐ Check Square Dashboard - Payments processing correctly
☐ Check database - Orders synced with Square
☐ Check email/SMS - Customer confirmations sent
☐ Spot-check 3-5 orders - All details correct
```

### Weekly Reports

**Email Template:**
```
Subject: Payment System Health Report - Week of [DATE]

Payment Performance:
- Total Transactions: [N]
- Success Rate: [X.X]%
- Average Latency: [XXX]ms (target: <2000ms)
- P95 Latency: [XXX]ms (target: <5000ms)

Errors (Last 7 Days):
- Timeouts: [N] (target: 0)
- Card Declined: [N] (expected)
- Auth Failures: [N] (target: 0)
- Webhook Failures: [N] (target: 0)

Action Items:
- [ ] Investigate any errors
- [ ] Update customer support if needed
- [ ] Review Square API performance
```

---

## INCIDENT RESPONSE

### Payment Timeout Alert (Real-time)

**Trigger:** Alert in Sentry if timeout errors spike  
**Response Time:** <15 minutes

```bash
# 1. Acknowledge alert
# In Sentry: Click "Resolve" or "Ignore" (depending on severity)

# 2. Check recent deployments
vercel logs https://tasteofgratitude.shop --follow

# 3. Check Square API status
# https://status.squareup.com

# 4. Check database connectivity
# MongoDB Atlas → Current Activity

# 5. If recent deploy, consider rollback
git log --oneline main | head -5

# If < 30 minutes ago and causing issues:
vercel rollback

# 6. If not recent deploy, investigate
# - Check error logs in detail
# - Test payment yourself
# - Monitor latency metrics
# - Check for resource constraints (memory, CPU)

# 7. Communicate with team
# Post update in #payments Slack channel with:
# - Issue description
# - Impact (how many users affected)
# - ETA for fix
# - Workaround if available
```

### Payment Success Rate Drop

**Trigger:** Alert if success rate drops below 95%  
**Response Time:** <1 hour

```bash
# 1. Check error distribution in Sentry
# Which errors are causing failures?

# 2. Check Square API metrics
# https://dashboard.squareup.com → Analytics

# 3. Check for data inconsistencies
# MongoDB: Compare orders vs payments vs webhooks

# 4. Check recent code changes
git log --oneline main | head -10

# 5. Review customer support tickets
# Are customers reporting payment issues?

# 6. Implement fix
# - If code issue: create hotfix PR
# - If config issue: update env vars or Square Dashboard
# - If external: wait for service recovery, communicate status

# 7. Monitor during recovery
# Watch error rate decrease in real-time
```

### Critical Outage (0% Success Rate)

**Trigger:** Payment system completely down  
**Response Time:** Immediate

```bash
# 1. IMMEDIATELY check:
# [ ] Is Vercel up? https://status.vercel.com
# [ ] Is Square API up? https://status.squareup.com
# [ ] Are environment variables set? Vercel Console → Settings
# [ ] Are auth tokens correct? Check console logs

# 2. If auth tokens missing:
# Set environment variables NOW
# Vercel Console → Settings → Environment Variables
# Add: SQUARE_ACCESS_TOKEN, NEXT_PUBLIC_SQUARE_APPLICATION_ID, SQUARE_ENVIRONMENT

# 3. If tokens are wrong:
# Get correct tokens from https://developer.squareup.com/apps
# Update env vars
# Wait 2-3 minutes for Vercel redeploy

# 4. If external service down:
# Post status in Slack
# Redirect customers: "We're experiencing temporary payment issues. 
#                     Please try again in 5 minutes."

# 5. Monitor for recovery
# Test payment every 2 minutes
# Once working, post all-clear message

# 6. Post-incident review
# Schedule meeting to discuss:
# - Root cause analysis
# - Prevention strategies
# - Monitoring improvements
```

---

## PERFORMANCE BASELINES

### Expected Performance (After Deploy)

| Metric | Value | Alert Threshold |
|--------|-------|-----------------|
| SDK Load Time | <1s (cached) | >10s |
| Tokenization | <500ms | >2s |
| API Request Duration | <2s (P50) | >5s |
| Payment Success Rate | >99% | <95% |
| Timeout Errors | 0% | >0.5% |
| Webhook Delivery | >99% | <99% |
| End-to-End (browser) | <5s (P95) | >10s |

### Baseline Comparison

**Before Fixes:**
```
SDK Load Time: Variable (no timeout, could hang forever)
API Request: 30-60s timeout (Vercel limit)
Success Rate: ~0% (auth tokens missing)
Timeouts: 100%
```

**After Fixes:**
```
SDK Load Time: <1s (or error after 10s)
API Request: <2s (or error after 8s)
Success Rate: >99%
Timeouts: <0.1%
```

---

## MONITORING TOOLS SETUP

### Sentry Configuration

```javascript
// sentry.server.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV || "development",
  tracesSampleRate: 0.1,
  
  integrations: [
    new Sentry.Integrations.Http({
      tracing: true,
      breadcrumbs: true
    })
  ]
});

// Payment API instrumentation
export async function POST(request: NextRequest) {
  const span = Sentry.startTransaction({
    op: "http.payment",
    name: "Process Square Payment"
  });
  
  try {
    // ... payment processing ...
    span.setStatus("ok");
  } catch (error) {
    Sentry.captureException(error);
    span.setStatus("internal_error");
  } finally {
    span.finish();
  }
}
```

### Vercel Analytics Configuration

```javascript
// pages/_app.tsx or app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}
```

### Custom Metrics (Optional)

```typescript
// lib/metrics.ts
export function recordPaymentMetric(
  status: 'success' | 'timeout' | 'failed',
  durationMs: number,
  method: 'card' | 'apple_pay' | 'google_pay'
) {
  // Send to external service (Datadog, New Relic, etc.)
  fetch('https://metrics.example.com/payment', {
    method: 'POST',
    body: JSON.stringify({
      status,
      duration: durationMs,
      method,
      timestamp: new Date().toISOString()
    })
  }).catch(err => console.error('Failed to record metric:', err));
}

// Usage in /api/payments/route.ts
const startTime = Date.now();
try {
  const response = await createPayment(...);
  recordPaymentMetric('success', Date.now() - startTime, 'card');
} catch (error) {
  const isTimeout = error.message.includes('timeout');
  recordPaymentMetric(
    isTimeout ? 'timeout' : 'failed',
    Date.now() - startTime,
    'card'
  );
}
```

---

## COMMUNICATION PLAN

### Pre-Deployment

**Announce 24 hours before:**

```
Subject: Scheduled Payment System Update - [DATE] [TIME]

Hi Team,

We're deploying improvements to payment reliability on [DATE] at [TIME].
Expected downtime: <5 minutes during deployment.

Changes:
- Add timeout protection (prevents hanging requests)
- Add automatic retry logic (handles transient failures)
- Improve webhook deduplication (prevents double-charges)

Customers may experience brief delay if cached, but payments will still work.

Questions? Ask in #payments channel.
```

### During Deployment

**Keep team updated in Slack:**

```
🔄 Deployment starting - 10:00 AM
🕐 Waiting for Vercel build - 10:05 AM
✅ Build successful - 10:07 AM
🔄 Environment variables updating - 10:08 AM
✅ Live on production - 10:10 AM
🧪 Running smoke tests - 10:12 AM
✅ All tests passed - 10:14 AM
🎉 Deployment complete!
```

### Post-Deployment

**24-hour monitoring message:**

```
Subject: Payment System Update - Monitoring Results

Hi Team,

Payment system update deployed successfully 24 hours ago.

Results:
✅ 0 timeout errors (was: 100%)
✅ 99.5% payment success rate (was: 0%)
✅ <2s median latency (was: variable/broken)
✅ 100% webhook delivery

No issues reported. System performing as expected.

Next: Continue monitoring, address any edge cases found.
```

---

## DOCUMENTATION FOR CUSTOMERS

### During Deployment

**Checkout Page Message (optional):**
```
ℹ️ We're improving our payment system. 
   If you experience any issues, please try again or contact support.
```

### Post-Deployment

**Update Help Documentation:**

```markdown
## Payment Processing Timeouts

### What's Fixed
We've improved our payment system to handle slow networks better:
- Payments now have a timeout of 15 seconds (was: infinite)
- If a payment times out, you can automatically retry
- We retry failed payments up to 2 times automatically

### What To Do If Payment Times Out
1. Check your internet connection
2. Click "Try Again" button
3. If it still doesn't work, contact support

### How Long Do Payments Take?
- Typical: 1-3 seconds
- Slow network: 5-10 seconds
- You'll see a confirmation within 15 seconds or an error message
```

---

## SUCCESS CRITERIA

### Week 1 Goals
- [ ] 0 timeout errors in production
- [ ] Payment success rate >99%
- [ ] 0 double-charge incidents
- [ ] All webhooks received and processed
- [ ] Customer complaints = 0

### Week 2 Goals
- [ ] Monitoring dashboard live and stable
- [ ] Alerts configured and tested
- [ ] Performance baselines established
- [ ] Team trained on new system
- [ ] Documentation updated

### Month 1 Goals
- [ ] 99.9% uptime maintained
- [ ] <1s median payment latency (P50)
- [ ] <5s P95 latency
- [ ] <0.1% error rate
- [ ] Zero critical incidents

---

**Status:** Ready for Production  
**Last Updated:** December 20, 2025  
**Prepared By:** Amp - Payment Reliability Team
