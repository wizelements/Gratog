# TOG Market Operations Analysis

**Audit Date:** June 3, 2026  
**Scope:** Market data architecture, operational workflows, and customer-facing market experience  
**Critical Issue:** Market data fragmented across 3 hardcoded sources + 1 unused database model

---

## Executive Summary

Taste of Gratitude operates at **3 verified Atlanta-area farmers markets**. The market schedule is the heartbeat of the business — yet market data is **hardcoded in 3 separate files** while a proper `MarketSchedule` database model exists but is **not used by any public-facing page**. Admin tools for market management exist (`/admin/markets`, `/admin/market-day`, `/admin/market-setup`) but don't connect to the public pages. Adding or removing a market requires code changes in 3 files.

---

## Verified Markets

| Market | Day | Hours | Location |
|--------|-----|-------|----------|
| Serenbe Farmers Market | Saturday | 9:00 AM – 1:00 PM | 10640 Serenbe Trail, Chattahoochee Hills, GA 30268 |
| Dunwoody Farmers Market | Saturday | 9:00 AM – 12:00 PM | Dunwoody Farmhouse, Dunwoody, GA 30338 |
| Sandy Springs Farmers Market | Sunday | 10:00 AM – 1:00 PM | Sandy Springs City Center, Sandy Springs, GA 30328 |

---

## Market Data Fragmentation (Critical)

### Source 1: `app/markets/page.tsx`

```typescript
const MARKETS = [
  { id: 'serenbe', name: 'Serenbe Farmers Market', day: 'Saturday',
    hours: '9:00 AM - 1:00 PM', emoji: '🏡',
    featured: ['Sea Moss Gel', 'Lemonades', 'Wellness Shots'] },
  { id: 'dunwoody', name: 'Dunwoody Farmers Market', day: 'Saturday',
    hours: '9:00 AM - 12:00 PM', emoji: '🏪',
    featured: ['Sea Moss Gel', 'Fresh Lemonade', 'Wellness Shots'] },
  { id: 'sandy-springs', name: 'Sandy Springs Farmers Market', day: 'Sunday',
    hours: '10:00 AM - 1:00 PM', emoji: '🌳',
    featured: ['Sea Moss Gel', 'Fresh Juices', 'Wellness Shots'] },
];
```

Includes: name, address, day, hours, emoji, description, featured items.

### Source 2: `app/preorder/page.tsx`

```typescript
const MARKETS = [
  { id: "serenbe", name: "Serenbe Farmers Market",
    address: "10640 Serenbe Trail, Chattahoochee Hills, GA 30268",
    day: "Saturday", hours: "9:00 AM - 1:00 PM", emoji: "🏡" },
  { id: "dunwoody", name: "Dunwoody Farmers Market",
    address: "Dunwoody Farmhouse, Dunwoody, GA 30338",
    day: "Saturday", hours: "9:00 AM - 12:00 PM", emoji: "🏪" },
  { id: "sandy-springs", name: "Sandy Springs Farmers Market",
    address: "Sandy Springs City Center, Sandy Springs, GA 30328",
    day: "Sunday", hours: "10:00 AM - 1:00 PM", emoji: "🌳" },
];
```

Includes: name, address, day, hours, emoji, description (different descriptions from Source 1).

### Source 3: `lib/preorder/rules.ts`

```typescript
export const MARKET_CONFIGS = {
  'serenbe':       { prefix: 'S',  day: 'Saturday', hours: '9:00 AM - 1:00 PM',
                     cutoffDay: 'Friday',   cutoffHour: 18 },
  'dunwoody':      { prefix: 'D',  day: 'Saturday', hours: '9:00 AM - 12:00 PM',
                     cutoffDay: 'Friday',   cutoffHour: 18 },
  'sandy-springs': { prefix: 'SS', day: 'Sunday',   hours: '10:00 AM - 1:00 PM',
                     cutoffDay: 'Saturday', cutoffHour: 18 },
};
```

