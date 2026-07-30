# TOG-PRODUCTION-DRIFT-LEDGER.md

Taste of Gratitude — Production Drift Ledger

Generated: 2026-07-29 19:18 EDT
Authority: Native Termux workspace
Status: Based on code inventory, Vercel deployment metadata, and prior audit reports; live DOM verification blocked.

---

## 1. Code vs Production Drift

| Finding | Code State | Production State | Severity | Action |
|---------|-----------|------------------|----------|--------|
| Recent Vercel builds failing | HEAD `f57c6527` plus uncommitted changes | Production at `f57c6527` (READY) | P0 | Fix build before deploying |
| Uncommitted working tree | 10 modified files + many untracked audit/sanitize/debug files | Production deployed from dirty `f57c6527` | P0 | Commit or remove artifacts; reconcile package-lock.json |
| Customer auth routes | Files exist (`/api/auth/*`) | Phase 0 report said 6 routes were empty directories | P1 | Verify current implementation; test login/register/session |
| Customer account/profile pages | Pages exist | Reported broken/partial | P1 | Verify and repair or hide |
| `menus` DB collection | Code expects current week menu | One active menu dated June 8, 2026 | P1 | Update active menu or switch to static weekly menu |
| Weekly menu date logic | Uncommitted `lib/menus/week-utils.ts` fixes date mismatch | Production may still use old static `WEEKLY_MENU` | P1 | Deploy fix after build repair |

## 2. Features in Code but Not Publicly Active

| Feature | Code Location | Public Route | Status |
|---------|--------------|--------------|--------|
| Rewards program | `lib/enhanced-rewards.js`, `app/rewards`, `app/gratitude` | Redirects to `/catalog` | Inactive |
| Reviews | `components/ProductReviews.jsx`, `app/reviews` | Redirects to `/catalog` | Inactive |
| Subscriptions / Gratitude Box | `app/subscriptions`, `lib/subscription-*` | Redirects to `/catalog` | Inactive |
| Wholesale portal | `app/wholesale` | `/wholesale` | Possibly inactive |
| Quiz | `app/quiz` | `/quiz` | Active but value unclear |
| Learning center | `app/explore/learn`, `lib/learning/*` | `/explore/learn` | Active but content-heavy |
| Explore ingredients | `app/explore/ingredients`, `lib/ingredient-*` | `/explore/ingredients` | Active but content-heavy |
| Info board | `app/info-board` | `/info-board` | Kiosk-only |
| Queue system | `app/vendor/queue`, `app/api/queue/*` | `/vendor/queue` | Staff-only |
| Mobile admin | `FEATURE_MOBILE_ADMIN` | unknown | Unknown |
| Returns portal | `lib/returns.ts`, `app/api/returns/create` | unknown | Unknown |

## 3. Env Vars for Inactive Providers

| Provider | Env Vars | Status |
|----------|----------|--------|
| Twilio | TWILIO_*, STAFF_PHONE | Inactive (removed) |
| ShipEngine | SHIPENGINE_*, SHIPPING_FROM_* | Likely inactive |
| EasyPost | EASYPOST_API_KEY | Likely inactive |
| Stripe | STRIPE_* | Placeholder only |
| PagerDuty | PAGERDUTY_* | Likely inactive |
| Slack | SLACK_* | Likely inactive |

## 4. Static Fallbacks Replacing or Shadowing Database

| System | Database Source | Static Fallback | Risk |
|--------|-----------------|-----------------|------|
| Weekly menu | `menus` collection (stale) | `data/weeklyMenu.ts` + `lib/menus/week-utils.ts` | Date mismatch; uncommitted fix |
| Products | Square catalog runtime | `data/products.ts`, `lib/demo-products.js`, `lib/storefront-products.js` | Fallback may show stale data |
| Markets | `data/markets.ts` | Same | Low risk if data is stable |

## 5. Admin Controls Writing to Unused or Stale Collections

| Admin Control | Collection | Public Consumer | Risk |
|---------------|------------|-----------------|------|
| Menu management | `menus` | Weekly menu page | Stale menu document |
| Inventory management | `inventory` / custom inventory | Catalog | Possible drift from Square |
| Campaign management | `campaigns` | Email sends | Low usage? |
| Reviews management | `reviews` | Redirected page | Unused |
| Waitlist management | `waitlist` | Unknown | Unknown |

## 6. Deprecated / Legacy Code Still Present

| Item | Location | Notes |
|------|----------|-------|
| `/api/checkout` | `app/api/checkout/route.ts` | Returns 410 Gone |
| `/api/pay/process` | `app/api/pay/process/route.ts` | Returns 410 Gone |
| `lib/email-templates.js` | legacy templates | Duplicates `lib/email/templates.js` |
| `lib/seo.js` | legacy SEO utils | Duplicates `lib/seo/index.ts` |
| `lib/search/enhanced-search.js` | legacy search | Duplicates `lib/search-enhanced.ts` |
| `lib/menus.ts` / `lib/markets.ts` | legacy modules | Shadowed by `lib/menus/`, `lib/markets/` directories |
| `pages/api/menu.ts` | legacy pages router | Untracked file |

## 7. Vercel / Domain Drift

| Finding | Detail |
|---------|--------|
| Multiple Vercel preview URLs | Many failed deployments; aliases may point to stale builds |
| Domain aliases | `gratog.vercel.app`, `taste-og.vercel.app` redirect to canonical |
| Production deployment pinned | `dpl_5YfkFjmke2qxYa5tG2jgweaimDX2` is the last READY build |

---

*Next: TOG-FEATURE-FLAG-INVENTORY.md*
