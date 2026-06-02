# Real Order Forensic Replay

**Status**: COMPLETE  
**Last Updated**: 2026-06-01  
**Owner**: AMP forensic audit
**Repository**: Gratog-live

---

## Identifiers

| Label | Value |
|---|---|
| Customer-facing short ref | `F4F81F` |
| Local order id | `0ca234e0-eb0b-4397-82f6-bfa14bf4f81f` |
| Mongo `_id` | `6a1d4fdb7cb286b2b5da6193` |
| Square payment id | `37mljFU1R4iQPWuAI2k7EmSbfRBZY` |
| Square order id | `jD3YsdMqSEOduv8YLDHh3hVyNWSZY` |
| Square customer id | Present (`YQ...` in audit output) |
| Resend message id | `72ef97c9-ff9c-4217-b2bf-70fb53e34a21` |
| Queue row `_id` | `6a1d4fed7cb286b2b5da619b` |

Note: `F4F81F` is the suffix/queue `orderRef`, not `orders.orderNumber`; `orders.orderNumber` was null.

---

## Reconstructed Timeline

| Timestamp UTC | Event | Evidence |
|---:|---|---|
| `2026-06-01T09:24:43.273Z` | Order create API request returned 200 | Vercel logs, `/api/orders/create`. |
| `2026-06-01T09:24:43.962Z` | Order saved in Mongo | `orders.createdAt`. |
| `2026-06-01T09:24:56.569Z` | Payment API request returned 200; staff notification failure logged | Vercel logs, `/api/payments`. |
| `2026-06-01T09:24:56.997Z` | Payment attempt recorded | `orders.paymentAttemptedAt`. |
| `2026-06-01T09:24:57.341Z` | Square order created | Square Orders API. |
| `2026-06-01T09:24:57.807Z` | Square payment created/completed | Square Payments API, status `COMPLETED`. |
| `2026-06-01T09:24:58.610Z` | Square order closed/completed | Square Orders API. |
| `2026-06-01T09:24:58.653Z` | Local payment record created metadata | `payment_records.metadata.createdAt`. |
| `2026-06-01T09:24:58.728Z` | Customer email send claim marker | `orders.emailSentAt`. |
| `2026-06-01T09:24:58.872Z` | `email_sends` row inserted | Mongo `email_sends.createdAt`. |
| `2026-06-01T09:24:58.926Z` | Staff notification warning timestamp + paid side effects claim | Vercel log detail; `orders.paidEffectsAppliedAt`. |
| `2026-06-01T09:24:58.981Z` | Customer LTV updated | `customers.lastPaidAt`. |
| `2026-06-01 09:24:58.992987+00` | Resend email created | Resend API. |
| `2026-06-01T09:25:01.595Z` | Queue join API returned 200 | Vercel logs, `/api/queue/join`. |
| `2026-06-01T09:25:01.863Z` | Queue row created | `queuepositions.createdAt`. |
| `2026-06-01T09:27:12.805Z` | Square webhook replay request returned 200 | Vercel logs, `/api/webhooks/square`. |
| `2026-06-01T09:27:13.039Z` | `paidAt` overwritten by webhook replay | `orders.paidAt`. |
| `2026-06-01T09:27:13.047Z` | Order timeline entry via Square webhook | `orders.timeline[0]`. |
| `2026-06-01T09:27:13.060Z` | Webhook event row stored | `webhook_events_processed.processedAt`. |

---

## Payment Facts

Square payment API for `37mljFU1R4iQPWuAI2k7EmSbfRBZY` returned:

- `status: COMPLETED`
- `amount_money: 1199 USD`
- `total_money: 1199 USD`
- `receipt_number: 37ml`
- `receipt_url`: present
- `order_id: jD3YsdMqSEOduv8YLDHh3hVyNWSZY`
- `reference_id: 0ca234e0-eb0b-4397-82f6-bfa14bf4f81f`
- `buyer_email_address`: present
- `card_details.status: CAPTURED`
- `card_brand: VISA`
- last4 present, not printed here

---

## Order Facts

Square order API for `jD3YsdMqSEOduv8YLDHh3hVyNWSZY` returned:

- `state: COMPLETED`
- `location_id: L66TVG6867BG9`
- `reference_id: 0ca234e0-eb0b-4397-82f6-bfa14bf4f81f`
- `source.name: tog`
- `total_money: 1199 USD`
- `tendersCount: 1`
- `lineItems`: one item, `Kissed by Gods`, quantity `1`, base price `1199 USD`, catalog object present
- `fulfillments: []`
- `metadata.localOrderId`: local order id
- `metadata.source`: `gratog_web`

---

## Mongo Order Facts

Mongo `orders` for the real order contained:

- `status: CONFIRMED`
- `paymentStatus: COMPLETED` after webhook replay
- `fulfillmentType: pickup_market`
- customer name/email/phone present
- one item: `Kissed by Gods`, quantity `1`, size `16oz`, price `11.99`
- `total: 11.99`, `totalCents: 1199`
- Square order/payment/customer ids present
- receipt URL present
- `emailSentAt` present
- `staffNotifiedAt` absent
- `paidEffectsAppliedAt` present
- one timeline row: `Status updated via Square webhook`

---

## Reward / Customer / Queue Facts

| Area | Evidence |
|---|---|
| Rewards | `rewards` query for this order/customer returned 0 matching docs. |
| Gratitude transactions | `gratitude_transactions` query returned 0 matching docs. |
| Customer LTV | One `customers` document matched; `totalOrders: 1`, `totalSpent: 11.99`, `lastPaidOrderId` set to this order, `lastPaidAt: 2026-06-01T09:24:58.981Z`. |
| Queue | `queuepositions` row exists with `orderRef: F4F81F`, `marketId: serenbe`, `status: queued`, `position: 1`. |

---

## Customer Email Facts

Mongo `email_sends` for the real order:

- `to`: customer email present
- `from`: `Taste of Gratitude Orders <orders@tasteofgratitude.shop>`
- `subject`: `Order Confirmation #0ca234e0-eb0b-4397-82f6-bfa14bf4f81f - Taste of Gratitude`
- `template`: `order_confirmation`
- `emailType`: `order_confirmation`
- `provider`: `resend`
- `messageId`: `72ef97c9-ff9c-4217-b2bf-70fb53e34a21`
- `status`: `sent`
- `createdAt`: `2026-06-01T09:24:58.872Z`
- `lastEventType`: null in Mongo

Resend API for that message:

- HTTP `200`
- `created_at`: `2026-06-01 09:24:58.992987+00`
- `last_event`: `delivered`
- HTML and text bodies present

---

## Admin Notification Facts

- No staff email row exists in `email_sends` for this order.
- `orders.staffNotifiedAt` is absent/null.
- Production Vercel log proves staff notification failed with `ReferenceError: location is not defined` while `/api/payments` still returned 200.

---

## Forensic Conclusion

The order was paid, stored, customer-confirmed, and queue-visible. Staff/admin email notification failed in production and did not block the payment response. The Square webhook record for this order is a later replay/reconciliation event, not evidence of immediate live webhook-driven notification.
