# TOG Admin Workflow Analysis

**Audit Date:** June 3, 2026  
**Scope:** Admin dashboard capabilities, missing workflows, and UX issues  
**Overall Assessment:** Solid order/product management foundation; missing content publishing, menu management, and weekly operations tools

---

## Executive Summary

The admin panel covers core ecommerce operations — orders, products, customers, inventory, and Square sync. Authentication is properly implemented with JWT via `jose` (Edge-compatible). However, the admin lacks the tools Jenneisha actually needs for weekly market operations: menu upload/management, content publishing, Canva integration, and weekly menu scheduling. The admin is built for a **store manager**, not a **market vendor who also sells online**.

---

## Current Admin Capabilities

### Navigation Structure

**File:** `app/admin/layout.js`

The admin sidebar has **13 navigation items**:

| Section | Route | Purpose |
|---------|-------|---------|
| Dashboard | `/admin` | Overview with today's metrics |
| Customers | `/admin/customers` | Customer list/management |
| Orders | `/admin/orders` | Order management |
| Products | `/admin/products` | Product catalog (Square-synced) |
| Reviews | `/admin/reviews` | Customer review management |
| Markets | `/admin/markets` | Market configuration |
| Inventory | `/admin/inventory` | Stock tracking |
| Coupons | `/admin/coupons` | Coupon/discount management |
| Campaigns | `/admin/campaigns` | Email campaigns (Resend) |
| Interactions | `/admin/interactions` | Customer interaction log |
| Waitlist | `/admin/waitlist` | Waitlist management |
| Analytics | `/admin/analytics` | Business analytics |
| Settings | `/admin/settings` | System settings |

**Additional admin routes** (not in main nav):
- `/admin/market-day` — Market-day operations dashboard
- `/admin/market-setup` — Market setup/configuration
- `/admin/qr-generator` — QR code generation
- `/admin/queue` — Queue management
- `/admin/errors` — Error log

### Authentication

**Files:** `lib/admin-auth.js`, `lib/admin-session.ts`, `lib/admin-token.ts`, `lib/auth/jwt.js`, `lib/auth/unified-admin.ts`, `middleware.ts`

| Feature | Implementation |
|---------|---------------|
| Auth method | JWT via `jose` library |
| Token storage | Cookie-based |
| Edge compatibility | Yes — `jose` is Edge-compatible |
| Login flow | `/admin/login` with proper auth |
| Password reset | `/admin/forgot-password` |
| Session management | `lib/admin-session.ts` |

### Dashboard Metrics

**File:** `app/admin/page.js`

The dashboard displays:
- Today's sales total
- Today's order count
- Total orders (all time)
- Total revenue (all time)
- Low stock count
- Recent orders list
- Square sync button

### Square Integration

| Feature | Status |
|---------|--------|
| Order sync from Square | ✅ Available (`/api/admin/orders/sync`) |
| Product catalog sync | ✅ Available (`lib/product-sync-engine.js`) |
| Payment processing | ✅ Via Web Payments SDK |
| Refund processing | ✅ `/api/admin/orders/[id]/refund` |

### Campaign/Email Tools

- Resend integration for email campaigns
- Campaign management at `/admin/campaigns`
- Email template system in `lib/email-templates.js`
- Nurture sequence logic in `lib/nurture-sequence.js`

---

## What's MISSING from Admin

### Content Management (Critical Gap)

| Missing Feature | Impact |
|----------------|--------|
| No menu upload/management | Can't update weekly menu without code changes |
| No Canva link management | Can't connect Canva menu designs to site |
| No brochure/flyer management | Can't upload market materials |
| No content publishing | Can't edit About page, homepage sections, or story content |
| No public site preview from admin | Can't see how changes look before publishing |

### Menu Operations (Critical Gap)

| Missing Feature | Impact |
|----------------|--------|
| No featured menu toggle | Can't highlight this week's specials |
| No menu scheduling (active dates) | Can't set menus to go live/expire automatically |
| No menu preview before publishing | Risk of publishing incomplete menus |
| No menu archive | No history of past menus |
| No weekly menu assignment to markets | Can't customize menu per market |
| No product-to-menu linking | Products and menus are disconnected concepts |

