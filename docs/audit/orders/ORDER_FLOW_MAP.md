# Order Flow Map

**Status**: COMPLETE  
**Last Updated**: 2026-06-01  
**Owner**: AMP forensic audit
**Repository**: Gratog-live

---

## Evidence Sources

- Production site: `https://tasteofgratitude.shop`
- Production deployment observed in Vercel logs: `dpl_3KadVX1rVwUeZC9w7x21dUkeL8oE`
- Production config probe: `/api/square/config` returned `environment: production`, `locationId: L66TVG6867BG9`, Square SDK `https://web.squarecdn.com/v1/square.js`.
- Production DB: Mongo database `taste_of_gratitude`.
- Real order: local order id `0ca234e0-eb0b-4397-82f6-bfa14bf4f81f`; customer-facing short ref `F4F81F`; Square payment id `37mljFU1R4iQPWuAI2k7EmSbfRBZY`; Square order id `jD3YsdMqSEOduv8YLDHh3hVyNWSZY`.

---

## Current Production Path

```text
Product/catalog
  ↓
Checkout UI (/checkout)
  ↓
services/order.ts → POST /api/orders/create
  ↓
Mongo orders insert: pending / paymentStatus pending
  ↓
SquarePaymentForm.tsx → Square Web Payments SDK token
  ↓
POST /api/payments
  ↓
Square customer lookup/create
  ↓
Square order create
  ↓
Square payment create/autocomplete
  ↓
Mongo payment_records insert + orders paid update
  ↓
Customer email claim + Resend order confirmation
  ↓
Staff notification attempt (currently fails)
  ↓
Paid-once side effects: inventory, rewards/LTV/coupon
  ↓
Client-side queue join for market pickup
  ↓
Customer queue/success page and admin visibility by refresh
```

---

## Step-by-Step Map

| Step | File / function | Trigger | Data written | Notification sent | Failure risk |
|---|---|---|---|---|---|
| Checkout page loads | `app/checkout/page.tsx` → `CheckoutRoot` | Customer opens `/checkout` | None | None | Checkout is client-driven; if browser fails after payment, queue join can be skipped. |
| Customer validates cart/details | `components/checkout/CheckoutRoot.tsx` | Customer moves through cart/details/review | Local checkout store only | None | Client validation does not notify staff. |
| Order created | `components/checkout/ReviewAndPay.tsx` calls `createOrder` | Customer clicks proceed to payment | None directly | None | Order exists before payment. |
| API order creation | `services/order.ts:createOrder` → `POST /api/orders/create` | Browser fetch | Payload includes customer name/email/phone, fulfillment, cart, coupon/tip | None | Request timeout can prevent order creation. |
| Mongo pending order insert | `app/api/orders/create/route.js` lines 78-156, 161 | API receives valid cart/customer | `orders`: `id`, `customerEmail`, `customerName`, `customerPhone`, `items`, totals, `fulfillmentType`, `status: pending`, `paymentStatus: pending`, timestamps | None | Paid notification cannot happen here by design. |
| Order access token minted | `app/api/orders/create/route.js` lines 167-186 | Successful order insert | Response-only token, no notification | None | Token expiration blocks payment access. |
| Square SDK tokenizes card | `components/checkout/SquarePaymentForm.tsx` lines 65-150 | Customer clicks pay | No DB write | None | SDK/config failure stops payment before charge. |
| Payment API starts | `app/api/payments/route.ts` lines 104-183 | Browser posts Square token | None yet | None | Missing `sourceId`, amount, order id, or auth blocks payment. |
| Fetch pending order | `app/api/payments/route.ts` lines 253-318 | Payment request | None | None | Missing order blocks charge, preventing orphan payment. |
| Atomic processing claim | `app/api/payments/route.ts` lines 420-496 | Valid payable order | `orders.status = payment_processing`, `paymentStatus = processing`, `paymentAttemptedAt`, idempotency key | None | Concurrent requests return conflict. |
| Amount validation | `app/api/payments/route.ts` lines 498-566 | After claim | Can reset order to pending on mismatch | None | Amount mismatch blocks charge. |
| Square customer | `app/api/payments/route.ts` lines 568-595 | Customer email present | Square customer may be created/found; later stored as `squareCustomerId` | None | Lookup failure is non-blocking. |
| Square order | `app/api/payments/route.ts` lines 597-744 | No existing Square order id | `orders.squareOrderId` after Square order creation | None | If Square order creation fails, payment is refused. |
| Square payment | `app/api/payments/route.ts` lines 746-818 | Square order id exists | Square payment in Square | None | If payment fails, order reset to pending/payment error. |
| Payment record | `app/api/payments/route.ts` lines 820-870 | Square payment success | `payment_records` document with Square payment id, amount, receipt, card summary, order/customer metadata | None | Failure logs critical but payment may still be completed. |
| Paid order update | `app/api/payments/route.ts` lines 872-904 | Square payment success | `orders.status = CONFIRMED`, `paymentStatus = PAID`, `squarePaymentId`, `paidAt`, receipt/card fields | None | If update fails, payment can exist without local paid visibility. |
| Inventory decrement | `app/api/payments/route.ts` lines 906-961 | Completed payment | First-party inventory decrement | None | Failure is logged; one 5-second retry is scheduled. |
| Customer confirmation | `app/api/payments/route.ts` lines 963-1029 → `lib/resend-email.js` lines 176-206 | Completed payment + customer email | `orders.emailSentAt` claim before send; `email_sends` row after Resend attempt | Customer email via Resend | `emailSentAt` is set before send; failed send does not auto-retry. |
| Staff/admin notification | `app/api/payments/route.ts` lines 1031-1064 → `lib/staff-notifications.js` lines 338-382 | Completed payment | Intended `staffNotifiedAt` on success | Intended staff email to `STAFF_EMAIL` | Currently fails before Resend send because plain-text template references undefined `location`, `pickupTime`, `readyBy`. `/api/payments` still returns 200. |
| Paid-once effects | `app/api/payments/route.ts` lines 1066-1192 | Completed payment | `paidEffectsAppliedAt`; reward/customer/coupon updates | None | Customer LTV update lacks upsert; depends on existing customer doc. |
| Client queue join | `components/checkout/ReviewAndPay.tsx` lines 141-201 → `lib/queue-integration.js` lines 6-39 → `/api/queue/join` | Browser after payment success for market pickup | `queuepositions` row | Browser toast/success only | Client-side and silent-fail; not a guaranteed server-side fulfillment signal. |
| Customer status page | `app/order/success/page-enhanced.js` lines 42-95 → `/api/orders/by-ref` | Browser redirect after payment | None | Customer page says confirmed/details | Requires order access token. |
| Admin visibility | `app/api/admin/orders/route.ts` lines 82-110 | Admin opens/refreshes orders page | None | None | No push; manual refresh/page load. Filters use lowercase statuses and can miss uppercase `CONFIRMED`/`PAID`. |
| Square webhook | `app/api/webhooks/square/route.ts` lines 327-517 | Square POST webhook | `webhook_events_processed`; status/timeline updates | Customer fallback email only on `payment.updated`; staff backup only on `order.*` | Real order evidence shows one later manual-looking replay, not a live immediate webhook. |

