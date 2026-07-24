# Taste of Gratitude — Fresh Batch Request System Verification

**Branch:** `feat/fresh-batch-request-system`  
**Stacked on:** `feat/content-seo-cleanup` (`8c378621`)  
**Last updated:** 2026-07-24  
**Status:** Phase 1 core implementation complete. Preview not yet generated. Branch not yet pushed.

---

## 1. Verification Summary

| Check | Command / Method | Environment | Result | Notes |
|---|---|---|---|---|
| Branch state | `git branch --show-current` + `git log --oneline` | Local PRoot | ✅ Clean `feat/fresh-batch-request-system`, 6 fresh commits on top of `8c378621` | |
| `git diff --check` | `git diff --check` | Local PRoot | ✅ Clean | No trailing whitespace or merge conflicts. |
| Decision-engine unit tests | `npx vitest run tests/unit/batch-decision-engine.test.ts` | Local PRoot | ✅ 20/20 passed | |
| Request-flow unit tests | `npx vitest run tests/fresh-batch/request-flow.test.ts` | Local PRoot | ✅ 18/18 passed | |
| Square reservation unit tests | `npx vitest run tests/fresh-batch/square-reservations.test.ts` | Local PRoot | ✅ 4/4 passed | |
| Lint | `npm run lint` | Local PRoot | ✅ exit 0 | Existing warnings only; no new warnings from fresh-batch files. |
| Type-check | `npx tsc --noEmit --skipLibCheck` | Local PRoot | ⚠️ Not run full | Full project `tsc` hangs in PRoot (known). Targeted files compile via Vitest and project build will be verified via Vercel preview. |
| Full build | Vercel preview | Not run yet | ⏳ Pending | Vercel preview to be generated after push. |
| API smoke tests | Manual + unit | Local PRoot | ⚠️ Not run | `/api/fresh-batch/requests` tested via unit mocks; full HTTP smoke test pending preview. |
| Resend email | Mocked in unit tests | Local PRoot | ✅ Template rendering tested | Real Resend send requires `RESEND_API_KEY` in preview/production. |
| Owner alert | Mocked via `lib/owner-alerts.ts` path | Local PRoot | ✅ Path wired | Real Telegram/Resend delivery requires env in target environment. |
| Accessibility | Manual component review | Local code review | ✅ Semantic labels, error announcements, focus indicators, reduced-motion support | No automated axe scan run yet. |
| Mobile responsive | Component review | Local code review | ✅ Mobile-first spacing, large tap targets | Visual verification pending preview. |
| Database migration | N/A | N/A | ✅ No destructive migration | New collections created lazily; optional index script documented. |
| Production deploy | N/A | N/A | ❌ Not authorized | User instruction: no production deploy, no automatic merge. |

---

## 2. Commits

| Hash | Subject |
|---|---|
| `139a0591` | `docs(batch): audit existing request and preorder architecture` |
| `76b3e1f8` | `docs(batch): model microbatch economics and owner inputs` |
| `145fe91e` | `feat(batch): add request data model, validation, pricing, and repository` |
| `6a9a4e4d` | `feat(batch): add configurable batch decision engine with tests` |
| `b1c001dd` | `feat(batch): add customer request flow, API, admin inbox, and email templates` |
| `661e20ef` | `feat(batch): replace homepage hero with photo-free request-led experience` |
| `fec61da5` | `feat(batch): add owner-confirmed Square reservation links and payment tests` |

---

## 3. Files Changed

### Docs / audits
- `docs/audits/taste-of-gratitude-fresh-batch-system-audit.md`
- `docs/audits/taste-of-gratitude-microbatch-economics.md`
- `docs/audits/taste-of-gratitude-fresh-batch-data-model.md`
- `docs/audits/taste-of-gratitude-fresh-batch-customer-flow.md`
- `docs/audits/taste-of-gratitude-fresh-batch-owner-decisions.md`
- `docs/audits/taste-of-gratitude-fresh-batch-verification.md`

