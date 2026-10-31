# Taste of Gratitude — Dedicated Market QR Experience and Sellability Policy
**Decision date:** 2026-10-31
**Status:** Implementation plan; NOT proof of a deployed or payment-certified flow.
**Related work:** Unified NON-MARKET order request → Square Messages handoff; do not route the market QR journey through that non-market path.

## Business objective and definition of done
A person standing in front of the Taste of Gratitude booth can scan a printed QR code, load **that market's current menu** on a phone, learn ingredients/prices/allergens and what is actually available, and buy **only eligible products** through a guarded market flow. Prepared-to-order categories remain **informational only** on the digital experience. Do not imply a customer's menu scan or request is a paid/confirmed order.

Success requires: a scannable stable QR; market-specific schedule/identity; approved menu; explicit channel-based sellability; reconciled local inventory; safe pickup/payment; simple staff controls; end-to-end validation; and no exposure of prohibited checkout actions.

## Merchant-approved channel policy
| Product family | QR menu visibility | Market digital sellability | Other behavior |
|---|---|---|---|
| Bottled lemonades (current six approved flavors) | Yes | Yes, **only after** catalog, price, market stock and eligibility are verified | Distinguish on-hand stock from separately approved future-batch capacity |
| Bottled fresh juices/drinks (e.g., APG and Herbal Vibe when current) | Yes | Yes, **only with the same verification** | Do not classify all beverages as sellable just because Square contains them |
| Current approved sea moss gel/products (e.g., 16 oz Soursop Chai when current) | Yes | Yes, **only approved SKU/variation and verified inventory** | Do not auto-authorize unknown gel sizes/variations |
| Boba, milk teas, refreshers, shots, teas and warm drinks | Yes, when on this market's actual menu | **No digital Add / Reserve / Pay** | Informational: ingredients, allergens, sizes, prices if approved, and “Order at the booth” guidance |
| Hot food, empanadas, seasonal specialty items and anything not in the explicit sellable set | Yes, if current | **No digital Add / Reserve / Pay** | Informational unless merchant separately approves digital sellability |
| Archived, unknown, retired, out-of-menu items | No purchase CTA | **Never** | Hidden from sale; only explicit current-menu entries may be informative |

"Drinks" in the online-sellable group means the explicitly approved **bottled juice/drink** SKUs, **not** every prepared drink in the menu. This distinction is deliberate: no category name, Square item type, or old weekly record can itself authorize a sale.

## Exact customer journeys
### In-person market QR (new dedicated customer experience)
1. Each booth has one stable, market-specific QR, e.g. `/m/serenbe`, mapping to a validated canonical market identifier (other active markets get separate QRs). An active session determines the date, local time zone, market location, current menu and fulfillment window.
2. Landing header: **“You're at Taste of Gratitude — [Market]”**; today's hours/status, where to collect at the booth, and a prominent **See Today's Menu** action. Menu remains readable while checkout is disabled.
3. Two clearly named sections:
   - **Available to order online:** approved bottled lemonades, approved bottled juices and approved sea moss products, with verified market-stock badges and enabled Add actions **only** when backend certifies stock/capacity.
   - **Explore the booth menu:** boba, refreshers, shots, teas, warm drinks, food and other prepared items; prices/ingredients/allergens from the current market menu; information-only, **no online purchase controls**.
4. For eligible items: review itemized order, local market pickup, pickup timing, price, fees if any; make Square payment / confirmed market pickup only through the **separate market order gates** once stock and payment are certified. Otherwise show “Ask at booth” or an explicit **no-charge future market preorder request** where permitted, not an unsafe payment action.
5. After verified payment: receipt and pickup reference; staff sees same order once, with status transitions from paid → preparing → ready → collected. For counter payment use Square POS at the booth, and do not treat an unpaid cart as a paid order.
6. Low-friction secondary actions: directions, menu sharing and **optional** marketing opt-in; QR scanning must never require signup.

### NON-MARKET website requests (already separately authorized)
Normal site/cart → item and fulfillment review → save multi-item request → send transactional Resend acknowledgment → merchant conversation in Square Messages → after price/capacity/fulfillment approval send Square payment link. **No Twilio or Telnyx dependency.** Market preorders remain in the dedicated market pathway; do not replace market checkout with Square Messages.

