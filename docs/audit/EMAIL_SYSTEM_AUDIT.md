# EMAIL_SYSTEM_AUDIT — Gratog Platform

> Code-verified at commit `f9d20e98`. SendGrid removed (`e834a81b`); Resend is sole provider.

## 1. Providers

Single live provider: **Resend** (API key `RESEND_API_KEY`). Verified:

```
$ rg "@sendgrid|sendgrid" lib/ app/   # → no production code references after commit e834a81b
```

`@sendgrid/mail` was re-added as a build dep in `81e27a5a` to avoid a stale import path; subsequent `e834a81b` removed all call sites. Recommended follow-up: drop `@sendgrid/mail` from `package.json` after a verified build.

## 2. Two parallel Resend integrations

| Path | File | Writes `email_sends`? | Used by |
|---|---|---|---|
| **Simple** | [lib/resend-email.js](file:///data/data/com.termux/files/home/Gratog-live/lib/resend-email.js) | ❌ NO | order confirmation, password reset, generic transactional |
| **Advanced** | [lib/email/service.js](file:///data/data/com.termux/files/home/Gratog-live/lib/email/service.js) + `lib/email/resend-client.js` + `lib/email/templates/*` | ✅ via `email_queue` + `email_logs` (NOT `email_sends`) | admin campaigns, newsletter, coupon, challenge |
| **Campaign** | [lib/campaign-manager.js](file:///data/data/com.termux/files/home/Gratog-live/lib/campaign-manager.js) | ✅ writes to `email_sends` | admin campaign batches |

> Confirmed by `rg "email_sends" app/ lib/` returning **only** `app/api/webhooks/resend/route.js` and `lib/campaign-manager.js`.

## 3. Email type → call path mapping (verified)

| Email | Caller | Module | Tracks delivery? |
|---|---|---|---|
| Order confirmation | `app/api/payments/route.ts` post-payment | `lib/resend-email.js` | ❌ no |
| Password reset (customer) | (route missing — see API audit) | would call `lib/resend-email.js` | ❌ no |
| Newsletter subscribe confirm | (route missing) | `lib/email/service.js` | ⚠️ partial |
| Marketing campaign | admin → `/api/admin/campaigns/send` | `lib/campaign-manager.js` | ✅ |
| Coupon broadcast | admin | `lib/email/service.js` | ⚠️ partial |
| Challenge progress | rewards system | `lib/email/service.js` | ⚠️ partial |
| Daily report (admin) | `/api/cron/daily-report` | `lib/resend-email.js` | ❌ no |
| Generic alerts | `/api/email/alert` (missing) | n/a | n/a |

## 4. Webhook handler

File: [app/api/webhooks/resend/route.js](file:///data/data/com.termux/files/home/Gratog-live/app/api/webhooks/resend/route.js)

Behavior:
1. Verify body HMAC against `RESEND_WEBHOOK_SECRET`.
2. Dedupe via `webhook_events_processed`.
3. Switch on event type (`email.sent`, `email.delivered`, `email.bounced`, `email.complained`, `email.opened`, `email.clicked`).
4. UPDATE `email_sends` row matching the Resend message id.

**Gap:** Resend message id is returned by `resend.emails.send()` in `lib/resend-email.js#L46`, but the simple module never persists it. Thus, when the webhook fires, no document matches → events are deduped/dropped.

## 5. Unsubscribe + preferences

- Token generation: `lib/email/service.js#generateUnsubscribeToken` (HMAC + 90 d TTL).
- Storage: `unsubscribes`, `notification_preferences` collections.
- `canSendEmail(userId, type, email)` enforces:
  - Transactional types always allowed.
  - Marketing types blocked if `unsubscribes.has(email)` or `notification_preferences.marketing === false`.
- ❌ **`/api/unsubscribe` route is missing** — the `/unsubscribe` page renders but cannot complete the action. The token logic exists; the HTTP endpoint to honor it does not.

## 6. Newsletter / nurture

- `email_subscribers` collection — populated by `/api/newsletter/subscribe` (❌ missing) and `/api/nurture/subscribe` (❌ missing).
- Newsletter signup forms exist in `components/` but POST targets are deleted.

## 7. Configuration

| Var | Required | Source |
|---|---|---|
| `RESEND_API_KEY` | ✅ | both modules check; absence → mock mode (logged) |
| `RESEND_FROM_EMAIL` / `EMAIL_SENDERS` | ✅ | `lib/email-config.js` |
| `RESEND_WEBHOOK_SECRET` | ✅ | webhook gate |
| `SUPPORT_EMAIL`, `CONTACT_EMAIL`, `SUPPORT_PHONE` | ✅ | from `lib/site-config.js` |
| `JWT_SECRET` | ✅ | unsubscribe token signing |

## 8. Templates

`lib/email/templates/*.js` — hand-rolled HTML templates. Variants for order confirmation, welcome, password reset, challenge, coupon. Mobile-responsive table layouts. Brand colors hard-coded.

## 9. Verdict

| Question | Answer |
|---|---|
| Is SendGrid fully removed? | ✅ All production call sites removed in `e834a81b`. Dep still in `package.json` from `81e27a5a` build fix; safe to drop. |
| Is Resend fully integrated? | ⚠️ **Partially.** Sending works, but: <br>1) Two parallel modules — fine but inconsistent. <br>2) Transactional sends via `lib/resend-email.js` don't write `email_sends` → webhook tracking is blind for ~half the volume. <br>3) `/api/unsubscribe`, `/api/newsletter/subscribe`, `/api/nurture/subscribe`, `/api/email/alert` referenced but missing → user-facing email lifecycle is half-built. |
| Is webhook delivery tracking working? | ⚠️ Working only for campaigns + restored webhook. Transactional emails not tracked. |

## 10. Defects

| Sev | Defect |
|---|---|
| 🟠 High | `lib/resend-email.js` does not persist Resend message id to `email_sends`, so webhook events for confirmation/reset/daily-report emails are dropped. |
| 🟠 High | `/api/unsubscribe` missing — legal/CAN-SPAM exposure if users click and nothing happens. |
| 🟡 Medium | Two email subsystems with overlapping responsibilities. Consolidate into one. |
| 🟡 Medium | `@sendgrid/mail` still in `package.json` (dead code dependency). |
| 🟢 Low | Templates hard-code colors; consider central theme module. |
