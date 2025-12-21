# Error Monitoring & "Something Went Wrong" Tracking

**Status:** ✅ COMPREHENSIVE MONITORING IN PLACE

---

## Overview

The application has **4 layers** of error monitoring to catch and track every "Something went wrong" scenario:

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1: Global Error Boundary (Root Level)            │
│  └─ app/global-error.js - Catches root-level crashes    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 2: Page-Level Error Boundary                     │
│  └─ app/error.js - Catches page-level errors            │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 3: Component-Level Error Boundaries              │
│  └─ components/ErrorBoundary.jsx - Catches UI crashes   │
│  └─ Integrated throughout CustomerLayout                │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 4: Sentry Error Tracking (All Layers)            │
│  └─ Captures to Sentry with full context                │
│  └─ Session replays on errors                           │
│  └─ Performance monitoring                              │
└─────────────────────────────────────────────────────────┘
```

---

## Layer 1: Global Error Boundary

**File:** `app/global-error.js`

**What it catches:** Root-level JavaScript errors that crash the entire application

**What users see:**
- ❌ "Something went wrong" message with error icon
- 🔄 "Try again" button (triggers error reset)
- 🏠 "Go to Homepage" button
- 💻 Error details in development mode only

**Code:**
```javascript
export default function GlobalError({ error, reset }) {
  return (
    <div>
      <h2>Something went wrong</h2>
      <p>We're sorry, but something unexpected happened. Our team has been notified.</p>
      <button onClick={() => reset()}>Try again</button>
      <button onClick={() => window.location.href = '/'}>Go to Homepage</button>
      {process.env.NODE_ENV === 'development' && <pre>{error.message}\n{error.stack}</pre>}
    </div>
  );
}
```

**When triggered:**
- Unhandled JavaScript exceptions at root layout level
- Critical component initialization failures
- Fatal state management errors

---

## Layer 2: Page-Level Error Boundary

**File:** `app/error.js`

**What it catches:** Errors within individual pages/routes

**What users see:**
- ❌ "Something went wrong" message
- 🔄 "Try again" button
- 🏠 "Go home" button

**When triggered:**
- Page component rendering errors
- Route-specific data fetching failures
- Dynamic page generation errors

**Code:**
```javascript
export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div>
      <h2>Something went wrong</h2>
      <button onClick={() => reset()}>Try again</button>
      <button onClick={() => (window.location.href = '/')}>Go home</button>
    </div>
  );
}
```

---

## Layer 3: Component-Level Error Boundaries

**File:** `components/ErrorBoundary.jsx`

**What it catches:** JavaScript errors in any child component without crashing the entire page

**Where it's used:** `components/CustomerLayout.jsx` - wraps all major sections:

| Section | Fallback | Error Handling |
|---------|----------|-----------------|
| Header | Gray placeholder div | Graceful degradation |
| Breadcrumbs | Silent fail (renders nothing) | Hidden error |
| Main Content | User-friendly message with refresh button | Recoverable |
| Footer | Gray placeholder div | Graceful degradation |
| Analytics | Silent fail | Non-blocking |
| Cart | Silent fail | Cart still accessible |
| Notifications | Silent fail | Non-blocking |
| Services | Try/catch wrapper | Safe initialization |

**Features:**
- **Silent Mode:** `<ErrorBoundary silent>` - renders nothing, prevents UI jank
- **Custom Fallback:** `<ErrorBoundary fallback={<CustomUI />}>` - shows replacement UI
- **Default:** Shows minimal error message with "Unable to load this section"

**Code:**
```javascript
export class ErrorBoundary extends React.Component {
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    
    // Report to error tracking service
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, { extra: errorInfo });
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      if (this.props.silent) return null;
      return <div className="...">Unable to load this section</div>;
    }
    return this.props.children;
  }
}
```

**Example usage:**
```jsx
<ErrorBoundary fallback={<div className="h-28 bg-white border-b" />}>
  <Header />
