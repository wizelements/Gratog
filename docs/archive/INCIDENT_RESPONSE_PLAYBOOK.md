# Incident Response Playbook

## "Something Went Wrong" - Complete Diagnosis Procedure

When users report "Something went wrong" errors, follow this playbook to identify root cause in under 10 minutes.

## Quick Triage (2 minutes)

### Step 1: Assess Scope

```bash
# How many users affected?
curl -H "Cookie: admin_token=$TOKEN" \
  https://tasteofgratitude.shop/api/errors/summary | \
  jq '.summary | {errorCount, sources, categories}'
```

**Interpretation:**
- `errorCount` 1-5 → Individual user issue
- `errorCount` 10-50 → Affects multiple users
- `errorCount` 100+ → Site-wide incident

### Step 2: Check System Health

```bash
# Memory usage?
curl https://tasteofgratitude.shop/api/health | jq '.checks.memory'

# Expected: percentage < 50%
# Warning: percentage 50-80%
# Critical: percentage > 80%
```

**If memory > 80%:** Jump to "Memory Crisis" section below

### Step 3: Identify Primary Issue

```bash
# Get summary and recommendations
curl -H "Cookie: admin_token=$TOKEN" \
  https://tasteofgratitude.shop/api/errors/summary | \
  jq '.summary.recommendations[0:3]'
```

**System automatically suggests fixes** - Follow first recommendation.

---

## Common Issues & Fixes

### Issue 1: React Hydration Mismatch

**Symptoms:**
- "Something went wrong" during page load
- Works on refresh
- Only from `client` source
- Many "Cannot read property" errors

**Diagnosis (1 min):**

```bash
curl -H "Cookie: admin_token=$TOKEN" \
  'https://tasteofgratitude.shop/api/errors/list?source=hydration' | \
  jq '.data.errors[0].message'
```

**Root Causes (check in order):**

1. **localStorage without useEffect guard**
   ```typescript
   // ❌ Bad - runs on server
   const theme = localStorage.getItem('theme');
   
   // ✅ Good - only client
   useEffect(() => {
     const theme = localStorage.getItem('theme');
   }, []);
   ```

2. **Date/time differences**
   ```typescript
   // ❌ Bad - different on server vs client
   const now = new Date().toISOString();
   
   // ✅ Good - use prop or API
   const createdAt = product.createdAt; // from server
   ```

3. **Missing null checks**
   ```typescript
   // ❌ Bad - user.name might not exist on server
   <h1>{user.name}</h1>
   
   // ✅ Good
   <h1>{user?.name || 'Guest'}</h1>
   ```

4. **ThemeProvider not wrapping children**
   - Check `app/layout.js` for `<ThemeProvider>`
   - Should wrap `{children}`

**Fix (5 min):**
1. Identify component from error
2. Check for localStorage/date/conditionals
3. Add useEffect or null checks
4. Test with `npm run dev`
5. Push to main

### Issue 2: Memory Crisis (95%+ Usage)

**Symptoms:**
- Page loads but hydration fails
- Affects all users
- Memory > 90% in health check
- Happened after code changes

**Reference:** [MEMORY_CRISIS_ROOT_CAUSE.md](./MEMORY_CRISIS_ROOT_CAUSE.md)

**Diagnosis (1 min):**

```bash
# Confirm memory issue
curl https://tasteofgratitude.shop/api/health | \
  jq '.checks.memory | select(.percentage > 80)'

# Check when it started
curl -H "Cookie: admin_token=$TOKEN" \
  https://tasteofgratitude.shop/api/errors/summary | \
  jq '.summary.timeline | first'
```

**Root Cause (unbounded caches):**

The app has in-memory Maps that grow without limit:
- `memoryCache` in redis-idempotency
- `queryCache` in db-optimized
- `csrfTokenMap` in rewards-security
- `stampRateLimitMap` in rewards-security

