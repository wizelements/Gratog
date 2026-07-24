:/markdown
# Taste of Gratitude — Admin State Machine

**Audit date:** 2026-07-24  
**Branch:** `feat/fresh-batch-request-system`  
**Status:** Server-side state transition enforcement is not yet implemented. This document defines the required state machines and invalid transitions to be rejected.

---

## 1. Flavor request states

### States

| State | Meaning |
|---|---|
| `new` | Request just received, not yet reviewed. |
| `under_review` | Owner or system is evaluating feasibility. |
| `collecting_demand` | Demand is below shared threshold; waiting for more requests. |
| `alternative_offered` | Owner proposed an alternative flavor/quantity/market. |
| `assigned_to_batch` | Assigned to a draft or collecting batch. |
| `reservation_offered` | Square payment link sent, awaiting payment. |
| `confirmed` | Deposit or full payment received. |
| `deferred` | Moved to a future batch/season. |
| `rejected` | Owner declined; no production. |
| `canceled` | Customer or owner canceled. |
| `completed` | Fulfilled (picked up or delivered). |

### Allowed transitions

| From | To | Actor | Conditions | Customer notification |
|---|---|---|---|---|
| `new` | `under_review` | System / Owner | Auto on receipt or manual | — |
| `new` | `rejected` | Owner | — | Rejection email |
| `under_review` | `collecting_demand` | System | Below threshold | Threshold-not-reached update (optional) |
| `under_review` | `assigned_to_batch` | Owner / System | Compatible batch exists | Assignment notice (optional) |
| `under_review` | `alternative_offered` | Owner | Alternative proposed | Alternative offer email |
| `under_review` | `rejected` | Owner | Cannot fulfill | Rejection email |
| `collecting_demand` | `assigned_to_batch` | System / Owner | Threshold reached | Batch moving forward email |
| `assigned_to_batch` | `reservation_offered` | Owner | Batch approved, link created | Reservation offer with Square link |
| `alternative_offered` | `assigned_to_batch` | Customer accepts | — | Confirmation |
| `alternative_offered` | `canceled` | Customer declines | — | Cancellation email |
| `reservation_offered` | `confirmed` | System | Square payment received | Payment confirmation |
| `reservation_offered` | `canceled` | Owner / System | Link expired or batch canceled | Cancellation / refund email |
| `confirmed` | `completed` | Owner | Pickup/delivery done | Thank you / receipt |
| `confirmed` | `canceled` | Owner | With refund/credit | Cancellation / credit email |
| `deferred` | `assigned_to_batch` | System / Owner | Future batch opens | New batch offer |
| any terminal | any | — | **Forbidden** | — |

### Invalid transitions (must be rejected server-side)

| From | To | Why rejected |
|---|---|---|
| `new` | `confirmed` | No payment, no approval. |
| `rejected` | `assigned_to_batch` | Terminal state. |
| `completed` | `canceled` | Cannot reverse fulfillment. |
| `canceled` | `reservation_offered` | Canceled requests cannot receive payment links. |
| `collecting_demand` | `reservation_offered` | Batch must be approved first. |
| `under_review` | `confirmed` | No payment link created. |
| `assigned_to_batch` | `confirmed` | Payment link not yet sent. |

---

## 2. Batch campaign states

### States

| State | Meaning |
|---|---|
| `draft` | Idea only, not visible publicly. |
| `collecting_demand` | Visible as possibility, reservations not open. |
| `owner_review` | Demand met or custom order, awaiting owner approval. |
| `approved` | Owner approved; reservations may open. |
| `reservations_open` | Customers can receive and pay payment links. |
| `fully_reserved` | Reserved volume meets or exceeds target. |
| `locked_for_production` | No more reservation changes; production plan fixed. |
| `in_production` | Currently being made. |
| `ready_for_pickup` | Produced, awaiting customer pickup. |
| `available_at_market` | Market bottles available for sale. |
| `sold_out` | No remaining volume. |
| `completed` | All obligations fulfilled. |
| `delayed` | Production or pickup delayed. |
| `canceled` | No production; customers refunded/credited. |

### Allowed transitions

