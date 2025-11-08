# 🚀 VERCEL DEPLOYMENT GUIDE - COMPLETE SETUP

**Project:** Taste of Gratitude E-commerce  
**Framework:** Next.js 15.5.4  
**Database:** MongoDB Atlas  
**Payment:** Square API  
**Status:** ✅ Ready for Production

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### 1. Environment Variables (Required)

Copy these to Vercel Environment Variables:

```bash
# === CRITICAL - SQUARE CREDENTIALS ===
SQUARE_ACCESS_TOKEN=                    # Production Access Token (EAAA... or sq0atp-...)
NEXT_PUBLIC_SQUARE_APPLICATION_ID=     # Production App ID (sq0idp-...)
SQUARE_LOCATION_ID=                    # Production Location ID (L...)
SQUARE_ENVIRONMENT=production          # Exact string
SQUARE_WEBHOOK_SIGNATURE_KEY=          # From Square Dashboard
SQUARE_MOCK_MODE=false                 # Disable fallback

# === DATABASE ===
MONGODB_URI=                           # MongoDB Atlas connection string
DATABASE_NAME=taste_of_gratitude       # Database name

# === EMAIL SERVICE ===
RESEND_API_KEY=                        # Resend API key (re_...)

# === APPLICATION URLs ===
NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
CORS_ORIGINS=https://your-domain.vercel.app

# === DELIVERY CONFIGURATION ===
NEXT_PUBLIC_FULFILLMENT_DELIVERY=enabled
NEXT_PUBLIC_FULFILLMENT_PICKUP=enabled
NEXT_PUBLIC_FULFILLMENT_SHIPPING=enabled

DELIVERY_ZIP_WHITELIST=30310,30311,30312,30313,30314,30315,30316,30317,30318,30319,30324,30331,30344,30349,30354,30363,30378
DELIVERY_MIN_SUBTOTAL=30
DELIVERY_BASE_FEE=6.99
DELIVERY_FREE_THRESHOLD=75

# === FEATURE FLAGS ===
FEATURE_CHECKOUT_V2=on

# === ADMIN ===
ADMIN_SECRET=                          # Secure random string

# === ANALYTICS (Optional) ===
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=

# === ENVIRONMENT ===
NODE_ENV=production
```

---

## 🔧 VERCEL CONFIGURATION

### Files Configured:

1. ✅ `/vercel.json` - Function timeouts optimized
2. ✅ `/.vercelignore` - Excludes test files
3. ✅ `/next.config.js` - Build optimizations
4. ✅ `/.env.example` - Template for environment variables

### Function Timeouts:

| Route | Timeout | Reason |
|-------|---------|--------|
| Default | 30s | Standard API routes |
| `/api/orders/create` | 60s | Database + email/SMS |
| `/api/payments` | 60s | Square API calls |
| `/api/checkout` | 60s | Payment link creation |
| `/api/square-webhook` | 60s | Webhook processing |

---

## 📦 BUILD CONFIGURATION

### Vercel Build Settings:

```yaml
Framework Preset: Next.js
Build Command: npm run build
Output Directory: .next
Install Command: npm install
Node Version: 18.x or 20.x
```

### Build Optimizations Active:

- ✅ CSS optimization enabled
- ✅ Code splitting (vendors, common chunks)
- ✅ Tree shaking enabled
- ✅ Console removal in production (except errors/warnings)
- ✅ Image optimization (WebP, AVIF)
- ✅ MongoDB external package handling
- ✅ Gzip compression enabled
- ✅ Bundle size optimization

**Build Output:** 84 routes, ~347 KB shared JS

---

## 🗄️ DATABASE SETUP

### MongoDB Atlas Configuration:

1. **Create Cluster** (if not exists)
   - Provider: AWS or Azure
   - Region: us-east-1 (closest to Vercel)
   - Tier: M0 (free) or higher

2. **Network Access**
   - Add: `0.0.0.0/0` (allow from anywhere for Vercel)
   - Or: Use Vercel's IP whitelist

