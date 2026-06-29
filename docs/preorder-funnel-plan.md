# Taste of Gratitude — Preorder Funnel Plan

**Prepared for:** Amp / Taste of Gratitude
**Repo:** `/root/.openclaw/workspace/Gratog`
**Date:** 2026-06-28
**Constraint:** planning only; no direct edits in this run

---

## 1. Executive recommendation: bottom-of-funnel, not top

**Keep preorder at the bottom of the funnel.** The current /preorder flow is already a high-intent action: pick a market, build a $60+ cart, leave contact info, and pay at pickup. It assumes the visitor already trusts the product and is willing to commit to a specific place and time. That is too much for cold traffic.

**The right shape:**
- **Top of funnel:** discovery content (homepage, social, QR, markets page) that captures interest and contact info without asking for a purchase.
- **Middle of funnel:** weekly menu texts/emails, samples at the booth, and low-risk browsing (catalog/quiz) that warm people up.
- **Bottom of funnel:** market-specific preorder links (`/preorder?market=serenbe`) for repeat or high-intent buyers who are ready to reserve.

**Why:** A $60 pay-at-pickup local preorder is a commitment, not an impulse. The brand already has strong lead-capture plumbing (`RetentionForm`, `/api/lead`, `lead_intents`, `newsletter_subscribers`). Use that to convert strangers into subscribers, then let the weekly menu do the selling before they ever see a $60 minimum.

---

## 2. Funnel architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ENTRY POINTS                                                            │
│  • Homepage hero: "Join weekly menu texts"                                │
│  • Markets page: "Get menu reminder" on each market card                │
│  • QR / social / print: short link -> lead capture landing page         │
│  • Catalog / quiz: soft opt-in at end                                   │
├─────────────────────────────────────────────────────────────────────────┤
│ CAPTURE STEP                                                            │
│  • RetentionForm with intent=weekly_menu_texts + market source          │
│  • One field: phone (required) + email (optional) + market tag          │
│  • Persisted to /api/lead -> lead_intents + newsletter_subscribers      │
├─────────────────────────────────────────────────────────────────────────┤
│ WARMING SEQUENCE                                                        │
│  • Weekly menu text/email 1–2 days before cutoff                        │
│  • Link goes to /preorder?market=serenbe or ?market=dunwoody          │
│  • Markets page stays available for research / walk-up info             │
├─────────────────────────────────────────────────────────────────────────┤
│ CONVERSION STEP                                                         │
│  • /preorder?market=xxx skips market selection, lands on items        │
│  • $60 minimum shown early and in cart                                  │
│  • Checkout: name + phone required, email optional                      │
│  • Submit -> POST /api/preorder -> MongoDB marketorders                 │
├─────────────────────────────────────────────────────────────────────────┤
│ FULFILLMENT / STATUS LOOP                                               │
│  • Order confirmation page /preorder/status?order=PRE-xxx             │
│  • SMS/email reminder before pickup (manual or Twilio/SendGrid)         │
│  • Pay at pickup; status updates in admin or status page                │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Implementation phases (highest ROI / lowest risk first)

### Phase 0: Baseline hygiene (do not skip)
- Confirm uncommitted work is intentional; it is already large (~35 files, ~1,400± changes).
- Run `npm run lint`, `npm run typecheck`, and a targeted `/preorder` manual flow before adding anything.
- Make sure the existing `/api/preorder` POST, `/api/lead` POST, and `/preorder` page compile and pass validation.

### Phase 1: Homepage + markets lead capture (fast, low risk, high leverage)
- Add a small weekly-menu capture block on the homepage hero that is more prominent than the current inline form.
- Add a market-specific capture block on the markets page.
- Add `market` source metadata to lead capture so follow-up links are personalized.

### Phase 2: A dedicated low-friction landing page for QR/social (1 new page)
- Create `/weekly-menu` or `/menu-drop`.
- Hero: "Get this week's sea moss menu for [Serenbe / Dunwoody / your local market]."
- RetentionForm only: phone + email + market selector.
- No $60 minimum, no cart, no checkout.

### Phase 3: Deep-link market preorders (reuse existing flow)
- Ensure `/preorder?market=serenbe` and `/preorder?market=dunwoody` land directly on the items step.
- Make the $60 minimum and pay-at-pickup expectation clear at the top of the items step.
- Surface "Not ready? Join weekly texts" fallback on the items step.

