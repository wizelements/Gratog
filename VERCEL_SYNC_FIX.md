# Vercel Sync Fix - Serverless Compatible

## Problem
```
Command failed: node scripts/syncCatalog.js
Error: Cannot find module '/var/task/scripts/syncCatalog.js'
```

**Root Cause**: Using `exec('node scripts/...')` doesn't work in Vercel's serverless environment.

## Solution
Refactored sync system to import and call functions directly instead of executing shell commands.

## Changes Made

### 1. Made Scripts Exportable

**scripts/syncCatalog.js**:
```javascript
// Export for programmatic use
module.exports = { CatalogSync, squareFetch, connectToDatabase, fromCents };

// Only run main() if executed directly
if (require.main === module) {
  main();
}
```

**scripts/sync-to-unified.js**:
```javascript
// Export for programmatic use
module.exports = { syncToUnified, autoCategorizProduct };

// Returns results instead of calling process.exit()
async function syncToUnified(returnResults = false) {
  // ... logic ...
  return { success: synced, failed: errors, total: count };
}
```

### 2. Updated API Route

**app/api/admin/products/sync/route.js**:
```javascript
// OLD (doesn't work on Vercel):
const { stdout } = await execPromise('node scripts/syncCatalog.js');

// NEW (serverless compatible):
const CatalogSync = require('../../../../scripts/syncCatalog.js').CatalogSync;
const { syncToUnified } = require('../../../../scripts/sync-to-unified.js');

const catalogSync = new CatalogSync();
const result = await catalogSync.sync({ db });
```

### 3. Benefits

✅ **Serverless compatible** - No shell execution  
✅ **Faster** - Direct function calls  
✅ **Better error handling** - Catches exceptions properly  
✅ **Shared DB connection** - More efficient  
✅ **Returns structured data** - Not parsing stdout

## Testing

### Local Test:
```bash
node -e "
const { CatalogSync } = require('./scripts/syncCatalog.js');
const { syncToUnified } = require('./scripts/sync-to-unified.js');
console.log('✅ Modules load correctly');
"
```

### API Test:
```bash
curl -X POST https://gratog.vercel.app/api/admin/products/sync \
  -H "Cookie: admin_token=YOUR_TOKEN" \
  | jq '.'
```

Expected response:
```json
{
  "success": true,
  "message": "Sync completed successfully",
  "synced": 29,
  "stats": {
    "catalogItems": 29,
    "catalogVariations": 45,
    "catalogImages": 22,
    "catalogErrors": 0,
    "unifiedSuccess": 29,
    "unifiedFailed": 0,
    "unifiedTotal": 29
  }
}
```

## Deployment

### For Vercel:
1. ✅ Scripts are in `/scripts/` directory
2. ✅ Scripts export functions (not just CLI)
3. ✅ API route imports functions (no exec)
4. ✅ No process.exit() when used programmatically

### Verify Build:
```bash
# Check that scripts are included in deployment
vercel logs --follow
```

## Files Changed

1. `/app/scripts/syncCatalog.js` - Exportable module
2. `/app/scripts/sync-to-unified.js` - Returns results
3. `/app/app/api/admin/products/sync/route.js` - Direct imports

## Usage

Admin dashboard "Sync from Square" button now:
```javascript
// Calls API endpoint
fetch('/api/admin/products/sync', { method: 'POST' })

// Which internally does:
const catalogSync = new CatalogSync();
await catalogSync.sync({ db });
await syncToUnified(true);
```

## Summary

The sync system now works in Vercel's serverless environment by:
- ❌ Removing shell command execution
- ✅ Using direct function imports
- ✅ Sharing database connections
- ✅ Returning structured results

Deploy to Vercel and the sync will work! 🚀