Includes: prefix (for order numbers), day, hours, name, cutoffDay, cutoffHour. **This is the only source with preorder cutoff logic.**

### Source 4 (Unused): `models/MarketSchedule.ts`

```typescript
export interface IMarketSchedule extends Document {
  name: string;
  address: string;
  coordinates: { lat: number; lng: number };
  hours: { open: string; close: string };
  days: string[];
  timezone: string;
  contactPhone?: string;
  parkingInfo?: string;
  photoUrl?: string;
  description?: string;
  isActive: boolean;
}
```

**This is the most complete model** — includes coordinates, timezone, parking info, photo URL, active flag — but **no public page reads from it**. Admin pages at `/admin/markets` may write to it, but the data never reaches customers.

---

## Preorder Cutoffs

| Market | Cutoff | Effect |
|--------|--------|--------|
| Serenbe (Saturday) | Friday 6:00 PM | No preorders after Friday 6 PM |
| Dunwoody (Saturday) | Friday 6:00 PM | No preorders after Friday 6 PM |
| Sandy Springs (Sunday) | Saturday 6:00 PM | No preorders after Saturday 6 PM |

**Implementation:** `lib/preorder/rules.ts` → `isPastCutoff(marketId)` function calculates based on current time vs. cutoff day/hour.

---

## Admin Market Tools

| Tool | Route | Purpose |
|------|-------|---------|
| Market Management | `/admin/markets` | Market CRUD operations |
| Market Setup | `/admin/market-setup` | Initial market configuration |
| Market Day Dashboard | `/admin/market-day` | Active market-day operations |
| Queue Management | `/admin/queue` | Customer queue at market |

### Market Day Operations

**File:** `app/admin/market-day/`

The market-day dashboard exists for real-time operations during an active market. Connected to:

- `models/DailyInventory.ts` — Tracks per-market, per-day stock:
  - `marketId`, `marketName`, `date`
  - `items[]` with `initialQuantity`, `soldCount`, `isSoldOut`, `price`, `category`
  - `isClosed`, `totalRevenue`
- `/api/market/today` — API for current market data

---

## API Infrastructure

| Route | Purpose |
|-------|---------|
| `/api/market/today` | Get today's active market data |
| `/api/queue/active` | Active queue entries |
| `/api/queue/join` | Customer joins queue |
| `/api/queue/position` | Check queue position |
| `/api/queue/update` | Update queue entry |
| `/api/ics/market-route` | ICS calendar export for market schedule |

The **ICS calendar export** is a nice feature — customers can subscribe to market schedules in their calendar app.

---

## Operational Gaps

### Gap 1: No Admin-to-Public Market Data Flow

The admin can manage markets in the database via `/admin/markets`, but public pages (`/markets`, `/preorder`) read from **hardcoded constants**, not the database. Changes in admin don't appear on the public site.

### Gap 2: No Weekly Menu Per Market

- No mechanism to assign a specific menu to a specific market for a specific week
- No Canva menu image upload
- No "what's available at this market today" public view
- Products are categorized but not assigned to markets

### Gap 3: No Market-Specific Product Assignments

Customers see the same product catalog regardless of which market they select. In reality, some products are only available at specific markets.

### Gap 4: No Market-Day "Live" Indicator

- No public indicator of which market is active **right now**
- `LiveLocationBanner` component exists in the codebase but its integration is unclear
- No real-time "we're at Serenbe right now" signal on the homepage

### Gap 5: Queue System Integration Unclear

Queue API routes exist (`/api/queue/*`) but the integration between queue → market-day dashboard → customer notification is not clear. During a busy market, the queue is critical.

---

## Market UX Issues

### Issue 1: Emoji Identifiers

Markets use emoji identifiers: 🏡 (Serenbe), 🏪 (Dunwoody), 🌳 (Sandy Springs). This is playful and memorable but may feel casual for customers expecting a premium wellness brand. Products also use emojis for categories:

