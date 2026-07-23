# Taste of Gratitude — Health-Claim and Public-Copy Risk Audit

Generated: 2026-07-22

---

## 1. Scope and Method

This audit extracts health-related statements, internal roadmap language, and unsupported marketing claims from:

- `data/products.ts`
- `data/quiz.ts`
- `data/bundles.ts`
- `lib/health-benefits.js`
- `components/home/HomePageClient.jsx`
- `components/catalog/CatalogPageClient.jsx`
- `components/EnhancedProductCard.jsx`
- `app/about/page.js`
- `app/faq/page.js`
- `app/subscriptions/gratitude-box/*`
- Email templates (`lib/email/templates.js`)
- SMS code (`lib/sms.ts`, `lib/sms-mock.js`)

Each claim is classified using FDA/FTC guidance categories. This is a technical/content audit, not legal advice; items flagged for legal review are noted.

---

## 2. High-Risk Health Claims

### 2.1 Product names and benefit stories

| Claim / wording | Source | Public surface | Claim type | Risk | Proposed action |
|---|---|---|---|---|---|
| "Grateful Defense" (product name) | `data/products.ts` | homepage, catalog, weekly menu, product page | Implied disease/immune claim | **High** | Rename to flavor-forward name (e.g., "Ginger Turmeric Shot") |
| "Healing Harmony Gel" (product name) | `data/products.ts` | homepage, catalog | Implied therapeutic claim | **High** | Rename to "Turmeric Spice Sea Moss Gel" or similar |
| "Kissed by Gods" (product name) | `data/products.ts` | homepage, weekly menu | Spiritual/superiority implication | Medium | Consider more descriptive name such as "Strawberry Lemonade Sea Moss" |
| "wellness boost" / "Daily Defense" / "Mineral Balance" | `lib/health-benefits.js` filters | catalog filters, product cards | General wellness / implied immune/thyroid | Medium-High | Remove or soften filters to taste/format based |
| "thyroid", "immunity", "anti-inflammatory", "heart health", "cleanse", "stress relief" benefit IDs | `lib/health-benefits.js` | health-benefit filter chips, info board | Structure/function or implied disease | Medium-High | Replace with flavor/format/usage descriptors; remove disease-adjacent terms |
| "92 essential minerals" / "mineral rich" keywords | `lib/health-benefits.js` | filter keywords, potential product copy | Unsupported nutrient-content claim | High | Remove; do not quantify minerals unless substantiated |
| Sea moss described as "mineral-rich seaweed that customers often use as part of a daily wellness routine" | `app/faq/page.js` | FAQ | General wellness (acceptable) | Low | Keep, but ensure it stays ingredient-focused |
| FAQ answer: "If you have a thyroid condition, are pregnant or nursing, or take thyroid medication, talk to your healthcare provider before adding sea moss to your routine." | `app/faq/page.js` | FAQ | Safety guidance | Low | Keep; appropriate caution |

### 2.2 Quiz recommendation language

| Claim / wording | Source | Public surface | Claim type | Risk | Proposed action |
|---|---|---|---|---|---|
| "What are you looking for support with?" with options: digestion, energy, immunity, skin/glow, stress, hydration, weight support, daily minerals | `data/quiz.ts` | `/quiz` page | Implies product supports these health goals | Medium-High | Reframe quiz around flavor preference, format, pickup cadence, ingredient avoidances |
| "Because you want daily support, start with a product that can become a simple repeat routine." | `data/quiz.ts` | quiz result | General wellness | Low | Keep only if "support" refers to flavor/format routine, not health outcome |
| Quiz maps goals to bundles: digestion → starter-box, immunity → mineral-reset, etc. | `data/quiz.ts` | quiz result | Implied disease/structure-function | Medium | Remove goal-to-bundle mapping; recommend by flavor/format instead |

### 2.3 Bundle and subscription copy

| Claim / wording | Source | Public surface | Claim type | Risk | Proposed action |
|---|---|---|---|---|---|
| "subscription updates" / "subscription waitlist" / "weekly wellness boxes can recur automatically" | `components/home/HomePageClient.jsx`, retention forms | homepage, retention blocks | Feature promise (not live) | Medium | Convert to truthful waitlist or remove until recurring billing is implemented |
| "Bundle pricing ready for Square setup; founder can activate savings when bundle SKUs are created." | `data/bundles.ts` | bundle detail | Internal roadmap visible to customers | High | Remove bundle savings display until real SKUs exist |
| "Perfect subscription precursor" | `data/bundles.ts` | bundle detail | Internal roadmap | High | Remove |

### 2.4 Founder story / About page

