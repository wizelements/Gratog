# PRODUCT_SYSTEM_AUDIT — Gratog Platform

> Code-verified at commit `f9d20e98`. Catalog uses Square as source of truth, mirrored into MongoDB. Source files: `lib/storefront-products.js`, `lib/square-api.ts`, `lib/square/catalogSync.js`, `lib/square/syncSingleItem.js`, `lib/square/syncToUnified.js`.

## 1. Product data flow

```diagram
 Square Catalog (source of truth)
   │
   │  /api/storefront/square-catalog  (admin trigger or scheduled)
   ▼
 lib/square/catalogSync.js
   │  reads Square Catalog API
   │  writes:
   │   - square_catalog_items
   │   - square_catalog_categories
   │   - square_catalog_images
   │   - square_inventory
   │   - square_sync_metadata
   ▼
 lib/square/syncToUnified.js
   │  merges with internal `products` overrides
   ▼
 unified_products collection
   │
   ▼
 lib/storefront-products.js  (read API)
   │
   ▼
 /api/products, /api/catalog, /api/storefront/catalog
   │
   ▼
 /catalog, /product/[slug]
```

## 2. Categories

- Sourced from Square (`square_catalog_categories`).
- Frontend uses category id/name to render filters in `/catalog`.
- Local override possible via `products` collection.

## 3. Products & variants

- Square `CatalogItem` and `CatalogItemVariation` mirrored.
- Pricing stored per variation in cents (Square convention).
- Frontend uses `lib/storefront-products.js` to flatten variations.

## 4. Inventory

- `square_inventory` mirrors Square counts.
- `inventory` is the **operational** inventory used at checkout/payment time.
- `inventory_locks` holds pre-payment reservations.
- ❌ **`/api/admin/inventory` list missing** — admin cannot view inventory at-a-glance; per-product edit still works.

## 5. Images

- `square_catalog_images` mirrors image URLs.
- ❌ **`/api/square/image` missing** — image proxy/transform endpoint referenced from code but not present.
- No CDN-side image optimization configured beyond Next.js Image.

## 6. Variants

- Multi-variant support via Square variations.
- Add-to-cart includes `productId`, `variationId`, `catalogObjectId` per item (verified in `app/api/orders/create/route.js#L60-77`).

## 7. Filters / search

- `/api/search/enhanced` ✅ — server-side enhanced search.
- Catalog page filters by category, price, etc. (verify in `app/catalog/page.js`).
- No faceted search.

## 8. Collections / curated lists

- No dedicated "collections" collection.
- Curated lists embedded via tags in `products` overrides.

## 9. Recommendations

- ❌ **`/api/recommendations` missing.** No personalization or "Customers also bought".
- Could derive from quiz results (`/api/quiz/recommendations` also missing).

## 10. Reviews

- `product_reviews` collection exists.
- ❌ **`/api/reviews` missing** — no submission/list public endpoint.
- ❌ **`/api/reviews/helpful` missing**.
- ✅ Admin review moderation exists (`/api/admin/reviews`).

## 11. Pricing

- Source of truth: Square. Local override possible.
- Coupon discount logic in `lib/coupons.*` (verify file exists).
- Tax handling unclear — verify Square handles tax or local logic.

## 12. Preorders

- `pre_orders` collection.
- `/api/preorder`, `/api/preorder/status` ✅.
- `/preorder` and `/preorder/status` pages ✅.

## 13. Subscriptions

- `subscription_plans`, `subscription_billing`, `subscriptions` collections.
- ❌ **`/api/subscriptions/plans` missing** — `/subscriptions` page broken.

## 14. Wishlist / favorites

- ❌ **`/api/user/favorites` missing** — `/wishlist` page broken.

## 15. Defects

| Sev | Defect |
|---|---|
| 🟠 High | Public reviews API missing → no user-generated trust signals. |
| 🟠 High | Recommendations API missing → no cross-sell engine. |
| 🟡 Medium | Admin inventory list view broken. |
| 🟡 Medium | Wishlist UI without backend. |
| 🟡 Medium | Subscriptions plans listing API missing. |
| 🟡 Medium | `/api/square/image` missing — referenced but not implemented. |
| 🟢 Low | Tags-based curation rather than first-class collections. |
