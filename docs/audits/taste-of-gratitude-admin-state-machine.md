# Taste of Gratitude — Admin State Machine

**Branch:** `feat/fresh-batch-request-system`  
**Audit date:** 2026-07-24  
**Status:** Read-only audit. No application code changed.

---

## 1. State Machines

There are three interrelated state machines:

1. **Fresh Batch Request** (`fresh_batch_requests.status`)
2. **Batch Campaign** (`batch_campaigns.status`)
3. **Batch Reservation** (`batch_reservations.paymentStatus` and `batch_reservations.pickupStatus`)

---

## 2. Request States

| State | Meaning | Who sets it |
|---|---|---|
| `requested` | New customer request; not yet reviewed. | System on submit |
| `collecting_demand` | Owner grouped it into demand pool; waiting for more requests. | Owner |
| `owner_review` | Needs owner decision (custom flavor, one-gallon non-market-safe, ingredient uncertainty). | System (decision engine) or Owner |
| `awaiting_threshold` | Demand pool exists but has not reached shared-batch threshold. | System (decision engine) or Owner |
| `approved` | Owner approved the request for a batch. | Owner |
| `reservation_offered` | Reservation + Square payment link sent to customer. | System on reservation create |
| `deposit_pending` | Customer has not yet paid deposit. | System |
| `confirmed` | Customer paid; batch production can proceed. | System on payment webhook |
| `in_production` | Batch is being produced. | Owner / System |
| `market_available` | Product available at market for pickup. | Owner / System |
| `fully_reserved` | All planned volume is reserved; no new reservations. | System |
| `sold_out` | Batch produced and sold; request could not be fulfilled. | Owner / System |
| `completed` | Customer picked up and batch is closed. | Owner / System |
| `deferred` | Moved to a future batch. | Owner |
| `canceled` | Request canceled by customer or owner. | Owner or customer action |

---

## 3. Batch Campaign States

| State | Meaning | Who sets it |
|---|---|---|
| `collecting_interest` | Proposed batch; gathering demand only. | System/Owner |
| `owner_review` | Needs owner approval (pricing, market, ingredients). | System/Owner |
| `awaiting_minimum` | Not enough demand yet to justify production. | System/Owner |
| `confirmed` | Owner approved; reservations can be created. | Owner |
| `reservations_open` | Customers can pay to reserve. | System/Owner |
| `fully_reserved` | All gallons reserved. | System |
| `in_production` | Production date reached; batch being made. | Owner/System |
| `available_at_market` | Batched product is at pickup market. | Owner/System |
| `sold_out` | All reservations picked up and/or no remaining market volume. | Owner/System |
| `completed` | Batch closed out. | Owner/System |
| `deferred` | Production pushed to future date. | Owner |
| `canceled` | Batch canceled; reservations must be refunded/credited. | Owner |

---

## 4. Reservation States

### 4.1 Payment status

| State | Meaning | Who sets it |
|---|---|---|
| `pending` | Payment link sent; unpaid. | System |
| `deposit_paid` | Deposit received. | Square webhook |
| `fully_paid` | Full amount received. | Square webhook |
| `failed` | Payment attempt failed. | Square webhook / System |
| `refunded` | Refund issued. | Owner/System |
| `canceled` | Reservation canceled without refund or with store credit. | Owner/System |

### 4.2 Pickup status

| State | Meaning | Who sets it |
|---|---|---|
| `pending` | Not yet at market. | System |
| `ready` | Product ready for pickup. | Owner/System |
| `picked_up` | Customer received product. | Owner/Staff |
| `no_show` | Customer did not pick up. | Owner/Staff |

---

## 5. Allowed State Transitions

### 5.1 Request transitions

| From | To | Guard / condition | Actor |
|---|---|---|---|
| `requested` | `collecting_demand` | Owner groups by flavor/market | Owner |
| `requested` | `owner_review` | Decision engine flags custom/microbatch path | System or Owner |
| `collecting_demand` | `awaiting_threshold` | Not enough demand yet | System |
| `collecting_demand` | `owner_review` | Needs owner decision | System or Owner |
| `awaiting_threshold` | `collecting_demand` | More demand arrived | System |
| `owner_review` | `approved` | Owner approves | Owner |
| `owner_review` | `deferred` | Owner defers | Owner |
| `owner_review` | `canceled` | Owner/customer cancels | Owner/Customer |
| `approved` | `reservation_offered` | Reservation created | System |
| `reservation_offered` | `deposit_pending` | Deposit link active | System |
| `deposit_pending` | `confirmed` | Deposit paid | System (Square webhook) |
| `confirmed` | `in_production` | Production starts | Owner/System |
| `in_production` | `market_available` | Product at market | Owner/System |
| `market_available` | `completed` | Picked up | Owner/Staff |
| `awaiting_threshold` | `approved` | Threshold reached + owner approves | Owner |
| `fully_reserved` | `completed` | Reservation fulfilled | System |
| `sold_out` | `deferred` | Offer next batch | Owner |
| Any non-terminal | `canceled` | Cancellation policy met | Owner/Customer |

### 5.2 Batch campaign transitions

