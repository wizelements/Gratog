# FLOW_DIAGRAMS — Actual Email System Journeys

## Actual subscriber journey today

```text
Visitor
  ↓
Footer / Community NewsletterSignup UI
  ↓
POST /api/newsletter/subscribe
  ↓
404 in production
  ↓
No newsletter_subscribers write
  ↓
No welcome / confirmation email
  ↓
No campaign eligibility
```

## Existing subscriber data journey

```text
Unknown legacy/manual source
  ↓
newsletter_subscribers row
  ↓
Current /api/admin/campaigns/send does not query newsletter_subscribers
  ↓
Subscriber list is disconnected from campaigns
```

## Actual unsubscribe journey today

```text
Email unsubscribe link
  ↓
/unsubscribe?token=...
  ↓
app/unsubscribe/page.js
  ↓
POST /api/unsubscribe { token }
  ↓
Token verifier expects base64(email).hmac(email)
  ↓
Most campaign/service token generators use a different JSON-token format
  ↓
Invalid token / no opt-out write
```

```text
Fallback/manual valid unsubscribe
  ↓
POST /api/unsubscribe { email }
  ↓
newsletter_subscribers.unsubscribed = true
  ↓
Campaign senders do not consistently check newsletter_subscribers
  ↓
Marketing suppression not guaranteed
```

## Actual transactional journey — order confirmation

```text
Payment completes
  ↓
app/api/payments/route.ts claims order.emailSentAt
  ↓
lib/resend-email.sendOrderConfirmationEmail(order)
  ↓
lib/resend-email.sendEmail()
  ↓
Resend API
  ↓
email_sends insert
  ├─ success: status=sent, messageId=<resend id>
  └─ failure: status=failed, error=<provider error>
  ↓
Resend webhook emits event
  ↓
app/api/webhooks/resend queries email_sends.resendId
  ↓
No match because row stores messageId, not resendId
  ↓
No delivery/open/click/bounce update
```

## Actual transactional journey — contact form

```text
Visitor submits /contact
  ↓
app/api/contact/route.ts validates form
  ↓
contact_messages insert
  ↓
lib/resend-email.sendEmail() notification to support
  ↓
Resend API
  ↓
email_sends insert with contact metadata
  ↓
Webhook mismatch prevents lifecycle tracking
  ↓
Customer still receives success if DB save worked, even if email notification failed
```

## Actual admin newsletter journey through UI

```text
Admin
  ↓
/admin/campaigns
  ↓
New Campaign
  ↓
/admin/campaigns/new
  ↓
Enter campaign content
  ├─ Preview Email: client-only modal works
  ├─ Send Test to Myself: POST /api/admin/campaigns/test → 404
  ├─ Generate Content with AI: POST /api/admin/campaigns/generate → 404
  └─ Save/Create: POST /api/admin/campaigns with scheduledFor:null → Zod rejects null
  ↓
No reliable saved/review/test/send lifecycle
```

## Actual admin newsletter journey if send API is called directly

```text
Admin/direct API client
  ↓
POST /api/admin/campaigns/send { campaignId }
  ↓
Load campaign from campaigns
  ↓
Set status=sending
  ↓
Build recipients from orders/customers
  ↓
sendEmailsAsync() starts and HTTP response returns
  ↓
For each recipient batch:
      lib/email/service.sendEmail()
        ↓
      Resend API
        ↓
      email_logs insert
        ↓
      campaign stats sent/failed update
  ↓
Webhook may arrive
  ↓
Webhook tries email_sends.resendId and campaignId
  ↓
Admin send path did not create matching email_sends rows
  ↓
Delivery/open/click/bounce analytics unreliable
```

## Intended-but-broken newsletter journey requested by product

```text
Admin
  ↓
Create Campaign
  ↓
Save Campaign
  ↓
Preview
  ↓
Test Send
  ↓
Send
  ↓
Resend
  ↓
Webhook Tracking
  ↓
Analytics
```

Actual current gaps:

- save draft submits invalid `scheduledFor:null`;
- test send route missing;
- detail/review page missing;
- UI send path missing;
- webhook tracking mismatched;
- analytics not provider-backed.

## Actual complete email architecture

```text
                         ┌────────────────────────┐
                         │  Public Forms / Orders │
                         └───────────┬────────────┘
                                     │
                                     ▼
                         ┌────────────────────────┐
                         │ lib/resend-email.js    │
                         │ transactional sender   │
                         └───────┬────────┬───────┘
                                 │        │
                                 ▼        ▼
                            Resend API  email_sends
                                          messageId

                         ┌────────────────────────┐
                         │ Admin Campaign API     │
                         └───────────┬────────────┘
                                     │
                                     ▼
                         ┌────────────────────────┐
                         │ lib/email/service.js   │
                         │ advanced sender        │
                         └───────┬────────┬───────┘
                                 │        │
                                 ▼        ▼
                            Resend API  email_logs
                                          resendId intended,
                                          absent in prod

                         ┌────────────────────────┐
                         │ Resend webhook route   │
                         └───────────┬────────────┘
                                     │
                                     ▼
                         Queries email_sends.resendId
                                     │
                                     ▼
                         Does not match current rows
```
