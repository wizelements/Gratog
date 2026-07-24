# Taste of Gratitude — Public-to-Admin Traceability Matrix

**Branch:** `feat/fresh-batch-request-system`  
**Audit date:** 2026-07-24  
**Status:** Read-only audit. No application code changed.

---

## 1. Purpose

This matrix maps each customer-facing action to the public API, the stored record, the admin location where the action is visible, the owner action it triggers, the resulting customer state, the notification sent, and any payment effect. It is the operational hand-off document between the Fresh Batch Request System customer flow and the admin control plane.

---

## 2. Bidirectional Traceability Matrix

| Public action | API | Stored record | Admin location | Owner action | Resulting customer state | Notification | Payment effect |
|---|---|---|---|---|---|---|---|
| Request a flavor | `POST /api/fresh-batch/requests` | `fresh_batch_requests` document (status: `requested`) | `/admin/fresh-batches` request inbox | Review demand; group by flavor/market; move to `collecting_demand` or `owner_review` | Request received; no paid obligation | Resend `fresh_batch_request_received` to customer; Telegram/Resend owner alert | None |
| Join a future batch (demand-only) | Same as above; status stays `collecting_demand` | `fresh_batch_requests` updated with `collecting_demand` | `/admin/fresh-batches` demand grouping | Wait until threshold reached or approve as market-safe microbatch | Added to demand pool | `fresh_batch_collecting_demand` email | None |
| Select market on request form | Submitted as `preferredMarketId` in `POST /api/fresh-batch/requests` | `fresh_batch_requests.preferredMarketId` | `/admin/fresh-batches` market filter | Use market to plan production/pickup | Preferred pickup location recorded | Included in confirmation email | None |
| Request a sample at the market | `POST /api/fresh-batch/requests` with `quantityUnit: sample_interest` | `fresh_batch_requests` with low/no gallon equivalent | `/admin/fresh-batches` flavor grouping | Plan sampling allocation into batch; no reservation created | Sampling interest logged | `fresh_batch_request_received` | None |
| Join email list | `POST /api/lead` (marketing consent) | `newsletter_subscribers` + `lead_intents` | `/admin/emails` / `/admin/customers` | Export for campaign | Marketing subscriber | Double-opt-in or welcome email | None |
| Submit preorder | `POST /api/preorder` | `marketorders` (status: `PENDING_PAYMENT`) | `/admin/orders` | Sync Square, mark ready, fulfill | Awaiting payment | Square payment link email + order confirmation | Square payment link created; unpaid until customer pays |
| Reserve a gallon (fresh batch) | Owner creates reservation via `POST /api/admin/fresh-batch/reservations` using existing request | `batch_reservations` + linked `fresh_batch_requests` updated to `reservation_offered` | `/admin/fresh-batches` (request view) then batch planner | Owner groups request into `batch_campaigns`, approves price, creates payment link | Reservation offered; payment pending | `fresh_batch_confirmed` email with Square payment URL | Square payment link created; deposit or full payment pending |
| Receive reservation offer | Customer clicks payment URL from email | `batch_reservations.paymentUrl` already stored | `/admin/fresh-batches` (request/reservation view) | Owner can resend or cancel if expired | Payment window open | `fresh_batch_reservation_reminder` (optional) | None until customer pays |
| Pay deposit | Customer completes Square checkout | Square order/payment → webhook updates `batch_reservations.paymentStatus` to `deposit_paid` | `/admin/orders` or batch planner | Monitor payment; prepare production | Deposit paid; balance due remains | `fresh_batch_deposit_received` | Deposit captured by Square |
| Pay balance | Customer completes second Square checkout or single full-payment link | `batch_reservations.paymentStatus` → `fully_paid` | Batch planner / orders | Mark production confirmed | Fully paid; awaiting pickup | `fresh_batch_pickup_details` | Balance captured by Square |
| Cancel request | Customer cancels via email/reply (no public cancel API currently) | `fresh_batch_requests.status` → `canceled` | `/admin/fresh-batches` request inbox | Owner cancels linked reservation if any; issue store credit per policy | Request canceled | `fresh_batch_canceled` | Refund or store credit per owner policy |
| Receive pickup instructions | Email sent after full payment | `batch_reservations.pickupStatus` → `ready` | `/admin/market-day` or batch planner | Prepare order for pickup | Ready for pickup | `fresh_batch_pickup_details` | None |
| Complete pickup | Staff marks picked up at market | `batch_reservations.pickupStatus` → `picked_up`, `completedAt` set | `/admin/market-day` / `/admin/orders` | Verify ID/order number, hand over product | Fulfilled | Thank-you / review request email | None |
| Miss pickup | Staff marks no-show | `batch_reservations.pickupStatus` → `no_show` | `/admin/orders` | Contact customer; reschedule or forfeit per policy | No-show; needs rescheduling | Follow-up reminder or cancellation notice | None (already paid) |
| Join next batch | Customer re-requests after deferral/sold-out | New `fresh_batch_requests` document linked to prior request note | `/admin/fresh-batches` | Assign to new batch campaign | Back in demand pool | `fresh_batch_collecting_demand` | None |
| Product / batch sold out | Status change on `batch_campaigns` to `fully_reserved` or `sold_out`; request status updated | `batch_campaigns`, affected `fresh_batch_requests` | `/admin/fresh-batches` | Notify waitlist; optionally open next batch | Added to waitlist / next batch | `fresh_batch_sold_out` or `fresh_batch_alternative_offered` | None |