### Operational Tools

| Missing Feature | Impact |
|----------------|--------|
| No "this week at a glance" dashboard | Admin doesn't show the week's operational picture |
| No market-day checklist | No structured pre-market workflow |
| No prep list generation | No automated prep quantities from preorders |

---

## Admin UX Issues

### Issue 1: Dashboard Default State

**File:** `app/admin/page.js`

The dashboard may show hardcoded or default values in initial state before data loads. Without loading skeletons, the dashboard shows empty state rather than indicating data is being fetched.

### Issue 2: Orders Loaded Without Pagination

**File:** `app/admin/orders/`

Orders appear to be fetched client-side. For a growing business, loading all orders at once will become a performance issue. No server-side pagination observed.

### Issue 3: Square Sync Behavior

The "Sync from Square" button appears to perform a full sync each time rather than incremental sync. For a catalog that grows over time, this becomes slower and risks overwriting local modifications.

### Issue 4: Admin Mobile Components

**Files:** `components/admin/MobileCard.tsx`, `components/admin/MobileLayout.tsx`

Mobile admin components exist but their integration with the full admin layout is unclear. Given that Jenneisha likely manages the business from her phone at markets, mobile admin UX is critical.

### Issue 5: No Real-Time Updates

The market-day dashboard (`/admin/market-day`) and queue system (`/admin/queue`) exist but lack real-time update mechanisms (WebSocket, SSE, or polling). During a busy market day, stale data could cause issues.

---

## Admin Architecture

```
Admin Auth Flow:
  /admin/login → JWT (jose) → Cookie → middleware.ts validates → Admin pages

Data Flow:
  Square Catalog ←→ product-sync-engine.js ←→ Admin Products
  Square Orders ←→ /api/admin/orders/sync ←→ Admin Orders
  MongoDB (MarketOrder, DailyInventory) ←→ Admin Dashboard
```

---

## Recommendations

### Critical (Weekly Operations)
1. **Build menu management** — upload Canva image, set active dates, assign to markets, preview
2. **Add "This Week" dashboard widget** — upcoming markets, preorder count, prep quantities
3. **Add content editor for About/Homepage** — even a simple markdown editor would help

### High Priority (Usability)
4. **Add pagination to orders** — server-side, filterable by date range and market
5. **Add loading skeletons** to dashboard — indicate data is loading vs. empty
6. **Improve mobile admin UX** — verify `MobileLayout.tsx` works for all admin pages
7. **Add incremental Square sync** — only sync changes since last sync timestamp

### Medium Priority (Operations)
8. **Add market-day checklist** — pre-market prep steps with checkoff
9. **Add real-time updates** to market-day dashboard — polling at minimum, SSE preferred
10. **Add prep list generation** — auto-calculate quantities from confirmed preorders
11. **Add content preview** — "view as customer" button on admin pages

---

## Evidence Files

| File | Relevance |
|------|-----------|
| `app/admin/page.js` | Dashboard with metrics |
| `app/admin/layout.js` | Admin navigation structure |
| `app/admin/market-day/` | Market-day operations dashboard |
| `app/admin/market-setup/` | Market setup configuration |
| `components/admin/MobileCard.tsx` | Mobile admin card component |
| `components/admin/MobileLayout.tsx` | Mobile admin layout |
| `components/admin/ProtectedRoute.js` | Admin route protection |
| `components/admin/QuickActions.tsx` | Admin quick action buttons |
| `lib/admin-auth.js` | Admin authentication logic |
| `lib/admin-session.ts` | Admin session management |
| `lib/admin-token.ts` | Admin JWT token handling |
| `lib/auth/jwt.js` | JWT utilities |
| `lib/auth/unified-admin.ts` | Unified admin auth |
| `lib/product-sync-engine.js` | Square product catalog sync |
| `lib/email-templates.js` | Email template system |
| `lib/nurture-sequence.js` | Email nurture sequence |
| `middleware.ts` | Edge middleware with auth validation |
