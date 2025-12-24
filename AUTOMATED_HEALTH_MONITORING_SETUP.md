# Automated Health Monitoring Setup

**Problem solved**: System no longer "guesses" if something went wrong. Issues are **automatically detected** every minute.

## How It Works

### Three-Layer Automation

```
┌─────────────────────────────────────────────────────────┐
│ 1. HEALTH MONITOR (lib/health-monitor.ts)              │
│    - Runs system checks                                 │
│    - Detects degradation in real-time                   │
│    - Avoids spam alerts                                 │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ 2. CRON JOB (app/api/cron/health-check/route.ts)       │
│    - Calls health monitor every 1 minute                │
│    - Triggered by external cron service                 │
│    - Automatically reports issues                       │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ 3. ERROR TRACKER (lib/error-tracker.ts)                │
│    - Captures health issues as errors                   │
│    - Available in /api/errors/summary                   │
│    - No manual investigation needed                     │
└─────────────────────────────────────────────────────────┘
```

## What Gets Monitored

✅ **Database connectivity** - Detects connection failures  
✅ **Memory usage** - Alerts at 80%, critical at 90%  
✅ **Server status** - Verifies process is running  
✅ **Response times** - (extensible)  

## Setup Instructions

### Step 1: Verify Cron Secret

Make sure `CRON_SECRET` is set in your environment:

```bash
# Check if it exists
echo $CRON_SECRET

# If empty, generate one
export CRON_SECRET=$(openssl rand -hex 32)
```

In Vercel:
```bash
vercel env add CRON_SECRET
# Paste your secret (e.g., output from: openssl rand -hex 32)
```

### Step 2: Configure Cron Service

**Option A: Vercel Cron (Built-in, No Setup)**

Vercel automatically detects and runs cron jobs from `vercel.json`:

```bash
# The job is auto-configured in vercel.json
# Just deploy and it will run every minute
vercel deploy
```

Check your `vercel.json` has:
```json
{
  "crons": [{
    "path": "/api/cron/health-check",
    "schedule": "* * * * *"
  }]
}
```

**Option B: External Cron Service (e.g., cron-job.org)**

1. Go to https://cron-job.org
2. Create new cron job:
   - URL: `https://tasteofgratitude.shop/api/cron/health-check`
   - Frequency: Every minute (`* * * * *`)
   - Add HTTP header:
     - Key: `Authorization`
     - Value: `Bearer YOUR_CRON_SECRET`

3. Test it:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://tasteofgratitude.shop/api/cron/health-check
```

### Step 3: Verify It's Working

Check if health checks are running:

```bash
# Should show recent errors from health monitoring
curl -H "Cookie: admin_token=..." \
  https://tasteofgratitude.shop/api/errors/summary | jq '.summary.recommendations'
```

You should see recommendations like:
- "💾 High Memory Usage Detected..." if memory is high
- "🚨 Critical Errors Found..." if database is down

## Real-World Examples

### Example 1: Memory Issue Detected

Health monitor runs every minute:
- Detects heap usage at 92%
- Automatically captures as error: "Critical memory usage: 92%"
- Admin sees in `/api/errors/summary`:
  ```
  "recommendations": [
    "💾 Memory Usage Critical: Check in-memory cache sizes",
    "🎯 Implement LRU cache patterns to prevent memory leaks"
  ]
  ```
- Fix: Reduce cache size before users hit "Something went wrong"

### Example 2: Database Connection Fails

Health monitor ping fails:
- Captures error: "Database: Connection timeout"
- Already in error summary within 1 minute
- Admin investigates and fixes DB
- No users experience 500 errors

### Example 3: API Timeout

Future extension - health monitor can check API endpoints:
```typescript
// Add to health-monitor.ts
const apiHealthy = await checkApiEndpoint('/api/checkout', 5000); // 5s timeout
if (!apiHealthy) {
  errors.push('Checkout API not responding');
}
```

## Monitoring the Monitor

Check if cron job is running:

```bash
# Vercel logs
vercel logs https://tasteofgratitude.shop --follow

