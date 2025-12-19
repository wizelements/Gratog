# MongoDB Products Not Showing - Root Cause & Fix

## The Problem
Products are not showing on the live site - only demo products appear.

## Root Cause Analysis

The investigation revealed that **database errors were being silently swallowed**, causing the app to fall back to demo products without any indication that the real database connection failed.

### Product Flow
```
/api/products → getUnifiedProducts() → MongoDB unified_products collection
     ↓ (if empty or error)
Demo products fallback
```

### Why Products Weren't Showing

1. **Silent Error Handling**: `getUnifiedProducts()` caught DB errors and returned `[]` instead of throwing
2. **No Distinction**: The API couldn't tell if `[]` meant "no products exist" or "DB connection failed"
3. **Missing Env Validation**: No check for missing `MONGODB_URI` in production
4. **Collection Mismatch**: Multiple collections (`unified_products`, `square_catalog_items`, `square_products`) with potential sync gaps

## Fixes Applied

### 1. Created Diagnostic Endpoint
**File**: `app/api/db-health/route.js`

Hit `GET /api/db-health` to check:
- MongoDB connection status
- Environment variable configuration  
- Collection counts (unified_products, square_catalog_items, etc.)
- Last sync metadata
- Automated diagnosis and recommendations

### 2. Fixed Error Handling
**File**: `lib/product-sync-engine.js`

Changed `getUnifiedProducts()` to re-throw database errors instead of returning empty array. This allows callers to distinguish between "no products" and "DB error".

### 3. Improved Products API Response
**File**: `app/api/products/route.js`

Now includes:
- `success: false` when DB error occurs
- `source: 'demo_db_error_fallback'` to indicate error-based fallback
- `dbError` object with message and hint to check `/api/db-health`

### 4. Added Production Environment Validation
**File**: `lib/db-optimized.js`

- Throws error if `MONGODB_URI`/`MONGO_URL` is missing in production
- Warns if `DATABASE_NAME` is not explicitly set
- Better error messages with hints for common issues (timeout, auth, hostname)

## Next Steps to Diagnose Your Live Site

### Step 1: Check the Diagnostic Endpoint
After deploying, hit: `https://your-site.com/api/db-health`

This will tell you:
- If MongoDB is connected
- Which collections have data
- What's wrong and how to fix it

### Step 2: Verify Environment Variables in Vercel
Go to Vercel Project → Settings → Environment Variables

Required:
- `MONGODB_URI` - Your MongoDB Atlas connection string
- `DATABASE_NAME` - Usually `taste_of_gratitude`
- `SQUARE_ACCESS_TOKEN` - For catalog sync
- `SQUARE_LOCATION_ID` - Your Square location

### Step 3: Run Catalog Sync
If collections are empty, trigger a sync:
```
POST /api/admin/products/sync
```
(Requires admin auth)

### Step 4: Check MongoDB Atlas
1. Verify cluster is running
2. Check IP whitelist includes `0.0.0.0/0` (for Vercel serverless)
3. Confirm database name matches `DATABASE_NAME` env var
4. Look at collections to see if data exists

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `CONNECTION_FAILED` in /api/db-health | Check MONGODB_URI env var in Vercel |
| `ALL_COLLECTIONS_EMPTY` | Run catalog sync via admin panel |
| `UNIFIED_EMPTY_BUT_SQUARE_CATALOG_HAS_DATA` | Run unified sync: POST /api/admin/products/sync |
| Connection timeout | Add 0.0.0.0/0 to MongoDB Atlas IP whitelist |
| Auth failed | Check username/password in connection string |
| Wrong database | Set DATABASE_NAME env var explicitly |

## Files Changed
- `app/api/db-health/route.js` (new)
- `lib/db-optimized.js` (enhanced validation)
- `lib/product-sync-engine.js` (fixed error handling)
- `app/api/products/route.js` (improved error reporting)
