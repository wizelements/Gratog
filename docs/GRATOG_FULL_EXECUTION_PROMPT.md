# GRATOG — Full Execution Prompt

> **Project**: Taste of Gratitude (tasteofgratitude.shop)
> **Repo**: ~/Gratog-live
> **Stack**: Next.js 15.3.4 (App Router) · React 19 · MongoDB/Mongoose · Square SDK · Tailwind 3.4 · shadcn/ui · Radix UI · Framer Motion · Zustand · SWR · Resend · Twilio · Vercel
> **Founder**: Jenneisha Glover
> **Domain**: Market-first wellness brand — sea moss, herbal teas, prepared wellness products sold weekly at Atlanta-area farmers markets (Serenbe, Peachtree Road, etc.)
> **Live URL**: https://tasteofgratitude.shop

---

## MISSION

Transform Taste of Gratitude from a bloated, generic-feeling e-commerce platform into an intentionally designed, emotionally grounded digital extension of a weekly farmers market ritual. The founder rebuilt her life and turned that journey into nourishment for others. The platform must communicate that story at every level.

---

## CURRENT STATE (What You're Working With)

### Architecture
- **Framework**: Next.js 15.3.4 App Router, React 19.1.0
- **Database**: MongoDB via Mongoose 8.14 + native driver. Models: `MarketSchedule`, `MarketOrder`, `DailyInventory`. Raw collections: `admin_users`, `orders`, `product_reviews`, `products`
- **Payments**: Square SDK v43.2.0 (Web Payments SDK, in-app tokenization)
- **Auth**: Edge-compatible JWT via `jose`, cookie-based admin auth, middleware-protected routes
- **State**: Zustand 5.0.3 + SWR 2.3.6
- **Email/SMS**: Resend v6.5.2, Twilio v5.3.5
- **Analytics**: PostHog, GA4, Sentry 10
- **Deploy**: Vercel with cron jobs for health checks, pickup reminders, campaigns

### File Structure
```
app/                    # Next.js App Router — 60+ routes
  ├── (site)/           # instagram, community
  ├── about/
  ├── admin/            # 20+ admin routes (orders, products, markets, campaigns, inventory, etc.)
  ├── api/              # 80+ API routes
  ├── cart/
  ├── catalog/
  ├── checkout/         # square, success
  ├── explore/          # games, showcase, ingredients, learn (BLOAT)
  ├── gratitude/        # rewards (STUB)
  ├── markets/
  ├── order/            # menu, start, complete, status, checkout, success
  ├── order-v2/         # (DUPLICATE PATH)
  ├── pay/              # (DUPLICATE CHECKOUT)
  ├── preorder/         # status
  ├── product/[slug]/
  ├── profile/          # orders, rewards, challenge, settings
  ├── quiz/             # (BLOAT)
  ├── reviews/
  ├── subscriptions/
  └── ugc/              # (BLOAT)
components/             # 104 components (MANY are bloat)
  ├── home/             # HomePageClient.jsx (single file — needs rewrite)
  ├── checkout/         # CartSummary, FulfillmentTabs, SquarePaymentForm, etc.
  ├── admin/            # MobileCard, MobileLayout, ProtectedRoute, QuickActions
  ├── market/
  ├── catalog/
  ├── cart/
  ├── pay-flow/
  ├── psychology/       # (BLOAT)
  ├── explore/          # (BLOAT)
  ├── gratitude/        # (STUB)
  ├── ui/               # shadcn primitives
  └── [90+ root-level component files]
models/                 # MarketSchedule.ts, MarketOrder.ts, DailyInventory.ts
lib/                    # square.ts, preorder/rules.ts, core business logic
services/               # API service layers
stores/                 # Zustand stores
docs/audits/            # Production alignment, story, financial, psychology, market ops audits
```

