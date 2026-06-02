# EMAIL_SCORECARD — Current State Grades

| Area | Grade | Evidence |
|---|---:|---|
| Deliverability | C | Resend account domain `tasteofgratitude.shop` is verified and some direct sends are accepted; historical `email_sends` has 3 failed vs 2 sent rows; no bounce/complaint suppression is active. |
| Observability | D | `email_sends` tracks some transactional attempts, but webhook lifecycle fields are empty and admin campaign sends write to `email_logs` without populated `resendId`. |
| Compliance | F | Live unsubscribe endpoint writes `newsletter_subscribers`, while active senders check `unsubscribes`, `customers.unsubscribed`, or `users.emailPreferences`; token formats differ. |
| Newsletter Operations | F | Newsletter signup route is 404; test/generate APIs are missing; campaign detail page is missing; unscheduled create submits `scheduledFor:null` to a schema that rejects null. |
| Suppression Handling | F | No unified suppression. Bounces/complaints are not suppressible from production data; order-based segments bypass unsubscribe checks. |
| Webhook Accuracy | F | Signature verification is incompatible with Resend/Svix, invalid unsigned POST returns 500, and webhook matches `resendId` while transactional sends store `messageId`. |
| Admin Experience | D | Admin list/new pages exist and client preview works, but test, generate, review/detail, and send UI paths are broken or absent. |
| Revenue Attribution | F | No campaign UTM/link rewriting/order attribution; production orders have 0 `campaignId` and 0 `utm_campaign`. |
| Scalability | D | Campaign send is fire-and-forget inside a serverless request, with 100-recipient concurrent batches and no durable queue/resume/idempotency. |

## Production evidence snapshot

| Collection/endpoint | Evidence |
|---|---|
| `email_sends` | 5 rows: 2 sent, 3 failed; 2 `messageId`; 0 `resendId`; 0 webhook events |
| `email_logs` | 10 rows: 10 sent; 0 `messageId`; 0 `resendId` |
| `newsletter_subscribers` | 28 rows: 27 active-ish, 1 unsubscribed |
| `campaigns` | Collection absent |
| `orders` | 798 rows; 0 `campaignId`; 0 `utm_campaign` |
| `/api/newsletter/subscribe` | Production 404 |
| `/api/admin/campaigns/test` | 401 without auth; 404 with valid admin token |
| `/api/admin/campaigns/generate` | 401 without auth; 404 with valid admin token |
| `/api/webhooks/resend` invalid POST | Production 500 |
| Resend domain | `tasteofgratitude.shop` verified via Resend API |

## Current state summary

The transactional path is partly working as an attempt ledger. The newsletter system is not production-ready because acquisition, unsubscribe, suppression, campaign sending, webhook tracking, and attribution are disconnected.
