# Error Tracking System - Live Testing Plan

## Current Status (Dec 23, 20:11 UTC)

**Deployment in progress:** Vercel building new code
- ✅ Code committed: df0bda4
- ✅ Build passes locally: 36/36 tests pass, no TypeScript errors
- ⏳ Production endpoints: Still 404 (old code running)
- ⏳ Memory: Still 94% (will drop when new code deploys)

**Expected**: Deployment complete in 5-10 minutes

---

## Phase 1: Verify Deployment (5 min, repeat until deployment shows)

```bash
# Watch for deployment to complete
watch -n 5 'curl -s https://tasteofgratitude.shop/api/errors/summary -I | grep HTTP'

# Expected progression:
# 1. HTTP/2 404 (old code, still building)
# 2. HTTP/2 401 (new code deployed, requires auth)
# ✅ Success when: 401 instead of 404
```

**Indicators of successful deployment:**
- `/api/errors/summary` returns 401 (not 404)
- `/api/errors/list` returns 401 (not 404)
- Memory drops from 94% to 45-50%

---

## Phase 2: Test Error Endpoints (3 min)

### Test 2a: Verify 401 Without Auth

```bash
# Should return 401 Unauthorized
curl -s https://tasteofgratitude.shop/api/errors/summary | jq .

# Expected response:
# {
#   "success": false,
#   "error": "Unauthorized - Admin access required"
# }
```

**✅ Pass if:** Returns 401 with error message (not 404, not 500)

### Test 2b: Get Admin Token

```bash
# Visit admin login page
open https://tasteofgratitude.shop/admin/login

# Login with admin credentials
# Extract admin_token cookie from DevTools: F12 → Application → Cookies
# Copy the admin_token value
export ADMIN_TOKEN="your_token_here"
```

### Test 2c: Test With Auth

```bash
# Query with valid token
curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" \
  https://tasteofgratitude.shop/api/errors/summary | jq .

# Expected:
# {
#   "success": true,
#   "summary": {
#     "errorCount": 0,
#     "sources": [],
#     "categories": [],
#     "topErrors": [],
#     "recommendations": []
#   }
# }
```

**✅ Pass if:** Returns 200 with summary data

---

## Phase 3: Test Error Capture (5 min)

### Test 3a: Trigger Test Error

1. Visit: https://tasteofgratitude.shop
2. Open browser console (F12 → Console)
3. Paste and execute: `throw new Error('Error tracking test error');`

**Expected on screen:**
- ✅ Error page appears with red icon
- ✅ "Something went wrong" heading
- ✅ Error ID displayed: `err_1704979800000_xxxxx...`
- ✅ Text: "Share this ID with support for investigation"
- ✅ "Try again" and "Go home" buttons present

### Test 3b: Verify Error Was Captured

```bash
# Query error list
curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" \
  'https://tasteofgratitude.shop/api/errors/list?limit=5' | jq .data.errors

# Expected:
# [
#   {
#     "timestamp": "2025-12-23T20:15:00.000Z",
#     "message": "Error tracking test error",
#     "source": "client",
#     "category": "unspecified",
#     "severity": "high",
#     ...
#   }
# ]
```

**✅ Pass if:** Error appears in the list with correct message and source

### Test 3c: Check Summary Includes Error

```bash
# Check if summary now includes the error
curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" \
  https://tasteofgratitude.shop/api/errors/summary | \
  jq '.summary | {errorCount, topErrors, recommendations}'

# Expected:
# {
#   "errorCount": 1,
#   "topErrors": [
#     {
#       "message": "Error tracking test error",
#       "count": 1
#     }
#   ],
#   "recommendations": [...]
# }
```

**✅ Pass if:** Summary shows error count > 0 and error appears in topErrors

---

## Phase 4: Test Filtering & Pagination (3 min)

### Test 4a: Filter by Source

```bash
# Get client errors only
curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" \
  'https://tasteofgratitude.shop/api/errors/list?source=client' | \
  jq '.data | {total, errors: (.errors | length)}'

# Expected: Shows the test error we just captured
```

### Test 4b: Filter by Severity

```bash
# Get critical errors only
curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" \
  'https://tasteofgratitude.shop/api/errors/list?severity=high' | \
  jq '.data.total'

# Expected: At least 1 (our test error was marked as "high" severity)
```

### Test 4c: Test Pagination

```bash
# Get first 5
curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" \
  'https://tasteofgratitude.shop/api/errors/list?limit=5&offset=0' | \
  jq '.data | {limit, offset, total}'

# Expected:
# {
#   "limit": 5,
#   "offset": 0,
#   "total": 1 (or more if other errors exist)
# }
```

**✅ Pass if:** Filtering and pagination work correctly

---

## Phase 5: Test Clear Action (2 min)

```bash
# Clear errors
curl -s -X POST \
  -H "Cookie: admin_token=$ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"clear"}' \
  https://tasteofgratitude.shop/api/errors/summary | jq .

# Expected:
# {
#   "success": true,
#   "message": "Error store cleared"
# }

# Verify cleared
curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" \
  https://tasteofgratitude.shop/api/errors/summary | \
  jq '.summary.errorCount'

# Expected: 0
```