### Known Problems (From Prior Audits)
1. **No founder story** on the site — the emotional center is completely missing
2. **No weekly menu system** — the core business ritual has no digital representation
3. **Hardcoded market data** scattered across codebase instead of unified in DB
4. **Feature bloat**: 4 wellness games, 3D AR viewer, background music, spin wheel, UGC challenges, quiz funnel, subscription system, passport stamps — none connected to actual business
5. **Duplicate checkout paths**: `/checkout`, `/pay`, `/order/checkout`, `/pay-flow` — confusing
6. **Supplement-style copy**: "92 of 102 minerals", health benefit filters, FDA-risk language
7. **Visual noise**: badge overload, competing CTAs, ExitIntentModal, ExitIntentPopup, StickySecondaryNav, FloatingCart all fighting for attention
8. **Mobile redirect trap**: mobile users sent to `/pay` without navigation
9. **Components that shouldn't exist**: `BackgroundMusic.tsx`, `MusicControls.tsx`, `SpinWheel.jsx`, `SpinTracker.jsx`, `FitQuiz.jsx`, `WhyUsComparison.jsx`, `GuaranteeBadge.jsx`, `PaymentTrustBadges.jsx`, `ExitIntentModal.jsx`, `ExitIntentPopup.jsx`, `LanguageSwitcher.jsx`, `LiveChatWidget.jsx`, `FrequentlyBoughtTogether.jsx`, `UpsellWidget.jsx`

---

## CREATIVE DIRECTION

### Brand Feel = Intersection Of:

| Reference | What We Take |
|-----------|-------------|
| **Aesop** | Intentional calm, sensory warmth, premium restraint, typographic confidence |
| **Sweetgreen** | Real-world pickup logic, operational clarity, freshness-forward |
| **Apple Retail** | Clear hierarchy, one obvious next step, calm spacing, zero clutter |
| **High-end farmers market** | Human, local, seasonal, alive, hand-lettered energy |
| **Boutique hospitality** | Welcoming, reassuring, thoughtful, "we were expecting you" |

### Explicitly NOT:
- Supplement funnels or biohacker marketing
- Startup SaaS dashboards
- Generic Shopify wellness stores
- Crypto/web3 aesthetics
- Neon hype wellness or TikTok trend branding
- Fake luxury minimalism
- "Optimize your body" language

### Emotional Target:
> "A real person rebuilt their life, turned that journey into nourishment for others, and created a weekly community ritual around gratitude and consistency."

Every page, component, CTA, workflow, image, interaction, and admin system must support that emotional direction. Nothing accidental. Nothing generic. Nothing emotionally disconnected from the founder story.

---

## DESIGN GATE — Every Section Must Answer:

1. Why is this here?
2. What emotional purpose does it serve?
3. What business purpose does it serve?
4. Does it reduce or increase cognitive load?
5. Does it increase trust?
6. Does it reinforce the founder story?
7. Does it reinforce weekly ritual behavior?
8. Does it support the market-first business model?

If a component, page, or section cannot answer ALL 8, it gets removed or redesigned.

---

## EXECUTION PHASES

### PHASE 0: SURGERY — Remove Bloat (Do First)

**Goal**: Strip the platform to its honest core before rebuilding.

#### Routes to Remove/Hide:
- `/explore/games/*` (all 4 games: benefit-sort, ingredient-quiz, ingredient-rush, memory-match)
- `/explore/showcase` (3D AR viewer)
- `/ugc/*` (UGC challenges)
- `/quiz/*` (quiz funnel)
- `/passport` (stamp passport)
- `/order-v2` (duplicate)
- `/diagnostic` (dev-only)
- `/test-auth` (dev-only)
- `/rewards` (stub duplicate of `/gratitude/rewards`)

#### Components to Remove:
- `BackgroundMusic.tsx`, `MusicControls.tsx`, `MusicProviderWrapper.tsx`
- `SpinWheel.jsx`, `SpinTracker.jsx`
- `FitQuiz.jsx`
- `ExitIntentModal.jsx`, `ExitIntentPopup.jsx`
- `LiveChatWidget.jsx`
- `LanguageSwitcher.jsx`
- `GuaranteeBadge.jsx`
- `PaymentTrustBadges.jsx`
- `FrequentlyBoughtTogether.jsx`
- `UpsellWidget.jsx`
- `WhyUsComparison.jsx`
- `WhyChooseUs.jsx`
- `HealthBenefitFilters.jsx`
- `RecommendationsWidget.jsx`
- `ReferralWidget.jsx`
- `IngredientDeepDiveModal.jsx`
- `AccessibilityControls.jsx` (rebuild properly later)
- `StickySecondaryNav.jsx`

#### Unify Checkout Paths:
Keep ONE checkout flow. Audit `/checkout`, `/pay`, `/order/checkout`, `/pay-flow` — consolidate to a single path. Remove the rest.

#### Audit Removal Criteria:
Every removed component must be grep'd for imports first. Remove the import chain, not just the file.

**Validation**: `npm run build` must pass after each removal batch. No dead imports.

---

