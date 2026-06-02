# Order Notification Scorecard

**Status**: COMPLETE  
**Last Updated**: 2026-06-01  
**Owner**: AMP forensic audit
**Repository**: Gratog-live

**Remediation Plan**: [Order Notification Fix Plan](./ORDER_NOTIFICATION_FIX_PLAN.md)

---

## Grades

| Area | Grade | Evidence |
|---|---:|---|
| Customer Confirmation | **B** | Real order email sent and Resend reports delivered in ~1.2s after Square payment creation. Downgraded because `emailSentAt` is pre-send, no auto-retry, and local webhook lifecycle updates are broken. |
| Admin Notification | **F** | Real order staff notification failed in production with `ReferenceError: location is not defined`; no `staffNotifiedAt`; no staff email row; no SMS path. |
| Order Visibility | **B-** | Square and Mongo have the order quickly; admin dashboard can show it after refresh. Downgraded for no push alert, filter/status mismatches, missing phone in admin API list, and client-side queue dependency. |
| Square Integration | **B** | Production Square config valid; real Square payment/order completed. Downgraded because webhook evidence is delayed/manual-looking and Square metadata/order fulfillments are incomplete. |
| Webhook Reliability | **C-** | Signature validation and event dedupe exist. Downgraded because error rows suppress retry, `payment.updated` cannot notify staff, and observed real-order webhook was a later replay. |
| Data Completeness | **B-** | Customer, item, payment, totals, Square ids present. Downgraded because `orders.orderNumber` null, order-level card fields incomplete after webhook replay, and first paid timestamp overwritten. |
| Fulfillment Readiness | **C** | Staff can fulfill through Square/Mongo/queue if actively monitored. Downgraded because staff alert failed and vendor active queue route probed as 404. |
| Failure Recovery | **C-** | Payment idempotency and DB pre-charge safety are good. Downgraded because notification retry/reconciliation is weak and staff failure is silent to customer/admin workflow. |

---

## Final Questions — Evidence Answers

### 1. What exact notifications are sent after an order?

For the verified order:

- Customer order confirmation email via Resend: **sent and delivered**.
- Staff/admin email: **attempted but failed before send**.
- Admin SMS/text: **no evidence sent**.
- Queue/customer page: **queue row created client-side**, not a staff notification.

### 2. Who receives them?

- Customer confirmation recipient: customer email on the order.
- Intended staff email recipients from production `STAFF_EMAIL`: `jenneisha.glover@gmail.com`, `silverwatkins@gmail.com`.
- Actual staff recipients for verified order: none, because send failed before Resend.

### 3. How quickly are they received?

- Customer email: Resend object created about **1.19 seconds** after Square payment creation; Resend reports `delivered` but exact delivered-at timestamp was not returned.
- Staff email: never received for verified order.

### 4. What customer information is included?

- In customer email: customer name greeting; customer email as recipient; no phone in the core summary except support contact behavior.
- In staff email template if it worked: customer name, phone, email.
- In Mongo/Square metadata: customer name/email/phone present in local metadata; Square buyer email and customer id present.

### 5. What order information is included?

- Customer email includes order id, status, date, total, item names/quantities/prices, fulfillment instructions.
- Staff email template would include order number/ref, fulfillment details, customer contact, items/quantities/sizes, total, action checklist.
- Square includes completed order/payment, line item, amount, receipt, tender.

### 6. Can staff see orders immediately?

Yes if staff checks Square or refreshes unfiltered admin orders. No automatic staff email/text alert is reliable right now.

### 7. Can staff fulfill immediately?

Yes from Square/Mongo data, but operationally only if staff actively monitors those surfaces. Alert-driven fulfillment is not ready.

### 8. Can a customer pay without admin knowing?

Yes. The verified order did exactly that for the staff email channel: `/api/payments` returned 200, customer payment completed, staff email failed, and `staffNotifiedAt` stayed absent.