### Phase 4: Warming automation (manual first, then light automation)
- Export `lead_intents` with `intent=weekly_menu_texts` and `source` containing the market.
- Send a weekly SMS/email with a menu image/list and a `/preorder?market=xxx` link.
- Do this manually or with a simple cron/script; avoid marketing-automation bloat.

### Phase 5: Catalog/quiz soft opt-in + post-order retention
- Add a "Get reminders for this product" micro-form on PDPs for preorder-only items.
- After checkout, offer a 1-click subscription to weekly menu texts using the customer phone/email.
- Add simple events so the funnel can be measured.

---

## 4. Exact technical changes

### 4.1 Data contract additions

**New fields in lead capture payload (no DB schema change required):**
The existing `LeadSchema` accepts `metadata: z.record(z.unknown())`. We will use that to tag market source without altering the collection.

```ts
// components/RetentionForm.jsx props
interface RetentionFormProps {
  intent: string;
  source: string;          // e.g. "homepage_hero", "markets_card_serenbe"
  marketTag?: string;      // "serenbe" | "dunwoody" | undefined
  defaultMarket?: string;
  // ... existing
}
```

When `marketTag` is present, form body becomes:
```json
{
  "intent": "weekly_menu_texts",
  "source": "markets_card_serenbe",
  "email": "...",
  "phone": "...",
  "metadata": { "marketId": "serenbe", "captureContext": "markets_page" }
}
```

**New UI-only state on `/preorder`:<parameter_name>`:**
- Read `utm_source`, `utm_medium`, `source` search params for later analytics.
- Read `market` to auto-advance; read `category` (currently ignored) to scroll to a category section.

### 4.2 File-by-file changes

#### `components/RetentionForm.jsx`
- Add optional `marketTag` / `defaultMarket` props.
- If `collectMarket` is true, render a small market selector (Serenbe / Dunwoody / Either) above the phone field.
- Include `metadata.marketId` in the POST body.
- Keep the honeypot field exactly as-is.

#### `app/page.js` / `components/home/HomePageClient.jsx`
- Move the hero retention form higher visually or give it a clear heading.
- Add a second CTA button in the hero: "Get weekly menu texts" that smooth-scrolls to `#weekly-texts`.
- Change hero subtitle emphasis from catalog to weekly menu + pickup.

#### `app/markets/page.tsx`
- On each market card, add a secondary button: **"Get menu reminder"** that opens a compact inline RetentionForm.
- Pass `marketTag={market.id}` and `source={`markets_card_${market.id}`}`.
- Keep the existing **Preorder** button as the primary high-intent action.

#### `app/preorder/page.tsx`
- In the market step, make the RetentionForm fallback more prominent.
- In the items step:
  - Add an early banner: "$60 minimum • Pay at pickup • [Market name] [Day]s".
  - When `market` param is present, skip market selection and start at items.
  - When `category` param is present, scroll the matching `CategorySection` into view on load.
  - Add a sticky low-friction escape hatch: "Not ready for $60? Get weekly menu texts instead."
- In the checkout step, pre-fill customer phone/email if it was captured earlier (use localStorage/sessionStorage only, no privacy risk).

#### `app/weekly-menu/page.tsx` (NEW)
- Static/ISR page.
- Pull active markets from `data/markets.ts` (`getActiveMarketPickups`).
- Render a hero, a market selector, and a single RetentionForm.
- No cart, no checkout.
- Canonical SEO: "Taste of Gratitude Weekly Menu | Atlanta Farmers Market Pickup".

#### `app/api/lead/route.ts`
- Merge `metadata` into the persisted document (already supported; just ensure it is included in the `$set`).
- Add lightweight server-side source normalization: `source` lowercased and truncated to 120 chars.
- No new collections.

#### `app/api/preorder/route.ts`
- Already validates cutoff, minimum, market. No change required for the funnel.
- Optional: log `metadata.utmSource` / `metadata.utmMedium` when present for later analytics.

#### `app/preorder/status/page.tsx`
- Optional: add a "Get reminders for next week" RetentionForm below order details.

#### `lib/preorder/rules.ts`
- Confirm `isPastCutoff` logic is correct. Current code: Friday 18:00 cutoff, market on Saturday. This means preorders close Friday 6 PM. Document this clearly in UI copy.

---

## 5. Copy / CTA recommendations

