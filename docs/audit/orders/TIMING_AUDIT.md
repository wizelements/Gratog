# Timing Audit

**Status**: COMPLETE  
**Last Updated**: 2026-06-01  
**Owner**: AMP forensic audit
**Repository**: Gratog-live

---

## Timing Classification

| Event | Classification | Evidence |
|---|---|---|
| Order stored after create request | Immediate | Mongo order `createdAt: 2026-06-01T09:24:43.962Z`; Vercel `/api/orders/create` request at `2026-06-01T09:24:43.273Z` returned 200. |
| Payment completed in Square | Fast after order creation | Square payment `createdAt: 2026-06-01T09:24:57.807Z`; Square order closed `09:24:58.610Z`. |
| Payment record written locally | Immediate after Square completion | `payment_records.metadata.createdAt: 2026-06-01T09:24:58.653Z`. |
| Customer confirmation sent | Immediate | `email_sends.createdAt: 09:24:58.872Z`; Resend created `09:24:58.992987+00`. |
| Customer confirmation delivered | Fast, exact delivered-at unavailable | Resend API `last_event=delivered`; API response did not include delivered timestamp. |
| Admin/staff email notification | Failed | Vercel `/api/payments` log at `09:24:56.569Z` with `ReferenceError: location is not defined`; no `staffNotifiedAt`. |
| Admin dashboard visibility | Pending order immediate; paid state no later than customer email claim | Admin reads Mongo orders. First paid `updatedAt` was overwritten by webhook replay; payment record/email timestamps prove local paid path completed around `09:24:58.653Z`-`09:24:58.872Z`. |
| Queue visibility | Fast, client-side | `queuepositions.createdAt: 2026-06-01T09:25:01.863Z`, about 3.25s after Square order close. |
| Square webhook replay | Delayed/manual-looking | `webhook_events_processed.processedAt: 2026-06-01T09:27:13.060Z`, event id `release-verify-replay-1780306032574`. |

---

## Real Order Timeline

| Timestamp UTC | Event | Source |
|---:|---|---|
| `2026-06-01T09:24:43.273Z` | `/api/orders/create` production request returned 200 | Vercel logs |
| `2026-06-01T09:24:43.962Z` | Mongo order created | `orders.createdAt` |
| `2026-06-01T09:24:56.569Z` | `/api/payments` production request returned 200; same log contains staff notification ReferenceError | Vercel logs |
| `2026-06-01T09:24:56.997Z` | Payment attempt marker | `orders.paymentAttemptedAt` |
| `2026-06-01T09:24:57.341Z` | Square order created | Square Orders API |
| `2026-06-01T09:24:57.807Z` | Square payment created | Square Payments API |
| `2026-06-01T09:24:58.610Z` | Square order closed/completed | Square Orders API |
| `2026-06-01T09:24:58.653Z` | Local payment record metadata timestamp | `payment_records.metadata.createdAt` |
| `2026-06-01T09:24:58.728Z` | Email claim marker | `orders.emailSentAt` |
| `2026-06-01T09:24:58.872Z` | Local email send row created | `email_sends.createdAt` |
| `2026-06-01T09:24:58.926Z` | Paid side effects claimed; staff failure warning timestamp in logs | `orders.paidEffectsAppliedAt`; Vercel log detail |
| `2026-06-01 09:24:58.992987+00` | Resend email object created | Resend API |
| `2026-06-01T09:25:01.595Z` | `/api/queue/join` returned 200 | Vercel logs |
| `2026-06-01T09:25:01.863Z` | Queue row created | `queuepositions.createdAt` |
| `2026-06-01T09:27:12.805Z` | `/api/webhooks/square` returned 200 | Vercel logs |
| `2026-06-01T09:27:13.047Z` | Order timeline status update via Square webhook | `orders.timeline[0].timestamp` |
| `2026-06-01T09:27:13.060Z` | Webhook event stored | `webhook_events_processed.processedAt` |

---

## Delay Calculations

| From | To | Duration |
|---|---|---:|
| Mongo order created | Square payment created | ~13.845s |
| Square payment created | Local payment record metadata timestamp | ~0.846s |
| Square payment created | Email send row | ~1.065s |
| Square payment created | Resend email created | ~1.186s |
| Square order closed | Email send row | ~0.262s |
| Square order closed | Queue row created | ~3.253s |
| Square payment created | Webhook replay stored | ~135.253s |

---

## Manual Refresh Required?

| Surface | Manual refresh required? | Evidence |
|---|---|---|
| Customer confirmation email | No | Sent by server in `/api/payments`. |
| Customer success page | No for redirect path; page polls by order ref if pending/not found | `app/order/success/page-enhanced.js` lines 42-95. |
| Queue position page | No, polls every 5 seconds | `app/order/[id]/queue/page.js` and Vercel repeated `/api/queue/position` logs. |
| Admin orders page | Yes/page load/manual refresh | `app/admin/orders/page.js` fetches on mount and refresh button; comment says broken interval removed. |
| Admin dashboard | Yes/page load | `app/admin/page.js` fetches orders on mount only. |
| Staff email | Not applicable | Failed before send. |

---

## Key Timing Finding

Customer confirmation is immediate for the verified order. Admin awareness via staff email is not delayed—it fails. Admin dashboard awareness is available only when staff opens or refreshes the dashboard, and the exact first paid-status `updatedAt` was overwritten by the later webhook replay.
