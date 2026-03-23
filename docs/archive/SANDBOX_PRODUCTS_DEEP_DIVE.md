# Sandbox Products Issue - Deep Dive Analysis & Best Practices

## Executive Summary

Sandbox products still appear on `tasteofgratitude.shop` despite the existing `$nor` filter in `getUnifiedProducts()`. This document identifies the root cause and provides architectural best practices to prevent this class of issue.

## Root Causes (Multiple Vectors)

### 1. **MongoDB Query Logic Bug - Search Parameter Interaction**

**Location**: `lib/product-sync-engine.js` lines 156-187

**The Problem**:
```javascript
const query = {
  $nor: [
    { source: 'sandbox_sync' },
    { id: { $regex: /^sandbox-/i } },
    { squareId: { $regex: /^sandbox-/i } }
  ]
};

// ... later, if search filter exists:
if (filters.search) {
  query.$or = [
    { name: { $regex: filters.search, $options: 'i' } },
    { description: { $regex: filters.search, $options: 'i' } },
    { tags: { $regex: filters.search, $options: 'i' } }
  ];
}
```

**Why This Fails**:
In MongoDB, when multiple top-level operators exist on a query:
- `{ $nor: [...], $or: [...] }` is interpreted as `(NOT sandbox) AND (name OR description OR tags matches)`
- If you search for "Sea Moss" and a sandbox product has "Sea Moss" in the name, MongoDB returns it because the `$or` doesn't exclude it
- The `$nor` filter applies BUT doesn't restrict the `$or` results

**Example Failure Case**:
```
DB contains:
  - { id: "prod-001", source: "square", name: "Premium Sea Moss" }
  - { id: "sandbox-001", source: "sandbox_sync", name: "Test Sea Moss" }

Query: { $nor: [{ source: 'sandbox_sync' }], $or: [{ name: /sea moss/i }] }

Result: Returns BOTH because:
  - prod-001: NOT sandbox ✓ AND matches search ✓
  - sandbox-001: Actually matches because $or overrides $nor implicitly
```

### 2. **Environment Mismatch - Square Sandbox vs Production**

**Location**: `lib/square/catalogSync.js` line 9

```javascript
const SQUARE_ENV = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase() === 'production' ? 'production' : 'sandbox';
```

**The Problem**:
- If `SQUARE_ENVIRONMENT` env var is set to `'sandbox'` in production, the sync pulls from Square's sandbox catalog
- Sandbox catalogs contain test products that get stored in MongoDB with `source: 'square'` (not `sandbox_sync`)
- The filter looks for `source: 'sandbox_sync'` but misses products synced from sandbox environment

### 3. **Fallback to Demo Products**

**Location**: `app/api/products/route.js` lines 77-115

```javascript
if (enhancedProducts.length === 0) {
  // Falls back to demo products
  const demoProducts = getDemoProducts(filters);
  // ...
}
```

**The Problem**:
- If database is down or empty, it serves demo products
- Demo products don't have sandbox markers, so frontend can't distinguish real from fallback
- No clear indication that products are from demo/fallback source

### 4. **Legacy Square Catalog Path - No Filter**

**Location**: `app/api/products/route.js` lines 140-190

```javascript
if (useUnified) {
  // Uses getUnifiedProducts with $nor filter ✓
} else {
  // Legacy path - NO FILTER
  const items = await db.collection('square_catalog_items')
    .find({})  // ← NO SANDBOX EXCLUSION
    .sort({ name: 1 })
    .toArray();
}
```

**The Problem**:
- Query parameter `?unified=false` bypasses all sandbox filtering
- Frontend can accidentally call this endpoint
- Any sandbox products in `square_catalog_items` collection leak through

## Best Practices Solution

### 1. **Use Aggregation Pipeline (Recommended)**

Instead of query-level filtering that can be bypassed:

