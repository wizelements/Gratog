# NEWSLETTER_ADMIN_FLOW — Admin Campaign Operations

## Current production answer

Admins have a visible campaign UI, but the newsletter workflow is not production-ready. The admin can open the campaigns page and the new-campaign page after login, but the current UI cannot complete a safe create-preview-test-send-send lifecycle.

## Admin surfaces found

| Surface | Path | Actual status |
|---|---|---|
| Campaign list | `app/admin/campaigns/page.js` | Exists; fetches `/api/admin/campaigns` |
| New campaign UI | `app/admin/campaigns/new/page.js` | Exists; has editor, preview modal, AI/test buttons |
| Campaign detail page | `app/admin/campaigns/[id]` | Missing; list click routes to a non-existent page |
| Create/list/update/delete API | `app/api/admin/campaigns/route.ts` | Exists |
| Send API | `app/api/admin/campaigns/send/route.ts` | Exists, but no current UI calls it |
| Test-send API | `app/api/admin/campaigns/test` | Directory exists, no route file; production returns 404 when authenticated |
| AI generation API | `app/api/admin/campaigns/generate` | Directory exists, no route file; production returns 404 when authenticated |
| Diagnose API | `app/api/admin/campaigns/diagnose` | Directory exists, no route file |
| Campaign by-id API | `app/api/admin/campaigns/[id]` | Directory exists, no route file |

Production checks:

- `/admin/campaigns` redirects unauthenticated users to login.
- `/api/admin/campaigns/test` and `/api/admin/campaigns/generate` return `401` without admin auth.
- With a valid forged admin JWT, those two routes return `404`, proving the route handlers are absent.
- Production `campaigns` collection is absent.

## Actual new-campaign UI flow

```text
Admin opens /admin/campaigns/new
  ↓
Admin enters name / subject / preheader / body / segment criteria
  ↓
Optional: Preview Email
  ↓
Client-only preview modal renders sanitized campaign HTML
  ↓
Save as Draft or Create & Review
  ↓
POST /api/admin/campaigns
```

### Create/save defects in actual code

The UI always sends:

```js
scheduledFor: campaignData.scheduledFor
```

`campaignData.scheduledFor` starts as `null`, while `CampaignCreateSchema` accepts only an optional ISO datetime string, not `null`. Therefore an unscheduled draft created from the current UI submits a value that Zod rejects.

The sidebar also passes segment params such as `purchaseFrequency` to `/api/admin/customers`, but `CustomerQuerySchema` is `.strict()` and does not allow those keys. The recipient estimator therefore submits query params that this API rejects.

## Preview behavior

| Preview type | Exists? | Evidence |
|---|---:|---|
| In-browser visual preview | Yes | `showPreview` dialog in `app/admin/campaigns/new/page.js` |
| Resend/test inbox preview | No | `/api/admin/campaigns/test` has no route file |
| Campaign detail/review page | No | `/admin/campaigns/[id]` page missing |

## Test send behavior

The UI button calls:

```text
POST /api/admin/campaigns/test
```

There is no route handler. Authenticated production request returns `404`. Therefore admins cannot test-send a newsletter today through the current app.

## AI generation behavior

The UI button calls:

```text
POST /api/admin/campaigns/generate
```

There is no route handler. Authenticated production request returns `404`. Therefore AI newsletter generation is a dead UI action today.

## Send behavior if API is invoked directly

If an authenticated admin manually calls:

```text
POST /api/admin/campaigns/send { campaignId }
```

Actual path:

```text
Admin direct API call
  ↓
withAdminMiddleware permission check: CAMPAIGNS_SEND
  ↓
find campaign by id in campaigns
  ↓
status draft/scheduled → sending
  ↓
buildRecipientList(segmentCriteria)
  ↓
sendEmailsAsync(campaign, recipients, admin.email) without awaiting
  ↓
lib/email/service.sendEmail()
  ↓
Resend API
  ↓
email_logs insert
  ↓
campaign stats update
```

Important actual behavior:

- The send API does **not** create `email_sends` rows.
- It sends through `lib/email/service.js`, which logs to `email_logs`.
- It does not attach `campaignId` to `sendEmail()` metadata.
- It does not pass a working unsubscribe link around the campaign body.
- It uses fire-and-forget async work after returning the HTTP response, unsafe for Vercel/serverless execution.
- It can select recipients directly from `orders.customerEmail` for purchase-frequency segments, bypassing customer marketing consent and newsletter unsubscribes.

## Recipient selection in send API

| Segment criteria | Actual source | Suppression applied |
|---|---|---|
| `purchaseFrequency: first-time` | Aggregate `orders.customerEmail`, count = 1 | None |
| `purchaseFrequency: repeat` | Aggregate `orders.customerEmail`, count 2-4 | None |
| `purchaseFrequency: loyal` | Aggregate `orders.customerEmail`, count >= 5 | None |
| `rewardsTier` | `customers.rewards.tier` | None |
| `inactive` | `customers` not in recent order emails | None |
| default/no criteria | `customers.marketingConsent === true` and `unsubscribed != true` | `customers.unsubscribed` only |

Production note: `customers` has 1 row and 0 rows with `marketingConsent:true`; `newsletter_subscribers` has 28 rows but is not queried by this send API.

## Analytics visible to admin

List cards show:

- total campaigns
- sent/draft/scheduled counts
- campaign row stats: total recipients, sent, delivery rate based on `stats.sent / stats.totalRecipients`

They do not show real delivered/opened/clicked/bounced data in production because Resend webhook correlation is not working and no campaign rows currently exist.

## Expected workflow vs actual workflow

| Stage | Expected | Actual |
|---|---|---|
| Create campaign | Save valid draft | UI submits `scheduledFor:null`, which the schema rejects |
| Preview | Render final email safely | Client preview exists only |
| Test send | Send to admin inbox | UI calls missing API route |
| Review detail | Admin reviews saved campaign | Detail page missing |
| Send | Button/API sends selected audience | Send API exists, but no UI path; direct call only |
| Track delivery | Webhook updates campaign stats | Webhook match/status path broken |
| Analytics | Delivery/open/click/failure dashboard | Only local campaign counters, no production campaign data |

## Can admin send newsletters today?

**Through the UI: no.** There is no working end-to-end UI path to test, review, and send.  
**By manual API call: only partially, and not safely.** The send API exists but uses incomplete recipient suppression, weak observability, and unsafe background execution.

## Can admin preview?

**Yes, only locally in the browser before save.** The preview is not a saved campaign preview and not an inbox/client-rendering test.

## Can admin test send?

**No.** The route called by the button is missing.

## Can admin see delivery status?

**No reliable delivery status today.** Campaign list stats are internal counters, not verified provider lifecycle data.
