# TOG-PRE-ALIGNMENT-READINESS-REPORT.md

Taste of Gratitude — Pre-Alignment Readiness Report

Generated: 2026-07-29 19:37 EDT
Authority: Native Termux workspace

---

## Executive Verdict

**Pre-Alignment Readiness: NOT READY FOR ALIGNMENT**

The system authority is established and the codebase is mapped, but the project is currently **not deployable from HEAD** and has unresolved P0 blockers. Broad alignment changes must wait until the build/deploy path is stabilized and core customer journeys are verified.

---

## 1. Current System Condition

| Metric | Value |
|--------|-------|
| Total source files | ~746 |
| Total source lines | ~126,000 |
| Active public routes | ~60 |
| Active API routes | ~110 |
| Admin routes | ~30 |
| Verified working systems | Homepage, catalog fetch, Square order creation, payment health, owner alerts, Telegram/Resend, market visibility |
| Recent Vercel deployments | 30 ERROR / 20 READY |
| Production deployment | `dpl_5YfkFjmke2qxYa5tG2jgweaimDX2` at commit `f57c6527` (READY) |

## 2. Mission Alignment Summary

### Systems that directly support the mission (keep)
- Homepage + weekly menu section
- Catalog + product detail
- Cart + checkout + Square payment
- Market pickup (Serenbe, Dunwoody)
- Owner alerts (Telegram + Resend)
- Order creation and lookup
- Contact form
- Admin order/product/inventory management

### Systems that support the mission but need repair
- Weekly menu date logic (stale DB menu + uncommitted fix)
- Customer auth/account/profile (partial/broken)
- Admin product update whitelist
- Inventory adjustment atomicity
- Admin password hash mismatch

### Systems that should be consolidated
- Cart systems (`cart-engine`, `unified-cart`, `cartUtils`, `actions/cart`)
- Email systems (`email/service.js`, `resend-email.js`, `email-templates.js`)
- Rewards/gratitude systems
- Admin auth systems
- Search/SEO/market/menu legacy flat files

### Systems that should be archived
- SMS/Twilio
- Public reviews
- Public subscriptions/Gratitude Box
- Stripe placeholders
- Legacy flat modules
- ShipEngine/EasyPost shipping (pending owner decision)
- Wholesale portal (pending owner decision)
- OpenAI newsletter (pending owner decision)

## 3. P0 Blockers

1. **Vercel builds failing** — cannot deploy alignment changes safely.
2. **Dirty working tree with package-lock drift** — nondeterministic builds.
3. **Uncommitted audit/debug/sanitization artifacts** — risk of secret leak and deploy noise.
4. **Customer auth broken/partial** — returning-customer journey blocked.

## 4. P1 Blockers

1. Weekly menu date mismatch.
2. Customer account/profile pages partial.
3. Admin product update lacks input whitelist.
4. Inventory adjustment not atomic.
5. Admin password hash mismatch.

## 5. Owner Decisions Required

1. **Shipping** — Should national/local shipping remain a public option? If not, archive ShipEngine/EasyPost.
2. **Wholesale** — Is there active wholesale demand? If not, convert to simple contact form or archive.
3. **Rewards/loyalty** — Is a rewards program operationally sustainable now? If not, archive.
4. **OpenAI newsletter** — Is AI-generated content used and valuable? If not, disable.
5. **Analytics providers** — Which provider does the owner actually use? (PostHog, GA, Sentry)
6. **Cache backend** — Redis or Upstash?

## 6. Pre-Alignment Readiness Gate

| Gate | Status |
|------|--------|
| Canonical repository | ✅ Established |
| Production commit | ✅ Established (`f57c6527`) |
| Active database | ✅ MongoDB (with stale menu caveat) |
| Active Square environment | ✅ Production |
| Active Resend environment | ✅ Verified |
| Product authority | ✅ Square runtime |
| Pricing authority | ✅ Square runtime |
| Order authority | ✅ MongoDB + Square |
| Active fulfillment systems | ✅ Market pickup; delivery unverified |
| Active communication systems | ✅ Telegram + Resend |
| Systems to keep | ✅ Identified |
| Systems to repair | ✅ Identified |
| Systems to consolidate | ✅ Identified |
| Systems to disable/archive | ✅ Identified |
| Systems requiring owner decisions | ✅ Listed |
| Build/deploy path clear | ❌ Failing |
| Core customer journeys verified | ❌ Auth/account unverified |

## 7. Exact Next Action

**Fix the Vercel build failure for HEAD + uncommitted changes.**

Specifically:
1. Inspect the most recent failed deployment logs to identify the root cause.
2. Reconcile `package-lock.json`.
3. Commit or remove uncommitted verification artifacts.
4. Create a clean preview deployment.
5. Verify the preview deployment is READY before any further alignment work.

---

## 8. Deliverables Produced

1. `TOG-SYSTEM-AUTHORITY-MAP.md`
2. `TOG-BUSINESS-PURPOSE-SUMMARY.md`
3. `TOG-CODE-INVENTORY.md`
4. `TOG-ROUTE-MAP.md`
5. `TOG-API-INVENTORY.md`
6. `TOG-INFRASTRUCTURE-INVENTORY.md`
7. `TOG-PROVIDER-INVENTORY.md`
8. `TOG-ENV-VARIABLE-INVENTORY.md`
9. `TOG-WEBHOOK-AND-CRON-INVENTORY.md`
10. `TOG-CUSTOMER-JOURNEY-MAP.md`
11. `TOG-PUBLIC-PAGE-INVENTORY.md`
12. `TOG-PRODUCTION-DRIFT-LEDGER.md`
13. `TOG-FEATURE-FLAG-INVENTORY.md`
14. `TOG-SYSTEM-DEPENDENCY-MAP.md`
15. `TOG-SYSTEM-USAGE-REPORT.md`
16. `TOG-SYSTEM-COST-REPORT.md`
17. `TOG-DUPLICATION-AND-CONSOLIDATION-REPORT.md`
18. `TOG-SECURITY-AND-PRIVACY-SURFACE-REPORT.md`
19. `TOG-ARCHIVE-CANDIDATE-REPORT.md`
20. `TOG-REPAIR-CANDIDATE-REPORT.md`
21. `TOG-SYSTEM-RATIONALIZATION-ROADMAP.md`
22. `TOG-PRE-ALIGNMENT-READINESS-REPORT.md` (this file)

---

## 9. Limitations of This Audit

- Live `exec` and `web_fetch` became degraded during the audit, preventing fresh DOM inspection, database index queries, and Vercel build-log retrieval in the final phase.
- Two parallel subagents (`tog_infra_inventory`, `tog_journey_drift`) timed out due to the same runtime degradation.
- The infrastructure, provider, journey, and drift reports were therefore synthesized from the surviving code-inventory subagent, existing audit reports, and previously collected Vercel data.
- A follow-up pass should verify live production behavior once the runtime is stable.

---

*End of pre-alignment rationalization. Do not begin broad alignment changes until the P0 blockers are resolved.*
