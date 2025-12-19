# SQUARE INTEGRATION - POST-AUDIT ACTION PLAN
**Audit Date:** December 19, 2025  
**Status:** ✅ PRODUCTION READY  
**Next Steps:** Implementation & Verification

---

## 📋 IMMEDIATE ACTIONS (TODAY - 30 MINUTES)

### Action 1: Configure Webhook URL in Square Dashboard ⚠️ CRITICAL
**Time Required:** 5 minutes  
**Importance:** HIGH  

**Steps:**
1. Go to https://developer.squareup.com/
2. Sign in with Square account
3. Select your application
4. Navigate to **Webhooks** section
5. Click **Add Endpoint**
6. Enter URL: `https://your-domain.com/api/webhooks/square`
7. Select signature key: `taste-of-gratitude-webhook-key-2024`
8. Subscribe to events:
   - ✅ `payment.created`
   - ✅ `payment.updated`
   - ✅ `order.created`
   - ✅ `order.updated`
   - ✅ `inventory.count.updated`
   - ✅ `catalog.version.updated`
9. Save and verify

**Verification:**
```bash
# After webhook is configured, test it:
curl https://your-domain.com/api/webhooks/square
# Expected response: 
# {"status":"active","eventTypes":["payment.created","payment.updated",...]}
```

**Checklist:**
- [ ] Logged into Square Developer Dashboard
- [ ] Found application
- [ ] Added webhook endpoint
- [ ] Configured URL
- [ ] Selected all event types
- [ ] Verified webhook shows as active
- [ ] Documented webhook ID for support

---

### Action 2: Verify All Environment Variables ✅ VERIFICATION
**Time Required:** 3 minutes  
**Importance:** HIGH

**Check in .env.local:**
```bash
# Run this command to verify
grep "^SQUARE_" .env.local

# Output should show:
# SQUARE_ACCESS_TOKEN=EAAA...
# SQUARE_LOCATION_ID=L66TVG6867BG9
# SQUARE_ENVIRONMENT=production
# SQUARE_WEBHOOK_SIGNATURE_KEY=taste-of-gratitude-webhook-key-2024
# NEXT_PUBLIC_SQUARE_APPLICATION_ID=sq0idp-V1fV-MwsU5lET4rvzHKnIw
# NEXT_PUBLIC_SQUARE_LOCATION_ID=L66TVG6867BG9
```

**Checklist:**
- [ ] All SQUARE_* variables present
- [ ] Access token is production token (EAAA...)
- [ ] Location ID matches Square account
- [ ] Webhook signature key is set
- [ ] Application ID matches Square app

**If Any Missing:**
1. Contact admin with missing variable
2. Get value from Square Dashboard
3. Add to .env.local or Vercel environment variables
4. Restart application

---

### Action 3: Run End-to-End Payment Test ✅ VALIDATION
**Time Required:** 10 minutes  
**Importance:** HIGH

**Run the test:**
```bash
cd /workspaces/Gratog
python3 production_square_test.py
```

**Expected Output:**
```
✅ Configuration Check: PASS
✅ Token Validation: PASS
✅ API Connectivity: PASS
✅ Payment Link Creation: PASS
✅ Test Complete: All checks passed
```

**Checklist:**
- [ ] Test script runs without errors
- [ ] All checks show PASS
- [ ] Token validation successful
- [ ] Payment link generated successfully
- [ ] No timeout errors
- [ ] Results saved to log file

**If Test Fails:**
1. Check error message
2. Review logs: `/var/log/supervisor/nextjs.out.log`
3. Run `/api/square/diagnose` endpoint
4. Review troubleshooting guide (see section 5)

---

## 🔄 SHORT-TERM ACTIONS (THIS WEEK)

### Action 4: Automated Catalog Sync Setup
**Time Required:** 15 minutes  
**Importance:** MEDIUM

**Option A: Manual Sync (Simplest)**
```bash
# Run once to sync catalog
cd /app
node scripts/syncCatalog.js

# Output should show:
# 🔄 Starting Square Catalog sync...
# ✅ Connected to Square successfully
# 📦 Total objects retrieved: 123
# 📊 Items: 29, Variations: 45, Categories: 6, Images: 43
# ✅ Saved 29 items
# ✅ Saved 6 categories
# 🎉 Sync completed successfully!
```

