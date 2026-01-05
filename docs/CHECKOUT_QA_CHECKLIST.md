# Checkout QA Checklist

## Pre-Deployment Validation

Run before every deploy:

```bash
npm run validate:payments
```

This checks:
- [ ] Square credentials are set
- [ ] Access token is valid (not client secret)
- [ ] Location ID exists and is active
- [ ] Credit card processing is enabled

## 3-Pass Manual Test Runbook

### Pass A: Pickup Path
1. [ ] Add item to cart ($15-$20 range)
2. [ ] Go to `/order`
3. [ ] Fill customer info (name, email, phone)
4. [ ] Select "Serenbe Farmers Market" pickup
5. [ ] Click "Continue to Payment"
6. [ ] Verify payment form renders with card fields
7. [ ] Screenshot: payment form visible

### Pass B: Delivery Below Minimum
1. [ ] Add item to cart ($10-$20 range, below $30)
2. [ ] Go to `/order`
3. [ ] Fill customer info
4. [ ] Select "Home Delivery"
5. [ ] Verify warning: "Delivery requires $30 minimum"
6. [ ] Verify "Continue Shopping" button visible
7. [ ] Verify "Continue to Payment" button is **disabled**
8. [ ] Screenshot: delivery minimum warning

### Pass C: Delivery Above Minimum
1. [ ] Add item(s) to cart totaling $35+
2. [ ] Go to `/order`
3. [ ] Fill customer info
4. [ ] Select "Home Delivery"
5. [ ] Fill delivery address
6. [ ] Verify no minimum warning
7. [ ] Click "Continue to Payment"
8. [ ] Verify payment form renders
9. [ ] Screenshot: payment form visible

## Payment Form States to Verify

### Loading States
- [ ] "Loading secure payment SDK..." message appears
- [ ] Progress bar shows steps
- [ ] Step indicator visible

### Error States
- [ ] If SDK fails: Clear error message with retry button
- [ ] If domain not registered: Specific message shown
- [ ] "Back to Checkout" button always available
- [ ] Error code shown for debugging

### Ready State
- [ ] Card input fields visible
- [ ] Card container has proper height (not collapsed)
- [ ] "Pay $XX.XX" button enabled
- [ ] Security badges visible

## Browser Matrix

| Browser | Desktop | Mobile | Status |
|---------|---------|--------|--------|
| Chrome | [ ] | [ ] | |
| Safari | [ ] | [ ] | |
| Firefox | [ ] | [ ] | |
| Edge | [ ] | [ ] | |

## Console Check

For each test pass, check browser console:
- [ ] No uncaught errors
- [ ] `[Square]` debug messages showing progress
- [ ] No CSP violations
- [ ] No 404s for Square SDK

## Network Check

Filter network tab for: `square, payments, config, token`
- [ ] `/api/square/config` returns 200
- [ ] Square SDK loads (200 or 304)
- [ ] No blocked requests

## Post-Deploy Verification

After deploying to production:

```bash
# 1. Check health endpoint
curl https://tasteofgratitude.shop/api/health/payments?deep=true

# 2. Check Square config
curl https://tasteofgratitude.shop/api/square/config

# 3. Run diagnostic page
# Visit: https://tasteofgratitude.shop/diagnostic
```

Expected health check response:
```json
{
  "ok": true,
  "squareConnectivity": { "ok": true },
  "hasAccessToken": true,
  "hasLocationId": true
}
```

## Domain Registration

Ensure these domains are registered in Square Dashboard:
- **Square Dashboard > Developer > Applications > [App] > Web Payments SDK**

Production:
- [ ] `https://tasteofgratitude.shop`
- [ ] `https://gratog-theangelsilvers-projects.vercel.app`

Development:
- [ ] `http://localhost:3000`

## Troubleshooting

### Payment form not showing
1. Check console for `[Square]` messages
2. Run `/diagnostic` page
3. Verify domain is registered in Square

### "Web Payments SDK was unable to be initialized"
- Domain not registered → Add to Square Dashboard
- CSP blocking → Check middleware.ts headers
- Network issue → Check connectivity

### Button disabled unexpectedly
- Delivery minimum not met → Add more to cart
- Form validation failing → Check all required fields
- SDK not ready → Wait for loading to complete

## E2E Test Commands

```bash
# Run checkout tests
npx playwright test e2e/checkout-qa.spec.ts

# Run with UI
npx playwright test e2e/checkout-qa.spec.ts --ui

# Run specific test
npx playwright test -g "Pickup path renders payment form"
```
