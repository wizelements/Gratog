# 🔴 VERCEL & BUILD ISSUE ANALYSIS
## Gratog Project - April 18, 2026

---

## 🚨 CRITICAL ISSUES FOUND

### 1. PACKAGE MANAGER INCONSISTENCY ⚠️ HIGH SEVERITY

**Problem:** Project uses `npm` but workflows use `yarn`

| Evidence | File |
|----------|------|
| `package-lock.json` exists | Root directory |
| `yarn.lock` MISSING | Root directory |
| Workflows use `yarn install` | 5 workflow files |
| Workflows use `npm install` | 2 workflow files |

**Affected Workflows:**
- `integration-tests.yml` - uses `yarn start`
- `payment-api-validation.yml` - uses `yarn install --frozen-lockfile`
- `release-automation.yml` - uses `yarn install --frozen-lockfile`
- `ci.yml` - uses `cache: 'yarn'`
- `test.yml` - uses `yarn build`, `yarn test:unit`

**Why This Causes Failures:**
```bash
# GitHub Actions runner tries:
yarn install --frozen-lockfile
# Error: No yarn.lock found, cannot continue
```

**Fix Required:**
Convert all workflows to use `npm`:
```yaml
# BEFORE (BROKEN):
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'yarn'
- run: yarn install --frozen-lockfile

# AFTER (FIXED):
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'
- run: npm ci
```

---

### 2. MISSING ENVIRONMENT VARIABLES ⚠️ MEDIUM SEVERITY

**Problem:** Workflows reference secrets that may not be configured

**In `ci.yml`:**
```yaml
env:
  SQUARE_APP_ID: ${{ secrets.SQUARE_APP_ID }}
  SQUARE_LOCATION_ID: ${{ secrets.SQUARE_LOCATION_ID }}
  SQUARE_SECRET: ${{ secrets.SQUARE_SECRET }}
  WEBHOOK_SIGNATURE_KEY: ${{ secrets.WEBHOOK_SIGNATURE_KEY }}
```

**If these secrets are not set in GitHub → Build fails**

**Solution:** Check GitHub Secrets settings:
1. Go to Repository Settings → Secrets and variables → Actions
2. Verify these secrets exist:
   - `SQUARE_APP_ID`
   - `SQUARE_LOCATION_ID`
   - `SQUARE_SECRET`
   - `WEBHOOK_SIGNATURE_KEY`

---

### 3. BUILD MEMORY LIMITS ⚠️ MEDIUM SEVERITY

**Problem:** Next.js build may run out of memory

**Current Setting:**
```json
"build": "NODE_OPTIONS='--max-old-space-size=2048' next build"
```

**GitHub Actions runners have:**
- 7 GB RAM (standard)
- 2 GB allocated to Node.js

**Issue:** If build exceeds 2GB, it crashes with:
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

**Solutions:**
1. **Increase memory limit:**
   ```json
   "build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
   ```

2. **Use GitHub Actions larger runner:**
   ```yaml
   runs-on: ubuntu-latest-4-cores  # More memory
   ```

3. **Enable Next.js memory optimization:**
   ```javascript
   // next.config.js
   experimental: {
     optimizeCss: true,
     webpackBuildWorker: true, // Parallel builds
   }
   ```

---

### 4. MONGODB SERVICE NOT READY ⚠️ MEDIUM SEVERITY

**Problem:** Tests start before MongoDB is fully initialized

**In `smoke-tests.yml`:**
```yaml
services:
  mongodb:
    image: mongo:6.0
    options: >-
      --health-cmd "mongosh --eval 'db.adminCommand({ping: 1})'"
      --health-interval 10s

steps:
  - name: Build application
    run: npm run build  # ❌ Builds BEFORE MongoDB ready
    env:
      MONGODB_URI: mongodb://localhost:27017/smoke_test_db
```

**Issue:** Build process connects to MongoDB, but service may not be ready.

**Fix:** Add health check wait:
```yaml
- name: Wait for MongoDB
  run: |
    for i in {1..30}; do
      mongo --eval 'db.adminCommand("ping")' && break
      sleep 1
    done
```

---

### 5. PLAYWRIGHT BROWSER INSTALL ⚠️ LOW SEVERITY

**Problem:** Browser installation adds 2-3 minutes to every build

**Current:**
```yaml
- name: Install Playwright browsers
  run: npx playwright install chromium --with-deps
```

**Optimization:** Use GitHub Actions cache:
```yaml
- name: Cache Playwright browsers
  uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
```

---

### 6. VERCEL-SPECIFIC ISSUES ⚠️ UNKNOWN

**Cannot verify without Vercel access, but potential issues:**

1. **Build Command:** Vercel uses `next build` but project has custom build
2. **Environment Variables:** May not match GitHub Secrets
3. **Node Version:** Vercel defaults to Node 18, project needs 20
4. **Output Directory:** Next.js 14+ changed output structure

**Recommendations:**
- Set `NODE_VERSION=20` in Vercel project settings
- Verify `next.config.js` has no `output: 'standalone'` (removed)
- Check Vercel Functions timeout (default 10s, may need 60s for API routes)

---

## ✅ WHAT'S WORKING

| Component | Status |
|-----------|--------|
| Security Scanning | ✅ PASS |
| Repository Structure | ✅ OK |
| package-lock.json | ✅ Present |
| vercel.json | ✅ Valid JSON |
| next.config.js | ✅ Valid (no standalone) |
| Git Push | ✅ Working |

---

## 🔧 IMMEDIATE ACTION ITEMS

### Priority 1: Fix Package Manager
```bash
# Update all workflows to use npm instead of yarn
sed -i 's/yarn install/npm ci/g' .github/workflows/*.yml
sed -i "s/cache: 'yarn'/cache: 'npm'/g" .github/workflows/*.yml
sed -i 's/yarn /npm run /g' .github/workflows/*.yml
```

### Priority 2: Verify Secrets
1. Go to https://github.com/wizelements/Gratog/settings/secrets/actions
2. Add missing secrets

### Priority 3: Fix Memory Issues
```json
// package.json
{
  "scripts": {
    "build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
  }
}
```

### Priority 4: Add MongoDB Health Check
Add to all test workflows before build step.

---

## 📊 SUMMARY

| Issue | Severity | Files Affected | Fix Complexity |
|-------|----------|----------------|----------------|
| Package Manager | 🔴 HIGH | 5 workflows | Easy |
| Missing Secrets | 🟡 MEDIUM | 3 workflows | Medium |
| Memory Limits | 🟡 MEDIUM | 1 config | Easy |
| MongoDB Timing | 🟡 MEDIUM | 4 workflows | Medium |
| Playwright Cache | 🟢 LOW | 3 workflows | Easy |

**Total Issues:** 5 critical blockers
**Estimated Fix Time:** 30 minutes
**Impact After Fix:** Builds should pass

---

## 🎯 VERCEL-SPECIFIC CHECKLIST

- [ ] NODE_VERSION=20 set in Vercel dashboard
- [ ] All environment variables configured
- [ ] Build command: `npm run build`
- [ ] Output directory: `.next` (default)
- [ ] Install command: `npm ci`
- [ ] Framework preset: Next.js

**Check Vercel Dashboard:** https://vercel.com/wizelements/gratog/settings
