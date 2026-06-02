# EMAIL_SENDS_FORENSICS — Production Ledger Review

**Production database:** `taste_of_gratitude`  
**Collection:** `email_sends`  
**Audit date:** 2026-06-01

## Current schema observed from code

`lib/resend-email.js` inserts rows with:

| Field | Source | Populated today? |
|---|---|---:|
| `to` | recipient | Yes |
| `from` | sender address | Yes |
| `subject` | email subject | Yes |
| `template` | caller-provided template or emailType | Yes |
| `emailType` | caller-provided type | Yes |
| `provider` | `resend` or `mock` | Yes |
| `messageId` | `result.data?.id` from Resend | Only successful transactional sends |
| `status` | `sent`, `failed`, or `mock` | Yes |
| `error` | send failure message | Failed rows only |
| `orderId` | order-related sends | Order confirmation only in sample |
| `customerEmail` | recipient/customer email | Yes |
| `metadata` | caller metadata | Some rows |
| `createdAt` / `updatedAt` | insert time | Yes |

`app/api/webhooks/resend/route.js` would add these fields if it matched rows:

| Field | Meaning | Production count |
|---|---|---:|
| `events.delivered` | delivery event timestamp | 0 |
| `events.opened` | open event timestamp | 0 |
| `events.clicked` | click event timestamp | 0 |
| `events.bounced` | bounce event timestamp | 0 |
| `events.complained` | complaint timestamp | 0 |
| `lastEventType` | last webhook status | 0 |
| `lastEventAt` | last webhook time | 0 |
| `eventLog[]` | raw event history subset | 0 |

## Production indexes

Current production indexes match `scripts/setup-database-indexes.js`:

| Index | Key | Notes |
|---|---|---|
| `_id_` | `_id: 1` | default |
| `idx_email_sends_message_id` | `messageId: 1` | unique partial index where `messageId` is string |
| `idx_email_sends_to_created` | `to: 1, createdAt: -1` | recipient timeline |
| `idx_email_sends_order` | `orderId: 1` | sparse |
| `idx_email_sends_status_created` | `status: 1, createdAt: -1` | status queries |
| `idx_email_sends_template_created` | `template: 1, createdAt: -1` | template queries |

There is no production `resendId` index on `email_sends`, even though the webhook queries `{ resendId: data.email_id }`.

## Production field coverage

Snapshot:

| Metric | Count |
|---|---:|
| Total rows | 5 |
| `status: sent` | 2 |
| `status: failed` | 3 |
| Has `messageId` | 2 |
| Has `resendId` | 0 |
| Has `to` | 5 |
| Has `email` | 0 |
| Has `orderId` | 1 |
| Has `campaignId` | 0 |
| Has `events` | 0 |
| Has `eventLog` | 0 |
| Has `error` | 3 |
| Has `template` | 5 |
| Has `emailType` | 5 |

## Recent record patterns

Recent production rows, PII redacted:

| Template | Type | Status | Provider id | Error |
|---|---|---|---|---|
| `order_confirmation` | `order_confirmation` | `sent` | `messageId` populated | none |
| `contact_notification` | `contact_form` | `sent` | `messageId` populated | none |
| `contact_notification` | `contact_form` | `failed` | none | domain not verified |
| `contact_notification` | `contact_form` | `failed` | none | domain not verified |
| `contact_notification` | `contact_form` | `failed` | none | domain not verified |

## Event coverage

| Event/status | Current coverage |
|---|---:|
| `sent` attempts | 2 successful top-level rows |
| `delivered` | 0 webhook-updated rows |
| `opened` | 0 webhook-updated rows |
| `clicked` | 0 webhook-updated rows |
| `bounced` | 0 webhook-updated rows |
| `complained` | 0 webhook-updated rows |
| `delayed` | 0 webhook-updated rows |

## Can we reconstruct delivery history?

**No.** We can reconstruct send attempts for `lib/resend-email.js` emails, including failures and provider ids on successful sends. We cannot reconstruct delivery, open, click, bounce, complaint, or delay history because no webhook updates have landed on `email_sends`.

## Can we identify failures?

**Partially.** Direct Resend API failures from `lib/resend-email.js` are recorded with `status: failed` and `error`. Delivery failures after accepted send, such as bounces/complaints, are not visible in `email_sends` today.

## Can we identify engagement?

**No.** There are no `opened` or `clicked` webhook fields in production rows. Even if Resend emits those events, the current webhook cannot match transactional rows by `resendId`.

## Forensic conclusion

`email_sends` is currently an **attempt ledger**, not a delivery lifecycle ledger. It is useful for proving that a send was attempted and whether Resend accepted/rejected that attempt, but it cannot prove delivery or engagement today.