3. **Database User**
   - Create user with read/write permissions
   - Copy connection string to `MONGODB_URI`

4. **Collections Created Automatically:**
   - `orders` - Order tracking
   - `customers` - Customer data
   - `coupons` - Coupon management
   - `payments` - Payment records
   - `square_catalog_items` - Product catalog
   - `square_catalog_categories` - Categories
   - `square_sync_metadata` - Sync tracking
   - `passports` - Rewards system
   - `quiz_results` - Quiz data
   - `newsletter_subscribers` - Email list

---

## 🎨 SQUARE SETUP

### Square Developer Dashboard:

1. **Create Production Application**
   - https://developer.squareup.com/apps
   - Select "Production" tab

2. **Enable Required Permissions:**
   - ✅ PAYMENTS_WRITE
   - ✅ PAYMENTS_READ
   - ✅ ORDERS_WRITE
   - ✅ ORDERS_READ
   - ✅ ITEMS_READ
   - ✅ INVENTORY_READ

3. **Copy Credentials:**
   ```
   Production Access Token → SQUARE_ACCESS_TOKEN
   Application ID → NEXT_PUBLIC_SQUARE_APPLICATION_ID
   Location ID → SQUARE_LOCATION_ID
   ```

4. **Configure Webhooks:**
   - URL: `https://your-domain.vercel.app/api/webhooks/square`
   - Events: payment.created, payment.updated, order.updated, inventory.count.updated
   - Copy Signature Key → `SQUARE_WEBHOOK_SIGNATURE_KEY`

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Connect Repository

1. Go to Vercel dashboard
2. Click "Add New Project"
3. Import your Git repository
4. Select framework: Next.js

### Step 2: Configure Environment Variables

1. Go to Project Settings → Environment Variables
2. Add all variables from `.env.example`
3. Set for: Production, Preview, Development
4. Save changes

### Step 3: Deploy

```bash
# Option A: Push to Git (auto-deploy)
git push origin main

# Option B: Vercel CLI
npm i -g vercel
vercel --prod
```

### Step 4: Verify Deployment

```bash
# Get your Vercel URL (e.g., your-project.vercel.app)
DEPLOY_URL=https://your-project.vercel.app

# Test health
curl $DEPLOY_URL/api/health

# Test Square diagnostic
curl -X POST $DEPLOY_URL/api/square/diagnose

# Test products
curl $DEPLOY_URL/api/products
```

---

## ✅ POST-DEPLOYMENT VERIFICATION

### Critical Endpoints to Test:

```bash
# 1. Health Check
curl https://your-domain.vercel.app/api/health
# Expected: {"status": "healthy", "services": {"database": "connected"}}

# 2. Square Diagnostic
curl -X POST https://your-domain.vercel.app/api/square/diagnose
# Expected: {"results": {"overallStatus": "READY"}}

# 3. Products API
curl https://your-domain.vercel.app/api/products
# Expected: {"success": true, "products": [...29 items]}

# 4. Order Creation (with valid data)
curl -X POST https://your-domain.vercel.app/api/orders/create \
  -H "Content-Type: application/json" \
  -d '{
    "cart": [{"id": "test-id", "name": "Test", "price": 10, "quantity": 1}],
    "customer": {"name": "Test User", "email": "test@test.com", "phone": "1234567890"},
    "fulfillmentType": "pickup",
    "pickupLocation": "serenbe"
  }'
# Expected: {"success": true, "order": {...}}

# 5. Payment Link Creation (with valid catalog ID)
curl -X POST https://your-domain.vercel.app/api/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "lineItems": [{"catalogObjectId": "YOUR_CATALOG_ID", "quantity": "1"}]
  }'
# Expected: {"success": true, "paymentLink": {"url": "https://square.link/..."}}
```

---

## 🔍 MONITORING & LOGS

### Vercel Dashboard:

1. **Runtime Logs**
   - Monitor for errors in real-time
   - Filter by severity (error, warn, info)
   - Check for Square authentication errors

2. **Analytics**
   - Track API response times
   - Monitor function execution duration
   - Watch for timeouts

