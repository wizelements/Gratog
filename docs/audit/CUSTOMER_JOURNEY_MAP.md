# CUSTOMER_JOURNEY_MAP — Gratog Platform

> Code-verified at commit `f9d20e98`. Each step traced through real route/component files.

## A. Homepage visitor → purchase

```diagram
 / (app/page.js)
   │  Hero, featured products, CTA
   ▼
 /catalog (app/catalog/page.js)
   │  GET /api/products  ✅
   │  GET /api/storefront/catalog  ✅
   ▼
 /product/[slug] (app/product/[slug]/page.jsx)
   │  Add to cart → stores/cart.ts (Zustand, localStorage)
   ▼
 cart drawer (components/cart/*)
   │  GET /api/cart/price  ✅
   │  Proceed →
   ▼
 /checkout (app/checkout/page.tsx + components/checkout/CheckoutRoot.tsx)
   │  contact form, fulfillment (pickup/delivery), Square Web Payments SDK
   │  POST /api/inventory/lock  ✅
   │  POST /api/orders/create  ✅  → returns orderAccessToken
   │  POST /api/payments        ✅  (with Authorization: orderAccessToken)
   ▼
 /order/success?orderRef=…&token=…&paid=true  (app/order/success/page.js)
   │  GET /api/orders/by-ref   ✅
   │  Confirmation email via lib/resend-email.js
```

**Working:** ✅ end-to-end after `970daff0` + `e1750aac`.  
**Broken steps:** none on the happy path (post-fix).  
**Friction:** No express checkout (Apple Pay / Google Pay). Long form.

## B. Returning customer (login → reorder)

```diagram
 /login (app/login/page.js)
   │  POST /api/auth/login  ❌ MISSING
   │
 (login fails to submit — no backend)
```

**Broken steps:**
- Customer login route is missing (verify; not present in `_routes-existing.txt`).
- `/api/auth/register`, `/api/auth/reset-password` missing.
- `/profile` → `/api/user/profile`, `/profile/orders` → `/api/user/orders` all 404.

**Revenue leakage:** Repeat customers cannot view past orders or reorder. Account-based loyalty cannot accrue across visits.

## C. Quiz user

```diagram
 /quiz (app/quiz/page.js)
   │  POST /api/quiz/submit          ❌ MISSING
   │  GET  /api/quiz/recommendations ❌ MISSING
   ▼
 /quiz/results/[id]                  ❌ no backing data
```

**Broken steps:** all dynamic. Quiz UI renders but cannot persist or recommend.

## D. Newsletter subscriber

```diagram
 footer / popup signup
   │  POST /api/newsletter/subscribe ❌ MISSING
   │  POST /api/nurture/subscribe    ❌ MISSING
   ▼
 (no confirmation email, no list growth)
```

## E. Rewards user

```diagram
 /rewards (app/rewards/page.js)              ✅ static landing
 /gratitude (app/gratitude/page.jsx)         ✅
 /gratitude/rewards (app/gratitude/rewards/page.jsx)  ✅
   │  GET /api/gratitude/account, /transactions, /rewards  ✅
   │
 /profile/rewards (app/profile/rewards/page.js)
   │  GET /api/user/rewards  ✅ (restored)
   │
 /passport (app/passport/page.js)
   │  GET /api/rewards/passport  ✅ (restored)
   │  Scan QR → POST /api/rewards/passport/scan  ❌ MISSING
   │  POST /api/rewards/stamp     ❌ MISSING
```

**Working partial:** Gratitude program is intact; passport program is half-restored. Scanning/stamping not possible.

**Award flow on purchase:** `/api/orders/create` → fire-and-forget `/api/rewards/add-points` ✅.

## F. Guest checkout

```diagram
 catalog → cart → /checkout (no login)
   │  email + phone collected in contact form
   │  POST /api/orders/create → orderAccessToken (HMAC, 30 m)
   │  POST /api/payments using orderAccessToken
   ▼
 /order/success (reads via orderRef + token query param)
```

**Working:** ✅ post `e1750aac`. Guest path fully functional.  
**Caveat:** order access token TTL is 30 m; slow checkouts (>30 m) result in 401 at pay click.

## G. Registered checkout

Same flow as F, but `customer.email` already known and an `Authorization: Bearer <jwt>` would be sent. Currently the JWT path is unreachable because customer login is broken.

## H. Mobile user

- PWA enabled (`public/sw.js`, `lib/pwa.ts`). Service worker version aligned in `lib/pwa.ts`.
- Layout is mobile-first (Tailwind breakpoints, Radix UI).
- Cart drawer renders full screen on `< sm`.
- Square Web SDK iframe renders on mobile (Safari + Chrome verified per prior threads).

## I. Desktop user

- Same components, larger grid layouts.
- No desktop-specific bugs detected via code inspection.

## Broken steps summary

| Journey | Critical breakage |
|---|---|
| A | none (post-fix) |
| B | Auth routes missing → no returning customer experience |
| C | Quiz APIs missing → quiz is decorative |
| D | Newsletter signup APIs missing → list cannot grow |
| E | Passport scan/stamp APIs missing → manual passport only |
| F | none (post-fix) |
| G | Inherits B |
| H | none |
| I | none |

## Revenue leakage estimate (qualitative)

| Leak | Impact |
|---|---|
| No working register / login | Loss of repeat conversion lift (typically 30-50% LTV uplift). |
| No working newsletter signup | Loss of list-driven re-engagement (15-25% repeat revenue lever). |
| No working reviews | Loss of social proof; conversion drag. |
| No quiz completion | Loss of quiz-driven AOV uplift and personalization. |
| 30 m guest token TTL | Edge — abandons after long form-filling. |
| No upsell on PDP/cart | Standard pattern missing. |
| No abandoned-cart recovery | `cleanup-abandoned-orders` cron route missing. |

## Dead ends

- `/order-v2`, `/order/start`, `/order/menu`, `/order/checkout`, `/order/complete` — parallel "Pay Flow" pages not linked from main UX; confuse any visitor who lands directly.
- `/pay` — alternate pay page; superseded.
- `/test-auth`, `/diagnostic` — dev-only.
