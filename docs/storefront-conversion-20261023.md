# Taste of Gratitude — shopping-first conversion increment

Date: 2026-10-23
Source: production main at `ecff81a4e60036081470ad496cf8058fde012f74`
Branch: `feat/storefront-conversion-20261023`
Scope: storefront messaging, bounded merchant-linked homepage selection, event lead qualification, validation.

## Customer problem and success condition

Customers should be able to find orderable products without wading through market schedules, see prices from approved catalog records instead of hard-coded weekly menu records, and request event bookings with enough context for useful follow-up.

The release does **not** activate delivery, shipping, Monday pickup, Square production credentials, or Turso. PR #58 and migration issue #49 remain separately gated.

## Implemented

- Shopping-first hero: primary link to the Georgia shop; secondary link to market preorders; three direct category-oriented exploration links without pretending a product filter exists.
- Featured product cards derive from the server storefront snapshot, require `checkoutReady === true`, a nonempty variation identifier, a valid positive price, and unsold/unblocked availability flags; curated/demo fallback does not produce purchasable homepage cards.
- Deduplicate product identities by checkout variation identifier; limit to six cards.
- Friendly empty state sends shoppers to the full catalog when no linked records can be confirmed.
- Event inquiry collects type, date, location, expected guests, optional setup details; sends those fields in the existing persisted lead-intent pipeline. The backend inserts separate event records even for one returning organizer, while normal newsletter deduplication remains unchanged.
- Authenticated admin event inquiry inbox at /admin/event-inquiries with server-side paginated and filtered retrieval, admin CSRF/RBAC-checked status transitions, privacy-safe no-store responses, and no assumed/automated notifications.
- Address validation rejects malformed ZIP codes before doing Georgia eligibility checking; no new shipping method is enabled.
- Shop-oriented OpenGraph and social metadata.

## Validation and controls

- Price-sensitive checkout and storefront tests remain intact.
- Targeted tests: homepage selection, approved prices, separate event persistence and failure, no silent success on storage failure.
- Full Vitest regression and TypeScript check on isolated branch.
- Production-style Next.js build and Vercel Preview verification should be recorded before release.
- No production payments, inventory mutations, or live lead form submissions as test fixtures.

## Further certification needed before production

- Verify Preview on mobile and desktop, including zero-price/no-variation data fallbacks and screen reader labels.
- Verify permitted fulfillment copy against actual merchant offerings before any activation.
- Verify real staff handling of qualified event inquiries and lead attribution on a staging/production-authorized admin account; automatic owner alerts, customer replies, and email delivery/CRM integrations are not claimed complete.
- Maintain production release HOLD for Turso and unapproved shipping/pickup per issue #49 and PR #58.

## Measuring business impact after an authorized launch

Monitor purchase conversion, add-to-cart rate, completed order count, average order value, repeat customer order rate, event inquiry-to-booking conversion, and contribution margin. Compare equivalent pre/post 14-day windows after ensuring consented analytics attribution and reliable payment reconciliation. No uplift is claimed without observed data.
