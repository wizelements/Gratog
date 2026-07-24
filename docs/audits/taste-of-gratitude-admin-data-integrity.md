# Taste of Gratitude — Admin Data Integrity and Audit Requirements

**Branch:** `feat/fresh-batch-request-system`  
**Audit date:** 2026-07-24  
**Status:** Read-only audit. No application code changed.

---

## 1. Source-of-Truth Definitions

| Domain | Source of truth | Cache / derived views | Notes |
|---|---|---|---|
| **Curated product catalog** | `data/products.ts` | `unified_products`, `square_catalog_items` | Curated data is authority for flavor names, slugs, categories, and standard bottle prices. |
| **Square catalog / live prices** | Square API | `square_catalog_items` | Used only after owner approval for payment-link creation. Not used for request-time pricing. |
| **Public market list** | `data/markets.ts` + `markets` collection | `/api/markets` response | DB markets override/extend file-based markets. |
| **Weekly menu** | `weekly_menus` collection + `data/weeklyMenu.ts` | `app/weekly-menu` pages | Owner-published menu is what customers see. |
| **Inventory availability** | `inventory` collection | Product detail / catalog pages | Manual stock counts; separate from fresh-batch reserved volume. |
| **Fresh batch demand** | `fresh_batch_requests` | `/admin/fresh-batches` grouping | Request records are never orders. |
| **Fresh batch production plan** | `batch_campaigns` | Batch planner, public batch board (future) | Owner-approved target gallons, price, and schedule. |
| **Fresh batch reservations** | `batch_reservations` | `/admin/fresh-batches` / planner | Created only after batch is confirmed. |
| **Owner alerts** | `owner_alert_queue` | Telegram + Resend fallback | Queue is durable; sends are best-effort with retry. |
| **Email lifecycle** | `email_sends` | `/admin/emails` | Every send, delivery, bounce, complaint recorded here. |
| **Admin audit trail** | `audit_logs` (unified) and `audit_log` (legacy) | Future `/admin/audit-logs` | Two collection names exist; plan migration to single `audit_logs`. |
| **Order / payment truth** | Square | `marketorders`, `batch_reservations` | Reconcile Square webhook events into application records. |

---

## 2. Required Audit-Log Events and Fields

Every owner-impacting action must append to `batch_audit_log` **and** the general `audit_logs` collection.

### 2.1 `batch_audit_log` schema

| Field | Type | Required | Description |
|---|---|---|---|
| `entityType` | `request` \| `batch` \| `reservation` | ✅ | What changed |
| `entityId` | string | ✅ | Public UUID of the entity |
| `action` | string | ✅ | e.g., `created`, `approved`, `deferred`, `rejected`, `assigned_to_batch`, `batch_confirmed`, `payment_link_created`, `payment_received`, `picked_up`, `no_show`, `canceled`, `refunded` |
| `actorEmail` | string | ✅ | Admin who performed the action |
| `actorRole` | string | ✅ | Role at time of action |
| `reason` | string \| null | | Owner-provided reason |
| `fromStatus` | string \| null | | Previous status |
| `toStatus` | string \| null | | New status |
| `payload` | object | | Snapshotted relevant fields (price, gallons, market, etc.) |
| `ipAddress` | string | | Client IP |
| `userAgent` | string | | Client UA |
| `createdAt` | Date | ✅ | Timestamp |

### 2.2 General `audit_logs` schema (existing)

The existing `logAdminAction` in `lib/security/index.ts` already writes:

| Field | Description |
|---|---|
| `timestamp` | Action time |
| `adminId` / `adminEmail` / `adminRole` | Actor |
| `action` | e.g., `UPDATE`, `CREATE`, `ACCESS_DENIED` |
| `resource` | e.g., `products`, `fresh_batch_requests` |
| `resourceId` | Entity ID |
| `details` | Sanitized payload |
| `ipAddress` / `userAgent` | Request metadata |
| `success` | Boolean |

### 2.3 Events that must be logged