| Claim / wording | Source | Public surface | Claim type | Risk | Proposed action |
|---|---|---|---|---|---|
| "I was exhausted, run down, and honestly just looking for something — anything — that would help me feel like myself again. That's when I started making sea moss gel... I started feeling better. More present. More grateful..." | `app/about/page.js` | /about | Personal testimonial implying health improvement from product | Medium-High | Keep founder story authentic but avoid implying sea moss caused recovery. Reframe as "I enjoyed the routine of making it" rather than "I started feeling better." |
| "Our sea moss is wildcrafted from clean ocean waters — never pool-grown, never artificial." | `app/about/page.js` | /about | Sourcing claim | Medium | Verify sourcing; add qualification if not independently certified |
| "Wildcrafted Sourcing" value card | `app/about/page.js` | /about | Sourcing claim | Medium | Same as above |

### 2.5 FAQ

| Claim / wording | Source | Public surface | Claim type | Risk | Proposed action |
|---|---|---|---|---|---|
| "Sea moss (Irish moss) is a mineral-rich seaweed..." | `app/faq/page.js` | FAQ | General descriptor | Low | Keep if reworded to "contains a range of minerals" rather than specific counts |
| "How should I consume sea moss gel?" answer: "1-2 tablespoons..." | `app/faq/page.js` | FAQ | Serving suggestion | Low | Keep; label should remain primary authority |
| "Are your products organic and all-natural?" answer uses "all-natural" and "real fruits, herbs, roots" | `app/faq/page.js` | FAQ | "All-natural" is undefined marketing term | Medium | Remove "all-natural"; state actual practices (small-batch, fresh, visible ingredients) |
| "Spin & Win wheel" / "loyalty rewards" / "Gratitude Passport" / "wellness workshops" | `app/faq/page.js` | FAQ | Advertises inactive features | High | Remove or rewrite as "coming soon / join waitlist" with truthful scope |
| "Do you offer wellness workshops or events?" answer: "Yes! We host seasonal workshops..." | `app/faq/page.js` | FAQ | Feature promise | High | Verify workshop schedule; if not actively held, rewrite as waitlist |
| "We ship via USPS Priority Mail... FREE on orders $50+" | `app/faq/page.js` | FAQ | Fulfillment promise | Medium | Verify shipping capability, cost, and perishable packaging |
| "same-day and next-day delivery to select ZIP codes... Delivery fees vary by zone ($12-$18)" | `app/faq/page.js` | FAQ | Fulfillment promise | Medium | Verify delivery zones and fees in `lib/delivery-zones.ts` |

---

## 3. Internal Roadmap / Unfinished Automation Language

| Wording | Source | Public surface | Risk | Proposed action |
|---|---|---|---|---|
| "Drop your number for menu drops, limited-batch reminders, and pickup updates before market day." | `components/home/HomePageClient.jsx` | SMS retention form | Implies SMS is sending; Twilio not configured | Rewrite as waitlist: "Join the phone list for when SMS menu reminders go live." |
| "Get the next menu drop, pickup reminders, and first access to limited batches." (email) | retention forms | homepage/catalog | Email is connected via Resend; OK but verify sender domain | Keep if true |
| "Subscription waitlist" | retention forms | homepage | OK if subscription is not live | Already labeled waitlist; good |
| "Join the weekly list so you hear when rewards go live." | `app/faq/page.js` | FAQ | Acknowledges rewards not live | Good; keep if accurate |
| "backend automation" / "verified reviews load" / "this section keeps social proof visible" | search results in components | various | Developer commentary | Remove all customer-facing references |
| "passive menu funnel" | `metadata` in retention forms | analytics only | Internal strategy | Remove from public metadata; keep in analytics only if needed |

---

## 4. Repeated / Generic Copy Issues

| Issue | Source | Evidence | Proposed action |
|---|---|---|---|
| "weekly routine" repeated across homepage, FAQ, bundles, retention | multiple | grep results | Use varied language; avoid template repetition |
| "wellness" overused | multiple | homepage hero, cards, FAQ | Substitute with specific product attributes (flavor, format, freshness, market pickup) |
| "nourish your best self" / "holistic wellness" / "wellness journey" | search hits | components, templates | Remove or replace with founder-specific, concrete language |
| "superfood" / "revolutionary" / "transformational" / "miracle" / "cure" | not found in current scan | — | Continue to avoid |

---

## 5. Compliance Classification Summary

| Category | Count | Severity |
|---|---|---|
| Implied disease/therapeutic claims (product names, benefit taxonomy) | 8 | High |
| Unsupported nutrient/"92 minerals" claims | 1 | High |
| Inactive feature advertised as live (Spin & Win, workshops, rewards) | 6 | High |
| Customer-facing roadmap/placeholder language | 5 | High |
| Personal health-improvement testimonial | 1 | Medium-High |
| General wellness language (acceptable with care) | 4 | Low |
| Sourcing claims needing verification | 2 | Medium |
| Fulfillment promises needing verification | 3 | Medium |

---

## 6. Proposed Copy Principles (aligned with owner direction)

