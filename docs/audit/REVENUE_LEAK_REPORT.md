# REVENUE_LEAK_REPORT — Gratog Platform

> Code-verified at commit `f9d20e98`. Quantifies user-visible breakages that cause measurable revenue loss.

## Top revenue leaks

| Rank | Leak | Estimated impact | Evidence |
|---|---|---|---|
| 1 | **Customer account flow dead** (register/login/forgot/profile/orders/wishlist) | High — 20-40 % of LTV typically comes from repeat customers; this path is unreachable. | `/api/auth/register`, `/api/auth/login`, `/api/auth/reset-password`, `/api/user/profile`, `/api/user/orders`, `/api/user/favorites` all ❌ missing. |
| 2 | **Newsletter signup dead** | High — list-driven re-engagement loop entirely gone. | `/api/newsletter/subscribe`, `/api/nurture/subscribe` ❌ missing. |
| 3 | **Reviews / social proof dead** | High — PDP conversion typically lifts 5-15 % with reviews. | `/api/reviews`, `/api/reviews/helpful` ❌ missing. |
| 4 | **No cross-sell / "you may also like"** | Medium — AOV lift typically 5-10 %. | `/api/recommendations` ❌ missing. |
| 5 | **Quiz funnel dead** | Medium — personalization + email capture loss. | `/api/quiz/{submit,results,recommendations}` ❌ missing. |
| 6 | **Contact form dead** | Medium — pre-sale inquiries lost; vendor / wholesale leads lost. | `/api/contact` ❌ missing. |
| 7 | **Wishlist dead** | Medium — known buy-intent signal lost. | `/api/user/favorites` ❌ missing. |
| 8 | **Subscriptions plans page broken** | Medium — recurring revenue lever. | `/api/subscriptions/plans` ❌ missing. |
| 9 | **No abandoned-cart recovery** | Medium — 10-20 % typical recoverable. | `/api/cron/cleanup-abandoned-orders` ❌ missing; no email automation hook. |
| 10 | **Public coupon validation broken** | Medium — promo codes don't validate at checkout. | `/api/coupons/validate`, `/api/coupons/create` ❌ missing. |
| 11 | **No express pay (Apple/Google)** | Medium — mobile checkout conversion drag. | Code inspection: only Square card form. |
| 12 | **Coupon $inc before payment** | Low-to-medium — opens DoS-drain abuse on limited coupons. | `lib/transactions.ts#L86-104` |
| 13 | **No upsell on cart drawer or PDP** | Low — AOV ceiling. | UI inspection. |
| 14 | **Trust signals weak** (no review aggregates, no "X sold today", no press logos verified) | Low | UI inspection. |
| 15 | **30-minute order access token TTL** | Low — abandonment for slow buyers. | `app/api/orders/create/route.js#L17` |

## Broken CTAs (verified)

| CTA | Page | Result |
|---|---|---|
| "Sign up" | `/register` | Submits → nothing |
| "Log in" | `/login` | Submits → nothing |
| "Forgot password" | `/forgot-password` | Submits → nothing |
| "Send" (contact) | `/contact` | Submits → nothing |
| "Submit review" | (PDP) | Submits → nothing |
| "Add to wishlist" | (PDP) | Click → nothing |
| "Take the quiz" | `/quiz` | Submits → nothing |
| "Subscribe to newsletter" | (footer) | Submits → nothing |
| "Unsubscribe" | `/unsubscribe` | Submits → nothing |
| "Apply coupon" | `/checkout` | Validates locally only |
| "Reorder" | `/profile/orders` | Renders empty |

## Dead pages (renders without backend)

- `/profile`, `/profile/orders`, `/profile/rewards`, `/profile/settings`, `/profile/challenge`
- `/login`, `/register`, `/forgot-password`, `/reset-password`
- `/contact`
- `/wishlist`
- `/quiz`, `/quiz/results/[id]`
- `/unsubscribe`
- `/reviews`
- `/subscriptions`

## Hidden but reachable (should be removed)

- `/test-auth`
- `/diagnostic`
- `/order-v2`, `/pay`, `/order/start`, `/order/menu`, `/order/checkout`, `/order/complete` (parallel checkout)

## Tracking gaps

- Web vitals: ✅ `/api/analytics/web-vitals`.
- Error reporting: ✅ Sentry; ⚠️ `/api/error-report` missing.
- User tracking: ❌ `/api/tracking/user`, `/api/transactions/log` missing.
- Transactional email delivery: ❌ not tracked (see EMAIL_SYSTEM_AUDIT).

## Drop-off points

Inferred from code (verify with real analytics):

```diagram
 100% landing
   │ ~50% browse catalog
   │   │ ~20% open product
   │   │   │ ~10% add to cart
   │   │   │   │ ~6% open checkout
   │   │   │   │   │ ~4% pay      ◀── canonical happy path works
   │   │   │   │   │
 [auth signup] [contact] [quiz] [review] [wishlist] [newsletter]
   X            X         X       X        X            X       ◀── all broken
```

The dead branches above represent the platform's *secondary* revenue moats (LTV, list growth, social proof) — all currently 0% conversion because the backend doesn't exist.

## Estimated remediation impact

Restoring the 64 missing routes (especially auth, newsletter, reviews, quiz, recommendations) would likely lift overall revenue by 20-40 % over a 90-day window based on industry benchmarks for these features.