| Event | Collection | Notes |
|---|---|---|
| Fresh batch request created | `batch_audit_log`, `audit_logs` | Log the public request, not PII beyond email |
| Request status changed | `batch_audit_log`, `audit_logs` | Include from/to status and reason |
| Batch campaign created | `batch_audit_log`, `audit_logs` | Snapshot price, gallons, market, ownerApproved |
| Batch campaign confirmed | `batch_audit_log`, `audit_logs` | Critical owner decision |
| Reservation created | `batch_audit_log`, `audit_logs` | Snapshot final price, deposit, setup fee |
| Square payment link created | `batch_audit_log`, `audit_logs` | Record `squarePaymentLinkId` |
| Payment received | `batch_audit_log`, `audit_logs` | Reconcile Square webhook |
| Pickup marked picked_up / no_show | `batch_audit_log`, `audit_logs` | Staff action at market |
| Refund / store credit issued | `batch_audit_log`, `audit_logs` | Financial event |
| Product price changed | `audit_logs` | Include old and new price |
| Inventory adjusted | `audit_logs` | Include delta and reason |
| Admin login / logout | `audit_logs` | Security event |
| Permission denied | `audit_logs` | Include required permission |

---

## 3. Concurrency and Idempotency Requirements

### 3.1 Atomic counters

| Counter | Collection | Use | Implementation |
|---|---|---|---|
| Batch campaign sequence | `batch_counters` | Human-friendly batch IDs | `findOneAndUpdate({ _id: 'batch_campaigns' }, { $inc: { seq: 1 } }, { upsert: true })` |
| (Optional) Reservation sequence | `batch_counters` | Reservation display IDs | Same pattern |

### 3.2 Reservation creation idempotency

`POST /api/admin/fresh-batch/reservations` must prevent double-creation:

- Idempotency key: `freshbatch_reservation_{requestId}_{batchId}`.
- Store the key in `batch_reservations.idempotencyKey` or `batch_audit_log`.
- On retry with the same key, return the existing reservation if it exists and is not canceled.

### 3.3 Payment status reconciliation idempotency

Square webhooks include `event_id` for each webhook. The handler must:

1. Check `batch_reservations.squareWebhookEventIds` array for the `event_id`.
2. Skip processing if already seen.
3. Append the `event_id` before applying the update (within a transaction if supported).

### 3.4 Batch capacity guard

When creating a reservation:

```typescript
const reserved = await db.collection('batch_reservations').aggregate([
  { $match: { batchId, paymentStatus: { $nin: ['canceled', 'failed'] } } },
  { $group: { _id: null, total: { $sum: '$gallonEquivalent' } } }
]).toArray();

if (reserved[0]?.total + newGallons > batch.targetGallons) {
  throw new Error('Batch would be over-reserved');
}
```

Use a write lock or optimistic concurrency (version field) on `batch_campaigns`.

### 3.5 Request status update concurrency

`PATCH /api/admin/fresh-batch/requests` bulk-updates by `id`. Each update should:

- Include `updatedAt`.
- Guard against transitioning from terminal states (`canceled`, `completed`).
- Use `findOneAndUpdate` per document rather than `updateMany` when status logic is complex.

---

## 4. Failure and Recovery UX Expectations

### 4.1 Owner/admin failures

| Failure | Expected UX | Recovery |
|---|---|---|
| Square payment link creation fails | Admin sees error with Square message; reservation stays in `pending` without link; customer not notified | Retry from admin; audit log records failure |
| Email send fails | Reservation is still created; warning shown to admin; `email_sends` has `failed` row | Manual resend button or owner-alert queue retry |
| Owner alert (Telegram/Resend) fails | Request persisted; alert queued in `owner_alert_queue` | Cron `/api/cron/owner-alerts` retries every 5 minutes |
| Database unavailable | API returns 503; customer sees polite retry message | Operations retry; MongoDB auto-reconnect |
| Over-reservation | Admin sees validation error; cannot create reservation | Increase batch size or split into new batch |
| Invalid status transition | Admin sees forbidden transition message | Correct workflow via allowed transitions |

### 4.2 Customer failures

| Failure | Expected UX | Recovery |
|---|---|---|
| Duplicate request within 24h | Customer sees success message but no new record created | Email confirmation still sent if needed |
| Health claims in notes | Inline error: "Notes cannot include medical or health-outcome claims" | Customer rewords and resubmits |
| Payment link expired | Customer page shows "Payment link expired — we are sending a new one" | Admin regenerates link |
| Payment fails | Customer stays on Square checkout with error; reservation remains `pending` | Customer retries; admin can resend link |
| Missed pickup | Customer receives reschedule/credit notice per cancellation policy | Admin moves request to next batch or issues store credit |

