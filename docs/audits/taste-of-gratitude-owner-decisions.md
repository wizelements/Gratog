# Taste of Gratitude — Owner Decision Register

Generated: 2026-07-22

---

## How to use this file

This register collects business decisions that cannot be inferred from the repository or verified against live services. Each item states the question, the evidence behind it, the proposed safe default, and the owner answer field. I will not fabricate answers.

---

## D1 — Canonical price authority

**Status:** Resolved by safe default.

**Decision:** Use `data/products.ts` as the temporary canonical authority for customer-facing product names, stable slugs, descriptions, and published storefront prices. Square remains the payment processor; prices are passed as ad-hoc line-item base prices until the Square catalog is cleaned.

**Owner answer:** Adopted safe default — `data/products.ts` is canonical until Square catalog is reconciled.

---

## D2 — Square catalog cleanup

**Status:** Resolved by safe default.

**Decision:** The site no longer relies on Square catalog for customer-facing metadata. Unnamed/$0 Square records are rejected by the storefront serializer and are not shown as purchasable. Owner may clean Square catalog later; the application will accept valid mapped records when they appear.

**Owner answer:** Adopted safe default — Square catalog is not the customer-facing authority until cleaned.

---

## D3 — Product slug ↔ Square ID mapping

**Status:** Resolved by safe default.

**Decision:** Until owner provides Square IDs, checkout uses curated product prices and names. A mapping table can be added to `data/products.ts` when Square IDs are available.

**Owner answer:** Adopted safe default — mapping table deferred until Square catalog is cleaned.

---

## D4 — Weekly menu workflow

**Question:** Should the weekly menu be editable in admin without a code deploy?

**Evidence:**
- `data/weeklyMenu.ts` computes week range from current date and filters `data/products.ts` by `activeWeeklyMenu: true`.
- Admin has `/admin/menus` pages but their relationship to `data/weeklyMenu.ts` is unclear.

**Proposed safe default:** For Phase 1, keep hardcoded weekly menu but remove stale/inactive items and clearly label the week. Phase 2: wire `/admin/menus` to a database-driven menu collection.

**Owner answer:** __________________________________________________

---

## D5 — Active markets and hours

**Question:** Are Serenbe (Saturday 9am–1pm) and Dunwoody (Sunday 12pm–4pm) the only currently active markets?

**Evidence:**
- `data/markets.ts` lists these two as `isActive: true`.
- FAQ mentions both.

**Proposed safe default:** Keep both; verify with owner that hours/seasonal closures are current.

**Owner answer:** __________________________________________________

---

## D6 — Delivery and shipping scope

**Question:** Which ZIP codes are eligible for local delivery, and is nationwide USPS shipping with ice packs actually operational?

**Evidence:**
- FAQ states delivery $12–$18 to select ZIP codes.
- `lib/delivery-zones.ts` defines zones.
- Shipping is advertised as $8.99 / free over $50.

**Risk:** Advertising shipping/delivery that cannot be fulfilled creates refund/chargeback exposure.

**Proposed safe default:** If operational scope is uncertain, temporarily restrict checkout to market pickup only and add a waitlist for delivery/shipping.

**Owner answer:** __________________________________________________

---

## D7 — SMS connection

**Question:** Should the site connect Twilio for real menu/pickup SMS, or should phone capture be rewritten as a truthful waitlist?

**Evidence:**
- `lib/sms.ts` requires `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` and skips sends if absent.
- `lib/sms-mock.js` is a no-op mock.
- Homepage/weekly-menu CTAs promise "menu texts" and "pickup updates."

**Proposed safe default:** Rewrite phone capture copy as a waitlist and add a visible note: "SMS reminders are coming soon." If owner wants live SMS, provide Twilio credentials and ensure STOP/unsubscribe compliance.

**Owner answer:** __________________________________________________

---

## D8 — Bundles and subscriptions

**Question:** Should bundle savings and subscription boxes be removed from public copy until real Square SKUs/recurring billing exist, or should Square SKUs be created now?

**Evidence:**
- `data/bundles.ts` uses `checkoutMode: 'square-compatible-placeholder'`.
- Bundle pages contain "Bundle pricing ready for Square setup" language.
- `/subscriptions/gratitude-box` creates a one-time payment link only.

**Proposed safe default:** Hide bundle savings and subscription promises from homepage/FAQ until implementation is live. Keep the page routes but replace with honest waitlist copy.

**Owner answer:** __________________________________________________

---

## D9 — Rewards, Spin & Win, challenges, workshops

**Question:** Are Gratitude Passport, Spin & Win, #SpicyBloomChallenge, and wellness workshops live, planned, or should they be removed from public FAQ?

**Evidence:**
- FAQ describes all of them.
- Some answers admit backend rules are "finalized" or that customers will hear "when rewards go live."
- API routes exist but are not verified as active.

**Proposed safe default:** Remove from FAQ. Re-add only when feature is operational and the owner has a documented process.

**Owner answer:** __________________________________________________

---

## D10 — High-risk product names

**Question:** Can "Grateful Defense" and "Healing Harmony Gel" be renamed to flavor-forward names?

**Evidence:**
- "Defense" implies immune/disease protection.
- "Healing" implies therapeutic benefit.

**Risk:** FDA/FTC scrutiny; unsupported health claims.

**Proposed safe default:** Rename to "Ginger Turmeric Sea Moss Shot" and "Turmeric Spice Sea Moss Gel" unless owner prefers other flavor-based names.

**Owner answer:** __________________________________________________

---

## D11 — Founder story health framing

**Question:** Is the founder comfortable revising the About page so it does not imply sea moss caused recovery from exhaustion/run-down state?

**Evidence:**
- `app/about/page.js` states "I started feeling better... That's how Taste of Gratitude was born."

**Proposed safe default:** Keep the emotional arc but reframe the health change as "I loved the routine of making it" rather than attributing feeling better to the product.

**Owner answer:** __________________________________________________

---

## D12 — Sourcing claims

**Question:** Can "wildcrafted" and "never pool-grown, never artificial" be substantiated with supplier documentation?

**Evidence:**
- `app/about/page.js` makes these sourcing claims prominently.

**Risk:** FTC greenwashing / false advertising if unsubstantiated.

**Proposed safe default:** If documentation is unavailable, soften to "sourced with a supplier we selected for quality" or add a footnote about verification.

**Owner answer:** __________________________________________________

---

## D13 — Real product photography

**Question:** Does the owner have real product/market/founder photos to replace Unsplash/editmysite placeholder images?

**Evidence:**
- About page uses Unsplash URL.
- Product images reference external editmysite URLs and some `/images/*` files.

**Proposed safe default:** Phase 1: remove/replace the most obviously stock/mismatched images. Phase 2: schedule real photography.

**Owner answer:** __________________________________________________

---

## D14 — Scope of this cleanup pass

**Question:** Should I proceed with the safe, reversible fixes that do not require owner decisions (BigInt fix, duplicate admin pages, noindex empty routes, roadmap copy removal, FAQ cleanup), or wait for all owner answers first?

**Proposed safe default:** Create an `audit/tog-full-content-commerce-cleanup` branch, apply the universally safe fixes first, and leave owner-decision items for the owner to answer before the final deploy.

**Owner answer:** __________________________________________________