**Option B: Scheduled Sync (Recommended)**
```bash
# Add to crontab for daily sync at 2 AM
0 2 * * * cd /app && node scripts/syncCatalog.js >> /var/log/catalog-sync.log 2>&1

# To add:
crontab -e
# Then paste the line above
```

**Verification:**
```bash
# Check if catalog is synced
mongo taste_of_gratitude --eval "db.square_catalog_items.count()"
# Output: 29 (or number of products in Square)
```

**Checklist:**
- [ ] Ran manual sync
- [ ] Catalog items appear in database
- [ ] All 29 items synced
- [ ] (Optional) Added cron job
- [ ] (Optional) Tested scheduled sync

---

### Action 5: Error Alerting Setup
**Time Required:** 30 minutes  
**Importance:** MEDIUM

**Option A: Sentry (Recommended)**
```bash
# Install Sentry SDK
npm install --save @sentry/nextjs

# Configure in environment variables
SENTRY_AUTH_TOKEN=your-token
SENTRY_PROJECT_ID=your-project-id
SENTRY_ORG=your-org
```

**Option B: Custom Slack Integration**
```bash
# Send payment errors to Slack webhook
# Add to .env:
SLACK_ERROR_WEBHOOK=https://hooks.slack.com/services/...
```

**Option C: Email Alerts (Simple)**
```bash
# Configure email alerts in application
# Payment errors sent to ops@company.com
```

**Checklist:**
- [ ] Selected alerting service
- [ ] Configured integration
- [ ] Set alert thresholds
- [ ] Tested alert delivery
- [ ] Added to runbook

---

### Action 6: Create Support Runbooks
**Time Required:** 45 minutes  
**Importance:** MEDIUM

**Create these documents:**

**1. Payment Processing Flowchart**
```
Payment Flow Troubleshooting:
├─ Customer tries to pay
│  └─ Does payment form load?
│     ├─ YES → Does form validate?
│     │  ├─ YES → Submit payment?
│     │  │  ├─ YES → Payment processed
│     │  │  └─ NO → Check browser console
│     │  └─ NO → Check form validation
│     └─ NO → Check /api/square/config endpoint
├─ Payment declined?
│  └─ Check Square Dashboard for error details
└─ Order not created?
   └─ Check logs and webhook status
```

**2. Webhook Troubleshooting**
```
Is webhook receiving events?
├─ Check webhook URL in Square Dashboard
├─ Check webhook signature key matches
├─ Test webhook with test event
├─ Check /api/webhooks/square endpoint
└─ Review webhook_logs collection in MongoDB
```

**3. Common Issues & Fixes**
```
| Issue | Check | Fix |
|-------|-------|-----|
| 401 Unauthorized | Token | Verify SQUARE_ACCESS_TOKEN |
| 403 Forbidden | Scopes | Check OAuth scopes in Dashboard |
| 404 Not Found | Endpoint | Verify webhook URL is correct |
| Payment failed | Square Dashboard | Check decline reason |
```

**Checklist:**
- [ ] Created payment flow guide
- [ ] Created webhook guide
- [ ] Created issue matrix
- [ ] Shared with support team
- [ ] Added to wiki/documentation

---

### Action 7: Train Support Team
**Time Required:** 60 minutes  
**Importance:** MEDIUM

**Training Topics:**
1. Payment flow overview (10 min)
2. Common issues (20 min)
3. Debugging tools (15 min)
4. Escalation procedures (10 min)
5. Hands-on practice (15 min)

**Demo System:**
```
Show:
1. Catalog page
2. Order page
3. Square payment form
4. Payment completion
5. Order confirmation
```

**Q&A Topics:**
- How payments are processed
- Where to check status
- How to refund orders
- How to contact Square support
- What to do if webhook fails

**Checklist:**
- [ ] Scheduled training session
- [ ] Prepared slides
- [ ] Set up demo account
- [ ] Created training materials
- [ ] Conducted training
- [ ] Got feedback from team

---

## ✅ MONITORING & VALIDATION (FIRST WEEK)

### Action 8: Daily Health Check
**Time Required:** 5 minutes daily  
**Importance:** HIGH (first week only)

