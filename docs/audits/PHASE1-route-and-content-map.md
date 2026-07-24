# Phase 1 — Route Inventory & Content-Source Map

> Baseline snapshot captured at `7adef13a` before the `feat/content-seo-cleanup` implementation. Branch and working-tree statements below describe that baseline, not the final release state.

**Repository:** `wizelements/Gratog`  
**Baseline branch:** `main`  
**Last commit:** `7adef13a` — `feat(no-sms): replace Twilio SMS with Telegram/Resend owner alerts`  
**Working tree status:** clean (no uncommitted changes)  
**Site URL:** `https://tasteofgratitude.shop`  

---

## Summary counts

| Category | Count |
|---|---|
| Customer-facing pages | 58 |
| Customer/API route handlers | 101 |
| Admin pages | 22 |
| Admin API route handlers | 27 |
| Components | 144 |
| `lib/*` source files | ~180 |
| `data/*` source files | 7 |

---

## 1. Public customer-facing routes

> Layout: `app/layout.js` wraps all routes with `AuthProvider`, `AnalyticsProvider`, `Header`, `LiveLocationBanner`, `Footer`, `BottomNav`, cookie/PWA shell, and default metadata.

| URL | Page purpose | Primary audience | Primary conversion | Main heading / title pattern | Content source (file path + key components/data) | Thin / duplicate risk |
|---|---|---|---|---|---|---|
| `/` | Homepage: weekly menu, hero, featured products, market context, email capture | New/potential customers | Catalog browse / preorder / email signup | "Taste of Gratitude | Weekly Sea Moss Menu & Atlanta Farmers Market Fresh Drinks" | `app/page.js`, `components/home/HomePageClient.jsx`, `lib/storefront-products.ts`, `data/products.ts`, `data/weeklyMenu.ts`, `seo/schemas.js` (org + FAQ JSON-LD) | Uses generic Unsplash hero; homepage FAQ schema overlaps with `/faq` content |
| `/about` | Founder story / brand origin | New visitors | Trust / emotional connection | "Our Story" / "Hi, I'm Jenneisha" | `app/about/page.js`, `app/about/layout.js` | Hard-coded founder narrative; single page, no canonical conflict |
| `/catalog` | Product catalog grid with filters | Shoppers | Add to cart / checkout | "Shop Weekly Market Products" | `app/catalog/page.js`, `components/catalog/CatalogPageClient.jsx`, `lib/storefront-products.ts`, `data/products.ts` | Pulls live Square + curated data; risk if Square fallback populates duplicate titles |
| `/product/[slug]` | PDP with variants, ingredients, reviews, add-to-cart | Shoppers | Purchase / add-to-cart | `{product.name} | Taste of Gratitude` | `app/product/[slug]/page.jsx`, `app/product/[slug]/ProductDetailClient.jsx`, `data/products.ts`, `data/ingredients/*.ts`, `lib/seo/metadata.ts` (product JSON-LD) | **High risk:** dynamic DB lookup plus curated merge; stale Square descriptions can create thin/duplicated variants if sync fails |
| `/weekly-menu` | This week's menu landing with email capture | Returning market customers | Preorder / email signup | "Weekly Menu | Taste of Gratitude Farmers Market Pickup" | `app/weekly-menu/page.tsx`, `components/weekly-menu/WeeklyMenuPage.tsx`, `data/weeklyMenu.ts`, `data/markets.ts` | Distinct from `/menu` (redirect) — OK if redirect is 301/308 |
| `/menu` | 301 redirect to `/weekly-menu` | — | — | "This Week's Menu" | `app/menu/page.tsx` | Redirect page; OK, but ensure it returns proper redirect and not soft-404 |
| `/markets` | Market pickup locations, preorder steps, SMS/Telegram opt-in | Local customers | Preorder / location selection | "Atlanta Market Pickup" | `app/markets/page.tsx`, `app/markets/layout.js`, `data/markets.ts`, `lib/markets.ts` | Some market descriptions hard-coded in both `data/markets.ts` and `lib/markets.ts`; slight content drift possible |
| `/preorder` | Preorder form for market pickup | Customers ready to reserve | Preorder submission | "Preorder" | `app/preorder/page.tsx`, `app/preorder/layout.tsx` | Connected to Square/preorder APIs |
| `/preorder/status` | Check preorder status | Existing customers | Status lookup | "Check Order Status" | `app/preorder/status/page.tsx`, `app/preorder/status/layout.tsx` | Could be thin if status is empty |
| `/quiz` | Product recommendation quiz | New/unsure visitors | Quiz completion / recommended product | "Wellness Quiz" | `app/quiz/page.tsx`, `data/quiz.ts`, `data/products.ts`, `data/bundles.ts` | Static Q&A, but outcome pages lead to PDP — OK |
| `/gratitude` | Loyalty/credits dashboard | Registered customers | Engagement / repeat purchase | "{tier} Member" | `app/gratitude/page.jsx`, `lib/gratitude/core.js` | Uses hardcoded `temp-customer-id` placeholder — likely broken for real users |
| `/gratitude/rewards` | Redirects to `/catalog` | — | — | — | `app/gratitude/rewards/page.jsx` | Retired route |
| `/rewards` | Redirects to `/catalog` | — | — | — | `app/rewards/page.tsx` | Retired route |
| `/subscriptions` | Redirects to `/catalog` | — | — | — | `app/subscriptions/page.js` | Retired route |
| `/subscriptions/gratitude-box` | Curated box pilot page | Repeat customers | Box reservation | "Gratitude Box Pilot" | `app/subscriptions/gratitude-box/page.tsx`, `components/subscriptions/GratitudeBoxPage.tsx`, `data/bundles.ts` | Pilot only; content tied to bundle data |
| `/reviews` | Redirects to `/catalog` | — | — | — | `app/reviews/page.jsx` | Retired route |
| `/contact` | Contact form + support info | All customers | Lead/support request | "Get in Touch" | `app/contact/page.js`, `app/contact/layout.js`, `lib/site-config.ts` | Standard contact page; no duplicate risk |
| `/faq` | Accordion FAQ page | All customers | Self-service / trust | "How can we help?" | `app/faq/page.js`, `app/faq/layout.js` | FAQ schema also rendered on homepage; ensure canonical points to `/faq` |
| `/wholesale` | Wholesale/partner inquiry | B2B prospects | Inquiry submission | "Bring Taste of Gratitude to your space" | `app/wholesale/page.tsx` | Content mostly hard-coded; low duplicate risk |
| `/info-board` | Kiosk/info-only product board | In-booth / kiosk | Education / QR to shop | "Info Board" | `app/info-board/page.js`, `components/InfoBoardProductCard.jsx`, `lib/health-benefits.js` | No-commerce; relies on `/api/products` |
| `/explore` | Explore hub (ingredients + learning) | Content/SEO visitors | Click-through to sub-pages | "Explore Wellness" | `app/explore/page.js`, `app/explore/layout.js` | Gateway page; OK if sub-pages are rich |
| `/explore/ingredients` | Ingredient explorer grid | SEO/content visitors | Ingredient detail click | "Ingredient Explorer" | `app/explore/ingredients/page.js`, `components/explore/interactive/IngredientExplorer.jsx`, `lib/ingredient-data-extended.js` | **Moderate risk:** many generated ingredient pages, ensure unique descriptions |
| `/explore/ingredients/[slug]` | Individual ingredient detail | SEO/content visitors | Product cross-link | `{ingredient.name}` | `app/explore/ingredients/[slug]/page.js`, `lib/ingredient-data-extended.js` | **Moderate risk:** benefits are generic; need unique copy per ingredient |
| `/explore/learn` | Learning center module list | Education visitors | Module enrollment | "Learning Center" | `app/explore/learn/page.js`, `app/explore/learn/Client.jsx`, `lib/learning/default-modules.js` | Dynamic module data; ensure canonical per module detail |
| `/explore/learn/[slug]` | Individual learning module | Education visitors | Lesson completion | `{module.title}` | `app/explore/learn/[slug]/page.js`, `app/explore/learn/[slug]/Client.js` | Content from DB modules; risk depends on module uniqueness |
| `/checkout` | Checkout flow | Cart-ready customers | Purchase / payment | "Checkout" | `app/checkout/page.tsx`, `app/checkout/layout.js`, `components/checkout/CheckoutRoot.tsx`, `components/checkout/*` | Commerce-critical; no SEO risk |
| `/checkout/square` | Square payment page | Customers paying | Payment completion | — | `app/checkout/square/page.js` | — |
| `/checkout/success` | Order confirmation | Paying customers | Upsell / account creation | — | `app/checkout/success/page.js`, `components/checkout/*` | — |
| `/cart` | Redirects to `/checkout` | — | — | — | `app/cart/page.tsx` | — |
| `/order` | Redirects to `/checkout` | — | — | — | `app/order/page.js` | — |
| `/order/start` | QR/table order landing | In-market customers | Start order at market | "Taste of Gratitude" | `app/order/start/page.tsx` | Hard-coded market list duplicated with `data/markets.ts` |
| `/order/menu` | Mobile/table menu ordering | In-market customers | Add items / checkout | "Menu" | `app/order/menu/page.tsx` | Pulls from `/api/market/today` |
| `/order/[id]` | Order details | Customers | Review order | — | `app/order/[id]/page.tsx` | — |
| `/order/[id]/queue` | Order queue status | Customers | Pickup status | — | `app/order/[id]/queue/page.js` | — |
| `/order/status/[id]` | Public order status | Customers | Pickup status | — | `app/order/status/[id]/page.tsx` | — |
| `/order/complete` | Order completion page | Customers | — | — | `app/order/complete/page.tsx` | — |
| `/order/success` | Order success (legacy) | Customers | — | — | `app/order/success/page.js` | Duplicate with `/checkout/success` — verify canonical/redirect |
| `/account` | Phone-based customer account | Customers | Login / order history | "Your Account" | `app/account/page.tsx` | Uses SMS verification placeholder; may be non-functional |
| `/profile` | Authenticated customer dashboard | Logged-in customers | Engagement | "Profile" | `app/profile/page.js`, `app/profile/layout.js`, `app/profile/ProfileClient.jsx` | — |
| `/profile/orders` | Order history | Logged-in customers | Reorder | — | `app/profile/orders/page.js` | — |
| `/profile/rewards` | Rewards view | Logged-in customers | Redemption | — | `app/profile/rewards/page.js` | — |
| `/profile/challenge` | Wellness challenge | Logged-in customers | Participation | — | `app/profile/challenge/page.js` | — |
| `/profile/settings` | Account settings | Logged-in customers | Update preferences | — | `app/profile/settings/page.js` | — |
| `/login` | Customer login | Returning customers | Authentication | "Welcome Back" | `app/login/page.js` | — |
| `/register` | Customer registration | New customers | Create account | "Start Your Weekly Menu" | `app/register/page.js` | — |
| `/forgot-password` | Password reset request | Returning customers | Reset password | — | `app/forgot-password/page.js` | — |
| `/reset-password` | Password reset confirmation | Returning customers | Set new password | — | `app/reset-password/page.js` | — |
| `/telegram-alerts` | Telegram opt-in landing | Email/Telegram subscribers | Bot opt-in / email capture | "Get Telegram alerts" | `app/telegram-alerts/page.tsx`, `components/RetentionForm.tsx`, `data/markets.ts` | Fallback content when bot not configured |
| `/unsubscribe` | Marketing email unsubscribe | Email recipients | Unsubscribe | "Unsubscribe" | `app/unsubscribe/page.js` | — |
| `/offline` | PWA offline fallback | PWA users | Retry / home | "You're Offline" | `app/offline/page.js` | — |
| `/community` | Redirects to `/about` | — | — | — | `app/(site)/community/page.tsx` | Retired route |
| `/community/instagram/[slug]` | Instagram post detail | Social followers | — | `{post.metaTitle}` | `app/(site)/instagram/[slug]/page.tsx`, `/api/instagram/post/[slug]` | **High risk:** thin if only caption/image, duplicate with Instagram; limited SEO value |
| `/vendor/queue` | Staff order queue tablet UI | Staff / market ops | Order fulfillment | "Vendor Queue" | `app/vendor/queue/page.tsx` | No customer SEO; protected by staff token in client |
| `/privacy` | Privacy policy | All | Compliance / trust | "Privacy Policy" | `app/privacy/page.js`, `lib/seo` (generateMetadata) | Standard legal page |
| `/terms` | Terms of service | All | Compliance / trust | "Terms of Service" | `app/terms/page.js`, `lib/seo` | Standard legal page |
| `/policies` | Policy index (shipping/refund/returns) | All | Trust / support | "Store Policies" | `app/policies/page.js` | Could overlap with `/terms` and `/privacy`; keep canonical clear |

