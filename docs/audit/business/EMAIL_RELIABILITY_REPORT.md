# EMAIL_RELIABILITY_REPORT — Can any email silently fail?

> Phase 6 deliverable. Trace every outbound email path. Answer: yes — multiple silent failure paths exist today.

## Outbound email types

| Type | Triggered by | Module | Tracking |
|---|---|---|---|
| **Order confirmation** | `app/api/payments/route.ts` post-success | `lib/resend-email.js` `sendOrderConfirmationEmail` | ❌ no `email_sends` row |
| **Staff order notification** | `app/api/payments/route.ts` | `lib/staff-notifications.ts` | ⚠️ verify |
| **Daily report** | `app/api/cron/daily-report/route.ts` | `lib/resend-email.js` | ❌ no `email_sends` row |
| **Password reset (customer)** | `/api/auth/reset-password` ❌ MISSING | would call `lib/resend-email.js` | n/a (no route) |
| **Admin password reset** | `/api/admin/auth/reset-password` ❌ MISSING | n/a | n/a |
| **Newsletter signup confirmation** | `/api/newsletter/subscribe` ❌ MISSING | `lib/email/service.js` | ❌ |
| **Nurture sequence** | `/api/nurture/subscribe` ❌ MISSING | `lib/email/service.js` | ❌ |
| **Coupon broadcast** | `/admin/campaigns` → `/api/admin/campaigns/send` ✅ | `lib/email/service.js` | ⚠️ writes `email_logs`/`email_queue` but not `email_sends` |
| **Marketing campaign** | admin → `/api/admin/campaigns/send` | `lib/campaign-manager.js` | ✅ writes `email_sends` |
| **Challenge / reward** | rewards system | `lib/email/service.js` | ⚠️ partial |
| **Order status update** | webhook (if implemented) | `lib/resend-email.js` | ❌ |
| **Contact form notification** | `/api/contact` ❌ MISSING | n/a | n/a |
| **Unsubscribe confirmation** | `/api/unsubscribe` ❌ MISSING | n/a | n/a |

## The split

```diagram
 sendEmail() in lib/resend-email.js  ──▶ Resend.emails.send()
                                          │
                                          └──▶ returns {id: 'r-xxx'}
                                               │
                                               ❌ id NEVER persisted
                                               │
 Resend webhook event.email_id='r-xxx' ─▶ /api/webhooks/resend
                                          │
                                          └──▶ UPDATE email_sends WHERE messageId='r-xxx'
                                               │
                                               ❌ row never existed → silent dedupe/drop
```

vs.

```diagram
 lib/campaign-manager.js                 ──▶ INSERT email_sends {messageId} BEFORE/AFTER send
                                                          │
 Resend webhook                                           ▼
                                          ─▶ UPDATE row by id ✅
```

## Silent failure scenarios

| # | Scenario | Customer-visible? | Operational impact |
|---|---|---|---|
| 1 | Resend rate limit hits transactional path → `resend.emails.send()` returns error → caught and logged, then **swallowed** | ❌ no | Confirmation never sent; customer calls support |
| 2 | Recipient mailbox bounces → Resend fires `email.bounced` → webhook updates `email_sends` row that doesn't exist | ❌ no | Bounce blind; sender reputation degrades |
| 3 | Recipient marks spam → `email.complained` → no row to update | ❌ no | Reputation degrades silently |
| 4 | Resend API key revoked / quota exhausted → all transactional fail → no aggregate counter | ❌ no | Every order in window goes unconfirmed |
| 5 | `lib/resend-email.js` throws on DB fetch (e.g., site-config) → entire `sendEmail` rejects → caller in payments route catches and logs | ❌ no | Same as #1 |
| 6 | `/api/unsubscribe` missing → user clicks link, gets 404 | ✅ yes | Trust loss + legal exposure |

## Compliance posture

