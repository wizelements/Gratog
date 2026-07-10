# Weekly menu + pickup reminder runbook

This runbook covers the Taste of Gratitude passive preorder funnel end-to-end: weekly menu emails, pickup reminders, unsubscribes, optional Telegram alerts, and how to verify everything is working.

## What this system does

- **Weekly menu broadcast** — sends one marketing email per week to leads who signed up via `/weekly-menu`, `/preorder/status`, or any retention form.
- **Pickup reminders** — sends a 24-hour reminder email for upcoming market pickups with confirm/cancel links.
- **Unsubscribe** — every marketing email has a one-click unsubscribe link and `List-Unsubscribe` header.
- **Optional Telegram alerts** — free instant alerts for customers who opt into the Telegram bot.

## What this system does NOT do

- It does not send SMS or text messages.
- It does not use Twilio, carrier email-to-text gateways, or phone numbers for broadcast.
- It does not auto-deploy. All sends start as dry-run and require `--send`.

---

## Required environment variables

```bash
# Database
MONGODB_URI=mongodb+srv://...

# Resend (email provider)
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL=hello@tasteofgratitude.shop

# Token signing (unsubscribe links, order confirm/cancel links)
JWT_SECRET=your_strong_random_secret_at_least_32_chars

# Optional: public base URL
NEXT_PUBLIC_BASE_URL=https://tasteofgratitude.shop

# Optional: Telegram customer channel
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=tasteofgratitude_bot
NEXT_PUBLIC_TELEGRAM_CHANNEL_URL=https://t.me/tasteofgratitude
```

---

## Step 1 — Finalize the weekly menu

1. Decide the week date (the upcoming Saturday by default): `2026-07-11`.
2. Prepare:
   - Subject line
   - Body text (plain text; the script turns it into HTML)
   - Optional menu image URL (hosted on the site or a CDN)
3. Make sure products are visible on `/preorder` and the market is active in `data/markets.ts`.

---

## Step 2 — Run a dry-run broadcast

```bash
npx tsx scripts/weekly-menu-broadcast.ts \
  --dry-run \
  --week 2026-07-11 \
  --subject "This week's menu: Golden Glow, Kissed by Gods, Grateful Defense" \
  --body "Fresh small batches ready for Saturday pickup at Serenbe and Dunwoody."
```

You can also pipe the body from a file:

```bash
cat docs/weekly-menu-copy/2026-07-11.txt | \
  npx tsx scripts/weekly-menu-broadcast.ts \
  --dry-run \
  --week 2026-07-11 \
  --subject "This week's menu"
```

The dry-run prints:

- Total eligible leads
- Count by market (`serenbe`, `dunwoody`, `no market preference`)
- Image URL used
- Confirmation that no emails were sent

## Step 3 — Send the real broadcast

Only after reviewing the dry-run output, replace `--dry-run` with `--send`:

```bash
npx tsx scripts/weekly-menu-broadcast.ts \
  --send \
  --week 2026-07-11 \
  --subject "This week's menu: Golden Glow, Kissed by Gods, Grateful Defense" \
  --body "Fresh small batches ready for Saturday pickup at Serenbe and Dunwoody." \
  --image-url https://tasteofgratitude.shop/images/menu-2026-07-11.jpg
```

The script will:

- Pull leads from `newsletter_subscribers` and `lead_intents`.
- Deduplicate by email.
- Skip unsubscribed records.
- Segment by `marketInterest` / `metadata.marketId`.
- Send personalized links:
  - Known market → `/preorder?market=MARKET_ID&utm_source=weekly_email&utm_campaign=passive_preorder_funnel&week=YYYY-MM-DD`
  - Unknown market → `/weekly-menu?utm_source=weekly_email&utm_campaign=weekly_menu_capture&week=YYYY-MM-DD`
- Log every send to `broadcast_logs`.

---

## Step 4 — Verify Resend success/failures

1. Check the script summary: `X sent, Y failed`.
2. Inspect `broadcast_logs` in MongoDB:

```js
db.broadcast_logs.find({ campaignWeek: '2026-07-11' }).sort({ sentAt: -1 })
```

3. Check Resend dashboard for bounces, complaints, and delivery events.
4. Optional: configure `app/api/webhooks/resend/route.js` to update logs automatically with delivery status.

---

## Step 5 — Handle unsubscribes

Every weekly email contains:

