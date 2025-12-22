# Production Runtime Error - Immediate Fix Plan

**Date:** December 22, 2025  
**Status:** CRITICAL - Site returns HTTP 200 but fails at page render  
**Root Cause:** JavaScript runtime error during client-side hydration or initialization  

---

## THE PROBLEM

1. ✅ HTTP 200 is returned with full HTML
2. ✅ All API endpoints respond correctly  
3. ✅ All environment variables are configured
4. ❌ **Page fails to render - users see "Something went wrong" error page**

This indicates:
- Server-side rendering (SSR) works
- Client-side hydration OR a page initialization error crashes the app
- The global error boundary (`global-error.js`) catches the error and shows the error UI

---

## WHAT'S CRASHING

The error is likely happening during:
1. **AuthProvider initialization** - calls `/api/auth/session` on mount
2. **CustomerLayout component load** - dynamically imports many components
3. **Header/Footer dynamic imports** - with `.catch()` fallbacks that might themselves error
4. **Sentry initialization** - error tracking might fail
5. **Third-party scripts** - Square.js, Google Analytics, etc.

---

## DIAGNOSIS STEPS

### Step 1: Check Vercel Logs
```bash
vercel logs --prod --follow
```
This will show the actual JavaScript error that's crashing the page.

### Step 2: Check Browser DevTools
When the site loads (even though it shows error):
- Open DevTools Console
- Look for red error messages
- Note the component/function that errors

### Step 3: Check For Hydration Mismatches
Server renders: `<Component />`  
Client expects: `<Component initialValue={null} />`  
Result: Hydration error, page crashes

---

## LIKELY CULPRITS (In Order)

### 1. **AuthContext fetch call** (Most Likely - 40%)
**File:** `contexts/AuthContext.js` lines 18-30
```javascript
const checkSession = async () => {
  try {
    const response = await fetch('/api/auth/session');
    const data = await response.json();
    // ...
  }
}
```
**Problem:** If this call fails, it might throw an unhandled error  
**Fix:** Wrap in try-catch and set loading=false even on error

### 2. **Sentry initialization** (30%)
**File:** `sentry.client.config.ts` or `sentry.server.config.ts`
**Problem:** Sentry might not initialize properly on Vercel  
**Fix:** Check if Sentry config has correct DSN; disable if DSN is missing

### 3. **Dynamic component imports** (20%)
**File:** `components/CustomerLayout.jsx` lines 13-54
**Problem:** One of the `.catch()` handlers might throw instead of returning null  
**Example:**
```javascript
const Header = dynamic(
  () => import('@/components/Header').catch(() => () => null),
  // If Header import itself errors, this `.catch()` gets it
  // But if the `.catch()` function itself errors, everything breaks
);
```
**Fix:** Test that dynamic fallbacks work correctly

### 4. **Square.js script loading** (10%)
**File:** `app/layout.js` lines 80-84
**Problem:** If Square.js fails to load, it might crash the app
**Fix:** Wrap in error handler

---

## IMMEDIATE FIXES TO TRY

### Fix #1: Disable Sentry Temporarily
If Sentry is causing crashes, disable it:
```typescript
// sentry.client.config.ts
// Comment out or set enabled: false
if (process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'false') {
  // Skip Sentry initialization
}
```

### Fix #2: Add Error Logging to AuthContext
**File:** `contexts/AuthContext.js`
```javascript
useEffect(() => {
  checkSession();
}, []);

const checkSession = async () => {
  try {
    const response = await fetch('/api/auth/session');
    if (!response.ok) {
      console.warn('Session check failed:', response.status);
      setLoading(false);
      return;
    }
    const data = await response.json();
    if (data.success && data.user) {
      setUser(data.user);
    }
  } catch (error) {
    console.warn('Session check error (non-fatal):', error);
    // Don't rethrow - let page continue loading
  } finally {
    setLoading(false); // CRITICAL: Always set false
  }
};
```

### Fix #3: Verify No Hydration Mismatches
**File:** `app/page.js`
Check that state initialized in `useState` matches what SSR renders:
```javascript
const [mounted, setMounted] = useState(false); // false on SSR
useEffect(() => {
  setMounted(true); // true after hydration
}, []);

if (!mounted) {
  return <div>Loading...</div>; // Matches SSR output
}
```

### Fix #4: Add Window Check for Client-Only Code
Anywhere you use `window`, `document`, or browser APIs:
```javascript
useEffect(() => {
  if (typeof window === 'undefined') return; // Skip on SSR
  // Safe to use window here
}, []);
```

---

## DEPLOYMENT FIX PROCESS

1. **Check Vercel logs:**
   ```bash
   vercel logs --prod --follow > /tmp/vercel-logs.txt
   ```

2. **Identify the error message**

3. **Apply appropriate fix from above**

4. **Test locally:**
   ```bash
   yarn build
   yarn start
   # Visit http://localhost:3000
   # Check browser console for errors
   ```

5. **Deploy:**
   ```bash
   git add .
   git commit -m "fix: resolve production hydration/runtime error"
   git push origin main
   ```

6. **Monitor:**
   ```bash
   vercel logs --prod --follow
   # Should show no errors
   ```

---

## QUICK VALIDATION

After deploying, test:
```bash
curl https://tasteofgratitude.shop/api/health
# Should return { "status": "ok" or "degraded" }

curl -s https://tasteofgratitude.shop | grep -i "something went wrong"
# Should return nothing (not found)

curl -s https://tasteofgratitude.shop | grep "Sea Moss"
# Should return HTML with products
```

---

## If Nothing Works

If none of the above fixes work:

1. **Disable dynamic imports temporarily:**
   Replace all `dynamic()` imports with static imports in `CustomerLayout.jsx`

2. **Remove Sentry:**
   Comment out Sentry initialization completely

3. **Simplify HomePage:**
   Comment out product fetching and use demo products only

4. **Deploy minimal version:**
   This will narrow down which component is crashing

Then add features back one at a time until you find the culprit.

---

## PREVENTION

After fix is deployed:

1. **Add error boundary fallback UI** - Already done
2. **Add client-side error logging** - Check localStorage for errors
3. **Monitor Vercel deployments** - Set up error alerts
4. **Test Vercel preview URLs** - Before production
5. **Add TypeScript types** - Catch more errors at build time
