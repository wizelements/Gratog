# Taste of Gratitude — Route Inventory

Generated: 2026-07-22
Audit method: filesystem enumeration under `app/` plus live `curl` probes to `https://tasteofgratitude.shop`.

---

## Summary

- Total route files found: **236** (`app/**/*.{page, route, layout}.*`)
- API route handlers: **~90**
- Page routes: **~90** (including duplicates and backup `.bak` files)
- The app uses Next.js App Router with many legacy and experimental routes still present.

---

## Public Commerce Routes

| Route | Type | Data source | Indexed? | Status | Issues |
|---|---|---|---|---|---|
| `/` | Page | `data/products.ts` + `data/weeklyMenu.ts` + `lib/storefront-products.js` + MongoDB reviews/orders | Yes | Live | Multiple competing CTAs, bundles are placeholders, SMS advertised but not connected |
| `/weekly-menu` | Page | `data/weeklyMenu.ts`, `data/products.ts` | Yes | Live | Menu is hardcoded; no admin publish flow |
| `/catalog` | Page | `lib/storefront-products.js` fallback + `/api/products` client fetch | Yes | Live | Uses `api/products` which derives from `unified_products`; may show curated fallback when Square sync fails |
| `/product/[slug]` | Page | `data/products.ts` lookup + Square catalog | Yes (sitemap uses Square IDs) | Live but risky | Slug namespace conflict: curated slugs vs. Square IDs in sitemap |
| `/cart` | Page | `lib/cart-engine.ts`, `lib/cart-pricing.ts` | No | Live | Commerce-critical; requires verification |
| `/checkout` | Page | `lib/square-api.ts` payment link creation | No | Live | Customer reaches Square checkout via payment link |
| `/checkout/square` | Page | Square Web Payments SDK | No | Live | Used for direct card payment path |
| `/checkout/success` | Page | Order lookup by session | No | Live | Post-payment confirmation |
| `/preorder` | Page | `data/markets.ts`, `data/products.ts`, `app/preorder/PreorderClientPage.tsx` | No | Live | Main market-pickup funnel |
| `/preorder/status` | Page | `MarketOrder` model | No | Live | Order status lookup |
| `/order/[id]` | Page | `orders` / `MarketOrder` | No | Live | Order detail |
| `/order/status/[id]` | Page | `orders` / `MarketOrder` | No | Live | Status tracking |
| `/order/complete` | Page | `orders` / `MarketOrder` | No | Live | Completion screen |
| `/order/success` | Page | `orders` / `MarketOrder` | No | Live | Success screen |
| `/order/start` | Page | ? | No | Unknown | Likely legacy market-day start screen |
| `/order/menu` | Page | ? | No | Unknown | Legacy or duplicate |
| `/quiz` | Page | `data/quiz.ts`, `data/products.ts` | Yes | Live | Recommendation uses wellness-goal language that may imply health benefits |
| `/markets` | Page | `data/markets.ts` | Yes | Live | Serenbe + Dunwoody only; hardcoded |
| `/wholesale` | Page | `app/api/lead/route.ts` | Yes | Live | Captures qualified inquiries |
| `/about` | Page | Hardcoded founder story | Yes | Live | Some unsupported personal-health-improvement phrasing; Unsplash stock hero image |
| `/contact` | Page | `app/api/contact/route.ts` | Yes | Live | — |
| `/faq` | Page | Hardcoded FAQ array | Yes | Live | Multiple questions reference inactive features (Spin & Win, rewards, challenges, workshops) |
| `/reviews` | Page | Redirects to `/catalog` | No | Redirect | Legacy route |
| `/rewards` | Page | Redirects to `/catalog` | No | Redirect | Legacy route |
| `/gratitude` | Page | Gratitude/rewards landing | No | Live? | Likely legacy community/rewards shell |
| `/gratitude/rewards` | Page | Redirects to `/catalog` | No | Redirect | Legacy route |
| `/subscriptions` | Page | Subscription landing | Yes | Live? | Contains one-time payment path only |
| `/subscriptions/gratitude-box` | Page | `app/api/subscriptions/gratitude-box/route.ts` | Yes | Live | Creates one-time Square payment link; no recurring billing |

---

## Brand, Education, and Support

| Route | Type | Data source | Indexed? | Status | Issues |
|---|---|---|---|---|---|
| `/explore` | Page | Unknown | Yes | Unknown | May be empty/legacy |
| `/explore/ingredients` | Page | `data/ingredients/` | Yes | Live | Educational ingredient content |
| `/explore/ingredients/[slug]` | Page | `data/ingredients/` | Yes | Live | Per-ingredient page |
| `/explore/learn` | Page | Unknown | Yes | Unknown | Risk of empty learning-module dashboard |
| `/explore/learn/[slug]` | Page | Unknown | Yes | Unknown | Risk of empty module shell |
| `/info-board` | Page | Unknown | No | Unknown | Possibly legacy info-board |
| `/offline` | Page | Static | No | Live | Offline fallback |

