# Unified Error Tracking & Diagnostics System

## Overview

Every "Something went wrong" error is now captured with **full context** and automatically generates **detailed summaries** for rapid investigation. The system captures:

- Error message, stack trace, and source location
- System state (memory usage, request details, user agent)
- Temporal patterns (when errors occur and correlations)
- Actionable recommendations based on error analysis

## Architecture

### 4-Layer Error Tracking

```
┌─────────────────────────────────────────────────────────┐
│ 1. ERROR BOUNDARIES (Client-side capture)               │
│    - app/error.js (page-level)                          │
│    - app/global-error.js (app-level)                    │
│    - components/ErrorBoundary (component-level)         │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ 2. ERROR TRACKER (lib/error-tracker.ts)                 │
│    - captureClientError()                               │
│    - captureServerError()                               │
│    - captureApiError()                                  │
│    - captureHydrationError()                            │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ 3. ERROR STORE (In-memory with size limits)             │
│    - Max 1000 errors stored                             │
│    - LRU eviction when full                             │
│    - Automatic cleanup of old entries                   │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ 4. API ENDPOINTS (Admin access only)                    │
│    - GET /api/errors/summary (comprehensive analysis)   │
│    - GET /api/errors/list (all errors with filters)     │
└─────────────────────────────────────────────────────────┘
```

## Error Context Captured

Each error is stored with:

```typescript
{
  // Error details
  message: string;           // "Cannot read property 'x' of undefined"
  code?: string;             // "ERR_INVALID_PROP"
  stack?: string;            // Full stack trace
  
  // Source information
  source: 'client' | 'server' | 'api' | 'hydration';
  component?: string;        // "ProductCard", "CheckoutForm"
  endpoint?: string;         // "/api/checkout/create"
  
  // Request context
  method?: string;           // "POST"
  url?: string;              // Full URL
  pathname?: string;         // "/checkout"
  userAgent?: string;        // Browser info
  
  // System state
  memory?: {
    used: number;            // MB
    total: number;           // MB
    percentage: number;       // 0-100
  };
  
  // User context
  userId?: string;
  sessionId?: string;
  
  // Categorization
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;          // "React Hydration Mismatch", "Memory", etc.
  metadata?: {};             // Additional context
  
  timestamp: string;         // ISO 8601
}
```

## API Endpoints

### GET /api/errors/summary

Returns comprehensive analysis of all stored errors:

```bash
curl -H "Cookie: admin_token=..." \
  https://tasteofgratitude.shop/api/errors/summary
```

Response:

```json
{
  "success": true,
  "summary": {
    "id": "summary_1234567890",
    "timestamp": "2025-12-23T18:30:00Z",
    "errorCount": 42,
    "firstOccurrence": "2025-12-23T15:00:00Z",
    "lastOccurrence": "2025-12-23T18:25:00Z",
    
    // Which parts of system errored
    "sources": ["client", "server", "api"],
    "categories": ["React Hydration Mismatch", "API Error"],
    
    // Recurring patterns
    "patterns": [
      {
        "pattern": "Cannot read property 'x' of undefined",
        "frequency": 8,
        "lastSeen": "2025-12-23T18:25:00Z",
        "examples": ["...", "...", "..."]
      }
    ],
    
    // Most common errors
    "topErrors": [
      { "message": "Hydration mismatch in ThemeProvider", "count": 12 },
      { "message": "Memory allocation failed", "count": 8 },
      { "message": "API timeout on /checkout", "count": 5 }
    ],
    
    // Timeline of errors (grouped by minute)
    "timeline": [
      { "timestamp": "2025-12-23T15:00:00Z", "message": "2 error(s) from client", "source": "client", "count": 2 },
      { "timestamp": "2025-12-23T15:01:00Z", "message": "1 error(s) from server", "source": "server", "count": 1 }
    ],
    
    // Errors that occur together
    "correlations": [
      { "error1": "Hydration mismatch...", "error2": "Memory exceeded...", "frequency": 3 }
    ],
    
    // Actionable recommendations
    "recommendations": [
      "🔧 Hydration Error Detected: Check server/client render mismatch in components",
      "💾 Memory Usage Critical: Check in-memory cache sizes (95% usage detected)",
      "🔁 8 Occurrences of \"Cannot read property...\" - Review root cause"
    ]
  }
}
```

### GET /api/errors/list

Returns paginated list of errors with filtering:

