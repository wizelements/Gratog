# TOG Customer Psychology Analysis

**Audit Date:** June 3, 2026  
**Scope:** Customer experience, trust signals, conversion psychology, and UX confusion points  
**Overall Assessment:** Site optimizes for ecommerce conversion but the business converts through market trust and relationships

---

## Executive Summary

The site deploys aggressive ecommerce conversion tactics — badge stacking, scarcity signals, exit intent modals, comparison marketing — that are appropriate for a DTC supplement brand but **misaligned** with a community market brand where trust is built face-to-face. Multiple competing CTAs and checkout paths create customer confusion. The emotional customer journey should be: **trust → understand → try → return → routine**. The current site skips trust and understanding entirely.

---

## Findings

### 1. Aggressive Badge Stacking

**File:** `components/home/HomePageClient.jsx`

The homepage layers multiple conversion pressure tactics:

| Element | Type | Issue |
|---------|------|-------|
| "Premium Products Available" | Status badge | Generic — doesn't differentiate |
| "Preorder Now for Saturday Market Pickup" | Urgency badge | Appropriate but competes with other CTAs |
| Sparkle icons | Visual noise | Overused — reduces impact |
| Gradient text | Attention grab | Multiple gradient sections dilute focus |

### 2. Supplement-Brand Comparison Marketing

The homepage includes a **"Why Choose Us"** comparison section — a tactic borrowed from supplement/Amazon brands. For a founder-led market brand, this reads as defensive rather than authentic.

A market customer doesn't need a comparison chart. They need to **see the product, hear the story, know where to find it**.

### 3. Competing CTAs — No Clear Primary Action

Multiple CTA types compete on the homepage:

| CTA | Destination | Priority conflict |
|-----|-------------|-------------------|
| "Shop Now" | Product catalog | Ecommerce path |
| "View All Products" | Product catalog | Duplicate of above |
| "Preorder Now" | Preorder flow | Market path |
| "Find Us At Market" | Markets page | Discovery path |

**Missing prominent CTA:** "Visit us at the market this Saturday" — the single most important conversion action for this brand.

### 4. Trust Components — Clutter Without Organic Trust

Components that exist in the codebase for trust signaling:

| Component | Purpose | Issue |
|-----------|---------|-------|
| `GuaranteeBadge` | Purchase confidence | Generic ecommerce pattern |
| `PaymentTrustBadges` | Payment security | Standard — fine to keep |
| `TrustBadges` | General trust | Adds clutter without organic proof |
| `ScarcityBadge.jsx` | Artificial urgency | Inappropriate for a market brand |
| `SoldOutBadge.jsx` | Stock pressure | OK if reflects real inventory |

### 5. Exit Intent & Popups — Aggressive for Community Brand

Exit intent modals and popups exist in the codebase. These are aggressive retention tactics that:
- Interrupt the browsing experience
- Signal desperation rather than confidence
- Are misaligned with a brand built on in-person relationships

### 6. Social Proof — Structurally Good, Needs Population

The social proof section uses database aggregates (review count, customer count). This is **architecturally good** — if the database has real reviews from market customers. But without real customer stories connected to market experiences, it remains empty social proof.

### 7. Product Cards — No Real Photography

Product cards show generic images with gradient overlays. No real product photography. For a food/wellness brand, **seeing the actual product** is the single biggest trust driver.

---

## Customer Confusion Points

### Confusion 1: Multiple Order Paths

A customer can encounter **5+ different checkout/order flows**:

| Path | Route |
|------|-------|
| Standard checkout | `/checkout` |
| Order checkout | `/order/checkout` |
| Preorder | `/preorder` |
| Pay | `/pay` |
| Order menu | `/order/menu` |

**Evidence:**
- `app/checkout/` — full checkout with Square integration
- `app/order/checkout/` — separate order checkout flow
- `app/preorder/page.tsx` — preorder-specific flow
- `app/pay/page.tsx` — standalone payment page
- `app/order/menu/` — menu-based ordering

A first-time customer landing on the homepage has no clear single path.

### Confusion 2: Market Data Inconsistency

