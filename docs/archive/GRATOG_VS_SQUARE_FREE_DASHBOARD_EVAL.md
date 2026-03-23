# Gratog vs Square Free Dashboard — Full Evaluation
## Product Control, Visibility & Instant Dashboard-to-Site Updates

**Date:** March 21, 2026  
**Focus:** Can Gratog match or beat Square's free dashboard for product management, visibility control, and instant live-site updates?

---

## Executive Summary

**Gratog is close but has critical gaps in "instant" dashboard-to-site flow.** Square's free tier gives sellers a seamless experience: change a product name/price/image in the dashboard → it's instantly live on the website. Gratog currently requires a manual "Save" then a separate "Sync to Square" step, and the storefront depends on a sync queue + cron cycle to reflect changes. This kills the instant feel.

---

## Feature-by-Feature Comparison

### 1. PRODUCT CATALOG MANAGEMENT

| Feature | Square Free | Gratog Current | Gap |
|---------|-------------|---------------|-----|
| Unlimited products | ✅ Yes | ✅ Yes | None |
| Add new product from dashboard | ✅ Instant, full form | ❌ No create UI — must create in Square first | **CRITICAL** |
| Edit product name | ✅ Instant | ⚠️ 2-step: Save → Sync to Square | **HIGH** |
| Edit product description | ✅ Instant | ⚠️ 2-step: Save → Sync to Square | **HIGH** |
| Edit product price | ✅ Instant | ⚠️ 2-step: Save → Sync to Square | **HIGH** |
| Product images upload | ✅ Drag-and-drop | ❌ No image upload — images come from Square sync only | **CRITICAL** |
| Product variations (sizes, colors) | ✅ Full UI | ⚠️ Display only — cannot create/edit variations | **HIGH** |
| Bulk import (CSV/spreadsheet) | ✅ Yes | ❌ No | Medium |
| Product categories | ✅ Full CRUD | ✅ Select from preset list + manual override | Low |
| Product search/filter | ✅ Full text search | ✅ Name/subtitle search | None |
| Item quick view | ✅ Yes | ✅ Card grid with image/price/category | None |

### 2. VISIBILITY & DISPLAY CONTROL

| Feature | Square Free | Gratog Current | Gap |
|---------|-------------|---------------|-----|
| Show/hide product on site | ✅ Toggle switch, instant | ❌ No visibility toggle — all synced products are shown | **CRITICAL** |
| Featured product flag | ✅ Yes | ✅ Yes (featured badge) | None |
| Product ordering/sort | ✅ Drag-and-drop reorder | ❌ Alphabetical only | **HIGH** |
| Category visibility | ✅ Show/hide categories | ❌ All categories always visible | **HIGH** |
| Out-of-stock behavior | ✅ Auto-hide or show "Sold Out" | ⚠️ Shows stock badge but doesn't hide from storefront | Medium |
| Item badges (Sale, Low Stock) | ❌ Requires Plus ($29/mo) | ⚠️ Has low-stock badge in admin, not on storefront | Even |
| Time-based categories | ❌ Requires Plus ($29/mo) | ❌ No | Even |
| Scheduled product drops | ❌ Requires Plus ($29/mo) | ❌ No | Even |

### 3. INVENTORY CONTROL

| Feature | Square Free | Gratog Current | Gap |
|---------|-------------|---------------|-----|
| View stock levels | ✅ Per-location | ✅ Per-product with thresholds | None |
| Adjust stock manually | ✅ Yes | ✅ Yes (+/- with reason tracking) | **Gratog wins** |
| Low stock alerts | ✅ Email alerts | ✅ Dashboard alerts + threshold config | **Gratog wins** |
| Stock history/audit trail | ✅ Basic | ✅ Reason-tracked adjustments | **Gratog wins** |
| Auto-decrement on sale | ✅ Yes | ⚠️ Via Square webhook → inventory sync (delayed) | Medium |
| Multi-location inventory | ✅ Yes | ❌ Single location | Medium |

### 4. INSTANT DASHBOARD → SITE (THE KILLER FEATURE)

