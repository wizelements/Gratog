# Error Tracking System - Master Reference

## 🎯 What This Does

Every "Something went wrong" error now captures:
- ✅ Full error message and stack trace
- ✅ Where it happened (client/server/API)
- ✅ System state (memory, CPU, user info)
- ✅ Unique error ID for support correlation
- ✅ Automatic pattern detection and recommendations

## 📚 Documentation Map

Start here based on your role:

### 👤 For Support/Operations

**"A user reported an error with ID: err_1234..."**

→ Start with [ERROR_INVESTIGATION_QUICKSTART.md](./ERROR_INVESTIGATION_QUICKSTART.md)
- 5-minute diagnosis procedure
- Common issues and quick fixes
- When to escalate

**During production incident:**

→ Use [INCIDENT_RESPONSE_PLAYBOOK.md](./INCIDENT_RESPONSE_PLAYBOOK.md)
- Decision trees
- Response workflows
- On-call guide
- Postmortem checklist

### 👨‍💻 For Developers

**"How do I add error tracking to my code?"**

→ See [ERROR_TRACKING_INTEGRATION.md](./ERROR_TRACKING_INTEGRATION.md)
- Copy-paste patterns for API routes
- Server components and actions
- Client components
- Testing examples

**"How does the system work?"**

→ Read [ERROR_TRACKING_SYSTEM.md](./ERROR_TRACKING_SYSTEM.md)
- Complete technical reference
- API endpoint documentation
- Integration examples
- Best practices

### 🔧 For DevOps/Infrastructure

**"What was deployed?"**

→ Check [ERROR_TRACKING_DEPLOYMENT_SUMMARY.md](./ERROR_TRACKING_DEPLOYMENT_SUMMARY.md)
- Files added/modified
- Build status
- Deployment steps
- Performance impact

## 🚀 Quick Start

### Check Current Status (30 seconds)

```bash
export ADMIN_TOKEN="your_admin_token"

# Get error summary
curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" \
  https://tasteofgratitude.shop/api/errors/summary | jq .
```

### Diagnose an Issue (2 minutes)

```bash
# Get top 5 errors
curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" \
  'https://tasteofgratitude.shop/api/errors/list?limit=5' | jq .

# Get errors from specific source
curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" \
  'https://tasteofgratitude.shop/api/errors/list?source=client' | jq .
```

### Monitor Live (10 seconds to setup)

```bash
# Run in a terminal window
watch -n 10 'curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" \
  https://tasteofgratitude.shop/api/errors/summary | \
  jq ".summary | {errorCount, lastError: .topErrors[0]}"'
```

## 📊 API Endpoints

### GET /api/errors/summary

**Returns:** Comprehensive analysis with recommendations

```bash
curl -H "Cookie: admin_token=$TOKEN" \
  https://tasteofgratitude.shop/api/errors/summary
```

**Response includes:**
- `errorCount` - Total errors stored
- `sources` - Where errors came from (client/server/api)
- `categories` - Type of errors
- `patterns` - Recurring error messages
- `topErrors` - Most common errors
- `timeline` - When errors occurred
- `correlations` - Errors that occur together
- `recommendations` - Suggested fixes

### GET /api/errors/list

**Returns:** Paginated list with filtering

```bash
# Get last 50 errors (default)
curl -H "Cookie: admin_token=$TOKEN" \
  https://tasteofgratitude.shop/api/errors/list

# Filter by source
curl -H "Cookie: admin_token=$TOKEN" \
  'https://tasteofgratitude.shop/api/errors/list?source=client'

# Filter by severity
curl -H "Cookie: admin_token=$TOKEN" \
  'https://tasteofgratitude.shop/api/errors/list?severity=critical'

# Pagination
curl -H "Cookie: admin_token=$TOKEN" \
  'https://tasteofgratitude.shop/api/errors/list?limit=20&offset=40'
```