1. **Names describe flavor + format**, not physiological effect.
2. **Benefit stories describe taste, texture, freshness, and how to use**, not disease support.
3. **Quiz recommends by flavor preference, format, ingredients to avoid, and pickup cadence** — never by health goal.
4. **FAQ only describes live capabilities.** Anything in progress is either hidden or framed as an intentional waitlist with honest scope.
5. **Founder story stays personal but does not imply product cured illness.**
6. **No unsupported numbers** ("92 minerals", specific vitamin counts) unless substantiated.

---

## 7. P0 / P1 / P2 Copy Actions

| Priority | Action | Files affected |
|---|---|---|
| P0 | Rename "Grateful Defense" and "Healing Harmony Gel" | `data/products.ts`, components referencing names |
| P0 | Remove or hide Spin & Win, Gratitude Passport, workshops, rewards from FAQ until live | `app/faq/page.js` |
| P0 | Remove "92 essential minerals" / "mineral rich" quantification | `lib/health-benefits.js`, product data |
| P1 | Replace health-benefit filter chips with flavor/format filters | `lib/health-benefits.js`, `components/catalog/CatalogPageClient.jsx` |
| P1 | Rewrite quiz to avoid health-goal mapping | `data/quiz.ts`, `app/quiz/*` |
| P1 | Rewrite founder story to avoid implication of disease recovery | `app/about/page.js` |
| P1 | Make bundle savings truthful (remove until SKUs exist) | `data/bundles.ts`, bundle detail pages |
| P2 | Remove "all-natural" and undefined terms from FAQ | `app/faq/page.js` |
| P2 | Reduce repetition of "weekly routine" / "wellness journey" | homepage, FAQ, retention forms |
| P2 | Verify and qualify sourcing claims | `app/about/page.js` |
| P2 | Verify and qualify shipping/delivery claims | `app/faq/page.js`, `lib/delivery-zones.ts` |

## 8. Email-template claims classification (2026-07-23)

Active surfaces (routed to customers):

| Claim / wording | Source | Public surface | Claim type | Risk | Disposition |
|---|---|---|---|---|---|
| "wellness community" / "wellness journey" / "wellness tips" | `lib/resend-email.js` | welcome, newsletter confirmation, review confirmation, rewards | General wellness / lifestyle framing | Low-Medium | **Fixed** — replaced with "community", "weekly routine", "recipe tips" |
| "Premium Wildcrafted Sea Moss" | `lib/resend-email.js` | email footer | Unsupported sourcing claim | Medium | **Fixed** — replaced with "Premium Sea Moss" |
| "Nourish Your Wellness Journey" | `lib/resend-email.js` | newsletter confirmation header | General wellness / vague benefit | Low | **Fixed** — replaced with "Your Weekly Menu Awaits" |
| "Your wellness boost arrives!" | `lib/resend-email.js` | order status email | Implied functional benefit | Low-Medium | **Fixed** — replaced with "Your market order is here!" |
| "this journey to better health" | `lib/resend-email.js` | welcome email | Implied health improvement | Medium | **Fixed** — replaced with "this weekly routine" |
| "2 stamps = Free 2oz wellness shot" / "VIP wellness club status" | `lib/resend-email.js` | rewards email | Wellness framing of loyalty program | Low | **Fixed** — replaced with "2oz shot" / "VIP market club status"; left "Wellness Shots" product category name untouched (owner decision #8) |
| "Wellness Streak" / "Positive wellness habit" / "wellness check-in" | `lib/email/templates.js` | challenge streak email | Wellness framing of habit feature | Low | **Fixed** — replaced with "Weekly Streak" / "Positive weekly habit" / "weekly check-in" |

Inactive / dead code (no callers found):

| Claim / wording | Source | Status | Disposition |
|---|---|---|---|
| "wellness products" / "wellness routine" / "daily wellness anchor" / "Resume your wellness routine" / "Come Back to Your Wellness Journey" | `lib/email-templates.js` | No imports in the codebase; dead code | **Inactive** — leave as-is or delete file if no revival planned |
| Goal-based quiz emails: "Boost Immunity", "Gut Health", "Natural Energy", "Radiant Glow", "Calm Focus", "Immune Support - Boost your natural defenses", "Wildcrafted and small-batch crafted", fake testimonial "I already feel more energized! My immune system feels stronger" | `lib/quiz-emails.js` | No callers; quiz now returns flavor preferences | **Inactive** — leave as-is or delete file; if reactivated, must be rewritten to flavor-based recommendations and remove fake testimonial |
| "wellness journey begins", "vibrant wellness", "transform your health", "Premium Wildcrafted Sea Moss" | `lib/nurture-sequence.js` | No imports in the codebase | **Inactive** — leave as-is or delete file |
| "Enjoy your wellness boost!" | `lib/order-status-notifier.js` | No callers found | **Inactive** — leave as-is or delete if unused |