**✅ Pass if:** Error count drops to 0

---

## Phase 6: Memory Verification (2 min)

```bash
# Check memory after deployment
curl -s https://tasteofgratitude.shop/api/health | jq '.checks.memory'

# Expected:
# {
#   "used": 20-25,
#   "total": 49,
#   "percentage": 40-50
# }

# Should be MUCH lower than 94%
```

**✅ Pass if:** Memory < 50% (shows memory fixes are working)

---

## Phase 7: Error Boundary UI Test (3 min)

### Test 7a: Error Page Design

Trigger another error and verify UI elements:

- [ ] Red warning icon visible
- [ ] Heading reads "Something went wrong"
- [ ] Error message text present
- [ ] Error ID box with full ID visible
- [ ] Copy-able error ID (monospace font)
- [ ] "Share this ID with support" message
- [ ] "Try again" button (green)
- [ ] "Go home" button (gray)
- [ ] No console errors in DevTools

### Test 7b: Button Functionality

```bash
# Test "Go home" button
# Click → Should redirect to /
# Verify: URL changes to https://tasteofgratitude.shop/

# Test "Try again" button
# Click → Should reload current page
# Verify: Page refreshes without changing URL
```

---

## Phase 8: Integration Test (5 min)

### Test server-side error capture

Create a test route that errors. Visit an endpoint that triggers a 500:

```bash
# Manually test server error capture
# (Will need a route that throws an error)

# Expected in error list:
# {
#   "source": "server",
#   "message": "...",
#   ...
# }
```

---

## Success Criteria

| Check | Status | Details |
|-------|--------|---------|
| API endpoints exist | [ ] | /api/errors/summary returns 401 not 404 |
| Admin auth works | [ ] | Returns 200 with valid token |
| Error capture works | [ ] | Error ID shown to user, stored in system |
| Error querying works | [ ] | /api/errors/list returns captured errors |
| Filtering works | [ ] | Can filter by source, severity, category |
| Pagination works | [ ] | limit and offset parameters work |
| Memory improved | [ ] | < 50% (down from 94%) |
| UI displays correctly | [ ] | Error page shows error ID and buttons |
| Buttons functional | [ ] | "Try again" and "Go home" work |
| Summary generation | [ ] | Patterns, recommendations, correlations generated |

---

## Commands to Run in Order

```bash
# Set token once (after logging in)
export ADMIN_TOKEN="paste_your_admin_token_here"

# Phase 1: Wait for deployment
watch -n 5 'curl -s https://tasteofgratitude.shop/api/errors/summary -I | head -1'

# Phase 2: Test endpoints
curl -s https://tasteofgratitude.shop/api/errors/summary | jq .
curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" \
  https://tasteofgratitude.shop/api/errors/summary | jq .summary

# Phase 3: Trigger test error (in browser console)
# throw new Error('Error tracking test error');

# Verify capture
curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" \
  'https://tasteofgratitude.shop/api/errors/list?limit=5' | jq .data.errors

# Phase 4: Test filters
curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" \
  'https://tasteofgratitude.shop/api/errors/list?source=client' | jq .data.total

# Phase 5: Clear errors
curl -X POST \
  -H "Cookie: admin_token=$ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"clear"}' \
  https://tasteofgratitude.shop/api/errors/summary

# Phase 6: Check memory
curl -s https://tasteofgratitude.shop/api/health | jq '.checks.memory.percentage'

# Phase 7: Manual UI verification
# Visit https://tasteofgratitude.shop in browser
# Trigger error: throw new Error('UI test');
# Verify error page displays correctly

# Phase 8: Monitor for any errors
while true; do
  curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" \
    https://tasteofgratitude.shop/api/errors/summary | \
    jq '{errorCount: .summary.errorCount, topError: .summary.topErrors[0]}'
  sleep 10
done
```

---

## Troubleshooting

### "API returns 404"
- Deployment still in progress. Wait 5-10 more minutes.
- Check: `vercel logs https://tasteofgratitude.shop`

### "API returns 401 even with token"
- Token might be expired. Log in again at /admin/login
- Verify admin_token cookie is set: Open DevTools → Application → Cookies

### "Error not captured"
- Check browser console for errors during capture
- Make sure error-tracker.ts imported correctly
- Check if error boundary is active

### "Memory still 94%"
- New code hasn't deployed yet, wait for deployment to complete
- Or if deployed, verify latest code is running (check Vercel dashboard)

### "Error ID not showing"
- Check browser console for JavaScript errors
- Verify error boundary component loaded
- Check for TypeScript compilation errors

---

## Reference Documentation

- Full system details: ERROR_TRACKING_README.md
- Quick diagnosis: ERROR_INVESTIGATION_QUICKSTART.md
- Incident response: INCIDENT_RESPONSE_PLAYBOOK.md
- Deployment details: DEPLOYMENT_VERIFICATION_CHECKLIST.md
