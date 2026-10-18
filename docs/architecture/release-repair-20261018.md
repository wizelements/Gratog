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

## Additional candidate repairs after 941c904

These changes require their own exact-commit CI and deployed certification.

- Order lookup and status reads use an exclusive Turso read model in the
  isolated Preview. Missing/corrupt orders cannot fall back to Mongo or claim a
  payment/refund absent matching ledger evidence. The read model supports the
  currently admitted pickup totals; other fee structures fail closed.
- Guest status reads require a signed order link or an authenticated owner or
  operator. Tokens are scoped to environment, project and Preview deployment.
  Legacy unscoped guest links are rejected; production release requires a
  recovery/reissue plan for existing links. Customer JWT and legacy admin token
  environment isolation remain separate release requirements.
- Administrator sessions revalidate active status and role against the database.
  Manual paid/refunded status edits and the manual paid control are removed.
  Unmigrated Turso fulfillment updates return 503.
- Labels redirect to canonical product discovery, with no independent Square
  payment link and no price from a curated fallback or unknown inventory.
- Private order search requires an active administrator and explicit market,
  escapes regular-expression syntax and never searches an empty phone pattern.
- The hardcoded Square physical-count replacement endpoint is retired. Unsafe
  refund initiation routes are temporarily unavailable and cannot mutate Square,
  inventory or orders. This safety block is **not completed refund support**.
  A durable, provider-reconciled request workflow remains mandatory. Existing
  signed refund reconciliation is retained.
- Shipping requires explicit operational configuration. Invented origin address,
  fallback rates, generated tracking numbers and simulated transit events are
  removed. Product/package/fee authority and carrier certification are required
  before enabling shipping.
- Migration 0013 adds immutable provider-message binding and durable per-recipient
  delivery evidence, with duplicate/out-of-order event handling. It is not yet
  applied remotely or wired to the Mongo-only Resend webhook. Tests are not
  evidence of customer/staff delivery.
- A clone-only Mongo reverse-delta executor and fixture workflow perform actual
  archive restoration and replay with injected failures. Synthetic source and
  provider records cannot certify production backup or rollback. Recovery holds
  block legacy notification senders without fabricating send timestamps.

Readbacks and all product dispositions are recorded in
`test-results/release-20261018/catalog-discrepancy-report.json` and its Markdown
companion: 83 identities compared, 46 with discrepancies or missing authority.
The report does not assert that production discrepancies were repaired by
read-only inspection. Catalog mutation and raw Mongo/Square reconciliation remain
outstanding.

Local native source/SQL/guard regressions: 98 passed, 0 failed, 0 skipped.
Restore-report failure-injection unit tests: 4 passed. These counts exclude the
full application suite and do not certify actual source restoration, provider
transactions, production readiness or website checkout.