**Query parameters:**
- `source` - `client`, `server`, `api`, `hydration`
- `severity` - `critical`, `high`, `medium`, `low`
- `category` - Filter by category
- `limit` - Max 100, default 50
- `offset` - Pagination, default 0

## 🔍 Diagnosis Examples

### "Site shows errors for all users"

```bash
# Check error count
curl -s -H "Cookie: admin_token=$TOKEN" \
  https://tasteofgratitude.shop/api/errors/summary | jq '.summary.errorCount'

# If >50: Check memory
curl -s https://tasteofgratitude.shop/api/health | jq '.checks.memory'

# Get recommendations
curl -s -H "Cookie: admin_token=$TOKEN" \
  https://tasteofgratitude.shop/api/errors/summary | jq '.summary.recommendations'
```

### "Only hydration errors, React mismatch"

```bash
# Get hydration errors
curl -s -H "Cookie: admin_token=$TOKEN" \
  'https://tasteofgratitude.shop/api/errors/list?source=hydration' | jq '.data.errors'

# Check for patterns
curl -s -H "Cookie: admin_token=$TOKEN" \
  https://tasteofgratitude.shop/api/errors/summary | jq '.summary.patterns[0]'

# Reference: MEMORY_CRISIS_ROOT_CAUSE.md for fixes
```

### "API endpoint /api/checkout keeps failing"

```bash
# Get API errors
curl -s -H "Cookie: admin_token=$TOKEN" \
  'https://tasteofgratitude.shop/api/errors/list?source=api' | \
  jq '.data.errors[] | select(.endpoint=="/api/checkout")'

# Check if database is responsive
curl -s https://tasteofgratitude.shop/api/health | jq '.checks.database'
```

## 🐛 Common Issues

