# Preview Environment Deployment Fix

## 🚨 Critical Issue Identified

The preview at `loading-fix-taste.preview.emergentagent.com` is failing because:
1. **No CSS/JS loading** - Assets are served correctly, but the build might be incomplete
2. **"0 of 0 products"** - MongoDB connection is failing
3. **API endpoints not responding** - Environment variables not configured

## 🔍 Root Cause Analysis

### 1. MongoDB Connection Issue
**Current `.env` setting:**
```env
MONGO_URL=mongodb://localhost:27017
```

**Problem:** `localhost` doesn't exist in Vercel's serverless environment. The preview needs a **cloud MongoDB connection string**.

### 2. Missing Environment Variables on Preview
The following environment variables MUST be configured in the Vercel/Emergent preview dashboard:

**Required:**
- `MONGO_URL` - Must be a cloud MongoDB URI (MongoDB Atlas)
- `NEXT_PUBLIC_BASE_URL` - Set to preview URL
- `JWT_SECRET` - For authentication
- `DB_NAME` - Database name

**Optional but Recommended:**
- `SQUARE_ACCESS_TOKEN` - For Square integration
- `SQUARE_LOCATION_ID` - Square location
- `RESEND_API_KEY` - For email functionality
- `NEXT_PUBLIC_SQUARE_APPLICATION_ID` - Square frontend

---

## ✅ Solution: Step-by-Step Fix

### Step 1: Configure MongoDB Atlas (Required)

1. **Get MongoDB Atlas connection string:**
   - Go to https://cloud.mongodb.com
   - Create a free cluster if you don't have one
   - Click "Connect" → "Connect your application"
   - Copy the connection string (format: `mongodb+srv://username:password@cluster.mongodb.net/`)

2. **Add to Vercel/Preview Environment:**
   - In the Emergent dashboard or Vercel settings
   - Add environment variable: `MONGO_URL`
   - Value: `mongodb+srv://username:password@cluster.mongodb.net/taste_of_gratitude?retryWrites=true&w=majority`
   - Apply to: **Preview** and **Production** environments

### Step 2: Verify Required Environment Variables

Add these in the preview environment settings:

```env
# Database (CRITICAL)
MONGO_URL=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/taste_of_gratitude?retryWrites=true&w=majority
DB_NAME=taste_of_gratitude

# App URLs
NEXT_PUBLIC_BASE_URL=https://loading-fix-taste.preview.emergentagent.com
NEXT_PUBLIC_SITE_URL=https://loading-fix-taste.preview.emergentagent.com
ROOT_DOMAIN=https://loading-fix-taste.preview.emergentagent.com

# Authentication (CRITICAL)
JWT_SECRET=your-secure-random-string-here-at-least-32-chars

# Square (if using Square checkout)
SQUARE_ACCESS_TOKEN=your-square-access-token
SQUARE_LOCATION_ID=your-location-id
NEXT_PUBLIC_SQUARE_APPLICATION_ID=your-app-id
SQUARE_ENVIRONMENT=production

# Email (optional, for quiz results)
RESEND_API_KEY=your-resend-key

# CORS
CORS_ORIGINS=*
```

### Step 3: Redeploy

After adding environment variables:
1. Trigger a new deployment
2. Wait for build to complete (usually 2-3 minutes)
3. Test the preview URL

---

## 🧪 Verification Checklist

After redeployment, verify:

### ✅ Basic Functionality
- [ ] Homepage loads with styling
- [ ] CSS and JavaScript are working
- [ ] Navigation menu is interactive
- [ ] Images load correctly

### ✅ Product Catalog
- [ ] Products appear in catalog (should show "33 products" not "0")
- [ ] Product cards display with images and prices
- [ ] Filtering works (Sea Moss Gels, Lemonades, etc.)

### ✅ Phase 4 Bug Fixes
- [ ] **Variant Selection:** Can select 4oz and 16oz variants on product pages
- [ ] **Cart Labels:** Cart shows "Size: 4oz" or "Size: 16oz" for each item
- [ ] **Quiz Skip:** "Skip for Now" button works without requiring email
- [ ] **ESC Key:** Pressing ESC closes the cart drawer
- [ ] **Single Click:** All "Add to Cart" buttons work on first click
- [ ] **Cart Badge:** Updates immediately after adding items