```javascript
export async function getUnifiedProducts(filters = {}) {
  const pipeline = [
    // STAGE 1: ALWAYS exclude sandbox products first
    {
      $match: {
        $and: [
          {
            $nor: [
              { source: 'sandbox_sync' },
              { id: { $regex: /^sandbox-/i } },
              { squareId: { $regex: /^sandbox-/i } }
            ]
          },
          // STAGE 2: Only then apply user filters
          ...buildUserFilters(filters)
        ]
      }
    },
    // STAGE 3: Project only safe fields
    {
      $project: {
        // Only expose allowed fields
        id: 1,
        name: 1,
        description: 1,
        price: 1,
        // ... etc
        // Never expose internal sync markers
        source: 0,
        _rawSquareData: 0
      }
    }
  ];

  return db.collection(UNIFIED_PRODUCTS_COLLECTION).aggregate(pipeline).toArray();
}

function buildUserFilters(filters) {
  const userConditions = [];
  
  if (filters.category) {
    userConditions.push({ intelligentCategory: filters.category });
  }
  
  if (filters.search) {
    userConditions.push({
      $or: [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { tags: { $regex: filters.search, $options: 'i' } }
      ]
    });
  }
  
  // ... other filters
  
  return userConditions.length > 0 ? userConditions : [{ _id: { $exists: true } }];
}
```

### 2. **Environment-Based Product Filtering**

Add a runtime check that prevents sandbox products from appearing in production:

```javascript
// lib/product-filtering.js
export function shouldExcludeProduct(product) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (!isProduction) {
    // In dev, allow everything for testing
    return false;
  }
  
  // In production, ALWAYS exclude sandbox products
  const isSandbox = 
    product.source === 'sandbox_sync' ||
    product.id?.match(/^sandbox-/i) ||
    product.squareId?.match(/^sandbox-/i) ||
    product._squareSyncEnv === 'sandbox';  // NEW: track sync environment
  
  return isSandbox;
}

// Use in API route:
const products = await getUnifiedProducts(filters);
const filtered = products.filter(p => !shouldExcludeProduct(p));
```

### 3. **Schema-Level Protection**

Add a database schema validation:

```javascript
// When syncing from Square, mark the environment
async function syncProductFromSquare(squareItem) {
  return {
    ...transform(squareItem),
    // NEW: Always record which Square environment this came from
    _squareSyncEnv: process.env.SQUARE_ENVIRONMENT || 'production',
    _syncedAt: new Date(),
    _syncedFrom: 'square_catalog_sync'
  };
}

// Filter that checks environment:
const query = {
  $and: [
    { _squareSyncEnv: { $ne: 'sandbox' } },  // Never from sandbox
    { source: { $ne: 'sandbox_sync' } },      // Never manually marked
    { id: { $not: { $regex: /^sandbox-/i } } }, // Never ID-marked
    { squareId: { $not: { $regex: /^sandbox-/i } } }
  ]
};
```

### 4. **Data Source Transparency**

Track product source throughout the pipeline:

```javascript
// Enhance returned products with metadata
const products = (await getUnifiedProducts(filters))
  .filter(p => !shouldExcludeProduct(p))
  .map(p => ({
    ...p,
    // Add metadata for debugging
    _metadata: {
      source: p.source || 'square_sync',
      environment: p._squareSyncEnv || 'unknown',
      syncedAt: p._syncedAt,
      isProduction: process.env.NODE_ENV === 'production'
    }
  }));
```

### 5. **Strict Type Definitions**

Define what products can exist:

```typescript
// types/product.ts
export interface Product {
  id: string;
  name: string;
  // ... other fields
  
  // Internal tracking (never exposed to frontend)
  _syncSource: 'square_api' | 'manual_entry';
  _squareSyncEnv: 'production' | 'sandbox';
  _createdAt: Date;
  _updatedAt: Date;
}

export interface PublicProduct extends Omit<Product, '_syncSource' | '_squareSyncEnv' | '_createdAt' | '_updatedAt'> {
  // Public API only exposes safe fields
}
```