### Homepage
- Hero headline (keep): "Your weekly farmers market wellness ritual starts here."
- **Primary CTA:** "Get the weekly menu" (scrolls to /weekly-menu or #weekly-texts)
- **Secondary CTA:** "Shop this week" -> /catalog
- **Tertiary CTA:** "Find pickup markets" -> /markets
- Retention form copy:
  - Title: "Get weekly menu texts"
  - Description: "We text the menu before each market. Reply STOP anytime."
  - CTA: "Text me the menu"

### Markets page
- Hero: "Meet Taste of Gratitude at the market, then reserve what nourishes your week."
- Market card primary: "Reserve at [market shortName]" -> `/preorder?market=serenbe`
- Market card secondary: "Get menu reminder" -> opens inline form
- Below cards: "First time? Walk up for samples, then preorders reserve your weekly staples."

### Preorder page
- Market step headline: "Select your pickup market"
- Market step subheadline: "Samples are for discovery at the booth. Preorders reserve what you already know you want."
- Items step banner: "$60 minimum • Pay at pickup on [Day] • [Market name]"
- Items step sub-banner: "Want to try first? Visit us at the booth for samples."
- Checkout CTA: "Place Preorder · $XX.XX · Pay at pickup"
- Empty-products fallback: keep existing RetentionForm.

### QR / social / print campaigns
- Short link destination: `/weekly-menu?source=qr_serenbe_june` (or `?market=serenbe&source=flyer_serenbe`).
- Hero copy: "Get this week's menu for Serenbe Farmers Market pickup."
- CTA: "Text me the menu"
- No checkout on this page.

### Retention forms
- Keep the same "No spam. Reply STOP to opt out of texts" disclaimer.
- For market-specific forms: "Get [Serenbe] menu reminders before each Saturday market."

### Status/confirmation page
- Post-order: "Your preorder is reserved. Pay at pickup."
- Optional upsell: "Want a reminder before next week's menu drops? Join weekly texts."

---

## 6. Analytics / events and minimum success metrics

### Events to track (use existing logger or add lightweight client events)

| Event name | Where | Data |
|------------|-------|------|
| `lead_capture_started` | RetentionForm focus / open | intent, source, marketId |
| `lead_capture_submitted` | RetentionForm success | intent, source, marketId, persisted |
| `preorder_market_selected` | /preorder market click | marketId, source |
| `preorder_item_added` | /preorder + click | productId, category, price |
| `preorder_item_removed` | /preorder - click | productId |
| `preorder_checkout_viewed` | step change to checkout | marketId, cartTotal, itemCount |
| `preorder_submitted` | POST /api/preorder success | marketId, total, itemCount, orderNumber |
| `preorder_failed` | POST /api/preorder error | marketId, code, error |
| `preorder_status_viewed` | /preorder/status load | orderNumber |

### Minimum success metrics (target after 4–6 weeks)

| Metric | Baseline | Target |
|--------|----------|--------|
| Weekly lead captures (weekly_menu_texts) | unknown | 20–40/week across both markets |
| Lead -> preorder conversion rate | unknown | ≥ 5% within 30 days |
| /preorder sessions from deep-link (`?market=`) | unknown | ≥ 40% of all /preorder sessions |
| Checkout completion rate among carts >$60 | unknown | ≥ 60% |
| $60 minimum abandonment rate | unknown | < 30% of carts that reach checkout |
| Unsubscribe rate (text/email) | unknown | < 5% per send |

---

## 7. Operational assumptions / risks

### Inventory and cutoff
- Current cutoff: Friday 6 PM for Saturday markets.
- Risk: if the menu changes after texts go out, `/api/storefront/catalog` and `getStorefrontCatalogSnapshot` must reflect live availability. The API already resolves against live data.
- Recommendation: send the weekly menu text **after** the menu is confirmed in Square/data files, ideally Wednesday or Thursday, not Monday.

### $60 minimum
- Risk: cold visitors hit a wall at items step.
- Mitigation: weekly texts warm them first; homepage/markets capture lead before they ever see the minimum.

### Market pickup only
- Risk: customers outside Serenbe/Dunwoody churn.
- Mitigation: homepage form asks "your market" or "either"; if a new market opens, lead data tells you where demand is.

### SMS/email follow-up
- Current state: `lead_intents` and `newsletter_subscribers` capture data, but no automated sending code was found in this audit.
- Recommendation: start manual. Export leads weekly, send via existing Twilio/SendGrid or personal phone until volume justifies automation.

### Pay at pickup
- Risk: no-show orders.
- Mitigation: confirmation SMS 24h before pickup; ask customers to reply CONFIRM or CANCEL; mark no-shows in status/admin.

### Data quality
- `lead_intents` upserts on `(intent, email-or-phone)`. Good for dedupe, but `source`/`marketId` can be overwritten.
- Recommendation: keep first-captured source immutable by relying on `firstCapturedAt` and only update `metadata` on subsequent captures if needed.

### Uncommitted work
- The repo has 35 modified files and several untracked data files. Any new work should be committed in its own clean PR on top of the current state, not mixed with existing uncommitted changes.

---

## 8. Validation plan

### After Phase 1
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes (or targeted `npx tsc --noEmit` on changed files)
- [ ] Homepage renders RetentionForm; form submits to `/api/lead`
- [ ] Markets page renders capture on each card; marketTag is persisted
- [ ] `/api/lead` response includes `persisted: true` and document contains `metadata.marketId`

### After Phase 2
- [ ] `/weekly-menu` page renders on `/weekly-menu?market=serenbe`
- [ ] Form submission records `source: weekly_menu_landing` and `metadata.marketId`
- [ ] No cart/checkout code loaded on the page
- [ ] Mobile layout is usable

### After Phase 3
- [ ] `/preorder?market=serenbe` skips market step and shows items
- [ ] `$60 minimum` banner visible in items step
- [ ] Adding items and reaching $60 enables checkout CTA
- [ ] Submit creates a record in MongoDB `marketorders`
- [ ] `/preorder/status?order=PRE-xxx` displays the order

### After Phase 4
- [ ] A test SMS/email can be sent from exported `lead_intents` with correct deep link
- [ ] Deep-link click counts appear in lightweight event log
- [ ] No duplicate sends to the same phone/email in the same week

### After Phase 5
- [ ] PDP opt-in form posts with `intent: product_restock_reminder`
- [ ] Post-order subscription prompt pre-fills phone and is optional
- [ ] Event log shows end-to-end funnel conversion

---

## 9. Smallest next PR Amp can implement safely

### Scope: "Weekly menu lead capture on homepage and markets page"

**Why this PR:** It is the highest-leverage, lowest-risk change. It uses components that already exist, adds no new dependencies, and does not touch the checkout path.

**Files changed:**
1. `components/RetentionForm.jsx`
   - Add `marketTag?: string`, `collectMarket?: boolean` props.
   - If `collectMarket`, render a select: "Which market? Serenbe / Dunwoody / Either".
   - Pass `metadata: { marketId: selectedMarket || marketTag }` in POST body.
2. `app/markets/page.tsx`
   - Import `RetentionForm`.
   - Add an inline capture card or expand each market card with a "Get menu reminder" CTA.
   - Pass `intent="weekly_menu_texts"`, `source={`markets_card_${market.id}`}`, `marketTag={market.id}`.
3. `app/page.js` or `components/home/HomePageClient.jsx`
   - Make the hero `#weekly-texts` block heading clearer.
   - Update RetentionForm description to: "We text the menu before each market. Reply STOP anytime."
4. `app/api/lead/route.ts`
   - Ensure `metadata` from body is merged into the persisted document.
5. `docs/preorder-funnel-plan.md`
   - Update status/checkbox for Phase 1.

**Validation for the PR:**
- `npm run lint`
- `npm run typecheck`
- Manual: submit homepage form, verify `lead_intents` document.
- Manual: submit markets card form, verify `metadata.marketId` equals selected market.

**Out of scope for this PR:**
- New pages (`/weekly-menu`).
- Changes to `/preorder` flow or checkout.
- Any SMS/email sending automation.
- Analytics beyond existing success/error states.

---

## Appendix: Quick reference for existing files

| File | Purpose | Funnel role |
|------|---------|-------------|
| `components/RetentionForm.jsx` | Lead capture form | Capture step |
| `app/api/lead/route.ts` | Persists leads | Capture backend |
| `app/page.js` / `HomePageClient.jsx` | Homepage | Top-of-funnel discovery + capture |
| `app/markets/page.tsx` | Markets info | Mid-funnel + capture + conversion link |
| `app/preorder/page.tsx` | Preorder flow | Bottom-of-funnel conversion |
| `app/api/preorder/route.ts` | Preorder persistence | Conversion backend |
| `app/preorder/status/page.tsx` | Order status | Fulfillment/status loop |
| `app/api/markets/route.ts` | Active market list | Supports selection/deep-linking |
| `app/api/storefront/catalog/route.ts` | Live product catalog | Item step inventory |
| `data/markets.ts` | Static market config | Canonical market data |
| `data/products.ts` | Curated product data | Supports catalog + preorder |
| `lib/preorder/rules.ts` | Cutoff / minimum rules | Business-rule enforcement |