| Category | Emoji |
|----------|-------|
| Sea Moss Gel | 🌿 |
| Fresh Lemonades | 🍋 |
| Cold Pressed Juices | 🧃 |
| Wellness Refreshers | 🍹 |
| Wellness Shots | 🥃 |

### Issue 2: No Real Market Photography

No photos of:
- Market booth setups
- Customers at the booth
- Jenneisha serving/interacting
- The actual market environments

The `MarketSchedule` model has a `photoUrl` field — but it's not populated or displayed.

### Issue 3: Mobile Horizontal Scroll

Product sections on the market page use horizontal scroll. On mobile devices with small screens, horizontal scrolling can be hard to discover and frustrating to use.

### Issue 4: Market Selection Flow

From the markets page, selecting a market routes to `/preorder?market=${marketId}`. This is a good flow, but the transition from "learn about the market" to "start ordering" could be smoother with a "what's available this week" intermediate step.

---

## What Works Well

| Feature | Assessment |
|---------|-----------|
| ICS calendar export | ✅ Great — customers can subscribe to market schedule |
| DailyInventory model | ✅ Well-structured per-market per-day tracking |
| Market-day admin dashboard | ✅ Exists for real-time operations |
| Queue system API | ✅ Infrastructure ready for market-day queuing |
| Preorder cutoff logic | ✅ Clean implementation with timezone awareness |
| Order number prefixes | ✅ Market-specific prefixes (S, D, SS) for easy identification |

---

## Recommendations

### Critical (Data Integrity)
1. **Single source of truth** — Public pages should read from `MarketSchedule` model via API, not hardcoded constants
2. **Remove hardcoded MARKETS** from `app/markets/page.tsx` and `app/preorder/page.tsx`
3. **Merge cutoff config** into `MarketSchedule` model (add `cutoffDay`, `cutoffHour` fields)

### High Priority (Operations)
4. **Weekly menu per market** — ability to assign a menu (Canva image + product list) to a market for a specific date
5. **Market-specific product availability** — market-exclusive items should be data-driven
6. **Live market indicator on homepage** — "We're at Serenbe right now! 🟢"
7. **"This week's menu" on market page** — show what's available before ordering

### Medium Priority (UX)
8. **Add market photography** — use `MarketSchedule.photoUrl` field, populate with real photos
9. **Clarify queue integration** — connect queue API to market-day dashboard with customer notifications
10. **Replace horizontal scroll with grid** on mobile — or add scroll indicators
11. **Add market-day recap** — automated summary of sales, popular items, customer count after each market

### Nice to Have
12. **Google Maps integration** — directions to each market
13. **Weather integration** — show weather for upcoming market day
14. **Market-day social sharing** — "We're live at Serenbe! Come say hi" auto-post capability

---

## Evidence Files

| File | Relevance |
|------|-----------|
| `app/markets/page.tsx` | Public market page — hardcoded MARKETS (source 1) |
| `app/preorder/page.tsx` | Preorder page — hardcoded MARKETS (source 2) |
| `lib/preorder/rules.ts` | MARKET_CONFIGS with cutoffs (source 3) |
| `models/MarketSchedule.ts` | Database model — exists but unused by public pages |
| `models/DailyInventory.ts` | Per-market per-day inventory tracking |
| `models/MarketOrder.ts` | Order model with market association |
| `app/admin/markets/` | Admin market management |
| `app/admin/market-day/` | Market-day operations dashboard |
| `app/admin/market-setup/` | Market setup configuration |
| `app/api/market/today/` | Current market data API |
| `app/api/queue/` | Queue system (active, join, position, update) |
| `app/api/ics/market-route/` | ICS calendar export |
| `lib/preorder/repository.ts` | Preorder data access |
| `lib/preorder/waitlist.ts` | Preorder waitlist management |
| `lib/preorder/square-notifications.ts` | Square notification handling |
