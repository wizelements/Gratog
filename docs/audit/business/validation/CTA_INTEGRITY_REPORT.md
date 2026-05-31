# CTA_INTEGRITY_REPORT — Assumption 7 verification

> **Assumption:** Every visible CTA has a valid destination.
> **Verdict:** ❌ **FALSE. ~12 CTAs route to dead or broken destinations from header/footer/home alone.**

## Scan source

Subagent scanned: `components/Header.jsx`, `components/Footer.tsx`, `components/MegaMenu.jsx`, `components/BottomNav.jsx`, `components/DesktopNav.tsx`, `components/home/HomePageClient.jsx`, `components/cart/EnhancedFloatingCart.jsx`, `components/FloatingCart.jsx`.

## Internal route destinations found (38 unique)

### ✅ Working
- `/` — homepage
- `/catalog` (and all `?category=…`, `?sort=…`, `?type=…` variants)
- `/product/[slug]` (e.g. `/product/golden-glow-gel`)
- `/checkout`
- `/markets`
- `/passport` (API restored)
- `/preorder?market=…`
- `/about`, `/faq`, `/privacy`, `/terms`
- `/community` — alias to `/(site)/community`
- `/rewards`
- `/explore`, `/explore/games`, `/explore/ingredients`, `/explore/learn`, `/explore/showcase` — pages render (some dynamic content broken)
- `/#benefits`, `/#featured`, `/#what-is-sea-moss` — homepage anchors

### ❌ Broken (page renders, backend missing or no-op)
| CTA | Route | Why broken |
|---|---|---|
| Sign in | `/login` | `/api/auth/login` missing |
| My account | `/account` | `/api/user/*` missing |
| My profile | `/profile` | `/api/user/profile` missing |
| Order history | `/profile/orders` | `/api/user/orders` missing |
| Contact | `/contact` | `/api/contact` missing |
| Reviews | `/reviews` | `/api/reviews` missing |
| Pay (parallel checkout) | `/pay` | parallel checkout system, decommission |
| Order (parallel checkout root) | `/order` | parallel checkout system, decommission |

### ⚠️ Partially working / deferrable
- `/explore/learn` — page renders; `/api/learning/modules` missing → dynamic content empty.

## Email template CTAs

Need a sample of templates verified. Common patterns in `lib/email/templates/*.js`:
- `View your order: ${BASE_URL}/order/${id}?token=…` — ✅ guest path works (token-gated).
- `Unsubscribe: ${BASE_URL}/api/unsubscribe?token=…` or `/unsubscribe?token=…` — ❌ both route and page break: `/api/unsubscribe` is missing.
- `View your rewards: ${BASE_URL}/profile/rewards` — ❌ profile broken (UI), but `/api/user/rewards` exists for the data layer.

## CTA breakdown by surface

### Header (Header.jsx, DesktopNav.tsx, MobileMenu, MegaMenu)
| CTA | Status |
|---|---|
| Logo → `/` | ✅ |
| Shop → `/catalog` + filters | ✅ |
| Markets → `/markets` | ✅ |
| Rewards → `/rewards` | ✅ |
| Explore → `/explore` + sub | ⚠️ pages exist; some content empty |
| Contact → `/contact` | ❌ form submits into void |
| Sign in / Account → `/login`, `/account`, `/profile` | ❌ |
| Cart icon → drawer ✅ → `/checkout` | ✅ |

### Footer (Footer.tsx)
- About / FAQ / Privacy / Terms → ✅
- Markets / Rewards / Catalog → ✅
- Contact / Reviews / Account → ❌
- Newsletter signup form → submits to `/api/newsletter/subscribe` ❌

### Homepage (HomePageClient.jsx)
- Hero CTAs to `/catalog`, `/preorder` → ✅
- "Take the quiz" → `/quiz` ❌
- "Read reviews" → `/reviews` ❌
- "Subscribe to our newsletter" → `/api/newsletter/subscribe` ❌

### Cart drawers
- "View cart" / "Checkout" → `/checkout` ✅
- "Continue shopping" → `/catalog` ✅

### PDP (`app/product/[slug]/page.jsx`) — not scanned in detail
Likely CTAs:
- Add to cart ✅
- "Write a review" → `/api/reviews` ❌
- "Add to wishlist" → `/api/user/favorites` ❌
- Cross-sell modules → may or may not be present

## Placeholder buttons

Likely candidates to audit (verify in source):
- "Coming soon" badges in `/explore/games/*` — verify these are static.
- "Generate with AI" in `/admin/campaigns/new` — `/api/admin/campaigns/generate` ❌
- "Send test" in `/admin/campaigns/new` — `/api/admin/campaigns/test` ❌

## Dead pages reachable via direct URL only

These won't appear in CTA scans because nav doesn't link to them, but they exist:
- `/order-v2`, `/order/start`, `/order/menu`, `/order/checkout`, `/order/complete`, `/order/status/[id]`
- `/checkout/square`, `/checkout/success`
- `/test-auth`, `/diagnostic`
- `/vendor/queue`
- `/wishlist`
- `/quiz`, `/quiz/results/[id]`
- `/subscriptions`
- `/account/subscriptions[/id]`
- `/ugc`, `/ugc/spicy-bloom`
- `/unsubscribe` (page renders but form 404s)

## Required action (Phase 6 of playbook)

Phase 6 already covers:
- Redirect-or-404 in prod for unsupported pages.
- Remove nav links to dead destinations.
- Deprecate `/api/checkout`, `/api/create-checkout`, `/api/pay/process`.

Plan should add:
- **Inspect email templates** in `lib/email/templates/*.js` for hard-coded CTAs that may point to broken routes (especially unsubscribe).
- **Verify admin campaigns/new page** — hide AI generate + test buttons until backed.
- **Footer newsletter form** — point at restored `/api/newsletter/subscribe` once Phase 7.1 lands; until then either hide or show "Coming soon".

## Impact ranking

| CTA breakage | Revenue / trust impact |
|---|---|
| `/contact` form | 🟠 lost pre-sale + partnership leads |
| `/unsubscribe` link in email | 🔴 legal (CAN-SPAM) |
| `/login` / `/register` / `/profile` | 🟡 only if accounts are actively promoted |
| `/reviews` | 🟠 lost social proof on PDP |
| Newsletter signup | 🟠 lost list growth |
| `/quiz` | 🟢 decorative; deferrable |
| `/wishlist` | 🟢 decorative; deferrable |
| `/pay`, `/order/*` (parallel checkout) | 🟡 indirect — only dangerous if discovered |
| Admin campaigns AI/test buttons | 🟢 internal only |

## Verdict

**Assumption 7 is FALSE.** Plan Phase 6 addresses the customer-facing breakage. Add email-template audit and footer-newsletter handling to the same phase.
