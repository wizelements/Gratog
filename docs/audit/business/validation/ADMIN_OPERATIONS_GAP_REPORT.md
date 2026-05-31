# ADMIN_OPERATIONS_GAP_REPORT — Assumption 6 verification

> **Assumption:** Admin can operate business without Mongo shell.
> **Verdict:** ❌ **FALSE TODAY. 5 daily operations require workarounds.**

## Daily operation matrix

| Operation | Admin route | Backing API | Can be done in UI? | Workaround required? |
|---|---|---|---|---|
| **Order list (today's orders)** | `/admin/orders` | `/api/admin/orders` ✅ | ✅ | none |
| **Order detail** | `/admin/orders` (drawer/modal) | `/api/admin/orders` ✅ | ✅ | none |
| **Mark order status** (e.g. "ready for pickup") | `/admin/orders` | `/api/admin/orders/update-status` ❌ MISSING | ❌ | direct Mongo edit |
| **Bulk mark complete** | `/admin/orders` | same ❌ | ❌ | Mongo updateMany |
| **Sync from Square** | `/admin/orders` button | `/api/admin/orders/sync` ❌ MISSING | ❌ | manual or wait for webhook |
| **Refund** | `/admin/orders` → refund modal | `/api/admin/orders/[id]/refund` ✅ | ✅ | none |
| **Customer lookup by email/phone** | `/admin/customers` | `/api/admin/customers` ✅ | ✅ | none |
| **Customer order history** | `/admin/customers/[id]` | `/api/admin/customers/[id]` ✅ | ✅ | none |
| **Customer notes / comp** | `/admin/customers/[id]` | depends on UI; verify | ⚠️ partial | possible Mongo |
| **Inventory current levels** | `/admin/inventory` | `/api/admin/inventory` ❌ MISSING (list) | ❌ | Mongo `db.inventory.find()` |
| **Inventory per-product edit** | `/admin/inventory` | `/api/admin/inventory/[productId]` ✅ | ✅ if you know product id | none |
| **Inventory low-stock alert** | n/a | `/api/admin/inventory?low=1` ❌ | ❌ | Mongo query |
| **Add product** | `/admin/products` | `/api/admin/products` ✅ | ✅ | none |
| **Edit product** | `/admin/products/[id]` | `/api/admin/products/[id]` ✅ | ✅ | none |
| **Square catalog re-sync** | `/admin/setup` or hidden | `/api/storefront/square-catalog` ✅ but no admin button | ⚠️ | curl from terminal |
| **Coupon create** | `/admin/coupons` | `/api/admin/coupons` ✅ | ✅ | none |
| **Coupon disable** | `/admin/coupons/[id]` | same ✅ | ✅ | none |
| **Review moderation** | `/admin/reviews` | `/api/admin/reviews` ✅ | ✅ | none |
| **Campaign compose + send** | `/admin/campaigns/new` | `/api/admin/campaigns/send` ✅ | ✅ | none |
| **Campaign test send** | `/admin/campaigns/new` | `/api/admin/campaigns/test` ❌ | ❌ | send to self only |
| **Email subscriber list** | n/a admin page | none | ❌ | Mongo `db.email_subscribers.find()` |
| **Newsletter unsubscribe lookup** | n/a | none | ❌ | Mongo |
| **Email send status / bounces** | n/a | none | ❌ | Resend dashboard manually |
| **Markets schedule** | `/admin/markets` | `/api/admin/markets` ✅ | ✅ | none |
| **Daily report** | `/admin/analytics` + email cron | `/api/admin/analytics`, `/api/cron/daily-report` ✅ | ✅ | none |
| **Error log review** | `/admin/errors` | `/api/errors/{list,summary}` ✅ | ✅ | none |
| **Square OAuth** | `/admin/square-oauth` | `/api/oauth/square/*` ✅ | ✅ | rare |
| **Lock recovery** | n/a | manual env rotation | ❌ | rotate `ADMIN_API_KEY` on Vercel |

## Critical daily-ops gaps

Five operations require direct Mongo or workarounds:

1. **Mark order status / bulk complete** — every paid order requires "ready", "out for delivery", "completed" transitions. Daily, high frequency. Critical.
2. **Sync from Square** — webhook does most work, but reconciliation needs manual sync.
3. **Inventory list / low-stock** — operator can't see at-a-glance what's running low.
4. **Email subscriber/unsubscribe lookup** — for support cases ("did you receive my email?").
5. **Email bounce/failure visibility** — currently Resend dashboard only.

## Weekly / monthly gaps

| Gap | Workaround |
|---|---|
| Campaign test send | send to self via "Send to list" with single recipient |
| Square catalog re-sync button | `curl -X POST /api/storefront/square-catalog` |
| Recovery from admin lockout | rotate `ADMIN_API_KEY` env on Vercel |
| Subscription roster | Mongo |
| Waitlist roster | Mongo |
| Newsletter export | Mongo |

## Required fix (Phase 5 of playbook)

The playbook's Phase 5 covers:
- ✅ `/api/admin/inventory` (list)
- ✅ `/api/admin/orders/update-status`
- ✅ `/api/admin/orders/sync`
- ✅ `/api/admin/auth/reset-password`

Plan should additionally add (Phase 5 expansion):
- ⚠️ **Status-update guard:** reject `status='completed'` if `paymentStatus !== 'paid'` (cross-references ORDER_LIFECYCLE_AUDIT recommendation).
- ⚠️ **`/admin/emails` page** showing recent `email_sends` with status filters (defer to Tier 2 if needed).
- ⚠️ **Catalog re-sync button** in `/admin/setup` calling existing `/api/storefront/square-catalog`.

## Verdict

**Assumption 6 is FALSE today.** Plan Phase 5 closes the critical-daily gaps. Add the 3 minor expansions above.
