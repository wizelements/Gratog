# ADMIN_OPS_AUDIT — What does the operator actually use?

> Phase 5 deliverable. Each admin feature classified by realistic usage cadence for a small food vendor.

## Usage cadence model

For a solo operator running a small-scale food business:

| Cadence | Examples |
|---|---|
| **Daily** | Check orders, mark fulfilled, refunds, inventory tweaks |
| **Weekly** | Coupon creation, market schedule, review moderation |
| **Monthly** | Campaign send, analytics review, settings tweak |
| **Quarterly** | Customer LTV review, vendor onboarding |
| **Never (yet)** | Notifications broadcast, AI campaign generation, queue admin if not used |

## Feature inventory (admin)

| Feature | Page | Backing API status | Realistic cadence | Verdict |
|---|---|---|---|---|
| Orders list / detail | `/admin/orders` | ✅ list; ✅ refund; ❌ sync; ❌ bulk update | **Daily** | KEEP — restore sync + status update |
| Products | `/admin/products` (+ `[id]`) | ✅ | Weekly | KEEP |
| Inventory per-product | `/admin/inventory` via `[productId]` | ✅ | Daily | KEEP |
| Inventory list | `/admin/inventory` | ❌ `/api/admin/inventory` missing | Daily | RESTORE — easy and operationally critical |
| Customers | `/admin/customers` (+ `[id]`) | ✅ | Monthly | KEEP |
| Coupons | `/admin/coupons` (+ `[id]`) | ✅ | Weekly | KEEP |
| Campaigns | `/admin/campaigns` (+ `/new`) | ✅ list + send; ❌ generate; ❌ test | Monthly | KEEP send; defer `generate`/`test` |
| Reviews | `/admin/reviews` | ✅ | Weekly | KEEP — but pair with public review submission |
| Analytics | `/admin/analytics` | ✅ | Monthly | KEEP |
| Errors | `/admin/errors` | ✅ | As-needed | KEEP |
| Markets | `/admin/markets`, `/admin/market-day`, `/admin/market-setup` | ✅ | Weekly | KEEP |
| Settings | `/admin/settings` | ⚠️ partial | Rare | LOW priority |
| Setup / emergency-init | `/admin/setup` | ✅ | Once | KEEP (gated) |
| Square OAuth | `/admin/square-oauth` | ✅ | Rare | KEEP |
| QR Generator | `/admin/qr-generator` | n/a (client only) | Rare | KEEP |
| Queue | `/admin/queue` | ❌ `/api/queue/active`, `/update` missing | Only on market days | EVALUATE — restore only if queue is actively used |
| Waitlist | `/admin/waitlist` | ❌ `/api/waitlist` missing | Never (no public form) | HIDE |
| Interactions | `/admin/interactions` | ❌ | Never (telemetry) | HIDE |
| Forgot password | `/admin/forgot-password`, `/admin/reset-password` | ❌ | Once-on-lockout | RESTORE — solo operator lockout = env rotation otherwise |
| Login | `/admin/login` | ✅ | Daily | KEEP — but secure (see SECURITY) |

## Notifications subsystem — admin facet

| Feature | API | Verdict |
|---|---|---|
| `/api/admin/notifications` (read) | ✅ | KEEP |
| `/api/admin/notifications/broadcast` | ❌ | HIDE unless push is active |
| `/api/admin/notifications/send` | ❌ | HIDE |
| `/api/admin/notifications/market-day` | ❌ | HIDE |
| `/api/admin/notifications/new-product` | ❌ | HIDE |
| `/api/admin/notifications/stats` | ❌ | HIDE |

**Premise:** vendor does not currently use push notifications. Building the admin facet now is feature theater. Hide all CTAs in `/admin` UI for these, restore only when push subscriber count >100.

## Daily operator checklist (target)

A reliable daily operator workflow should be:

1. Log in to `/admin`.
2. See yesterday's orders count + revenue at a glance.
3. Open `/admin/orders` → see paid orders sorted by fulfillment status.
4. Mark as "prepared", "out for delivery", "completed" via bulk action.
5. Refund any disputes.
6. Check `/admin/inventory` for low-stock items.
7. Review `/admin/reviews` queue.
8. Done.

Today this workflow needs:

| Need | Status |
|---|---|
| Login | ✅ (but insecure) |
| Dashboard summary | ✅ |
| Orders list | ✅ |
| Bulk status update | ❌ `/api/admin/orders/update-status` missing |
| Refund | ✅ |
| Inventory low-stock view | ❌ `/api/admin/inventory` missing |
| Review queue | ✅ |

**Gap:** 2 missing API routes block the daily workflow.

## Used vs unused matrix

| Used Daily | Used Weekly | Used Monthly | Rarely | Never (yet) |
|---|---|---|---|---|
| Orders list | Products | Campaigns send | Settings | Notifications broadcast |
| Inventory | Markets | Analytics | OAuth | Notifications send |
| Refunds | Coupons | Customers | Setup | Notifications market-day |
| Login | Reviews | | QR | Notifications stats |
| | | | Forgot password | Notifications new-product |
| | | | | Queue (unless markets use) |
| | | | | Waitlist |
| | | | | Interactions |
| | | | | Campaign generate (AI) |
| | | | | Campaign test send |

## Recommendations

### Restore (3 routes)
1. `/api/admin/inventory` — daily ops.
2. `/api/admin/orders/sync` — reconciliation safety.
3. `/api/admin/orders/update-status` — daily fulfillment.

### Restore later (1)
4. `/api/admin/auth/reset-password` — lockout recovery.

### Hide / disable in admin UI (5+)
- All notifications subroutes.
- Campaign generate + test.
- Waitlist link.
- Interactions link.
- Queue link (unless market days use it).

### Maintenance burden answer

The daily-cadence features cover ~80% of operational value with ~10 API routes. The remaining 50+ admin routes serve <20% of value and currently impose 100% of restoration cost. **Maintenance budget should match revenue contribution.**
