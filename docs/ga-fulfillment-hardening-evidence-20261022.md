# Georgia Fulfillment Hardening — Evidence & Release Disposition
Date: 2026-10-22 America/New_York
Worktree: feat/fulfillment-atomic-hardening-20261022 (derived from PR 58 at 1caa977dc98ae549ee7e7c892dba695049272699)
Production baseline inspected: main ecff81a4e60036081470ad496cf8058fde012f74; Vercel dpl_CdY7JRp9iAxZGiRgJZ5nE8mNfMNy.
Release: HOLD. No customer-facing activation authorized by this change.

## Engineering changes
- Appointment admission now executes transactionally inside createOrderAtomic, by writing the existing location document before counting reservations and inserting the order in the same transaction. Competing final-seat writes must conflict/retry. No new Mongo collection is added.
- Unpaid reservation lease is 30 minutes; payment initiation is blocked after 25 minutes, and unreconciled payment_processing orders conservatively retain capacity. A failed payment, cancellation or refund must transition the order correctly to free capacity.
- Public nonmarket locations require separate addressVerified, staffingConfirmed and isActive flags. Legacy published records without these new attestations fail closed.
- Payment-time server check rejects expired/unpublished/changed nonmarket appointments.
- Duplicate order-creation requests sharing an idempotency key use a stable unique primary key, with payload fingerprint validation on duplicate retry.
- Carrier quote requires operational approval and verified origin feature gates, approved ambient product compliance record, and verified physical single-item parcel dimensions. No silent flat fee.
- Synthetic shipment/tracking responses eliminated; carrier error does not mark shipped.
- Shipping eligibility admin records approval authority, evidence reference, effective time, revocation, physical pack dimensions and owner session.

## Known limitations — release gates
- Fulfillment persistence is currently tied to the existing MongoDB orders transaction. Turso cutover must migrate the authoritative order/reservation transaction before fulfillment activation. Never dual write silently.
- No independently observed live Mongo DB last-seat concurrency proof yet; isolated unit tests do not replace it.
- No independently observed Square Sandbox complete method-specific payment/decline/refund/duplicate webhook and inventory scenario suite against this branch.
- No verified staffed pickup address and real future operating windows. Manual human address approval, appointment schedule and staffing evidence required.
- Local delivery still relies on existing distance/radius and general scheduling; not certified for driver capacity, route cost, blackout management or pickup-style inventory admission.
- Market calendar relies on legacy generated dates rather than confirmed event attendance and capacity.
- No verified carrier origin, credentials, label integration and actual packed shipment QA. EasyPost label workflow has not been independently certified.
- No verified catalog SKU cleared for Georgia parcel shipping; default deny is intentional.
- No production DB snapshot/restore, Turso cutover, signed webhooks, recovery, notification outbox or mobile/browser UAT performed by this hardening branch.

## Food-safety disposition
- Georgia Department of Agriculture Cottage Food FAQ explicitly excludes beverages from cottage-food production, and cottage-food rules apply only to qualifying non-potentially-hazardous goods. Cottage-food eligibility is not a general shipping license for juice, tea or lemonade.
  https://agr.georgia.gov/cottage-food-faq
- Georgia Department of Agriculture cottage-food legislation effective July 1 2025 removed the cottage-food license requirement for qualifying foods but did not approve beverages or exempt regulated operations from food-safety duties.
  https://www.agr.georgia.gov/cottage-food
- FDA juice HACCP and transport requirements vary by manufacturing process, product, facility and temperature control. No untested freshness, shelf-stability or carrier safety assumptions are authorized.
  https://www.fda.gov/media/106711/download
- Sea moss gels and other potentially temperature-controlled foods remain unapproved until qualified regulatory determination, packaging and temperature validation, and SKU-specific evidence exist.

## Completion Law — claim / evidence / result / remaining risk
G0 Scope and authorization / user brief and repository access / VERIFIED / external business decisions excluded.
G1 Repository and deployment truth / GitHub PR #58 and Vercel production+preview IDs / VERIFIED / runtime integration not proven.
G2 Backup and rollback / no fresh recoverable snapshot proof / NOT TESTED / production changes prohibited.
G3 Root causes / non-atomic capacity, mock label fallback, missing physical dimensions discovered in source / VERIFIED / other defects may remain.
G4 Required implementation / listed hardening code and targeted tests / BLOCKED / Turso, delivery capacity, market calendar, admin lifecycle incomplete.
G5 Square/database/admin integrations / no new live payment execution / NOT TESTED / cannot activate.
G6 Failure recovery / guards implemented, no real interruption replay / NOT TESTED / needs end-to-end verification.
G7 Security/compliance / default-deny and source guards; no final legal review / BLOCKED / SKU decisions pending.
G8 Restart persistence / no DB restart test / NOT TESTED / no proof.
G9 Regression / targeted tests and TypeScript + build logs local / VERIFIED for executed local tests only / not full suite.
G10 Real customer journey / production homepage and health HTTP 200 only / NOT TESTED / checkout path unproven.
G11 Evidence / current code/test/deployment refs in this document / PARTIAL / absence of signed DB/Square/browser evidence.
G12 Release decision / HOLD feature flags and retain production / VERIFIED decision / business activation pending.

## Promotion criteria
Only promote individual paths once G2, G4-G11 pass on the exact deployed SHA with signed independently reviewable evidence. Never take real money to test unapproved shipping.
Stage 1: staffed address + transactional last-slot proof + Sandbox payment and reconciliation. Stage 2: delivery capacity/route/margin. Stage 3: regulated goods/carrier/label/pack verification. Market event certification separate.

## Business instrumentation planned
Order method conversion, blocked-method abandonment, actual carrier+packaging delta, delivery route margin, slot utilization, reservation failure and refund rate, repeat purchase, operational fulfillment margin.
