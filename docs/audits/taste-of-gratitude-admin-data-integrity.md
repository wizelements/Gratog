# Taste of Gratitude — Admin Data Integrity, Inventory, and Concurrency

**Audit date:** 2026-07-24  
**Branch:** `feat/fresh-batch-request-system`  
**Status:** Data model supports integrity; UI, webhooks, audit log, and concurrency guards are not yet implemented.

---

## 1. Source of truth for availability

| Concept | Source collection | Field | Notes |
|---|---|---|---|
| Raw customer interest | `fresh_batch_requests` | `quantity`, `quantityUnit` | Not production demand until reviewed/approved. |
| Confirmed demand | `batch_campaigns` | aggregated assigned requests | After owner approval. |
| Reserved/paid volume | `batch_reservations` | `quantity`, `quantityUnit`, `paymentStatus` | `paid` only counts as consumed. |
| Target production | `batch_campaigns` | `targetGallons`, `standardBatchGallons` | Authority before yield is recorded. |
| Actual yield | `batch_campaigns` | `actualYieldGallons` | Recorded after production; overrides estimates. |
| Market bottle allocation | `batch_campaigns` | `marketBottleAllocation` | Separate from reserved volume. |
| Sample allocation | `batch_campaigns` | `sampleAllocationGallons` | Must not reduce reserved inventory. |
| Process loss | `batch_campaigns` | `processLossPercent` | Applied to target yield. |
| Sold volume | `orders` or Square | Square order line items | Reconciled via webhook. |
| Remaining market volume | Derived | `actualYield - reserved - sampleAllocation - sold` | Computed server-side; never client-derived. |

All inventory math must be computed server-side. The client may display it but cannot authoritatively set it.

---

## 2. Inventory ledger principles

Use a minimal ledger for `batch_campaigns` and `batch_reservations`:

- Additive entries: `yield_recorded`, `reservation_created`, `reservation_paid`, `sample_allocated`, `market_sale`.
- Subtractive entries: `reservation_canceled`, `reservation_refunded`, `sample_consumed`, `waste_recorded`.
- Each entry: `batchId`, `type`, `deltaGallons`, `reason`, `actor`, `timestamp`, `correlationId`.

Derived balances are calculated from the ledger, not stored as a single mutable number.

---

## 3. Guardrails required

| Rule | Enforcement point |
|---|---|
| Sampling cannot use reserved inventory. | Batch planner + server validation. |
| Allocated volume ≤ expected yield. | Batch planner before approval. |
| Available market volume never negative. | Reservation/purchase validation. |
| One request cannot be counted twice. | Unique assignment per request to one active batch. |
| Production cannot start without owner approval. | State machine transition guard. |
| Reservations cannot open before price validation. | Reservation creation API. |
| Batch cannot publish without required fields. | Batch update API. |
| Payment links cannot be created before approval. | Reservation API checks batch status. |
| Sold-out batches cannot silently reopen. | State machine + audit entry required. |

---

## 4. Concurrency and idempotency

### Required mechanisms

1. **Idempotency keys** on Square payment link creation and reservation creation. Already partially in place (`freshbatch_reservation_${reservation.id}`).
2. **Unique constraints** on `fresh_batch_requests` for `(email, requestedProductSlug, requestedFlavorText, marketId)` with a time window to reduce duplicates.
3. **Optimistic concurrency** for batch and request updates using a `version` or `updatedAt` check.
4. **Atomic updates** for reservation status and inventory ledger.
5. **Safe retries**: failed email sends can be retried from admin without duplicating reservations.

### Concurrency scenarios to handle

| Scenario | Required behavior |
|---|---|
| Two admin tabs edit same request | Stale-record warning; last write loses or merge diff. |
| Two admins assign same request | First assignment wins; second sees conflict. |
| Double-click payment-link creation | Idempotency returns same link; no duplicate reservation. |
| Webhook arrives during admin status change | Webhook update uses atomic compare; admin UI refreshes. |
| Batch canceled while email sending | Email is aborted or failure logged; no false confirmation. |
| Request arrives during batch approval | New request goes to inbox; does not auto-join locked batch. |
| Form double submit | Idempotency key or unique constraint prevents duplicate. |
| Network timeout after successful write | UI shows success if write completed; admin can verify. |

---

## 5. Audit log

### Required events