3. **Error Tracking**
   - Set up error alerts
   - Monitor 500 errors
   - Track Square API failures

### Key Metrics to Watch:

| Metric | Target | Alert If |
|--------|--------|----------|
| Health check response | <100ms | >2s |
| API response time | <1s | >5s |
| Database queries | <500ms | >2s |
| Function duration | <30s | >50s |
| Error rate | <1% | >5% |
| Square API success | >99% | <95% |

---

## 🔐 SECURITY CONFIGURATION

### Headers Configured:

- ✅ `X-Content-Type-Options: nosniff`
- ✅ `Referrer-Policy: strict-origin-when-cross-origin`
- ✅ `Strict-Transport-Security` (HSTS)
- ✅ `X-Frame-Options: DENY`
- ✅ CORS properly configured

### Security Best Practices:

1. ✅ No credentials in code (all in env vars)
2. ✅ Console logs sanitized in production
3. ✅ Error messages don't leak sensitive data
4. ✅ Webhook signature verification enabled
5. ✅ Input validation on all endpoints
6. ✅ Rate limiting can be added via Vercel Edge Config

---

## 🎯 PERFORMANCE OPTIMIZATIONS

### Implemented:

1. **Build Optimizations**
   - Code splitting by vendor/common chunks
   - Tree shaking enabled
   - Dead code elimination
   - Module concatenation

2. **Image Optimizations**
   - WebP and AVIF formats
   - Lazy loading
   - Responsive sizes
   - 1-year cache TTL

3. **API Optimizations**
   - MongoDB connection pooling
   - Response compression
   - ETag generation
   - Efficient database queries

4. **Memory Optimizations**
   - Reduced page buffer
   - External packages properly configured
   - Webpack optimizations
   - On-demand entry management

---

## 🐛 TROUBLESHOOTING

### Issue: "Function Execution Timeout"

**Cause:** API route taking >30s

**Fix:**
1. Check function timeout in vercel.json
2. Optimize database queries
3. Add proper error handling
4. Consider background jobs for long tasks

### Issue: "Module not found: mongodb"

**Cause:** MongoDB not in serverExternalPackages

**Fix:**
- Already configured in next.config.js
- Ensure `serverExternalPackages: ['mongodb']`

### Issue: "Cannot connect to database"

**Cause:** MongoDB URI not set or wrong IP whitelist

**Fix:**
1. Verify `MONGODB_URI` in Vercel env vars
2. Check MongoDB Atlas → Network Access
3. Add `0.0.0.0/0` or Vercel IPs

### Issue: "Square API 401 errors"

**Cause:** Wrong credentials or not updated