---

## 2. Internal / system routes (admin + API)

### Admin pages (`app/admin/*`)

| URL | Purpose |
|---|---|
| `/admin` | Admin dashboard home |
| `/admin/analytics` | Analytics dashboard |
| `/admin/campaigns` | Email/SMS campaign list |
| `/admin/campaigns/new` | Create campaign |
| `/admin/coupons` | Coupon management |
| `/admin/customers` | Customer list |
| `/admin/emails` | Email template management |
| `/admin/errors` | Error log viewer |
| `/admin/forgot-password` | Admin password reset request |
| `/admin/interactions` | Customer interactions |
| `/admin/inventory` | Inventory manager |
| `/admin/login` | Admin login |
| `/admin/market-day` | Market day operations |
| `/admin/market-setup` | Market configuration |
| `/admin/markets` | Markets CRUD |
| `/admin/menus` | Weekly menu builder |
| `/admin/orders` | Order management |
| `/admin/products` | Product list |
| `/admin/products/[id]` | Product edit |
| `/admin/qr-generator` | QR code generator |
| `/admin/queue` | Order queue dashboard |
| `/admin/reset-password` | Admin password reset |
| `/admin/reviews` | Reviews management |
| `/admin/settings` | Site settings |
| `/admin/setup` | Initial admin setup |
| `/admin/square-oauth` | Square OAuth connect |
| `/admin/waitlist` | Waitlist management |