- A visible **Unsubscribe** link in the footer.
- A `List-Unsubscribe` email header for one-click unsubscribe in Gmail/Apple Mail.

When a recipient clicks the link, `/unsubscribe?token=...` verifies the signed token and marks the email as unsubscribed in:

- `newsletter_subscribers`
- `unsubscribes`
- `email_suppressions`

Suppression is enforced by the broadcast script before sending. The script checks:

- `unsubscribed === true`
- `unsubscribedAt`
- `optOutAt`
- `metadata.optOutAt`
- `metadata.unsubscribedAt`

If someone asks to be removed manually, run:

```bash
# From a MongoDB shell or admin tool
db.newsletter_subscribers.updateOne(
  { email: 'example@email.com' },
  { $set: { unsubscribed: true, unsubscribedAt: new Date() } }
);
```

---

## Step 6 — Run pickup reminders

Run dry-run first:

```bash
npx tsx scripts/pickup-reminders.ts --dry-run
```

Then send:

```bash
npx tsx scripts/pickup-reminders.ts --send
```

The script finds orders where:

- `status` is not `CANCELLED`, `REFUNDED`, `PICKED_UP`, or `FULFILLED`.
- `confirmationStatus` is not `reminder_sent`, `confirmed`, or `cancelled`.
- `customerEmail` exists.
- `pickupDay` matches the upcoming market day (optional filter via `--market-day Saturday`).

The reminder email includes signed links:

- Confirm: `/api/preorder/confirm?orderId=ORDER_ID&token=TOKEN`
- Cancel: `/api/preorder/cancel?orderId=ORDER_ID&token=TOKEN`

After a successful send, the script sets `confirmationStatus = 'reminder_sent'` and logs to `pickup_reminder_logs`.

---

## Step 7 — Confirm or cancel a preorder by email link

When a customer clicks the confirm link, the order's `confirmationStatus` becomes `confirmed`. When they click cancel, the order status becomes `CANCELLED` and `confirmationStatus` becomes `cancelled`.

Both endpoints redirect to `/preorder/status?order=ORDER_ID&confirm=confirmed` (or `&cancel=cancelled`). The status page shows a confirmation banner.

Staff can also update status via the existing staff endpoint:

```bash
curl -X POST https://tasteofgratitude.shop/api/preorder/status \
  -H 'Content-Type: application/json' \
  -d '{"orderNumber":"PRE-...","status":"READY","staffKey":"$PREORDER_STAFF_KEY"}'
```

---

## Step 8 — Review broadcast and reminder logs

Collections:

- `broadcast_logs` — weekly menu sends
- `pickup_reminder_logs` — pickup reminder sends
- `lead_intents` — captured leads with intent and source
- `newsletter_subscribers` — deduplicated subscriber records

Useful queries:

```js
// Weekly menu summary by status
 db.broadcast_logs.aggregate([
  { $match: { campaignWeek: '2026-07-11' } },
  { $group: { _id: '$status', count: { $sum: 1 } } }
]);

// Pickup reminders sent today
 db.pickup_reminder_logs.find({
  sentAt: { $gte: new Date(new Date().setHours(0,0,0,0)) }
}).sort({ sentAt: -1 });

// Leads by source
 db.lead_intents.aggregate([
  { $match: { intent: 'weekly_menu_texts' } },
  { $group: { _id: '$source', count: { $sum: 1 } } }
]);
```

---

## Step 9 — Optional Telegram alerts

Customers can visit `/telegram-alerts` to opt in.

The page:

- Explains Telegram is optional and does not replace email.
- Provides a button to open the configured Telegram bot.
- Includes an email form so the operator can match the Telegram user to a known email later.

To enable the bot button, set:

```bash
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=tasteofgratitude_bot
```

To mirror weekly menu announcements to Telegram, use the existing `scripts/tog-telegram-notify.js` owner digest or build a lightweight follow-up script that posts the same menu copy to the bot. That is out of scope for this runbook.

---

## Safety checklist

- [ ] Ran `--dry-run` before `--send`.
- [ ] Reviewed market segment counts.
- [ ] Verified `RESEND_FROM_EMAIL` is a verified Resend domain.
- [ ] Confirmed `JWT_SECRET` is set (required for unsubscribe and order action links).
- [ ] Checked `broadcast_logs` after the live send.
- [ ] Checked Resend dashboard for bounces/complaints.
- [ ] Did not add Twilio/SMS/carrier gateway code.