---

## Legal and Policy

| Route | Type | Data source | Indexed? | Status | Issues |
|---|---|---|---|---|---|
| `/policies` | Page | Hardcoded | Yes | Live | Consolidated policy page |
| `/privacy` | Page | Hardcoded | Yes | Live | Should be reconciled with actual data collection |
| `/terms` | Page | Hardcoded | Yes | Live | Should be reconciled with actual checkout/fulfillment |
| `/cookie-policy` | Redirect | → `/privacy#cookies` | No | Redirect | Correct |
| `/refund-policy` | Redirect | → `/policies#refunds` | No | Redirect | Correct |
| `/shipping-policy` | Redirect | → `/policies#shipping` | No | Redirect | Correct |

---

## Authentication and Account

| Route | Type | Data source | Indexed? | Status | Issues |
|---|---|---|---|---|---|
| `/login` | Page | Local JWT auth | No | Live | — |
| `/register` | Page | Local JWT auth | No | Live | — |
| `/forgot-password` | Page | Local JWT auth | No | Live | — |
| `/reset-password` | Page | Local JWT auth | No | Live | — |
| `/account` | Page | Customer account | No | Live | Requires login |
| `/account/subscriptions` | Page | Subscription list | No | Unknown | No real recurring subscriptions yet |
| `/account/subscriptions/[id]` | Page | Subscription detail | No | Unknown | — |
| `/profile` | Page | Customer profile | No | Unknown | Duplicate-ish with `/account` |
| `/profile/orders` | Page | Order history | No | Unknown | — |
| `/profile/rewards` | Page | Rewards | No | Unknown | Inactive rewards advertised |
| `/profile/challenge` | Page | Challenge | No | Unknown | Likely inactive |
| `/profile/settings` | Page | Settings | No | Unknown | — |

---

## Admin Routes

All under `/admin/*`. `vercel.json` sets `X-Robots-Tag: noindex, nofollow` for `/admin/:path*`.

| Route | Purpose | Notes |
|---|---|---|
| `/admin/login` | Admin login | Duplicate files: `page.js` + `page.tsx` |
| `/admin` | Dashboard | — |
| `/admin/products` | Product list | — |
| `/admin/products/[id]` | Product edit | — |
| `/admin/menus` | Weekly menu editor | Critical if menu should be admin-driven |
| `/admin/markets` | Market management | — |
| `/admin/market-day` | Market-day operations | — |
| `/admin/market-setup` | Market setup | — |
| `/admin/orders` | Order management | — |
| `/admin/customers` | Customer list | — |
| `/admin/inventory` | Inventory | — |
| `/admin/coupons` | Coupons | — |
| `/admin/campaigns` | Email/SMS campaigns | — |
| `/admin/emails` | Email log/templates | — |
| `/admin/analytics` | Analytics dashboard | Duplicate files: `page.js` + `page.tsx` |
| `/admin/qr-generator` | QR generator | — |
| `/admin/queue` | Queue management | — |
| `/admin/waitlist` | Waitlist management | — |
| `/admin/reviews` | Reviews | — |
| `/admin/interactions` | Customer interactions | — |
| `/admin/errors` | Error log | — |
| `/admin/settings` | Settings | — |
| `/admin/square-oauth` | Square OAuth | — |
| `/admin/setup` | Emergency setup | — |
| `/admin/forgot-password` | Password reset | — |
| `/admin/reset-password` | Password reset | — |

**Duplicate file risk:** `admin/analytics/page.js` and `admin/analytics/page.tsx` both exist. Next.js may pick one nondeterministically. Same for `admin/login`.

---

## API Routes

