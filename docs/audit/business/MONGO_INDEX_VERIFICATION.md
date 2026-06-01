# MongoDB Index Verification — v1.0-boringly-reliable

**Date:** 2026-06-01
**Database:** `taste_of_gratitude` on `gratitude0.1ckskrv.mongodb.net`
**Script:** `scripts/setup-database-indexes.js` (patched — see "Script fixes")

## Script fixes applied (no schema impact)

| Change | Reason |
| --- | --- |
| Removed `{ key: { _id: 1 }, unique: true }` from `orders` spec | MongoDB rejects redeclaration of the implicit unique `_id_` index. The first error aborted index creation for the rest of the `orders` collection. |
| `email_sends.messageId` changed from `sparse: true` to `partialFilterExpression: { messageId: { $type: 'string' } }` | `sparse` treats `null` as a value, so the three pre-existing rows with `messageId: null` collided with the unique index. Partial-on-string skips them safely. |

Both changes affect only the script; no data was mutated.

## Result table

| Collection | Index | Unique | Created this run | Already existed | Result |
| --- | --- | :---: | :---: | :---: | --- |
| orders | `idx_orders_id` (`id`) | ✅ | — | ✅ (as `id_1`) | OK — pre-existing equivalent. Script still rejects with "Index already exists with a different name" on `customer.email_1`; non-blocking. |
| orders | `idx_orders_customer_email` (`customer.email`) | — | — | ✅ (as `customer.email_1`) | OK — pre-existing equivalent. |
| orders | createdAt-desc (`createdAt:-1`) | — | — | ✅ | OK |
| orders | `status, createdAt`, `paymentStatus`, `squarePaymentId`, `orderNumber`, `metadata.preorderDate`, `status + preorderDate` | — | ❌ | ❌ | **Deferred** — not blocking for 100 orders/day. Optional perf indexes. Re-creation requires dropping legacy `customer.email_1` so the script's createIndexes batch will run. Non-load-bearing. |
| payment_records | `idx_payments_order_id`, `idx_payments_square_id`, `idx_payments_status_created`, `idx_payments_order_status` | — | — | ✅ all four | OK |
| products | 6 indexes (`slug` unique, etc.) | partial | — | ✅ all | OK |
| product_reviews | 4 indexes | — | — | ✅ all | OK |
| users | 4 indexes (`email` unique, …) | partial | — | ✅ all | OK |
| coupons | 3 indexes (`code` unique) | partial | — | ✅ all | OK |
| inventory | 3 indexes | — | — | ✅ all | OK |
| market_schedules | 3 indexes | — | — | ✅ all | OK |
| sessions | 3 indexes + TTL on `expiresAt` | partial | — | ✅ all | OK |
| staff_notifications | 3 indexes | — | — | ✅ all | OK |
| **reward_transactions** | `idx_rewards_user_created`, `idx_rewards_order`, `idx_rewards_type_status` | — | — | ✅ | OK |
| **reward_transactions** | **`idx_rewards_idempotency`** on `(email, orderId, type)` with partial filter `{ orderId: { $type: "string" } }` | **✅** | — | **✅** | **CRITICAL — present.** Verified via `db.reward_transactions.getIndexes()`. |
| **email_sends** | `idx_email_sends_message_id` on `messageId` (unique, partial filter on string) | **✅** | ✅ | — | **Created this run.** |
| email_sends | `idx_email_sends_to_created`, `idx_email_sends_order` (sparse), `idx_email_sends_status_created`, `idx_email_sends_template_created` | — | ✅ all | — | **Created this run.** |
| **contact_messages** | `idx_contact_created`, `idx_contact_email_created`, `idx_contact_status_created` | — | — | ✅ all | OK |
| **newsletter_subscribers** | `idx_newsletter_email` (unique) | ✅ | — | ✅ | OK |
| newsletter_subscribers | `idx_newsletter_unsubscribed` (sparse) | — | — | ✅ | OK |

## Duplicate-key report

| Collection / Index | Duplicates | Action |
| --- | --- | --- |
| `email_sends.messageId` (after partial-filter fix) | 3 docs with `messageId: null` (all from 2026-06-01, all `template:"contact_notification"`, all `status:"failed"`) | **Not auto-mutated.** Partial filter on `string` already excludes them so the unique index applies cleanly. Remediation: leave as-is (failure records keep observability). If purge desired, run `db.email_sends.deleteMany({ messageId: null, status: "failed" })` after the release tag. |

## Critical index summary

All four release-critical collections have their required indexes:

```
reward_transactions   (email, orderId, type)   unique partial   ✅
email_sends           (messageId)              unique partial   ✅
contact_messages      (createdAt -1)           non-unique       ✅
newsletter_subscribers(email)                  unique           ✅
```

Verification commands:

```bash
node -e '… load env … MongoClient(URI).db().collection("reward_transactions").indexes()'
# returns idx_rewards_idempotency  key={email:1,orderId:1,type:1} unique partial

node -e '… db.collection("email_sends").indexes()'
# returns idx_email_sends_message_id  key={messageId:1} unique partial on string
```
