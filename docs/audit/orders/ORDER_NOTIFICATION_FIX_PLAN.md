# Order Notification Fix Plan

**Status**: PLANNED  
**Last Updated**: 2026-06-02  
**Owner**: AMP remediation plan  
**Repository**: Gratog-live

---

## Overview

This is the implementation checklist to move GRATOG order communications from **C- / alert-risky** to **boringly reliable**. It is ordered by revenue risk: first restore staff awareness, then make notifications durable, then repair webhook/queue/admin visibility gaps.

Source audit docs:

- [Order Notification Scorecard](./ORDER_NOTIFICATION_SCORECARD.md)
- [Admin Notification Audit](./ADMIN_NOTIFICATION_AUDIT.md)
- [Customer Confirmation Audit](./CUSTOMER_CONFIRMATION_AUDIT.md)
- [Square Webhook Audit](./SQUARE_WEBHOOK_AUDIT.md)
- [Failure Analysis](./ORDER_FAILURE_ANALYSIS.md)

---

## Table Of Contents

1. [Definition Of Done](#definition-of-done)
2. [Risk-Ranked Workstreams](#risk-ranked-workstreams)
3. [Implementation Guardrails](#implementation-guardrails)
4. [Data Contract To Add](#data-contract-to-add)
5. [Phase 0 — Safety Setup](#phase-0--safety-setup)
6. [Phase 1 — P0 Hotfix: Staff Email Must Not Throw](#phase-1--p0-hotfix-staff-email-must-not-throw)
7. [Phase 2 — Track Staff Notification Attempts Durably](#phase-2--track-staff-notification-attempts-durably)
8. [Phase 3 — Fix Customer Email Claim/Retry Semantics](#phase-3--fix-customer-email-claimretry-semantics)
9. [Phase 4 — Fix Resend Webhook Correlation](#phase-4--fix-resend-webhook-correlation)
10. [Phase 5 — Normalize Order/Payment/Fulfillment Statuses](#phase-5--normalize-orderpaymentfulfillment-statuses)
11. [Phase 6 — Preserve First Paid Timestamp](#phase-6--preserve-first-paid-timestamp)
12. [Phase 7 — Make Square Webhook Retry/Dedupe Safe](#phase-7--make-square-webhook-retrydedupe-safe)
13. [Phase 8 — Move Market Queue Creation Server-Side](#phase-8--move-market-queue-creation-server-side)
14. [Phase 9 — Repair Admin Order Visibility](#phase-9--repair-admin-order-visibility)
15. [Phase 10 — Restore Or Remove Square Order Sync UI](#phase-10--restore-or-remove-square-order-sync-ui)
16. [Phase 11 — Add Operational Alert Fallback](#phase-11--add-operational-alert-fallback)
17. [Phase 12 — Tests To Add Before Deploy](#phase-12--tests-to-add-before-deploy)
18. [Phase 13 — Staging Verification](#phase-13--staging-verification)
19. [Phase 14 — Production Deployment And Forensic Proof](#phase-14--production-deployment-and-forensic-proof)
20. [Engineer Task Board](#engineer-task-board)
21. [Production Proof Checklist](#production-proof-checklist)
22. [Rollback Plan](#rollback-plan)
23. [Recommended Implementation Order](#recommended-implementation-order)

---

## Definition Of Done

The fix is complete only when a new production test order proves all of this with timestamps:

- Customer payment completes in Square.
- Mongo order is paid/confirmed and has stable first-paid timestamp.
- Customer confirmation is sent, tracked, and delivered or visibly failed/retryable.
- Staff email is sent to all configured staff recipients and tracked in `email_sends`.
- Staff/admin can see the order without relying on manual Square dashboard checks.
- Market pickup queue row is created server-side, not browser-only.
- Square webhook replay cannot duplicate emails and failed webhook events are retryable.
- Admin orders UI classifies paid/pickup orders correctly.
- A new forensic replay doc confirms the post-fix order path.

---

## Risk-Ranked Workstreams

| Priority | Workstream | Why it matters | First file to touch | Proof required |
|---:|---|---|---|---|
| P0 | Staff email template hotfix | Current verified paid order produced no staff email. | `lib/staff-notifications.js` | Unit test + production staff `email_sends` row. |
| P0 | Durable notification state | Current failures require Vercel logs to detect. | `lib/staff-notifications.js` | Paid order shows `staffNotificationStatus`. |
| P0 | Customer email retry semantics | `emailSentAt` currently means “claimed,” not “sent.” | `app/api/payments/route.ts` | Failed Resend attempt is visible and retryable. |
| P1 | Resend webhook correlation | Delivered events do not update local transactional rows. | `app/api/webhooks/resend/route.js` | Webhook updates `email_sends.lastEventType`. |
| P1 | Status normalization | Admin filters can miss paid/pickup orders. | `app/admin/orders/page.js` | Real paid pickup order appears under filters. |
| P1 | First paid timestamp preservation | Webhook replay overwrote paid evidence. | `app/api/webhooks/square/route.ts` | Replay updates reconciliation timestamp, not `firstPaidAt`. |
| P1 | Webhook retry/dedupe | Error rows can suppress Square retries. | `app/api/webhooks/square/route.ts` | Same failed event can retry; success replay skipped. |
| P2 | Server-side queue creation | Fulfillment queue currently depends on browser redirect. | `app/api/payments/route.ts` | Paid market order creates one queue row server-side. |
| P2 | Admin operational view | Staff needs order/contact/alert status in one place. | `app/api/admin/orders/route.ts` | Authenticated admin sees phone/email/status badges. |
| P2 | Square sync route decision | UI references sync path not proven in code tree. | `app/admin/orders/page.js` | Button works with route or is removed/disabled. |
| P3 | SMS fallback | Adds second alert channel after email is stable. | `lib/sms.ts` | Configured test SMS is idempotent and tracked. |

---

## Implementation Guardrails

- Do not change checkout UX until staff/customer notification correctness is proven.
- Do not make payment success depend on email/SMS provider success; surface failures and retry them instead.
- Do not send real test emails/SMS from unit tests; mock providers.
- Do not bulk-migrate historical production orders until read paths handle both old and new fields.
- Do not log raw secrets, full card data, or full customer contact data.
- Do not overwrite historical evidence fields such as first paid timestamp.
- Do not create duplicate staff/customer emails from webhook replay.
- Do not rely on Square webhook as the only path for Gratog checkout orders; `/api/payments` remains the primary write path.
- Do not ship UI status badges without backing DB fields; avoid decorative “green” states.
- Do not deploy to production until staging proves the full chain with a controlled order.

---

## Data Contract To Add

### Order fields

Add fields lazily on new/updated orders; reads must tolerate missing fields on historical orders.

| Field | Type | Set by | Meaning |
|---|---|---|---|
| `firstPaidAt` | ISO string/date | `/api/payments` or Square webhook | First moment Gratog recognized completed payment. Never overwrite. |
| `firstPaidSource` | string | `/api/payments` or Square webhook | `api_payments`, `square_webhook`, or `square_sync`. |
| `lastPaymentReconciledAt` | ISO string/date | Square webhook/sync | Later Square reconciliation timestamp. |
| `emailClaimedAt` | ISO string/date | customer email helper | In-flight customer email claim. Not proof of send. |
| `emailSentAt` | ISO string/date | customer email helper | Provider accepted customer confirmation. |
| `emailFailedAt` | ISO string/date | customer email helper | Last customer confirmation failure time. |
| `emailError` | string | customer email helper | Sanitized last customer confirmation error. |
| `emailSendAttemptCount` | number | customer email helper | Count of customer confirmation attempts. |
| `emailMessageId` | string | customer email helper | Resend/customer email id. |
| `staffNotificationClaimedAt` | ISO string/date | staff notification helper | In-flight staff alert claim. |
| `staffNotificationAttemptedAt` | ISO string/date | staff notification helper | Last staff alert attempt time. |
| `staffNotificationAttemptCount` | number | staff notification helper | Count of staff alert attempts. |
| `staffNotificationStatus` | string | staff notification helper | `pending`, `sent`, `failed`, `skipped`. |
| `staffNotificationError` | string | staff notification helper | Sanitized last staff alert error. |
| `staffNotificationMessageId` | string | staff notification helper | Resend/staff email id. |
| `staffNotifiedAt` | ISO string/date | staff notification helper | Staff email accepted by provider. |
| `staffSmsNotifiedAt` | ISO string/date | SMS helper | Optional SMS accepted by provider. |
| `queueCreatedAt` | ISO string/date | queue helper | Server-side queue row created. |
| `queueStatus` | string | queue helper | Queue lifecycle summary for admin. |

### `email_sends` fields

| Field | Type | Meaning |
|---|---|---|
| `resendId` | string | Canonical Resend email id. |
| `messageId` | string | Legacy alias; keep during transition. |
| `orderId` | string | Local order id. |
| `emailType` | string | `order_confirmation`, `staff_order_notification`, etc. |
| `status` | string | `queued`, `sent`, `delivered`, `failed`, `bounced`, `complained`. |
| `lastEventType` | string | Last Resend webhook event type. |
| `lastEventAt` | ISO string/date | Last Resend webhook timestamp. |
| `deliveredAt` | ISO string/date | Delivery proof timestamp if provided. |
| `failureReason` | string | Sanitized provider failure. |

### `webhook_events_processed` fields

| Field | Type | Meaning |
|---|---|---|
| `eventId` | string | Square event id; unique key. |
| `eventType` | string | Square event type. |
| `status` | string | `processing`, `success`, `error`. |
| `attemptCount` | number | Number of attempts for this event id. |
| `firstAttemptAt` | ISO string/date | First time seen. |
| `lastAttemptAt` | ISO string/date | Last processing attempt. |
| `processedAt` | ISO string/date | Successful processing timestamp. |
| `lastError` | string | Sanitized error from last failed attempt. |

---

## Phase 0 — Safety Setup

1. Create a branch:
   ```bash
   git checkout -b fix/order-notifications-reliability
   ```
2. Confirm no unrelated changes will be touched:
   ```bash
   git status --short
   ```
3. Pull production env for verification only; do not commit it:
   ```bash
   TMPDIR="$PWD/.tmp" npx vercel env pull --environment=production .tmp/.env.prod.fresh
   ```
4. Record baseline for the last verified order:
   - Order id: `0ca234e0-eb0b-4397-82f6-bfa14bf4f81f`
   - Staff notified: absent
   - Customer email delivered: yes
   - Staff error: `ReferenceError: location is not defined`
5. Add temporary test-only mocks instead of using real Resend/Square in unit tests.

---

## Phase 1 — P0 Hotfix: Staff Email Must Not Throw

### Target files

- `lib/staff-notifications.js`
- `tests/unit/` or existing notification test area

### Steps

1. In `notifyStaffPickupOrder(order)`, derive all template values before the HTML/text template:
   - `orderDisplay`: `order.orderNumber || order.orderRef || order.id || 'Unknown'`
   - `fulfillmentType`: normalized from `order.fulfillmentType`
   - `locationLabel`: market/dunwoody/delivery/shipping-safe value
   - `pickupTimeLabel`: order pickup window, requested time, or `ASAP / next available pickup window`
   - `readyByLabel`: explicit ready-by value or `Confirm in Square/admin dashboard`
   - `customerName`, `customerEmail`, `customerPhone`
   - `itemsText` / `itemsHtml`
2. Replace undefined plain-text identifiers:
   - Replace `${location}` with `${locationLabel}`.
   - Replace `${pickupTime}` with `${pickupTimeLabel}`.
   - Replace `${readyBy}` with `${readyByLabel}`.
3. Keep the existing `STAFF_EMAIL` recipient behavior, but validate after splitting:
   - Trim emails.
   - Drop empty values.
   - Return `{ success: false, error: 'NO_STAFF_EMAIL' }` if none remain.
4. Ensure staff email sends one message to all configured recipients or deterministic individual messages, but do not silently skip a recipient.
5. Add a unit test that mocks `sendEmail` and calls `notifyStaffPickupOrder` with the real-order shape:
   - `fulfillmentType: pickup_market`
   - one item
   - customer name/email/phone
   - no `orderNumber`
   - expected: no throw; `sendEmail` called; text body contains location/time/ready-by fallback.
6. Add a second unit test for missing optional fulfillment fields.
7. Run targeted verification:
   ```bash
   npx vitest run tests/unit/<new-staff-notification-test>.spec.ts --reporter=verbose
   ```

### Acceptance Criteria

- `notifyStaffPickupOrder` cannot throw from missing optional order fields.
- A failed Resend response is returned as a structured failure, not an uncaught exception.
- Existing `/api/payments` non-blocking behavior remains, but staff failure is visible in logs/result.

---

## Phase 2 — Track Staff Notification Attempts Durably

### Target files

- `lib/staff-notifications.js`
- `app/api/payments/route.ts`
- `app/api/webhooks/square/route.ts`
- `app/api/admin/orders/route.ts`
- `app/admin/orders/page.js`

### Steps

1. In `claimAndNotifyStaffOrder`, record every attempt:
   - `staffNotificationAttemptedAt`
   - `staffNotificationAttemptCount`
   - `staffNotificationStatus: 'pending' | 'sent' | 'failed'`
   - `staffNotificationError` on failure
   - `staffNotificationMessageId` on success
2. Keep `staffNotifiedAt` only for confirmed successful sends.
3. On failure, clear only the in-flight claim, but preserve failure fields.
4. Return structured result from `claimAndNotifyStaffOrder`:
   ```js
   { success: true, messageId, recipients }
   { success: false, code, error, retryable: true }
   ```
5. Update `/api/payments` staff-notification log to include structured result fields without leaking PII.
6. Update `/api/admin/orders` response to include staff notification status fields.
7. Add a visible admin badge:
   - `Staff alert sent`
   - `Staff alert failed`
   - `Staff alert pending`
8. Add unit tests for success/failure attempt persistence.

### Acceptance Criteria

- A paid order can no longer have an invisible staff notification failure.
- Admin can see whether staff alert failed without opening Vercel logs.

---

## Phase 3 — Fix Customer Email Claim/Retry Semantics

### Target files

- `app/api/payments/route.ts`
- `app/api/webhooks/square/route.ts`
- `lib/resend-email.js`

### Steps

1. Replace pre-send `emailSentAt` claim semantics with separate fields:
   - `emailClaimedAt` before send
   - `emailSentAt` only after provider success
   - `emailFailedAt` and `emailError` on failure
   - `emailSendAttemptCount`
2. Update `/api/payments` customer email flow:
   - Atomically claim with `emailSentAt: { $exists: false }` and no active recent claim.
   - Send email.
   - If success: set `emailSentAt`, clear `emailError`, store message id.
   - If failure: set `emailFailedAt`, `emailError`, clear/release claim after retry window.
3. Update Square webhook customer fallback to use the same atomic claim function, not its own read-then-send logic.
4. Add idempotent helper, for example `claimAndSendCustomerConfirmation(db, orderId, orderPayload)`.
5. Add tests for:
   - first send success
   - Resend failure then retry eligibility
   - API/webhook race sends one email only
   - missing customer email skips with explicit status

### Acceptance Criteria

- `emailSentAt` means provider accepted the email, not merely “we tried.”
- A failed customer confirmation is retryable and visible.
- API/webhook race cannot duplicate confirmations.

---

## Phase 4 — Fix Resend Webhook Correlation

### Target files

- `lib/resend-email.js`
- `app/api/webhooks/resend/route.js`

### Steps

1. When Resend returns an id, store it consistently in both fields or standardize on one:
   - Preferred: `resendId: result.data.id`
   - Keep `messageId` as legacy alias if existing code expects it.
2. Update Resend webhook lookup to match either field:
   ```js
   { $or: [{ resendId: data.email_id }, { messageId: data.email_id }] }
   ```
3. Update webhook status mapping:
   - `email.sent` / `sent` → `sent`
   - `email.delivered` / `delivered` → `delivered`
   - `email.bounced` / `bounced` → `bounced`
   - `email.complained` / `complained` → `complained`
   - delivery failure → `failed`
4. Store lifecycle fields:
   - `lastEventType`
   - `lastEventAt`
   - `deliveredAt`
   - `bouncedAt`
   - raw event id for dedupe if present
5. Add tests for webhook payloads using a real stored `messageId`.

### Acceptance Criteria

- A delivered Resend event updates the original `email_sends` row.
- The real order failure mode (`messageId` set, `resendId` null) is covered by test.

---

## Phase 5 — Normalize Order/Payment/Fulfillment Statuses

### Target files

- `app/api/payments/route.ts`
- `app/api/webhooks/square/route.ts`
- `app/api/admin/orders/route.ts`
- `app/admin/orders/page.js`
- `app/admin/page.js`

### Steps

1. Choose canonical internal values and document them:
   - `status`: `pending | payment_processing | confirmed | fulfilled | cancelled | refunded`
   - `paymentStatus`: `pending | processing | paid | completed | failed | refunded`
   - `fulfillmentType`: keep actual values such as `pickup_market`, but map them into UI categories.
2. Add local normalizers if a shared constants file is not already available:
   - `normalizeOrderStatus(value)`
   - `normalizePaymentStatus(value)`
   - `normalizeFulfillmentCategory(value)`
3. Update admin filtering/counts to handle existing uppercase historical values:
   - `CONFIRMED` and `confirmed`
   - `PAID`, `COMPLETED`, `paid`, `completed`
   - `pickup_market`, `pickup_dunwoody`, `pickup`
4. Update admin API to return normalized display fields plus raw fields.
5. Preserve backwards compatibility; do not bulk-migrate production records until reads are safe.

### Acceptance Criteria

- The real order appears in paid and pickup admin filters.
- Future paid orders appear correctly before any webhook replay.

---

## Phase 6 — Preserve First Paid Timestamp

### Target files

- `app/api/payments/route.ts`
- `app/api/webhooks/square/route.ts`

### Steps

1. Add immutable first-payment fields:
   - `firstPaidAt`
   - `firstPaidSource: 'api_payments' | 'square_webhook' | 'square_sync'`
2. In `/api/payments`, set `firstPaidAt` only if absent.
3. In Square webhook, set `firstPaidAt` only if absent; otherwise update `lastPaymentReconciledAt`.
4. Keep `paidAt` for compatibility, but stop overwriting first-paid evidence.
5. Add tests for webhook replay after API payment.

### Acceptance Criteria

- Webhook replay cannot erase the original payment completion time.
- Forensic replay can distinguish first payment from later reconciliation.

---

## Phase 7 — Make Square Webhook Retry/Dedupe Safe

### Target files

- `app/api/webhooks/square/route.ts`

### Steps

1. Change dedupe lookup to skip only successful prior events by default:
   - If existing event `status === 'success'`, return cached success.
   - If existing event `status === 'error'`, allow retry or mark retry attempt.
2. Add fields to `webhook_events_processed`:
   - `attemptCount`
   - `firstAttemptAt`
   - `lastAttemptAt`
   - `lastError`
   - `status`
3. Use an upsert pattern keyed by `eventId` so concurrent webhooks do not double-process.
4. On handler error, return 500 only after storing retryable state.
5. For `payment.updated`, call the same staff notification claim helper when a local order becomes paid and staff alert is absent.
6. Ensure customer fallback uses the shared customer confirmation claim helper from Phase 3.
7. Add tests for:
   - same event success replay skipped
   - same event prior error retried
   - different event same payment does not duplicate email/staff notifications

### Acceptance Criteria

- Square retry after an error actually retries processing.
- Payment webhook reconciliation can repair missed staff/customer notifications without duplicates.

---

## Phase 8 — Move Market Queue Creation Server-Side

### Target files

- `app/api/payments/route.ts`
- `app/api/queue/join/route.js`
- `lib/queue-integration.js`
- `components/checkout/ReviewAndPay.tsx`
- `app/api/queue/active/route.js` or equivalent new route

### Steps

1. Extract queue insertion logic from `/api/queue/join` into a shared server helper, for example:
   - `createQueuePositionForPaidOrder(db, order)`
2. Call that helper inside `/api/payments` after paid order update for `pickup_market` orders.
3. Make queue insertion idempotent by `orderId`.
4. Keep client-side queue join as fallback only; it should not be the primary fulfillment signal.
5. Fix collection naming so reads/writes use the same collection consistently.
6. Implement `/api/queue/active?marketId=...` if vendor/admin pages rely on it, or update those pages to call an existing route.
7. Add tests for:
   - paid pickup order creates one queue row
   - duplicate payment/webhook/client retry does not create duplicate queue rows
   - `/api/queue/active` returns queued orders for staff/vendor view

### Acceptance Criteria

- Staff queue visibility does not depend on the customer browser surviving redirect.
- Vendor/admin active queue route returns 200 in production.

---

## Phase 9 — Repair Admin Order Visibility

### Target files

- `app/api/admin/orders/route.ts`
- `app/admin/orders/page.js`
- `app/admin/page.js`

### Steps

1. Return complete operational contact fields to authenticated admins:
   - customer name
   - email
   - phone
   - fulfillment notes/instructions
2. Keep masking only for non-admin/public endpoints.
3. Add paid/staff/email/queue badges:
   - payment status
   - customer email status
   - staff notification status
   - queue status
4. Add light polling or refresh-on-focus for active market days:
   - 15-30 second interval while page is open, or SWR refresh interval.
5. Add an obvious warning if staff notification failed for any paid unfulfilled order.
6. Verify admin list, paid filter, pickup filter, and order detail all show the real-order data.

### Acceptance Criteria

- Staff can fulfill from Gratog admin without opening Square.
- Paid orders with failed staff notification are visible as exceptions.

---

## Phase 10 — Restore Or Remove Square Order Sync UI

### Target files

- `app/admin/page.js`
- `app/admin/orders/page.js`
- expected route: `app/api/admin/orders/sync/route.ts` or `.js`
- `lib/square-orders-sync.js`

### Steps

1. Decide one of two paths:
   - Implement authenticated `/api/admin/orders/sync` using `lib/square-orders-sync.js`.
   - Or remove/disable the sync buttons and labels if sync is not part of operations.
2. If implementing sync:
   - Require admin auth.
   - Fetch recent Square orders for `SQUARE_LOCATION_ID`.
   - Upsert by Square order id / local reference id.
   - Do not overwrite first-paid timestamp.
   - Do not duplicate emails or staff alerts unless explicitly repairing missing notifications.
3. Add tests for auth, idempotent sync, and missing local order repair.

### Acceptance Criteria

- Admin UI no longer references an unimplemented or unverified sync path.
- Square-only orders have a controlled local reconciliation path.

---

## Phase 11 — Add Operational Alert Fallback

### Target files

- `lib/sms.ts`
- `app/api/payments/route.ts`
- `lib/staff-notifications.js`
- admin notification config docs/env docs

### Steps

1. Decide the alert hierarchy:
   1. Staff email via Resend.
   2. SMS/text if configured.
   3. Admin dashboard failed-alert badge.
2. Confirm production config has intended phone recipients before enabling SMS.
3. Add `STAFF_PHONE` validation and opt-in docs.
4. Send SMS only after successful payment, never before charge completion.
5. Keep SMS idempotent by order id with `staffSmsNotifiedAt` and `staffSmsMessageId`.
6. Add tests with provider mocks.

### Acceptance Criteria

- A paid order has at least two independent staff-awareness paths: dashboard plus email/SMS.
- SMS absence is explicit, not silent.

---

## Phase 12 — Tests To Add Before Deploy

### Unit tests

Add or extend tests for:

- Staff notification template does not throw with real-order shape.
- Staff notification success/failure persistence.
- Customer confirmation claim/send/retry semantics.
- Resend webhook correlation by `messageId` and `resendId`.
- Square webhook retry after prior error.
- Webhook/API race sends one customer email and one staff email.
- Queue creation is server-side and idempotent.
- Admin status/fulfillment filters handle historical and canonical values.

### API/integration tests

- Mock Square payment success through `/api/payments`.
- Mock Resend success and failure.
- Verify order fields after payment:
  - `firstPaidAt`
  - `emailSentAt` or `emailFailedAt`
  - `staffNotifiedAt` or `staffNotificationStatus=failed`
  - queue row for market pickup
- POST Square webhook replay and verify no duplicates.

### Commands

Run narrow checks first:

```bash
npx vitest run tests/unit/<notification-tests>.spec.ts --reporter=verbose
npx vitest run tests/unit/<webhook-tests>.spec.ts --reporter=verbose
npx vitest run tests/unit/<queue-tests>.spec.ts --reporter=verbose
```

Then run broader checks:

```bash
npm run test:unit
npm run test:api
npm run build
```

Only run Playwright payment smoke when sandbox/prod-safe test credentials are confirmed:

```bash
npm run test:pay:smoke
```

---

## Phase 13 — Staging Verification

1. Deploy to preview/staging.
2. Confirm env presence only, not values:
   - `SQUARE_ENVIRONMENT`
   - `SQUARE_LOCATION_ID`
   - `RESEND_API_KEY`
   - `RESEND_WEBHOOK_SECRET`
   - `STAFF_EMAIL`
   - optional `STAFF_PHONE`
3. Place a controlled test order.
4. Record timestamps:
   - order created
   - payment created/completed
   - Mongo paid update
   - customer email sent/delivered
   - staff email sent/delivered
   - queue row created
   - admin visible
   - webhook processed
5. Confirm no duplicate rows in:
   - `email_sends`
   - `webhook_events_processed`
   - `queuepositions`
   - payment records

---

## Phase 14 — Production Deployment And Forensic Proof

1. Deploy only after staging proves the full chain.
2. Place one low-value production test order.
3. Capture evidence from:
   - Square payment/order API
   - Mongo `orders`
   - Mongo `email_sends`
   - Mongo `queuepositions`
   - Mongo `webhook_events_processed`
   - Resend message API
   - Vercel logs
4. Create a post-fix replay doc:
   - `docs/audit/orders/POST_FIX_ORDER_FORENSIC_REPLAY.md`
5. Update the scorecard grades only with evidence.

---

## Engineer Task Board

Use this as the execution checklist. Do not mark a ticket done until its proof is attached to the PR or deployment note.

### Ticket 1 — Staff notification template no-throw hotfix

- **Priority**: P0
- **Files**: `lib/staff-notifications.js`, unit test file.
- **Change**: Replace undefined `location`, `pickupTime`, and `readyBy` template references with derived safe labels.
- **Tests**: Real-order-shape unit test proves no throw and `sendEmail` call.
- **Proof**: Targeted Vitest output and mocked email payload snapshot/assertions.
- **Ship gate**: Must pass before any production retest.

### Ticket 2 — Staff notification persistence

- **Priority**: P0
- **Files**: `lib/staff-notifications.js`, `app/api/payments/route.ts`, `app/api/admin/orders/route.ts`.
- **Change**: Persist attempt status, attempt count, message id, and sanitized errors.
- **Tests**: success, provider failure, exception failure, duplicate claim.
- **Proof**: DB document after mocked success and failure.
- **Ship gate**: Paid order cannot have unknown staff alert state.

### Ticket 3 — Customer confirmation claim/retry helper

- **Priority**: P0
- **Files**: `app/api/payments/route.ts`, `app/api/webhooks/square/route.ts`, new or existing email helper.
- **Change**: Convert `emailSentAt` from pre-send claim to post-provider-success timestamp; add retryable failure fields.
- **Tests**: success, failure, retry, API/webhook race.
- **Proof**: One `email_sends` row per order confirmation and correct order fields.
- **Ship gate**: Customer email failures visible without false `emailSentAt` success.

### Ticket 4 — Resend lifecycle webhook repair

- **Priority**: P1
- **Files**: `lib/resend-email.js`, `app/api/webhooks/resend/route.js`.
- **Change**: Store canonical `resendId`; update webhook lookup to match `resendId` or legacy `messageId`.
- **Tests**: delivered/bounced/complained events update the original row.
- **Proof**: Local webhook test updates `email_sends.lastEventType`.
- **Ship gate**: Delivered customer/staff email is visible in Mongo.

### Ticket 5 — Admin status normalization

- **Priority**: P1
- **Files**: `app/api/admin/orders/route.ts`, `app/admin/orders/page.js`, `app/admin/page.js`.
- **Change**: Normalize uppercase/lowercase payment/order statuses and pickup variants for filters/counts.
- **Tests**: sample orders with `PAID`, `COMPLETED`, `confirmed`, `pickup_market` all classify correctly.
- **Proof**: Admin paid/pickup filters include the verified real order shape.
- **Ship gate**: No paid market order hidden by filters.

### Ticket 6 — First paid timestamp preservation

- **Priority**: P1
- **Files**: `app/api/payments/route.ts`, `app/api/webhooks/square/route.ts`.
- **Change**: Add `firstPaidAt`/`firstPaidSource`; webhook updates reconciliation fields only when first-paid exists.
- **Tests**: API payment followed by webhook replay preserves first-paid timestamp.
- **Proof**: DB document before/after replay.
- **Ship gate**: Forensic timeline remains accurate.

### Ticket 7 — Square webhook retry/dedupe correction

- **Priority**: P1
- **Files**: `app/api/webhooks/square/route.ts`.
- **Change**: Treat `success` events as final; allow `error` events to retry; track attempt count.
- **Tests**: prior error retries, prior success skips, different event id same payment does not duplicate notifications.
- **Proof**: `webhook_events_processed` attempt fields update correctly.
- **Ship gate**: Square retry behavior is recoverable.

### Ticket 8 — Server-side queue insertion

- **Priority**: P2
- **Files**: `app/api/payments/route.ts`, `app/api/queue/join/route.js`, queue helper, active queue route.
- **Change**: Create queue row idempotently from server payment path for market pickup.
- **Tests**: duplicate payment/webhook/client paths create one row.
- **Proof**: `queuepositions` row exists before customer redirect dependency.
- **Ship gate**: Staff queue does not rely on browser post-payment code.

### Ticket 9 — Admin operations view

- **Priority**: P2
- **Files**: `app/api/admin/orders/route.ts`, `app/admin/orders/page.js`.
- **Change**: Show customer contact, payment, customer email, staff alert, and queue status to authenticated admins.
- **Tests**: authenticated admin receives operational fields; unauth/public paths remain masked.
- **Proof**: admin screenshot or API response sample with masked secrets and visible operational contact.
- **Ship gate**: Staff can fulfill without Square dashboard.

### Ticket 10 — Square sync route decision

- **Priority**: P2
- **Files**: `app/admin/page.js`, `app/admin/orders/page.js`, optional `app/api/admin/orders/sync/route.ts`.
- **Change**: Implement authenticated sync or remove/disable UI references.
- **Tests**: button route returns expected result or UI no longer calls missing route.
- **Proof**: production/preview probe returns non-404 authenticated behavior.
- **Ship gate**: No dead admin controls.

### Ticket 11 — Optional SMS fallback

- **Priority**: P3
- **Files**: `lib/sms.ts`, notification helper, env docs.
- **Change**: Add idempotent SMS alert only if `STAFF_PHONE` is configured and approved.
- **Tests**: provider mocked success/failure; duplicate order does not duplicate SMS.
- **Proof**: message id stored on test order or explicit skipped status when unconfigured.
- **Ship gate**: SMS must never block payment success.

---

## Production Proof Checklist

For the post-fix production test order, record this table in `POST_FIX_ORDER_FORENSIC_REPLAY.md`.

| Proof item | Required evidence | Pass/Fail |
|---|---|---|
| Square payment completed | Square payment id, status, amount, created/completed timestamp | TBD |
| Square order completed | Square order id, state, line items, tender count | TBD |
| Mongo order paid | `orders.id`, `firstPaidAt`, `paymentStatus`, `squarePaymentId` | TBD |
| Customer confirmation sent | `email_sends` row with `emailType=order_confirmation`, `resendId/messageId` | TBD |
| Customer confirmation delivered | Resend API or webhook `delivered` event | TBD |
| Staff notification sent | `email_sends` row with staff notification type and recipient count | TBD |
| Staff notification tracked | `staffNotificationStatus=sent`, `staffNotifiedAt`, message id | TBD |
| No duplicate emails | exactly one customer confirmation and one staff notification for order | TBD |
| Queue row created server-side | queue row with order id/ref and `queueCreatedAt` | TBD |
| Admin order visible | authenticated admin API/UI shows order, contact, items, payment, notification badges | TBD |
| Webhook processed | `webhook_events_processed` success with attempt count | TBD |
| Webhook replay safe | replay or duplicate event does not duplicate email/queue/payment records | TBD |
| Failure visibility | simulated provider failure shows failed status and retryability in DB/admin | TBD |

---

## Rollback Plan

If production payment or notification behavior regresses:

1. Immediately revert the deployment in Vercel.
2. Keep Square dashboard as source of payment truth.
3. Query Mongo for paid orders during the incident window.
4. Manually notify staff for any paid orders missing `staffNotifiedAt`.
5. Manually email customers for any paid orders missing delivered customer confirmation.
6. Add the incident to `docs/audit/orders/ORDER_FAILURE_ANALYSIS.md` before reattempting deploy.

---

## Recommended Implementation Order

1. Phase 1: Staff template hotfix.
2. Phase 2: Staff attempt persistence/admin visibility.
3. Phase 3: Customer email claim/retry.
4. Phase 4: Resend webhook correlation.
5. Phase 5: Status normalization.
6. Phase 6: First paid timestamp.
7. Phase 7: Webhook retry/dedupe.
8. Phase 8: Server-side queue creation.
9. Phase 9: Admin visibility improvements.
10. Phase 10: Square sync UI decision.
11. Phase 11: SMS/alert fallback.
12. Phase 12-14: Tests, staging, production proof.

Do not ship phases 8-11 before phases 1-4 are verified; the current highest revenue risk is that staff does not receive reliable paid-order notification.

---

## Changelog

- 2026-06-02: Created full remediation plan from order-notification forensic audit.