| Requirement | Status |
|---|---|
| **CAN-SPAM:** working unsubscribe link in every marketing email | 🔴 token logic present in `lib/email/service.js`; HTTP handler `/api/unsubscribe` missing |
| **CAN-SPAM:** physical postal address in email footer | ⚠️ verify in `lib/email/templates/*.js` |
| **CASL (Canada):** consent record per subscriber | ⚠️ `email_subscribers` schema not verified |
| **GDPR (if any EU customer):** unsubscribe + data export + erasure | 🔴 same as above |
| **Square TOS:** maintain transactional confirmation reliability | 🟠 silent failure path = breach risk |

## Database

| Collection | Purpose | Populated by | Read by |
|---|---|---|---|
| `email_subscribers` | Newsletter list | `/api/newsletter/subscribe` ❌ + `lib/email/service.js` | campaigns |
| `email_queue` | Send queue | `lib/email/service.js` | scheduler (verify) |
| `email_logs` | Send log | `lib/email/service.js` | audit |
| `email_sends` | Live delivery state | `lib/campaign-manager.js` only | `/api/webhooks/resend` |
| `scheduled_emails` | Future-dated | scheduler (verify) | scheduler |
| `unsubscribes` | Opt-outs | `/api/unsubscribe` ❌ + `lib/email/service.js` | `canSendEmail()` |
| `notification_preferences` | Per-user marketing prefs | various | `canSendEmail()` |
| `campaigns` | Admin campaign defs | `/api/admin/campaigns` ✅ | sender |

## Reliability score per email

| Email | Sends? | Tracked? | Compliance? | Reliability |
|---|---|---|---|---|
| Order confirmation | ✅ | ❌ | ✅ transactional | **B-** (sends but blind) |
| Daily report (admin) | ✅ | ❌ | ✅ internal | **B-** |
| Staff order notification | ⚠️ verify | ⚠️ | ✅ internal | unknown |
| Newsletter signup | ❌ no route | — | — | **F** |
| Newsletter campaign | ✅ | ✅ | 🔴 (unsubscribe missing) | **C** |
| Coupon broadcast | ✅ | ⚠️ partial | 🔴 (unsubscribe missing) | **C-** |
| Unsubscribe confirmation | ❌ | — | 🔴 | **F** |
| Contact form notification | ❌ | — | — | **F** |
| Password reset | ❌ | — | — | **F** |

## What "fully tracked" looks like

For every Resend send:

```diagram
 sendEmail(opts)
   │
   ▼
 INSERT email_sends {messageId: null, status: 'pending', ...}
   │
   ▼
 Resend.emails.send()
   │
   ├─ on success:  UPDATE email_sends SET messageId=…, status='sent'
   └─ on failure:  UPDATE email_sends SET status='failed', error=…
   │
   ▼ (later, async)
 Webhook event.email_id=messageId
   │
   ▼
 UPDATE email_sends SET status='delivered'|'bounced'|'complained'|… events.push(…)
```

This is the pattern `lib/campaign-manager.js` already uses. The transactional path should adopt the same.

## Concrete failure today (run this)

```
# 1. Send any order confirmation
# 2. In Mongo: db.email_sends.find({}).sort({createdAt: -1}).limit(5)
# 3. Compare against Resend dashboard "Sends" tab
# Expectation: every Resend send has a matching email_sends row
# Reality: only campaign sends appear
```

## Ranked email risks

| # | Risk | Severity | Effort |
|---|---|---|---|
| 1 | Transactional sends untracked | 🔴 | S (2-3 h) |
| 2 | `/api/unsubscribe` missing (legal) | 🔴 | S (2 h) |
| 3 | `/api/contact` missing (lead loss) | 🟠 | S (2 h) |
| 4 | `/api/newsletter/subscribe` + nurture missing | 🟠 | S (3 h) |
| 5 | Two parallel email modules | 🟡 | M (consolidation later) |
| 6 | No bounce rate alert | 🟡 | S (after #1) |
| 7 | Verify postal address in footer | 🟡 | XS |
| 8 | Verify TLS / SPF / DKIM on `tasteofgratitude.shop` | 🟡 | XS (DNS check) |
