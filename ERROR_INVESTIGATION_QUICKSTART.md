# Error Investigation Quick Start

## 5-Minute Diagnosis

### 1. Get Error Summary (30 seconds)

```bash
# Set your admin token
ADMIN_TOKEN="your_token_here"

# Get summary
curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" \
  https://tasteofgratitude.shop/api/errors/summary | jq .
```

**What to look for:**
- `errorCount` → How many errors
- `sources` → Which part (client/server/api)
- `categories` → Type of error
- `recommendations` → Suggested fixes

### 2. Check Top Errors (1 minute)

```bash
curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" \
  'https://tasteofgratitude.shop/api/errors/list?limit=5' | jq '.data.errors'
```

**Pattern recognition:**
- Same error repeating? → Bug in code
- Different errors at same time? → System overload
- Only from one source? → Component issue
- Memory high? → Cache leak

### 3. Filter by Source (1 minute)

```bash
# Client-side errors (React/JavaScript)
curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" \
  'https://tasteofgratitude.shop/api/errors/list?source=client' | jq '.data.errors | length'

# Server-side errors
curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" \
  'https://tasteofgratitude.shop/api/errors/list?source=server' | jq '.data.errors | length'

# Hydration errors (server/client mismatch)
curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" \
  'https://tasteofgratitude.shop/api/errors/list?source=hydration' | jq '.data.errors | length'
```

### 4. Check Memory (1 minute)

```bash
curl -s https://tasteofgratitude.shop/api/health | jq '.checks.memory'
```

Expected: `percentage < 50%`
Critical: `percentage > 80%`

If high → See [MEMORY_FIX_DEPLOYMENT_GUIDE.md](./MEMORY_FIX_DEPLOYMENT_GUIDE.md)

### 5. Clear & Monitor (1 minute)

```bash
# Clear old errors
curl -X POST \
  -H "Cookie: admin_token=$ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"clear"}' \
  https://tasteofgratitude.shop/api/errors/summary

# Monitor new errors (run every 10 seconds)
watch -n 10 'curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" \
  https://tasteofgratitude.shop/api/errors/summary | jq ".summary | {errorCount, lastOccurrence, topErrors: .topErrors[0]}"'
```

## Common Issues & Fixes

### "React Hydration Mismatch"

**Cause:** Server rendered different HTML than client

**Fix:**
1. Check for `typeof window` guards in components
2. Verify no `localStorage` access without `useEffect`
3. Check date/time rendering (timezone differences)
4. Ensure ThemeProvider wraps all content

**Command:**
```bash
curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" \
  'https://tasteofgratitude.shop/api/errors/list?category=React%20Hydration%20Mismatch' | jq
```

### Memory Error (>90%)

**Cause:** In-memory cache unbounded growth

**Fix:** 
1. Already applied - see MEMORY_FIX_DEPLOYMENT_GUIDE.md
2. Redeploy if still seeing >80%

**Command:**
```bash
curl -s https://tasteofgratitude.shop/api/health | jq '.checks.memory | select(.percentage > 80)'
```

### API Endpoint Timeout

**Cause:** Database slow or unresponsive

**Fix:**
1. Check MongoDB connection string
2. Verify IP whitelist allows Vercel
3. Check database query performance

**Command:**
```bash
curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" \
  'https://tasteofgratitude.shop/api/errors/list?source=api' | jq '.data.errors[0]'
```

### Missing Environment Variable

**Cause:** Env var not set in Vercel

**Fix:**
1. Check error message for variable name
2. Add to Vercel project settings
3. Redeploy

**Command:**
```bash
curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" \
  'https://tasteofgratitude.shop/api/errors/list?severity=critical' | jq
```

## Error ID Format

When users report errors, they share an ID like:

```
err_1704979800000_a1b2c3d4
```

- `1704979800000` = timestamp (ms since epoch)
- `a1b2c3d4` = random unique suffix

You can use this to correlate with logs or find the exact error context.

## Bash Functions

Add to `.bashrc` or `.zshrc`:

```bash
# Get error summary
errors-summary() {
  curl -s -H "Cookie: admin_token=${ADMIN_TOKEN}" \
    https://tasteofgratitude.shop/api/errors/summary | jq '.summary'
}

# Get top errors
errors-top() {
  curl -s -H "Cookie: admin_token=${ADMIN_TOKEN}" \
    'https://tasteofgratitude.shop/api/errors/list?limit=5' | jq '.data.errors | .[] | {timestamp, message, source, severity}'
}

# Count errors by source
errors-by-source() {
  for source in client server api hydration; do
    count=$(curl -s -H "Cookie: admin_token=${ADMIN_TOKEN}" \
      "https://tasteofgratitude.shop/api/errors/list?source=$source" | jq '.data.total')
    echo "$source: $count"
  done
}

# Clear errors
errors-clear() {
  curl -s -X POST \
    -H "Cookie: admin_token=${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"action":"clear"}' \
    https://tasteofgratitude.shop/api/errors/summary | jq '.message'
}

# Monitor in real time
errors-watch() {
  while true; do
    clear
    echo "=== Error Summary ==="
    errors-summary
    echo ""
    echo "=== Top Errors ==="
    errors-top
    echo ""
    echo "Next check in 10 seconds... (Ctrl+C to exit)"
    sleep 10
  done
}
```

Usage:

```bash
export ADMIN_TOKEN="your_token_here"

errors-summary        # Get overview
errors-top           # See worst errors
errors-by-source     # Count by type
errors-clear         # Clear old errors
errors-watch         # Monitor live
```

## Integration with Monitoring

### Sentry (Future)

```typescript
import * as Sentry from "@sentry/nextjs";
import { generateErrorSummary } from '@/lib/error-tracker';

// Send summary to Sentry daily
setInterval(() => {
  const summary = generateErrorSummary();
  Sentry.captureMessage(`Daily Error Summary: ${summary.errorCount} errors`, 'info');
}, 24 * 60 * 60 * 1000);
```

### Slack Alerts (Future)

```typescript
// Trigger alert on critical errors
if (summary.errorCount > 10 && criticalErrors.length > 0) {
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    body: JSON.stringify({
      text: `🚨 ${summary.errorCount} errors detected!\n${summary.recommendations[0]}`
    })
  });
}
```

## When to Escalate

Escalate to development if:

1. **Error count > 50 in last hour**
   - Production incident
   - Likely cache/memory leak
   - May need immediate rollback

2. **Memory > 90%**
   - Vercel function will start crashing
   - Check cache implementation
   - Reference: MEMORY_FIX_DEPLOYMENT_GUIDE.md

3. **Same error > 20 times**
   - Repeatable bug
   - Likely code issue
   - Needs code fix

4. **Errors in production not in staging**
   - Environment-specific issue
   - Check Vercel env vars
   - Check production database

## Related Documentation

- [ERROR_TRACKING_SYSTEM.md](./ERROR_TRACKING_SYSTEM.md) - Full technical documentation
- [MEMORY_FIX_DEPLOYMENT_GUIDE.md](./MEMORY_FIX_DEPLOYMENT_GUIDE.md) - Memory crisis fixes
- [MEMORY_CRISIS_ROOT_CAUSE.md](./MEMORY_CRISIS_ROOT_CAUSE.md) - Root cause analysis
