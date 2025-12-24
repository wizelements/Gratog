# Automated Health Monitoring - Quick Start

**TL;DR**: System now automatically checks health every minute. Issues are detected and reported to error tracking BEFORE users see "Something went wrong".

## What Changed

### Before (Manual)
```
Error Happens → User sees "Something went wrong" → Admin manually investigates
```

### Now (Automated)
```
Issue Develops (memory rising, DB slow) → Health monitor detects (every 1 min) 
→ Automatically captured in error system → Admin sees in /api/errors/summary
```

## Installation (One-Time)

Nothing to install! The system is already built:

1. ✅ Health monitor created: [lib/health-monitor.ts](/workspaces/Gratog/lib/health-monitor.ts)
2. ✅ Cron job created: [app/api/cron/health-check/route.ts](/workspaces/Gratog/app/api/cron/health-check/route.ts)  
3. ✅ Vercel config updated: [vercel.json](/workspaces/Gratog/vercel.json)
4. ✅ Docs created: [AUTOMATED_HEALTH_MONITORING_SETUP.md](./AUTOMATED_HEALTH_MONITORING_SETUP.md)

Just deploy:

```bash
git add -A
git commit -m "Add automated health monitoring"
git push
# Vercel automatically deploys and starts cron job
```

## How to Use

### 1. Check What's Being Monitored

```bash
curl https://tasteofgratitude.shop/api/health
```

Shows:
- Server status
- Database connectivity
- Memory usage (% and MB)
- Any issues found

### 2. See Detected Issues

```bash
curl -H "Cookie: admin_token=YOUR_ADMIN_TOKEN" \
  https://tasteofgratitude.shop/api/errors/summary | jq '.summary'
```

Shows:
- Total errors detected
- Recommendations for fixes
- Timeline of when issues occurred
- Top errors (sorted by frequency)

### 3. See All Health-Related Errors

```bash
curl -H "Cookie: admin_token=YOUR_ADMIN_TOKEN" \
  https://tasteofgratitude.shop/api/errors/list?endpoint=/health-monitor
```

Shows detailed list of every health check result.

## Alerts You'll See

### Memory Alert
```
"💾 High Memory Usage Detected (85%): Review unbounded caches"
```
**Action**: Check [MEMORY_FIX_DEPLOYMENT_GUIDE.md](./MEMORY_FIX_DEPLOYMENT_GUIDE.md)

### Database Alert
```
"🚨 Critical Errors Found: Immediate investigation required"
```
**Action**: 
```bash
# Check database manually
mongosh "mongodb+srv://..."
```

### System Health
```
"System is DEGRADED: Database: Connection timeout"
```
**Action**: Restart database or check connection string

## Verification

Check if monitoring is running:

```bash
# Should show recent errors with "health-check" in endpoint
curl -H "Cookie: admin_token=..." \
  https://tasteofgratitude.shop/api/errors/list \
  | jq '.data.errors[] | select(.endpoint | contains("health"))'
```

Expected output (should have recent entries):
```json
{
  "timestamp": "2025-12-24T10:30:00Z",
  "message": "Critical memory usage: 92%",
  "source": "server",
  "endpoint": "/health-monitor",
  "severity": "critical"
}
```

## Customization

### Check Every 30 Seconds (instead of 1 minute)

Edit [vercel.json](/workspaces/Gratog/vercel.json):
```json
{
  "crons": [{
    "schedule": "*/0.5 * * * *"  // Every 30 seconds (Vercel precision)
  }]
}
```

### Check Every 5 Minutes

```json
{
  "crons": [{
    "schedule": "*/5 * * * *"  // Every 5 minutes
  }]
}
```

### Add Custom Health Check

Edit [lib/health-monitor.ts](/workspaces/Gratog/lib/health-monitor.ts), add to `performHealthCheck()`:

```typescript
// Check if Redis is responding
const redisHealthy = await checkRedis();
if (!redisHealthy) {
  errors.push('Redis not responding');
  status = 'degraded';
}
```

## Troubleshooting

### Cron job not running?

1. Check Vercel deployment:
   ```bash
   vercel status
   ```

2. Check logs:
   ```bash
   vercel logs https://tasteofgratitude.shop --follow
   ```

3. Manually test (replace with real secret):
   ```bash
   export CRON_SECRET=$(vercel env pull CRON_SECRET --prompt=false)
   curl -H "Authorization: Bearer $CRON_SECRET" \
     https://tasteofgratitude.shop/api/cron/health-check
   ```

### Health checks show but no alerts?

Thresholds might not be triggered. Check actual values:

```bash
curl https://tasteofgratitude.shop/api/health | jq '.checks.memory'
```

Current thresholds:
- **Degraded**: Memory > 80% OR database down
- **Unhealthy**: Memory > 90%

To lower thresholds, edit [lib/health-monitor.ts](/workspaces/Gratog/lib/health-monitor.ts):

```typescript
if (memoryPercentage > 70) {  // Changed from 80
  errors.push(`High memory usage: ${memoryPercentage}%`);
}
```

## Next Steps

1. **Deploy**: Push this to production
2. **Wait 2 minutes**: Let a couple health checks run
3. **Verify**: Check `/api/errors/summary` for health entries
4. **Customize**: Add more checks as needed

See [AUTOMATED_HEALTH_MONITORING_SETUP.md](./AUTOMATED_HEALTH_MONITORING_SETUP.md) for detailed configuration.
