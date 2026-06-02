# FAILURE_ANALYSIS — Email and Newsletter Failure Scenarios

## Scope

This audit inspected code paths and performed non-mutating production checks. It did not intentionally create bad production subscriber data, trigger real bounces/complaints, or interrupt Mongo/Resend.

## Scenario matrix

| Scenario | Actual behavior today | Recovers automatically? | Manual intervention required? |
|---|---|---:|---:|
| Resend domain unverified | Historical failures recorded in `email_sends.error`; current domain is verified | No, send attempts fail until DNS/domain fixed | Yes if domain changes/fails |
| Resend API outage/error in `lib/resend-email.js` | Caller receives `{ success:false }`; `email_sends.status=failed` is inserted | No retry | Yes |
| Resend API outage/error in `lib/email/service.js` | Logs `email_logs.status=failed`, throws; campaign send increments failed | No retry for immediate sends | Yes |
| Mongo outage before contact save | Contact API returns 500; customer message not captured | No | Customer retries |
| Mongo outage after Resend accepted send | `recordEmailSend()` swallows logging failure; email may be sent with no ledger row | No | Manual provider lookup only |
| Webhook invalid/no signature | Production returns 500 | Provider retries if real event; invalid traffic causes noisy 500s | Config/code fix |
| Webhook valid Resend/Svix signature | Likely rejected because verifier is incompatible | Provider retries until exhausted | Yes |
| Webhook duplicate | Duplicate `eventLog` entries and campaign stat increments possible | No idempotency | Manual cleanup |
| Webhook missing matching send row | Handler returns success but no lifecycle update | No | Manual provider lookup |
| Invalid email in contact form | Zod rejects before DB/write | User can correct | No |
| Invalid email in campaign recipients | Resend rejects per recipient; no prior validation | No automatic cleanup/suppression | Yes |
| Bounce | Code branch exists but no matched webhook evidence | No suppression | Yes |
| Complaint | Code branch exists but no matched webhook evidence | No suppression | Yes |
| Missing `messageId` in transactional send | Failure row inserted with null id | No webhook trace possible | Manual |
| Missing `resendId` in webhook target | Current normal state for `email_sends` | No matching | Manual |
| Newsletter signup route 404 | Subscriber is not inserted; UI shows failure | No | Code/deployment change |
| Exit-intent subscribe route 404 | UI catch marks success despite failure | No | Manual data recovery impossible |
| Test-send route 404 | Admin cannot send test | No | Code/deployment change |
| Scheduled campaign | Created as `scheduled`; no scheduler found to send it later | No | Manual send/API/cron needed |
| Large campaign in Vercel/serverless | Fire-and-forget async may be terminated after response | No guaranteed completion | Manual reconciliation/resend |

## Resend outage behavior

### Transactional sender (`lib/resend-email.js`)

```text
sendEmail()
  ↓
resend.emails.send()
  ↓
error/result.error
  ↓
insert email_sends failed row
  ↓
return { success:false }
```

There is no retry, queue, or automatic replay.

### Advanced sender (`lib/email/service.js`)

```text
sendEmailNow()
  ↓
resend.emails.send()
  ↓
catch error
  ↓
insert email_logs failed row
  ↓
throw Error
```

Campaign send catches per-recipient errors and updates campaign failed counts, but no retry queue is used.

## Mongo outage behavior

| Path | Before send | After send |
|---|---|---|
| Contact form | Save failure returns 500 and no email is sent | Notification send failure is non-fatal after message saved |
| Order confirmation | Email claim/update depends on DB; errors are logged and swallowed near payment flow | If send succeeds but ledger insert fails, `recordEmailSend()` does not throw |
| Admin campaign send | Campaign lookup/status update fails request | Background progress/status writes can fail after response |
| Webhook | DB failure returns 500 | App has no idempotency or replay ledger |

## Duplicate webhook analysis

Current handler does not store `svix-id` or any provider event id. Duplicates would be accepted repeatedly and can inflate campaign stats.

## Missing message id analysis

`email_sends` successful rows have `messageId`, not `resendId`. The webhook queries `resendId`. Therefore even successful sends are effectively missing the id required by the webhook.

## What breaks first at 1,000 subscribers?

The current public subscriber path breaks before scale because `/api/newsletter/subscribe` is 404. If an operator bypasses that and manually calls campaign send for 1,000 recipients, the first code-level scale risk is serverless/background execution: the route returns before `sendEmailsAsync()` completes, and the app has no durable queue or resume ledger.

## What breaks first at 10,000 subscribers?

The send API caps at 10,000 recipients but tries to send 100-recipient concurrent batches with one-second gaps. At 10,000, this is 100 batches of concurrent Resend calls inside a request-launched background task, with no durable queue, no idempotency, no resume, and unreliable webhook tracking. Timeout/termination, partial sends, and reconciliation failure are the primary breaks.

## Failure conclusion

Transactional capture is partially resilient for direct API failures, but the newsletter/campaign system lacks durable queueing, retry, idempotency, correct webhook matching, and unified suppression. Failures are not automatically recoverable at campaign scale.
