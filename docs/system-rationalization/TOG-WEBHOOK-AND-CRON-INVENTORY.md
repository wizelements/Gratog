# TOG-WEBHOOK-AND-CRON-INVENTORY.md

Taste of Gratitude — Webhook and Cron Inventory

Generated: 2026-07-29 19:12 EDT
Authority: Native Termux workspace

---

## 1. Cron Jobs

| Path | Schedule | Auth | Purpose | Status |
|------|----------|------|---------|--------|
| `/api/admin/menus/archive` | `0 6 * * 1` | CRON_SECRET | Archive expired weekly menus | Active |
| `/api/cron/cleanup-abandoned-orders` | `15 * * * *` | CRON_SECRET | Cleanup abandoned orders + send winback email | Active |
| `/api/cron/cleanup-locks` | not in vercel.json | CRON_SECRET? | Cleanup stale inventory/queue locks | Code exists, not scheduled |
| `/api/cron/daily-report` | `0 14 * * 1-5` | CRON_SECRET | Daily owner report (revenue/orders) | Active, verified 2026-07-28 |
| `/api/cron/owner-alerts` | `*/5 * * * *` | CRON_SECRET | Process owner alert queue | Active, verified 2026-07-28 |
| `/api/markets/warm` | `0 18 * * 3` | CRON_SECRET / WEEKLY_WARM_CRON_SECRET | Warm market cache / send weekly warm email | Active |
| `/api/retention/winback` | `0 14 * * 0` | CRON_SECRET | Winback campaign for inactive customers | Active |

### Notes
- Cleanup-abandoned-orders sends winback emails; recent `email_sends` failures around 19:15–21:15 UTC may be from this cron.
- `cleanup-locks` exists as a route but is not scheduled in `vercel.json`.

## 2. Webhooks

| Path | Provider | Auth | Events | Purpose | Status |
|------|----------|------|--------|---------|--------|
| `/api/webhooks/square` | Square | HMAC signature (SQUARE_WEBHOOK_SIGNATURE_KEY) | payment.created, payment.updated, payment.completed, refund.created, refund.updated, inventory.count.updated, catalog.version.updated | Reconcile Square events with MongoDB orders/inventory | Active |
| `/api/webhooks/square/payment` | Square | Same as above | Payment events | Secondary payment webhook path | Active |
| `/api/webhooks/resend` | Resend | RESEND_WEBHOOK_SECRET | Email delivery events | Track email bounces/deliveries | Active |
| `/api/gratitude/webhook` | Internal | Unknown | Gratitude reward events | Reward system webhook | Referenced |

### Notes
- Square webhook signature verification is critical; `SQUARE_SKIP_WEBHOOK_VERIFICATION` must remain unset in production.
- Resend webhook path exists but live event handling unverified.

## 3. Background / Async Processing

| System | Detail |
|--------|--------|
| Owner alert queue | MongoDB `owner_alert_queue` collection; processed by `/api/cron/owner-alerts` |
| Email queue | `lib/email-queue.js` |
| Event queue | `lib/event-queue.ts` |
| Inventory locks | `lib/inventory-lock.ts` + cron cleanup |
| Campaign scheduler | `lib/campaign-manager.js` + cron |

---

*Next: TOG-CUSTOMER-JOURNEY-MAP.md*