### 9. Can a customer pay without receiving confirmation?

Yes. Resend failure after `emailSentAt` claim would not block payment or auto-retry. For the verified order, the customer confirmation was delivered.

### 10. Can notifications fail silently?

Yes. Staff failure is logged but non-critical and produces no `email_sends` row because it fails before send. Customer email failure can be recorded as failed if Resend is reached, but order-level `emailSentAt` can still look successful.

### 11. Is Square the source of truth?

For payment: **yes**. Square payment/order completion is authoritative for money movement. Gratog Mongo is the operational mirror for site/admin/customer pages.

### 12. Is Gratog ready for live market order volume?

**Not as an alert-driven order operation.** Payment and customer confirmation worked for the test order, but staff notification failed, admin visibility requires active monitoring, and queue/admin routes have gaps.

### 13. What are the top 10 order-notification risks?

1. Staff notification throws before send for every order path that uses `notifyStaffPickupOrder`.
2. `/api/payments` returns success even when staff notification fails.
3. No admin SMS/text fallback in the paid checkout path.
4. Customer email `emailSentAt` is set before send and blocks automatic retry.
5. Resend webhook updates `resendId`, while transactional sends store `messageId`.
6. `payment.updated` webhooks do not notify staff.
7. Square webhook error rows suppress same-event retry processing.
8. Admin orders filters/stats can miss uppercase paid statuses and `pickup_market` fulfillment.
9. Queue join is client-side and can silently fail after payment.
10. Staff/vendor active queue endpoint probed as 404, reducing live queue operational value.

### 14. What are the top 10 improvements?

1. Fix staff notification template variables and prove staff Resend row delivery.
2. Add durable staff notification status/error rows per order.
3. Make staff notification retryable without blocking payment.
4. Add SMS/push fallback for paid order alerts.
5. Move market queue insertion server-side into the paid-order path.
6. Normalize order/payment/fulfillment statuses across API, admin UI, and webhook handlers.
7. Preserve first paid timestamp separately from webhook reconciliation timestamps.
8. Fix Resend webhook correlation to update transactional email rows by `messageId`/Resend id.
9. Make webhook retry dedupe status-aware so failed events can be retried.
10. Add an authenticated, tested Square order sync route or remove the broken UI dependency.

### 15. Exact Current Order-Notification Architecture

```text
╭──────────────────╮
│ Customer browser │
╰────────┬─────────╯
         │ POST /api/orders/create
         ▼
╭──────────────────────╮
│ Mongo orders: pending│
╰────────┬─────────────╯
         │ Square SDK token + POST /api/payments
         ▼
╭──────────────────────╮        ╭──────────────────────╮
│ Gratog /api/payments │───────▶│ Square payment/order │
╰────────┬─────────────╯        ╰──────────┬───────────╯
         │                                 │
         ├────────▶ Mongo payment_records   │
         ├────────▶ Mongo orders paid       │
         ├────────▶ Resend customer email   │
         ├────X───▶ Staff email fails       │
         └────────▶ Side effects/queue path │
                                           │
                                           ▼
                                  ╭──────────────────╮
                                  │ Square webhooks  │
                                  ╰────────┬─────────╯
                                           │ POST /api/webhooks/square
                                           ▼
                                  ╭──────────────────────╮
                                  │ Mongo reconciliation │
                                  │ customer fallback    │
                                  │ staff only on order.*│
                                  ╰──────────────────────╯

╭────────────╮       refresh/fetch       ╭──────────────╮
│ Staff/admin│──────────────────────────▶│ /admin/orders│
╰────────────╯                           ╰──────────────╯
       │                                         │
       └──────────── checks Square manually ◀────┘
```

---

## Bottom Line Score

Overall order notification readiness: **C-**.

Payment and customer confirmation are proven for the test order. Staff/admin notification is not production-ready because the only configured immediate staff email path failed in production and was treated as non-critical.
