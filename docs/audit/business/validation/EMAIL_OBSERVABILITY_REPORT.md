# EMAIL_OBSERVABILITY_REPORT — Assumption 5 verification

> **Assumption:** No email is mission-critical without observability.
> **Verdict:** ❌ **FALSE. Mission-critical sends are blind today.**

## Per-email matrix

| Email | Trigger | Storage row in `email_sends`? | Provider | Bounce visible? | Failure handling |
|---|---|---|---|---|---|
| Order confirmation | `/api/payments` post-success calls `sendOrderConfirmationEmail` ([lib/resend-email.js](file:///data/data/com.termux/files/home/Gratog-live/lib/resend-email.js)) | ❌ no | Resend | ❌ no — webhook has no row to update | logger.error + Sentry; non-blocking |
| Staff order notification | `claimAndNotifyStaffOrder` ([lib/staff-notifications.ts](file:///data/data/com.termux/files/home/Gratog-live/lib/staff-notifications.ts)) | ⚠️ unverified | Resend | ⚠️ depends on tracker | log only |
| Daily admin report | `/api/cron/daily-report` → `lib/resend-email.js` | ❌ no | Resend | ❌ no | log only |
| Newsletter signup confirm | `/api/newsletter/subscribe` ❌ MISSING | n/a | — | — | — |
| Nurture / drip | `/api/nurture/subscribe` ❌ MISSING | n/a | — | — | — |
| Campaign send | `/api/admin/campaigns/send` ✅ → `lib/campaign-manager.js` | ✅ row written | Resend | ✅ webhook updates | per-recipient log |
| Coupon broadcast | admin → `lib/email/service.js` | ⚠️ writes `email_logs` + `email_queue` only; not `email_sends` | Resend | ❌ no | per-job log |
| Challenge reward | rewards system → `lib/email/service.js` | ⚠️ same | Resend | ❌ no | per-job log |
| Password reset (customer) | `/api/auth/reset-password` ❌ MISSING | n/a | — | — | — |
| Password reset (admin) | `/api/admin/auth/reset-password` ❌ MISSING | n/a | — | — | — |
| Contact form notification | `/api/contact` ❌ MISSING | n/a | — | — | — |
| Unsubscribe confirmation | `/api/unsubscribe` ❌ MISSING | n/a | — | — | — |
| Abandoned-cart recovery | `/api/cron/cleanup-abandoned-orders` ❌ MISSING | n/a | — | — | — |
| Subscription order confirm | `lib/subscription-practical.ts` `sendSubscriptionOrderConfirmation` | ⚠️ unverified | likely Resend | ⚠️ | per-job log |

## Where `email_sends` is actually written

Verified via `rg -l "email_sends" lib/ app/`:
- ✅ `app/api/webhooks/resend/route.js` — reads/updates.
- ✅ `lib/campaign-manager.js` — writes.

That's it. No transactional write site exists.

## What this means operationally

Per typical Resend deliverability:
- ~2-5% of sends bounce (hard or soft).
- ~0.1-0.5% complain (spam reports).
- Reputation degrades silently until **provider throttles or suspends sender**.

For Gratog today:
- Every order confirmation that bounces is invisible.
- Every customer who never gets confirmation calls / DMs to ask "did my order go through?" → support time + chargeback risk + 1-star reviews.
- Resend dashboard shows raw send + delivery events, but **operator never sees them in admin** because there's no UI that reads `email_sends`.

## Compliance impact

| Requirement | Compliant? |
|---|---|
| CAN-SPAM — clear unsubscribe link in every commercial email | ⚠️ link present, but `/api/unsubscribe` route 404s |
| CAN-SPAM — honor unsub within 10 business days | ❌ cannot honor — no route |
| CAN-SPAM — physical postal address in footer | ⚠️ verify in templates |
| Resend Acceptable Use — maintain low bounce/complaint rate | 🟠 cannot maintain what you cannot see |
| Square TOS — reliable transactional notifications | 🟠 blind to failures |

## Bounce handling

Today: when Resend emits `email.bounced`:
- Webhook fires ✅
- Verifies HMAC ✅
- Looks up `email_sends.findOne({ messageId })` → returns null for transactional → no-op
- Event is silently absorbed
- `customer_passports` / `email_subscribers` is NOT auto-flagged as deliverability problem
- Next campaign send to same address keeps trying → repeats bounce → reputation tanks

## Required fix (Phase 4.1 of playbook)

1. **Wrap `sendEmail()`** in `lib/resend-email.js` to:
   - INSERT `email_sends { status: 'pending', to, type, createdAt }` before send.
   - UPDATE with `{ messageId, status: 'sent', sentAt }` on success.
   - UPDATE with `{ status: 'failed', error }` on Resend error.
2. **Webhook handler** updates row by `messageId` — already in place; will now find rows for transactional events.
3. **Add admin view** (Phase 5+) at `/admin/emails` that surfaces failed/bounced from `email_sends` so operator can act.
4. **Add bounce-rate alert** — daily cron checks `email_sends` for past-24h bounce rate >5% → email admin.

## Observability stack today

| Layer | Tool | Coverage |
|---|---|---|
| Send-attempt | `logger.info('Email', ...)` | ✅ logged to console / structured logger |
| Send-error | `logger.error('Email', ...)` + `Sentry.captureException` | ✅ Sentry catches |
| Delivery | Resend webhook → `email_sends` | ❌ only campaigns |
| Bounce rate | Resend dashboard | ⚠️ requires manual login |
| Per-email status admin view | none | ❌ |

## Verdict

**Assumption 5 is FALSE.** Plan Phase 4.1 fixes the tracking write. Plan should additionally include:
- Admin view at `/admin/emails` (defer to Tier 2 if needed).
- Daily bounce-rate alert cron (small add-on to Phase 7.5).
- Verify postal address in email templates (Phase 0 quick check).
- Verify SPF/DKIM/DMARC for `tasteofgratitude.shop` via `dig` (Phase 0 quick check).
