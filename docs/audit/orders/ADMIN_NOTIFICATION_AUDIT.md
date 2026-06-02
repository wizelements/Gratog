# Admin Order Notification Audit

**Status**: COMPLETE  
**Last Updated**: 2026-06-01  
**Owner**: AMP forensic audit
**Repository**: Gratog-live

---

## Answer: Exactly How Does Admin Learn An Order Exists?

Current production evidence shows admin/staff can learn through:

1. **Square dashboard** — Square order/payment exists and is completed.
2. **Gratog admin orders page after page load/manual refresh** — `/api/admin/orders` reads Mongo `orders`.
3. **Customer/queue page for market pickup** — browser-side `/api/queue/join` created `queuepositions` row for the real order.

Current production evidence shows admin/staff **did not learn via staff email** for the verified real order. The staff email path failed before Resend was called.

---

## Configured Staff Recipients

Production env has:

- `STAFF_EMAIL=jenneisha.glover@gmail.com,silverwatkins@gmail.com`
- `STAFF_PHONE` absent
- `ADMIN_DEFAULT_EMAIL=admin@tasteofgratitude.com`

`lib/staff-notifications.js` uses `STAFF_EMAIL` as a comma-separated recipient list (`lib/staff-notifications.js` line 7). `STAFF_PHONE` is declared but not used in the audited new-order email path.

---

## Admin Notification Paths Found

| Path | Code | Status | Evidence |
|---|---|---|---|
| Staff new-order email from `/api/payments` | `app/api/payments/route.ts` lines 1031-1064 → `lib/staff-notifications.js` lines 338-382 | **Broken in production** | Vercel `/api/payments` log at `2026-06-01T09:24:56.569Z` recorded `ReferenceError: location is not defined`; route still returned HTTP 200. |
| Staff email implementation | `lib/staff-notifications.js` lines 13-272 | **Throws before send** | Plain-text template references undefined `location`, `pickupTime`, `readyBy` at lines 238-240 and 251. |
| Staff status-change email | `lib/staff-notifications.js` lines 277-335 | Present, not part of paid-order creation | No evidence it ran for the real order. |
| Square webhook backup staff notification | `app/api/webhooks/square/route.ts` lines 740-775 | Narrow/incomplete and still calls broken helper | Only `order.created`/`order.updated` events call this backup. The observed real-order webhook row was `payment.updated`, which does not call staff notification. |
| Admin order list | `app/api/admin/orders/route.ts` lines 82-110 | Available after admin fetch/refresh | Reads Mongo `orders` and returns masked customer email, items, total, square order id. No push notification. |
| Admin dashboard recent orders | `app/admin/page.js` lines 56-82 and 299-356 | Page-load only | Calls `/api/admin/orders` on mount. No polling observed. |
| Admin orders page | `app/admin/orders/page.js` lines 49-72 and 212-230 | Page-load/manual refresh only | Calls `/api/admin/orders`; interval was removed. |
| Square sync button | `app/admin/page.js` lines 84-122; `app/admin/orders/page.js` lines 74-112 | UI calls `/api/admin/orders/sync`; local route not present in `app/api/admin/orders` | Production unauthenticated probe returns 401 from admin auth; local code tree has no sync route file. |
| SMS admin alert | `lib/sms.ts` has admin notification helpers, but no audited `/api/payments` call path found | Not used for this order | `STAFF_PHONE` absent and payment route imports `claimAndNotifyStaffOrder`, not SMS. |

---

## Staff Email Failure Root Cause

`notifyStaffPickupOrder(order)` builds a plain-text email body with undefined identifiers:

```js
Location: ${location}
Time: ${pickupTime}
Ready By: ${readyBy}
...
- Prepare order by ${readyBy}
```

Those identifiers are not defined in `lib/staff-notifications.js`. In Node, referencing them throws `ReferenceError` before `sendEmail(...)` is reached.

Production Vercel log evidence for the real order:

```text
requestPath: /api/payments
responseStatusCode: 200
message: ❌ Failed to send staff notification: ReferenceError: location is not defined
warning: [09:24:58.926] [WARN] [API] Staff notification failed (non-critical)
orderId: 0ca234e0-eb0b-4397-82f6-bfa14bf4f81f
```

Mongo evidence:

- `orders.staffNotifiedAt`: absent/null for the real order.
- `orders.staffNotificationClaimedAt`: absent/null after failure, because `claimAndNotifyStaffOrder` clears the claim in its catch block (`lib/staff-notifications.js` lines 375-380).
- `email_sends`: no staff new-order email row for the real order.

---

## What The Staff Email Would Include If It Sent

From `lib/staff-notifications.js` lines 80-255:

- New pickup/meet-up/delivery order header.
- Order number.
- Fulfillment type and location/window/address.
- Customer name, phone, email.
- Items, quantity, size, line price.
- Total.
- Action-required checklist.
- Order placed timestamp.

Because the template throws before `sendEmail`, none of this reached staff for the verified order.

---

## Is Admin Emailed?

**Intended: yes. Actual verified production order: no.**

Evidence: `STAFF_EMAIL` is configured and `/api/payments` calls the staff notifier, but the notifier throws `ReferenceError: location is not defined` before Resend send.

---

## Is Admin Texted?

**No evidence in the paid checkout path.**

Evidence:

- `STAFF_PHONE` absent in production env.
- `/api/payments` does not call `lib/sms.ts`.
- No SMS row or provider evidence was found in the real-order forensic data.

---

## Is Admin Dashboard Updated?

**Yes, via Mongo order writes, but not pushed.**

Evidence:

- `/api/payments` updates the order to paid/confirmed (`app/api/payments/route.ts` lines 872-904).
- `/api/admin/orders` lists Mongo `orders` sorted by `createdAt` (`app/api/admin/orders/route.ts` lines 82-110).
- Admin pages call this endpoint on page load and manual refresh (`app/admin/orders/page.js` lines 49-72 and 222-229).

Caveat: admin filters/stats can misclassify or miss the order because route/UI filter values are lowercase (`confirmed`, `paid`, `pickup`) while the payment route writes uppercase `CONFIRMED`/`PAID` and fulfillment `pickup_market`.

---

## Is Square Dashboard Relied Upon?

**Yes, as an operational fallback/source of truth.**

Evidence:

- Square payment for the real order is `COMPLETED`.
- Square order is `COMPLETED` with one tender.
- The admin UI labels recent orders as “Recent Orders from Square” and exposes a “Sync from Square” button, but the local sync route is not present in the inspected code tree.

---

## Bottom Line

For the verified production order, admin/staff were **not emailed** and **not texted**. Staff awareness depended on Square dashboard, admin dashboard refresh/unfiltered views, or the client-created queue entry. The code treats staff notification failure as non-critical, so a customer can pay successfully while staff email notification fails.