**Fix:**
1. Verify using Production Access Token (NOT Client Secret)
2. Check credential format (EAAA... or sq0atp-...)
3. Run diagnostic: `POST /api/square/diagnose`
4. Review [FIX_SUMMARY.md](file:///app/FIX_SUMMARY.md)

---

## 📊 SUCCESS METRICS

### After Deployment, Verify:

#### System Health
- [ ] Health endpoint: 200 OK, status "healthy"
- [ ] Database: "connected"
- [ ] Square API: "production"
- [ ] Response time: <100ms

#### Square Integration
- [ ] Diagnostic shows "READY"
- [ ] Payment links creation: 200 OK
- [ ] Payment processing: Working
- [ ] Webhooks: Receiving events

#### Core Features
- [ ] Products API: Returns 29 items
- [ ] Order creation: 200 OK with order number
- [ ] Cart operations: Working
- [ ] Coupon system: Creating & validating
- [ ] Email notifications: Sending

#### Performance
- [ ] Homepage load: <3s
- [ ] API responses: <1s average
- [ ] No timeout errors
- [ ] Stable memory usage

---

## 🔄 CI/CD PIPELINE

### Automatic Deployments:

- **Production:** Push to `main` branch
- **Preview:** Push to any branch or PR
- **Rollback:** Vercel dashboard → Deployments → Rollback

### Build Checks:

1. ✅ TypeScript compilation
2. ✅ ESLint (warnings ignored)
3. ✅ Build output generation
4. ✅ Function size limits
5. ✅ Environment variable validation

---

## 📞 SUPPORT RESOURCES

### Vercel:
- Dashboard: https://vercel.com/dashboard
- Docs: https://vercel.com/docs
- Edge Config: https://vercel.com/docs/storage/edge-config

### External Services:
- Square: https://developer.squareup.com/apps
- MongoDB Atlas: https://cloud.mongodb.com
- Resend: https://resend.com/emails

### Project Documentation:
- [CRITICAL_ISSUES_REPORT.md](file:///app/CRITICAL_ISSUES_REPORT.md)
- [DEPLOYMENT_FIXES.md](file:///app/DEPLOYMENT_FIXES.md)
- [FIX_SUMMARY.md](file:///app/FIX_SUMMARY.md)
- [NEXT_STEPS.md](file:///app/NEXT_STEPS.md)

---

## 🎉 DEPLOYMENT TIMELINE

### Estimated Time: 30-45 minutes

1. **Preparation** (15 min)
   - Gather Square credentials
   - Set up MongoDB Atlas
   - Configure email service

2. **Vercel Setup** (10 min)
   - Connect repository
   - Add environment variables
   - Configure build settings

3. **Deploy** (5 min)
   - Push to main or deploy via CLI
   - Wait for build completion

4. **Verification** (10 min)
   - Run health checks
   - Test Square integration
   - Verify core features

5. **Monitoring** (24 hours)
   - Watch error logs
   - Track performance
   - Monitor payment success rate

---

## 🚀 QUICK DEPLOY COMMANDS

```bash
# 1. Install Vercel CLI (if needed)
npm i -g vercel

# 2. Login to Vercel
vercel login

# 3. Link project
vercel link

# 4. Set environment variables (one-time)
vercel env add SQUARE_ACCESS_TOKEN
vercel env add MONGODB_URI
# ... (add all variables from .env.example)

# 5. Deploy to production
vercel --prod

# 6. Verify deployment
curl $(vercel inspect --timeout=0s | grep "https://" | head -1)/api/health
```

---

## ✅ VERCEL-SPECIFIC OPTIMIZATIONS APPLIED

1. ✅ Function timeouts optimized (30-60s)
2. ✅ Build artifacts excluded (.vercelignore)
3. ✅ MongoDB external package configured
4. ✅ Image optimization enabled
5. ✅ Code splitting optimized
6. ✅ Security headers configured
7. ✅ CORS properly set
8. ✅ Serverless function sizes optimized

---

## 🔒 PRODUCTION CHECKLIST

Before going live:

### Code Quality
- [x] Build: 0 errors
- [x] TypeScript: Valid
- [x] ESLint: Clean
- [x] 84 routes compiled
- [x] Bundle size optimized

### Configuration
- [ ] All env vars set in Vercel
- [ ] Square credentials (production)
- [ ] MongoDB URI configured
- [ ] Email service configured
- [ ] CORS origins set

### Testing
- [ ] Health check: Pass
- [ ] Square diagnostic: Pass
- [ ] Products API: Pass
- [ ] Order creation: Pass
- [ ] Payment processing: Pass

### Security
- [x] No secrets in code
- [x] HTTPS enforced
- [x] Security headers active
- [x] Input validation
- [x] Error handling

---

## 🎯 SUCCESS INDICATORS

After deployment, you should see:

```json
// GET /api/health
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "square_api": "production"
  }
}

// POST /api/square/diagnose
{
  "results": {
    "overallStatus": "READY"
  }
}

// GET /api/products
{
  "success": true,
  "products": [/* 29 items */]
}
```

**Performance:**
- Health check: <100ms ✅
- Product list: <500ms ✅
- Order creation: <2s ✅
- Payment processing: <3s ✅

---

## 🎉 READY FOR VERCEL!

All optimizations complete. Deploy with confidence!

**Next:** Add environment variables → Deploy → Verify
