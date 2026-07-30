# TOG-PUBLIC-PAGE-INVENTORY.md

Taste of Gratitude — Public Page Inventory

Generated: 2026-07-29 19:16 EDT
Authority: Native Termux workspace
Status: Code-based inventory; live reachability partially blocked by runtime degradation.

---

## 1. Public Pages by Category

### Core commerce
| Page | Route | Linked from nav? | Redirect? | Status |
|------|-------|------------------|-----------|--------|
| Homepage | `/` | nav root | no | Active |
| Catalog | `/catalog` | nav | no | Active |
| Weekly menu | `/weekly-menu` | nav | no | Active |
| Product detail | `/product/[slug]` | catalog | no | Active |
| Cart | `/cart` | header | → `/checkout` | Redirect |
| Checkout | `/checkout` | cart | no | Active |
| Order success | `/checkout/success`, `/order/success` | payment | no | Active |
| Order status | `/order/status/[id]` | email/confirm | no | Active |
| Preorder | `/preorder` | weekly menu | no | Active |

### Markets / fulfillment
| Page | Route | Linked? | Redirect? | Status |
|------|-------|---------|-----------|--------|
| Markets | `/markets` | footer/nav | no | Active |
| Info board | `/info-board` | unknown | no | Active (kiosk) |

### Customer account (partial/broken)
| Page | Route | Linked? | Status |
|------|-------|---------|--------|
| Login | `/login` | header | Partial |
| Register | `/register` | header | Partial |
| Account | `/account` | header | Broken (shows unavailable) |
| Profile | `/profile` | header | Partial |
| Forgot password | `/forgot-password` | login | Partial |
| Reset password | `/reset-password` | email | Partial |

### Content / trust
| Page | Route | Linked? | Status |
|------|-------|---------|--------|
| About | `/about` | footer/nav | Active |
| FAQ | `/faq` | footer | Active |
| Policies | `/policies` | footer | Active |
| Privacy | `/privacy` | footer | Active |
| Terms | `/terms` | footer | Active |
| Contact | `/contact` | footer | Active |

### Discovery / engagement
| Page | Route | Linked? | Status |
|------|-------|---------|--------|
| Quiz | `/quiz` | homepage? | Active |
| Explore | `/explore` | unknown | Active |
| Request a flavor | `/request-a-flavor` | footer? | Active |
| Wholesale | `/wholesale` | footer? | Active |
| Telegram alerts | `/telegram-alerts` | unknown | Active |
| Reviews | `/reviews` | unknown | → `/catalog` |
| Rewards | `/rewards` | unknown | → `/catalog` |
| Subscriptions | `/subscriptions` | unknown | → `/catalog` |
| Gratitude Box | `/subscriptions/gratitude-box` | unknown | Experimental |
| Instagram post | `/(site)/instagram/[slug]` | unknown | Partial |
| Offline | `/offline` | service worker | Active |

## 2. Redirects (from vercel.json)

| Source | Destination | Reason |
|--------|-------------|--------|
| `/shop` | `/catalog` | Legacy |
| `/terms-of-service` | `/terms` | Legacy |
| `/privacy-policy` | `/privacy` | Legacy |
| `/cookie-policy`, `/cookies` | `/privacy#cookies` | Legacy |
| `/refund-policy`, `/return-policy`, `/returns` | `/policies#refunds` | Legacy |
| `/shipping-policy`, `/shipping` | `/policies#shipping` | Legacy |
| `/rewards`, `/gratitude/rewards` | `/catalog` | Feature not active |
| `/reviews` | `/catalog` | Feature not active |
| `/community` | `/about` | Legacy |
| `/subscriptions` | `/catalog` | Feature not active |
| `/health` | `/api/health` | Utility |
| `gratog.vercel.app/*` | `tasteofgratitude.shop/*` | Canonical |
| `taste-og.vercel.app/*` | `tasteofgratitude.shop/*` | Canonical |

## 3. Observations

- Many feature pages (`/rewards`, `/reviews`, `/subscriptions`) redirect to `/catalog`, indicating those features are not currently active.
- Customer account pages are partial/broken, so returning-customer account-based features are unreliable.
- `/request-a-flavor`, `/wholesale`, `/telegram-alerts` exist but may not be prominently linked.

---

*Next: TOG-PRODUCTION-DRIFT-LEDGER.md*