Each Vercel instance can hold max ~48MB. With concurrent requests, caches fill up fast.

**Fix (3 min - already applied):**

✅ Already fixed in current version:
- TextEncoder reused
- Query cache limited to 50 entries
- Idempotency cache limited to 100 entries
- CSRF tokens limited to 100
- Rate limit entries limited to 200

**If still seeing >80% memory:**

1. **Check deployed version**
   ```bash
   curl https://tasteofgratitude.shop/api/health | jq
   # Check if latest code is deployed
   ```

2. **Redeploy if needed**
   ```bash
   git push origin main
   # Wait for Vercel auto-deploy (3 minutes)
   # Monitor: vercel logs https://tasteofgratitude.shop
   ```

3. **Clear error store**
   ```bash
   curl -X POST \
     -H "Cookie: admin_token=$TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"action":"clear"}' \
     https://tasteofgratitude.shop/api/errors/summary
   ```

4. **Monitor recovery**
   ```bash
   watch -n 10 'curl -s https://tasteofgratitude.shop/api/health | jq ".checks.memory.percentage"'
   # Should drop to 45% within 1 minute
   ```

### Issue 3: API Error (Endpoint Failing)

**Symptoms:**
- Specific operation fails (checkout, product list)
- `source` = "api"
- Same error repeatedly
- Only when performing action

**Diagnosis (1 min):**

```bash
# Which endpoint?
curl -H "Cookie: admin_token=$TOKEN" \
  'https://tasteofgratitude.shop/api/errors/list?source=api' | \
  jq '.data.errors[0] | {endpoint, message, timestamp}'

# Get recent API errors
curl -H "Cookie: admin_token=$TOKEN" \
  'https://tasteofgratitude.shop/api/errors/list?source=api&limit=20' | \
  jq '.data.errors | group_by(.endpoint) | map({endpoint: .[0].endpoint, count: length})'
```

**Common Causes:**

1. **Database Connection Failure**
   ```
   Error: "ENOTFOUND" or "ECONNREFUSED"
   Fix: Check MongoDB URI in Vercel env vars
   ```

2. **Database Timeout**
   ```
   Error: "timeout" or "ETIMEDOUT"
   Fix: Check MongoDB Atlas IP whitelist (should be 0.0.0.0/0)
   ```

3. **Authentication Failure**
   ```
   Error: "Authentication failed" or "401"
   Fix: Check API key in Vercel env vars
   ```

4. **Data Validation**
   ```
   Error: "Schema validation failed"
   Fix: Check request format in browser DevTools
   ```

**Fix (2-5 min):**
1. Test endpoint locally: `npm run dev`
2. Check Vercel environment variables
3. Check database connectivity
4. Review recent code changes
5. Rollback if recent change introduced bug

### Issue 4: Missing Environment Variable

**Symptoms:**
- `source` = "server"
- Error: "X is undefined"
- `severity` = "critical"
- Affects entire site

**Diagnosis (1 min):**

```bash
# What's missing?
curl -H "Cookie: admin_token=$TOKEN" \
  'https://tasteofgratitude.shop/api/errors/list?severity=critical' | \
  jq '.data.errors[0].message'
```

**Fix (1 min):**

1. Identify missing var from error message
2. Add to Vercel:
   ```bash
   vercel env add MISSING_VAR
   # Enter value when prompted
   ```
3. Redeploy:
   ```bash
   git push origin main
   # Auto-deploy triggers with new env var
   ```

### Issue 5: Component Error (Specific Page Broken)

**Symptoms:**
- Error happens on specific page/component
- `source` = "client"
- Component name in error details
- Other pages work fine

**Diagnosis (1 min):**

```bash
# Which component?
curl -H "Cookie: admin_token=$TOKEN" \
  'https://tasteofgratitude.shop/api/errors/list?source=client' | \
  jq '.data.errors[0] | {component, message, timestamp}'
```