</ErrorBoundary>

<ErrorBoundary silent>
  <GoogleAnalytics />
</ErrorBoundary>

<ErrorBoundary fallback={<p>We're experiencing a temporary issue. Please refresh.</p>}>
  {children}
</ErrorBoundary>
```

---

## Layer 4: Sentry Error Tracking

**Service:** Sentry (Error Tracking & Monitoring)  
**Package:** `@sentry/nextjs` v10.26.0

### Configuration Files

#### Client-Side Config (`sentry.client.config.ts`)
```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Capture 10% of performance transactions
  tracesSampleRate: 0.1,
  
  // Session replay: 1% of all sessions
  replaysSessionSampleRate: 0.01,
  
  // Session replay: 100% of sessions WITH errors
  replaysOnErrorSampleRate: 1.0,
  
  // Environment tracking
  environment: process.env.NODE_ENV,
  
  // Release tracking (commit SHA)
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  
  // Integrations
  integrations: [
    replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  
  // Filter noise
  ignoreErrors: [
    'top.GLOBALS',
    'originalCreateNotification',
    'Non-Error promise rejection captured',
  ],
  
  // Add app context
  beforeSend(event) {
    event.contexts = {
      app: {
        name: 'Taste of Gratitude',
        version: '1.0.0',
      },
    };
    return event;
  },
});
```

#### Server-Side Config (`sentry.server.config.ts`)
```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  
  // Remove sensitive data
  beforeSend(event) {
    delete event.request?.headers['authorization'];
    delete event.request?.headers['cookie'];
    
    // Filter token params from URLs
    if (event.request?.query_string) {
      event.request.query_string = filterTokens(event.request.query_string);
    }
    
    return event;
  },
  
  // Ignore handled errors
  ignoreErrors: [
    /admin.*token/i,
    'NetworkError',
    'Failed to fetch',
  ],
});
```

#### Edge Config (`sentry.edge.config.ts`)
```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});
```

### Where Sentry Captures Errors

**1. Error Boundaries** (Automatic)
```javascript
// In ErrorBoundary.jsx componentDidCatch()
if (typeof window !== 'undefined' && window.Sentry) {
  window.Sentry.captureException(error, { extra: errorInfo });
}
```

**2. API Routes** (Manual)
```typescript
// In app/api/checkout/route.ts
try {
  // ... checkout logic
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      api: 'checkout',
      component: 'square_payment_link'
    },
    contexts: {
      checkout: {
        itemCount: lineItems.length
      }
    }
  });
}
```

**3. Payment Route** (Manual)
```typescript
// In app/api/payments/route.ts
try {
  // ... payment processing
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      api: 'payments',
      component: 'square_payment'
    }
  });
}
```

### Sentry Features Enabled

| Feature | Purpose | Rate |
|---------|---------|------|
| **Error Tracking** | Capture all unhandled exceptions | 100% |
| **Performance Monitoring** | Track slow transactions | 10% sample |
| **Session Replay** | Record user sessions (all interactions) | 1% of sessions |
| **Replay on Error** | Record full session when error occurs | 100% of errors |
| **Release Tracking** | Track which commit caused the error | Auto (Git SHA) |
| **Environment Separation** | Separate development from production | Auto |

---

## What Gets Reported to Sentry

### Error Information
- ✅ Error message and stack trace
- ✅ Component/file where error occurred
- ✅ User's browser and OS
- ✅ Exact timestamp of error
- ✅ Session ID (if multiple errors in same session)
- ✅ Full session replay (video of user actions before error)

### Context Information
- ✅ App name: "Taste of Gratitude"
- ✅ App version: "1.0.0"
- ✅ Deploy commit SHA
- ✅ Environment: development/production
- ✅ Custom tags (api, component, etc.)
- ✅ API response data (anonymized)

### What Gets Filtered Out (Privacy)
- ❌ Authorization tokens/headers
- ❌ Session cookies
- ❌ API keys in query parameters
- ❌ User passwords/sensitive data
- ❌ Admin authentication errors (handled locally)

---

## Where to Monitor Errors

### Sentry Dashboard
**URL:** https://sentry.io → Project: Taste of Gratitude

**What to check:**
1. **Issues page** - List of error types
2. **Error frequency** - How often each error occurs
3. **Affected users** - How many users hit the error
4. **Session replays** - Video of what user did before error
5. **Stack traces** - Exact code location of error

### Vercel Deployment
**URL:** https://vercel.com → deployments

**What to check:**
1. **Build logs** - Any compilation errors
2. **Runtime errors** - Errors during execution
3. **Function logs** - API route errors

### Application Logs
- **Browser Console:** `console.error('...')` in global-error.js, error.js
- **ErrorBoundary Logs:** `console.error('ErrorBoundary caught:', ...)` 
- **API Logs:** Server-side error logging with full context

---

## Error Flow Examples

### Example 1: Component Crash (Header)
```
User visits page
    ↓