### PHASE 1: STORY — Founder & Narrative Foundation

**Goal**: Make the founder's story the emotional center of the platform.

#### About Page (`/about`) — Full Rewrite:
- Jenneisha Glover's real journey: recovery, rebuilding, gratitude, community
- Sensory, grounded, first-person tone
- Market photography (placeholder structure for now)
- No corporate About boilerplate
- No health claims or transformation promises
- End with: "Come find us at the market"

#### Homepage — Emotional Restructure:
Rewrite `components/home/HomePageClient.jsx` (currently a single bloated file). Break into modular sections following this psychological flow:

1. **Founder-led Hero** — Trust before products. Jenneisha's face, warmth, single CTA: "See This Week's Menu"
2. **Weekly Menu Section** — The ritual. Fresh, alive, seasonal. "What's available this week"
3. **Our Story (Brief)** — 2-3 sentences + link to `/about`. Grounded, human
4. **Market Schedule** — Where and when. Map or cards. "Find Us This Weekend"
5. **Product Categories** — Calm browse. 3-4 categories max. No badge overload
6. **Educational/Ingredients** — "What goes into our products" — transparency, not supplement claims
7. **Newsletter / Weekly Rhythm** — "Get the weekly menu in your inbox." Low-pressure

**Why This Order**:
- Trust before products
- Context before checkout
- Story before selling
- Menus before catalog overload

#### Copy Standards (Apply Everywhere):
- Human, grounded, emotionally mature, founder-aligned
- No startup jargon, wellness clichés, AI-sounding copy
- No "superfood" spam, exaggerated transformation language
- Tone: thoughtful, warm, calm, intentional, conversational, sensory, trustworthy

**CTA Examples (GOOD)**:
- "See This Week's Menu"
- "Find Us At The Market"
- "Explore Available Products"
- "Reserve Your Weekly Pickup"
- "Learn The Story"

**CTA Examples (BAD — remove all)**:
- "BUY NOW"
- "LIMITED TIME"
- "TRANSFORM YOUR HEALTH"
- "UNLOCK WELLNESS"

---

### PHASE 2: MENU SYSTEM — The Ritual Engine

**Goal**: Make weekly menus the heartbeat of the platform.

#### New MongoDB Model: `Menu`
```typescript
{
  title: string           // "Week of June 2, 2026"
  description?: string    // Optional flavor text
  imageUrl: string        // Canva menu image (uploaded to Vercel Blob or similar)
  thumbnailUrl?: string   // Optimized thumbnail
  marketId?: ObjectId     // Optional: market-specific menu
  weekStart: Date         // Monday of the week
  weekEnd: Date           // Sunday of the week
  isActive: boolean       // Currently displayed
  linkedProducts?: [ObjectId]  // Optional: products on this menu
  createdAt: Date
  updatedAt: Date
}
```

#### Public Route: `/menu`
- Hero: current week's menu image, large, zoomable
- Mobile: pinch-to-zoom, fast loading
- Previous weeks archive (optional, low priority)
- Direct links to order products shown on menu
- Should feel like: "fresh drops from the market"

#### Admin: Menu Management (`/admin/menus`)
- Upload weekly Canva menu image
- Set active menu
- Associate with market/week
- Preview what customers see
- Simple, fast, operational UX

#### API Routes:
- `GET /api/menus` — list menus (active first)
- `GET /api/menus/current` — this week's active menu
- `POST /api/admin/menus` — create/upload menu (admin auth required)
- `PUT /api/admin/menus/[id]` — update menu
- `DELETE /api/admin/menus/[id]` — remove menu

---

### PHASE 3: MARKET UNIFICATION — Single Source of Truth

**Goal**: All market data lives in MongoDB, not scattered across hardcoded arrays.

