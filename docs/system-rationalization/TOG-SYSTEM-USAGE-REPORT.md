# TOG-SYSTEM-USAGE-REPORT.md

Taste of Gratitude — System Usage Report

Generated: 2026-07-29 19:24 EDT
Authority: Native Termux workspace
Status: Inferred from code, prior audit reports, and database snapshot; live analytics blocked.

---

## 1. Database Usage Snapshot (from 2026-07-28 alerts verification)

| Collection | Count | Interpretation |
|------------|-------|----------------|
| orders | 811 | Active order history |
| marketorders | 4 | Low market-order usage |
| owner_alert_queue | 3 historical, 0 pending | Alerts working, no backlog |
| email_sends | 106 | Some email activity; recent winback failures |
| menus | 1 active | Stale menu document |
| users | unknown | Consumer auth partial/broken |
| admin_users | unknown | Admin auth active |
| products / inventory | unknown | Square primary |
| campaigns | unknown | Marketing automation |
| subscribers | unknown | Newsletter |

## 2. Route Usage Inference

### High-traffic / critical routes
- `/` (homepage) — public landing
- `/catalog` — product browsing
- `/product/[slug]` — product detail
- `/checkout` — purchase
- `/api/storefront/square-catalog` — catalog data
- `/api/orders/create` — order creation
- `/api/payments` — payment processing
- `/api/webhooks/square` — Square events

### Low / unknown usage
- `/quiz` — discovery tool; usage unknown
- `/explore/learn`, `/explore/ingredients` — content-heavy; usage unknown
- `/wholesale` — inquiry form; demand unknown
- `/request-a-flavor` — availability requests; volume unknown
- `/admin/analytics`, `/admin/campaigns` — admin usage unknown
- `/vendor/queue` — staff-only

### Redirected / inactive features
- `/rewards` → `/catalog`
- `/reviews` → `/catalog`
- `/subscriptions` → `/catalog`
- `/community` → `/about`

## 3. Feature Usage Assessment

| Feature | Estimated Usage | Business Criticality | Recommendation |
|---------|-----------------|----------------------|----------------|
| Homepage/catalog/checkout | High | P0 | Keep |
| Square payments | High | P0 | Keep |
| Market pickup | High | P1 | Keep |
| Owner alerts (Telegram/Resend) | Medium | P1 | Keep |
| Weekly menu | Medium | P1 | Keep + fix date |
| Customer email (Resend) | Medium | P1 | Keep |
| Availability requests | Low-Medium | P1 | Keep |
| Delivery | Low | P1 | Verify / clarify |
| Admin dashboard | Medium | P2 | Keep |
| Inventory management | Medium | P2 | Keep |
| Campaign manager | Low | P3 | Review usage |
| Quiz | Low | P3 | Review usage |
| Learning/explore | Low | P3 | Review usage |
| Rewards program | Low | P3 | Archive or consolidate |
| Reviews | Low | P3 | Archive |
| Subscriptions / Gratitude Box | Low | P3 | Archive |
| Wholesale | Low | P3 | Review |
| SMS | None | None | Archive |
| Shipping | Low/None | P3 | Archive if unused |

---

*Next: TOG-SYSTEM-COST-REPORT.md*
