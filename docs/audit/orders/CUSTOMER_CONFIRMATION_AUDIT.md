# Customer Confirmation Audit

**Status**: COMPLETE  
**Last Updated**: 2026-06-01  
**Owner**: AMP forensic audit
**Repository**: Gratog-live

---

## Exact Code Path

```text
Square payment completed in /api/payments
  ↓
orders.emailSentAt atomic claim
  ↓
sendOrderConfirmationEmail(order)
  ↓
sendEmail(... emailType=order_confirmation, template=order_confirmation)
  ↓
Resend emails.send(...)
  ↓
email_sends insert with messageId
  ↓
Resend lifecycle events should update email_sends, but local webhook queries resendId not messageId
```

---

## Trigger

- Primary trigger: `app/api/payments/route.ts` lines 963-1029 after Square payment status is `COMPLETED` or `APPROVED`.
- Backup trigger: `app/api/webhooks/square/route.ts` lines 613-648 after a completed `payment.updated`/`payment.completed` webhook, only if `updated` is true and the stale order object had no `emailSentAt`.

---

## Subject, Sender, Recipient, Template

| Field | Evidence |
|---|---|
| Subject | `Order Confirmation #${orderDisplay} - Taste of Gratitude` in `lib/resend-email.js` line 187. Real order subject: `Order Confirmation #0ca234e0-eb0b-4397-82f6-bfa14bf4f81f - Taste of Gratitude`. |
| Sender | `order_confirmation` maps to `Taste of Gratitude Orders <orders@tasteofgratitude.shop>` in `lib/email-config.js` lines 60-64 and `lib/resend-email.js` lines 196-206. |
| Recipient | `order.customer.email` in `lib/resend-email.js` lines 176-206. Real order recipient was the customer email on the order (masked in audit output as `si***@gmail.com`). |
| Template | `generateOrderEmailHTML(order, 'confirmation')` and `generateOrderEmailText(order, 'confirmation')` in `lib/resend-email.js` lines 188-189. Ledger template: `order_confirmation`. |
| Provider | Resend, because production `RESEND_API_KEY` is present. |

---

## Fields Included In Customer Email

From `lib/resend-email.js` lines 314-746:

- Greeting with customer name.
- Order ID / order number value.
- Status text.
- Order date.
- Total.
- Item names, quantities, line prices.
- Fulfillment section for pickup, Dunwoody pickup, delivery, or shipping.
- Pickup instructions for market pickup, including location/instructions.
- Delivery address/instructions when fulfillment is delivery.
- Support contact email and public phone behavior.

Important caveat: the payment info block in `generateOrderEmailHTML` only renders when `order.paymentId` exists (`lib/resend-email.js` lines 429-441). The `/api/payments` caller passes `payment.receiptUrl` inside `order.payment.receiptUrl`, not top-level `order.paymentId`, so the email template may omit the payment-information block even though a receipt URL exists in the caller payload.

---

## Real Order Timing

| Event | Timestamp | Evidence |
|---|---:|---|
| Square payment created | `2026-06-01T09:24:57.807Z` | Square Payments API for `37mljFU1R4iQPWuAI2k7EmSbfRBZY`. |
| Square order closed | `2026-06-01T09:24:58.610Z` | Square Orders API for `jD3YsdMqSEOduv8YLDHh3hVyNWSZY`. |
| Local payment record metadata timestamp | `2026-06-01T09:24:58.653Z` | Mongo `payment_records.metadata.createdAt`. |
| Email claim marker | `2026-06-01T09:24:58.728Z` | Mongo `orders.emailSentAt`. This is a claim marker, not delivery proof. |
| `email_sends` row | `2026-06-01T09:24:58.872Z` | Mongo `email_sends.createdAt`. |
| Resend created | `2026-06-01 09:24:58.992987+00` | Resend GET `/emails/72ef97c9-ff9c-4217-b2bf-70fb53e34a21`. |
| Resend final observed event | `delivered` | Resend GET `last_event=delivered`; exact delivered-at timestamp was not returned by this API response. |

Measured from Square payment created to Resend created: about **1.19 seconds**. Measured from Square order closed to local `email_sends` row: about **0.26 seconds**.

---

## Can Confirmation Fail Silently?

**Yes, partially.** Evidence:

- `/api/payments` sets `emailSentAt` before sending (`app/api/payments/route.ts` lines 971-979).
- If `sendOrderConfirmationEmail` returns failure, the route logs a warning and explicitly does not retry (`app/api/payments/route.ts` lines 1013-1020).
- If any notification exception occurs, `/api/payments` catches it and logs `Notification failed` without failing the payment response (`app/api/payments/route.ts` lines 1024-1029).
- `sendEmail` records failed attempts in `email_sends` when it reaches the Resend call path (`lib/resend-email.js` lines 109-117 and 156-169), so failures are not entirely invisible in DB if the email service is reached.
- However, the order-level `emailSentAt` value can look successful even when the send failed, because it is set before send.

---

## Can Duplicate Confirmations Occur?

**Possible under webhook/API race conditions.** Evidence:

- `/api/payments` uses an atomic `emailSentAt` claim before send, which prevents most duplicates (`app/api/payments/route.ts` lines 971-985).
- The Square webhook fallback does **not** use the same atomic claim before sending. It reads `!order.emailSentAt`, sends, then sets `emailSentAt` only after success (`app/api/webhooks/square/route.ts` lines 613-640).
- If a webhook reads the order before the API claim is visible, the webhook and API can both send.

For the real order, only one `email_sends` row exists for that order, so no duplicate occurred.

---

## Can No Confirmation Be Sent?

**Yes.** Evidence:

- No send occurs if no `customerInfo.email` is present in `/api/payments` (`app/api/payments/route.ts` line 969).
- Resend failure after the pre-send claim will not auto-retry (`app/api/payments/route.ts` lines 1013-1020).
- If the payment route crashes before the email block, the customer relies on the webhook fallback; if the webhook is absent or rejected, no confirmation is sent.

For the real order, a confirmation was sent and Resend reports `delivered`.

---

## Resend Webhook Observability

Local observability is currently incomplete:

- Transactional sends store `messageId` in `email_sends` (`lib/resend-email.js` lines 52-67, 120-126).
- Resend webhook updates by `{ resendId: data.email_id }` (`app/api/webhooks/resend/route.js` lines 70-72 and 105-108).
- The real order email row has `messageId` set and `resendId: null`; its `lastEventType` is still null in Mongo even though Resend API reports `delivered`.

Conclusion: for customer confirmation delivery, Resend itself is the source of lifecycle truth; Mongo `email_sends` proves send attempt/sent status but not delivered lifecycle under the current webhook mapping.
