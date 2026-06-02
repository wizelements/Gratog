# WEBHOOK_FORENSICS — Resend Event Handling

**Route:** `app/api/webhooks/resend/route.js`  
**Production endpoint:** `https://tasteofgratitude.shop/api/webhooks/resend`

## Actual route behavior

| Request | Observed result |
|---|---|
| `GET /api/webhooks/resend` | `200` with endpoint status JSON |
| `POST /api/webhooks/resend` without signature | `500 {"error":"Webhook processing failed"}` |

The no-signature POST returns `500` because `crypto.timingSafeEqual()` throws when the provided signature buffer length differs from the expected hex digest buffer length.

## Event support matrix

| Resend event | Code maps? | DB update target | Current status |
|---|---:|---|---|
| `email.sent` | Yes | `events.sent`, `lastEventType=sent` | No production matches observed |
| `email.delivered` | Yes | `events.delivered`, stats increment if campaign | No production matches observed |
| `email.delivery_delayed` | Yes | `events.delayed` | No production matches observed |
| `email.opened` | Yes | `events.opened`, campaign stats increment | No production matches observed |
| `email.clicked` | Yes | `events.clicked`, clicked URL subset | No production matches observed |
| `email.bounced` | Yes | `events.bounced`, bounce type subset | No production matches observed |
| `email.complained` | Yes | `events.complained` | No production matches observed |

## Signature verification

### Current code

The handler reads either `resend-signature` or `svix-signature`, then computes:

```text
hex(HMAC_SHA256(rawBody, RESEND_WEBHOOK_SECRET))
```

It compares that hex digest directly to the request signature.

### Resend/Svix expected model

Resend documentation says webhooks should be verified with:

- `svix-id`
- `svix-timestamp`
- `svix-signature`
- raw request body
- `RESEND_WEBHOOK_SECRET`

The signed content is not just the raw body; Svix signs `id.timestamp.body`, and signatures are base64 with a version prefix such as `v1,...`.

### Current classification

**Not compatible with Resend/Svix verification.** The current verifier does not implement the Resend/Svix signed-content model. Invalid unsigned requests return `500`, not `401`.

## MessageId / resendId lookup

Webhook update query:

```js
db.collection('email_sends').updateOne(
  { resendId: data.email_id },
  { ... }
)
```

Current transactional sender writes:

```js
messageId: result.data?.id
```

Production `email_sends` has:

- `messageId`: 2 rows
- `resendId`: 0 rows

Therefore webhook events for current transactional sends cannot be matched.

## Database update behavior

When a row is found, the webhook:

- sets `events.<status>` timestamp
- sets `lastEventType`
- sets `lastEventAt`
- pushes an `eventLog` entry
- updates `email_logs.deliveryStatus` by `resendId`
- increments `campaigns.stats.<status>` if the matched `email_sends` row has `campaignId`

It does **not** update top-level `email_sends.status` from `sent` to `delivered`, `bounced`, etc.

## Duplicate safety

**Not safe.** Resend/Svix webhooks are at-least-once. The current handler does not store or check `svix-id`. Duplicate events would:

- push duplicate `eventLog` entries
- overwrite `events.<status>` timestamp
- increment campaign stats again

The production collection `webhook_events_processed` exists with one Square payment event, but the Resend webhook route does not use it.

## Orphan event risk

**High.** Orphan events are possible on current normal paths because:

1. Current transactional sends store `messageId`, not `resendId`.
2. Advanced `email_logs` have no populated `resendId` in production.
3. Campaign sends through current admin API do not create `email_sends` rows.
4. Manual scripts can send outside both ledgers.

## Failure handling and retries

| Scenario | Current handler result |
|---|---|
| Invalid/missing signature | 500 due thrown timing-safe comparison, not clean rejection |
| Unknown event type | 200 `{ received:true, ignored:true }` |
| DB down | 500; Resend should retry according to provider retry policy |
| Matched row missing | 200 success, but no DB lifecycle update |
| Duplicate legitimate event | 200 and duplicate side effects |

## Can every webhook event be matched?

**No.** Current transactional events cannot match because the key is wrong. Current campaign API events do not create `email_sends` rows, and production `email_logs.resendId` is not populated.

## Are orphan events possible?

**Yes.** They are a normal outcome under the current architecture.

## Are duplicate events safe?

**No.** There is no idempotency key for Resend events.