**Run Daily:**
```bash
# Check system health
curl https://your-domain.com/api/square/diagnose

# Check webhook status
curl https://your-domain.com/api/webhooks/square

# Check token validity
curl https://your-domain.com/api/square/validate-token
```

**Expected Responses:**
- All endpoints should return 200
- Configuration should show no errors
- Webhooks should show "active"
- Token should show all scopes

**If Any Issues:**
1. Check logs immediately
2. Review error messages
3. Consult troubleshooting guide
4. Escalate if needed

**Checklist:**
- [ ] Day 1 health check: ✅
- [ ] Day 2 health check: ✅
- [ ] Day 3 health check: ✅
- [ ] Day 4 health check: ✅
- [ ] Day 5 health check: ✅
- [ ] Day 6 health check: ✅
- [ ] Day 7 health check: ✅

---

### Action 9: Monitor Payment Volume
**Time Required:** 5 minutes after each payment  
**Importance:** HIGH (first week)

**Track:**
1. Payment success rate
2. Average payment time
3. Error frequencies
4. Webhook delivery rate
5. Customer feedback

**In MongoDB:**
```javascript
// Check payment success rate
db.payments.find({status: "completed"}).count()  // Successful
db.payments.find({status: "failed"}).count()     // Failed

// Check webhook processing
db.webhook_logs.find({type: "payment.updated"}).count()

// Check order creation
db.orders.find({status: "paid"}).count()
```

**Checklist:**
- [ ] Logged first payment
- [ ] Verified order creation
- [ ] Checked webhook delivery
- [ ] Reviewed for errors
- [ ] Collected success metrics
- [ ] Documented any issues

---

### Action 10: Collect Baseline Metrics
**Time Required:** 30 minutes  
**Importance:** MEDIUM

**Metrics to Track:**
```
PAYMENT METRICS:
  - Payment success rate: _____% (target: >98%)
  - Average payment time: _____ s (target: <5s)
  - Failed payments per day: _____ (target: <1%)
  
WEBHOOK METRICS:
  - Webhook delivery rate: ____% (target: 100%)
  - Average processing time: ____ms (target: <1000ms)
  - Failed webhooks: _____ (target: 0)
  
CUSTOMER METRICS:
  - Daily transaction volume: _____
  - Average order value: $_____
  - Customer satisfaction: _____% (if tracked)
```

**Baseline Document:**
```markdown
# Square Integration Baseline Metrics
**Date:** [Date]
**Period:** First week of launch

## Payment Metrics
- Success Rate: 99.2%
- Average Time: 2.1s
- Total Payments: 47
- Failed: 0
- Declined: 1

## Webhook Metrics
- Delivery Rate: 100%
- Processing Time: 450ms avg
- Total Events: 52

## Issues Observed
- None

## Notes
- System performing well
- No critical issues
```

**Checklist:**
- [ ] Documented baseline metrics
- [ ] Created tracking spreadsheet
- [ ] Set performance targets
- [ ] Shared with team
- [ ] Scheduled weekly review

---

## 🐛 TROUBLESHOOTING REFERENCE

### Payment Processing Issues

**Issue: Payment button doesn't appear**
```
Checklist:
1. [ ] Check browser console for errors
2. [ ] Verify /api/square/config endpoint returns data
3. [ ] Check NEXT_PUBLIC_SQUARE_APPLICATION_ID is set
4. [ ] Verify application ID matches Square Dashboard
5. [ ] Clear browser cache and reload

Command:
curl https://your-domain.com/api/square/config
```

**Issue: Payment fails with 401**
```
Checklist:
1. [ ] Verify SQUARE_ACCESS_TOKEN in .env
2. [ ] Run token validation endpoint
3. [ ] Check token hasn't expired
4. [ ] Verify environment is "production"

Command:
curl https://your-domain.com/api/square/validate-token
```

**Issue: Order not created after payment**
```
Checklist:
1. [ ] Check webhook status
2. [ ] Verify webhook URL configured
3. [ ] Check webhook_logs in MongoDB
4. [ ] Review error logs
5. [ ] Run webhook test

Command:
curl https://your-domain.com/api/webhooks/square
```