### ✅ API Endpoints
Test these URLs (replace with your preview domain):
- [ ] https://loading-fix-taste.preview.emergentagent.com/api/products
  - Should return: `{"success":true,"products":[...33 products...]}`
- [ ] https://loading-fix-taste.preview.emergentagent.com/api/health
  - Should return: Health status
- [ ] https://loading-fix-taste.preview.emergentagent.com/api/auth/session
  - Should return: Session status (401 if not logged in is OK)

---

## 🔧 Troubleshooting

### Issue: Still showing "0 of 0 products"

**Check MongoDB connection:**
1. Verify `MONGO_URL` is correctly set in preview environment
2. Ensure IP whitelist in MongoDB Atlas allows all IPs (`0.0.0.0/0`)
3. Check database name matches in both connection string and `DB_NAME`

**Test API directly:**
```bash
curl https://loading-fix-taste.preview.emergentagent.com/api/products
```

Expected response:
```json
{
  "success": true,
  "products": [...],
  "count": 33
}
```

### Issue: CSS/JS not loading

**Check build logs:**
- Look for build errors in Vercel/Emergent dashboard
- Verify `yarn build` completed successfully
- Check for any webpack compilation errors

**Verify asset URLs:**
- Open browser DevTools → Network tab
- Check if `_next/static/*` files are loading
- Look for 404 errors on static assets

### Issue: Authentication not working

**Check JWT_SECRET:**
1. Must be set in preview environment
2. Must be at least 32 characters long
3. Should be same across deployments for session persistence

### Issue: Square payments not working

**Verify Square credentials:**
1. `SQUARE_ACCESS_TOKEN` is set
2. `NEXT_PUBLIC_SQUARE_APPLICATION_ID` is set
3. `SQUARE_LOCATION_ID` matches your Square dashboard
4. `SQUARE_ENVIRONMENT` is set to `production` (or `sandbox` for testing)

---

## 📋 Quick Reference: Local vs Preview

| Aspect | Local Development | Preview/Production |
|--------|------------------|-------------------|
| MongoDB | `localhost:27017` | MongoDB Atlas cloud URI |
| Port | `3000` | Managed by Vercel |
| Base URL | `http://localhost:3000` | `https://...preview.emergentagent.com` |
| Hot Reload | ✅ Enabled | ❌ Not available |
| Env Variables | `.env` file | Set in dashboard |

---

## 🚀 After Fix: Expected Behavior

Once properly configured, the preview should:
1. ✅ Load with full styling and interactivity
2. ✅ Show 33 products in catalog
3. ✅ Product pages work with variant selection
4. ✅ Cart displays variant labels
5. ✅ Quiz skip button works independently
6. ✅ ESC key closes cart
7. ✅ All "Add to Cart" buttons respond to single clicks

---

## 📞 Support

If issues persist after following this guide:

1. **Check Logs:**
   - Vercel dashboard → Deployments → [Your deployment] → Logs
   - Look for MongoDB connection errors
   - Check for API route errors

2. **Common Error Messages:**
   - `"MongooseError: The `uri` parameter to `openUri()` must be a string"` → MONGO_URL not set
   - `"Database connection failed"` → MongoDB Atlas connection issue
   - `"Cannot read property of undefined"` → Missing environment variable

3. **Emergency Fallback:**
   - If MongoDB is unavailable, the app has fallback logic
   - But it needs at least `MONGO_URL` to be set (even if connection fails)

---

## 🎯 Summary

**Critical Actions Required:**
1. ✅ Add `MONGO_URL` with MongoDB Atlas connection string
2. ✅ Add `JWT_SECRET` for authentication
3. ✅ Set `NEXT_PUBLIC_BASE_URL` to preview URL
4. ✅ Redeploy preview environment
5. ✅ Test all Phase 4 fixes

**Expected Outcome:**
- Preview site fully functional
- All Phase 4 bug fixes testable
- Production-ready deployment

---

**Document Version:** 1.0  
**Date:** November 23, 2025  
**Related:** PHASE_4_BUG_FIXES_COMPLETE.md
