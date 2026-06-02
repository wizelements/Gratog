# Square Webhook Audit

**Status**: COMPLETE  
**Last Updated**: 2026-06-01  
**Owner**: AMP forensic audit
**Repository**: Gratog-live

---

## Webhook Endpoints Found

| Endpoint | File | Purpose | Status |
|---|---|---|---|
| `/api/webhooks/square` | `app/api/webhooks/square/route.ts` | Main Square webhook handler for payment/order/refund/inventory/catalog events | Active code path; one real-order replay row observed. |
| `/api/gratitude/webhook` | `app/api/gratitude/webhook/route.ts` | Separate Square payment webhook for gratitude credits | Does not drive order notifications; catches errors and returns 200. |

---

## Event Types Handled By Main Square Webhook

`app/api/webhooks/square/route.ts` lines 431-462 handles:

- `payment.created`
- `payment.updated`
- `payment.completed`
- `refund.created`
- `refund.updated`
- `inventory.count.updated`
- `catalog.version.updated`
- `order.created`
- `order.updated`

The requested event names map as follows:

| Requested event | Handled? | Notes |
|---|---:|---|
| `payment.created` | Yes | Calls `handlePaymentCreated`. |
| `payment.updated` | Yes | Calls `handlePaymentUpdated`. |
| `order.created` | Yes | Calls `handleOrderEvent`. |
| `order.updated` | Yes | Calls `handleOrderEvent`. |
| `refund.updated` | Yes | Calls `handleRefundEvent`. |

---

## Signature Validation

Main Square webhook:

- Uses `x-square-hmacsha256-signature` / `X-Square-HmacSha256-Signature` (`app/api/webhooks/square/route.ts` lines 339-342).
- Computes HMAC-SHA256 over `request.url + rawBody` using `SQUARE_WEBHOOK_SIGNATURE_KEY` (`app/api/webhooks/square/route.ts` lines 56-98).
- Rejects missing/invalid signatures with 401 outside local skip mode (`app/api/webhooks/square/route.ts` lines 344-375).
- Production env has `SQUARE_WEBHOOK_SIGNATURE_KEY` present.

Gratitude webhook:

- Uses `x-square-signature`, not the same header as the main webhook (`app/api/gratitude/webhook/route.ts` line 17).
- Rebuilds raw body with `JSON.stringify(body)`, which is not equivalent to Square raw-body signature verification (`app/api/gratitude/webhook/route.ts` lines 18-31).
- On catch, returns 200 so Square does not retry (`app/api/gratitude/webhook/route.ts` lines 116-124).

---

## Idempotency / Replay Handling

Main webhook event dedupe:

- Checks `webhook_events_processed` by `eventId` (`app/api/webhooks/square/route.ts` lines 414-426).
- Inserts success rows after processing (`app/api/webhooks/square/route.ts` lines 464-471).
- Inserts error rows on handler failure, then returns 500 (`app/api/webhooks/square/route.ts` lines 473-504).

Replay risk:

- Same `eventId`: duplicate is skipped.
- Different `eventId` replay for same Square payment: can process again. Status precedence prevents most downgrades, but timeline/status update can still be appended/overwritten if status is same.
- Error rows are also treated as already processed on retry because dedupe does not check `status`. A Square retry after an error can receive cached success without reprocessing.

Payment route idempotency:

- Uses stable server idempotency key `pay_${orderId.slice(0, 36)}` for Square payment (`app/api/payments/route.ts` lines 420-427, 760-770).
- Blocks existing successful local payment records (`app/api/payments/route.ts` lines 320-387).

---

## Database Updates By Event

| Event | DB effect | Notification effect |
|---|---|---|
| `payment.created` | Finds local order, sets `payment_processing` and `paymentStatus: processing` (`app/api/webhooks/square/route.ts` lines 543-558). | None. |
| `payment.updated` / `payment.completed` | Updates order status/payment fields with precedence (`app/api/webhooks/square/route.ts` lines 561-651). | Customer confirmation fallback only; no staff notification. |
| `refund.created` / `refund.updated` | Marks order refunded when refund status is completed (`app/api/webhooks/square/route.ts` lines 653-719). | None. |
| `order.created` / `order.updated` | Finds local order by Square order id; backup staff notification if it thinks order is paid (`app/api/webhooks/square/route.ts` lines 725-778). | Staff backup only, but calls the same broken staff helper. |
| `inventory.count.updated` | Updates `square_inventory`, `inventory`, `unified_products`, catalog stock fields (`app/api/webhooks/square/route.ts` lines 868-929). | None. |
| `catalog.version.updated` | Catalog sync/revalidation path after line 930. | None. |

---

## Real Order Webhook Evidence

Observed in production Mongo `webhook_events_processed`:

```json
{
  "eventId": "release-verify-replay-1780306032574",
  "eventType": "payment.updated",
  "processedAt": "2026-06-01T09:27:13.060Z",
  "status": "success",
  "result": { "success": true, "message": "Payment COMPLETED processed" }
}
```

Observed in production Vercel logs:

- `/api/webhooks/square` returned 200 at `2026-06-01T09:27:12.805Z`.

Important limits of this evidence:

- The event id `release-verify-replay-...` is manual/replay-looking; it is not proof that Square's live immediate webhook fired at checkout time.
- The event type was `payment.updated`; that handler does not call staff notification.
- This replay updated the order timeline and overwrote `orders.paidAt` to `2026-06-01T09:27:13.039Z`, later than the actual Square payment time.

---

## Can Webhook Failure Cause Missed Notifications?

**Yes, depending on which path is relied on.**

- Primary `/api/payments` path sends the customer confirmation without waiting for webhook, so a webhook failure does not prevent customer confirmation if `/api/payments` completes.
- `payment.updated` webhook can send customer fallback if the primary route did not set `emailSentAt`, but it does not notify staff.
- `order.updated` webhook has a backup staff notification branch, but it calls the same broken staff helper and has paid-status checks that can miss `CONFIRMED`/`PAID` normal route state.
- External Square orders not created through `/api/payments` depend on webhook or sync to appear in Mongo; webhook failure can leave them absent locally.

---

## Can Webhook Replay Create Duplicates?

**Same event id: no. Different event id for same payment: possible side effects.**

- Same event id is deduped by `webhook_events_processed.eventId`.
- Different event id can run again. Status precedence reduces damage, but timeline/status fields can still be rewritten for same-status updates.
- Customer email duplicate is possible under API/webhook race because the webhook fallback does not atomically claim `emailSentAt` before sending.
- Staff duplicates are currently blocked by failure before send; if the helper worked, dedupe would depend on `staffNotifiedAt`/claim logic.

---

## Bottom Line

The primary paid-order communication path does not depend on Square webhooks. Webhooks are a backup/reconciliation mechanism, but the observed real-order webhook was delayed/manual-looking and did not notify staff. Webhook error handling has a retry-suppression risk because error rows are treated as already processed on subsequent retries.