```bash
# Get last 50 errors
curl -H "Cookie: admin_token=..." \
  'https://tasteofgratitude.shop/api/errors/list'

# Get critical errors from client
curl -H "Cookie: admin_token=..." \
  'https://tasteofgratitude.shop/api/errors/list?source=client&severity=critical'

# Get API errors with pagination
curl -H "Cookie: admin_token=..." \
  'https://tasteofgratitude.shop/api/errors/list?source=api&limit=20&offset=0'
```

Query parameters:
- `limit`: Max 100, default 50
- `offset`: Pagination offset, default 0
- `source`: Filter by `client`, `server`, `api`, `hydration`
- `category`: Filter by category (e.g., "React Hydration Mismatch")
- `severity`: Filter by `critical`, `high`, `medium`, `low`

Response:

```json
{
  "success": true,
  "data": {
    "total": 42,
    "limit": 50,
    "offset": 0,
    "errors": [
      {
        "timestamp": "2025-12-23T18:25:00Z",
        "message": "Cannot read property 'items' of undefined",
        "source": "client",
        "category": "React Hydration Mismatch",
        "severity": "high",
        "component": "ShoppingCart",
        "memory": { "used": 45, "total": 48, "percentage": 94 },
        "metadata": { "route": "/checkout" }
      }
    ]
  }
}
```

### POST /api/errors/summary

Clear stored errors:

```bash
curl -X POST \
  -H "Cookie: admin_token=..." \
  -H "Content-Type: application/json" \
  -d '{"action":"clear"}' \
  https://tasteofgratitude.shop/api/errors/summary
```

## Usage Examples

### Capture Client-Side Error

```typescript
import { captureClientError } from '@/lib/error-tracker';

try {
  // risky code
} catch (error) {
  await captureClientError(error, 'MyComponent');
}
```

### Capture Server-Side Error

```typescript
import { captureServerError } from '@/lib/error-tracker';

export async function GET(request: NextRequest) {
  try {
    // server code
  } catch (error) {
    await captureServerError(error, request, '/api/products');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

### Capture Hydration Error

```typescript
import { captureHydrationError } from '@/lib/error-tracker';

useEffect(() => {
  if (typeof window !== 'undefined' && mismatchDetected) {
    captureHydrationError(
      'Client/server render mismatch in ThemeProvider',
      { theme: actualTheme, expected: expectedTheme }
    );
  }
}, []);
```

### Capture API Error

```typescript
import { captureApiError } from '@/lib/error-tracker';

const response = await fetch('/api/checkout');
if (!response.ok) {
  await captureApiError(
    `API Error: ${response.statusText}`,
    '/api/checkout',
    request,
    response.status,
    await response.text()
  );
}
```

## Error Categories

The system automatically categorizes errors:

| Category | Severity | Cause | Fix |
|----------|----------|-------|-----|
| React Hydration Mismatch | Critical | Server/client render differs | Check component state initialization |
| Memory | Critical | >80% heap usage | Review in-memory caches, add eviction |
| API Error | High | Network/endpoint failure | Check connectivity, credentials |
| Missing Environment Variable | Critical | Undefined env var | Add to .env.local or Vercel settings |
| Component Error | High | Unhandled exception in component | Add error boundary or null checks |
| Unspecified | Medium | Generic error | Check logs for more context |

## Workflow: Investigating "Something Went Wrong"

### Step 1: Check Summary

```bash
curl -H "Cookie: admin_token=..." \
  https://tasteofgratitude.shop/api/errors/summary | jq
```

**Look for:**
- `errorCount` - How many errors occurred
- `recommendations` - Automatic suggested fixes
- `patterns` - Recurring issues
- `timeline` - When errors started

### Step 2: Review Top Errors

```bash
curl -H "Cookie: admin_token=..." \
  'https://tasteofgratitude.shop/api/errors/list?limit=10' | jq '.data.errors'
```

**Look for:**
- Same error repeating → Root cause bug
- Different errors at same time → System overload
- Errors from one source only → Component-specific issue

### Step 3: Filter by Source

```bash
# Client errors
curl -H "Cookie: admin_token=..." \
  'https://tasteofgratitude.shop/api/errors/list?source=client'

# Server errors
curl -H "Cookie: admin_token=..." \
  'https://tasteofgratitude.shop/api/errors/list?source=server'

# Hydration errors
curl -H "Cookie: admin_token=..." \
  'https://tasteofgratitude.shop/api/errors/list?source=hydration'
```

### Step 4: Check Memory

If errors show `memory.percentage > 80%`:

```bash
curl https://tasteofgratitude.shop/api/health | jq '.checks.memory'
```

Reference: [MEMORY_FIX_DEPLOYMENT_GUIDE.md](./MEMORY_FIX_DEPLOYMENT_GUIDE.md)

### Step 5: Clear & Monitor

```bash
# Clear old errors
curl -X POST \
  -H "Cookie: admin_token=..." \
  -H "Content-Type: application/json" \
  -d '{"action":"clear"}' \
  https://tasteofgratitude.shop/api/errors/summary