---

## 3. Critical Hand-Off Rules

1. **Request is never an order.** `fresh_batch_requests` has no payment status and no inventory decrement.
2. **Reservation is created only after owner approval.** `POST /api/admin/fresh-batch/reservations` requires a `batchId` and a verified price.
3. **Payment creates the customer obligation.** Until Square reports `deposit_paid` or `fully_paid`, the reservation can be canceled without refund.
4. **Pickup status is separate from payment status.** A fully paid reservation must still be marked `picked_up` before the batch is considered complete.
5. **Sold-out batches move leftover demand forward.** Requests not included in a batch remain in `collecting_demand` or are explicitly deferred to a future batch.

---

## 4. Data Flow Diagram (Text)

```
Customer action
  → Public API (or Square webhook)
    → Stored record
      → Owner/admin view
        → Owner action
          → Customer state change
            → Notification
              → (optional) Payment effect
```

### 4.1 Example: request → reservation → pickup

1. Customer submits `/request-a-flavor` → `POST /api/fresh-batch/requests`.
2. `fresh_batch_requests` created, status `requested`.
3. Owner sees it in `/admin/fresh-batches`.
4. Owner approves batch in planner (future) → `batch_campaigns` created, status `confirmed`.
5. Owner assigns request → `POST /api/admin/fresh-batch/reservations` creates `batch_reservations`, status `pending`.
6. Customer receives `fresh_batch_confirmed` email with Square link.
7. Customer pays → Square webhook updates `batch_reservations.paymentStatus` to `fully_paid`.
8. Customer receives `fresh_batch_pickup_details` email.
9. Staff hands over at market → owner/operator marks `pickupStatus: picked_up`.
10. Batch campaign moves toward `completed` once all reservations are picked up or no-showed.

---

## 5. Gaps in Traceability

| Gap | Impact | Recommended fix |
|---|---|---|
| No public cancel/reschedule API | Customer must email to cancel; owner manually updates status | Add `PATCH /api/fresh-batch/requests/{id}/cancel` gated by email verification token |
| No customer-facing status page | Customer cannot self-check request status | Add `/my-batch-requests` page or status link in confirmation email |
| No automated link between missed pickup and next batch | No-show requests are orphaned | Add admin action "Offer next batch" that creates a new request or updates status |
| Square webhook does not yet update `batch_reservations` | Payment status may lag | Extend existing Square webhook handler to update `batch_reservations.paymentStatus` |
| No public batch board | Customers cannot see confirmed batches | Optional Phase 3: `/api/fresh-batch/public-batches` + `/fresh-batches` page |

---

## 6. Conclusion

The traceability from public action to admin action is clear at the data-model level but still requires:

1. Customer status/lookup surface.
2. Square webhook reconciliation for reservations.
3. Admin UI to mark pickup complete.
4. Automated deferral/sold-out follow-up.

Until those are built, the owner must manually bridge email replies and pickup confirmations into the admin pages.
