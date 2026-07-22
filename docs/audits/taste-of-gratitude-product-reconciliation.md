# Taste of Gratitude — Product and Price Reconciliation Audit

Generated: 2026-07-22

---

## 1. Executive Summary

The Taste of Gratitude storefront currently operates on **two parallel product namespaces** that are not reconciled:

1. **Curated local products** in `data/products.ts` with human-readable slugs, prices, ingredients, and weekly-menu flags.
2. **Square catalog items** returned by `/api/catalog` as opaque IDs with `name: "Unnamed Product"` and `price: 0`.

Additionally, `/api/storefront/square-catalog` crashes with a `Cannot mix BigInt and other types, use explicit conversions` error, so the direct-SDK catalog path is non-functional.

**Commerce risk:** A customer browsing the homepage/weekly menu sees real names and prices, but the cart/checkout path ultimately resolves to Square data. If Square items remain unnamed and $0, checkout totals, confirmation emails, and admin reporting will be incorrect.

---

## 2. Data Sources and Lineage

```
Square Catalog (live source of truth for payments)
    │
    ├── /api/catalog (lib/square-api-edge.ts) → returns raw Square items
    │
    ├── /api/storefront/square-catalog (Square SDK) → CRASHES (BigInt)
    │
    ├── square_catalog_items MongoDB collection (sync target)
    │
    └── unified_products MongoDB collection (lib/product-sync-engine.js)
            │
            └── lib/storefront-products.js
                    ├── mergeWithCuratedProduct(data/products.ts)
                    ├── enrichProductWithHealthBenefits(lib/health-benefits.js)
                    ├── enhanceProductCatalog(lib/product-enhancements.js)
                    └── demo fallback / curated fallback

Homepage / Weekly Menu / Catalog
    │
    └── data/products.ts (curated source)
            │
            └── getActiveProducts, getProductBySlugOrId, weekly menu filters
```

**Key observation:** `data/products.ts` is a TypeScript constant. To change prices, availability, or the weekly menu, a founder must edit code and redeploy. There is no admin publish flow for the customer-facing catalog.

---

## 3. Live Square Catalog Evidence

Probe performed at 2026-07-22:

```bash
curl -sL https://tasteofgratitude.shop/api/catalog | head -c 2000
```

Result:

```json
{
  "success": true,
  "data": [
    {"id": "OAMZ3IUIU75QRNH7WJETSPX6", "name": "Unnamed Product", "price": 0, "currency": "USD", "available": true},
    {"id": "DOBEU7ZFRXWQB6VSECMNLMXL", "name": "Unnamed Product", "price": 0, "currency": "USD", "available": true},
    {"id": "BF6RUOUX2DOOYPDWBJK4UKA7", "name": "Unnamed Product", "price": 0, "currency": "USD", "available": true},
    ...
  ]
}
```

More than 15 items returned. All `"Unnamed Product"`, all `$0`.

`https://tasteofgratitude.shop/api/storefront/square-catalog` returns:

```json
{"success": false, "error": "Cannot mix BigInt and other types, use explicit conversions", "products": [], "source": "error"}
```

**Root cause:** `app/api/storefront/square-catalog/route.ts` passes BigInt `priceMoney.amount` values into `JSON.stringify()` without converting them first. The Edge API `/api/catalog` uses `parseInt(variation.priceMoney.amount) / 100`, which works because it converts the BigInt to a Number.

---

## 4. Curated Product Matrix (selected items)

Source: `data/products.ts`