| From | To | Guard / condition | Actor |
|---|---|---|---|
| `collecting_interest` | `owner_review` | Demand review | Owner |
| `collecting_interest` | `awaiting_minimum` | Below threshold | System |
| `awaiting_minimum` | `owner_review` | Re-evaluated | Owner/System |
| `owner_review` | `confirmed` | Owner approves | Owner |
| `owner_review` | `deferred` | Owner defers | Owner |
| `owner_review` | `canceled` | Owner cancels | Owner |
| `confirmed` | `reservations_open` | Reservation links created | System |
| `reservations_open` | `fully_reserved` | All gallons reserved | System |
| `reservations_open` | `in_production` | Production date reached | System |
| `fully_reserved` | `in_production` | Production date reached | System |
| `in_production` | `available_at_market` | At market | Owner/System |
| `available_at_market` | `sold_out` | All reserved + market extras sold | Owner/System |
| `available_at_market` | `completed` | Pickup window closed | Owner/System |
| `sold_out` | `completed` | Operations closed | Owner/System |
| Any non-terminal | `canceled` | Owner cancels | Owner |

### 5.3 Reservation transitions

| From | To | Guard / condition | Actor |
|---|---|---|---|
| `pending` | `deposit_paid` | Square reports deposit | Square webhook |
| `pending` | `fully_paid` | Square reports full payment | Square webhook |
| `pending` | `failed` | Square error or timeout | System |
| `pending` | `canceled` | Canceled before payment | Owner/Customer |
| `deposit_paid` | `fully_paid` | Balance paid | Square webhook |
| `deposit_paid` | `canceled` | Owner cancels (store credit per policy) | Owner |
| `fully_paid` | `refunded` | Refund issued | Owner/System |
| `fully_paid` → pickup `ready` | | Product ready | Owner |
| pickup `ready` → `picked_up` | | Customer collected | Staff |
| pickup `ready` → `no_show` | | Missed pickup window | Staff |

---

## 6. Invalid Transition Examples and Guard Logic

| Invalid transition | Why invalid | Guard |
|---|---|---|
| `requested` → `confirmed` | No payment has occurred | Reject unless `reservation_offered` and payment received |
| `collecting_demand` → `in_production` | No batch approved | Require `batch_campaigns.status` in `confirmed` or later |
| `confirmed` → `reservation_offered` | Already paid | Reject if payment status is paid |
| `fully_reserved` → `reservations_open` | Would over-reserve | Reject if `reservedGallons >= targetGallons` |
| `canceled` → any active state | Terminal state | Reject unless explicitly reopened as a new request |
| `deposit_paid` → `canceled` without store credit/refund | Customer owes or is owed money | Require `refundCents` or `storeCreditCents` recorded |
| `pending` reservation → pickup `ready` | Unpaid product should not be prepared | Require `paymentStatus` in `deposit_paid` or `fully_paid` |
| `batch_campaigns` `collecting_interest` → `in_production` | No owner approval | Require `ownerApproved === true` |

---

## 7. Guard Logic to Implement

### 7.1 Request-level guards

```typescript
function canTransitionRequest(current: RequestStatus, next: RequestStatus, context: RequestContext): boolean {
  if (current === 'canceled' && next !== 'canceled') return false;
  if (next === 'confirmed' && !context.paymentReceived) return false;
  if (next === 'reservation_offered' && !context.reservationId) return false;
  if (next === 'in_production' && context.batchStatus !== 'confirmed' && context.batchStatus !== 'reservations_open') return false;
  if (next === 'market_available' && context.batchStatus !== 'available_at_market') return false;
  return true;
}
```

### 7.2 Batch-level guards

```typescript
function canTransitionBatch(current: BatchStatus, next: BatchStatus, batch: BatchCampaign): boolean {
  if (current === 'canceled' && next !== 'canceled') return false;
  if (next === 'confirmed' && !batch.ownerApproved) return false;
  if (next === 'reservations_open' && batch.status !== 'confirmed') return false;
  if (next === 'fully_reserved' && batch.reservedGallons < batch.targetGallons) return false;
  if (next === 'in_production' && !batch.ownerApproved) return false;
  return true;
}
```

### 7.3 Reservation-level guards

```typescript
function canTransitionReservation(current: PaymentStatus, next: PaymentStatus, reservation: BatchReservation): boolean {
  if (current === 'canceled' && next !== 'canceled') return false;
  if (current === 'refunded' && next !== 'refunded') return false;
  if (next === 'fully_paid' && current === 'canceled') return false;
  if (reservation.pickupStatus === 'picked_up' && next === 'canceled') return false;
  return true;
}
```

---

## 8. Recommended Next Steps

1. Add `batch_audit_log` entries for every state transition.
2. Implement the guard functions in `lib/batches/repository.ts` or a new `lib/batches/state-guards.ts` module.
3. Expose a small `GET /api/admin/fresh-batch/requests/{id}/allowed-transitions` endpoint for the admin UI.
4. Prevent direct `PATCH` to any status that bypasses guards (currently `/api/admin/fresh-batch/requests` accepts arbitrary statuses).
5. Add terminal-state protection: once `canceled`/`completed`/`refunded`, require a new record rather than reactivation.