# Monitor for new errors
while true; do
  curl -s -H "Cookie: admin_token=..." \
    https://tasteofgratitude.shop/api/errors/summary | jq '.summary.errorCount'
  sleep 10
done
```

## Error Tracking in Production

### Vercel Logs

Errors are automatically logged to Vercel:

```bash
vercel logs https://tasteofgratitude.shop --follow
```

### Browser Console

In production, detailed stacks appear in browser console (when logged in as admin):

```javascript
// DevTools → Console
// Look for [ERROR] entries with category and error ID
```

### Error IDs for Users

When users encounter "Something went wrong", they see an Error ID:

```
Error ID: err_1704979800000_a1b2c3d4

Share this ID with support for investigation
```

Users can share this ID, and support can query:

```bash
curl -H "Cookie: admin_token=..." \
  'https://tasteofgratitude.shop/api/errors/list' | jq '.data.errors[] | select(...)'
```

## Best Practices

### 1. Add Context

Instead of:
```typescript
captureError(error, {});
```

Do this:
```typescript
captureError(error, {
  source: 'api',
  endpoint: '/api/checkout/create',
  userId: user.id,
  metadata: { orderId: order.id, amount: amount }
});
```

### 2. Categorize Errors

```typescript
captureError(error, {
  category: 'React Hydration Mismatch',
  severity: 'critical',
  metadata: { expectedValue: x, actualValue: y }
});
```

### 3. Monitor Critical Paths

Wrap critical operations:

```typescript
export async function checkout(cart: Cart) {
  try {
    return await processPayment(cart);
  } catch (error) {
    await captureApiError(
      error,
      '/api/checkout',
      request,
      500,
      { cart: cart.items.length }
    );
    throw error;
  }
}
```

## Limitations & Future Improvements

### Current

- In-memory storage (lost on restart)
- Max 1000 errors stored
- No persistence to database
- Admin dashboard access only

### Future

1. **Persistent Storage**
   ```typescript
   // Store errors to MongoDB
   db.collection('errors').insertOne(errorContext);
   ```

2. **Sentry Integration**
   ```typescript
   Sentry.captureException(error, { contexts: errorContext });
   ```

3. **Admin Dashboard**
   - Visual timeline of errors
   - Real-time error stream
   - Alerts on critical error spikes
   - Error grouping and deduplication

4. **User-Facing Error Pages**
   - Show error ID prominently
   - Provide support ticket link
   - Estimated time to fix (based on history)

## Testing Error Tracking

### Simulate Error Boundary

```bash
# Trigger error in browser console
throw new Error('Test error for tracking system');
```

Then check:

```bash
curl -H "Cookie: admin_token=..." \
  'https://tasteofgratitude.shop/api/errors/list' | jq '.data.errors[0]'
```

### Simulate Server Error

```bash
# Trigger API error
curl -X POST https://tasteofgratitude.shop/api/test-error
```

### Simulate Memory Error

Already monitored - Check `/api/health`:

```bash
curl https://tasteofgratitude.shop/api/health | jq
```

## Troubleshooting

### Errors not appearing in summary?

1. Check admin authentication
   ```bash
   curl -H "Cookie: admin_token=..." \
     https://tasteofgratitude.shop/api/errors/summary
   ```

2. Check if errors are being thrown
   ```javascript
   // Browser console → filter for "ERROR"
   ```

3. Check in-memory store size
   ```bash
   curl -H "Cookie: admin_token=..." \
     'https://tasteofgratitude.shop/api/errors/list?limit=1' | jq '.data.total'
   ```

### Error IDs not showing to users?

1. Verify error boundary is rendering
   ```javascript
   // Should see "Error ID: err_..." in rendered output
   ```

2. Check React errors in DevTools
   ```
   React DevTools → check if ErrorBoundary is mounted
   ```

## Related Documentation

- [MEMORY_CRISIS_ROOT_CAUSE.md](./MEMORY_CRISIS_ROOT_CAUSE.md) - Memory exhaustion analysis
- [MEMORY_FIX_DEPLOYMENT_GUIDE.md](./MEMORY_FIX_DEPLOYMENT_GUIDE.md) - Deployment steps
- [ERROR_MONITORING_GUIDE.md](./ERROR_MONITORING_GUIDE.md) - Legacy error monitoring (deprecated, use this instead)
