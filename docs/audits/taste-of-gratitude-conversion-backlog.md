# Taste of Gratitude — Conversion Backlog

Prioritized, evidence-based backlog derived from the Stage 5B conversion-psychology audit.

## Legend

- **Priority:** P0 = blocks revenue/trust; P1 = high impact; P2 = medium; P3 = optimization.
- **Impact:** Critical / High / Medium / Low.
- **Confidence:** High = source evidence is clear; Medium = needs verification; Low = experimental.
- **Effort:** Small (<1 day), Medium (1–3 days), Large (>3 days).
- **Dependency:** Owner decision, engineering, operations, or none.

## Backlog

| ID | Recommendation | Priority | Impact | Confidence | Effort | Dependency | Files / components | Measurement |
|---|---|---|---|---|---|---|---|---|
| 1 | Fix Square catalog price/name reconciliation so checkout matches displayed prices | P0 | Critical | High | Medium | Owner decisions D1/D2 (price authority, Square cleanup) | `lib/square-api.ts`, `app/api/checkout/route.ts`, `app/api/preorder/route.ts`, `lib/square-api-edge.ts` | `/api/catalog` returns real names/prices; checkout total matches card |
| 2 | Homepage hero: single primary CTA "View this week's menu" and product-specific headline | P0 | High | High | Small | CP-1 (homepage primary offer) | `components/home/HomePageClient.jsx` | Hero primary CTA click rate; weekly-menu visits from homepage |
| 3 | Rename "Grateful Defense" → flavor-forward name (e.g., "Ginger Turmeric Shot") | P0 | High | High | Small | CP-2 (product renaming) | `data/products.ts`, references in components | Health-claim audit pass; product page views |
| 4 | Rename "Healing Harmony Gel" → flavor-forward name (e.g., "Turmeric Spice Sea Moss Gel") | P0 | High | High | Small | CP-2 | `data/products.ts`, references | Health-claim audit pass |
| 5 | Remove or replace wellness-support tags on product cards with flavor/format tags | P1 | High | High | Small | CP-2/CP-3 | `components/home/HomePageClient.jsx`, `components/EnhancedProductCard.jsx`, `components/catalog/CatalogPageClient.jsx` | Card click-through rate |
| 6 | Rewrite quiz to recommend by flavor/format/pickup instead of health goals | P1 | Medium | High | Small | CP-3 (quiz framing) | `data/quiz.ts`, `app/quiz/QuizClient.jsx` | Quiz completion rate; product view after quiz |
| 7 | Remove placeholder bundle savings text and "subscription-ready" language | P1 | High | High | Small | CP-4 (bundle strategy) | `data/bundles.ts`, bundle detail pages | No false-savings support tickets; bundle CTR |
| 8 | Rewrite FAQ rewards/Spin & Win/community/workshops section as waitlist or remove | P1 | High | High | Small | CP-10 (rewards/workshops FAQ) | `app/faq/page.js` | Reduced confusion; support load |
| 9 | Gratitude Box: rename title/metadata/body to "pilot / waitlist" consistently | P1 | Medium | High | Small | CP-5 (Gratitude Box positioning) | `app/subscriptions/gratitude-box/page.tsx`, `components/subscriptions/GratitudeBoxPage.tsx` | Form submissions; clarity score |
| 10 | Founder story: reframe personal health change as routine/grounding, not product effect | P1 | Medium | High | Small | CP-6 (founder story health framing) | `app/about/page.js` | About → menu CTR |
| 11 | Remove generic placeholder quotes from homepage community proof | P1 | Medium | High | Small | CP-8 (social proof) | `components/home/HomePageClient.jsx` | Trust perception; replace with real reviews later |
| 12 | SMS capture: rewrite copy to honest waitlist until Twilio is operational | P1 | Medium | High | Small | CP-9 (SMS activation) | `components/home/HomePageClient.jsx`, `components/weekly-menu/WeeklyMenuPage.tsx`, `components/RetentionForm.jsx` | Lead quality; opt-out requests |
| 13 | Fix malformed Tailwind classes in FAQ (`text--emerald-500`, `bg--emerald-500/10`) | P2 | Low | High | Small | None | `app/faq/page.js` | Visual regression pass |
| 14 | Uncheck SMS opt-in default in quiz | P2 | Low | High | Small | None | `app/quiz/QuizClient.jsx` | Consent compliance |
| 15 | Add size to product-card price line (e.g., "$12.00 · 16 oz") | P2 | Medium | High | Small | None | `components/EnhancedProductCard.jsx`, `components/home/HomePageClient.jsx`, `components/weekly-menu/WeeklyMenuPage.tsx` | Product page CTR |
| 16 | Replace repeated `/images/gratog-bg.PNG` in homepage founder section | P2 | Medium | High | Small | CP-7 (real photography) | `components/home/HomePageClient.jsx` | Visual trust |
| 17 | Simplify homepage retention prompts to single email waitlist | P2 | Medium | High | Small | CP-9 | `components/home/HomePageClient.jsx` | Lead quality; form completion |
| 18 | Preorder: skip market selection if `?market=` is valid in URL | P2 | High | Medium | Small | None | `app/preorder/PreorderClientPage.tsx` | Preorder completion rate |
| 19 | Preorder: use curated weekly products instead of broken Square catalog | P2 | Critical | High | Medium | Owner decision D3 (slug mapping) | `app/preorder/PreorderClientPage.tsx`, `lib/preorder/rules.ts` | Preorder completion; product accuracy |
| 20 | Header: add wordmark on mobile or keep brand visible | P2 | Medium | High | Small | None | `components/Header.jsx` | Brand recognition |
| 21 | Catalog: replace health-benefit filters with category + flavor filters | P2 | High | High | Medium | CP-3 | `lib/health-benefits.js`, `components/catalog/CatalogPageClient.jsx` | Filter use; product views |
| 22 | Replace about-hero Unsplash stock image with founder/market photo | P2 | Medium | High | Small | CP-7 | `app/about/page.js` | About page engagement |
| 23 | Add real market/booth photos to `/markets` | P2 | Medium | High | Small | CP-7 | `data/markets.ts`, `app/markets/page.tsx` | Market page engagement |
| 24 | Product detail: display flavor notes and usage more prominently than wellness tags | P2 | Medium | High | Small | None | `app/product/[slug]/ProductDetailClient.jsx` | Add-to-cart rate |
| 25 | Implement verified review display on product pages and homepage | P3 | High | Medium | Large | Owner (review collection) | `components/ProductReviews.jsx`, `components/home/HomePageClient.jsx` | Review count; conversion lift |
| 26 | Build real Square bundle SKUs or remove bundle savings | P3 | High | Medium | Large | Owner (Square setup) | `data/bundles.ts`, checkout | Bundle uptake; AOV |
| 27 | Implement recurring subscription billing for Gratitude Box | P3 | High | Low | Large | Owner + Square subscriptions | `app/api/subscriptions/gratitude-box/route.ts`, `components/subscriptions/GratitudeBoxPage.tsx` | Subscription conversion |
| 28 | Returning-customer recognition and one-click reorder | P3 | Medium | Medium | Medium | Engineering | `app/account`, `app/preorder` | Repeat purchase rate |
| 29 | Jar-return / loyalty program | P3 | Medium | Low | Large | Owner + engineering | `app/gratitude/`, FAQ | Repeat purchase rate; LTV |
| 30 | Run homepage hero A/B test once traffic allows | P3 | Medium | Medium | Small | Analytics setup | `components/home/HomePageClient.jsx` | CTR, bounce rate |

## Phased implementation suggestion

### Phase 1 — Trust and clarity (days 1–3)
- Items 1–4, 7–12 (P0/P1 safe fixes).
- Requires owner decisions CP-1 through CP-10.

### Phase 2 — Product discovery and mobile polish (days 4–7)
- Items 5, 6, 13–18, 20, 21, 24.
- Mostly engineering/content.

### Phase 3 — Photography and social proof (days 8–21)
- Items 16, 19, 22, 23, 25.
- Depends on owner providing photos/reviews.

### Phase 4 — Revenue features (after operations verified)
- Items 26–30.
- Requires Square catalog cleanup and real subscriptions.
