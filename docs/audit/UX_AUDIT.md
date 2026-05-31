# UX_AUDIT — Gratog Platform

> Scoring scale: 0-100 per dimension. Methodology: weight functional brokenness 60% / pure-UX friction 40%. Score derived from code inspection only — no real-user test.

## Overall: **52 / 100**

Most "happy path" UX is competent; the platform's pain is broken supporting flows (auth, contact, quiz, reviews, profile).

## Dimension scores

| Dimension | Score | Notes |
|---|---|---|
| Navigation | 70 | Header, footer, drawer all present. Mobile menu reasonable. |
| Discoverability | 60 | Catalog filters present, but cross-sell and related-products absent (`/api/recommendations` missing). |
| Purchase friction (canonical guest checkout) | 78 | Works end-to-end. Single-page checkout. Square SDK card form is industry-standard. Lacks express pay. |
| Checkout friction (registered) | 25 | Login broken (`/api/auth/login` not present), so registered checkout is unreachable. |
| Form friction | 45 | Many forms point at missing APIs; user-perceived "unresponsive" submits. |
| Trust friction | 50 | Reviews broken; star ratings depend on broken API. Square iframe present (good). |
| Mobile friction | 65 | PWA + responsive components; but checkout long-scroll, music auto-play. |
| Returning customer | 20 | Profile, orders history, wishlist all broken. |

## Severity ledger

### 🔴 Critical (revenue-blocking or user-trapping)
1. **`/register`, `/login`, `/forgot-password` forms submit into the void.** Users typing email + password see no feedback → bounce.
2. **`/contact` form submission silently fails.** Pre-sale inquiries lost.
3. **`/profile/orders` is empty.** No reorder = lost AOV from repeat customers.
4. **`/unsubscribe` is non-functional.** CAN-SPAM / GDPR exposure.

### 🟠 High
5. Quiz, reviews, wishlist UIs render but do nothing on submit.
6. No express pay (Apple/Google) on checkout → up to 10-20% friction increase on mobile.
7. No cross-sell/upsell on PDP/cart → AOV ceiling.
8. Background music auto-play on first visit is UX-debt.
9. `/test-auth`, `/diagnostic`, `/order-v2`, `/pay` exposed → confusing if discovered.

### 🟡 Medium
10. 30-minute order-access-token TTL with no warning UI.
11. Cart persists in `localStorage` only — no cross-device cart restore.
12. No abandoned-cart email (no cron for it; cron route missing).
13. Toast feedback for failed API calls is inconsistent.
14. Admin pages mostly desktop-only; vendor on mobile is hampered.

### 🟢 Low
15. Mixed JS/TS pages create mental-load for maintenance.
16. Hard-coded brand colors across templates.
17. Some pages lack `<title>` / Open Graph (verify on staging).

## Per-step friction (happy path)

| Step | Friction | Mitigation |
|---|---|---|
| Landing → catalog | Low | None |
| Catalog → PDP | Low | Lacks recommended products |
| PDP → cart | Low | Could add quick-buy |
| Cart → checkout | Medium | Inline trust signals helpful |
| Checkout form | High | Long, lacks Apple Pay, lacks autofill optimization |
| Pay click → confirmation | Low | Square SDK is fast |
| Post-purchase email | Medium | Email sends but delivery isn't tracked for transactional sends |

## Recommendations (audit-only — do not implement without explicit user OK)

1. Restore missing public APIs to unblock all form submissions.
2. Add global toast on API errors (Sonner already present).
3. Add Apple Pay + Google Pay buttons (Square SDK supports natively).
4. Add `<title>` / OG metadata audit pass.
5. Add abandoned-cart email cron.
6. Hide / remove `/test-auth`, `/diagnostic`, `/order-v2`, `/pay`.
7. Add subtle countdown when `orderAccessToken` is within 5 min of expiry.
8. Defer or opt-in background music.