**Fix (2-5 min):**
1. Open component file
2. Check for unhandled null/undefined
3. Add null checks: `user?.name || 'Guest'`
4. Add error boundary: `<ErrorBoundary><Component /></ErrorBoundary>`
5. Test locally with `npm run dev`
6. Push to main

---

## Response Workflow

### For Individual Issues (1-5 errors)

```
1. Get error details (30s)
2. Identify root cause (1m)
3. Fix in code (2-5m)
4. Test locally (2m)
5. Push to main (auto-deploy 3m)
6. Verify fix deployed (30s)
```

**Total: 8-12 minutes**

### For System-Wide Issues (50+ errors)

```
1. Assess scope (1m)
2. Check memory/health (30s)
3. Triage top 5 errors (1m)
4. Identify pattern (1m)
5. Apply fix or rollback (3-5m)
6. Monitor recovery (2m)
```

**Total: 10-15 minutes**

### For Unknown Issues (multiple errors, unclear cause)

```
1. Get summary & recommendations (1m)
2. Follow system suggestions (2-3m)
3. If not working, filter by source (1m)
4. Filter by time window (1m)
5. Look for patterns (1m)
6. Check memory (30s)
7. Apply most likely fix (3-5m)
```

**Total: 10-15 minutes**

---

## Escalation Decision Tree

```
┌─ More than 100 errors in 1 hour?
│  │
│  ├─ Yes → Check memory
│  │        Memory > 80%? → CRITICAL - See "Memory Crisis"
│  │        Memory OK? → Check recommendations
│  │
│  └─ No → Continue

├─ Same error repeated 20+ times?
│  │
│  ├─ Yes → Code bug, needs fix
│  │
│  └─ No → Continue

├─ Errors only from one source (client/server/api)?
│  │
│  ├─ Yes → Component/endpoint issue, isolated fix
│  │
│  └─ No → System-wide, might need rollback

└─ Still unclear?
   │
   └─ Follow system recommendations
```

---

## Monitoring Commands

### Watch Live Error Stream

```bash
while true; do
  clear
  echo "=== Error Summary ==="
  curl -s -H "Cookie: admin_token=$TOKEN" \
    https://tasteofgratitude.shop/api/errors/summary | \
    jq '.summary | {errorCount, topError: .topErrors[0], recommendation: .recommendations[0]}'
  
  echo ""
  echo "=== Latest 3 Errors ==="
  curl -s -H "Cookie: admin_token=$TOKEN" \
    'https://tasteofgratitude.shop/api/errors/list?limit=3' | \
    jq '.data.errors[] | {timestamp, message, source, severity}' | head -20
  
  echo ""
  echo "=== Memory ==="
  curl -s https://tasteofgratitude.shop/api/health | \
    jq '.checks.memory'
  
  echo ""
  echo "Next update in 10 seconds... (Ctrl+C to exit)"
  sleep 10
done
```

### Alert on Error Spike

```bash
#!/bin/bash
# Save as: watch-errors.sh

ADMIN_TOKEN="your_token"
THRESHOLD=50
INTERVAL=60

while true; do
  ERROR_COUNT=$(curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" \
    https://tasteofgratitude.shop/api/errors/summary | \
    jq '.summary.errorCount')
  
  if [ "$ERROR_COUNT" -gt "$THRESHOLD" ]; then
    echo "🚨 ALERT: $ERROR_COUNT errors detected!"
    curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" \
      https://tasteofgratitude.shop/api/errors/summary | \
      jq '.summary.recommendations[0:3]'
  fi
  
  sleep $INTERVAL
done
```

---

## Runbook for Critical Issues

### If Site is Down (All errors, 100+/minute)

