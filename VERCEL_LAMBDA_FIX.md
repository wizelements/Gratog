# Vercel Lambda Mismatch Fix

## Error from Vercel Build

```
✓ Generating static pages (92/92)
├ ○ /order                                       11.4 kB         361 kB

Error: Unable to find lambda for route: /order
```

## Root Cause

The **middleware.ts** file had `/order` in its matcher:

```typescript
export const config = {
  matcher: ['/delivery', '/order', '/', '/admin/:path*'],
};
```

This told Vercel that `/order` needs middleware processing, which requires a **serverless function (lambda)**.

But the `/order` page is **static** (○), not dynamic (ƒ).

**Mismatch**: Vercel expected a lambda but the page was built as static.

## Fix

Removed `/order` from the middleware matcher since it doesn't need middleware:

```diff
export const config = {
- matcher: ['/delivery', '/order', '/', '/admin/:path*'],
+ matcher: ['/delivery', '/', '/admin/:path*'],
};
```

The middleware doesn't actually DO anything for `/order` - it just passes through with `NextResponse.next()`.

## Why /order Was in Matcher

Originally it was probably added for some feature that was later removed. The middleware only:
- Redirects `/delivery` → `/order` (still needed)
- Handles delivery notices
- Protects `/admin` routes

None of these apply to `/order` itself.

## Result

Now `/order`:
- ✅ Builds as static page
- ✅ No middleware processing needed
- ✅ No lambda expected
- ✅ Should deploy successfully on Vercel

---

**Commit**: "Fix: Remove /order from middleware matcher - causing Vercel lambda mismatch"

**Action**: Redeploy to Vercel - this should work now!