### Admin API route handlers (`app/api/admin/*`)

| Prefix | Purpose |
|---|---|
| `/api/admin/analytics` | Dashboard metrics |
| `/api/admin/auth/*` | Admin auth (login/logout/me/csrf/reset) |
| `/api/admin/campaigns` | Campaign CRUD + send |
| `/api/admin/coupons/*` | Coupon CRUD |
| `/api/admin/customers/*` | Customer CRUD |
| `/api/admin/emails` | Email template CRUD |
| `/api/admin/emergency-init` | Emergency initialization |
| `/api/admin/inventory/*` | Inventory management |
| `/api/admin/markets` | Markets admin API |
| `/api/admin/menus` | Menu admin API |
| `/api/admin/notifications` | Admin notifications |
| `/api/admin/orders/*` | Order admin + refund/sync |
| `/api/admin/products/*` | Product admin + sync |
| `/api/admin/reviews` | Reviews admin |
| `/api/admin/setup` | Setup wizard |

### Customer/public API routes (`app/api/*` — excluding admin)

| Prefix | Purpose |
|---|---|
| `/api/analytics` | Event tracking |
| `/api/analytics/web-vitals` | Web vitals ingestion |
| `/api/auth/*` | Customer auth |
| `/api/cart/*` | Cart operations |
| `/api/catalog` | Catalog snapshot |
| `/api/checkout` | Checkout session |
| `/api/contact` | Contact form |
| `/api/coupons/validate` | Coupon validation |
| `/api/create-checkout` | Checkout creation |
| `/api/cron/*` | Cron: cleanup locks, abandoned orders, daily-report, owner-alerts |
| `/api/csp-report` | CSP report endpoint |
| `/api/customer/profile` | Customer profile |
| `/api/debug/square` | Square debug |
| `/api/delivery/quote` | Delivery quote |
| `/api/errors/*` | Error aggregation |
| `/api/gratitude/*` | Loyalty credits |
| `/api/health/*` | Health checks |
| `/api/ics/market-route` | Calendar ICS generation |
| `/api/instagram/*` | Instagram post sync/display |
| `/api/inventory/*` | Inventory lock/release/confirm |
| `/api/lead` | Lead capture |
| `/api/market/today` | Today's market menu |
| `/api/markets/*` | Market data |
| `/api/menus/*` | Menu data |
| `/api/newsletter/subscribe` | Newsletter signup |
| `/api/notifications` | Push notifications |
| `/api/oauth/square/*` | Square OAuth |
| `/api/orders/*` | Order CRUD/status/search |
| `/api/pay/process` | Payment processing |
| `/api/payments/*` | Payment/refund/Square |
| `/api/preorder/*` | Preorder lifecycle |
| `/api/products` | Product list |
| `/api/queue/*` | Pickup queue operations |
| `/api/quiz` | Quiz recommendations |
| `/api/reports/daily` | Daily report |
| `/api/retention/winback` | Winback campaign |
| `/api/returns/create` | Return request |
| `/api/rewards/*` | Rewards/passport |
| `/api/search/enhanced` | Enhanced product search |
| `/api/seo/analyze` | SEO analysis endpoint |
| `/api/shipping/rates` | Shipping rates |
| `/api/square/*` | Square config/diagnose/test |
| `/api/startup` | Startup health/init |
| `/api/storefront/*` | Storefront catalog |
| `/api/subscriptions/*` | Subscription/box orders |
| `/api/unsubscribe` | Email unsubscribe |
| `/api/user/*` | User profile/orders/rewards/stats/favorites/challenge/preferences |
| `/api/webhooks/resend` | Resend webhooks |
| `/api/webhooks/square` | Square webhooks |

