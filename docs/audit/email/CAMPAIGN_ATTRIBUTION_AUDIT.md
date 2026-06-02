# CAMPAIGN_ATTRIBUTION_AUDIT — Newsletter Revenue Measurement

## Current answer

Newsletter revenue cannot be measured end-to-end today. The code has campaign ids for internal campaign rows and some delivery stats, but there is no reliable path from campaign email → click → site visit → order.

## Attribution artifacts found

| Artifact | Exists? | Notes |
|---|---:|---|
| `campaigns.id` | Yes in code | Production `campaigns` collection absent |
| `email_sends.campaignId` | Supported by `lib/campaign-manager.js` only | Production count 0 |
| `email_logs.campaignId` | Not populated | Production count 0 |
| `utm_source` / `utm_medium` / `utm_campaign` in campaign emails | No current campaign email builder evidence | UTM exists only in unrelated push/ecosystem links |
| Link rewriting for click tracking | No app-level implementation | Resend click events would require matched message id |
| Webhook click capture | Code branch exists | No production matches; webhook key mismatch |
| Orders with campaign fields | No | Production orders have 0 `campaignId` / `utm_campaign` |
| Revenue report by campaign | No current admin route/page found | `lib/campaign-manager.getCampaignAnalytics()` only computes send/failure rates |

## Current admin send API attribution path

```text
Campaign row
  ↓
/api/admin/campaigns/send
  ↓
sendEmail({ to, subject, html, text })
  ↓
email_logs row
  ↓
No campaignId attached to sendEmail call
  ↓
No UTM rewriting in body links
  ↓
No order attribution fields
```

## Alternate campaign manager path

`lib/campaign-manager.js` has a better internal ledger design:

```text
campaignId
  ↓
email_sends rows with campaignId + resendId
  ↓
getCampaignAnalytics(campaignId)
```

But it is not the route used by `app/api/admin/campaigns/send/route.ts`, and even its analytics only cover:

- total recipients
- sent
- failed
- delivery/failure rate based on `email_sends.status`

It does not connect clicks or orders to campaign revenue.

## Click path today

```text
Recipient clicks link in newsletter
  ↓
If Resend tracking is enabled, provider may emit email.clicked
  ↓
app/api/webhooks/resend tries to match email_sends.resendId
  ↓
Current transactional rows only have messageId; admin send rows use email_logs
  ↓
Click is not connected to campaign or recipient in production DB
```

## Order path today

```text
Site visit after email click
  ↓
Checkout/payment
  ↓
orders row
  ↓
No campaignId / utm_campaign / email message id fields
  ↓
No campaign revenue join possible
```

Production field coverage:

- `orders`: 798 total; 0 `campaignId`; 0 `utm_campaign`.
- `email_sends`: 5 total; 0 `campaignId`; 0 `utm_campaign`.
- `email_logs`: 10 total; 0 `campaignId`; 0 `utm_campaign`; 0 `resendId`.

## Can campaign revenue be measured?

**No.** There is no durable campaign identifier in outgoing links, no click-session persistence, and no order attribution field to join back to campaigns.

## What can be measured today?

| Metric | Current answer |
|---|---|
| Campaign created | Only if `campaigns` rows exist; none in production |
| Campaign send initiated | API response/logs only |
| Campaign send count | Internal `campaigns.stats.sent`, if send API completes |
| Delivered/opened/clicked | Not reliable due webhook mismatch |
| Revenue from campaign | Not measurable |

## Forensic conclusion

Current campaign analytics are send-operation counters, not revenue attribution. A newsletter-driven order cannot be reconstructed from production data today.