---

## Real Order Evidence Summary

- Mongo order created: `2026-06-01T09:24:43.962Z`.
- Square payment created: `2026-06-01T09:24:57.807Z`; status `COMPLETED`.
- Square order closed: `2026-06-01T09:24:58.610Z`.
- Local payment record metadata timestamp: `2026-06-01T09:24:58.653Z`.
- Customer confirmation `email_sends` row: `2026-06-01T09:24:58.872Z`.
- Resend API: same message `last_event = delivered`, created `2026-06-01 09:24:58.992987+00`.
- Staff notification: production Vercel `/api/payments` log at `2026-06-01T09:24:56.569Z` recorded `ReferenceError: location is not defined`; `/api/payments` response status was `200`.
- Queue row created: `2026-06-01T09:25:01.863Z`, `orderRef: F4F81F`, position `1`.

---

## Current Architecture Diagram

```text
Customer browser
  │
  ├─ /api/orders/create ───────────────▶ Mongo orders(pending)
  │
  ├─ Square Web Payments SDK ──────────▶ Square token
  │
  ├─ /api/payments ────────────────────▶ Square customer/order/payment
  │        │
  │        ├───────────────────────────▶ Mongo payment_records
  │        ├───────────────────────────▶ Mongo orders(CONFIRMED/PAID)
  │        ├───────────────────────────▶ Resend customer confirmation
  │        ├─X staff email fails before send
  │        └───────────────────────────▶ inventory/rewards/customers
  │
  └─ /api/queue/join (client-side) ────▶ Mongo queuepositions

Square webhooks
  │
  └─ /api/webhooks/square ─────────────▶ Mongo status/timeline + customer fallback only

Admin/staff
  │
  ├─ Square dashboard ─────────────────▶ Square order/payment visible
  └─ /admin/orders refresh ────────────▶ Mongo orders visible
```

---

## Bottom Line

The payment/order/customer-confirmation path is active and proven for the real order. The staff/admin email notification path is active in code but failed in production before any Resend send attempt. Admin awareness currently relies on Square dashboard, unfiltered Mongo-backed admin views after refresh, or the client-created queue row—not on a successful staff alert.