---

## 3. Customer-facing content sources

### 3.1 Global layout & shared components

| Content area | File path | Notes |
|---|---|---|
| Root layout (PWA, metadata defaults, auth/analytics wrappers) | `app/layout.js` | Default `<title>` and `<meta description>` fallback for whole site |
| Header / navigation | `components/Header.jsx` | Market, catalog, account, cart links |
| Footer | `components/Footer.tsx` | Links, newsletter, contact info |
| Bottom mobile nav | `components/BottomNav.jsx` | Mobile-first nav |
| Hero section (home) | `components/HeroSection.tsx` | Used in some landing spots |
| Live location banner | `components/market/LiveLocationBanner.tsx` | Market open/closed banner |
| Cookie consent | `components/CookieConsent.tsx` | GDPR/CCPA |
| PWA shells | `components/PWA*.tsx` | Service worker, prompts, diagnostics |
| JSON-LD component | `components/JsonLd.tsx` | Renders structured data |
| SEO head wrapper | `components/SEOHead.tsx` | Meta tags helper |
| Breadcrumbs | `components/Breadcrumbs.tsx` | Navigation breadcrumbs |
| Newsletter signup | `components/NewsletterSignup.jsx` | Email capture |
| Retention form | `components/RetentionForm.tsx` | Email + market capture |

