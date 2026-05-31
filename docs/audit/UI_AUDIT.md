# UI_AUDIT — Gratog Platform

> Code-verified at commit `f9d20e98`. Source: `app/**/page.*`, `components/**`, `components/ui/**`, `app/layout.js`.

## 1. Foundation

| Layer | Choice |
|---|---|
| Framework | Next.js 15 App Router |
| Styling | Tailwind CSS |
| Primitives | Radix UI + shadcn/ui-style wrappers in `components/ui/` |
| Icons | `lucide-react` |
| Toasts | `sonner` |
| Animation | `framer-motion` |
| Background music | Custom `BackgroundMusic` provider in `app/layout.js#L168-179` |

## 2. Page-by-page (selected high-traffic)

### `/` (Homepage)
- **Purpose:** Brand, hero, featured products, signup nudge.
- **User goal:** Identify brand value, browse, buy.
- **Visual hierarchy:** Hero → featured → social proof → CTA.
- **Accessibility:** Hero images need `alt` text validation; animation respect `prefers-reduced-motion` (verify in framer code).
- **Mobile:** ✅ Tailwind responsive grid.
- **Conversion quality:** No primary CTA above-the-fold for cold visitors (need verification by inspecting JSX).
- **Trust signals:** Reviews wall referenced but `/reviews` API is broken.
- **Tech debt:** Page is `app/page.js` (JS), most newer pages are TSX — type-coverage inconsistent.

### `/catalog`
- **Purpose:** Shop grid.
- **User goal:** Browse + filter.
- **Filters:** Server-side enhanced search at `/api/search/enhanced` ✅.
- **Mobile:** ✅ grid collapses to 2-col then 1-col.
- **Conversion:** No saved-filter URL state (verify); no sort persistence.
- **Debt:** Mixes Square catalog + local catalog via `lib/storefront-products.js`.

### `/product/[slug]` (PDP)
- **Purpose:** Conversion.
- **Trust signals:** Reviews integration broken (no `/api/reviews`).
- **Conversion:** Add-to-cart works ✅, but no related products / cross-sell strip (no `/api/recommendations`).
- **Mobile:** ✅ image carousel with sticky CTA expected.

### `/checkout`
- **Purpose:** Convert.
- **Component:** [components/checkout/CheckoutRoot.tsx](file:///data/data/com.termux/files/home/Gratog-live/components/checkout/CheckoutRoot.tsx)
- **Form fields:** Contact (name, email, phone), fulfillment (pickup/delivery), address, payment.
- **Payment UI:** Square Web Payments SDK card form (iframe).
- **Friction:**
  - Single column, multi-step? (verify) — likely long scroll on mobile.
  - No Apple Pay / Google Pay express.
  - Tip selector + coupon code add cognitive load.
  - 30 m order access token TTL = ticking clock.
- **Trust signals:** Order summary visible? (verify); Square branding present.

### `/order/success`
- **Purpose:** Receipt.
- **API:** `/api/orders/by-ref` ✅.
- **UX:** Should email confirmation, surface order#, show next steps; verify implementation.

### `/profile` and subroutes
- **Broken** — backing APIs missing. Page renders skeleton then 404 on data fetch.

### `/admin/*`
- **Style:** dashboard chrome with sidebar (per typical pattern). Mostly `.js` files.
- **Mobile:** Not optimized for mobile (admin is desktop-first; acceptable).
- **A11y:** Forms need ARIA pass; data tables likely lack proper labels.
- **Debt:** Many `.js` admin pages while public pages migrate to `.tsx`.

## 3. Component inventory (207)

Categories sampled from `components/`:
- `ui/` — primitives (Button, Card, Dialog, …).
- `checkout/` — checkout root, contact, payment, summary, address, fulfillment.
- `cart/` — drawer, item, sticky-cta.
- `catalog/` — grid, card, filters.
- `product/` — image carousel, info, reviews.
- `marketing/` — hero, newsletter, banner.
- `rewards/` — points display, passport stamps.
- `admin/` — sidebar, tables, modals.

## 4. Modals & drawers

- Cart drawer — Radix Sheet/Dialog wrapped.
- Search modal — referenced.
- Confirm dialogs — Radix AlertDialog.
- Drawer + Sheet — verify single-source-of-truth to avoid double Radix portals on mobile.

## 5. Forms

- No `react-hook-form` dependency. All forms are controlled state in components. Validation is manual per-form.
- **Risk:** inconsistent error rendering across forms (verify by sampling 3 forms).

## 6. CTAs

- Primary CTA color (verified consistent if `theme-primary` Tailwind token used).
- Newsletter CTA → broken API.
- "Take the quiz" CTA → broken API.
- "Reorder" CTA in profile → broken API.

## 7. Search

- Component: `components/search/SearchBar.tsx` (used in `Header` — must be in Suspense due to `useSearchParams`, fixed by `1c46825e`).
- API: `/api/search/enhanced` ✅.

## 8. Filters / dropdowns

- Tailwind + Radix Select. Verify keyboard a11y on `Select` instances.

## 9. Accessibility quick-pass

| Item | Verified? |
|---|---|
| Lang attribute | ✅ in `app/layout.js` |
| Skip-to-content link | ❓ |
| Focus rings on Tailwind buttons | ❓ verify `focus-visible:` classes |
| Alt text on product images | ❓ depends on Square catalog data |
| `aria-live` on cart updates | ❓ |
| Color contrast | ❓ needs Axe scan |
| Touch target sizes mobile | ❓ |

## 10. Trust signals inventory

| Signal | Present? |
|---|---|
| Customer reviews | ❌ `/reviews` API broken |
| Star rating on PDP | ❓ depends on aggregation logic |
| Order count / "X sold today" | ❌ |
| SSL / Square logos | ❓ likely on checkout footer |
| Refund/return policy link | ✅ `/policies` |
| Press / media logos | ❓ |

## 11. Design debt

- Mixed `.js` (JS) and `.tsx` (TS) files — 47 JS pages, 22 TSX pages. Mostly customer-facing has migrated; admin lags.
- Two parallel checkout systems (canonical `/checkout` + "Pay Flow" `/order/*`).
- `app/page.js` (homepage) still JavaScript — not type-checked.

## 12. Technical debt

- 64 referenced-but-missing API routes break large UI surfaces silently (forms submit, then nothing happens).
- No global error boundary visible in `app/layout.js` (verify) — broken APIs propagate as toast or silent 404.

## 13. Defects (UI)

| Sev | Defect |
|---|---|
| 🔴 Critical | `/contact`, `/register`, `/login`, `/forgot-password`, `/reset-password`, `/unsubscribe`, `/quiz`, `/reviews`, `/wishlist`, `/profile/orders`, `/profile/challenge` submit forms with no backend → user dead-end. |
| 🟠 High | No global error boundary / 404 toast for these silent failures. |
| 🟡 Medium | Checkout could be optimized (express pay, fewer fields). |
| 🟡 Medium | Mixed JS/TS pages. |
| 🟢 Low | Background music auto-play on mobile may violate UX expectations. |