## Findings from current repository inspection (2026-10-31)
- `app/market/page.tsx` is a general kiosk hub and links shoppers to generic `/weekly-menu`, `/preorder`, and product pages; it does not enforce an explicit market-only sellability matrix.
- `app/order/start/page.tsx` hardcodes market schedules; its statements are not guaranteed to agree with the canonical market source.
- `app/admin/qr-generator/page.tsx` hardcodes a Serenbe order URL and depends on a Google Chart QR endpoint. Generate QRs from the current canonical active-market set and a self-controlled stable URL instead.
- `app/order/menu/page.tsx` reads the entire Square-derived market catalog and currently uses `inv?.remaining ?? 999` as a fallback. **Critical fail-open risk:** unknown inventory can look like 999 sellable units. Must replace with unknown/unavailable and disabled purchase actions.
- `app/api/market/today/route.ts` maps broad Square items without the explicit category sellability policy or verified market-specific stock contract. Square inventory and owner-reported counts are still unreconciled; a successful HTTP response does not certify availability.
- `app/preorder/PreorderClientPage.tsx` is the existing separate market preorder experience; maintain isolation and its pickup/capacity rules until proven replacement.
- Prior market analysis identifies drift across schedule/config sources and incomplete admin-to-public sync (`docs/audits/TOG_MARKET_OPERATIONS_ANALYSIS.md`). Audit and reconcile **current** sources; historical market times may be outdated.

## Target contract (owner-managed)
- `MarketSession`: marketId, serviceDate, timezone (`America/New_York`), status (not-started/open/closed/cancelled), booth instructions, published menu version, preorder cutoff, fulfilment window; no user-provided market ID is trusted without server validation.
- `MarketMenuEntry`: canonical productId, approved variationId, approved unit price in cents, category, marketMenuVisible, digitalSellable (explicit allowlist), approved ingredients/allergens, availability label, max per-order qty, source/version and market-session assignment.
- `MarketInventory`: per market/date/variation total brought, reserved, committed/sold, adjustments, last sync and source; reconcile with the correct Square account/location. Unknown/stale/missing/negative inventory **disables digital purchase**.
- Prepared products can be menu-visible while digitalSellable remains false. No transformation from "menu visible" to "sellable" based on Square catalog flags.
- Market stock and future-batch preorder capacity are separate ledgers; reservation and payment use idempotent atomic admission and expire/rollback holds where appropriate.
- Price ledger is merchant authoritative: if item/variation/price mismatch, show information only and alert merchant; never trust the browser's cart price.
- All digital purchase requests re-check allowlist, approved prices, market session, stock/capacity, fulfillment, acknowledgments and payment state **server side**. Payment webhook must be signed/deduplicated.

## Implementation sequence ranked by customer and revenue impact
1. **P0 — Safety/data truth (release gate).** Derive one canonical market schedule; reconcile location/variation-specific stock; add explicit `marketMenuVisible` and `marketDigitalSellable` allowlist; eliminate the `??999` fallback; remove non-eligible Add/Pay controls **and** reject those items server-side.
2. **P1 — Customer QR page.** Build the mobile-first `/m/[market]` page with active session context, two clearly separated sections, ingredients/allergens, live/unknown status, minimal navigation and no image-heavy dependency. Default to informational when there is no published market session.
3. **P2 — Separate market purchase gate.** Reuse or harden existing `/preorder` / market order APIs without mixing non-market Square Messages. Ensure in-person stock and reserved preorders do not double-sell; support Square POS at booth as the safe fallback.
4. **P3 — Staff operations and QR.** Admin can select market/date, publish menu, toggle "at booth" items, set count brought/sold out, and close session; produce one permanent branded/printable QR for each market. Staff can do all this without editing code.
5. **P4 — Certification and controlled rollout.** Run isolated HTTP/DB tests and Square sandbox payment/refund verification, manual scans on A16 + iPhone-size viewport + poor network, display/purchase gating tests, price/stock consistency, no duplicate submissions and failed webhook recovery. Release one market first; compare against POS sales and roll out remaining markets after success.

## Test acceptance criteria (must pass; no false READY)
- A QR always resolves to the correct market/date and an accessible mobile menu, including after market closes (clear "next market" state).
- Current approved bottled lemonades/juices/sea moss may be bought **only when all stock, price, market and fulfillment gates pass**.
- Boba, refreshers, shots, teas and other informational products **never** appear in online cart, Square payment requests, or market order API, even with a crafted request.
- Unknown, stale, negative or mismatched stock never becomes a fabricated quantity; concurrently placed orders cannot oversell.
- Outdated, retired, archived and unapproved products cannot be checked out.
- Market checkout remains independent of the non-market Square Messages handoff; market-specific cutoff and existing approved preorder behavior are preserved.
- Payments/receipts/fulfillment only advance after verified Square events. No unapproved live charges during testing.
- QR print validation, screen-reader labels, low-bandwidth loading, current ingredients/allergens, and admin publish/unpublish pass.
- Track scans → menu views → eligible add → verified paid purchases; monitor menu-info engagement, scan-to-sale rate, stock mismatch and unfulfilled orders. Track no inferred conversion without verified Square order matching.

## Gate to production
**HOLD** purchase-affecting market changes until P0 evidence, merchant approval of sellable SKUs/market menu, stock reconciliation, source-of-truth schedule and provider-level payment checks pass. Publishing a menu-only QR page is independently releasable after validation. Neither a successful CI run nor a QR scan means commerce is certified.