# Filter for health checks
vercel logs https://tasteofgratitude.shop --follow | grep health-check
```

### If Cron Isn't Running

1. **Check cron secret matches**:
   ```bash
   vercel env ls | grep CRON_SECRET
   ```

2. **Check vercel.json cron config**:
   ```bash
   cat vercel.json | jq '.crons'
   ```

3. **Manual test**:
   ```bash
   curl -H "Authorization: Bearer $(vercel env pull CRON_SECRET)" \
     https://tasteofgratitude.shop/api/cron/health-check
   ```

4. **Check logs**:
   - Vercel Dashboard → Settings → Functions
   - Look for `/api/cron/health-check` execution logs

## Alert Spam Prevention

The system prevents alert spam:

- **Cooldown**: Each alert type has 5-minute cooldown
- **Max alerts**: Max 3 alerts per issue type per cooldown period
- **Deduplication**: Same error won't be reported 100x in 1 minute

Example: If memory stays high:
- Minute 1: Alert triggered ✓
- Minute 2: Skipped (in cooldown)
- Minute 3: Skipped (in cooldown)
- Minute 5: Next alert allowed (if still high)

## Extending the Monitor

### Add Custom Health Checks

Edit [health-monitor.ts](/workspaces/Gratog/lib/health-monitor.ts):

```typescript
// In performHealthCheck():

// Add cache check
const cacheSize = checkCacheSize();
if (cacheSize > MAX_CACHE_SIZE) {
  errors.push(`Cache size exceeds limit: ${cacheSize}`);
}

// Add external API check
const externalApiHealthy = await checkExternalAPI();
if (!externalApiHealthy) {
  errors.push('External API is down');
}
```

### Add Metrics Tracking

Integrate with monitoring service:

```typescript
// In monitorHealth():
const health = await performHealthCheck();

// Send metrics to Datadog, Prometheus, etc.
await metricsService.gauge('memory.usage', health.checks.memory.percentage);
await metricsService.gauge('db.healthy', health.checks.database ? 1 : 0);
```

## Troubleshooting

### "Unauthorized" when running cron

```bash
# Verify header format
curl -v -H "Authorization: Bearer YOUR_SECRET" \
  https://tasteofgratitude.shop/api/cron/health-check
```

Looks for: `Bearer ${CRON_SECRET}` (with space)

### Health checks show 0 errors but system has issues

1. Check thresholds in [health-monitor.ts](/workspaces/Gratog/lib/health-monitor.ts)
   - Memory threshold: 80% = degraded, 90% = unhealthy
   - Database: Any connection failure = degraded

2. Add more specific checks:
   ```typescript
   // Check specific endpoint
   if (!await checkEndpoint('/api/checkout')) {
     errors.push('Checkout endpoint not responding');
   }
   ```

### Want more frequent checks?

Currently runs every minute. To change:

**In Vercel** - edit `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/health-check",
    "schedule": "*/5 * * * *"  // Every 5 minutes
  }]
}
```

**In external cron** - change frequency to e.g. `*/5 * * * *` for every 5 minutes

⚠️ Warning: Every 10 seconds might hit Vercel limits. Recommend 1-5 minute intervals.

## API Reference

### GET /api/cron/health-check

**Purpose**: Check system health, report issues automatically

**Authentication**: Requires `Authorization: Bearer {CRON_SECRET}` header

**Request**:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://tasteofgratitude.shop/api/cron/health-check
```

**Response (Success)**:
```json
{
  "success": true,
  "message": "Health check complete"
}
```

**Response (Auth Failed)**:
```json
{
  "error": "Unauthorized"
}
```

**Response (Check Failed)**:
```json
{
  "error": "Health check failed",
  "message": "Database: Connection timeout"
}
```

## Related

- [Error Tracking System](./ERROR_TRACKING_SYSTEM.md)
- [Health Endpoint](./app/api/health/route.ts)
- [Health Monitor Source](./lib/health-monitor.ts)
- [Cron Job Source](./app/api/cron/health-check/route.ts)