| Route | Purpose | Auth | Notes |
|---|---|---|---|
| `/api/catalog` | Square catalog edge API | Public | Returns `Unnamed Product` / $0 items |
| `/api/storefront/square-catalog` | Direct Square SDK catalog | Public | **Crashes** with BigInt serialization error |
| `/api/products` | Unified storefront products | Public | Falls back to curated data when Square fails |
| `/api/checkout` | Create Square payment link | Public | Commerce-critical |
| `/api/create-checkout` | Alternate checkout path | Public | — |
| `/api/cart` / `/api/cart/price` | Cart operations | Public | — |
| `/api/pay/process` | Direct payment processing | Public | — |
| `/api/payments/*` | Payment/refund APIs | Mixed | — |
| `/api/orders/*` | Order CRUD | Mixed | — |
| `/api/preorder/*` | Preorder create/confirm/cancel/status | Public | MarketOrder-based |
| `/api/webhooks/square` | Square webhooks | Signature key | Order/payment updates |
| `/api/webhooks/resend` | Resend webhook | Secret | Bounce/complaint handling |
| `/api/cron/*` | Cron jobs | `CRON_SECRET` | 4 live cron paths |
| `/api/retention/winback` | Win-back emails | `WEEKLY_WARM_CRON_SECRET` / `ADMIN_API_TOKEN` | Weekly retention |
| `/api/markets/warm` | Market/menu warm | `WEEKLY_WARM_CRON_SECRET` | Weekly |
| `/api/market/today` | Today's market | Public | — |
| `/api/delivery/quote` | Delivery fee quote | Public | — |
| `/api/shipping/rates` | Shipping rates | Public | — |
| `/api/lead` | Lead capture (phone/email/intent) | Public | Captures to `lead_intents` + `newsletter_subscribers` |
| `/api/newsletter/subscribe` | Newsletter subscribe | Public | — |
| `/api/contact` | Contact form | Public | — |
| `/api/quiz` | Quiz recommendation | Public | — |
| `/api/search/enhanced` | Search | Public | — |
| `/api/square/*` | Square config/diagnose/test | Admin/mixed | — |
| `/api/oauth/square/*` | Square OAuth | Admin | — |
| `/api/auth/*` | Customer auth | Public | — |
| `/api/admin/*` | Admin operations | Admin auth | Many routes |
| `/api/gratitude/*` | Rewards/loyalty | Mixed | Implementation unclear |
| `/api/rewards/*` | Rewards legacy | Mixed | Implementation unclear |
| `/api/user/*` | Customer account APIs | Auth | — |
| `/api/instagram/*` | Instagram feed | Public | Optional token-based |
| `/api/ics/market-route` | Calendar invite | Public | — |
| `/api/health` | Health check | Public | Memory pressure flagged |
| `/api/health/payments` | Payment health | Public | Confirms Square production OK |
| `/api/errors/*` | Error log APIs | Admin | — |
| `/api/analytics/*` | Analytics APIs | Mixed | — |
| `/api/csp-report` | CSP report | Public | — |
| `/api/startup` | Startup hook | Public | — |
| `/api/seo/analyze` | SEO analyzer | Public | — |
| `/api/queue/*` | Queue system | Mixed | Possibly market-day queue |

---

## Technical and SEO Surfaces

| Route | Type | Indexed? | Notes |
|---|---|---|---|
| `/robots.txt` | Static | N/A | Disallows `/admin`, `/api`, `/cart`, `/checkout`, `/order`, `/preorder`, `/profile`, `/vendor`, auth routes |
| `/sitemap.xml` | Generated | N/A | Lists canonical pages **and** Square-ID product URLs; should be reconciled after product cleanup |
| `/manifest.json` | Static | N/A | PWA manifest |
| `/sw.js` | Service worker | N/A | Cache headers set to no-cache |

---

## Empty / Loading-Only / Shell Hypotheses

Routes that require live testing with JavaScript disabled/authenticated states but show signs of being incomplete:

1. `/explore/learn` and `/explore/learn/[slug]` — no visible content source found quickly.
2. `/order/start`, `/order/menu` — possible duplicates of `/preorder`.
3. `/profile/challenge`, `/profile/rewards` — tied to inactive rewards/challenge system.
4. `/account/subscriptions/*` — no real recurring subscription data yet.
5. `/gratitude` and `/gratitude/rewards` — redirect one, shell the other.
6. `/admin/analytics` — duplicate page files.
7. `/admin/login` — duplicate page files.

---

## Duplicate and Legacy Routes to Resolve

- `/shop` → already redirects to `/catalog` (good).
- `/reviews`, `/rewards`, `/gratitude/rewards`, `/community` → already redirect (good).
- `/profile/*` vs. `/account/*` — consider consolidating or redirecting `/profile` to `/account`.
- `/menu` vs. `/weekly-menu` — sitemap includes `/menu`; verify whether it is a separate page or alias.
- `/subscriptions` vs. `/subscriptions/gratitude-box` — clarify hierarchy.
- `/explore/learn/[slug]` — hide or populate.

---

## Recommended Actions

1. Resolve duplicate page files in `admin/analytics` and `admin/login`.
2. Noindex or remove empty `/explore/learn` and `/profile/challenge` until content is ready.
3. Stop sitemap from indexing Square-ID product URLs until slug reconciliation is complete.
4. Redirect `/profile` to `/account` if account pages are canonical.
5. Verify `/order/start` and `/order/menu` are not reachable from navigation.
