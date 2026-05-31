# ORDER_LIFECYCLE_AUDIT — Assumption 2 verification

> **Assumption:** No order can exist without payment.
> **Verdict:** ❌ **FALSE — and intentionally so. Plan must accommodate.**

## Search results

`rg -n "createOrder\|insertOrder\|saveOrder\|Order\.create\|collection\('orders'\).*insertOne"` returns **8 distinct insert sites**:

| # | File:line | Function | When does it run? | paymentStatus on insert |
|---|---|---|---|---|
| 1 | [lib/transactions.ts:38](file:///data/data/com.termux/files/home/Gratog-live/lib/transactions.ts#L38) | `createOrderAtomic` (canonical) | `/api/orders/create` POST — before any payment attempt | `pending` |
| 2 | [lib/db-customers.js:143](file:///data/data/com.termux/files/home/Gratog-live/lib/db-customers.js#L143) | `createOrder(orderDetails)` | helper used elsewhere; inserts whatever caller sets | arbitrary |
| 3 | [lib/subscription-practical.ts:378](file:///data/data/com.termux/files/home/Gratog-live/lib/subscription-practical.ts#L378) | `generateSubscriptionOrder` | scheduler / cron | `pending` (no payment yet) |
| 4 | [lib/enhanced-order-tracking.js:200](file:///data/data/com.termux/files/home/Gratog-live/lib/enhanced-order-tracking.js#L200) | `EnhancedOrderTracking.createOrder` | unused legacy class — verify | varies |
| 5 | [lib/enhanced-order-tracking.js:563](file:///data/data/com.termux/files/home/Gratog-live/lib/enhanced-order-tracking.js#L563) | fallback-order sync from localStorage | offline recovery | as stored in localStorage |
| 6 | [app/api/orders/route.ts:164](file:///data/data/com.termux/files/home/Gratog-live/app/api/orders/route.ts#L164) | `MarketOrder.create({...})` POST | public-ish endpoint; cash/sms can set `paymentStatus='PAID'` directly | trust-based |
| 7 | [app/api/pay/process/route.ts:199](file:///data/data/com.termux/files/home/Gratog-live/app/api/pay/process/route.ts#L199) | inserts only after Square success | `/api/pay/process` POST | `paid` (post-payment) |
| 8 | [app/api/checkout/route.ts:261](file:///data/data/com.termux/files/home/Gratog-live/app/api/checkout/route.ts#L261) | inserts `pre_orders` (not `orders`) | preorder checkout | n/a different collection |

## Can unpaid orders exist?

**Yes.** By design:

- Canonical flow at `/api/orders/create` inserts the order **first** with `paymentStatus: 'pending'`, then expects the client to call `/api/payments`. If the customer abandons, the order persists indefinitely until cleaned up. `/api/cron/cleanup-abandoned-orders` is ❌ MISSING — so abandoned orders accumulate.
- MarketOrder model `/api/orders` accepts arbitrary `paymentStatus`.
- Subscription scheduler creates pending orders.
- Fallback sync from offline localStorage re-inserts any pending order.

## Can fulfilled orders exist without payment?

Need to check whether admin fulfillment routes guard on `paymentStatus`:
- `/api/admin/orders` and `/api/admin/orders/[id]/refund` — refund obviously requires payment.
- Bulk status update (❌ MISSING) — when implemented, must guard.
- `/admin/orders` UI — operator could mark "completed" on a `pending` order if no guard.

## Recovery / reconciliation paths

| Path | Status |
|---|---|
| Square webhook updates `orders.paymentStatus` on `payment.updated` | ✅ |
| Admin reconciliation `/api/admin/orders/sync` | ❌ missing |
| Cron cleanup of abandoned orders | ❌ missing |
| Manual Mongo edit | possible but should not be required |

## Implications for the execution plan

The plan must:

1. **Add `/api/cron/cleanup-abandoned-orders`** (Phase 7.5 in playbook) — already scheduled.
2. **Add guard in admin status-update route** (Phase 5.2) — reject status `completed` / `out_for_delivery` if `paymentStatus !== 'paid'` unless explicit override flag.
3. **Lock down `/api/orders` POST** (MarketOrder) — admin-only or remove if unused. Verify usage:
   ```bash
   rg -n "/api/orders\\b" components/ app/ | grep -v "/api/orders/"
   ```
4. **Deprecate `/api/pay/process`** (Phase 6.4) — already in playbook.
5. **Verify subscription scheduler is dormant** before relying on it. If active, audit its payment-link path.

## Verdict (refined)

Unpaid orders **can and do** exist as a normal state of the canonical flow. The assumption needed wording change:

> "No order can be **fulfilled** without payment" — must be enforced by admin/fulfillment code, not by order-creation code.

This changes the plan: add the fulfillment guard to Phase 5 (admin daily-ops) and the abandoned-cart cron to Phase 7.
