# ⚡ IMMEDIATE FIX CHECKLIST (10 Minutes)

## DO THIS RIGHT NOW TO FIX THE PRODUCTION OUTAGE

### What's Wrong
- [ ] Site shows "Something went wrong" error
- [ ] Root cause: Vercel is missing environment variables
- [ ] Your code is perfect, but config is incomplete

---

## FIX #1: Add Environment Variables to Vercel (5 min)

Go to: **https://vercel.com/dashboard**

### Step A: Login & Select Project
- [ ] Sign in to Vercel
- [ ] Click on "Gratog" project
- [ ] Click "Settings" tab
- [ ] Click "Environment Variables" in left menu

### Step B: Add Critical Variables
For each variable below:
1. Click "Add New"
2. Enter Name (left box)
3. Enter Value (right box) - copy from your `.env.local` file
4. Select scope: "Production"
5. Click "Save"

**CRITICAL (Must Have):**
- [ ] Name: `MONGODB_URI` → Value: Your MongoDB Atlas connection string
- [ ] Name: `SQUARE_ACCESS_TOKEN` → Value: Your Square API token
- [ ] Name: `SQUARE_LOCATION_ID` → Value: Your Square location ID
- [ ] Name: `JWT_SECRET` → Value: Your JWT secret key
- [ ] Name: `ADMIN_JWT_SECRET` → Value: Your admin JWT secret key

**Important (Should Have):**
- [ ] Name: `SQUARE_ENVIRONMENT` → Value: `sandbox` (or `production`)
- [ ] Name: `RESEND_API_KEY` → Value: Your Resend API key
- [ ] Name: `RESEND_FROM_EMAIL` → Value: Your email sender address

**Optional but Recommended:**
- [ ] Name: `SENTRY_DSN` → Value: Your Sentry DSN (for error tracking)

### Step C: Verify Added
- [ ] Refresh the page
- [ ] You should see all variables listed
- [ ] All show "Production" scope

---

## FIX #2: Fix DNS for www Subdomain (2 min)

Go to your domain registrar (where you bought tasteofgratitude.shop)

### Step A: Find DNS Records
- [ ] Log in to registrar account
- [ ] Find "DNS" or "Name Servers" section
- [ ] Look for records for `www.tasteofgratitude.shop`

### Step B: Clean Up Conflicting Records
Look for these A records:
- `76.76.21.93` (Vercel) ← KEEP THIS ✅
- `66.33.60.194` (Unknown) ← DELETE THIS ❌

**Do this:**
- [ ] Delete the `66.33.60.194` record
- [ ] Keep the `76.76.21.93` record
- [ ] (Optional) Change www to CNAME pointing to root domain
- [ ] Save changes
- [ ] Wait 15 minutes for DNS to propagate

---

## FIX #3: Trigger Redeployment on Vercel (1 min)

Go back to: **https://vercel.com/dashboard**

### Option A: Automatic (Recommended)
```bash
git commit --allow-empty -m "trigger: redeploy with production env vars"
git push origin main
```
Then go to Vercel and watch the deployment automatically start.

### Option B: Manual via Dashboard
- [ ] Click on "Gratog" project
- [ ] Find the latest deployment
- [ ] Click the "Redeploy" button
- [ ] Select "Production"
- [ ] Click "Redeploy"

### Option C: Via CLI
```bash
vercel redeploy --prod
```

---

## VERIFICATION: Test It Works (2 min)

### Test 1: Root Domain
```bash
curl -I https://tasteofgratitude.shop
```
**Expected:** `HTTP/1.1 200 OK`  
**Bad:** `HTTP/1.1 500 Internal Server Error`

### Test 2: Homepage Loads
```bash
curl https://tasteofgratitude.shop
```
**Expected:** HTML with "Taste of Gratitude" and products  
**Bad:** Error page saying "Something went wrong"

### Test 3: API Health Check
```bash
curl https://tasteofgratitude.shop/api/health
```
**Expected:** `{ "ok": true }`  
**Bad:** Error or no response

### Test 4: Browser Test
- [ ] Open https://tasteofgratitude.shop in browser
- [ ] Should see homepage with products
- [ ] Should NOT see error page
- [ ] Click around, try checkout
- [ ] Page should load, not error

---

## IF STILL BROKEN AFTER THIS

Run diagnostics:
```bash
npm run diagnose
npm run standby
```

Check Vercel logs:
1. Go to Vercel dashboard
2. Click "Gratog"
3. Click "Deployments"
4. Click latest deployment
5. Click "Logs" tab
6. Look for error messages

---

## TIMELINE

- [ ] **Minute 0-5:** Add environment variables to Vercel
- [ ] **Minute 5-7:** Fix DNS (delete conflicting record)
- [ ] **Minute 7-8:** Trigger redeployment
- [ ] **Minute 8-12:** Wait for deployment to finish
- [ ] **Minute 12-15:** Test and verify

**Total Time:** 10-15 minutes

---

## SUCCESS CRITERIA

When done:
- [ ] No more "Something went wrong" error
- [ ] Homepage loads with products visible
- [ ] Checkout page accessible
- [ ] API endpoints responding with 200 OK
- [ ] www subdomain working
- [ ] No console errors in browser

---

## DO NOT

- ❌ Commit `.env.local` to git (has secrets)
- ❌ Delete the `76.76.21.93` DNS record (that's the Vercel IP)
- ❌ Change SQUARE_ENVIRONMENT from sandbox unless you're ready for production payments
- ❌ Set JWT_SECRET to something simple (use a random 32+ char string)

---

## QUESTIONS?

If you get stuck:
1. Check PRODUCTION_OUTAGE_DIAGNOSTIC.md for detailed explanation
2. Run `npm run diagnose` for infrastructure check
3. Check Vercel deployment logs (Deployments → Latest → Logs)
4. Verify all env vars are Production scope (not Preview)

**Remember:** The code is perfect. This is just missing configuration.
