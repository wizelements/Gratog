# SUBSCRIBER_LIFECYCLE — How Emails Enter/Leave the Marketing System

## Current answer

Someone does **not** become a working newsletter subscriber through the public footer/community signup today. The UI exists, but the API route is missing. Existing production `newsletter_subscribers` rows are legacy/current-state data, not evidence that the current signup route works.

## Entry points audited

| Entry point | UI/code path | Database write today | Confirmation email | Campaign eligibility today | Status |
|---|---|---|---|---|---|
| Footer signup | `components/Footer.tsx` → `NewsletterSignup` → `/api/newsletter/subscribe` | None; route 404 | None | None | Broken |
| Community newsletter signup | `app/(site)/community/page.tsx` → `NewsletterSignup` → `/api/newsletter/subscribe` | None; route 404 | None | None | Broken |
| Exit-intent signup | `components/ExitIntentModal.jsx` → `/api/nurture/subscribe` | None; route dir empty | None | None | Broken; UI catch still shows success |
| Checkout opt-in | Checkout/payment customer data | `customers` LTV row after paid order | Order confirmation only | Not marketing eligible unless `customers.marketingConsent === true` | No explicit email opt-in found |
| Contact form | `/contact` → `/api/contact` | `contact_messages` | Notification to support only | Not subscriber | Works for contact capture |
| Manual admin import | No current admin import path found | None found | None | None | Not implemented |

## Public footer/community signup actual flow

```text
Visitor enters email
  ↓
components/NewsletterSignup.jsx handleSubmit()
  ↓
POST /api/newsletter/subscribe { email, firstName }
  ↓
Production: 404
  ↓
Component shows error toast
  ↓
No newsletter_subscribers write
  ↓
No welcome/confirmation email
```

## Existing production subscribers

Production `newsletter_subscribers` currently has:

- 28 total rows
- 27 rows without `unsubscribed:true`
- 1 row with `unsubscribed:true`

Recent active-looking rows contain fields like:

- `email`
- `firstName`
- `status: active`
- `source: website`
- `subscribedAt`
- `createdAt`
- `updatedAt`

Because the current route is missing, these rows were created by older code, manual insertion, or another deployment path not present in the current route tree.

## Campaign eligibility today

The current campaign send API does **not** read `newsletter_subscribers`.

Default campaign recipients are selected from:

```js
db.collection('customers').find({
  marketingConsent: true,
  unsubscribed: { $ne: true },
})
```

Production `customers` has 1 row and 0 rows with `marketingConsent`. Therefore the default current campaign audience is effectively empty in production.

Segmented campaign modes can select from `orders` or `customers`, not from `newsletter_subscribers`.

## How does someone stop being a subscriber?

### Actual endpoint behavior

```text
User visits /unsubscribe?token=...
  ↓
app/unsubscribe/page.js POST /api/unsubscribe { token }
  ↓
app/api/unsubscribe/route.ts verifyToken(token)
  ↓
newsletter_subscribers.updateOne({ email }, { unsubscribed:true }, { upsert:true })
```

### Problem

The senders do not consistently read `newsletter_subscribers.unsubscribed`:

- `/api/unsubscribe` writes `newsletter_subscribers`.
- `lib/email/service.js` checks `unsubscribes`.
- `app/api/admin/campaigns/send/route.ts` checks `customers.unsubscribed` in default mode.
- `lib/campaign-manager.js` checks `users.emailPreferences.marketing`, not `newsletter_subscribers`.

## Lifecycle diagram

```text
Current public signup path

Visitor
  ↓
NewsletterSignup UI
  ↓
/api/newsletter/subscribe
  ↓
404
  ↓
No subscriber row
  ↓
No confirmation
  ↓
No campaign eligibility
```

```text
Legacy data path visible in DB

Unknown old/import path
  ↓
newsletter_subscribers row
  ↓
Not read by current campaign send API
  ↓
No current newsletter campaign eligibility
```

## Conclusion

There is a stored subscriber list in production, but the current public subscription path is broken and the current admin campaign audience does not use that list. The subscriber lifecycle is therefore disconnected from newsletter operations.
