# RESEND_ARCHITECTURE — Current Resend Integration

**Audit date:** 2026-06-01  
**Production sender domain:** `tasteofgratitude.shop`  
**Resend domain status from API:** `verified`

## Actual architecture today

```text
Transactional path
Customer/admin action
  ↓
lib/resend-email.js
  ↓
Resend SDK: resend.emails.send(...)
  ↓
email_sends insert with messageId = result.data?.id
  ↓
Resend webhook posts event later
  ↓
app/api/webhooks/resend/route.js tries email_sends.updateOne({ resendId: data.email_id })
  ↓
No match for transactional rows because they have messageId, not resendId
```

```text
Admin campaign send API path
Admin direct API call to /api/admin/campaigns/send
  ↓
app/api/admin/campaigns/send/route.ts
  ↓
lib/email/service.js sendEmail()
  ↓
Resend SDK: resend.emails.send(...)
  ↓
email_logs insert with resendId = result.id
  ↓
Production email_logs have resendId=0, suggesting the SDK result shape is wrong here
```

```text
Legacy campaign-manager path
Caller would call lib/campaign-manager.js sendCampaign()
  ↓
lib/email/service.js sendEmail()
  ↓
lib/campaign-manager.js inserts email_sends with resendId
  ↓
Webhook could match by resendId

Current finding: current admin send API does not call this path.
```

## What sends email?

| Sender | Sends through Resend? | Records where? | Current evidence |
|---|---:|---|---|
| `lib/resend-email.js` | Yes | `email_sends.messageId` | Production rows on 2026-06-01 include contact + order confirmation sends |
| `lib/email/service.js` | Yes when `RESEND_API_KEY` exists | `email_logs.resendId` | Production `email_logs=10`, but `resendId=0` |
| `lib/campaign-manager.js` | Indirectly through `lib/email/service.js` | Own `email_sends.resendId` inserts | No current route path found; no campaign rows in production |
| `scripts/send-review-request-campaign.js` | Yes in manual `--send` mode | Not current DB ledger | Manual-only script |

## What records email?

| Collection | Written by | Current status |
|---|---|---|
| `email_sends` | `lib/resend-email.js`; `lib/campaign-manager.js` if called | 5 rows, current transactional evidence |
| `email_logs` | `lib/email/service.js` | 10 rows, old/advanced path; no `resendId` populated |
| `email_queue` | `lib/email/service.js` queue helpers / old quiz path | 2 pending old quiz rows |

## What receives delivery events?

Only `app/api/webhooks/resend/route.js` receives Resend email lifecycle events.

Supported event names in code:

- `email.sent`
- `email.delivered`
- `email.delivery_delayed`
- `email.complained`
- `email.bounced`
- `email.opened`
- `email.clicked`

Production `GET /api/webhooks/resend` returns `200` and lists all except `email.delivery_delayed` and `email.complained` in the public status response, even though the switch supports them internally.

## What updates status?

The webhook does not update top-level `email_sends.status`. It updates:

- `events.<status>`
- `lastEventType`
- `lastEventAt`
- `eventLog[]`

It also updates `email_logs.deliveryStatus` by `resendId`.

Current production has:

- `email_sends.events.*`: 0 rows
- `email_sends.eventLog`: 0 rows
- `email_sends.lastEventType`: 0 rows
- `email_logs.resendId`: 0 rows

## Provider response mapping

| Code path | SDK response field used | Evidence |
|---|---|---|
| `lib/resend-email.js` | `result.data?.id` | Production `email_sends.messageId` populated on 2 success rows |
| `lib/email/service.js` | `result.id` | Production `email_logs.resendId=0`; this path does not persist provider ids in current production data |

## Actual request → provider → database → webhook chain

| Step | Actual behavior today | Gap |
|---|---|---|
| Email request | Route/helper calls either `lib/resend-email.js` or `lib/email/service.js` | No single source of truth |
| Resend API send | Domain is verified; current sends can succeed | Some earlier rows failed before DKIM verification |
| Provider response | Transactional path extracts `result.data?.id`; advanced path expects `result.id` | Advanced path does not populate provider id in production |
| Send ledger write | Transactional path writes `email_sends.messageId`; advanced path writes `email_logs.resendId`; campaign-manager would write `email_sends.resendId` | Three incompatible ledgers/keys |
| Webhook event | Webhook receives POST on `/api/webhooks/resend` | Signature verification is not Resend/Svix-compatible |
| Database update | Webhook looks up `email_sends.resendId` and `email_logs.resendId` | Transactional rows have `messageId`, so no match |

## Critical architecture risks

1. **Webhook correlation key mismatch:** sends recorded by the current transactional path cannot be matched by the current webhook.
2. **Webhook signature verification mismatch:** Resend uses Svix headers (`svix-id`, `svix-timestamp`, `svix-signature`), but the code computes a simple hex HMAC over raw payload.
3. **Duplicate events are not safe:** no `svix-id` dedupe; replayed events would push duplicate event log entries and increment campaign stats again.
4. **Advanced path provider id not persisted:** `lib/email/service.js` uses `result.id`; production `email_logs` show no `resendId` values.
5. **Campaign sends are not currently observable through `email_sends`:** current send API uses the advanced service and does not write per-recipient `email_sends` rows.