#### Audit & Replace:
- Grep the entire codebase for hardcoded market names, addresses, coordinates, hours
- Replace every instance with data fetched from `MarketSchedule` model
- Markets page (`/markets`) reads from DB
- Checkout pickup locations read from DB
- Admin manages markets in `/admin/markets` (already exists — verify it's the source of truth)

#### Market Page (`/markets`) — Redesign:
- Welcoming, communal, real, sensory, active
- Each market: photo, name, address, hours, next date
- "Find Us This Weekend" energy
- Support for: booth imagery, weekly setup visuals, "this weekend at Serenbe"
- Encourage: "come meet us" — NOT "replace the physical experience"

---

### PHASE 4: VISUAL HIERARCHY — Aggressive Cleanup

**Goal**: Every page has ONE primary action, ONE emotional focus, clear reading flow, breathing room.

#### Global Rules:
- Remove unnecessary pills/badges from product cards
- Remove cluttered overlays
- Remove excessive drop shadows
- Remove animation spam (Framer Motion used sparingly, purposefully)
- Remove CTA duplication (one primary CTA per viewport)
- Remove visual competition between sections
- Use spacing, typography, contrast, imagery INTENTIONALLY
- Gradients: sparingly. Badges: sparingly. Animation: sparingly.

#### Users Should Never Feel:
- Overwhelmed, rushed, pressured, lost, or distracted

#### Typography:
- Establish clear heading hierarchy (H1 > H2 > H3)
- Body text: readable, generous line height
- Sufficient contrast (WCAG AA minimum)

#### Color:
- Audit current CSS custom properties in `app/styles/` and `tailwind.config.js`
- Establish intentional palette: warm earth tones, natural greens, cream/warm whites
- Remove any neon, electric, or aggressive accent colors

#### Component Audit:
Go through all 104 components. For each:
1. Is this needed for the core business? (market sales, menus, products, checkout, admin)
2. Does it pass the 8-question design gate?
3. If no → remove or redesign

---

### PHASE 5: PRODUCT PAGES — Sensory, Not Supplement

**Goal**: Product pages emphasize experience, not pseudo-medical features.

#### Product Page (`/product/[slug]`) Should Show:
- Beautiful product photography (full-width, clean)
- Sensory description: flavor, texture, aroma, experience
- Ingredients with transparency (not "92 of 102 minerals")
- Preparation notes / serving suggestions
- Storage guidance
- "How customers enjoy this" (if reviews exist)
- Market availability / weekly menu placement
- Pickup expectations
- Seasonal status
- ONE clear CTA: "Add to Cart" or "Reserve for Pickup"

#### Product Page Must NOT Have:
- Pseudo-medical claims
- Supplement-style feature bullet walls
- "Miracle" positioning
- Giant benefit lists with shield/zap/sparkle icons
- Competing sidebar widgets

#### Product Cards (in catalog, homepage, menu):
- Clean image
- Product name
- Brief descriptor (flavor-forward, not benefit-forward)
- Price
- One action button
- NO badge overload, NO "trending" pills, NO "bestseller" unless genuinely earned

---

### PHASE 6: CHECKOUT — Calm & Clear

**Goal**: Checkout feels reassuring, not confusing.

#### Single Checkout Flow:
After Phase 0 consolidation, the one remaining checkout path must:
- Show clear order summary at every step
- Make pickup location/time selection obvious
- Show market name, address, date, time window
- Handle preorder logic transparently ("This item is prepared for your pickup on Saturday")
- Square payment form: clean, confident, no trust-badge spam
- Confirmation page should emotionally feel like: "Your order is reserved and we're preparing it for you"

#### Users Must Always Understand:
- What they ordered
- Where they're picking up
- When they're picking up
- Whether they've paid
- What happens next

#### Remove From Checkout:
- Coupon input prominence (move to subtle expandable)
- Upsell widgets
- Trust badge clusters
- Multiple payment path confusion

---

### PHASE 7: MOBILE UX — First-Class Citizen

**Goal**: Most users come from QR scans, Instagram, market interactions — mobile is THE platform.

#### Mobile Priorities:
- Thumb reach for all primary actions
- Readability: 16px+ body text, generous touch targets (44px+)
- Fast scanning: clear headings, short paragraphs
- Image clarity: optimized, responsive, fast-loading
- Menu clarity: simple hamburger or bottom nav (not both competing)
- Navigation: simple, shallow (3 items max in primary nav on mobile)
- Low friction: minimal form fields, smart defaults

#### Remove on Mobile:
- Stacked sticky bars
- FloatingCart overlay (or make it non-competing)
- Popup overload (ExitIntent already removed in Phase 0)
- Unnecessary animations
- Competing notification banners

#### Bottom Navigation (if used):
- Max 4-5 items: Home, Menu, Markets, Cart, (Account)
- Active state clear
- No badge spam on nav items

---

### PHASE 8: ADMIN UX — Operational Clarity

**Goal**: Admin feels operational, clear, practical, fast, dependable.

#### Admin Dashboard (`/admin`) Must Show At Glance:
- Active menus (this week's menu status)
- Active products (count, any out-of-stock alerts)
- Current markets (this week's schedule)
- Today's preorders (count, fulfillment status)
- Visibility state (what customers currently see publicly)

#### Admin Routes to Keep & Improve:
- `/admin/orders` — order management, fulfillment status
- `/admin/products` — product CRUD, visibility toggle
- `/admin/markets` — market schedule management
- `/admin/inventory` — per-market inventory
- `/admin/menus` (NEW from Phase 2) — weekly menu upload
- `/admin/customers` — customer list
- `/admin/campaigns` — email campaigns
- `/admin/settings` — site settings

#### Admin Routes to Evaluate for Removal:
- `/admin/qr-generator` — keep if actually used at markets
- `/admin/queue` — keep if market-day queue is real
- `/admin/interactions` — evaluate usefulness
- `/admin/waitlist` — evaluate usefulness
- `/admin/coupons` — keep but simplify
- `/admin/square-oauth` — keep (setup utility)
- `/admin/analytics` — keep but simplify
- `/admin/market-day` — evaluate: merge into `/admin/markets`?
- `/admin/market-setup` — evaluate: merge into `/admin/markets`?
- `/admin/reviews` — keep if reviews are real
- `/admin/errors` — dev utility, keep but hide from main nav

#### Admin Must NOT Feel:
- Developer-centric
- Overcomplicated
- Cluttered with features Jenneisha doesn't use

---

### PHASE 9: NAVIGATION — Intentional Information Architecture

**Goal**: Simple, clear navigation that guides without overwhelming.

#### Public Navigation (Desktop):
```
[Logo]  Menu  Markets  Shop  About  [Cart]
```

5-6 items maximum. No mega menus. No dropdown overload.

#### Public Navigation (Mobile):
```
Bottom: Home | Menu | Markets | Cart
Hamburger: Shop, About, Contact, Account
```

#### Footer:
- Contact info
- Market schedule summary
- Social links (Instagram primary)
- Newsletter signup
- Legal (Privacy, Terms)
- "Made with gratitude in Atlanta"

#### Remove:
- MegaMenu component
- DesktopNav complexity (simplify)
- Any nav item pointing to bloat routes (explore, games, quiz, passport, etc.)

---

### PHASE 10: ACCESSIBILITY — Non-Negotiable

**Goal**: Inclusive by default.

#### Requirements:
- WCAG AA contrast ratios minimum
- All images have meaningful alt text
- Keyboard navigation works on every interactive element
- Focus states visible and styled
- Semantic HTML structure (proper heading hierarchy, landmarks, lists)
- `prefers-reduced-motion` respected — disable all Framer Motion animations
- Screen reader tested (at minimum: logical reading order, form labels, button labels)
- Skip links (`components/SkipLinks.jsx` — audit and keep)
- No content hidden only by color
- Touch targets 44px minimum on mobile

---

## MARKETING PSYCHOLOGY PRINCIPLES (Apply Everywhere)

### A. TRUST TRANSFER
The market relationship transfers into digital trust.
- Customers should feel: "I've met these people. I trust this brand. This feels real."
- Achieved through: founder photography, real market imagery, honest copy, consistent visual identity

### B. RITUAL PSYCHOLOGY
Frame products as part of weekly routines.
- Language: "your weekly pickup", "part of your rhythm", "freshly prepared for the week", "crafted in small batches"
- NOT: "optimize your body", "supercharge your life", "detox now"

### C. COGNITIVE EASE
Reduce decision fatigue at every step.
- Guided flows, clear categories, progressive disclosure
- Intentional defaults (e.g., default to nearest market for pickup)
- Concise product descriptions (3-4 sentences max)

### D. CALM CONVERSION
Users feel invited, not pushed.
- Reassurance > urgency
- Authenticity > scarcity
- Clarity > pressure
- Emotional resonance > aggressive CTAs

### E. COMMUNITY REINFORCEMENT
Markets and repeat customers feel visible.
- "People actually come here every week" energy
- Market photography showing real community
- Newsletter framed as "weekly rhythm" not "marketing list"

---

## COPYWRITING STANDARDS

### Tone:
Thoughtful · Warm · Calm · Intentional · Conversational · Sensory · Trustworthy

### Every Piece of Copy Must Feel:
- Human (not AI-generated)
- Grounded (not aspirational fluff)
- Emotionally mature (not hype)
- Founder-aligned (Jenneisha would say this)
- Non-corporate (no "leveraging synergies")
- Non-generic (not interchangeable with any other wellness brand)

### Product Descriptions:
- Lead with flavor/experience
- Include ingredients transparently
- Note preparation/serving suggestions
- Mention market availability if relevant
- 3-4 sentences maximum

### Microcopy (buttons, labels, empty states, errors):
- Friendly, clear, specific
- Error messages should reassure: "Something went wrong — your payment wasn't charged. Try again?"
- Empty states should guide: "No menu posted yet — check back on Monday!"

---

## VALIDATION CHECKLIST (Per Phase)

After each phase, verify:

- [ ] `npm run build` passes (zero errors)
- [ ] `npm run lint` passes
- [ ] No dead imports or unused files left behind
- [ ] Mobile viewport tested (375px, 390px, 414px)
- [ ] Desktop viewport tested (1280px, 1440px)
- [ ] All remaining pages load without console errors
- [ ] Navigation works end-to-end
- [ ] Checkout flow completes (Square sandbox)
- [ ] Admin login + dashboard loads
- [ ] No removed features referenced in remaining code
- [ ] Heading hierarchy is semantic (H1 > H2 > H3, no skips)
- [ ] Color contrast passes AA
- [ ] All images have alt text
- [ ] Primary CTA is obvious on every page
- [ ] Copy passes the "would Jenneisha say this?" test

---

## FILE REFERENCE MAP

| Area | Key Files |
|------|-----------|
| Homepage | `components/home/HomePageClient.jsx`, `app/page.jsx` |
| About | `app/about/page.jsx` |
| Products | `app/product/[slug]/page.jsx`, `components/ProductCard.jsx`, `components/EnhancedProductCard.jsx` |
| Catalog | `app/catalog/page.jsx`, `components/catalog/` |
| Checkout | `components/checkout/`, `app/checkout/`, `app/pay/`, `components/pay-flow/` |
| Cart | `components/cart/`, `components/FloatingCart.jsx`, `app/cart/` |
| Markets | `app/markets/page.jsx`, `components/market/`, `models/MarketSchedule.ts` |
| Orders | `models/MarketOrder.ts`, `app/order/`, `components/checkout/` |
| Admin | `app/admin/`, `components/admin/` |
| Menu (NEW) | `models/` (create Menu.ts), `app/menu/` (create), `app/admin/menus/` (create) |
| Navigation | `components/Header.jsx`, `components/BottomNav.jsx`, `components/DesktopNav.tsx`, `components/Footer.tsx` |
| Layout | `app/layout.jsx`, `middleware.ts` |
| Styles | `app/styles/`, `tailwind.config.js` |
| Config | `next.config.js`, `vercel.json` |

---

## EXECUTION RULES

1. **Phase 0 first, always.** Don't build new features on top of bloat.
2. **Build passes after every change.** No "fix it later" broken builds.
3. **One primary CTA per page.** If you can't pick one, the page needs redesign.
4. **Mobile-first implementation.** Desktop is the enhancement, not the other way around.
5. **Copy review on every component.** Replace generic/supplement/AI copy inline as you touch files.
6. **No new bloat.** Every new component, route, or feature must pass the 8-question design gate before creation.
7. **Founder story is the throughline.** If a section doesn't connect to Jenneisha's journey, market presence, or weekly ritual — question whether it belongs.
8. **Grep before removing.** Every file removal must be preceded by `rg "ComponentName" --type jsx --type tsx --type js --type ts` to find all imports.
9. **Accessibility is not optional.** Every phase includes accessibility checks.
10. **Admin is a user too.** Jenneisha uses the admin daily at markets. It must be fast, clear, and practical.

---

## SUCCESS CRITERIA

When this execution is complete, the platform will:

- [ ] Load and the first thing you feel is warmth, trust, and intentionality
- [ ] Tell you who made this and why within the first scroll
- [ ] Show you this week's menu within 2 taps from anywhere
- [ ] Let you find and navigate to a market within 2 taps
- [ ] Complete a purchase in under 60 seconds on mobile
- [ ] Have zero supplement-style or pseudo-medical copy
- [ ] Have zero bloat routes or unused components
- [ ] Have one clear checkout path
- [ ] Have admin that Jenneisha can operate solo at a market booth
- [ ] Feel like Aesop × Sweetgreen × farmers market — not like a Shopify template
- [ ] Pass WCAG AA accessibility
- [ ] Build and deploy cleanly on Vercel

---

*This is the execution contract. Every implementation decision flows from this document.*
