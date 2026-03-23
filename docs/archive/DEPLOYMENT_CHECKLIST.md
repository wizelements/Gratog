# Error Tracking System - Deployment Checklist

## Pre-Deployment (Completed ✅)

- [x] Error tracking library implemented (lib/error-tracker.ts)
- [x] API routes created (/api/errors/summary, /api/errors/list)
- [x] Error boundaries enhanced (error.js, global-error.js, ErrorBoundary.js)
- [x] Memory optimizations applied (5 modules fixed)
- [x] Build passes (36/36 tests)
- [x] TypeScript: zero errors
- [x] Code committed: df0bda4
- [x] Code pushed to GitHub
- [x] Documentation created (8,000+ lines)

---

## Deployment (In Progress ⏳)

### Stage 1: Vercel Build
- [ ] Vercel detects push (should be automatic)
- [ ] Build starts (check Vercel dashboard)
- [ ] Build compilation completes: "Creating an optimized production build"
- [ ] All tests pass
- [ ] Deployment succeeds: "Deployed to production"

**Time:** ~5-8 minutes
**Current:** In progress (started ~19:15 UTC)

**Monitor with:**
```bash
vercel logs https://tasteofgratitude.shop --follow
```

### Stage 2: Endpoint Activation
- [ ] /api/errors/summary becomes available (404 → 401)
- [ ] /api/errors/list becomes available (404 → 401)
- [ ] Health check endpoint still works (/api/health)
- [ ] Site homepage still loads (/index)

**Time:** Automatic after build complete
**Verify with:**
```bash
bash /workspaces/Gratog/monitor-deployment.sh
```

---

## Post-Deployment Verification

### Phase 1: Endpoint Tests (5 min)
- [ ] /api/errors/summary returns 401 without auth
- [ ] /api/errors/list returns 401 without auth
- [ ] /api/health returns 200 with health data
- [ ] Homepage loads normally

**Commands:**
```bash
curl -s https://tasteofgratitude.shop/api/errors/summary | jq .
curl -s https://tasteofgratitude.shop/api/errors/list | jq .
curl -s https://tasteofgratitude.shop/api/health | jq .
```

### Phase 2: Authentication (3 min)
- [ ] Can login to /admin/login
- [ ] Can extract admin_token from cookies
- [ ] Token is valid JWT format (long string with dots)
- [ ] API returns 200 with valid token

**Commands:**
```bash
export ADMIN_TOKEN="your_token_here"
curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" \
  https://tasteofgratitude.shop/api/errors/summary | jq .
```

### Phase 3: Error Capture (5 min)
- [ ] Error page displays when error occurs
- [ ] Error page shows error ID
- [ ] Error ID format: `err_[timestamp]_[random]`
- [ ] Error page has "Try again" button
- [ ] Error page has "Go home" button
- [ ] No console JavaScript errors

**Test with:**
```bash
# In browser console on any page:
throw new Error('Test error');
```

### Phase 4: Error Storage (3 min)
- [ ] Error appears in /api/errors/list
- [ ] Error has correct timestamp
- [ ] Error has correct message
- [ ] Error source is "client"
- [ ] Error category is "unspecified"
- [ ] Error severity is "high"

**Commands:**
```bash
curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" \
  'https://tasteofgratitude.shop/api/errors/list?limit=5' | jq .data.errors
```

### Phase 5: Summary Analysis (3 min)
- [ ] /api/errors/summary shows error count > 0
- [ ] Summary shows error in topErrors
- [ ] Summary shows source "client"
- [ ] Summary shows category
- [ ] Summary has recommendations array
- [ ] Summary has patterns array
- [ ] Summary has timeline array

**Commands:**
```bash
curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" \
  https://tasteofgratitude.shop/api/errors/summary | jq '.summary | keys'
```

### Phase 6: Filtering (3 min)
- [ ] Filter by source works: `?source=client`
- [ ] Filter by severity works: `?severity=high`
- [ ] Filter by category works: `?category=...`
- [ ] Filters return correct results
- [ ] Multiple errors can be filtered

**Commands:**
```bash
curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" \
  'https://tasteofgratitude.shop/api/errors/list?source=client' | jq .
curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" \
  'https://tasteofgratitude.shop/api/errors/list?severity=high' | jq .
```

### Phase 7: Pagination (2 min)
- [ ] Default limit is 50
- [ ] Can set limit: `?limit=10`
- [ ] Can set offset: `?offset=0`
- [ ] Pagination returns correct slice
- [ ] Total count is accurate

**Commands:**
```bash
curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" \
  'https://tasteofgratitude.shop/api/errors/list?limit=5&offset=0' | jq .data
```

### Phase 8: Clear Action (2 min)
- [ ] POST to /api/errors/summary clears errors
- [ ] Error count drops to 0 after clear
- [ ] New errors can still be captured after clear
- [ ] Clear returns success message

**Commands:**
```bash
curl -X POST -H "Cookie: admin_token=$ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"clear"}' \
  https://tasteofgratitude.shop/api/errors/summary | jq .
```