### 6. **API Response Validation**

Validate the API response before sending to frontend:

```javascript
import { z } from 'zod';

const PublicProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  // ... allowed fields
}).strict(); // strict mode rejects extra fields

const ProductsResponseSchema = z.object({
  success: z.boolean(),
  products: z.array(PublicProductSchema),
  source: z.enum(['unified_intelligent_enhanced', 'demo_fallback'])
});

// In API route:
const safeProducts = products.map(p => ({
  id: p.id,
  name: p.name,
  price: p.price,
  // ... only safe fields
}));

const validated = ProductsResponseSchema.parse({
  success: true,
  products: safeProducts,
  source: 'unified_intelligent_enhanced'
});

return NextResponse.json(validated);
```

### 7. **Testing Strategy**

```javascript
// tests/sandbox-products.test.ts
describe('Sandbox Product Filtering', () => {
  it('should never return products from sandbox source', async () => {
    // Insert a sandbox product
    await db.unified_products.insertOne({
      id: 'sandbox-test',
      source: 'sandbox_sync',
      name: 'Test Sandbox'
    });

    const products = await getUnifiedProducts();
    const hassandbox = products.some(p => 
      p.id.match(/^sandbox-/i) || p.source === 'sandbox_sync'
    );
    
    expect(hassandbox).toBe(false);
  });

  it('should filter sandbox products even with search', async () => {
    const products = await getUnifiedProducts({ search: 'Sea Moss' });
    const hasAnyMarker = products.some(p =>
      p.id?.match(/^sandbox-/i) ||
      p.source === 'sandbox_sync' ||
      p.squareId?.match(/^sandbox-/i)
    );
    
    expect(hasAnyMarker).toBe(false);
  });

  it('should not expose internal fields', async () => {
    const response = await fetch('/api/products');
    const data = await response.json();
    
    data.products.forEach(product => {
      expect(product._squareSyncEnv).toBeUndefined();
      expect(product.source).toBeUndefined();
      expect(product._syncedAt).toBeUndefined();
    });
  });
});
```

### 8. **Monitoring & Alerting**

```javascript
// lib/sandbox-detector.js
export async function checkForSandboxProductionLeak() {
  const { db } = await connectToDatabase();
  
  // Check production database for sandbox products
  const sandboxCount = await db.unified_products.countDocuments({
    $or: [
      { source: 'sandbox_sync' },
      { id: { $regex: /^sandbox-/i } },
      { squareId: { $regex: /^sandbox-/i } },
      { _squareSyncEnv: 'sandbox' }
    ]
  });
  
  if (sandboxCount > 0 && process.env.NODE_ENV === 'production') {
    // Alert! Sandbox products in production
    logger.error('CRITICAL: Sandbox products detected in production!', {
      count: sandboxCount,
      environment: process.env.NODE_ENV,
      timestamp: new Date()
    });
    
    // Send alert to ops/monitoring
    await sendAlert({
      severity: 'critical',
      message: `${sandboxCount} sandbox products found in production database`,
      action: 'Manual cleanup required'
    });
  }
  
  return sandboxCount;
}
```

## Implementation Priority

1. **Immediate**: Fix MongoDB query aggregation pipeline (prevents search bypass)
2. **Short-term**: Add environment tracking to products (prevents square env mismatch)
3. **Medium-term**: Implement strict schema & type definitions
4. **Ongoing**: Add monitoring & alerting

## Summary

The issue isn't just about filtering—it's about architectural layering. Each layer should independently prevent sandbox products:

- **Database Layer**: Query filters
- **API Layer**: Response validation & field projection
- **Type Layer**: TypeScript/Zod schemas
- **Runtime Layer**: Environment checks
- **Monitoring Layer**: Detection & alerts

This defense-in-depth approach ensures sandbox products never leak through, regardless of which code path is taken.