Market information is hardcoded in 3 separate files with slightly different formatting:

| File | Data |
|------|------|
| `app/markets/page.tsx` | `MARKETS` const — full market config |
| `app/preorder/page.tsx` | `MARKETS` const — full market config |
| `lib/preorder/rules.ts` | `MARKET_CONFIGS` — cutoff logic |

Plus a `MarketSchedule` Mongoose model in `models/MarketSchedule.ts` that is **not used** by public pages. A customer could see different information depending on which page they visit.

### Confusion 3: Preorder Minimum Surprise

- **$60 minimum** for non-boba preorders (`PREORDER_RULES.NON_BOBA_MINIMUM_CENTS = 6000`)
- This is not clearly communicated before a customer starts building their order
- Customers may add 1-2 items, reach checkout, and be surprised by the minimum

### Confusion 4: Boba Restrictions Not Upfront

- **Max 2 boba items** per preorder (`PREORDER_RULES.BOBA_MAX_QTY = 2`)
- The markets page mentions: *"Boba preorders are limited to 2 drinks. Larger boba orders can be placed at the market."*
- But this appears as a small note, not a prominent constraint before ordering

### Confusion 5: No "What's Available THIS Week" Signal

- No indicator of what's on this week's menu
- No "this week's specials" or featured items
- The site feels static — a customer can't tell if the business is active right now

---

## The Right Emotional Journey

```
Current site path:
  Land → See products → Get pressured → Confused by paths → Leave

What the journey should be:
  Land → Meet Jenneisha (story) → See this week's menu → Find your market
  → Visit the market → Taste it → Come back online to preorder → Routine
```

### The Trust Funnel for a Market Brand

| Stage | Customer thinking | Site should provide |
|-------|------------------|-------------------|
| **Trust** | "Who makes this? Is it real?" | Founder story, real photos, market presence |
| **Understand** | "What is sea moss? Why should I care?" | Educational content in founder voice |
| **Try** | "Where can I taste it?" | Market schedule, prominent "visit us" CTA |
| **Return** | "I liked it, I want more" | Easy preorder with clear flow |
| **Routine** | "This is part of my week now" | Subscription/auto-preorder, weekly menu updates |

---

## Recommendations

### Critical (Reduce Confusion)
1. **Consolidate to ONE primary checkout flow** — eliminate redundant paths
2. **Surface preorder minimum ($60) and boba limit (2) early** — on market page and at cart-add time
3. **Single source of truth for market data** — use `MarketSchedule` model, eliminate hardcoded duplication

### High Priority (Align Psychology)
4. **Remove or soften ScarcityBadge** — artificial urgency undermines a trust-based brand
5. **Remove exit intent modal** — let the story and product quality retain visitors
6. **Replace "Why Choose Us" comparison** with customer testimonials from real market visits
7. **Make "Visit us at market" the primary homepage CTA** — ecommerce conversion is secondary to market conversion
8. **Add "This Week's Menu" to homepage** — makes the site feel alive

### Medium Priority (Trust Building)
9. **Add real product photography** — replace gradient overlays with actual product shots
10. **Add market-day photography** — booth, customers, Jenneisha serving
11. **Connect social proof to real stories** — "I've been coming to Serenbe every Saturday for 6 months"
12. **Simplify badge usage** — keep PaymentTrustBadges, remove GuaranteeBadge and generic TrustBadges

---

## Evidence Files

| File | Relevance |
|------|-----------|
| `components/home/HomePageClient.jsx` | Homepage with competing CTAs and badge stacking |
| `app/markets/page.tsx` | Hardcoded MARKETS const (source 1 of 3) |
| `app/preorder/page.tsx` | Hardcoded MARKETS const (source 2 of 3) |
| `lib/preorder/rules.ts` | MARKET_CONFIGS + PREORDER_RULES (source 3 of 3) |
| `models/MarketSchedule.ts` | Database model — exists but unused by public pages |
| `app/checkout/` | Standard checkout flow |
| `app/order/checkout/` | Alternate order checkout |
| `app/pay/page.tsx` | Standalone payment page |
| `app/order/menu/` | Menu-based ordering flow |
