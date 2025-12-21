# Phase 1 Quick Checklist - Copy & Paste Ready

Use this to track Phase 1 implementation progress. Copy to your sprint planning tool.

---

## Pre-Implementation (30 min)

- [ ] Team reviews COMPREHENSIVE_AUDIT_SUMMARY.md
- [ ] Team reviews PHASE_1_CRITICAL_FINDINGS.md
- [ ] Create GitHub issues for each task below
- [ ] Assign team members
- [ ] Schedule daily standups

---

## Setup (1 hour)

- [ ] Add dependencies: `npm install zod`
  - [ ] Verify: `npm list zod` shows installed
- [ ] Add environment variables to `.env.local`
  ```
  NEXTAUTH_URL=http://localhost:3000
  NEXTAUTH_SECRET=<generate-secret>
  ALLOWED_ORIGINS=http://localhost:3000
  ```
- [ ] Create new branches for testing

---

## Database Setup (15 min)

- [ ] Run index initialization script
  ```bash
  node scripts/initialize-rewards-indexes.js
  ```
- [ ] Verify in MongoDB:
  ```
  db.passports.getIndexes()
  ```

---

## Code Integration (10-12 hours)

### Module 1: Security Module ✓
- [ ] Copy `/lib/rewards-security.js` to project
  - [ ] File exists at correct path
  - [ ] No import errors: `npm run build`
- [ ] Test import: `import security from '@/lib/rewards-security'`

### Module 2: Secure Rewards ✓
- [ ] Copy `/lib/rewards-secure.js` to project
  - [ ] File exists at correct path
  - [ ] No import errors: `npm run build`
- [ ] Test import: `import rewards from '@/lib/rewards-secure'`

### Endpoint 1: Stamp Endpoint (2 hours)
- [ ] Create `/app/api/rewards/stamp/secure/route.js`
  - [ ] Copy from `/app/api/rewards/stamp/secure/route.js`
  - [ ] Update imports if needed
  - [ ] Test: `npm run dev` → POST `/api/rewards/stamp/secure`
- [ ] Update stamp endpoint call in components
  - [ ] Find all: `grep -r '/api/rewards/stamp'`
  - [ ] Change to: `/api/rewards/stamp/secure`
  - [ ] Test each component

### Endpoint 2: Leaderboard (1 hour)
- [ ] Update `/app/api/rewards/leaderboard/route.js`
  - [ ] Import: `SecureRewardsSystem`
  - [ ] Use: `SecureRewardsSystem.getLeaderboard(limit)`
  - [ ] Test: GET `/api/rewards/leaderboard`

### Endpoint 3: Passport (1 hour)
- [ ] Update `/app/api/rewards/passport/route.js`
  - [ ] Add authentication check
  - [ ] Add input validation
  - [ ] Use: `SecureRewardsSystem.createPassport()`
  - [ ] Test: POST `/api/rewards/passport`

### Endpoint 4: Redeem (1 hour)
- [ ] Update `/app/api/rewards/redeem/route.js`
  - [ ] Add authentication check
  - [ ] Add input validation
  - [ ] Use: `SecureRewardsSystem.redeemVoucher()`
  - [ ] Test: POST `/api/rewards/redeem`

### Frontend Storage (2 hours)
- [ ] Create `/lib/secure-storage.ts`
- [ ] Replace localStorage calls
  - [ ] Find all: `grep -r 'localStorage'`
  - [ ] Replace with: `SecureStorage` (sessionStorage)
- [ ] Test: Open DevTools → Application → sessionStorage

---

## Testing (5 hours)

### Unit Tests (2 hours)
- [ ] Input validation tests
  - [ ] Valid email ✓
  - [ ] Invalid email ✗
  - [ ] NoSQL injection ✗
  - [ ] XSS attempt ✗
- [ ] Secure code generation tests
  - [ ] Codes are unique
  - [ ] Codes are cryptographically random
- [ ] Rate limiting tests
  - [ ] Allow normal requests
  - [ ] Block after limit

### Integration Tests (2 hours)
- [ ] Authentication required
  - [ ] No auth → 401
  - [ ] With auth → 200
- [ ] Authorization
  - [ ] User A can't modify User B's passport
- [ ] Concurrent stamps
  - [ ] 5 simultaneous requests don't duplicate rewards
- [ ] Idempotency
  - [ ] Same request twice → only one stamp

### Manual Tests (1 hour)
- [ ] Authentication flow
  - [ ] Login
  - [ ] Add stamp (should work)
  - [ ] Logout
  - [ ] Add stamp (should fail 401)
- [ ] Input validation
  - [ ] Invalid email (should fail)
  - [ ] Injection attempt (should fail)
- [ ] Leaderboard
  - [ ] No customer names visible
  - [ ] No emails visible
- [ ] Concurrent requests
  - [ ] 10 rapid stamps don't create duplicates

---

## Security Audit (2 hours)

- [ ] Run OWASP ZAP
  - [ ] 0 Critical findings
  - [ ] < 5 High findings (known, will fix in Phase 2)
