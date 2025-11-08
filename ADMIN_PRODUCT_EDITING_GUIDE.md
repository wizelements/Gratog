# Admin Product Editing System - Complete Guide

## Overview
The admin dashboard now includes full product editing capabilities with bidirectional sync to Square Catalog API and the unified products database.

## Features

### 1. Product Editing Interface
- **Location**: `/admin/products/[id]`
- **Access**: Admin authentication required
- **Capabilities**:
  - Edit product name
  - Edit description
  - Change category
  - Update pricing
  - View product images
  - See metadata (Square ID, sync status, etc.)

### 2. Bidirectional Sync
- **Save Changes**: Updates local database immediately
- **Sync to Square**: Pushes changes to Square Catalog API
- **Sync from Square**: Pulls latest data from Square

### 3. Product List Management
- **Location**: `/admin/products`
- **Features**:
  - View all products with categories and pricing
  - Search and filter products
  - Edit button on each product
  - Bulk sync from Square

## How It Works

### Data Flow

```
Square Catalog API
       ↓
square_catalog_items (MongoDB)
       ↓
unified_products (MongoDB) ← Admin Edits
       ↓
Customer-facing App
```

### Sync Process

#### 1. Admin Makes Changes
```javascript
Admin Dashboard → Edit Product
  ↓
Save Changes (PUT /api/admin/products/[id])
  ↓
Updates unified_products collection
  ↓
App displays updated data immediately
```

#### 2. Sync to Square
```javascript
Admin clicks "Sync to Square"
  ↓
POST /api/admin/products/[id]/sync (direction: to_square)
  ↓
Retrieves current Square product
  ↓
Updates via Square Catalog API (upsertCatalogObject)
  ↓
Updates local database with new Square version
```

#### 3. Sync from Square
```javascript
Admin clicks "Sync from Square" 
  ↓
POST /api/admin/products/[id]/sync (direction: from_square)
  ↓
Retrieves latest from Square Catalog API
  ↓
Updates both square_catalog_items and unified_products
```

## API Endpoints

### Product Management

#### Get Single Product
```
GET /api/admin/products/[id]
Auth: Required (admin_token cookie)

Response:
{
  "success": true,
  "product": {
    "id": "PRODUCT_ID",
    "name": "Product Name",
    "description": "Product description",
    "category": "Sea Moss Gels",
    "intelligentCategory": "Sea Moss Gels",
    "price": 25.00,
    "images": ["https://..."],
    "syncedAt": "2024-01-01T00:00:00Z",
    "source": "admin_update"
  }
}
```

#### Update Product
```
PUT /api/admin/products/[id]
Auth: Required (admin_token cookie)
Body: {
  "updates": {
    "name": "New Name",
    "description": "New description",
    "category": "Lemonades & Juices",
    "price": 30.00
  }
}

Response:
{
  "success": true,
  "message": "Product updated successfully"
}
```

#### Sync Product to/from Square
```
POST /api/admin/products/[id]/sync
Auth: Required (admin_token cookie)
Body: {
  "updates": {
    "name": "Updated Name",
    "description": "Updated description"
  },
  "direction": "to_square" | "from_square"
}

Response:
{
  "success": true,
  "message": "Successfully synced to Square",
  "squareVersion": 12345
}
```

#### Bulk Sync All Products
```
POST /api/admin/products/sync
Auth: Required (admin_token cookie)

Response:
{
  "success": true,
  "message": "Sync completed successfully",
  "synced": 29
}
```

## Usage Examples

### Example 1: Update Product Name

1. Go to `/admin/products`
2. Click "Edit Product" on desired product
3. Change the product name
4. Click "Save Changes"
   - Product updated in database
   - App shows new name immediately
5. Click "Sync to Square" (optional)
   - Name updated in Square Catalog
   - Square version number updated

### Example 2: Fix Categorization

1. Navigate to product edit page
2. Select correct category from dropdown
3. Save changes
4. Category immediately reflected in:
   - Admin dashboard
   - Customer catalog page
   - Filtering and search

### Example 3: Bulk Update from Square

1. Make changes in Square Dashboard
2. Go to `/admin/products`
3. Click "Sync from Square"
4. All products updated with latest Square data

## Database Schema

