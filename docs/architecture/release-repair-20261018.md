# Release repair work — 18 October 2026

This change hardens the existing recovery branch. It does not authorize a Turso
production cutover. Production remains the Mongo release at `77109210dea55a6207213162ce8732052cf37b00`.

## Implemented corrections

- Curated menu copy no longer fabricates inventory quantities. Unknown stock
  remains unavailable. Known Blue Lotus and Strawberry price mismatches are
  blocked before charging, without silently rewriting the provider price.
- The unresolved Square identity `F2YVC7OVRYJU575JXROKFHFT` cannot become a payable
  product through curated enrichment or server cart pricing.
- Payable market resolution requires an exact active database identity. Empty
  or unavailable market data cannot fall back to configured example locations.
  Reading Browns Mill no longer silently changes its identity to Dunwoody.
- Missing email configuration and missing provider message IDs cannot report
  success. Acceptance is distinct from delivery. Staff routing must be explicit;
  the fulfillment type cannot invent a schedule or a 24-hour preparation promise.
- Public reviews were already retired at the route/API level. This change removes
  the remaining product-page form, fetches, ratings and false registration success
  message. It disables review campaigns and review thank-you sends. Historical
  administrator records are retained behind their existing authentication. Seven
  skipped workflow tests become seven active retirement regressions. This is an
  intentional release exclusion, not seven newly passing review workflows.
- Reverse-delta planning now rejects invalid timestamps, duplicate provider
  captures, ambiguous provider evidence and mismatched order references.
- Restore reporting cannot report PASS after integrity verification fails.

## Evidence boundaries

Local unit tests use actual source modules with isolated provider/data boundaries.
They are not evidence of live delivery, a database restore, or a production payment.
The existing Square Preview proof at run `39093320821` remains historical and
belongs to `dd70882677397645188cfcf3d54c9586ec01c195` only.

The read-only audit independently reconfirmed both QA messages as delivered to
the provider test recipient. It also found the sole Resend delivery webhook is
disabled and targets `https://tasteofgratitude.net/api/webhooks/resend`.
Real staff routing and production delivery-event ingestion remain uncertified.

## Release-blocking work remains

Complete order/admin/fulfillment Turso adapters, merchant-approved fulfillment
capacity and fees, actual provider catalog mutation and source lineage repair,
durable production notification reconciliation, real Mongo backup and restored
clone reverse-delta replay, both browser suites, and exact-commit protected
Preview and production certifications are required. No global database provider,
production credential, production catalog, webhook subscription or payment is
changed by this commit. The recovery PR remains draft.
