# PAYMENT_ARCHITECTURE — Assumption 1 verification

> **Assumption:** Square is the sole source of truth for payments.
> **Verdict:** ⚠️ **MOSTLY TRUE — with three exceptions that need attention.**

## What is true

✅ Card data never touches Gratog server — Square Web Payments SDK tokenizes in-browser.
✅ Canonical payment endpoint `/api/payments` calls `Square.payments.createPayment` via [lib/square-api.ts#L278](file:///data/data/com.termux/files/home/Gratog-live/lib/square-api.ts#L278).
✅ Server-authoritative amount validation against stored order total ([payments/route.ts#L500-560](file:///data/data/com.termux/files/home/Gratog-live/app/api/payments/route.ts#L500-L560)).
✅ Square Webhook HMAC verified at `/api/webhooks/square` with `webhook_events_processed` dedupe.
✅ Refund flow exists at `/api/admin/orders/[id]/refund` → `/api/payments/refund` → Square Refunds API.

## What is not true — exceptions

### Exception 1 — `/api/orders/route.ts` POST (MarketOrder model)
Line 164: `MarketOrder.create({ ..., paymentStatus, ... })`.
Lines 154-160:
```ts
paymentStatus = data.paymentMethod === 'SQUARE_ONLINE' ? 'PENDING' : 'PAID';
```
**Risk:** any caller can pass `paymentMethod: 'CASH'` or `'OTHER'` and the order is created with `paymentStatus: 'PAID'` without Square or any verification. **This is an unauthenticated public route** unless wrapped in admin gate — verify.

### Exception 2 — `/api/pay/process/route.ts` (parallel "Pay Flow")
Lines 199-220: inserts order **only after** Square payment confirms — that's correct. But it is a **second payment path** competing with canonical `/api/payments`. Different field names, different schema, different idempotency. If admin or marketing surface a link to `/pay`, customers route through this alternate.

### Exception 3 — `lib/subscription-practical.ts#L378`
Auto-generates recurring orders on schedule with `status: 'pending'` and no Square call until next billing event. Subscriptions are dormant (no live plans), but the code path exists.

## Payment paths inventory

| Path | Triggers | Square call site | Order persistence |
|---|---|---|---|
| **Canonical** | `/checkout` → `/api/orders/create` → `/api/payments` | `lib/square-api.ts#createPayment` | order before pay, paymentStatus=pending → paid |
| **Pay Flow** | `/order/*` → `/api/pay/process` | inline in route | order **only after** payment succeeds |
| **MarketOrder** | `/api/orders` POST | none | order created with paymentStatus from request body (cash/sms accepted) |
| **Subscription** | cron / scheduler | (not yet wired) | order pending until next billing |
| **Refund** | `/api/admin/orders/[id]/refund` | `lib/square-api.ts` refund | `payments` collection updated |
| **Square hosted link** | `/checkout/square` legacy | Square checkout API | order created server-side after Square redirect |

## Failure path

If `Square.payments.createPayment` throws:
- `/api/payments` returns 500 with details; order remains `paymentStatus: 'pending'`.
- No inventory consumed (gated on `isCompleted`).
- No rewards awarded.
- No email sent.
- Idempotency cached for the request key.

If Square webhook is missed (signature drift, network):
- Order stays at status from `/api/payments` write; reconciliation depends on `/api/admin/orders/sync` (❌ MISSING).

If retry storm hits `/api/payments`:
- Stable idempotency key per order (per code comment in payments route) → Square dedupes.
- Inventory consume is also idempotent by `orderId`.

## Webhook path

`POST /api/webhooks/square`:
1. Read `x-square-hmacsha256-signature` header.
2. Recompute HMAC against raw body + `SQUARE_WEBHOOK_SIGNATURE_KEY`.
3. Reject if mismatch.
4. Upsert into `webhook_events_processed` (dedupe).
5. Switch on event type — update order fulfillment / payment status.

## Verdict (refined)

Square is the sole authoritative **payment processor**.
Square is **not** the sole source of truth for `orders.paymentStatus` field — three other paths can create orders with arbitrary payment status.

**Required action before treating Assumption 1 as true:**
1. Lock down `/api/orders` POST (MarketOrder model) to admin-only, or have it call Square for non-cash payments, or remove the cash/sms paymentStatus shortcut.
2. Deprecate / remove `/api/pay/process` and `/order/*` parallel flow.
3. Confirm subscription auto-generation is gated (cron secret + verified plan).

**Net:** canonical revenue path is safe. Alternate paths are theoretical attack surface today.