### 3.2 Metadata & structured data helpers

| File | Purpose |
|---|---|
| `lib/seo/metadata.ts` | `generateProductMeta`, `generatePageMeta`, `generateCatalogMeta`, `generateHomeMeta`, `generateProductJsonLd`, `generateBreadcrumbJsonLd` |
| `lib/seo/structured-data.tsx` | `renderJsonLd` helper |
| `lib/seo/index.ts` | SEO barrel exports |
| `lib/seo/content-optimizer.ts` | Content optimization utilities |
| `lib/seo/local-business.ts` | LocalBusiness structured data |
| `lib/seo/meta-tags.ts` | Tag helpers |
| `lib/seo/rich-snippets.ts` | Rich snippet generation |
| `lib/seo.js` (legacy) | Older schema exports (`ProductSchema`, `OrganizationSchema`, `LocalBusinessSchema`, etc.) |
| `seo/schemas.js` | Homepage organization + FAQ JSON-LD schemas |

### 3.3 Site configuration

| File | Purpose |
|---|---|
| `lib/site-config.ts` | `SITE_URL`, `API_BASE_URL`, feature flags, contact/support emails, market label |

### 3.4 Market configuration

| File | Purpose |
|---|---|
| `data/markets.ts` | `MarketPickupLocation[]`, active markets, pickup windows, maps URLs |
| `lib/markets.ts` | `MarketConfig[]`, open/close logic, minutes-until-open (similar markets, possible drift) |
| `lib/markets/*.ts` | Repository/schema/types for DB-backed markets |

### 3.5 Product / catalog / menu content

| File | Purpose |
|---|---|
| `data/products.ts` | Curated `PRODUCTS` array with descriptions, ingredients, SEO titles/descriptions, weekly status |
| `data/weeklyMenu.ts` | `WEEKLY_MENU`, categories, featured items |
| `data/bundles.ts` | `BUNDLES`, featured bundles |
| `lib/storefront-products.ts` | Live catalog snapshot from Square + curated merge |
| `lib/product-sync-engine.ts` | Square → Mongo sync |
| `lib/catalog-api.ts` | Catalog API helpers |
| `components/catalog/CatalogPageClient.jsx` | Catalog UI |
| `components/weekly-menu/WeeklyMenuPage.tsx` | Weekly menu UI |
| `components/home/HomePageClient.jsx` | Homepage UI |
| `components/ProductCard.jsx`, `EnhancedProductCard.jsx`, `InfoBoardProductCard.jsx` | Product card variants |

### 3.6 Ingredient / explore content