| Local slug | Display name | Category | Price | Size | Weekly? | Ingredients (selected) | Notes |
|---|---|---|---|---|---|---|---|
| `kissed-by-gods` | Kissed by Gods | lemonade | $12.00 | 16 oz | Yes | alkaline water, lemon, agave, sea moss, strawberries | Name has spiritual/wellness connotation |
| `supplemint` | SuppleMint | lemonade | $10.00 | 16 oz | Yes | alkaline water, lemon, agave, chlorophyll, mint | Portmanteau name |
| `strawberry-bliss` | Strawberry Bliss | lemonade | $12.00 | 16 oz | Yes | alkaline water, strawberries, agave, lemon, sea moss | — |
| `cucumber-mint-ginger` | Cucumber Mint Ginger | refresher | $12.00 | 16 oz | Yes | alkaline water, cucumber, mint, ginger, lime, agave | — |
| `grateful-greens-gel` | Grateful Greens Gel | gel | $25.00 | 8 oz | Yes | sea moss, alkaline water, spirulina, chlorella, chlorophyll, ginger, lime | Gel instructions should not apply to drinks |
| `floral-tide-gel` | Floral Tide Gel | gel | $25.00 | 8 oz | Yes | sea moss, alkaline water, rose, lavender, hibiscus | — |
| `blue-lotus-gel` | Blue Lotus Gel | gel | $25.00 | 8 oz | Yes | sea moss, alkaline water, blue lotus flower, agave | — |
| `healing-harmony-gel` | Healing Harmony Gel | gel | $25.00 | 8 oz | Yes | sea moss, alkaline water, turmeric, ginger, black pepper, cinnamon | Name implies therapeutic benefit |
| `grateful-defense` | Grateful Defense | shot | $7.00 | 2 oz | Yes | sea moss, lemon, ginger, turmeric, cayenne, black pepper, agave | "Defense" implies immune/disease benefit |
| `spicy-bloom` | Spicy Bloom | shot | $7.00 | 2 oz | Yes | sea moss, hibiscus, cranberry, jalapeño, citrus | Linked to `#SpicyBloomChallenge` FAQ |
| `golden-hour` | Golden Hour | lemonade | $12.00 | 16 oz | No | turmeric, ginger, pineapple, orange, sea moss | — |
| `island-vibes` | Island Vibes | lemonade | $12.00 | 16 oz | No | sea moss, alkaline water, mango, pineapple, coconut, agave | — |

Many products share similar sea-moss + fruit + alkaline-water bases; differentiation is primarily flavor.

---

## 5. Duplicate / Legacy Product Hypotheses

### 5.1 Gel vs. drink versions

The curated list contains:

- `blue-lotus-gel` (gel, $25)
- No `blue-lotus` drink found in the curated active list.
- `floral-tide-gel` (gel, $25)
- `healing-harmony-gel` (gel, $25)
- `grateful-greens-gel` (gel, $25)
- No corresponding drink SKUs found, so these are not duplicates; they are gel-only variants.

### 5.2 Sample sizes

Some products historically had sample sizes represented as separate products. Current `data/products.ts` does not expose sample SKUs in the active weekly list, but `variants` may still exist in Square.

### 5.3 Square IDs vs. local slugs

The sitemap lists product URLs such as `/product/OAMZ3IUIU75QRNH7WJETSPX6`. The `app/product/[slug]/page.jsx` route probably resolves `slug` against `getProductBySlugOrId(slug)`. If the Square ID does not match any curated slug, the page may fall back to a Square lookup (which returns `$0 Unnamed Product`) or render a generic/empty state.

**Recommendation:** Map every curated product to a Square `itemId` + `variationId`, and redirect or noindex Square-only IDs until they are reconciled.

---

## 6. Bundle Analysis

Source: `data/bundles.ts`

| Bundle ID | Name | Display price | Savings text | Checkout mode | Issue |
|---|---|---|---|---|---|
| `starter-box` | Taste of Gratitude Starter Box | $22.00 | "$3 off" | `square-compatible-placeholder` | No real Square bundle SKU; savings advertised but not enforced at checkout |
| `weekly-wellness-box` | Weekly Wellness Box | $45.00 | "$7 off" | `square-compatible-placeholder` | Same as above |
| `hydration-refresh-box` | Hydration Refresh Box | $30.00 | "$6 off" | `square-compatible-placeholder` | Same as above |
| `mineral-reset` | Mineral Reset Box | $35.00 | "$5 off" | `square-compatible-placeholder` | Same as above |

Bundle detail pages contain language such as:

> "Bundle pricing ready for Square setup; founder can activate savings when bundle SKUs are created."
> "Perfect subscription precursor: set a weekly bundle discount once Square bundle inventory is active."

These are **customer-facing roadmap notes**, not live commerce.

---

## 7. Price Authority Decision Needed

There are at least three price layers:

1. **Curated `data/products.ts`** — used by homepage/weekly-menu/catalog display cards.
2. **Square catalog variation `priceMoney.amount`** — used by checkout/payment links (currently $0).
3. **Cart engine** — may override prices based on variants, bundles, coupons.

Until Square catalog is populated with real names/prices, the only safe authority is `data/products.ts`, but that requires converting curated prices into Square line-item base prices at checkout (the `basePriceMoney` field in `createPaymentLink`).

**Critical question for owner:** Should the checkout path send the curated price to Square as an ad-hoc line item, or should Square become the canonical price source?

---

## 8. Market and Fulfillment Data

Source: `data/markets.ts`