```bash
1. Check memory first
   curl https://tasteofgratitude.shop/api/health | jq '.checks.memory'
   
2. If memory < 50%:
   - Check Vercel logs: vercel logs https://tasteofgratitude.shop
   - Look for recent deployments
   - Check if code deployed correctly
   
3. If memory > 80%:
   - Memory crisis - already fixed in current code
   - Verify latest deployment: curl https://tasteofgratitude.shop/api/health
   - If old code still deployed: push new code with git push origin main
   
4. If neither helps:
   - Rollback: git revert HEAD && git push origin main
   - Wait 3-5 minutes for Vercel to redeploy
   - Check if site recovers
```

### If Specific Feature is Broken

```bash
1. Check which endpoint: 
   curl -H "Cookie: admin_token=$TOKEN" \
     'https://tasteofgratitude.shop/api/errors/list?source=api' | \
     jq '.data.errors[0].endpoint'

2. Test locally:
   npm run dev
   # Try the same action
   # Should reproduce error

3. Fix the code

4. Test fix locally

5. Push to main

6. Verify in production
```

---

## Postmortem Checklist

After any incident:

- [ ] Document what happened
- [ ] Identify root cause
- [ ] Check error pattern in timeline
- [ ] Note time to resolution
- [ ] Update documentation
- [ ] Add monitoring for this error type
- [ ] Consider code improvements

**Example:**

```markdown
## Incident: React Hydration Error on Product Page

**Time:** 2025-12-23 15:30 UTC
**Duration:** 12 minutes
**Errors:** 34
**Impact:** Product page not loading for all users

**Root Cause:** localStorage.getItem() in useEffect ran before hydration

**Fix:** Wrapped localStorage in useEffect with mounted check

**Time to Resolution:** 8 minutes

**Improvements:** 
- Add hydration test to CI
- Review other useEffect hooks
- Add error boundary to ProductPage
```

---

## Resources

- [ERROR_TRACKING_SYSTEM.md](./ERROR_TRACKING_SYSTEM.md) - Full API reference
- [ERROR_INVESTIGATION_QUICKSTART.md](./ERROR_INVESTIGATION_QUICKSTART.md) - Quick diagnosis
- [ERROR_TRACKING_INTEGRATION.md](./ERROR_TRACKING_INTEGRATION.md) - How to add error tracking
- [MEMORY_CRISIS_ROOT_CAUSE.md](./MEMORY_CRISIS_ROOT_CAUSE.md) - Memory issue details
- [MEMORY_FIX_DEPLOYMENT_GUIDE.md](./MEMORY_FIX_DEPLOYMENT_GUIDE.md) - Memory fixes applied

---

## On-Call Guide

**During on-call shift:**

1. Save bash functions to `.bashrc`:
   ```bash
   # Get admin token for your team
   export ADMIN_TOKEN="production_admin_token"
   
   # Source error functions
   source ~/.error-functions.sh
   ```

2. Set up monitoring:
   ```bash
   # Run in separate terminal
   ./watch-errors.sh
   ```

3. When alerted:
   ```bash
   # Quick triage
   errors-summary
   
   # Identify issue
   errors-top
   
   # Diagnose
   # (Follow playbook above)
   ```

4. After fix:
   ```bash
   # Clear old errors
   errors-clear
   
   # Monitor recovery
   errors-watch
   ```

---

## FAQ

**Q: Can users see error details?**
A: No, they only see error ID. Stack traces only in dev mode.

**Q: Are error IDs permanent?**
A: No, lost on Vercel function restart (~24 hours). Use error context for lookups.

**Q: How many errors are stored?**
A: 1000 max. Oldest automatically removed.

**Q: Can I export error logs?**
A: Not yet, but you can query the API and save responses.

**Q: What happens if API fails?**
A: Errors still captured client-side, just not sent to monitoring.

**Q: How do I test the system?**
A: Trigger error in console: `throw new Error('test');`

---

## Support Contacts

- **Development:** Check MEMORY_CRISIS_ROOT_CAUSE.md
- **Monitoring:** Run errors-watch command
- **Escalation:** Follow decision tree above
