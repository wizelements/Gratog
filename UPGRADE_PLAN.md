# Gratog Modernization Upgrade Plan

## Phase 1: Framework Upgrade (Next.js 14 → 15) ✅ COMPLETE
- [x] Update package.json dependencies
  - Next.js: 14.2.35 → 15.3.4
  - React: 18.3.1 → 19.1.0
  - Added Turbopack dev script
- [x] Add @next/bundle-analyzer for build analysis
- [x] Update next.config.js for Next.js 15 + Turbopack
- [x] Handle webpack/bundle analyzer integration

## Phase 2: TypeScript Strict Mode ✅ COMPLETE
- [x] Update tsconfig.json
  - strict: true
  - noImplicitAny: true
  - strictNullChecks: true
  - noImplicitReturns: true
  - moduleResolution: bundler (for Next.js 15)
- [ ] Fix type errors incrementally (defer to Phase 6)

## Phase 3: Caching Strategy ✅ COMPLETE
- [x] Remove unstable_noStore() from layout (keep dynamic for auth)
- [x] Implement ISR for homepage (revalidate: 300)
- [x] Add cacheLife with 'use cache' directive for homepage data
- [x] Add Next.js 15 cacheLife configuration
- [x] Configure proper HTTP cache headers

## Phase 4: Database Optimization ✅ COMPLETE
- [x] Create database indexes script (scripts/setup-database-indexes.js)
- [x] Indexes for: orders, payment_records, products, reviews, users, coupons, inventory
- [x] Run script: `node scripts/setup-database-indexes.js`

## Phase 5: Performance & Edge ✅ COMPLETE
- [x] Bundle analysis configured
  - Run: `npm run analyze`
- [x] Edge runtime for catalog API
  - Created: app/api/catalog/route.ts
  - Created: lib/square-api-edge.ts
- [x] Core Web Vitals monitoring
  - Created: components/analytics/WebVitals.tsx
  - Created: app/api/analytics/web-vitals/route.ts
  - Integrated into layout.js

## Phase 6: Server Actions (Low Priority) ✅ COMPLETE
- [x] Cart server actions
  - Created: lib/actions/cart.ts
  - addToCart, removeFromCart, updateCartQuantity, clearCart

## Phase 7: Type Error Resolution (Pending)
- [ ] Run `npm run typecheck` to identify all type errors
- [ ] Fix critical type errors
- [ ] Consider gradual migration for complex components

---

## Installation & Verification

### 1. Install Dependencies
```bash
cd ~/Gratog-live
npm install
```

### 2. Setup Database Indexes
```bash
node scripts/setup-database-indexes.js
```

### 3. Development with Turbopack
```bash
npm run dev
# Or fallback to webpack:
npm run dev:webpack
```

### 4. Build Test
```bash
npm run build
```

### 5. Bundle Analysis
```bash
npm run analyze
```

### 6. Type Checking
```bash
npm run typecheck
```

---

## Changes Summary

| File | Change |
|------|--------|
| package.json | Next.js 15, React 19, Turbopack, bundle-analyzer |
| tsconfig.json | strict mode enabled |
| next.config.js | Next.js 15 config, cacheLife, Turbopack |
| app/layout.js | Removed unstable_noStore, added AnalyticsProvider |
| app/page.js | Static generation with ISR, cacheLife |
| scripts/setup-database-indexes.js | Database optimization |
| app/api/catalog/route.ts | Edge runtime catalog API |
| lib/square-api-edge.ts | Edge-compatible Square client |
| components/analytics/WebVitals.tsx | Core Web Vitals tracking |
| app/api/analytics/web-vitals/route.ts | Web Vitals ingestion |
| lib/actions/cart.ts | Server Actions for cart |

---

## Breaking Changes to Monitor

1. **React 19**: Test all client components, especially:
   - MusicContext (refs, useEffect)
   - Cart store (Zustand persistence)
   - Form handling

2. **TypeScript Strict**: May reveal hidden bugs - test thoroughly

3. **Turbopack**: Faster but may have edge cases
   - Fallback to webpack if issues: `npm run dev:webpack`

---

Started: 2026-05-14
Status: Phase 1-6 Complete, Phase 7 Pending
