# Customer Data Completeness Audit

**Status**: COMPLETE  
**Last Updated**: 2026-06-01  
**Owner**: AMP forensic audit
**Repository**: Gratog-live

---

## Real Order Data Availability

Verified real order:

- Local order id: `0ca234e0-eb0b-4397-82f6-bfa14bf4f81f`
- Short customer-facing queue ref: `F4F81F`
- Square payment id: `37mljFU1R4iQPWuAI2k7EmSbfRBZY`
- Square order id: `jD3YsdMqSEOduv8YLDHh3hVyNWSZY`
- Mongo database: `taste_of_gratitude`

Customer PII is masked in this document except where recipients are operational configuration.

---

## Field Completeness Matrix

| Data | Stored immediately after order create? | Stored after payment? | Real order evidence |
|---|---:|---:|---|
| Customer name | Yes | Yes | Present on Mongo order (`namePresent: true`). |
| Customer email | Yes | Yes | Present on Mongo order and payment metadata; email row recipient present. |
| Customer phone | Yes | Yes | Present on Mongo order and payment metadata. |
| Order number | Partially | Partially | `orders.orderNumber` is null for the real order. UI/queue uses id suffix `F4F81F`; email subject used full local order id. |
| Items | Yes | Yes | One item: `Kissed by Gods`, quantity `1`, size `16oz`. |
| Quantity | Yes | Yes | Quantity `1`. |
| Price | Yes | Yes | Unit `11.99`, `priceCents: 1199`, total `11.99`. |
| Payment ID | No | Yes | Mongo `orders.squarePaymentId` and `payment_records.squarePaymentId` set to Square payment id. |
| Payment status | Pending | Yes | Real order ended with `paymentStatus: COMPLETED` after webhook replay; primary route writes `PAID`. |
| Pickup/delivery info | Yes, if provided | Yes | Fulfillment type `pickup_market`; no delivery address for this pickup order. |
| Notes | If provided | If provided | No notes/delivery instructions on real order. |
| Timestamp | Yes | Yes | `createdAt`, `paymentAttemptedAt`, `paidAt`, `emailSentAt`, `paidEffectsAppliedAt`. |
| Square order id | No at initial order create | Yes, before charge | `jD3YsdMqSEOduv8YLDHh3hVyNWSZY`. |
| Square customer id | No | Yes when customer lookup succeeds | `squareCustomerId` present. |
| Receipt URL | No | Yes | Present in Mongo/Square; URL itself not printed here. |
| Card brand/last4 | No | Payment record yes; order card fields incomplete | `payment_records.cardBrand: VISA`; last4 present in payment record. `orders.cardBrand` null after webhook replay due snake/camel field mismatch risk. |
| Queue/fulfillment ref | No | Client-side after payment | `queuepositions.orderRef: F4F81F`, position `1`. |

---

## Data Written By `/api/orders/create`

`app/api/orders/create/route.js` writes:

- `id`
- `customerId`
- `customerEmail`
- `customerName`
- `customerPhone`
- `items[]` with product/variation/catalog ids, name, subtitle, price, quantity, size, category, reward flags
- `subtotal`, `subtotalCents`, `total`, `totalCents`, `tax`, `taxCents`, `currency`
- fulfillment fields (`fulfillmentType`, delivery fields if applicable)
- coupon fields
- `status: pending`
- `paymentStatus: pending`
- `paymentMethod: square_link`
- timestamps
- `rewardPointsEarned`
- `source`, `deviceInfo`, `version`

Evidence: `app/api/orders/create/route.js` lines 81-156.

---

## Data Written By `/api/payments`

`app/api/payments/route.ts` writes after successful Square payment:

- `payment_records`: Square payment id, status, amount, currency, receipt URL/number, card brand/last4, order/customer metadata, idempotency key.
- `orders`: status, payment status, Square payment/order/customer ids, paid timestamp, receipt URL, card summary, updated timestamp.
- `orders.emailSentAt` pre-send claim.
- `orders.staffNotifiedAt` only on successful staff notification; absent for real order.
- `orders.paidEffectsAppliedAt` before rewards/coupon/customer LTV side effects.

Evidence: `app/api/payments/route.ts` lines 820-1192.

---

## Real Order Data Snapshot

| Field | Value / status |
|---|---|
| `orders.id` | `0ca234e0-eb0b-4397-82f6-bfa14bf4f81f` |
| `orders.orderNumber` | null |
| `queuepositions.orderRef` | `F4F81F` |
| `status` | `CONFIRMED` |
| `paymentStatus` | `COMPLETED` after later webhook replay |
| `fulfillmentType` | `pickup_market` |
| Customer name/email/phone | Present (masked in audit output) |
| Item | `Kissed by Gods`, quantity `1`, size `16oz` |
| Total | `$11.99` / `1199` cents |
| Square order | `jD3YsdMqSEOduv8YLDHh3hVyNWSZY` |
| Square payment | `37mljFU1R4iQPWuAI2k7EmSbfRBZY` |
| Square customer id | Present |
| Receipt URL | Present |
| Delivery address | null, expected for pickup order |
| Notes | none observed |
| Staff notified | no |
| Customer confirmation | yes, Resend delivered |

---

## What Information Is Available Immediately After Payment?

Immediately after the `/api/payments` success path completes, staff/admin systems can read from Mongo:

- Customer name/email/phone.
- Items, sizes, quantities, prices, totals.
- Fulfillment type and any provided delivery/pickup fields.
- Square payment id, Square order id, Square customer id.
- Receipt URL.
- Payment status and paid timestamp.
- Email claim/send state.
- Paid side-effect state.

For the real order, the first exact paid-status write timestamp was overwritten later by a webhook replay. The payment-record and email timestamps bound first local paid visibility to no later than `2026-06-01T09:24:58.728Z`.

---

## Data Gaps / Mismatches Proven By Evidence

1. `orders.orderNumber` was null; customer-facing short ref came from queue/id suffix, not an order-number field.
2. Payment status changed from the primary route’s `PAID` write to webhook replay’s `COMPLETED` write.
3. Order-level card fields were incomplete after webhook replay; payment record retained card brand/last4 presence.
4. Staff notification status absent despite successful payment.
5. Resend delivered status did not propagate into Mongo `email_sends.lastEventType` because local webhook uses `resendId` while transactional sends store `messageId`.