### unified_products Collection
```javascript
{
  id: "SQUARE_CATALOG_ID",
  squareId: "SQUARE_CATALOG_ID",
  name: "Product Name",
  description: "Product description",
  category: "gel",                    // Simple category
  intelligentCategory: "Sea Moss Gels", // Display category
  price: 25.00,
  priceCents: 2500,
  images: ["https://..."],
  ingredients: [...],
  squareCategory: "Category Name",
  squareCategoryId: "CATEGORY_ID",
  syncedAt: Date,
  source: "admin_update" | "square_sync" | "admin_to_square",
  squareVersion: 12345,
  updatedAt: Date
}
```

## Square Integration

### What Gets Synced

**To Square:**
- ✅ Product name
- ✅ Product description
- ❌ Category (Square uses categoryId, not name)
- ❌ Price (managed through variations in Square)
- ❌ Images (upload to Square separately)

**From Square:**
- ✅ Product name
- ✅ Product description
- ✅ Category ID
- ✅ Variations and pricing
- ✅ Images
- ✅ Version number

### Version Control

Square uses version numbers for optimistic locking:
- Each update increments the version
- Admin updates store the latest Square version
- Prevents concurrent modification conflicts

## Best Practices

### 1. Make Changes in One Place
- **Option A**: Edit in Admin → Sync to Square
- **Option B**: Edit in Square → Sync from Square
- Don't edit in both places without syncing

### 2. Always Save Before Syncing
- Save changes locally first
- Then sync to Square
- This ensures database consistency

### 3. Handle Sync Conflicts
- If sync fails, check Square Dashboard
- Verify product still exists
- Check Square API permissions

### 4. Use Intelligent Categories
- Admin uses display-friendly names
- System handles Square category mapping
- Manual overrides preserved in code

## Troubleshooting

### Issue: Sync to Square Fails

**Possible Causes:**
- Invalid Square access token
- Product doesn't exist in Square
- Version mismatch (concurrent edit)
- Missing permissions

**Solution:**
1. Check environment variables (SQUARE_ACCESS_TOKEN)
2. Verify product exists in Square Dashboard
3. Try "Sync from Square" first
4. Check API error in browser console

### Issue: Changes Not Appearing on Site

**Possible Causes:**
- Caching
- Wrong collection queried
- Product not in unified_products

**Solution:**
1. Hard refresh browser (Ctrl+Shift+R)
2. Run: `node scripts/sync-to-unified.js`
3. Check MongoDB directly

### Issue: Category Not Syncing to Square

**Expected Behavior:**
- Categories are display-only in admin
- Square uses categoryId (different system)
- Category changes affect app display only

**Note:** Square category assignment requires Square Dashboard or separate API call

## Security

### Authentication
- All admin endpoints require `admin_token` cookie
- Token verification via JWT
- Unauthorized requests return 401

### Authorization
- Only admin role can access
- Protected routes in `/admin/*`
- API endpoints verify admin status

### Data Validation
- Input sanitization on all updates
- Type checking for prices
- Empty string handling

## Performance

### Sync Times
- Single product sync: ~1-2 seconds
- Bulk sync (29 products): ~10-15 seconds
- Database update: <100ms

### Caching
- No caching on admin endpoints
- Always fetch fresh data
- Square API has rate limits (100 req/min)

## Future Enhancements

### Planned Features
- [ ] Batch edit multiple products
- [ ] Image upload to Square
- [ ] Variation management
- [ ] Category mapping to Square
- [ ] Inventory sync
- [ ] Price history
- [ ] Audit log of changes
- [ ] Conflict resolution UI

### Integration Ideas
- Automatic sync on schedule (cron)
- Webhook from Square on updates
- Real-time sync notifications
- Draft/published workflow

## Summary

The admin product editing system provides:

1. **Easy Product Management**
   - Edit products in intuitive interface
   - Changes visible immediately
   - No technical knowledge required

2. **Flexible Sync Options**
   - Edit in admin or Square
   - Sync in either direction
   - Manual control over timing

3. **Data Consistency**
   - Single source of truth (unified_products)
   - Square sync preserves version control
   - Intelligent categorization maintained

4. **Developer-Friendly**
   - RESTful API design
   - Clear separation of concerns
   - Extensible architecture

Use `/admin/products` to manage your product catalog with confidence! 🎉
