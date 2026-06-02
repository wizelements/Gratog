# Fulfillment Readiness Audit

**Status**: COMPLETE  
**Last Updated**: 2026-06-01  
**Owner**: AMP forensic audit
**Repository**: Gratog-live

---

## If A Customer Orders Right Now, Can Staff Fulfill Immediately?

**Conditional yes, but not from notifications alone.** A paid order is available in Square and Mongo quickly, but staff email notification is broken and admin dashboard visibility requires opening/refreshing the dashboard or using Square/queue.

---

## Fulfillment Surfaces

| Surface | Real order status | Evidence | Readiness impact |
|---|---|---|---|
| Square dashboard | Payment/order completed | Square payment status `COMPLETED`; Square order state `COMPLETED`; receipt present | Staff can fulfill if they monitor Square. |
| Mongo `orders` | Order present and paid/confirmed | `orders` has customer, item, total, Square ids, receipt, fulfillment type | Admin dashboard can show it after fetch. |
| Admin orders page | Reads Mongo orders | `app/api/admin/orders/route.ts` lines 82-110 | Unfiltered list should show order; filters can miss uppercase `CONFIRMED`/`PAID` or `pickup_market`. |
| Staff email | Failed | Vercel `/api/payments` log: `ReferenceError: location is not defined`; no `staffNotifiedAt` | Not fulfillment-ready as alert channel. |
| SMS/admin text | No evidence | `STAFF_PHONE` absent; `/api/payments` does not call SMS | Not available. |
| Queue | Real order queue row exists | `queuepositions.orderRef: F4F81F`, `marketId: serenbe`, `position: 1` | Useful at market, but client-side post-payment and silent-fail. |
| Customer confirmation | Delivered | Resend API `last_event=delivered` | Customer can present confirmation/order ref. |

---

## What Staff Can See Immediately After Purchase

From local Mongo/admin data:

- Customer name/email/phone.
- Item: `Kissed by Gods`, quantity `1`, size `16oz`.
- Total `$11.99`.
- Fulfillment type `pickup_market`.
- Square order id and payment id.
- Receipt URL present.
- Payment verified as completed/paid.
- Queue ref `F4F81F` if browser-side queue join succeeds.

From Square:

- Completed order/payment.
- Tender and receipt.
- Item line.
- Buyer/customer linkage.

Not available via staff email for this order:

- No staff inbox alert.
- No staff notification timestamp.

---

## Admin Dashboard Caveats

Admin order API sanitizes and returns:

- `_id`, `id`, `orderNumber`, `status`, `fulfillmentType`, `customerName`, masked `customerEmail`, `total`, item names/quantities, `createdAt`, `updatedAt`, `squareOrderId`.

Evidence: `app/api/admin/orders/route.ts` lines 93-110.

Caveats:

- It does not include customer phone in the sanitized API response even though the UI attempts to display `order.customerPhone || order.customer?.phone` (`app/admin/orders/page.js` lines 420-444). That means phone buttons may not appear from this API payload.
- Payment filter expects `COMPLETED`, `APPROVED`, or `paid` (`app/admin/orders/page.js` lines 179-182). The primary route writes `PAID`, and webhook replay changed this order to `COMPLETED`; without webhook replay, this filter can misclassify paid orders.
- Fulfillment filter UI uses `pickup`/`delivery`, while checkout writes `pickup_market`/`pickup_dunwoody`; pickup counts/filters can undercount.

---

## Queue Caveats

Queue join path:

- `ReviewAndPay.tsx` calls `addOrderToQueue` only after client-side payment success redirect delay.
- `addOrderToQueue` silently returns null on failure (`lib/queue-integration.js` lines 6-39).
- `/api/queue/join` writes `queuepositions` (`app/api/queue/join/route.js` lines 41-64).

Production probe result:

- `/api/queue/active?marketId=serenbe` returned 404.

Real order evidence:

- `/api/queue/join` returned 200.
- `/api/queue/position/<orderId>` returned repeated 200s.

Conclusion: customer queue position worked for this order, but the staff/vendor active queue route referenced by `app/vendor/queue/page.tsx` and `app/admin/queue/page.js` was not present/returned 404 in production.

---

## Fulfillment Readiness Answer

| Question | Answer |
|---|---|
| Order visible in admin? | Yes in unfiltered Mongo-backed admin orders after fetch/refresh; filtered views have mismatch risks. |
| Order visible in database? | Yes. |
| Order visible in Square? | Yes. |
| Customer contact available? | Yes in Mongo; admin API masks email and does not return phone in sanitized list. |
| Items visible? | Yes in Mongo and Square. |
| Payment verified? | Yes in Square and Mongo payment record. |
| Staff alerted immediately? | No; staff email failed and SMS absent. |

---

## Bottom Line

Staff can fulfill immediately if they actively monitor Square, the unfiltered admin dashboard, or the customer/queue record. Gratog is not fulfillment-ready as an alert-driven workflow because the staff notification path failed for the verified paid order.
