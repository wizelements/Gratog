# TOG-ARCHIVE-CANDIDATE-REPORT.md

Taste of Gratitude — Archive Candidate Report

Generated: 2026-07-29 19:31 EDT
Authority: Native Termux workspace

---

## 1. Archive Candidate Matrix

| System | Reason | Dependency Risk | Data Retention | Archive Method | Restore Method |
|--------|--------|-----------------|----------------|----------------|----------------|
| SMS / Twilio integration | Provider removed; no-SMS remediation complete | Low — code references remain | Keep historical consent if any | Move `lib/sms*.js` and Twilio refs to `archive/sms/` | Re-enable Twilio env + restore files |
| Reviews system | Redirects to catalog; no public reviews | Low | Keep historical reviews if real | Move `app/reviews`, `app/api/admin/reviews`, `components/ProductReviews.jsx` to `archive/reviews/` | Restore when real review workflow ready |
| Rewards V1 / enhanced rewards | Duplicates gratitude system; redirects active | Medium — `lib/rewards-*` may be imported | Keep transaction history | Move `lib/enhanced-rewards.js`, `lib/rewards-audit-logger.js`, `lib/rewards-fraud-detection.js`, `lib/rewards-secure.js`, `lib/rewards-security.js` to `archive/rewards-v1/` | Consolidate with gratitude or restore |
| Subscriptions / Gratitude Box | Placeholder; Square primary; redirects active | Low | Keep any subscriber records | Move `app/subscriptions`, `app/api/subscriptions`, `lib/subscription-*` to `archive/subscriptions/` | Restore when subscription box ready |
| Stripe integration | Placeholder only; Square is payment authority | Low | None | Move Stripe env vars and `lib/stripe*` refs to `archive/stripe/` | Restore when subscription/bundle needs Stripe |
| ShipEngine / EasyPost shipping | Local business; shipping not core | Medium — checkout shipping tab uses it | Keep any shipping records | Move `lib/shipping-service.ts`, `app/api/shipping/rates` to `archive/shipping/` | Restore if national shipping approved |
| Wholesale portal | Demand unknown; may create unmonitored inquiries | Low | Keep inquiries | Move `app/wholesale` to `archive/wholesale/` | Restore when wholesale program ready |
| AI newsletter / OpenAI | Cost without proven usage | Low | Keep campaign drafts | Move `lib/ai-newsletter.js` to `archive/ai-newsletter/` | Restore when AI content proven useful |
| PagerDuty / Slack / generic monitoring webhooks | Unverified; adds env sprawl | Low | None | Remove env vars; archive code in `archive/monitoring-webhooks/` | Restore when monitoring strategy defined |
| Legacy pages router | `pages/api/menu.ts` untracked | Low | None | Move to `archive/legacy-pages-router/` | Unlikely needed |
| Legacy flat modules | `lib/markets.ts`, `lib/menus.ts`, `lib/seo.js`, `lib/email-templates.js`, `lib/search/enhanced-search.js` | Medium — check imports first | None | Move to `archive/legacy-lib/` after verifying no imports | Restore if missed import found |
| Deprecated 410 routes | `/api/checkout`, `/api/pay/process` | Low | None | Remove if no callers | Restore from git if needed |

## 2. Archive Strategy

1. **Do not delete anything yet.** This is discovery only.
2. For each candidate, first run static dependency analysis to confirm no active imports.
3. Preserve source in `archive/<system-name>/` with README.md and restoration-plan.md.
4. Disable public entry points via feature flags or redirects before removing code.
5. Verify core journeys still work after each archival change.
6. Deploy to preview and test before production.

## 3. High-Confidence Archive Candidates

- **SMS/Twilio** — no-SMS remediation is explicit.
- **Reviews public page** — redirects to catalog; incomplete feature.
- **Subscriptions public pages** — redirect to catalog.
- **Stripe placeholders** — Square is primary.
- **Legacy flat modules** — shadowed by directory-based modules.
- **Deprecated 410 routes** — already returning Gone.

## 4. Lower-Confidence / Owner-Decision Candidates

- **Shipping** — requires owner confirmation of operational capability.
- **Wholesale** — requires owner confirmation of demand.
- **OpenAI newsletter** — requires owner confirmation of value.
- **Rewards** — requires decision on whether to operate a loyalty program.

---

*Next: TOG-REPAIR-CANDIDATE-REPORT.md*