### 4.3 Audit and recovery tooling needed

1. **Retry failed owner alerts** — already implemented via cron.
2. **Retry failed emails** — add a button in `/admin/emails` or an automated retry cron.
3. **Reconcile Square payments** — add a manual "Sync Square" button on the batch planner.
4. **Audit-log viewer** — build `/admin/audit-logs` with filters by entity, action, and admin.
5. **Batch over-reservation detector** — add a nightly or on-demand check that flags `reservedGallons > targetGallons`.

---

## 5. Data Integrity Rules

| Rule | Rationale | Enforcement |
|---|---|---|
| `fresh_batch_requests` never stores payment state | Keeps requests distinct from orders | Validation + repository constraints |
| `batch_reservations` created only after `batch_campaigns` is `confirmed` or later | Prevents unauthorized paid obligations | State guard + API validation |
| Prices stored in cents | Avoids floating-point errors | TypeScript + repository |
| `squarePaymentLinkId` written only after successful Square API response | Prevents dangling payment URLs | Repository transaction |
| `samplingOunces` bounded by `actualYieldOunces - reservedVolumeOunces` | Samples cannot eat reserved volume | Decision engine + planner validation |
| `gallonEquivalent` computed server-side | Client cannot manipulate pricing | `toGallonEquivalent` in repository/API |
| Marketing consent separate from transactional email | Compliance / trust | Separate boolean fields |
| Phone optional; SMS consent default false | No accidental SMS subscriptions | Form + validation |
| Health-claim language rejected | Regulatory/content risk | `containsHealthClaims` filter |

---

## 6. Required Indexes

### 6.1 Fresh batch collections

```js
// fresh_batch_requests
db.fresh_batch_requests.createIndex({ email: 1, createdAt: -1 });
db.fresh_batch_requests.createIndex({ status: 1, createdAt: -1 });
db.fresh_batch_requests.createIndex({ requestedProductSlug: 1, status: 1 });
db.fresh_batch_requests.createIndex({ flavorProfile: 1, status: 1 });
db.fresh_batch_requests.createIndex({ preferredMarketId: 1, status: 1 });

// batch_campaigns
db.batch_campaigns.createIndex({ internalFlavorKey: 1, status: 1 });
db.batch_campaigns.createIndex({ productionDate: 1, status: 1 });
db.batch_campaigns.createIndex({ marketId: 1, status: 1 });

// batch_reservations
db.batch_reservations.createIndex({ requestId: 1 });
db.batch_reservations.createIndex({ batchId: 1 });
db.batch_reservations.createIndex({ customerEmail: 1, createdAt: -1 });
db.batch_reservations.createIndex({ squarePaymentLinkId: 1 }, { sparse: true });

// batch_audit_log
db.batch_audit_log.createIndex({ entityType: 1, entityId: 1, createdAt: -1 });
db.batch_audit_log.createIndex({ actorEmail: 1, createdAt: -1 });
db.batch_audit_log.createIndex({ action: 1, createdAt: -1 });
```

### 6.2 Audit and alert collections

```js
// audit_logs
db.audit_logs.createIndex({ adminEmail: 1, timestamp: -1 });
db.audit_logs.createIndex({ resource: 1, action: 1, timestamp: -1 });

// owner_alert_queue
db.owner_alert_queue.createIndex({ status: 1, nextAttemptAt: 1 });
db.owner_alert_queue.createIndex({ sourceEventId: 1 }, { unique: true });
```

---

## 7. Conclusion

The data-integrity foundation for the fresh-batch system is sound: collections are separate, prices are in cents, and the decision engine protects against automatic over-production. The remaining work is operational glue:

1. Create `batch_audit_log` and write to it on every owner decision.
2. Add idempotency keys and webhook deduplication for Square events.
3. Implement optimistic concurrency on `batch_campaigns` to prevent over-reservation.
4. Add admin recovery tools: failed-email retry, Square sync, audit-log viewer.
5. Run the optional index migration before production launch.