| Issue | Command | Fix |
|-------|---------|-----|
| React hydration mismatch | `?source=hydration` | Check server/client render [#](#react-hydration) |
| Memory exhausted | Check `/api/health` | See [MEMORY_FIX_DEPLOYMENT_GUIDE.md](./MEMORY_FIX_DEPLOYMENT_GUIDE.md) |
| API timeout | `?source=api` | Check MongoDB connection |
| Missing environment var | `?severity=critical` | Add to Vercel settings |
| Component crash | `?source=client` | Add error boundary or null checks |

## 📈 Workflow

### Discovery → Diagnosis → Fix → Verify

```
1. User reports error (usually with Error ID)
           ↓
2. Get error details from API
           ↓
3. Check recommendations (auto-generated)
           ↓
4. Review errors in that category/source
           ↓
5. Identify root cause
           ↓
6. Apply fix (code, config, or redeploy)
           ↓
7. Clear error store and monitor
           ↓
8. Verify no new errors in 5 minutes
```

**Typical time:** 8-15 minutes depending on complexity

## 🎓 Error IDs

When users see errors, they get an ID:

```
Error ID: err_1704979800000_a1b2c3d4

Share this ID with support for investigation
```

**You can use this ID to:**
- Correlate with logs
- Look up exact error context
- Find similar errors
- Include in support tickets

## 📋 Best Practices

### When Checking Summary

```bash
# Weekly review
0 9 * * 1 curl -s -H "Cookie: admin_token=$TOKEN" \
  https://tasteofgratitude.shop/api/errors/summary | \
  jq '.summary | {errors: .errorCount, categories, recommendations}' \
  >> errors-log.txt
```

### When Diagnosing

1. Start with `.summary.errorCount` (how big is the issue?)
2. Check `.summary.recommendations` (what should we fix?)
3. Review `.summary.patterns` (is it recurring?)
4. Filter `.data.errors` (what's specific to this case?)

### When Fixing

1. Test locally: `npm run dev`
2. Push to main: `git push origin main`
3. Monitor: `watch -n 10 'curl... | jq'`
4. Verify: Error count goes to 0 in 2-3 minutes

## 🛠️ Integration

### For API Routes

```typescript
import { captureApiError } from '@/lib/error-tracker';

export async function GET(request: NextRequest) {
  try {
    // your code
  } catch (error) {
    await captureApiError(error, '/api/endpoint', request, 500);
    return NextResponse.json({ error: '...' }, { status: 500 });
  }
}
```

### For Server Actions

```typescript
import { captureServerError } from '@/lib/error-tracker';

'use server';

export async function action() {
  try {
    // your code
  } catch (error) {
    await captureServerError(error, undefined, '/action/name');
    throw error;
  }
}
```

### For Client Components

```typescript
import { captureClientError } from '@/lib/error-tracker';

export function Component() {
  const handle = async () => {
    try {
      // your code
    } catch (error) {
      await captureClientError(error, 'ComponentName');
    }
  };
}
```

See [ERROR_TRACKING_INTEGRATION.md](./ERROR_TRACKING_INTEGRATION.md) for more patterns.

## 🚨 Escalation

Escalate to development if:

| Condition | Action |
|-----------|--------|
| >100 errors in 1 hour | Check if code recently changed |
| Memory > 90% | Reference MEMORY_FIX guide |
| Same error >20 times | Code bug, needs developer |
| Site completely down | Rollback last deployment |
| Unknown root cause | Contact team lead |

## 📞 Getting Help

**I don't understand the error:**
→ Read the `recommendations` field - system suggests fixes

**I need more detail:**
→ See [ERROR_TRACKING_SYSTEM.md](./ERROR_TRACKING_SYSTEM.md)

**I need to integrate error tracking:**
→ See [ERROR_TRACKING_INTEGRATION.md](./ERROR_TRACKING_INTEGRATION.md)

**Production incident, need to triage fast:**
→ See [INCIDENT_RESPONSE_PLAYBOOK.md](./INCIDENT_RESPONSE_PLAYBOOK.md)

**Memory exhaustion issue:**
→ See [MEMORY_CRISIS_ROOT_CAUSE.md](./MEMORY_CRISIS_ROOT_CAUSE.md)

## ✅ Implementation Status

- ✅ Error tracking library implemented
- ✅ Error boundaries enhanced
- ✅ Admin API endpoints created
- ✅ Error IDs shown to users
- ✅ Automatic pattern detection
- ✅ Build passes, ready to deploy
- ✅ Comprehensive documentation

## 🎯 What's Next

1. **Deploy** - Push to main, Vercel auto-deploys (3 min)
2. **Monitor** - Use watch commands to see live errors
3. **Integrate** - Add error tracking to critical API routes
4. **Document** - Create team runbooks for common issues
5. **Improve** - Consider Sentry for long-term persistence

## 📞 Quick Reference Commands

```bash
# Set token
export TOKEN="your_admin_token"

# Get summary
curl -H "Cookie: admin_token=$TOKEN" \
  https://tasteofgratitude.shop/api/errors/summary | jq .

# Get top errors
curl -H "Cookie: admin_token=$TOKEN" \
  'https://tasteofgratitude.shop/api/errors/list?limit=5' | jq .

# Get client errors
curl -H "Cookie: admin_token=$TOKEN" \
  'https://tasteofgratitude.shop/api/errors/list?source=client' | jq .

# Get server errors
curl -H "Cookie: admin_token=$TOKEN" \
  'https://tasteofgratitude.shop/api/errors/list?source=server' | jq .

# Check memory
curl https://tasteofgratitude.shop/api/health | jq .

# Clear errors
curl -X POST \
  -H "Cookie: admin_token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"clear"}' \
  https://tasteofgratitude.shop/api/errors/summary
```

---

**Ready to use?** Start with [ERROR_INVESTIGATION_QUICKSTART.md](./ERROR_INVESTIGATION_QUICKSTART.md)

**Need full details?** See [ERROR_TRACKING_SYSTEM.md](./ERROR_TRACKING_SYSTEM.md)

**Production incident?** Follow [INCIDENT_RESPONSE_PLAYBOOK.md](./INCIDENT_RESPONSE_PLAYBOOK.md)