- [ ] Manual security review
  - [ ] Try authentication bypass (should fail)
  - [ ] Try NoSQL injection (should fail)
  - [ ] Try XSS (should fail)
  - [ ] Try CSRF (should fail)
  - [ ] Try rate limit bypass (should fail)

---

## Deployment to Staging (1 hour)

- [ ] Create feature flag in feature flag service
  - [ ] Flag name: `secure-rewards-v1`
  - [ ] Initial rollout: 0% (disabled)
- [ ] Deploy code to staging
  - [ ] `git push origin phase-1-security`
  - [ ] Staging deploy completes
  - [ ] Build logs show no errors
- [ ] Enable feature flag to 10%
  - [ ] Test in staging
  - [ ] Monitor for 15 minutes
  - [ ] Check Sentry for errors (should be 0)

---

## Pre-Production Deployment (2 hours)

- [ ] Code review
  - [ ] 2 engineers review all changes
  - [ ] Security team reviews security modules
  - [ ] No TODOs left in code
- [ ] Final testing
  - [ ] All unit tests pass
  - [ ] All integration tests pass
  - [ ] OWASP scan clean
- [ ] Create runbook (procedure if something breaks)
  - [ ] Link to PHASE_1_IMPLEMENTATION_GUIDE.md
- [ ] Brief on-call engineer
  - [ ] Walkthrough of new code
  - [ ] What to watch for
  - [ ] When to rollback

---

## Production Rollout (Day 1)

**Incremental Rollout Plan**

- [ ] **12:00 PM - 1% of users** (100 users)
  - [ ] Enable feature flag to 1%
  - [ ] Monitor Sentry (should see 0 new errors)
  - [ ] Monitor leaderboard latency (should be < 500ms)
  - [ ] Check if any 401 errors (expected if not logged in)

- [ ] **1:00 PM - 5% of users** (500 users)
  - [ ] No critical issues from 1% group
  - [ ] Increase to 5%
  - [ ] Monitor

- [ ] **2:00 PM - 25% of users** (2,500 users)
  - [ ] No critical issues from 5% group
  - [ ] Increase to 25%
  - [ ] Monitor

- [ ] **4:00 PM - 100% of users** (all)
  - [ ] No critical issues from 25% group
  - [ ] Complete rollout
  - [ ] Continue monitoring

---

## Post-Deployment (Week 1)

- [ ] Monitor daily
  - [ ] [ ] Day 1: Error rate < 1%
  - [ ] [ ] Day 2: No new issues
  - [ ] [ ] Day 3: Performance stable
  - [ ] [ ] Day 4-7: Zero critical incidents
- [ ] Gather feedback
  - [ ] Team reports any issues
  - [ ] Users report any issues
- [ ] Fix any issues immediately
  - [ ] Create hotfix branch
  - [ ] Deploy within 1 hour
- [ ] After 7 days: Declare Phase 1 complete ✓

---

## Cleanup (Week 2)

- [ ] Deprecate old endpoint
  - [ ] Add deprecation warning header
  - [ ] Update API docs
  - [ ] Announce 30-day deprecation period
- [ ] Remove old code (after 30 days)
  - [ ] Delete `/app/api/rewards/stamp/route.js` (old)
  - [ ] Verify no clients still using old endpoint
- [ ] Update documentation
  - [ ] API docs point to new endpoints
  - [ ] Runbook updated
  - [ ] Incident response guide updated

---

## Metrics to Watch

Monitor these daily during rollout:

```
✓ Authentication failures: should be 0 (or very low for non-logged-in)
✓ Validation errors: should be < 1%
✓ Stamp endpoint latency: should be < 300ms
✓ Leaderboard latency: should be < 500ms
✓ Database queries: should be < 100ms (with index)
✓ Duplicate rewards: should be 0
✓ Rate limit hits: expected but log them
✓ Error rate: should be < 1%
✓ Sentry critical errors: should be 0
```

---

## Rollback Plan (If Needed)

If critical issue found:

```
1. Immediately set feature flag to 0% (disable for all users)
2. Users revert to old endpoint automatically
3. Create incident ticket
4. Debug in staging
5. Fix code
6. Deploy and test
7. Re-enable feature flag at 1%
```

This should take < 30 minutes.

---

## Timeline

```
Monday:    Setup, module integration
Tuesday:   Endpoint updates, frontend updates
Wednesday: Unit testing, integration testing
Thursday:  Security audit, staging deployment
Friday:    Production rollout (1% → 25%)
Next Mon:  Complete to 100%
Next Tue:  Monitoring complete, Phase 1 complete
```

**Total: 2 weeks**

---

## Getting Help

- **Code questions:** See PHASE_1_IMPLEMENTATION_GUIDE.md
- **Security questions:** See PHASE_1_CRITICAL_FINDINGS.md
- **Architecture questions:** See COMPREHENSIVE_AUDIT_SUMMARY.md
- **Stuck?** Check error logs first, then review the relevant section

---

## Sign-Off

When complete, fill out:

```
Phase 1 Completed By: _________________ Date: _______
Tested By: _________________ Date: _______
Deployed By: _________________ Date: _______
Verified Safe By: _________________ Date: _______
```

---

**Good luck! You've got this.**

