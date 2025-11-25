# 🚨 URGENT: Preview Environment Fix - Action Plan

## Current Status

**Preview URL:** https://loading-fix-taste.preview.emergentagent.com  
**Issue:** Site loads without CSS/JS, shows "0 of 0 products", APIs failing  
**Root Cause:** MongoDB connection configured for localhost, not cloud  
**Impact:** Cannot test Phase 4 bug fixes  
**Priority:** CRITICAL - Blocking production deployment

---

## 🎯 Required Actions (In Order)

### Action 1: Configure MongoDB Atlas (Most Critical)

**Why:** The preview environment cannot connect to `localhost:27017`. It needs a cloud database.

**Steps:**

1. **Option A: Use existing MongoDB Atlas cluster**
   - If you have a MongoDB Atlas account, get connection string
   - Format: `mongodb+srv://username:password@cluster.mongodb.net/`

2. **Option B: Create new MongoDB Atlas cluster (Free)**
   - Go to: https://www.mongodb.com/cloud/atlas/register
   - Create account → New Project → Build Database
   - Choose FREE tier (M0 Sandbox)
   - Select cloud provider & region (any will work)
   - Create cluster (takes 3-5 minutes)
   - Click "Connect" → "Connect your application"
   - Copy connection string
   - Replace `<password>` with your password
   - Add database name at end: `/taste_of_gratitude`

**Result:** You'll have a connection string like:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/taste_of_gratitude?retryWrites=true&w=majority
```

### Action 2: Add Environment Variables to Preview

**Where:** In your Emergent dashboard or Vercel settings for the preview environment

**Required Variables:**

```env
# CRITICAL - Database
MONGO_URL=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/taste_of_gratitude?retryWrites=true&w=majority
DB_NAME=taste_of_gratitude

# CRITICAL - Authentication
JWT_SECRET=your-secure-random-string-minimum-32-characters-long

# IMPORTANT - URLs
NEXT_PUBLIC_BASE_URL=https://loading-fix-taste.preview.emergentagent.com
NEXT_PUBLIC_SITE_URL=https://loading-fix-taste.preview.emergentagent.com

# OPTIONAL - Square Payments (if needed)
SQUARE_ACCESS_TOKEN=your-square-token
SQUARE_LOCATION_ID=your-location-id
NEXT_PUBLIC_SQUARE_APPLICATION_ID=your-app-id
SQUARE_ENVIRONMENT=production
```

**How to generate JWT_SECRET:**
```bash
# Run this to generate a secure random string:
openssl rand -base64 32
# Or use: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Action 3: MongoDB Atlas Network Access

**Why:** By default, MongoDB Atlas blocks all connections for security

**Steps:**
1. In MongoDB Atlas dashboard → Network Access
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (or enter `0.0.0.0/0`)
4. Temporary: Yes (or set permanent if this is production DB)
5. Confirm

**Note:** For production, you should whitelist specific IPs. For preview/testing, "anywhere" is fine.

### Action 4: (Optional) Populate Database

**If starting fresh:**

The app will show 0 products if the database is empty. You can:

1. **Option A: Let Square sync populate**
   - If Square integration is configured
   - Products will sync automatically

2. **Option B: Manually add test products**
   - I can provide a script to seed test data

3. **Option C: Copy from local**
   - Export from local MongoDB: `mongodump -d taste_of_gratitude`
   - Import to Atlas: Use MongoDB Compass or `mongorestore`

**For quick testing:** The app has 11 placeholder products that will show even without Square, but you need the MongoDB connection working first.

### Action 5: Trigger Redeploy

**After setting environment variables:**

1. Push any small change to trigger new build (or use dashboard redeploy button)
2. Wait for build to complete (2-3 min)
3. Check deployment logs for errors

### Action 6: Verify Fix

**Test checklist:**

1. **Load Homepage:**
   - Visit: https://loading-fix-taste.preview.emergentagent.com
   - Should see: Full styling, header, navigation
   - Should NOT see: Raw HTML

2. **Check Products API:**
   - Visit: https://loading-fix-taste.preview.emergentagent.com/api/products
   - Should see: JSON response with products array
   - Should NOT see: Error message or empty array

3. **Test Catalog:**
   - Visit: https://loading-fix-taste.preview.emergentagent.com/catalog
   - Should see: Product grid with items
   - Should NOT see: "0 of 0 products"

4. **Phase 4 Bug Fixes:**
   - Product variants work correctly
   - Cart shows size labels
   - Quiz skip button works
   - ESC closes cart

---

## 📋 Quick Reference: What Goes Where

### In MongoDB Atlas:
- Create cluster
- Set network access to allow all IPs (0.0.0.0/0)
- Get connection string

### In Preview Environment Variables:
```env
MONGO_URL=mongodb+srv://...      # From MongoDB Atlas
JWT_SECRET=...                    # Generate random 32+ chars
NEXT_PUBLIC_BASE_URL=https://... # Your preview URL
```

### In Local .env (No change needed):
```env
MONGO_URL=mongodb://localhost:27017  # Stays as localhost for local dev
```

---

## 🔧 Troubleshooting

### Still showing "0 products" after fix?

1. **Check MongoDB connection in logs:**
   - Vercel dashboard → Deployment → Function Logs
   - Look for "Database connected" or connection errors

2. **Verify environment variables are set:**
   - Vercel/Emergent dashboard → Settings → Environment Variables
   - Make sure they're applied to "Preview" environment

3. **Check MongoDB Atlas IP whitelist:**
   - Must allow `0.0.0.0/0` or all IPs

4. **Database is empty:**
   - Either wait for Square sync
   - Or manually add products

### CSS/JS still not loading?

1. **Hard refresh browser:** Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. **Clear cache:** Browser settings → Clear browsing data
3. **Check build logs:** Look for webpack errors

### API returning 500 errors?

1. **Missing environment variables:** Check logs for "Cannot read property X of undefined"
2. **MongoDB connection failed:** Check MONGO_URL format
3. **Malformed connection string:** Ensure no spaces, correct password

---

## 📞 If You Need Help

**Information to provide:**

1. Screenshot of preview site (showing the issue)
2. MongoDB connection string format (hide password): `mongodb+srv://user:***@cluster.mongodb.net/...`
3. Which environment variables you've set
4. Deployment logs (if available)

**Logs to check:**

- Vercel dashboard → Deployments → [latest] → Logs
- Look for errors with "MongoDB", "Connection", or "Environment"

---

## ⏱️ Estimated Time

- **MongoDB Atlas setup:** 10-15 minutes (first time)
- **Adding environment variables:** 5 minutes
- **Redeploy + verify:** 5-10 minutes
- **Total:** ~30 minutes

---

## ✅ Success Criteria

After completing these steps, you should be able to:

1. ✅ Load preview site with full styling and JavaScript
2. ✅ See products in catalog (at least 11 placeholder products, up to 33 if Square is connected)
3. ✅ Test all Phase 4 bug fixes:
   - Variant selection (4oz vs 16oz)
   - Cart variant labels
   - Quiz skip button
   - ESC key cart closing
   - Single-click add to cart
4. ✅ Complete full UX verification
5. ✅ Proceed with production deployment

---

## 📚 Additional Resources

- **MongoDB Atlas Guide:** See `PREVIEW_DEPLOYMENT_FIX.md`
- **Phase 4 Fixes:** See `PHASE_4_BUG_FIXES_COMPLETE.md`
- **Deployment Diagnostics:** Run `bash scripts/deployment-diagnostics.sh`

---

**Priority:** 🔴 URGENT  
**Blocking:** Production deployment testing  
**Next Step:** Configure MongoDB Atlas connection
