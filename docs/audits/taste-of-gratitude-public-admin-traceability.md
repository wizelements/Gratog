# Taste of Gratitude — Public-to-Admin Traceability Matrix

**Audit date:** 2026-07-24  
**Branch:** `feat/fresh-batch-request-system`  
**Status:** Matrix covers current implementation plus documented intended behavior. Blank cells indicate missing implementation.

---

## Bidirectional traceability matrix

| Public action | API | Stored record | Admin location | Owner action | Resulting customer state | Notification | Payment effect |
|---|---|---|---|---|---|---|---|
| Request a flavor | `POST /api/fresh-batch/requests` | `fresh_batch_requests` | `/admin/fresh-batches` | Review, assign, defer, reject | `requested` or decision-engine status | Resend confirmation + owner alert | None |
| Join a future batch | Same as request + deferred status | `fresh_batch_requests` | `/admin/fresh-batches` | Create batch when threshold met | `collecting_demand` | Threshold reached email (planned) | None until reservation |
| Select market | Form field in request | `fresh_batch_requests.marketId` | `/admin/fresh-batches`, `/admin/markets` | Assign batch market | Tied to batch market | Confirmation includes market | None |
| Request a sample | Quantity unit `sample_interest` | `fresh_batch_requests` | `/admin/fresh-batches` | Approve sample allocation | Marked as sample interest | Owner alert only | None |
| Join the email list | `POST /api/lead` | `subscribers` | `/admin/subscribers` | Export, tag | `subscribed` | Welcome/confirmed email | None |
| Submit a preorder | `POST /api/preorder` | `preorders` | `/admin/preorders` | Confirm, create payment link | `pending` → `reserved` | Resend confirmation | Square payment link |
| Reserve a gallon | Owner creates reservation after approval | `batch_reservations` | `/admin/fresh-batches/planner` | Create reservation + Square link | `offered` | Resend reservation offer with link | Square link created, not yet paid |
| Receive a reservation offer | Email from `sendBatchConfirmedEmail` | `batch_reservations` | `/admin/fresh-batches/planner` | View sent link | `offered` | Resend offer | None |
| Pay a deposit | Customer clicks Square link | Square order + `batch_reservations` | `/admin/fresh-batches/planner`, `/admin/orders` | Mark payment received | `deposit_paid` | Payment confirmation (planned) | Deposit captured |
| Pay a balance | Square link for remaining balance | Square order + `batch_reservations` | `/admin/fresh-batches/planner` | Confirm full payment | `paid` | Balance confirmation (planned) | Balance captured |
| Cancel a request | `PATCH /api/admin/fresh-batch/requests` | `fresh_batch_requests` | `/admin/fresh-batches` | Change status to `canceled` | `canceled` | Cancellation email (planned) | Refund if paid |
| Receive pickup instructions | Email from `sendBatchConfirmedEmail` (future) | `batch_reservations` | `/admin/fresh-batches/planner` | Send pickup details | `ready_for_pickup` | Pickup instructions | None |
| Complete pickup | `PATCH` reservation pickup status | `batch_reservations` | `/admin/fresh-batches/planner` | Mark `picked_up` | `picked_up` | Thank you / receipt (planned) | None |
| Miss pickup | `PATCH` reservation pickup status | `batch_reservations`, audit log | `/admin/fresh-batches/planner` | Mark `missed_pickup` | `missed_pickup` | Follow-up / credit offer (planned) | Credit or reschedule |
| Join the next batch | New request referencing previous batch | `fresh_batch_requests` | `/admin/fresh-batches` | Assign to next batch | `assigned` | New batch offer (planned) | None until new reservation |
| Product or batch sold out | Admin changes batch status | `batch_campaigns`, storefront API | `/admin/fresh-batches/planner`, `/admin/products` | Mark `sold_out` | Public availability updated | Sold-out notification to waitlist (planned) | None |

---

## Public-to-admin coverage notes

### Covered (functional today)

- **Request a flavor** → stored, confirmed, owner alerted, visible in admin list.
- **Email list signup** → stored in `subscribers`, visible in `/admin/subscribers`.
- **Preorder** → stored in `preorders`, visible in `/admin/preorders`.
- **Reservation creation** → API works, creates `batch_reservations` + Square link + email.

### Partially covered

- **Market selection**: form captures it; admin does not yet validate market status or show market-specific instructions.
- **Sample interest**: captured as a quantity unit; admin does not yet separate sample volume from paid demand.
- **Pickup workflow**: pickup status field exists; UI and webhook not built.

### Not covered

- **Threshold reached email**: not implemented.
- **Balance-due email**: not implemented.
- **Cancellation email**: not implemented.
- **Pickup instructions email**: not implemented.
- **Sold-out notification**: not implemented.
- **Webhook payment reconciliation**: not implemented.
- **Communication history UI**: not implemented.

---

## Admin-to-public consistency rules

1. A `fresh_batch_request` marked `canceled` must never show as active in public or send a payment link.
2. A `batch_campaigns` record in `draft` must never appear in public batch status or allow reservations.
3. A `batch_campaigns` record marked `approved` but not `reservations_open` must not allow new reservations.
4. A `batch_reservations` record marked `paid` must reduce available market volume.
5. A `batch_reservations` record marked `canceled` must restore available market volume and log the change.
6. A product marked `sold_out` in admin must hide or disable public selection.
7. A market marked inactive must not appear in public request forms or batch pickup options.
8. Any email failure in admin must not silently fail; the public customer must not be told communication succeeded if it did not.

---

## Required API additions

| API | Purpose | Auth |
|---|---|---|
| `PATCH /api/admin/fresh-batch/requests/:id/status` | Transition request state | `requireAdminSession` |
| `POST /api/admin/fresh-batch/batches` | Create/update batch | `requireAdminSession` |
| `PATCH /api/admin/fresh-batch/batches/:id/status` | Transition batch state | `requireAdminSession` |
| `POST /api/admin/fresh-batch/reservations/:id/notify` | Retry or send pickup email | `requireAdminSession` |
| `PATCH /api/admin/fresh-batch/reservations/:id/pickup` | Mark pickup status | `requireAdminSession` |
| `GET /api/admin/fresh-batch/communications` | Communication timeline | `requireAdminSession` |
| `GET /api/admin/fresh-batch/audit-log` | Read-only audit log | `requireAdminSession` |
| `POST /api/webhooks/square/payment` | Reconcile payment status | Square signature secret |

---

## Known mismatches

| Issue | Risk | Mitigation planned |
|---|---|---|
| Customer request status is `requested` but admin shows raw list with no status actions. | Owner cannot act. | Build inbox status actions. |
| Batch planner is placeholder. | Owner cannot approve production. | Implement planner. |
| Reservation API exists but no UI. | Owner must call API manually. | Add reservation UI. |
| Payment status not reconciled automatically. | Over/under-production. | Add Square webhook. |
| No communication history. | Owner cannot confirm email delivery. | Add communication log. |