### Phase 9: Memory Check (2 min)
- [ ] Memory percentage < 60%
- [ ] Memory improved from 94%
- [ ] No memory leak in error tracking
- [ ] Health check shows OK status

**Commands:**
```bash
curl -s https://tasteofgratitude.shop/api/health | jq '.checks.memory'
# Expected: percentage 40-55 (was 94%)
```

### Phase 10: Database Check (1 min)
- [ ] Database check shows true
- [ ] No connection errors
- [ ] Queries execute quickly
- [ ] Health endpoint responds fast

**Commands:**
```bash
curl -s https://tasteofgratitude.shop/api/health | jq '.checks'
```

---

## Automated Testing

### Run Full Verification Suite
```bash
# Set your admin token first
export ADMIN_TOKEN="your_token_here"

# Run verification script (runs Phase 1-7 automatically)
bash /workspaces/Gratog/verify-error-tracking.sh
```

This script:
- [x] Tests auth is required
- [x] Tests API responds with token
- [x] Tests list endpoint works
- [x] Tests filtering works
- [x] Checks memory usage
- [x] Tests clear action

---

## Rollback Plan (If Needed)

If critical issues occur:

```bash
# Option 1: Revert commit
git revert HEAD
git push origin main
# Vercel auto-deploys old code (5-10 minutes)

# Option 2: Rollback via Vercel dashboard
# https://vercel.com/dashboard/projects → select project → Deployments
# Find previous successful deployment → click "Rollback"

# Option 3: Manual fix
# Fix the issue in code
# git commit -am "fix: critical issue"
# git push origin main
```

---

## Sign-Off

### Code Review
- [x] Error tracking library - reviewed
- [x] API routes - reviewed
- [x] Error boundaries - reviewed
- [x] Memory fixes - reviewed
- [x] Security (auth required) - reviewed
- [x] Documentation - reviewed

### Testing
- [ ] Phase 1: Endpoint tests - pass
- [ ] Phase 2: Authentication - pass
- [ ] Phase 3: Error capture - pass
- [ ] Phase 4: Error storage - pass
- [ ] Phase 5: Summary analysis - pass
- [ ] Phase 6: Filtering - pass
- [ ] Phase 7: Pagination - pass
- [ ] Phase 8: Clear action - pass
- [ ] Phase 9: Memory check - pass
- [ ] Phase 10: Database check - pass

### Final Verification
- [ ] All automated tests pass
- [ ] Manual tests pass
- [ ] Memory < 50%
- [ ] No console errors
- [ ] Support team briefed
- [ ] Documentation accessible
- [ ] Monitoring in place

### Sign-Off
- [ ] Developer: _______________ Date: ___
- [ ] QA/Tester: _____________ Date: ___
- [ ] Operations: _____________ Date: ___

---

## Monitoring After Deployment

### Immediate (First Hour)
```bash
# Watch for errors
watch -n 10 'curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" \
  https://tasteofgratitude.shop/api/errors/summary | \
  jq ".summary | {errorCount, topError: .topErrors[0]}"'
```

### Daily
```bash
# Check error summary
curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" \
  https://tasteofgratitude.shop/api/errors/summary | \
  jq '.summary | {errorCount, sources, categories}'
```

### Weekly
```bash
# Review patterns and trends
curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" \
  https://tasteofgratitude.shop/api/errors/summary | \
  jq '.summary.patterns'
```

---

## Support Team Briefing

### What to Tell Support
1. Error tracking system is now live
2. When users report errors, ask for Error ID
3. Use Error ID to look up error context
4. See ERROR_INVESTIGATION_QUICKSTART.md for procedures
5. Check INCIDENT_RESPONSE_PLAYBOOK.md for urgent issues

### Provide Links
- Investigation guide: ERROR_INVESTIGATION_QUICKSTART.md
- Incident response: INCIDENT_RESPONSE_PLAYBOOK.md
- Error tracking README: ERROR_TRACKING_README.md
- API reference: ERROR_TRACKING_SYSTEM.md (when ready)

---

## Final Checklist

- [ ] Deployment complete and verified
- [ ] All verification tests pass
- [ ] Memory improved (< 50%)
- [ ] No critical issues
- [ ] Support team briefed
- [ ] Documentation accessible
- [ ] Monitoring active
- [ ] Rollback plan ready (just in case)

---

## Related Documents

- **ERROR_TRACKING_README.md** - Master reference guide
- **ERROR_INVESTIGATION_QUICKSTART.md** - Quick diagnosis (for support)
- **INCIDENT_RESPONSE_PLAYBOOK.md** - Incident response (for ops)
- **TEST_PLAN_ERROR_TRACKING.md** - Detailed test plan
- **TESTING_SUMMARY.md** - Testing overview
- **DEPLOYMENT_STATUS_ERROR_TRACKING.md** - Current deployment status
- **monitor-deployment.sh** - Automated monitoring script
- **verify-error-tracking.sh** - Automated verification script

---

**Status:** Deployment in progress
**Target:** Production (tasteofgratitude.shop)
**Commit:** df0bda4
**ETA:** 5-10 minutes to completion
