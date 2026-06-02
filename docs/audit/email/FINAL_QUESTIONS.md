# FINAL_QUESTIONS — Evidence-Based Answers

## 1. Can every sent email be traced?

**No.** Transactional sends through `lib/resend-email.js` create `email_sends` rows, but advanced/campaign sends through `lib/email/service.js` create `email_logs`. Production has 5 `email_sends` rows and 10 `email_logs` rows, with no unified ledger and no populated webhook lifecycle fields.

## 2. Can every webhook event be matched?

**No.** The webhook looks up `email_sends.resendId`, while current transactional sends store `messageId`. Production `email_sends.resendId=0`, `email_logs.resendId=0`, and `email_sends.events=0`.

## 3. Can bounced users be suppressed?

**No, not from current app data.** The webhook has a bounce branch, but no production bounce events are stored and no send path filters recipients by bounce history.

## 4. Can unsubscribed users be suppressed?

**Not reliably.** `/api/unsubscribe` writes `newsletter_subscribers.unsubscribed=true`, but current senders check other places: `unsubscribes`, `customers.unsubscribed`, or `users.emailPreferences.marketing`.

## 5. Can admins safely send campaigns today?

**No.** The UI has no working send lifecycle, the send API is only manually callable, suppression is incomplete, and sending runs as fire-and-forget work after the HTTP response.

## 6. Can admins preview and test-send campaigns?

**Preview: yes, browser-only. Test-send: no.** `app/admin/campaigns/new/page.js` has a client preview modal. The test button calls `/api/admin/campaigns/test`, whose directory has no route file and returns 404 when authenticated.

## 7. Can campaign revenue be measured?

**No.** Production orders have 0 `campaignId` and 0 `utm_campaign`; campaign emails are not link-rewritten with durable attribution; webhook click matching is broken.

## 8. What breaks first at 1,000 subscribers?

The public subscriber path breaks before scale because `/api/newsletter/subscribe` is 404. If a manual campaign send bypasses signup, the first scale risk is serverless/background execution without a durable queue or resume ledger.

## 9. What breaks first at 10,000 subscribers?

The send API caps at 10,000, then attempts 100-recipient concurrent batches inside a request-launched background task. Timeout/termination, partial sends, rate-limit handling, and reconciliation break before reliable completion.

## 10. What are the top 10 email-system risks?

1. Public newsletter signup endpoint is missing.
2. Unsubscribe token generator and verifier formats do not match.
3. Unsubscribe writes are not read by campaign senders.
4. Resend webhook verification is not Resend/Svix-compatible.
5. Webhook lookup key is `resendId`, while transactional sends store `messageId`.
6. Duplicate webhooks are not idempotent.
7. Campaign UI test/generate/detail/send flow is incomplete.
8. Campaign send runs after response without a durable queue.
9. Purchase-frequency segments bypass marketing consent and unsubscribe checks.
10. Campaign revenue attribution is absent.

## 11. What are the top 10 improvements?

These are audit improvement targets, not implemented changes:

1. Make one canonical email ledger and provider id field.
2. Align Resend webhook verification with Svix.
3. Add webhook idempotency by provider event id.
4. Route all sends through one suppression-aware sender.
5. Align unsubscribe token generation, verification, storage, and send-time checks.
6. Restore newsletter subscribe route and confirmation flow.
7. Make admin campaign create/test/preview/review/send routes complete.
8. Move campaign sending to a durable queue/worker with retry/resume.
9. Add bounce/complaint suppression from webhook events.
10. Add campaign UTM/click/order attribution.

## 12. What is the actual current email architecture?

Two sender stacks plus one mismatched webhook:

```text
Transactional/support/order flows → lib/resend-email.js → Resend → email_sends.messageId
Admin campaign/direct advanced flows → lib/email/service.js → Resend → email_logs
Resend webhook → app/api/webhooks/resend → tries email_sends.resendId / email_logs.resendId
```

The webhook cannot reliably connect either current sender stack to lifecycle events.

## 13. Draw the complete actual email flow.

```text
Customer/order/contact/admin action
  ↓
lib/resend-email.js
  ↓
Resend
  ↓
email_sends { messageId }
  ↓
Webhook event
  ↓
lookup email_sends.resendId
  ↓
no match
```

```text
Admin campaign direct API
  ↓
app/api/admin/campaigns/send
  ↓
lib/email/service.js
  ↓
Resend
  ↓
email_logs { resendId absent in prod }
  ↓
Webhook event
  ↓
no reliable match
```

## 14. Is the newsletter system production-ready?

**No.** Signup is 404, test-send is 404, AI generation is 404, campaign detail/review is missing, send UI is absent, suppression is fragmented, webhook tracking is broken, and attribution is absent.

## 15. What exact path does a newsletter follow today?

Public newsletter signup path:

```text
NewsletterSignup UI → POST /api/newsletter/subscribe → 404 → no subscriber row → no confirmation email
```

Admin newsletter UI path:

```text
/admin/campaigns/new → browser preview works → test/generate routes 404 → unscheduled save submits scheduledFor:null → no reliable review/send path
```

Manual API send path, if a valid campaign exists:

```text
POST /api/admin/campaigns/send → build recipients from orders/customers → lib/email/service.js → Resend → email_logs → campaign stats → webhook cannot reliably match
```