| Event | Entity | Fields |
|---|---|---|
| request_created | `fresh_batch_requests` | request id, customer email, flavor, market, quantity, source IP |
| request_status_changed | `fresh_batch_requests` | old status, new status, actor, reason |
| request_assigned | `fresh_batch_requests` | batch id, actor |
| request_unassigned | `fresh_batch_requests` | previous batch id, actor |
| batch_created | `batch_campaigns` | batch id, name, product, market, target gallons |
| batch_status_changed | `batch_campaigns` | old status, new status, actor, reason |
| batch_price_changed | `batch_campaigns` | old price, new price, actor, reason |
| production_locked | `batch_campaigns` | actor, reserved volume, market allocation |
| yield_recorded | `batch_campaigns` | expected vs actual, actor |
| reservation_created | `batch_reservations` | reservation id, request id, batch id, price, actor |
| reservation_status_changed | `batch_reservations` | old status, new status, actor, reason |
| payment_link_created | `batch_reservations` | Square link id, actor |
| payment_received | `batch_reservations` | Square payment id, amount, actor='webhook' |
| refund_recorded | `batch_reservations` | amount, reason, actor |
| credit_recorded | `batch_reservations` | amount, reason, actor |
| pickup_completed | `batch_reservations` | actor, timestamp |
| pickup_missed | `batch_reservations` | actor, reason |
| email_sent | `communications` | template, recipient, status, correlation id |
| email_failed | `communications` | template, recipient, error, retry count |
| setting_changed | `settings` | key, old value, new value, actor |

### Audit-log protections

- Append-only in MongoDB.
- No update or delete endpoint.
- Owner can view; no one can edit through ordinary admin.
- Exclude passwords, tokens, full payment payloads.

---

## 6. Failure and recovery UX

Every admin action that touches customer data or money must handle failures with clear messaging.

### Required message format

> **What happened:** The reservation was saved.  
> **Customer email:** Not sent.  
> **Payment link:** Created.  
> **Square order:** `order_xxx`.  
> **Safe to retry?** Yes — resend email from the communication panel.  
> **Next step:** Open request detail and click “Retry confirmation email.”

Never display only:

> Something went wrong.

### Failure categories

| Failure | UX requirement |
|---|---|
| Database unavailable | Show cached state if safe; explain action may not have saved. |
| Square unavailable | Do not mark reservation as offered; allow retry. |
| Resend unavailable | Save record; show email failure; allow retry. |
| Invalid transition | Show why the change is not allowed and current state. |
| Permission denied | Do not leak existence of private records. |
| Stale record | Show diff and ask owner to reload. |

---

## 7. Communication reliability

### Communication timeline

Store a `communications` record for every triggered email:

```typescript
interface CommunicationRecord {
  id: string;
  requestId?: string;
  reservationId?: string;
  batchId?: string;
  template: string;
  recipient: string;
  subject: string;
  trigger: 'system' | 'owner' | 'webhook';
  actor?: string;
  attemptedAt: Date;
  providerResponse?: string;
  success: boolean;
  error?: string;
  retryCount: number;
}
```

### Required controls

- Preview template before sending.
- Retry failed email from admin.
- Do not send duplicate confirmation for same reservation.
- Do not send pickup instructions before payment/approval.
- Do not send canceled-batch reminders.
- Marketing emails only with explicit consent.

---

## 8. Mobile and accessibility for urgent actions

### Market-urgent actions

- Mark pickup complete
- View customer detail
- Check paid status
- Mark sold out
- Retry failed email
- View market instructions

### Accessibility requirements

- Semantic headings and landmarks.
- Keyboard navigation for all status actions.
- Focus management in dialogs.
- Error associations for forms.
- Status announcements for async actions.
- Color not used alone for state.
- Minimum 44×44 dp tap targets on mobile.

---

## 9. Implementation checklist

- [ ] Add `batch_audit_log` collection.
- [ ] Add `communications` collection.
- [ ] Add inventory ledger helpers.
- [ ] Add server-side state-machine guards.
- [ ] Add `version` field to request/batch/reservation updates.
- [ ] Add idempotency to reservation and payment-link creation.
- [ ] Add Square webhook for payment status.
- [ ] Add admin UI for communication history and retry.
- [ ] Add admin UI for audit-log read-only view.
- [ ] Add optimistic-concurrency error handling in admin forms.
- [ ] Add mobile-responsive pickup and sold-out actions.
