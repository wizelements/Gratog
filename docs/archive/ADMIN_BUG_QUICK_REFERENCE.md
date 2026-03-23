# Admin Dashboard Bug - Quick Reference

## ⚡ TL;DR

**The Bug**: Admin dashboard shows "Low Stock Alert: 0" even when products are low on stock

**Root Cause**: API returns products without stock data (data lives in separate `inventory` collection that's never joined)

**Files to Fix**: 
- `app/api/admin/products/route.js` (add inventory join)

**Status**: NOT FIXED - Analysis complete

---

## One-Liner Explanation

Products API doesn't query the inventory collection, so stock data is missing from the response.

---

## Frontend Bug Locations

### ❌ admin/page.js Line 39
```javascript
const lowStock = data.products.filter(
  p => p.stock <= p.lowStockThreshold  // UNDEFINED <= UNDEFINED = FALSE
);
```
Expected: `stock` and `lowStockThreshold` in API response  
Actual: Missing from response

### ❌ admin/inventory/page.js Lines 78-79
```javascript
const lowStockProducts = products.filter(p => p.stock <= p.lowStockThreshold);
const outOfStockProducts = products.filter(p => p.stock === 0);
```
Same issue - API response missing stock fields

---

## Backend Bug Location

### ❌ app/api/admin/products/route.js Lines 32-47
```javascript
const adminProducts = products.map(product => ({
  id: product.id,
  name: product.name,
  // ... other fields ...
  // ❌ NO stock field
  // ❌ NO lowStockThreshold field
}));
```

**What's missing**: 
- No query to `inventory` collection
- No join between `unified_products` and `inventory`
- No addition of `stock` to response

---

## Data Architecture

| Collection | Contents | Use |
|-----------|----------|-----|
| `unified_products` | Products from Square: name, price, images | Product catalog |
| `inventory` | Stock levels: currentStock, lowStockThreshold, productId | Inventory tracking |
| API Response | Should include both (joined) | Frontend needs both |

---

## What's Actually Happening

1. Frontend calls: `GET /api/admin/products`
2. Backend queries: `unified_products` collection
3. Backend returns: `{ id, name, price, ... }` (NO stock)
4. Frontend tries: `filter(p => p.stock <= ...)` 
5. Result: `undefined <= undefined` = false = empty list ❌

---

## What Should Happen

1. Frontend calls: `GET /api/admin/products`
2. Backend queries: `unified_products` + `inventory` (joined)
3. Backend returns: `{ id, name, price, stock, lowStockThreshold }`
4. Frontend tries: `filter(p => p.stock <= p.lowStockThreshold)`
5. Result: Correct filtering ✅

---

## Quick Verification

To confirm this is the bug:

```bash
# Open browser DevTools on admin page
# In Console tab, run:
fetch('/api/admin/products')
  .then(r => r.json())
  .then(d => console.log(JSON.stringify(d.products[0], null, 2)))

# Look for "stock" and "lowStockThreshold" fields
# They should be there but won't be
```

---

## Minimal Fix

Add to `app/api/admin/products/route.js` GET handler:

```javascript
// After querying unified_products, add:
const inventory = await db.collection('inventory')
  .find({})
  .toArray();

const inventoryMap = new Map(
  inventory.map(item => [item.productId, item])
);

// In the map transformation:
const adminProducts = products.map(product => {
  const inv = inventoryMap.get(product.id) || {};
  return {
    // ... existing fields ...
    stock: inv.currentStock || 0,
    lowStockThreshold: inv.lowStockThreshold || 5,
  };
});
```

---

## Detailed Docs

- **Technical Analysis**: See `ADMIN_MAIN_PAGE_INVESTIGATION.md`
- **Visual Explanation**: See `ADMIN_BUG_VISUAL_EXPLANATION.md`
- **Executive Summary**: See `BUG_SUMMARY_EXECUTIVE.md`

---

## Timeline

- **Investigated**: December 23, 2025
- **Root Cause Found**: ✅ Inventory collection not joined with products API
- **Documentation**: ✅ Complete
- **Implementation**: ⏳ Pending
- **Testing**: ⏳ Pending

---

## Impact

| Area | Impact |
|------|--------|
| Admin Dashboard | Low-stock alerts not working |
| Inventory Page | Stock filtering not working |
| User Experience | No visibility into inventory status |
| Severity | HIGH - Core feature broken |
| User Count | All admin users |

---

## Status

🔴 **CRITICAL BUG - NOT FIXED**

Investigation complete. Ready for implementation.
