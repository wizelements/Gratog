# Taste of Gratitude — Georgia Fulfillment Review and Release Gates
2026-10-22. Status: preview branch only, NOT production certified.

## Decision
Offer local delivery, scheduled pickup (non-market), farmers market pickup, and in-state Georgia parcel shipping through one checkout. Outside delivery radius, show an optional Georgia shipping check; never auto-convert the order or assume that fresh juice/gel can be shipped. No automatic geographic promotion without product eligibility and live carriers.

## Local delivery
- Requires full Georgia address; ZIP alone cannot establish delivery serviceability.
- Current model uses 35-mile straight-line radius from ZIP 30331. Existing fees are mileage tiers, NOT actual road mile estimates; margins, driving routes and staffed windows must be verified.
- API errors from geocoding are not to be presented as outside delivery radius.
- When outside radius, delivery form offers shipping instead with preserved address, only if user selects it; shipping must pass own rules.
- Scheduling still uses legacy generic delivery window list. Admin-controlled delivery availability, cutoffs, driver capacity and route costs remain follow-up certification.

## Georgia shipping
- Default DENY across the catalog. Only merchant-approved ambient-stable products are eligible. No products are auto-approved.
- Admin reviews evidence and attests regulatory permissions, validated packaging and food safety separately at /admin/shipping-eligibility.
- Configure actual verified dispatch address via SHIPPING_ORIGIN_STREET, SHIPPING_ORIGIN_CITY, SHIPPING_ORIGIN_ZIP, state GA and country US. Requires ShipEngine or EasyPost production carrier account/API key (and appropriate carrier IDs); credentials remain in environment, not code.
- Shipping quote API re-prices each product against server catalog, rejects unapproved or market-only items, and quotes via an actual provider. Order creation verifies eligibility and obtains fresh carrier rates before Square payment. Rate outage is fail-closed.
- Existing hard-coded checkout and shipping-service flat rates were deliberately removed. Placeholder origin and fabricated tracking have been eliminated.
- Package weights are conservative placeholders, not validated real packed weights; price and service must be certified with physical packed dimensions. Shipping requires admin label workflow, tracking status, address normalization and customer notices verified in preview. Until then leave approval disabled.
- Refrigerated drinks, lemonades, fresh juices and sea moss gels must not be enabled without verified appropriate legal/food-safety cold-chain program.

## Non-market pickup
- Configure actual authorized address, customer arrival instructions, exact appointment start/end/cutoff and capacity through /admin/pickup-locations. New locations inactive by default.
- Customer sees only published, not expired appointments returned by /api/pickup-locations. If backend unavailable, do not invent an appointment.
- Market-only items cannot select non-market appointment; orders revalidate appointment server-side immediately before creation.
- Location/address/date/instructions are snapshotted from server-managed data into payable order and exposed to staff/admin.
- IMPORTANT concurrency gate: appointment capacity counting uses reads of orders, not an atomic hold transaction. Concurrent checkouts can overbook. Complete atomic reservation before publishing high-demand appointment windows. Admin can temporarily use a single manually supervised appointment and pause new slots as an operational stopgap, but this is not proof of concurrency safety.

## Market pickup
- Legacy market date generation produces upcoming Saturdays without checking whether markets actually operate. It must be replaced by the admin managed confirmed event calendar, with cancellations, vendor attendance, preparation cutoff and per-event capacity.
- Keep market preorder ordering distinct from ordinary scheduled pickup.

## Independent acceptance tests required before production
1. GA in-range delivery: full address, fee/window, payment, admin order and notifications; mobile and desktop.
2. GA out-of-radius: optional link to Georgia shipping, fresh product correctly rejected for parcel, no charge for ineligible order.
3. Eligible ambient product: documented admin approval, accurate physical pack weight, live carrier quote, verified Square total, paid order, actual label/tracking, alerts.
4. FL and contradictory GA ZIP/state: both API paths block.
5. New pickup hidden until admin publishes actual future time; editing/unpublishing closes customer option; order data and customer/admin confirmation consistent.
6. Full, expired, removed or simultaneous pickup requests never charge for unavailable slot; requires additional atomic reservation.
7. Market-only mixed cart forces market pickup and cannot be forged into appointment/shipping.
8. Authenticated admin control only; CSRF checks, invalid request rejection and order idempotency.
9. Square Sandbox paid/refunded signed webhooks, single inventory debit, durable notifications, Turso/Mongo read/write reconciliation, verified rollback, full Playwright mobile/desktop.
10. No production promote until every critical gate has evidence.

## Deployment policy
All implementation changes are isolated on a GitHub feature branch. Do not represent compilation or preview as operational production shipping. Current repository order/pickup config remains MongoDB-backed, which must be routed to Turso during approved database migration; do not perform unauthorized cutover. Keep production shipping off until proper carriers, food approvals and real packing operations are certified.