**Issue: Webhook not receiving events**
```
Checklist:
1. [ ] Verify webhook URL in Square Dashboard
2. [ ] Check webhook status shows "active"
3. [ ] Verify signature key matches
4. [ ] Test with Square test event
5. [ ] Check firewall allows Square IPs

Square Dashboard:
1. Go to Webhooks
2. Click on endpoint
3. Click "Send Test Event"
4. Check logs for incoming event
```

### Diagnostic Endpoints

**Quick Diagnostics:**
```bash
# Complete system diagnostic
GET /api/square/diagnose
Returns: Configuration, token status, API connectivity

# Token validation with scopes
GET /api/square/validate-token
Returns: Token validity, all OAuth scopes

# Webhook status
GET /api/webhooks/square
Returns: Webhook active status, event types supported

# Configuration check
GET /api/square/config
Returns: Application ID, Location ID, Environment
```

---

## 📞 ESCALATION PROCEDURES

### Tier 1: Try Troubleshooting
**Time:** 15 minutes  
**Resources:**
- Diagnostic endpoints
- Support runbooks
- This action plan

**If Not Resolved → Escalate**

### Tier 2: Contact Admin
**Provides:**
- Server logs access
- MongoDB query assistance
- Environment variable help

**If Complex → Escalate**

### Tier 3: Contact Square Support
**For Issues:**
- Invalid token errors
- API quota exceeded
- Square API errors
- Webhook delivery issues

**Info to Provide:**
- Application ID
- Error message
- Timestamp
- Operation attempted
- Error logs

**Square Support:**
- Phone: 1-844-696-SQUARE
- Email: support@squareup.com
- Dashboard: https://squareup.com/help

---

## ✔️ LAUNCH CHECKLIST

**Before Going Live:**
- [ ] Webhook URL configured in Square Dashboard
- [ ] Environment variables verified
- [ ] End-to-end payment test passed
- [ ] Support team trained
- [ ] Runbooks created
- [ ] Alerting configured
- [ ] Monitoring dashboard ready

**Day 1 (Launch):**
- [ ] Monitor first hour closely
- [ ] Review first few transactions
- [ ] Check webhook delivery
- [ ] Verify order creation
- [ ] Confirm payment processing

**Week 1 (Post-Launch):**
- [ ] Daily health checks
- [ ] Monitor metrics
- [ ] Collect feedback
- [ ] Document issues
- [ ] Optimize performance

**Month 1:**
- [ ] Review baseline metrics
- [ ] Plan enhancements
- [ ] Optimize catalog sync
- [ ] Add monitoring dashboard
- [ ] Evaluate new features

---

## 📊 SUCCESS CRITERIA

### Technical Success
- ✅ 99%+ payment success rate
- ✅ <5 second payment processing
- ✅ 100% webhook delivery
- ✅ <1 second webhook processing
- ✅ Zero critical errors

### Operational Success
- ✅ Support team trained
- ✅ Runbooks documented
- ✅ Alerts working
- ✅ Metrics tracked
- ✅ Issues responded to <1 hour

### Business Success
- ✅ Revenue processing smoothly
- ✅ Customer satisfaction high
- ✅ No payment failures
- ✅ Positive customer feedback
- ✅ System stable 24/7

---

## 📝 FOLLOW-UP TIMELINE

| Timeline | Action | Owner | Status |
|----------|--------|-------|--------|
| **Today** | Configure webhooks | Admin | ⏳ |
| **Today** | Verify environment | Admin | ⏳ |
| **Today** | Run e2e test | QA | ⏳ |
| **Tomorrow** | Deploy to prod | DevOps | ⏳ |
| **Day 3-7** | Daily monitoring | Ops | ⏳ |
| **Week 2** | Review metrics | Manager | ⏳ |
| **Week 4** | Full audit review | Tech Lead | ⏳ |

---

## 🎯 COMPLETION TRACKING

**Current Status:** AUDIT COMPLETE - READY FOR IMPLEMENTATION

**Next Review Date:** January 2, 2026 (Post-launch)

**Key Contacts:**
- Technical Lead: [Name]
- Operations: [Name]
- Support Manager: [Name]
- Square Support: 1-844-696-SQUARE

---

**Prepared By:** Comprehensive Audit Agent  
**Date:** December 19, 2025  
**Version:** 1.0  

**✅ READY TO PROCEED WITH DEPLOYMENT**
