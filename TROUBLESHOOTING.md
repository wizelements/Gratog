# Gratog (Taste of Gratitude) — Troubleshooting Guide

> Next.js 15 · Vercel · Square Payments · MongoDB Atlas · Resend · Sentry  
> Domain: tasteofgratitude.shop

---

## Build & Memory Issues

### Heap out of memory during build
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```
**Fix:** Increase Node memory in `package.json`:
```json
"build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
```
On Vercel, set the env var `NODE_OPTIONS=--max-old-space-size=4096`.

### Package manager mismatch (npm vs yarn)
The project uses **npm** (`package-lock.json`). All CI workflows must use `npm ci`, not `yarn install --frozen-lockfile`. Fix any workflow that references yarn:
```yaml
# Correct
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'
- run: npm ci
```

### Missing environment variables in CI
Builds fail silently when GitHub Secrets are missing. Required secrets:
- `SQUARE_APP_ID`, `SQUARE_LOCATION_ID`, `SQUARE_SECRET`
- `WEBHOOK_SIGNATURE_KEY`
- `MONGODB_URI`

Check: **Repo → Settings → Secrets and variables → Actions**

---

## MongoDB Connection Problems

### "Product Not Found" on product pages
**Root cause:** Malformed `MONGODB_URI` (literal newline characters in env var) causes silent connection failure. The product list endpoint has a fallback; individual product lookup does not.

**Fix:**
1. Remove any trailing newlines/whitespace from `MONGODB_URI` in `.env.production` and Vercel dashboard.
2. Correct format:
   ```
   mongodb+srv://Togratitude:<password>@gratitude0.1ckskrv.mongodb.net/taste_of_gratitude?retryWrites=true&w=majority&appName=Gratitude0
   ```
3. Database name must be `taste_of_gratitude`.
4. Redeploy after updating the variable.

### Tests start before MongoDB is ready (CI)
Add a health-check wait step before the build in CI workflows:
```yaml
- name: Wait for MongoDB
  run: |
    for i in $(seq 1 30); do
      mongosh --eval 'db.adminCommand("ping")' && break
      sleep 1
    done
```

---

## Square Payment Debugging

### Quick health check
All three endpoints should respond (401/400 = alive):
```bash
curl -s -o /dev/null -w "%{http_code}" https://tasteofgratitude.shop/api/payments
curl -s -o /dev/null -w "%{http_code}" https://tasteofgratitude.shop/api/orders/create
curl -s -o /dev/null -w "%{http_code}" https://tasteofgratitude.shop/api/webhooks/square
```

### Required Vercel env vars
```
SQUARE_ACCESS_TOKEN=sq0atp-...
SQUARE_LOCATION_ID=L...
SQUARE_ENVIRONMENT=sandbox   # or "production"
MONGODB_URI=mongodb+srv://...
WEBHOOK_SIGNATURE_KEY=...
```

### Webhook not firing / orders not updating
1. Verify webhook URL in Square Dashboard → Webhooks:
   `https://tasteofgratitude.shop/api/webhooks/square` (POST)
2. Subscribe to events: `payment.updated`, `payment.completed`
3. If webhooks return **401**: `WEBHOOK_SIGNATURE_KEY` doesn't match Square's key.

### Orders created but not found by webhooks
The webhook handler checks both `orders` and `marketorders` collections. If a new collection is introduced, the handler must be updated.

### Test the full order flow
```bash
# 1. Create order
curl -X POST https://tasteofgratitude.shop/api/orders/create \
  -H "Content-Type: application/json" \
  -d '{"customer":{"email":"test@test.com","name":"Test","phone":"5555555555"},
       "cart":[{"name":"Test Item","price":10.00,"quantity":1}],
       "fulfillmentType":"pickup_market"}'

# 2. Verify order exists
curl "https://tasteofgratitude.shop/api/orders/by-ref?orderRef=ORDER_NUMBER"
```

---

## PWA / Service Worker Issues

### Stale service worker serving old content
1. Unregister via DevTools → Application → Service Workers → Unregister.
2. Hard refresh (`Ctrl+Shift+R`).
3. Ensure `next.config.js` headers set proper `Cache-Control` for `sw.js`:
   ```
   Cache-Control: no-cache, no-store, must-revalidate
   ```

### PWA install prompt not appearing
- Verify `manifest.json` is served at `/manifest.json` with correct `start_url`, icons, and `display: "standalone"`.
- Check DevTools → Application → Manifest for warnings.
- HTTPS is required (localhost exempt).

### Service worker caching API responses incorrectly
Service worker should use **network-first** for API routes (`/api/*`). If stale payment or product data appears, check the SW fetch handler strategy.

---

## Music Widget Issues

### Hydration mismatch / white screen crash
The music player is isolated via `MusicProviderWrapper` (client component) wrapped in `<Suspense>`. If you see hydration errors:
1. Confirm `MusicProviderWrapper.tsx` has `'use client'` directive.
2. Confirm it is **not** imported directly in a server component — it must go through the Suspense boundary in `app/layout.js`.
3. `MusicControls.tsx` must also have `'use client'`.

### Music button invisible or wrong z-index
The Suspense fallback uses fixed positioning. Check:
- `z-index` is above page content but below modals.
- Fallback element matches the final button dimensions (no layout shift).

### Music won't play on mobile
Browsers require a user gesture before audio playback. The first tap activates the audio context; playback starts on the second tap. This is expected behavior.

---

## Common Deployment Fixes

### Force redeploy without code changes
```bash
git commit --allow-empty -m "trigger: redeploy"
git push origin main
```

### Vercel project settings checklist
| Setting | Value |
|---------|-------|
| Framework Preset | Next.js |
| Node Version | 20 |
| Build Command | `npm run build` |
| Install Command | `npm ci` |
| Output Directory | `.next` (default) |

### Vercel function timeout
Default is 10 s. Payment and webhook routes may need up to 60 s. Set in `vercel.json`:
```json
{
  "functions": {
    "app/api/**/*.ts": { "maxDuration": 60 }
  }
}
```

### Sentry not capturing errors
- Verify `SENTRY_DSN` is set in Vercel env vars.
- Ensure `sentry.client.config.ts` and `sentry.server.config.ts` exist and are imported.
- Check Sentry dashboard for the project's DSN quota.

### Resend emails not sending
- Verify `RESEND_API_KEY` is set.
- Sender domain must be verified in Resend dashboard.
- Check Vercel function logs for 403/429 responses from Resend API.

---

*Last updated: 2026-05-30*
