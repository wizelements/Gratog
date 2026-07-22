# Taste of Gratitude — Conversion Psychology, Behavioral UX, and Revenue Experience Audit

Generated: 2026-07-22
Auditor: OpenClaw
Scope: Public customer-facing experience across homepage, weekly menu, catalog, product pages, preorder, markets, bundles, Gratitude Box, quiz, about, FAQ, footer, header, mobile, accessibility, trust, and retention.
Method: Source-code audit of components and data files, live API probes, and rendered HTML metadata. Visual screenshots were attempted but could not be generated because the PRoot/Termux environment lacks a working headless browser (Playwright chromium failed to install because Ubuntu's chromium is a snap stub; Firefox install unavailable). Visual conclusions are therefore derived from component layout code, responsive breakpoints, and CSS class analysis, which is acceptable for identifying visual-hierarchy and CTA issues but less authoritative than pixel-level inspection.

---

## 1. Executive Assessment

### 1.1 Overall conversion readiness

The Taste of Gratitude storefront is **structurally advanced but commercially fragile**. It has a modern Next.js 15 App Router implementation, PWA support, Square integration, email automation, admin tooling, and a clear founder-led brand story. However, the customer-facing experience suffers from:

- A **broken live catalog** (Square items are unnamed and $0; direct catalog API crashes).
- **Customer-facing roadmap language** throughout the site (bundles, subscriptions, SMS, rewards, workshops).
- **Health-claim risk** baked into product names and quiz logic.
- **Overloaded homepage hero** with three competing CTAs, one of which promises a non-functional SMS program.
- **Weak product differentiation** — many products look like flavor variants of the same sea-moss base.

**Verdict:** A motivated visitor can eventually figure out how to preorder, but the site asks too many decisions, promises too many unbuilt features, and does not clearly answer "What can I buy this week, where, and how much does it cost?" above the fold.

### 1.2 Major strengths

1. Clear founder story with authentic first-person voice (about page).
2. Strong local-market focus: Serenbe and Dunwoody are specific and repeated.
3. FDA disclaimer exists in the footer (good baseline).
4. Email capture is wired via Resend and has honest consent copy.
5. Preorder flow is fully built and tracks events analytically.
6. Mobile-first card-based product presentation.
7. Quick-add button on product cards reduces friction.
8. Visual brand is consistent: emerald, stone, rounded cards, warm typography.

### 1.3 Major weaknesses

1. Hero offers **three CTAs of equal visual weight**: "Get Menu Texts" (non-functional SMS), "Shop This Week" (goes to catalog), "Take the Wellness Quiz" (health-goal mapping).
2. Hero headline is **brand-abstract**, not product-specific: "Your weekly farmers market wellness routine starts here."
3. Weekly-menu and product cards display **wellness-support tags** such as "Daily Defense," "Mineral Balance," "Immunity" — structure/function language.
4. Product names "Grateful Defense" and "Healing Harmony Gel" imply disease/therapeutic benefits.
5. Bundles advertise savings and "subscription-ready boxes" without real Square SKUs or recurring billing.
6. Gratitude Box page says "Weekly subscription" but is a one-time payment link / waitlist.
7. FAQ advertises Spin & Win, Gratitude Passport, workshops, challenges, and rewards as if live.
8. Product images are largely stock/external or repeated `/images/gratog-bg.PNG`.
9. Catalog and product-detail pages depend on a failing Square catalog sync.
10. `weekly-menu`, `catalog`, `quiz`, and `markets` compete for the same visitor intent without clear hierarchy.

### 1.4 Five immediate actions

1. **Fix the Square catalog price/name reconciliation** (P0 commerce) before any conversion optimization matters.
2. **Rewrite homepage hero** to a single product-forward primary CTA: "View this week's menu".
3. **Remove or truthful-ify SMS, bundle, subscription, and reward promises** until the integrations are live.
4. **Rename high-risk products** and replace health-goal quiz logic with flavor/format/pickup recommendations.
5. **Replace repeated stock hero image** with real product or founder/market photography.

---

## 2. Scorecard

| Category | Score (1–10) | Evidence | Main strength | Main weakness | +1 point requires |
|---|---|---|---|---|---|
| Immediate offer clarity | 4 | Hero headline abstract; three equal CTAs; SMS CTA non-functional | Has CTA buttons | No single dominant action; first CTA promises unavailable channel | One primary product-forward CTA |
| Product understanding | 5 | Product cards show price, size, first 3 ingredients, wellness tag | Good card density | Wellness tag dominates; flavor/type not instantly clear | Category + flavor descriptor on every card |
| Brand differentiation | 6 | Founder story is personal and specific; market names repeated | Authentic founder voice | Homepage buries founder story below many sections | Hero includes founder/product hook |
| Emotional authenticity | 6 | About page reads genuinely | Personal health journey | Journey implies product caused recovery | Reframe recovery as routine, not product effect |
| Visual trust | 5 | Consistent emerald/stone palette, clean cards | Professional looking | Stock/repeated imagery, no real product photos | Replace hero and product images |
| Image quality | 3 | `/images/gratog-bg.PNG` reused; Unsplash on about; external product images | Some product photos exist | No coherent photography system | Founder/product/market photo shoot |
| CTA effectiveness | 4 | Many CTAs present | Specific verbs in some places | Three hero CTAs compete; vague "Shop This Week" / "Shop bundle products" | Establish primary/secondary/tertiary hierarchy |
| Navigation clarity | 6 | Header labels are clear: This Week's Menu, Shop, Quiz, Markets, About | Mobile nav is full-screen | Desktop header has 6 items + login + cart; quiz feels out of place | Remove Quiz from primary nav or demote it |
| Cognitive simplicity | 4 | Many paths to same goal | Familiar card UI | Weekly menu, catalog, shop, preorder, bundles overlap | Consolidate discovery paths |
| Mobile usability | 5 | Mobile card layouts and bottom nav | Touch-friendly cards | Hero has 3 stacked buttons on mobile; long scroll to products | Single-sticky mobile CTA |
| Accessibility | 5 | Alt text present; semantic landmarks attempted | Header has aria labels | Custom colors use non-standard tailwind bracket syntax (`from-[emerald-600]`) | Fix contrast, focus, label associations |
| Market-selection clarity | 6 | Market cards show day/hours/address | Preorder has market picker | Delivery/shipping scope unverified | Clarify pickup-only default |
| Checkout confidence | 5 | Square secure messaging, waitlist number | Trust badges in footer | Square catalog $0 issue undermines price trust | Fix Square catalog |
| Social proof | 3 | Placeholder quotes when no reviews | Has review schema | No real reviews shown on homepage; fabricated-sounding quotes | Collect and display verified reviews |
| Founder-story effectiveness | 6 | First-person, emotional, specific | Authentic | Implies health improvement from product | Soften medical implication |
| Form usability | 5 | Compact retention forms | Honeypot field present | Phone field implies active SMS; no separate SMS consent | Truthful expectation copy |
| Funnel continuity | 4 | Tracks events through funnel | Event tracking | Preorder pulls from broken Square catalog | Reconcile catalog + curated data |
| Operational truthfulness | 3 | Some waitlist labels exist | Honest subscription waitlist | SMS, bundles, rewards, workshops advertised as live | Audit every feature claim |
| Retention readiness | 5 | Email + waitlist forms everywhere | Captures intent | SMS not operational; no real loyalty program | Operationalize one retention channel |
| Overall conversion readiness | 4 | Strong tech stack + clear founder story | Can convert motivated visitors | Too much friction, false promises, broken catalog | P0 catalog fix + hero simplification |

**Average score: ~4.7 / 10.** The site is closer to a polished prototype than a trustworthy, revenue-optimized storefront.

---

## 3. Visitor-Model Findings

### A. Existing customer

- **Likely goals:** See this week's menu, reorder a favorite, confirm pickup market/time, find current price.
- **Entry routes:** Direct `/weekly-menu`, email link to `/preorder?market=...`, QR code at market.
- **Primary questions:** What's fresh this week? Did my favorite make the menu? Which market are you at this Saturday/Sunday?
- **Emotional state:** Practical, slightly impatient.
- **Trust requirements:** Consistency (same booth, same quality), clear pickup info.
- **Likely objections:** "I don't want to read the whole homepage again."
- **Best CTA:** "View this week's menu →" or "Preorder for Serenbe/Dunwoody pickup."
- **Likely abandonment point:** Homepage hero if they land there instead of weekly menu; forced to scroll through founder story and bundles.
- **Missing reassurance:** Real-time menu freshness signal.
- **Most valuable next step:** Direct link to current weekly menu with one-click preorder for their usual market.

### B. First-time local shopper

- **Likely goals:** Understand what is sold, decide trustworthiness, compare products, learn where/how to buy.
- **Entry routes:** `/` (homepage), `/catalog`, social media to `/weekly-menu`.
- **Primary questions:** What does Taste of Gratitude sell? Is it a drink? A gel? Where do I get it? How much?
- **Emotional state:** Curious but skeptical; comparing with other wellness brands.
- **Trust requirements:** Real founder, real market, clear ingredients, no medical overclaim.
- **Likely objections:** "Another wellness brand with vague 'wellness routine' language."
- **Best CTA:** "See this week's fresh menu" or "Find us at the market."
- **Likely abandonment point:** Hero if headline is abstract; quiz if it asks health goals too early.
- **Missing reassurance:** Visual proof of real product/booth/founder.
- **Most valuable next step:** Product-led hero with current menu and market pickup signal.

### C. Market shopper via QR/social

- **Likely goals:** See today's available products, preorder quickly, confirm pickup location.
- **Entry routes:** `/weekly-menu`, `/preorder?market=...`, `/catalog`.
- **Primary questions:** What can I preorder for this weekend? Where is the booth? What time?
- **Emotional state:** Ready to buy, low patience.
- **Trust requirements:** Accurate menu, clear pickup instructions, easy mobile flow.
- **Likely objections:** "Why do I need a quiz/account to buy?"
- **Best CTA:** "Preorder for [market] pickup."
- **Likely abandonment point:** Homepage if QR lands there; catalog if products fail to load.
- **Missing reassurance:** Mobile-optimized quick-order flow.
- **Most valuable next step:** Market-specific landing page with products + pickup time + map.

### D. Wellness-curious shopper

- **Likely goals:** Understand ingredients, avoid exaggerated health claims, find a product aligned with flavor/routine preference.
- **Entry routes:** `/quiz`, `/about`, `/catalog`.
- **Primary questions:** What is sea moss? What does it taste like? How do I use it? Is this safe?
- **Emotional state:** Cautious, wants education before purchase.
- **Trust requirements:** Ingredient transparency, FDA disclaimer, no disease claims.
- **Likely objections:** "This sounds like it promises health benefits it can't deliver."
- **Best CTA:** "Explore ingredients" or "Try a sample at the market."
- **Likely abandonment point:** Quiz that maps health goals; product names like "Defense" / "Healing."
- **Missing reassurance:** Ingredient-led, not benefit-led, product discovery.
- **Most valuable next step:** Ingredient/format-first quiz and product taxonomy.

### E. Gift or bundle shopper

- **Likely goals:** Understand what's included, value, presentation, fulfillment, purchase confidently.
- **Entry routes:** Homepage bundle section, `/subscriptions/gratitude-box`, `/catalog` search.
- **Primary questions:** What comes in the box? Is it a real bundle price? Can I ship it?
- **Emotional state:** Comparison shopping; wants simplicity.
- **Trust requirements:** Clear contents, real savings, easy checkout.
- **Likely objections:** "Savings are not real because it links to search, not a bundle SKU."
- **Best CTA:** "Build a box" or "See box contents."
- **Likely abandonment point:** Bundle card that links to catalog search.
- **Missing reassurance:** Transparent bundle composition and checkout path.
- **Most valuable next step:** Remove placeholder savings or create real bundle SKUs.

### F. Founder-story visitor

- **Likely goals:** Understand who created the brand, connect emotionally, validate authenticity, transition to product discovery.
- **Entry routes:** `/about`, homepage founder section.
- **Primary questions:** Who is Jenneisha? Why should I trust this brand?
- **Emotional state:** Open to story, seeking connection.
- **Trust requirements:** Authenticity, specificity, no red-flag health claims.
- **Likely objections:** "Did sea moss cure her exhaustion?"
- **Best CTA:** "Try the market menu" or "Find us at the market."
- **Likely abandonment point:** If the story implies product cured illness.
- **Missing reassurance:** Clear separation of personal routine from product effect.
- **Most valuable next step:** Keep story, remove therapeutic implication, link to current menu.

---

## 4. Page-by-Page Matrix

| Route | Purpose | Audience | Primary CTA | Main strength | Main weakness | Trust gap | Conversion risk | Recommendation | Priority |
|---|---|---|---|---|---|---|---|---|---|
| `/` | Gateway + capture | All | Three-way: SMS, catalog, quiz | Strong visual brand; clear sections | Three competing hero CTAs; abstract headline | SMS not operational | Visitor doesn't know what to click first | Single primary CTA: "View this week's menu" | P0 |
| `/weekly-menu` | Current-menu + preorder intent | Existing/ready buyers | "Preorder this week" / SMS capture | Clear weekly framing | Same hero CTA split; SMS promise | SMS not operational | CTA overload | Lead with preorder; move SMS to footer waitlist | P1 |
| `/catalog` | Full product browse | Browsers/comparers | Search + filters + cards | Many products visible | Health-benefit filters; broken Square sync | Catalog may show $0 items | Trust erosion when prices mismatch | Fix catalog; replace health filters with flavor/format | P1 |
| `/product/[slug]` | Convert to cart/preorder | Product-aware buyer | QuickAdd / "Reserve" / Add to cart | Detailed info tabs | Relies on Square variations with $0 fallback | No real review data | Cart price may differ from displayed price | Map curated prices to checkout; remove wellness tags | P0 |
| `/preorder` | Market-specific reservation | Ready buyers | Market select → add items → checkout | Clean step flow | Pulls from broken Square catalog | $0 unnamed products | Cannot complete accurate order | Use curated products as preorder source | P0 |
| `/markets` | Market info + pickup intent | Local shoppers | "Reserve pickup" | Specific market details | Likely duplicates weekly-menu content | Hours unverified | User may not realize preorder is required | Consolidate with weekly menu or clarify flow | P2 |
| `/subscriptions/gratitude-box` | Waitlist + one-time pilot | Recurring-intent buyers | "Reserve my paid pilot box" | Honest waitlist framing | Title says "subscription" while body says "pilot" | No recurring billing | Expectation mismatch | Rename to "Gratitude Box pilot / waitlist" | P1 |
| `/quiz` | Recommend a product | Wellness-curious | "Show my recommendations" | Interactive | Maps health goals to products | Implied disease claims | Recommendations feel medically oriented | Reframe to flavor/format/pickup preferences | P1 |
| `/about` | Founder trust | Story-driven visitors | "See Where We'll Be" / "Shop This Week's Menu" | Authentic voice | Implies product caused recovery | Wildcrafted claim unsubstantiated | Health-claim risk | Rewrite recovery framing; qualify sourcing | P1 |
| `/faq` | Objection resolution | All | Contact / market visit | Comprehensive categories | Rewards/Spin & Win/workshops advertised as live | Inactive features | Misrepresentation | Remove inactive sections or relabel waitlist | P1 |
| `/contact` | Inquiry capture | Support/wholesale | Submit form | — | — | — | — | Verify delivery | P2 |
| `/cart` | Review order | Buyers | Proceed to checkout | — | — | Catalog sync risk | Price accuracy | Fix Square catalog | P0 |
| `/checkout` | Pay via Square | Buyers | Complete payment | Secure Square messaging | — | $0 line items | Checkout total incorrect | Pass curated prices as base prices | P0 |
| `/login` / `/register` | Account | Returning customers | Login / register | — | — | — | — | Keep minimal | P3 |
| `/profile/*` | Account management | Returning customers | — | — | Rewards/challenge pages likely inactive | — | — | Hide or redirect inactive tabs | P2 |

---

## 5. Homepage Strategic Audit

### 5.1 Current section sequence

1. **Hero** — abstract headline, 3 CTAs, SMS capture card, stat cards.
2. **Weekly menu** — category filter, 9 product cards, "Open Full Shop" CTA.
3. **How ordering works** — 4 steps: join weekly menu → reserve → pick up → reorder.
4. **Best sellers** — 4 product cards + sticky quiz CTA.
5. **Founder story** — Jenneisha's kitchen-to-market story + CTA.
6. **Markets** — Serenbe + Dunwoody cards + reserve/details CTAs.
7. **Bundle system** — 3 bundle cards with placeholder savings.
8. **Community proof** — 3 generic quotes + wholesale CTA + retention prompts.
9. **Email retention** — final newsletter CTA.

### 5.2 Recommended section sequence

1. **Hero** — product-forward headline, single primary CTA, availability signal, trust proof.
2. **This week's menu** — 3–6 featured products, one-click preorder per market.
3. **Pickup info** — market cards + map/hours, clear "reserve for pickup."
4. **How it works** — 3 steps only: menu drops → reserve → pickup.
5. **Founder proof** — short founder block linking to full story.
6. **Trust / reviews** — real reviews when available; placeholder removed.
7. **Waitlist** — single email capture with honest scope.
8. **Footer** — policies, markets, contact.

### 5.3 Section decisions

| Section | Decision | Rationale |
|---|---|---|
| Hero SMS card | Remove from hero; keep as footer waitlist | SMS not operational |
| Hero quiz CTA | Demote to secondary nav or later section | Health-goal mapping is risky and not first-screen essential |
| Stat cards | Keep but simplify | Good proof signals |
| Best sellers | Keep, but labels need evidence | Currently hardcoded from `data/products.ts`; verify with real sales or remove "best seller" language |
| Bundle section | Hide or relabel | Placeholder savings |
| Community proof quotes | Remove or replace with real reviews | Generic quotes reduce trust |
| Retention prompts grid | Simplify to single email waitlist | Too many choices; SMS not operational |

---

## 6. Hero Inventory

| Route | Current headline | Current support | Current CTAs | Current image | Main weakness | Recommended structure | Priority |
|---|---|---|---|---|---|---|---|
| `/` | "Your weekly farmers market wellness routine starts here." | "Fresh weekly menu of sea moss gels, lemonades, refreshers, and shots..." | 1. Get Menu Texts 2. Shop This Week 3. Take the Wellness Quiz | `/images/gratog-bg.PNG` (reused generic product shot) | Abstract headline; three equal CTAs; first CTA is non-functional SMS | Headline: "Fresh sea moss gels, drinks, and shots for Atlanta farmers market pickup." Support: "This week's small-batch menu drops before Saturday at Serenbe and Sunday at Dunwoody." Primary CTA: "View this week's menu." Secondary: "Find us at the market." | P0 |
| `/weekly-menu` | "Get the weekly menu before market day." | `{weeklyMenu.preorderLanguage}` | 1. Preorder this week 2. Browse full catalog | SMS capture card | Two CTAs + SMS capture; hero split | Headline: "This week's fresh batch." Primary CTA: "Preorder for pickup." Secondary: "Send me the menu email." | P1 |
| `/catalog` | (unknown, likely generic) | — | — | — | — | Needs product-type descriptor and clear filter UX | P2 |
| `/about` | "Our Story" | "From my kitchen to the farmers market — made with gratitude, every single jar" | 1. See Where We'll Be 2. Shop This Week's Menu | Unsplash stock image | Stock image; hero not product-specific | Replace with founder/market photo; headline: "Hi, I'm Jenneisha" | P2 |
| `/subscriptions/gratitude-box` | "The Gratitude Box: a reserved weekly batch." | "A curated box... Pause, skip, or cancel anytime." | "Reserve my paid pilot box" | — | "Subscription" in title conflicts with pilot/waitlist body | Headline: "Gratitude Box pilot — reserve a weekly batch." Support: "One box at a time while we build recurring billing." | P1 |
| `/quiz` | "Find your Taste of Gratitude starting point." | "Answer four quick questions..." | "Show my recommendations" | — | Health-goal framing | Headline: "Find a flavor and format you'll like." Support: "Answer 4 questions about taste, texture, and pickup." | P1 |

---

## 7. CTA Inventory

| Route | CTA text | Destination | Intended action | Actual result | Issue | Recommended CTA | Priority |
|---|---|---|---|---|---|---|---|
| `/` (hero) | Get Menu Texts | `/weekly-menu?utm_source=homepage_hero` | SMS sign-up | Scrolls to weekly-menu anchor + SMS capture | Promises texts that don't send | "View this week's menu" or "Join the waitlist" | P0 |
| `/` (hero) | Shop This Week | `/catalog` | Browse catalog | Catalog page | Vague; catalog includes non-weekly items | "View this week's menu" | P0 |
| `/` (hero) | Take the Wellness Quiz | `/quiz` | Quiz | Quiz page | Health-goal mapping | "Find a flavor" (or demote) | P1 |
| `/` (hero text link) | Reserve your market pickup → | `/preorder` | Preorder | Preorder page | Hidden below 3 buttons | Make primary when user is returning customer | P2 |
| Header desktop | Start Here | `/quiz` | Quiz | Quiz page | Health-goal mapping | "Shop this week" or "Find us" | P1 |
| Header mobile | Wellness Quiz | `/quiz` | Quiz | Quiz page | Prominent placement for risky feature | Demote | P2 |
| Weekly menu | Preorder this week | `/preorder` | Preorder | Preorder page | Good | Keep; make more prominent | P2 |
| Weekly menu | Open Full Shop | `/catalog` | Catalog | Catalog page | Duplicates discovery | Remove or relabel "Browse all products" | P2 |
| Product card | QuickAddButton | Cart | Add to cart | Cart | Good | Keep | — |
| Bundle card | `{bundle.cta}` (e.g., Shop Now) | `/catalog?search=...` | Bundle purchase | Catalog search | No real bundle SKU | "Build this box" if real SKU; otherwise remove savings | P1 |
| Market card | Reserve pickup | `/preorder?market=...` | Preorder | Preorder page | Good | Keep | — |
| Market card | Market details | `/markets#id` | Info | Market page | Duplicates info | Remove if weekly menu already shows hours | P3 |
| Founder section | Read the story | `/about` | About | About page | Good | Keep | — |
| Retention prompts | Notify me | Lead API | Waitlist | Waitlist | Multiple intents; SMS not operational | Simplify to single email waitlist | P2 |
| Footer final | Join weekly emails | Lead API | Email signup | Email signup | Honest | Keep | — |

### 7.1 CTA hierarchy system

Recommended consistent system:

- **Primary action:** `h-12–14 rounded-full bg-emerald-700 text-white` — "View this week's menu", "Preorder for pickup", "Add to order".
- **Secondary action:** `h-12 rounded-full border-emerald-200 text-emerald-800 hover:bg-emerald-50` — "Browse all products", "Learn about the brand".
- **Tertiary:** text link with underline — "See market details", "Read full story".
- **Waitlist:** `h-11 rounded-full bg-stone-900 text-white` — "Join the email waitlist".
- **Disabled/sold-out:** muted button with explanation.

---

## 8. Image Inventory

| Route | Image | Source | Purpose | Authenticity | Mobile quality | Accessibility | Recommendation |
|---|---|---|---|---|---|---|---|
| `/` hero | `/images/gratog-bg.PNG` | Local | Product/market hero | Generic/repeated | Likely OK but undifferentiated | Alt: "Taste of Gratitude market products" | Replace with real current product or founder photo |
| `/` founder section | `/images/gratog-bg.PNG` | Local | Founder story | Same generic image | OK | Alt: "Small batch Taste of Gratitude products" | Replace with founder photo |
| `/about` hero | Unsplash holistic wellness | Remote/stock | Emotional backdrop | Stock, not brand-specific | Crops to text overlay | Alt acceptable | Replace with founder kitchen/market photo |
| Product cards | External editmysite.com URLs + `/images/*` | Mixed | Product thumbnails | Unknown/variable | Depends on source | Alt: "{name} from Taste of Gratitude" | Audit every image for packaging accuracy |
| Product detail | `PRODUCT_IMAGE_FALLBACK_SRC` | Local | Primary product image | Fallback | OK | Uses product name | Replace with real SKU photography |
| Markets | None/emoji | — | Market cards | Emoji-only | OK | — | Add real market/booth photo |
| Bundles | None | — | Bundle cards | No imagery | — | — | Add box contents photo when real |
| Gratitude Box | None | — | Landing page | No imagery | — | — | Add box photo or illustration |

### 8.1 Critical image rules violations observed

1. `/images/gratog-bg.PNG` used twice on homepage for different contexts.
2. About page uses generic Unsplash "holistic wellness" imagery.
3. No visible founder photo on homepage or about hero.
4. Product images sourced from editmysite.com (Weebly legacy?) — may not match current packaging.
5. No market/booth photography to prove real-world presence.

---

## 9. Product Merchandising Findings

### 9.1 Product-card content

Current card (from `ProductMarketCard`):
- Category label (e.g., "LEMONADE")
- Product name (e.g., "Kissed by Gods")
- Price (e.g., "$12.00")
- Short description
- Wellness-support tag (e.g., "Daily Defense")
- First 3 ingredients
- QuickAdd button

**Issue:** The wellness tag (`wellnessSupport[0]`) is the most visually distinct element after price and competes with the product name for meaning. "Kissed by Gods" + "Daily Defense" tells the shopper almost nothing about flavor.

### 9.2 Recommended card content

- Category label: "Sea moss lemonade" instead of "LEMONADE"
- Product name: keep but add flavor descriptor if name is abstract
- Price + size: "$12.00 · 16 oz"
- Short description: flavor/tasting notes, not routine language
- Ingredient preview: 2–3 key ingredients
- Availability badge: "Available this week" / "Sold out" / "Preorder"
- CTA: "Reserve for pickup" or "Add to order"

### 9.3 Category clarity

The site sells:
- Sea moss gels (8 oz jar, $25)
- Lemonades / drinks (16 oz, $10–$12)
- Refreshers (16 oz, $12)
- Shots (2 oz, $7)
- Bundles (placeholder)

Recommended naming pattern:
"Kissed by Gods — Strawberry Lemonade Sea Moss Drink, 16 oz"
"Grateful Greens Gel — Spirulina Sea Moss Gel, 8 oz"

This removes ambiguity without destroying brand names.

### 9.4 Price/value communication

- Prices are clearly displayed.
- Bundle savings are advertised but not enforced at checkout.
- No visible jar-return discount or bulk pricing on product cards.
- Shipping/delivery fees are hidden until checkout.

---

## 10. Funnel Maps

### 10.1 Funnel A — Weekly-menu purchase (current)

Homepage → Weekly Menu → product card → product page → cart → checkout → Square payment link → confirmation

Issues:
- Homepage splits attention with SMS + quiz.
- Weekly menu pulls curated data (good) but CTA splits with catalog.
- Product page may fall back to Square $0 data.
- Cart/checkout depend on broken Square catalog.

### 10.2 Funnel A — Recommended

Homepage → This Week's Menu (featured products) → reserve/preorder CTA → market selection → cart summary → Square payment link (with curated prices) → waitlist number / confirmation

### 10.3 Funnel B — Product discovery (current)

Search/social → Catalog → filter by health benefit → product card → product page → cart → checkout

Issues:
- Health-benefit filters imply medical utility.
- Catalog API may return $0 items.

### 10.4 Funnel B — Recommended

Search/social → Catalog → filter by flavor/format/category → product page with tasting notes → cart → checkout

### 10.5 Funnel C — Market-specific preorder (current)

Market card → `/preorder?market=...` → market selection (redundant) → Square catalog products → add items → checkout → Square payment

Issues:
- Market preselected in URL but user must select again.
- Square catalog products are unnamed/$0.

### 10.6 Funnel C — Recommended

Market card → `/preorder?market=...` → skip market selection if URL present → show curated weekly menu by category → add items → checkout → Square payment with curated prices

### 10.7 Funnel D — Lead capture (current)

Homepage/footer/weekly-menu → RetentionForm → email/phone + intent → `/api/lead` → confirmation

Issues:
- Phone capture promises SMS that isn't operational.
- Multiple intents create confusion.

### 10.8 Funnel D — Recommended

Single email waitlist with honest copy: "Join the weekly menu email. SMS reminders coming soon."

---

## 11. Trust-Gap Inventory

| Missing trust signal | Best location | Evidence required | Owner action | Conversion impact | Effort |
|---|---|---|---|---|---|
| Real founder photo | Hero / About | Photo of Jenneisha at market | Owner to provide | High | Small |
| Real product photography | Product cards + detail | SKU-level photos with labels | Owner/photographer | High | Large |
| Verified customer reviews | Product pages + homepage | Real reviews from Square/MongoDB | Owner to collect/import | High | Medium |
| Market booth proof | Markets page + about | Photo of booth at Serenbe/Dunwoody | Owner to provide | Medium | Small |
| Sourcing documentation | About page | Supplier/wildcrafting verification | Owner to provide | Medium | Small |
| Real-time menu freshness | Weekly menu header | Admin publish workflow or date computation | Engineering | Medium | Medium |
| Accurate checkout pricing | Cart/checkout | Square catalog cleanup or curated price pass-through | Owner/engineering | Critical | Large |
| Delivery/shipping verification | FAQ + checkout | Operational zones + carrier contract | Owner to confirm | Medium | Small |
| Social media proof | Footer | Active Instagram feed | Owner to connect | Low | Small |

---

## 12. Mobile Findings (source-code inferred)

| Route / component | Width | Issue | Impact | Recommended fix |
|---|---|---|---|---|
| Header | 360–390 | Logo text hidden (`hidden sm:inline`), leaving only icon; nav collapses to hamburger | Brand recognition weak | Show abbreviated logo on mobile or keep wordmark |
| Hero | 360–390 | Three CTA buttons stack vertically; each `h-14` consumes most of the screen | CTA overload; scroll to see product | Single primary CTA; secondary as text link |
| SMS card | 360–390 | Hero section splits into text-left + card-right; on mobile stacks with SMS form first | SMS capture appears before product proof | Move SMS capture below weekly menu |
| Weekly-menu category filter | 360–390 | Horizontal scroll of category pills; `overflow-x-auto` hides some options | Choice discovery | Make category filter sticky and swipeable with snap |
| Product card | 360–390 | 1-column cards; image 4:3; price + QuickAdd visible | Good | Add size to price line |
| Preorder item step | 360–390 | Horizontal category scroll with custom buttons; floating cart at bottom | Good | Ensure sticky cart does not cover product cards |
| Preorder checkout | 360–390 | Fixed bottom footer with Back/Place Preorder buttons | Good | Ensure disabled state copy explains minimum |
| Footer | 360–390 | 1-column newsletter + 4-column link grid stacks to 1 column | Long footer | Prioritize 2–3 link groups |
| About hero | 360–390 | 400px hero with centered text over Unsplash image | Stock feel | Replace with founder photo, shorter hero |

---

## 13. Accessibility Findings

| Severity | Route / component | Element | Issue | Fix |
|---|---|---|---|---|
| Critical | Header | Mobile menu button | `aria-controls="mobile-menu"` exists but no `aria-expanded` on desktop state | Add `aria-expanded` toggle |
| Critical | Footer | FDA disclaimer | Fine print; OK | Keep |
| Serious | FAQ | Accordion buttons | Use `div` with `animate-slide-up` but button is focusable; no heading structure inside | Wrap question in `<h3>`; ensure focus moves |
| Moderate | Footer | Newsletter inline | Label association for inline input may be missing | Verify `<label>` |
| Moderate | Product cards | Wellness tags | Color-only meaning (emerald badge) | Ensure text conveys meaning |
| Moderate | RetentionForm | SMS checkbox | `smsOptIn` prechecked in quiz | Do not precheck marketing consent |
| Minor | About | Hero text | White text over image relies on `brightness-50` overlay | Verify contrast at 4.5:1 |
| Minor | Multiple | Custom tailwind bracket syntax | `from-[emerald-600]`, `text--emerald-500` (double dash in FAQ) | Fix to standard tailwind classes |

Note: `text--emerald-500` in `app/faq/page.js` is a malformed class that likely renders as default text color, breaking intended visual hierarchy.

---

## 14. Revenue and Retention Opportunities

| Opportunity | Customer benefit | Business benefit | Evidence | Dependency | Risk | Impact | Effort |
|---|---|---|---|---|---|---|---|
| Fix checkout pricing accuracy | Trust, completes purchase | Revenue | Square catalog $0 | Owner/Engineering | Low if curated prices used | Critical | Medium |
| Single primary hero CTA | Faster decision | More menu views | Current 3 CTAs | Content | Low | High | Small |
| Flavor/format-based quiz | Better recommendation | Higher fit | Current health quiz | Content | Low | Medium | Small |
| Market-specific landing | Faster preorder | Higher conversion | `/preorder?market=` exists | Engineering | Low | High | Small |
| Real product photography | Trust, appetite appeal | Higher add-to-cart | Images missing | Owner/photographer | Low | High | Large |
| Verified reviews | Social proof | Higher conversion | Reviews collection | Owner | Low | High | Medium |
| Honest waitlist (email only) | Clear expectations | Qualified leads | SMS not live | Content | Low | Medium | Small |
| Jar-return / loyalty program | Repeat purchase | LTV | Not built | Engineering/Owner | Medium | High | Large |
| Bundle SKUs in Square | Clear savings | AOV | Placeholder bundles | Square setup | Medium | High | Large |
| Subscription recurring billing | Convenience | Predictable revenue | One-time only | Square subscriptions | Medium | High | Large |

---

## 15. Quick Wins (safe, reversible, no owner info required)

1. **Hero CTA reduction** — make "View this week's menu" primary; move SMS/quiz to secondary or later sections.
2. **Hero headline** — replace abstract "wellness routine" with product-forward copy.
3. **Remove wellness-support tag from product cards** or replace with flavor/format tag.
4. **Rename "Grateful Defense" → "Ginger Turmeric Shot" and "Healing Harmony Gel" → "Turmeric Spice Sea Moss Gel"** (requires checking references).
5. **Remove placeholder bundle savings text** from `data/bundles.ts`.
6. **Rewrite FAQ rewards/community section** to waitlist framing or hide entirely.
7. **Remove Spin & Win, Gratitude Passport, workshops, challenges** from FAQ until live.
8. **Fix malformed FAQ classes** `text--emerald-500` and `bg--emerald-500/10`.
9. **Uncheck `smsOptIn` default** in quiz.
10. **Add size to product-card price line** (e.g., "$12.00 · 16 oz").
11. **Replace `/images/gratog-bg.PNG` reuse** on homepage founder section with a neutral gradient or remove image until real photo available.
12. **Remove generic placeholder quotes** from community proof section.
13. **Simplify retention prompts grid** to a single email waitlist.
14. **Remove "Weekly subscription" language** from Gratitude Box metadata/title until recurring billing exists.
15. **Add a real-time date range** to weekly menu hero if not already prominent.

---

## 16. Owner Decisions Required

| ID | Topic | Current evidence | Recommended default | Conversion impact | Brand impact |
|---|---|---|---|---|---|
| CP-1 | Homepage primary offer | 3 competing CTAs | Product-led: "View this week's menu" | High | Medium |
| CP-2 | Product renaming | "Grateful Defense" / "Healing Harmony Gel" | Flavor-forward names | High | High |
| CP-3 | Quiz framing | Health goals → products | Flavor/format/pickup → products | Medium | High |
| CP-4 | Bundle strategy | Placeholder savings | Hide savings until SKUs exist | High | High |
| CP-5 | Gratitude Box positioning | "subscription" / pilot mismatch | Rename to pilot/waitlist | Medium | Medium |
| CP-6 | Founder story health framing | Implies product caused recovery | Reframe as routine-based | Medium | High |
| CP-7 | Real photography | Stock/external images | Schedule founder/product/market shoot | High | High |
| CP-8 | Social proof | Generic quotes | Collect real reviews or remove | Medium | Medium |
| CP-9 | SMS activation | Twilio not configured | Keep as email-only waitlist until SMS live | Medium | Medium |
| CP-10 | Rewards/workshops FAQ | Advertised as live | Hide or relabel waitlist | High | High |
| CP-11 | Delivery/shipping scope | Advertised but unverified | Restrict to verified zones or waitlist | Medium | High |

---

## 17. Experiment Backlog

Do not run these until baseline metrics are stable and traffic is sufficient.

| Hypothesis | Target page | Variation | Primary metric | Guardrail |
|---|---|---|---|---|
| Product-led hero outperforms routine-led hero | `/` | Headline emphasizing "fresh sea moss drinks + gels" vs. current | Homepage → weekly-menu CTR | Bounce rate |
| Single CTA vs. three CTAs | `/` | One "View menu" vs. current 3 | Weekly-menu visits | Time on page |
| Flavor quiz vs. wellness quiz | `/quiz` | Flavor/format questions vs. health goals | Quiz completion → product view | Abandonment |
| Real founder photo vs. stock hero | `/about`, `/` | Founder market photo vs. Unsplash | About → menu CTR | Bounce rate |
| Bundle card with real photo vs. placeholder | `/`, bundles | Real box contents vs. text-only | Bundle click-through | — |

---

## 18. Implementation Backlog

| ID | Recommendation | Priority | Impact | Confidence | Effort | Dependency | Files / components | Measurement |
|---|---|---|---|---|---|---|---|---|
| 1 | Fix Square catalog price/name reconciliation | P0 | Critical | High | Medium | Owner decision D1/D2 | `lib/square-api.ts`, checkout | `/api/catalog` returns real prices |
| 2 | Homepage hero: single primary CTA + product headline | P0 | High | High | Small | CP-1 | `components/home/HomePageClient.jsx` | Hero CTA click rate |
| 3 | Rename high-risk products | P0 | High | High | Small | CP-2 | `data/products.ts` | Product page views, health-claim audit |
| 4 | Remove/replace wellness tags on product cards | P1 | High | High | Small | CP-2/CP-3 | `components/home/HomePageClient.jsx`, `components/EnhancedProductCard.jsx` | Card CTR |
| 5 | Rewrite quiz to flavor/format/pickup | P1 | Medium | High | Small | CP-3 | `data/quiz.ts`, `app/quiz/QuizClient.jsx` | Quiz completion, product view |
| 6 | Remove placeholder bundle savings | P1 | High | High | Small | CP-4 | `data/bundles.ts` | Bundle click-through, no false-savings complaints |
| 7 | Rewrite FAQ rewards/workshops/challenges | P1 | High | High | Small | CP-10 | `app/faq/page.js` | Reduced confusion, support load |
| 8 | Gratitude Box: rename to pilot/waitlist | P1 | Medium | High | Small | CP-5 | `app/subscriptions/gratitude-box/page.tsx`, `components/subscriptions/GratitudeBoxPage.tsx` | Form submissions |
| 9 | Founder story: remove therapeutic implication | P1 | Medium | High | Small | CP-6 | `app/about/page.js` | About → menu CTR |
| 10 | Replace placeholder community quotes | P1 | Medium | High | Small | CP-8 | `components/home/HomePageClient.jsx` | — |
| 11 | Fix malformed FAQ classes | P2 | Low | High | Small | — | `app/faq/page.js` | Visual regression pass |
| 12 | Uncheck SMS opt-in default in quiz | P2 | Low | High | Small | — | `app/quiz/QuizClient.jsx` | Consent compliance |
| 13 | Add size to product-card price | P2 | Medium | High | Small | — | `components/EnhancedProductCard.jsx`, `components/home/HomePageClient.jsx` | Product page CTR |
| 14 | Simplify retention prompts to email waitlist | P2 | Medium | High | Small | CP-9 | `components/home/HomePageClient.jsx` | Lead quality |
| 15 | Replace repeated hero image in founder section | P2 | Medium | High | Small | CP-7 | `components/home/HomePageClient.jsx` | Visual trust |
| 16 | Product photography shoot list | P2 | High | Medium | Large | CP-7 | `docs/audits/taste-of-gratitude-photography-shot-list.md` | Image inventory completion |
| 17 | Market-specific landing optimization | P2 | High | Medium | Medium | — | `app/preorder/PreorderClientPage.tsx` | Preorder completion |
| 18 | Real review collection/import | P3 | High | Medium | Large | Owner | `lib/reviews/`, homepage | Review count |
| 19 | Loyalty/rewards implementation | P3 | High | Low | Large | Owner | `app/gratitude/`, FAQ | Repeat purchase rate |

---

## 19. Verification Plan (post-implementation)

1. Re-run `/api/catalog` and `/api/storefront/square-catalog` and confirm real names/prices.
2. Visit homepage on desktop and mobile (use real device/browser) and confirm single dominant CTA.
3. Confirm product cards show flavor/format info, not wellness tags.
4. Confirm quiz asks flavor/format questions only.
5. Confirm FAQ no longer advertises inactive rewards/workshops/challenges.
6. Confirm Gratitude Box page title/body use consistent pilot/waitlist language.
7. Confirm founder story does not imply product-caused recovery.
8. Run `next lint` and `tsc --noEmit --skipLibCheck`.
9. Run Playwright or manual click-through of homepage → weekly menu → product → cart → checkout.
10. Record before/after screenshots when a working browser is available.

---

## 20. Final Integrated Summary

The Taste of Gratitude website has the bones of a strong founder-led wellness commerce experience, but it is currently optimized for breadth rather than conversion clarity. The highest-leverage fixes are not visual polish — they are (1) making the commerce layer truthful and functional, (2) simplifying the homepage to a single product-forward CTA, and (3) removing customer-facing roadmap language from bundles, subscriptions, SMS, rewards, and workshops. Once those are resolved, conversion optimization can proceed with real photography, verified reviews, flavor-led product discovery, and market-specific landing pages.
