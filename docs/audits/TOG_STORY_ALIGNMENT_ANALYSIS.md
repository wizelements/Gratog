# TOG Story Alignment Analysis

**Audit Date:** June 3, 2026  
**Scope:** Public-facing brand narrative vs. Jenneisha Glover's real founder story  
**Overall Score:** 2/10 — Story Alignment

---

## Executive Summary

The Taste of Gratitude website emotionally reads as a **generic sea moss supplement store**, not the founder-led community wellness brand it actually is. There is zero founder storytelling on the homepage, no mention of Jenneisha Glover anywhere on the site, and the About page uses a stock photo with a corporate tagline. The lived-experience origin story — health struggle, relapse, rebuilding, discovering sea moss in Atlanta — is completely absent.

---

## Findings

### 1. About Page — No Founder, No Story

**File:** `app/about/page.js`

| Element | What exists | What should exist |
|---------|------------|-------------------|
| Hero image | Stock Unsplash photo (`unsplash.com/photo-1518495973542...`) | Photo of Jenneisha at market or with product |
| Tagline | "Crafted with gratitude, rooted in wellness" | Origin-anchored line connecting gratitude to her journey |
| Founder name | Not mentioned anywhere | Jenneisha Glover, prominently featured |
| Health struggle | Not mentioned | Lifelong stomach issues, weight approaching 250 lbs |
| Turning point | Not mentioned | Quit cigarettes, started juicing, moved to Atlanta |
| Relapse narrative | Not mentioned | Experienced relapse during rebuilding |
| Sea moss discovery | Not mentioned | Discovered sea moss during Atlanta rebuilding chapter |
| Brand origin | Not mentioned | Brand born from gratitude and discipline |

The About page uses `lucide-react` icons (`Leaf`, `Heart`, `Award`, `Users`) as decorative filler — no emotional content behind them.

### 2. Homepage — 844 Lines, Zero Storytelling

**File:** `components/home/HomePageClient.jsx` (844 lines)

- Hero messaging: **"Rich Mineral Content / One Daily Scoop"** — reads like supplement marketing copy
- No story section on homepage
- No weekly menu section on homepage
- No market schedule section on homepage
- No photos of Jenneisha, market days, customers, or real products
- Only stock photos and placeholder SVGs throughout

### 3. Footer — Generic Wellness Copy

- Footer tagline: **"Nourishing your wellness journey with nature's finest sea moss creations"**
- This could belong to any of 500 sea moss brands on Amazon
- No personality, no Atlanta roots, no gratitude angle

### 4. Markets — Positioned as Delivery Channels

**File:** `app/markets/page.tsx`

Markets are mentioned but positioned purely as pickup/preorder locations. They are not presented as the **trust engine** they actually are — the place where customers first taste the product, meet Jenneisha, and become believers.

The market page copy says: *"Come taste at the market, then preorder when you want your wellness routine guaranteed."* — this is the closest the site gets to authentic voice, but it's buried.

### 5. Visual Authenticity — Zero Real Photography

| Asset type | Current state |
|-----------|---------------|
| About hero | Stock Unsplash (holistic wellness generic) |
| Product images | Generic with gradient overlays |
| Market photos | None — emoji identifiers (🏡🏪🌳) used instead |
| Customer photos | None |
| Founder photos | None |

---

## The Real Story (Not on the Site)

> Jenneisha Glover dealt with lifelong stomach issues. Her weight approached 250 lbs. She quit cigarettes, started juicing, moved to Atlanta for a fresh start. She experienced relapse during the rebuilding process. She discovered sea moss during that low point and it became part of her recovery discipline. The brand — Taste of Gratitude — was born from genuine gratitude for a second chance at health.

This story is **the brand**. Without it, the site is selling commoditized sea moss gel.

---

## Scoring Breakdown

| Dimension | Score | Notes |
|-----------|-------|-------|
| Founder presence | 0/10 | Name not mentioned anywhere |
| Origin story told | 0/10 | No health journey, no relapse, no discovery |
| Emotional arc | 1/10 | "Crafted with gratitude" is the only hint |
| Visual authenticity | 1/10 | 100% stock/placeholder imagery |
| Market-as-trust-engine | 3/10 | Markets listed but not positioned as relationship-builders |
| Community voice | 2/10 | Corporate wellness tone throughout |
| **Overall** | **2/10** | |

---

## Recommendations

### Critical (Story Alignment)
1. **Add Jenneisha's story to the About page** — real photo, real narrative arc (struggle → turning point → sea moss discovery → gratitude), in her voice
2. **Add a story section to the homepage** — even 3 sentences with a real photo would transform the emotional read
3. **Replace stock Unsplash hero** on About page with real photography
4. **Rewrite the homepage hero** from supplement marketing ("Rich Mineral Content") to founder brand ("Born from gratitude, made fresh every week")
5. **Rewrite the footer tagline** to something with personality and Atlanta roots

### High Priority (Authenticity)
6. **Add market-day photography** — booth setup, customers, Jenneisha serving
7. **Add a "This Week's Menu" section** to homepage — makes the site feel alive and current
8. **Add market schedule to homepage** — the markets are the heartbeat of the brand
9. **Position markets as the trust engine** — "Come meet us first. Taste it. Then preorder."
10. **Replace product placeholder images** with real product photography

### Medium Priority (Voice)
11. Audit all copy for corporate wellness language and replace with founder voice
12. Add customer stories from market regulars
13. Add an Instagram feed or market-day photo gallery

---

## Evidence Files

| File | Relevance |
|------|-----------|
| `app/about/page.js` | About page with stock photo and generic copy |
| `components/home/HomePageClient.jsx` | 844-line homepage with zero storytelling |
| `app/markets/page.tsx` | Market data with emoji identifiers, hardcoded config |
| `app/preorder/page.tsx` | Duplicate hardcoded market config |
| `lib/preorder/rules.ts` | Third copy of market config |
