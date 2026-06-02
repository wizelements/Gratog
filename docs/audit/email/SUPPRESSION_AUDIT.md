# SUPPRESSION_AUDIT — Campaign Exclusions and Safety Gates

## Current answer

Suppression is fragmented and incomplete. The current app has several suppression-like fields/collections, but no single send path consistently excludes unsubscribed, bounced, complained, or invalid recipients.

## Suppression sources found

| Source | Collection/field | Written by | Read by | Production status |
|---|---|---|---|---|
| Newsletter unsubscribe | `newsletter_subscribers.unsubscribed` | `/api/unsubscribe` | No current send API | 1 row true |
| Legacy/global unsubscribe | `unsubscribes` collection | No current route found | `lib/email/service.js` | Collection absent |
| Customer unsubscribe | `customers.unsubscribed` | No current route found | `/api/admin/campaigns/send` default mode | 0 true |
| User email prefs | `users.emailPreferences.marketing` | Profile/settings | `lib/email/service.js`, `lib/campaign-manager.js` | 2 users total |
| Bounce/complaint status | `email_sends.events.bounced/complained` | Resend webhook if matched | No campaign recipient filtering found | 0 rows populated |
| Resend provider suppression | Resend account-level suppression | Provider-side | Not queried by app | Unknown from app DB |

## Campaign send API suppression by segment

`app/api/admin/campaigns/send/route.ts` recipient builder:

| Segment | Query | Excludes unsubscribed? | Excludes bounced/complained? | Excludes invalid? |
|---|---|---:|---:|---:|
| First-time buyers | aggregate `orders` by `customerEmail` count = 1 | No | No | No |
| Repeat buyers | aggregate `orders` by `customerEmail` count 2-4 | No | No | No |
| Loyal buyers | aggregate `orders` by `customerEmail` count >= 5 | No | No | No |
| Rewards tier | `customers.rewards.tier` | No | No | No |
| Inactive customers | `customers.email` not in recent order emails | No | No | No |
| Default all customers | `customers.marketingConsent: true`, `unsubscribed: {$ne:true}` | Only `customers.unsubscribed` | No | No |

## Advanced campaign manager suppression

`lib/campaign-manager.js` is a second campaign implementation that is not used by the current admin send route. It selects `users` where:

```js
$or: [
  { 'emailPreferences.marketing': true },
  { 'emailPreferences.marketing': { $exists: false } }
]
```

It does not query `newsletter_subscribers.unsubscribed`, bounce status, complaint status, or invalid-recipient history before sending.

## Advanced email service suppression

`lib/email/service.js` checks:

1. transactional email types are always allowed;
2. marketing email types check an `unsubscribes` collection by normalized email;
3. users can opt out by `users.emailPreferences.marketing === false`.

Production `unsubscribes` collection is absent, while `/api/unsubscribe` writes `newsletter_subscribers`. Therefore the current one-click unsubscribe endpoint does not feed this check.

## Invalid email handling

| Path | Validation |
|---|---|
| Contact form | Zod email validation before storing/sending |
| Newsletter signup | UI input type email only; backend route missing |
| Admin campaigns | Recipient emails sourced from DB, no revalidation before send |
| `lib/resend-email.js` direct sender | No email syntax validation before Resend |
| `lib/email/service.js` direct sender | No email syntax validation before Resend |

## Bounce/complaint suppression

Current Resend webhook has branches for `email.bounced` and `email.complained`, but no successful production updates exist:

- `email_sends.events`: 0 rows
- `email_sends.eventLog`: 0 rows
- `email_sends.resendId`: 0 rows

No send path queries prior bounce/complaint fields before selecting recipients.

## Can campaign sends exclude these groups?

| Group | Current protection |
|---|---|
| `newsletter_subscribers.unsubscribed` | No |
| `customers.unsubscribed` | Only default customer segment, not purchase-frequency/order segments |
| `users.emailPreferences.marketing=false` | Only `lib/email/service.js` and unused `campaign-manager`, not order-based API recipient builder |
| bounced addresses | No app-level suppression |
| complained addresses | No app-level suppression |
| invalid addresses | No persistent invalid-recipient suppression |

## Forensic conclusion

The suppression model is not unified. Unsubscribes, preferences, customer consent, and bounce/complaint events live in different places and are read by different senders. Current campaign sending can include recipients who unsubscribed through the live unsubscribe endpoint, and no current path suppresses bounces or complaints using production data.