| From | To | Actor | Conditions |
|---|---|---|---|
| `draft` | `collecting_demand` | Owner | Public interest allowed |
| `draft` | `owner_review` | System | Custom/one-gallon request ready for review |
| `collecting_demand` | `owner_review` | System | Threshold reached |
| `owner_review` | `approved` | Owner | Price, market, date verified |
| `owner_review` | `canceled` | Owner | Cannot fulfill |
| `approved` | `reservations_open` | Owner / System | Payment link path ready |
| `approved` | `locked_for_production` | Owner | Sold out directly |
| `reservations_open` | `fully_reserved` | System | Reserved ≥ target |
| `reservations_open` | `locked_for_production` | Owner | Cutoff reached |
| `reservations_open` | `canceled` | Owner | With no paid reservations or after refund |
| `fully_reserved` | `locked_for_production` | Owner | Production locked |
| `locked_for_production` | `in_production` | Owner | Production started |
| `in_production` | `ready_for_pickup` | Owner | Batch finished |
| `in_production` | `delayed` | Owner | Delay |
| `ready_for_pickup` | `available_at_market` | Owner | Customer pickup window closed, excess to market |
| `available_at_market` | `sold_out` | Owner | All market bottles sold |
| `any` | `delayed` | Owner | If not already terminal |
| `delayed` | `in_production` | Owner | Resumed |
| `any non-terminal with no paid reservations` | `canceled` | Owner | Refund not required |
| `any non-terminal with paid reservations` | `canceled` | Owner | Only after refund/credit recorded |

### Invalid transitions

| From | To | Why rejected |
|---|---|---|
| `draft` | `in_production` | No approval, no demand verification. |
| `canceled` | `reservations_open` | Canceled batch cannot accept reservations. |
| `sold_out` | `reservations_open` | Sold inventory cannot be reopened without audit entry. |
| `completed` | `canceled` | Terminal state. |
| `in_production` | `draft` | Cannot reverse production. |

---

## 3. Reservation states

### States

| State | Meaning |
|---|---|
| `draft` | Internal reservation not yet offered. |
| `offered` | Payment link sent, awaiting payment. |
| `deposit_pending` | Deposit required, not yet paid. |
| `deposit_paid` | Deposit received. |
| `balance_pending` | Balance due. |
| `paid` | Full payment received. |
| `pickup_scheduled` | Pickup time set. |
| `ready` | Available for pickup. |
| `picked_up` | Fulfilled. |
| `missed_pickup` | Customer missed window. |
| `canceled` | Canceled. |
| `refunded` | Refund issued. |
| `credited` | Store credit issued. |
| `expired` | Payment link expired. |

### Allowed transitions

| From | To | Actor | Conditions |
|---|---|---|---|
| `draft` | `offered` | Owner / System | Payment link created |
| `offered` | `deposit_paid` | System | Square webhook: deposit received |
| `offered` | `paid` | System | Square webhook: full amount received |
| `offered` | `expired` | System | Link expired per policy |
| `deposit_paid` | `balance_pending` | System | Deposit < final price |
| `deposit_paid` | `paid` | System | Deposit was full amount |
| `balance_pending` | `paid` | System | Square webhook: balance received |
| `paid` | `pickup_scheduled` | Owner / System | Pickup arranged |
| `paid` | `ready` | Owner | Available at pickup location |
| `ready` | `picked_up` | Owner | Customer collected |
| `ready` | `missed_pickup` | Owner | Pickup window closed |
| `missed_pickup` | `credited` | Owner | Credit issued |
| `missed_pickup` | `refunded` | Owner | Refund issued |
| `any non-terminal` | `canceled` | Owner / Customer | With refund/credit if paid |
| `canceled` | `refunded` | Owner | After refund processed |
| `canceled` | `credited` | Owner | After credit recorded |

### Invalid transitions

| From | To | Why rejected |
|---|---|---|
| `picked_up` | `canceled` | Cannot reverse fulfillment. |
| `refunded` | `paid` | Refund already issued. |
| `expired` | `paid` | Expired link must be re-offered with a new link. |
| `draft` | `paid` | No payment received. |

---

## 4. Required server-side guards

1. **Transition map validation**: Every PATCH to request/batch/reservation status must pass `isValidTransition(current, next)`.
2. **Actor logging**: Record who initiated the transition.
3. **Condition checks**: e.g., cannot approve batch without price; cannot open reservations before approval.
4. **Side-effect routing**: Approved batch → allow reservations; canceled batch → notify affected customers; paid reservation → reduce available market volume.
5. **Audit-log write**: Every transition writes an immutable `batch_audit_log` document.
6. **Idempotency**: Same transition with same reason should not create duplicate audit entries.

---

## 5. Audit-log schema

```typescript
interface BatchAuditLogEvent {
  id: string;
  timestamp: Date;
  actor: string; // admin session id or 'system'
  actorType: 'owner' | 'system' | 'customer' | 'webhook';
  entityType: 'request' | 'batch' | 'reservation' | 'product' | 'market' | 'setting';
  entityId: string;
  action: string;
  previousState?: string;
  newState?: string;
  metadata?: Record<string, unknown>;
  reason?: string;
  correlationId?: string;
}
```

---

## 6. Implementation priority

1. Add `isValidTransition` helpers for request, batch, and reservation.
2. Add `transitionRequestStatus`, `transitionBatchStatus`, `transitionReservationStatus` repository functions.
3. Enforce transitions in admin PATCH APIs.
4. Write audit-log entries on every transition.
5. Add tests covering every allowed and representative invalid transition.