| File | Purpose |
|---|---|
| `lib/ingredient-data-extended.js` | Extended ingredient definitions (46 ingredients, emoji, benefits, rarity, origin) |
| `lib/ingredient-taxonomy.js` | Ingredient taxonomy mapping |
| `data/ingredients/shared-ingredients.ts` | Shared ingredient lists |
| `data/ingredients/product-ingredients-map.ts` | Product → ingredient mappings |
| `components/explore/interactive/IngredientExplorer.jsx` | Ingredient grid UI |
| `components/ingredients/*` | Showcase/cards/tooltips |
| `lib/health-benefits.js` | Benefit filters used by info board |

### 3.7 Quiz / recommendations

| File | Purpose |
|---|---|
| `data/quiz.ts` | `QUIZ_QUESTIONS`, answer-to-product mapping, recommendation logic |
| `app/quiz/page.tsx` | Quiz page shell |

### 3.8 Email templates & marketing

| File | Purpose |
|---|---|
| `lib/email/templates.js` | React/email JSX templates |
| `lib/email/templates.js` | Template exports (verify actual path) |
| `lib/email/service.js` | Email sending service |
| `lib/email/resend-client.js` | Resend API client |
| `lib/email/unsubscribe-tokens.ts` | Unsubscribe token management |
| `lib/ai-newsletter.js` | AI-assisted newsletter generation |
| `lib/campaign-manager.js` | Campaign orchestration |

### 3.9 Checkout / cart / fulfillment copy

| File | Purpose |
|---|---|
| `components/checkout/CheckoutRoot.tsx` | Checkout shell |
| `components/checkout/CheckoutProgress.tsx` | Progress indicators |
| `components/checkout/CartSummary.tsx` | Cart summary |
| `components/checkout/DeliveryForm.tsx`, `PickupForm.tsx`, `ShippingForm.tsx` | Fulfillment copy |
| `components/checkout/SquarePaymentForm*.tsx` | Payment UI |
| `lib/delivery-zones.js`, `delivery-radius.js`, `delivery-fees.ts`, `fulfillment.ts` | Fulfillment rules and copy |

### 3.10 Auth / profile / loyalty

| File | Purpose |
|---|---|
| `contexts/AuthContext.tsx` | Auth provider |
| `lib/auth.ts`, `lib/auth/*` | JWT, session, validation |
| `lib/gratitude/core.js` | Tier definitions |
| `lib/gratitude/accounts.js`, `transactions.js`, `rewards-catalog.js`, `referrals.js` | Loyalty logic |

### 3.11 Admin-only content (listed for completeness)

| File | Purpose |
|---|---|
| `components/admin/*` | Admin layout, mobile card, protected route, quick actions |
| `lib/admin-*.js`, `lib/auth/unified-admin.ts` | Admin auth & data |

---

## 4. Branch / commit / working-tree status

- **Current branch:** `main`
- **HEAD:** `7adef13a feat(no-sms): replace Twilio SMS with Telegram/Resend owner alerts`
- **Working tree:** clean
- **Uncommitted files:** none

---

## 5. Notable thin / duplicate / technical risks

1. **Retired routes with redirects:** `/community`, `/community/instagram/*`, `/rewards`, `/subscriptions`, `/reviews`, `/gratitude/rewards`, `/menu`, `/cart`, `/order` all redirect. Ensure redirects return proper HTTP status (Next.js `redirect`/`permanentRedirect` emit 307/308 by default).
2. **Market data duplication:** `data/markets.ts` and `lib/markets.ts` contain parallel market definitions with slightly different addresses/hours. Pick canonical source and reconcile.
3. **Product detail dual source:** PDP merges live Square/Mongo data with curated `data/products.ts`. If Square sync is stale or titles/descriptions are empty, pages can become thin or duplicated.
4. **Instagram pages:** `/community/instagram/[slug]` renders thin social-style pages with limited unique copy and no metadata export; SEO value is low and may appear as duplicate/noindex candidates.
5. **FAQ schema duplication:** FAQ JSON-LD is emitted on homepage (`seo/schemas.js`) and `/faq` page; canonical for FAQ content should be `/faq`.
6. **Auth placeholders:** `/gratitude` uses hardcoded `temp-customer-id` and `/account` uses phone-auth placeholder; these are likely non-functional in production.
7. **`/order/success` vs `/checkout/success`:** two success pages exist; verify one is canonical or redirect.
8. **Metadata coverage gaps:** several dynamic routes (explore learn module detail, profile sub-pages, order status pages) do not export explicit metadata; they inherit root metadata only.

---

*Report generated by subagent — Phase 1: route inventory and content-source map for Taste of Gratitude.*