### Library modules
- `lib/batches/types.ts`
- `lib/batches/validation.ts`
- `lib/batches/quantity-converter.ts`
- `lib/batches/pricing.ts`
- `lib/batches/batch-decision-engine.ts`
- `lib/batches/repository.ts`
- `lib/batches/email-templates.ts`
- `lib/batches/square-reservations.ts`
- `lib/rate-limit.ts` (added `rateLimitByIp`)

### Customer-facing routes
- `app/request-a-flavor/page.tsx`
- `app/request-a-flavor/RequestFlavorClient.tsx`
- `app/page.js` (metadata update)
- `components/home/HomePageClient.jsx` (photo-free request hero)

### Admin / API routes
- `app/api/fresh-batch/requests/route.ts`
- `app/api/admin/fresh-batch/requests/route.ts`
- `app/api/admin/fresh-batch/reservations/route.ts`
- `app/admin/fresh-batches/page.tsx`
- `app/admin/fresh-batches/planner/page.tsx`

### Tests
- `tests/unit/batch-decision-engine.test.ts`
- `tests/fresh-batch/request-flow.test.ts`
- `tests/fresh-batch/square-reservations.test.ts`

---

## 4. Functionality Verified by Tests

### Decision engine
- One-gallon market-safe request → owner review until approved.
- One-gallon non-market-safe request → dedicated microbatch with setup fee.
- Two-gallon non-market-safe request → dedicated microbatch.
- Three-gallon pooled demand → shared standard batch.
- Five-gallon fully reserved → shared standard batch.
- Market-safe flavor without upcoming market → collect demand.
- Weekly microbatch limit reached → collect demand.
- Ingredient unavailable → owner review.
- Category-specific pricing (lemonade, refresher).
- Process-loss and market-bottle calculations.

### Request form / validation
- Valid known-flavor request accepted.
- Missing email, invalid email, missing quantity, missing market rejected.
- Flavor profile and free-text flavor accepted when product absent.
- No flavor information rejected.
- SMS consent without phone rejected.
- Need-by date < 48h rejected.
- Health-claim language flagged.
- Volume conversions and pricing math.

### Square reservations
- Payment link created with server-side price.
- `$0` reservation rejected.
- Square API failures surfaced.
- No invalid catalog object IDs passed.
- Idempotency key tied to reservation ID.

---

## 5. Known Limitations

1. **Full TypeScript check not run locally.** Project `tsc` hangs in PRoot. Risk will be retired via Vercel preview build after push.
2. **Batch planner UI is a placeholder.** The admin request inbox works; the visual planner page is stubbed with construction notice. Reservation creation API exists for programmatic/admin use.
3. **Square payment link is ad-hoc.** Product data does not contain verified Square variation IDs, so links use ad-hoc line items with server-set prices. Catalog reconciliation is a future phase.
4. **Preview not generated yet.** Branch needs to be pushed to GitHub and a Vercel preview triggered.
5. **No automated accessibility scan.** Manual review completed; axe/lighthouse pending.
6. **No end-to-end email delivery test.** Resend is mocked in unit tests; live delivery depends on `RESEND_API_KEY`.

---

## 6. Owner Decisions Still Needed

The following must be answered before publishing microbatch fees or thresholds:

1. Actual ingredient cost per gallon by category.
2. Packaging cost per bottle/gallon.
3. Labor rate and batch time.
4. Desired minimum gross margin.
5. Cancellation/refund/store-credit policy.
6. Shelf-life window.
7. Request cutoff and production-day schedule.

Until then, the system uses documented safe defaults and routes one-gallon custom orders to `owner_review`.

---

## 7. Release Recommendation

**Ready for internal review and authenticated preview.**

Do **not** merge or deploy to production until:
- Vercel preview build succeeds.
- Visual inspection passes or honest blocker is recorded.
- Owner provides microbatch cost inputs or approves the conservative defaults.
- Batch planner UI is completed.
