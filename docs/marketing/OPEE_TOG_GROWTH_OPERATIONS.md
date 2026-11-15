# OPEE MAX — Taste of Gratitude Marketing Operations

**Canonical owner:** Taste of Gratitude / Jenneisha. **Implementation:** OPEE MAX, the existing Gratog repo, its VORAX checks, GitHub Actions, and independently verified production deployments. No third-party bot orchestrator is a required component.

## True success

**North star:** merchant-verified incremental **contribution profit from satisfied repeat buyers**. Do not mistake impressions, drafted content, activity, or site deployment for paid and profitable repeat demand.

When reliable finance and first/second-order evidence is available:
- Contribution profit = net paid revenue after discounts/refunds/tax exclusions, minus ingredients, packaging, payment fees, production/market/delivery labor, market expenses, spoilage and attributable campaign expense.
- First-to-second paid purchase over 30/60/90 day cohorts; handle walk-in customers without personal identifiers separately.
- Contribution profit per market hour, order success/fulfillment, returns/complaints, spoilage, opt-in quality, real customer satisfaction and operator workload.
- Unknown baseline, cost, attribution or receipt => **UNKNOWN**, not a model-generated guess.

## Active execution route

1. **Observe:** On GitHub Actions, `.github/workflows/tog-marketing-truth-watch.yml` runs daily at 12:00 UTC and on approved source changes. It only fetches public website pages.
2. **Prove:** `scripts/tog-marketing-live-readonly.mjs` checks the live Serenbe pickup feed, 9 a.m.–noon hours, First Sip QR content, $11.99 approved menu listing, allergy warning, no-checkout disclaimer and Ted's Gym founder story. Its JSON is a timestamped receipt. Public website passing is **not** payment or inventory certification.
3. **Evaluate:** `scripts/opee-tog-growth-operator.mjs` requires a fresh, signed-off *public check result* (freshness <=10 minutes, independently run by GitHub Actions; no cryptographic signature is claimed), prioritizes customer trust and margin before campaigns, records blockers, and prepares one truthful Serenbe organic draft only if public truth passes.
4. **Improve:** Review the bounded opportunity queue, correct real site inconsistencies on a reviewable GitHub PR, run negative checks, VORAX trust/psychology review as applicable, Vercel preview, independent PR CI, then stage and promote only with permission and live smoke receipts.
5. **Monetize:** After Square, inventory, fulfillment, expenses and genuine opted-in audience are independently certified, run small owner-approved experiments. Match paid incremental sales to attributable costs and compare to a holdout. Only expand repeatably profitable, low-burden programs.
6. **Compound:** Retain daily JSON and Markdown receipts (30-day GitHub artifact retention), version the decision rules and tests, and audit changes when the market schedule, pricing or product availability changes.

This is a real, self-contained daily **decision and evidence route**, not a claim that a separate AI agent is continuously running or has access to customer records.

## Active brand/offer facts and uncertainty

- Active market: Serenbe, Saturdays 9 a.m.–noon, subject to the latest live public schedule.
- Core menu: approved lemonade listings priced at $11.99 per 16 oz in existing merchant ledger. **A rendered website price is not independent confirmation of today's Square inventory or actual merchant payment.**
- Four- and six-pack bundles are lemonade-only, with no duplicate flavors; do not quote unverified bundle discounts or quantities.
- The Ted's Gym origin is part of Jenneisha's existing full founder story; preserve it without inventing quotes.
- The brand should not claim to be strictly vegan, and do not introduce unsupported health, medical, scarcity or social-proof claims.
- The market QR menu is information-only; staff confirm actual stock/allergens and accept in-person purchases. No Square purchases or online holds are enabled by this operator.

## Zero-send controls

The daily runner's GitHub token has **contents: read**. It never collects email, phone numbers, customer names, payment details or secrets. It cannot send texts/emails, publish social posts, spend advertising money, change prices, reserve inventory, merge PRs or deploy production.

Marketing email stays **BLOCKED** until:
- Explicit purpose-specific marketing consent is proven for recipients; no legacy transactional list harvesting.
- A working canonical opt-out/suppression ledger and an independent negative opt-out test across **every** sender path are proven.
- Resend's disabled event webhook is restored only after valid signing-key and bounce/complaint handling is confirmed in the intended environment.
- Delivery success, bounces, and complaints have real signed service receipts.
- Turso is the preferred durable target; do not start another Mongo deployment or assume historical Mongo records are consent.
- Merchant authorizes the actual audience, copy, cadence and send.

Existing VORAX `psycho-marketer.js` and `trust-guardian.js` are advisory static review components, not autonomous send/price-update authority. Never override source-of-truth pricing or regulatory compliance based on a score.

## Artifacts and safe commands

```sh
node --test tests/release/tog-marketing-live-readonly.test.mjs tests/release/opee-tog-growth-operator.test.mjs
node scripts/tog-marketing-live-readonly.mjs
node scripts/opee-tog-growth-operator.mjs --audit-file test-results/marketing-live-readonly.json
```

Artifacts from a completed workflow:
- `test-results/marketing-live-readonly.json`
- `test-results/opee-tog-growth-brief.json`
- `test-results/opee-tog-growth-brief.md`

A passing run proves that public GET checks and a fail-closed, non-sending marketing brief functioned **in that environment at that time**. It does not prove company revenue or fully functioning OPEE device dispatch. Escalate unverified dependency/permission failures instead of faking a complete state.

## Next measurable pilot

At the next confirmed Serenbe market, ask staff to optionally show First Sip to interested visitors and manually tally **anonymous counts** for conversations, tastings, and resulting purchases, without tying those to identifiable customers. Compare a similar market session, record product availability and labor costs, and only then decide whether the QR script is worth extending. No paid ads or incentives are necessary for this pilot.
