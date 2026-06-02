# Order Failure Analysis

**Status**: COMPLETE  
**Last Updated**: 2026-06-01  
**Owner**: AMP forensic audit
**Repository**: Gratog-live

---

## Failure Mode Matrix

| Scenario | Observed / inspected behavior | Can order still be fulfilled? | Can order be lost? | Can customer pay without staff knowing? |
|---|---|---:|---:|---:|
| Resend outage during customer confirmation | `sendEmail` records failed row if reached; `/api/payments` already set `emailSentAt` and does not retry | Yes, if Mongo/Square updated | No, payment/order remain | Yes, customer may not receive confirmation; staff alert separately broken |
| Staff email failure | Proven real-order failure: `ReferenceError: location is not defined`; `/api/payments` returned 200 | Yes through Square/Mongo/queue | No | Yes |
| Square webhook outage | Primary `/api/payments` updates Mongo and sends customer email without webhook | Yes for orders paid through `/api/payments` | External Square-only orders can be absent locally | Yes if staff relies on webhook backup |
| Mongo unavailable before charge | `/api/payments` fails fast before Square charge if DB connection fails | No new paid order | No charge should occur | No payment should occur |
| Mongo update fails after Square charge | Payment can complete; payment record/order update failures are logged but not fully transactionally guaranteed | Via Square yes; local admin may miss | Locally possible; Square still source | Yes |
| Email failure after claim | `emailSentAt` prevents automatic retry | Yes | No | Staff may not know; customer may not know |
| Duplicate payment request | Existing payment lookup and stable Square idempotency key reduce double-charge risk | Yes | No | No additional notification guarantee |
| Duplicate Square webhook same event id | `webhook_events_processed` dedupes by event id | Yes | No | No |
| Square webhook processing error | Error row inserted, 500 returned; retry with same event id would be treated as already processed | Depends on primary path | Possible for webhook-only external orders | Yes |
| Admin dashboard outage | Square dashboard still has order; customer email may exist | Yes through Square/customer | No | Yes if no one monitors Square/email |
| Client-side queue join failure | `addOrderToQueue` catches and returns null; payment still succeeds | Yes via Square/Mongo | No | Staff/vendor queue may miss it |

---

## Proven Failure: Staff Notification

Evidence:

- Production Vercel `/api/payments` log: `ReferenceError: location is not defined`.
- `lib/staff-notifications.js` plain-text template references undefined `location`, `pickupTime`, `readyBy`.
- `/api/payments` catches staff notification errors as non-critical (`app/api/payments/route.ts` lines 1059-1064).
- Real order has no `staffNotifiedAt` and no staff `email_sends` row.

Impact:

- Customer can pay without staff email notification.
- This is systemic because the undefined variables are unconditional in the text template.

---

## Resend Outage / Customer Confirmation Failure

Code behavior:

- `sendEmail` catches Resend errors and inserts `email_sends` with `status: failed` if DB recording succeeds (`lib/resend-email.js` lines 109-117, 156-169).
- `/api/payments` does not fail the payment response on notification failure (`app/api/payments/route.ts` lines 1024-1029).
- `emailSentAt` is set before send and not automatically cleared on failure (`app/api/payments/route.ts` lines 971-1020).

Impact:

- Paid order remains fulfillable through Square/Mongo.
- Customer can pay without receiving confirmation.
- Local order can look “email claimed” even if Resend failed.

---

## Square Webhook Outage

Code behavior:

- `/api/payments` does not require a webhook to mark paid, write payment record, send customer email, attempt staff email, or run side effects.
- `payment.updated` webhook is only backup/reconciliation and customer fallback; it does not notify staff.
- `order.updated` webhook has backup staff notification, but only for Square order events and uses the broken staff helper.

Impact:

- Orders paid through Gratog checkout remain visible without webhook if `/api/payments` completes.
- Orders paid directly in Square or outside Gratog checkout may not appear in local Mongo without a working webhook/sync path.

---

## Mongo Delay / Failure

Before charge:

- `/api/payments` connects to DB before charge and returns `DB_UNAVAILABLE` on connection failure (`app/api/payments/route.ts` lines 200-250).

After charge:

- Payment record insert is wrapped but failure is logged/alerted; payment continues (`app/api/payments/route.ts` lines 820-870).
- Order status update failure after successful payment is logged/Sentry, but the route continues to later blocks (`app/api/payments/route.ts` lines 872-904).

Impact:

- Pre-charge DB failure is safe.
- Post-charge DB write failure can create Square-paid order with degraded local visibility.

---

## Duplicate Payment Webhook

Same Square event id:

- Deduped and returns cached response.

Different event id for same payment:

- Can process again.
- Status precedence avoids downgrades, but same-status updates/timeline writes can repeat.
- Customer duplicate email possible under API/webhook race because webhook lacks pre-send atomic email claim.

---

## Admin Dashboard Outage

If admin dashboard is down:

- Square dashboard still has the completed payment/order.
- Customer confirmation can still be delivered.
- Queue position may exist for pickup if browser join succeeds.
- Staff email cannot be relied on because it currently fails.

Therefore, fulfillment can continue only if staff checks Square or customer messages, not from Gratog alerting.

---

## Top Failure Risks Proven Or Supported

1. Staff email always fails before send due undefined variables.
2. Payment success does not require staff notification success.
3. Customer email failure does not fail payment and does not auto-retry.
4. `emailSentAt` is a pre-send claim, not proof of delivery.
5. Resend lifecycle webhook does not update transactional rows because of `resendId`/`messageId` mismatch.
6. Webhook error rows suppress same-event retries.
7. `payment.updated` webhook cannot notify staff.
8. Admin filters can miss normal uppercase paid statuses/`pickup_market` fulfillment.
9. Client-side queue join is silent-fail and not server-guaranteed.
10. First paid status timestamp is not preserved after webhook replay overwrites `paidAt`/`updatedAt`.