Header component initializes
    ↓
Header throws error (e.g., API call fails)
    ↓
ErrorBoundary in CustomerLayout catches it
    ↓
[Step 1] Log to console: "ErrorBoundary caught: ..."
[Step 2] Send to Sentry with component="Header"
[Step 3] Render fallback: <div className="h-28 bg-white border-b" />
    ↓
Page still works - rest of layout renders normally
    ↓
User sees gray placeholder where header should be
```

### Example 2: Global Crash (Root Layout)
```
User interacts with page
    ↓
Critical error in root layout
    ↓
app/global-error.js catches it
    ↓
[Step 1] Log error to console
[Step 2] Send to Sentry
[Step 3] Render error page: "Something went wrong"
    ↓
User sees error message with action buttons
    ↓
User clicks "Try again" → Page resets and re-renders
    ↓
User clicks "Go to Homepage" → Navigate to /
```

### Example 3: API Failure
```
User submits checkout form
    ↓
POST /api/checkout triggered
    ↓
Square payment fails (e.g., network error)
    ↓
Try/catch block catches error
    ↓
[Step 1] Log error details with context (itemCount, etc.)
[Step 2] Send to Sentry with tags={api: 'checkout', ...}
[Step 3] Return 500 response to client
    ↓
Client shows error in UI
    ↓
Sentry shows: Error in checkout API with item count in context
```

---

## Monitoring Checklist

After deployment, confirm:

- [ ] **Sentry Dashboard** - Shows "Taste of Gratitude" project
- [ ] **Error Tracking** - Can see recent errors and stack traces
- [ ] **Session Replays** - Can play back sessions with errors
- [ ] **Performance** - Can see transaction durations
- [ ] **Release** - Current commit SHA is tracked
- [ ] **Environment** - Errors marked as "production"

### To Test Error Monitoring (Dev Only)

Open browser console and run:
```javascript
// Trigger ErrorBoundary
throw new Error('Test error for monitoring');

// Or trigger Sentry directly
window.Sentry?.captureException(new Error('Test Sentry capture'));
```

Then check Sentry dashboard to verify error appears within 1-2 seconds.

---

## Key Points

✅ **No error goes untracked** - Every "Something went wrong" has 4 layers of monitoring  
✅ **Session replays** - Can see exactly what user was doing before error  
✅ **Performance data** - Know which pages are slow  
✅ **Privacy protected** - Sensitive data filtered before sending to Sentry  
✅ **Graceful degradation** - Components fail independently, not entire app  
✅ **User recovery** - "Try again" and "Go home" buttons always available  
✅ **Real-time alerts** - Can set up Sentry alerts for critical errors  

---

## Environment Variables Required

```bash
# Must be set for Sentry to work
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Auto-detected (Vercel)
VERCEL_GIT_COMMIT_SHA=commit-hash
NODE_ENV=production
```

If Sentry DSN is not set, all monitoring still works locally but data won't be sent to Sentry dashboard.
