# TRANSACTIONAL_FLOW — Actual Customer/Transactional Email Paths

## Summary

Current transactional email sending is real and currently capable of sending through Resend because the sender domain is verified. It is not end-to-end traceable through webhooks because send rows use `messageId` and the webhook updates by `resendId`.

Production `email_sends` evidence:

- 5 total rows
- 2 `sent` with `messageId`
- 3 `failed` with the earlier Resend domain verification error
- 0 rows with `events`, `eventLog`, or `resendId`

## Order confirmation

### Actual flow

```text
Customer completes Square payment
  ↓
app/api/payments/route.ts
  ↓
orders.updateOne({ id, emailSentAt: { $exists: false } }, { $set: { emailSentAt } })
  ↓
sendOrderConfirmationEmail(order) from lib/resend-email.js
  ↓
Resend send from orders@tasteofgratitude.shop
  ↓
email_sends insert { template: order_confirmation, status, messageId, orderId }
  ↓
Webhook event later tries lookup by resendId
  ↓
No match for this transactional row
```

### Expected flow

Every successful order confirmation should be traceable from order → send row → provider id → webhook status → final delivery/bounce state.

### Actual differences

- Send attempt is recorded.
- `messageId` is stored on success.
- `emailSentAt` is claimed before the send, so a failed send is not automatically retried.
- Webhook cannot update this row because it looks for `resendId`.

### Production evidence

One recent production `email_sends` order confirmation row exists with:

- `template: order_confirmation`
- `emailType: order_confirmation`
- `status: sent`
- `messageId` populated
- `orderId` populated
- no webhook event fields

## Square webhook order confirmation

### Actual flow

```text
Square payment webhook
  ↓
app/api/webhooks/square/route.ts
  ↓
updateOrderStatusSafe(...)
  ↓
if completed and no order.emailSentAt: sendOrderConfirmationEmail(order)
  ↓
on success: orders.updateOne({ emailSentAt: now })
  ↓
email_sends insert via lib/resend-email.js
```

### Difference from payment route

The payment route claims `emailSentAt` before sending. The Square webhook path sends first and then sets `emailSentAt` only on success. Both can send through the same helper, but the race/idempotency behavior differs.

## Contact form notification

### Actual flow

```text
Visitor submits /contact form
  ↓
app/contact/page.js fetch('/api/contact')
  ↓
app/api/contact/route.ts validates + rate-limits + stores contact_messages
  ↓
sendEmail(...) from lib/resend-email.js to support/contact inbox
  ↓
email_sends insert { template: contact_notification, emailType: contact_form }
  ↓
If send fails, user still gets success because contact message was captured
```

### Production evidence

- `contact_messages=14`
- recent contact notification rows exist in `email_sends`
- 3 earlier notification sends failed with `The tasteofgratitude.shop domain is not verified`
- later contact notification succeeded after Resend domain verification

## Admin password reset

### Actual flow

```text
Admin requests reset
  ↓
app/api/admin/auth/reset-password/route.ts
  ↓
admin_password_resets insert { tokenHash, expiresAt, consumed:false }
  ↓
sendEmail(...) from lib/resend-email.js
  ↓
email_sends insert { emailType: admin_password_reset, template: admin_password_reset }
```

### Expected vs actual

- Expected: reset mail is tracked through provider lifecycle.
- Actual: send attempt is tracked in `email_sends`, but delivery/bounce webhook cannot match due to `messageId`/`resendId` mismatch.

## Newsletter confirmation

### Actual flow

```text
Visitor enters email in NewsletterSignup
  ↓
components/NewsletterSignup.jsx POST /api/newsletter/subscribe
  ↓
Production returns 404
  ↓
No subscriber write
  ↓
No confirmation email
```

### Code-only helpers

`lib/resend-email.js` has `sendNewsletterConfirmation(email, name)`, but no current route calls it. `lib/email/service.js` also has welcome/newsletter-capable helpers, but the public route is absent.

## Unsubscribe confirmation

There is no code path that sends an unsubscribe confirmation email today. `/api/unsubscribe` writes `newsletter_subscribers.unsubscribed=true` and returns JSON only.

## Staff order notification

### Actual flow

```text
Successful payment
  ↓
app/api/payments/route.ts
  ↓
claimAndNotifyStaffOrder(...)
  ↓
lib/staff-notifications.js sendEmail(...) to STAFF_EMAIL
  ↓
email_sends insert via lib/resend-email.js
```

### Traceability

Attempt trace exists in `email_sends`; webhook delivery trace does not.

## Order status notifications

### Actual flow

```text
Order status changes through notifier path
  ↓
lib/order-status-notifier.js
  ↓
sendOrderStatusEmail(order, status) from lib/resend-email.js
  ↓
email_sends insert via lib/resend-email.js
```

No recent production `email_sends` row was identified for this template.

## Quiz/nurture transactional-style emails

`lib/quiz-emails.js` sends quiz result/follow-up emails through `lib/resend-email.js`, so any actual send would write `email_sends`. Production `email_queue` has 2 old pending quiz follow-up rows from 2025, but no current processor evidence was found in this audit.

## Verification answers

| Question | Answer |
|---|---|
| Does every send create `email_sends`? | No. `lib/resend-email.js` sends do; `lib/email/service.js` sends create `email_logs`; manual scripts may bypass both. |
| Does every send store provider id? | No. Transactional success rows store `messageId`; advanced `email_logs` have no populated `resendId` in production. |
| Can every send be traced? | No. Attempts through `lib/resend-email.js` can be traced to attempt/provider id, but not to delivery lifecycle. Campaign/advanced sends are not traceable in `email_sends`. |
| What is the final status after webhook? | None observed. Production has zero webhook-updated fields on `email_sends`. |