| Feature | Square Free | Gratog Current | Gap |
|---------|-------------|---------------|-----|
| Change name → instant on site | ✅ < 1 second | ❌ Requires: Save → Sync → Wait for queue → Revalidation | **CRITICAL** |
| Change price → instant on site | ✅ < 1 second | ❌ Same multi-step process | **CRITICAL** |
| Change image → instant on site | ✅ < 1 second | ❌ Cannot change images from Gratog dashboard | **CRITICAL** |
| Toggle visibility → instant | ✅ < 1 second | ❌ No visibility toggle exists | **CRITICAL** |
| Inventory change → site reflects | ✅ Real-time | ⚠️ Webhook-based, 5-30 sec delay typical | Medium |
| New product → appears on site | ✅ Instant | ❌ Must sync catalog first | **CRITICAL** |

---

## Current Gratog Data Flow (Why It's Not Instant)

```
Admin Dashboard (edit product)
      ↓
Save to MongoDB (unified_products)  ← LOCAL ONLY, site may still show old data
      ↓
"Sync to Square" button (manual)
      ↓
Square Catalog API (upsertCatalogObject)
      ↓
Square fires webhook → catalog.version.updated
      ↓
Webhook handler inserts into square_sync_queue
      ↓
Sync queue processor picks it up
      ↓
Updates square_catalog_items in MongoDB
      ↓
FINALLY visible on storefront (if page reloads/revalidates)
```

**Total latency: 10 seconds to several minutes depending on queue processing + ISR cache.**

## What Square Free Does That Makes It Feel Instant

```
Square Dashboard (edit product)
      ↓
Square API updates instantly
      ↓
Square Online site reads directly from API → DONE
```

**Total latency: < 1 second. One system, one source of truth.**

---

## What Gratog Needs to Match Square's Instant Feel

### Priority 1: INSTANT SAVE-TO-SITE (Eliminate the round-trip)

When admin saves a product change, the storefront should reflect it **immediately** without going through Square → webhook → queue → sync cycle.

**Fix:** The storefront already reads from `unified_products` in MongoDB. If admin saves update there, the site should show it on next request. The problem is ISR caching. Need:
1. **On-demand revalidation** — when admin saves, call `revalidatePath('/catalog')` and `revalidatePath('/products/[slug]')` server-side
2. **Remove the 2-button flow** — one "Publish" button that saves to DB + syncs to Square + revalidates in one action
3. **Optimistic UI** — show the change immediately in the admin without waiting for sync confirmation

### Priority 2: VISIBILITY TOGGLE

Add a simple `visible: boolean` field to products. Admin toggle → saves to DB → revalidates storefront → product appears/disappears instantly.

### Priority 3: PRODUCT CREATION FROM DASHBOARD

Add a "New Product" flow in admin that:
- Creates the product in MongoDB immediately (visible on site)
- Background-syncs to Square catalog
- Shows sync status indicator

### Priority 4: IMAGE MANAGEMENT

Allow image upload from admin dashboard:
- Upload to Vercel Blob or similar
- Save URL to unified_products
- Show on storefront immediately
- Background-sync to Square catalog images

### Priority 5: PRODUCT ORDERING

Add a drag-and-drop sort order field so owner can control which products appear first.

---

## Where Gratog ALREADY BEATS Square Free

| Advantage | Detail |
|-----------|--------|
| **Custom design** | Full brand control vs Square's template limitations |
| **PWA / Installable** | Square free doesn't support installable apps |
| **Music integration** | Unique ambient shopping experience |
| **Rewards/Passport system** | Square Loyalty requires separate setup |
| **Health benefit categorization** | Intelligent product categorization by wellness benefit |
| **Admin inventory tracking** | More detailed than Square's free tier (reason tracking, thresholds) |
| **Custom coupons** | Spin wheel, campaigns — Square free has basic discounts only |
| **SEO control** | Full sitemap, meta tags, structured data |
| **No Square branding** | Square free shows "Powered by Square" |
| **Custom domain** | Square free forces `.square.site` subdomain |

---

## Implementation Priority Order

```
1. One-click "Publish" (save + sync + revalidate) ← BIGGEST IMPACT
2. Product visibility toggle (show/hide)           ← FAST WIN  
3. On-demand ISR revalidation on admin save         ← TECHNICAL FIX
4. Product creation from admin                      ← FULL PARITY
5. Image upload in admin                            ← FULL PARITY
6. Drag-and-drop product ordering                   ← POLISH
```

**Estimated effort to reach instant parity: 2-3 focused development sessions.**

---

## Bottom Line

Square's free dashboard wins on **instant gratification** — change something, see it live. Gratog wins on **everything else** (design, features, no branding, PWA, rewards). The gap is entirely in the **publish flow**. Fix that one pipeline and Gratog objectively beats Square free across the board.