| Market | City | Day | Hours | Pickup type | Status |
|---|---|---|---|---|---|
| Serenbe Farmers Market | Chattahoochee Hills, GA | Saturday | 09:00-13:00 | On-site | Active |
| Dunwoody Farmers Market | Dunwoody, GA | Sunday | 12:00-16:00 | On-site | Active |

These are hardcoded. The preorder page fetches `/api/markets` and merges with this data.

**Fulfillment options advertised:**
- Market pickup
- Local delivery (select ZIP codes, $12–$18)
- USPS Priority Mail shipping ($8.99, free over $50)

Delivery zones are defined in `lib/delivery-zones.ts`; shipping rates in `lib/shipping.ts` / `app/api/shipping/rates/route.ts`.

**Owner decision:** Confirm which ZIP codes, delivery days, and shipping dates are actually operational for the current weekly batch.

---

## 9. P0 / P1 / P2 / P3 Product Issues

| Priority | Issue | Evidence | Proposed action |
|---|---|---|---|
| P0 | Square catalog items are unnamed and $0, breaking checkout/pricing accuracy | `/api/catalog` output | Either populate Square catalog or make checkout use curated prices as base line items |
| P0 | `/api/storefront/square-catalog` crashes on BigInt | Live curl + code | Convert BigInt to Number before JSON serialization; remove or fix this path |
| P1 | No curated-slug ↔ Square-ID mapping table | `data/products.ts` lacks `squareId`/`variationId` for curated items | Add `squareData` to each curated product or create mapping table |
| P1 | Sitemap indexes Square-ID product URLs that may render incorrectly | `app/sitemap.ts` | Reconcile sitemap to only curated, mapped products |
| P1 | Bundles advertise savings without real Square SKUs | `data/bundles.ts` | Hide bundle savings until Square bundle SKUs exist, or create them |
| P1 | Weekly menu is hardcoded TS | `data/weeklyMenu.ts`, `data/products.ts` | Move weekly menu to admin-publishable database records |
| P1 | Gel products on weekly menu may receive drink-style serving guidance | `data/products.ts` `recommendedUse` | Audit each product's storage/use instructions for format accuracy |
| P2 | Many product names/benefit stories use wellness-benefit language | `data/products.ts`, `lib/health-benefits.js` | Rewrite per approved brand direction and claims matrix |
| P2 | Product images are mostly external Unsplash/editmysite URLs | `data/products.ts`, `public/images/` | Replace with real product/founder/market photography |
| P2 | Duplicate product-detail pages may exist for Square IDs | `app/product/[slug]/page.jsx` | Consolidate on curated slug URLs; redirect Square-ID URLs |
| P3 | Sample-size products may exist as separate Square items | Not yet verified | Merge into variants or archive |

---

## 10. Product Identity Reconciliation Table (starter)

| Local slug | Curated name | Curated price | Square item ID | Square variation ID | Status | Action |
|---|---|---|---|---|---|---|
| `kissed-by-gods` | Kissed by Gods | $12.00 | UNKNOWN | UNKNOWN | Needs mapping | Owner to provide or map |
| `supplemint` | SuppleMint | $10.00 | UNKNOWN | UNKNOWN | Needs mapping | Owner to provide or map |
| `strawberry-bliss` | Strawberry Bliss | $12.00 | UNKNOWN | UNKNOWN | Needs mapping | Owner to provide or map |
| `grateful-greens-gel` | Grateful Greens Gel | $25.00 | UNKNOWN | UNKNOWN | Needs mapping | Owner to provide or map |
| `floral-tide-gel` | Floral Tide Gel | $25.00 | UNKNOWN | UNKNOWN | Needs mapping | Owner to provide or map |
| `blue-lotus-gel` | Blue Lotus Gel | $25.00 | UNKNOWN | UNKNOWN | Needs mapping | Owner to provide or map |
| `healing-harmony-gel` | Healing Harmony Gel | $25.00 | UNKNOWN | UNKNOWN | Needs mapping | Owner to provide or map |
| `grateful-defense` | Grateful Defense | $7.00 | UNKNOWN | UNKNOWN | Needs mapping | Owner to provide or map |
| `spicy-bloom` | Spicy Bloom | $7.00 | UNKNOWN | UNKNOWN | Needs mapping | Owner to provide or map |
| (Square ID) | Unnamed Product | $0.00 | OAMZ3IUIU75QRNH7WJETSPX6 | (various) | In Square, not reconciled | Rename/price in Square or remove from storefront |

**Next step:** The owner must decide whether to (a) clean up Square catalog directly, or (b) treat curated `data/products.ts` as canonical and pass curated prices to Square at checkout.
