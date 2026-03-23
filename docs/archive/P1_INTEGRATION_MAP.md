# P1 Integration Map: GRATOG_P1_CODE → Gratog Live Repo

**Generated:** 2026-03-04
**Repo:** git@github.com:wizelements/Gratog.git (branch: `main`)
**Stack:** Next.js App Router + React + Vitest + Square SDK + SendGrid + MongoDB

---

## 1. File Mapping (P1 → Live)

| P1 File | Live Repo Equivalent | Status |
|---|---|---|
| `api/subscriptions.js` | **DOES NOT EXIST** — no subscription API routes in `app/api/` | 🔴 Must create |
| `api/emails.js` | `lib/email.js` (SendGrid) + `lib/email-templates.js` + `lib/resend-email.js` | 🟡 Merge subscription templates |
| `components/CatalogFilter.jsx` | `components/HealthBenefitFilters.jsx` + `app/catalog/page.js` | 🟡 Enhance existing |
| `components/ProductReviews.jsx` | `components/ProductReviews.jsx` (already live, different impl) | 🟡 Enhance with P1 features |
| `lib/schema.js` | `seo/schemas.js` (already live, simpler) | 🟡 Extend with subscription schema |
| `tests/subscriptions.test.js` | `tests/unit/` (vitest, no subscription tests) | 🔴 Must create |

---

## 2. Key Architecture Differences

### P1 Assumptions vs Live Reality

| Aspect | P1 Package | Live Repo |
|---|---|---|
| **Router** | Express `router.post()` | Next.js App Router `route.js` |
| **Email provider** | Mailchimp/Mandrill | SendGrid (primary) + Resend (fallback) |
| **Square SDK** | `square` npm (old `Client` API) | `square` npm (`SquareClient` new API via `lib/square.ts`) |
| **Test framework** | Jest | Vitest |
| **DB access** | Mongoose models | `lib/db-client.js` / `lib/database.ts` (MongoDB via native client) |
| **Components** | Standalone React | `'use client'` + shadcn/ui + sonner |
| **Schema injection** | Custom `SchemaScript` component | `seo/schemas.js` + `injectSchema()` |

---

## 3. Integration Plan (Priority Order)

### Phase A: Subscription API Routes (Critical Path)

Create Next.js App Router API routes under `app/api/subscriptions/`:

```
app/api/subscriptions/
├── create/route.js          # POST - create subscription
├── [id]/skip/route.js       # POST - skip next shipment
├── [id]/pause/route.js      # POST - pause subscription
├── [id]/cancel/route.js     # POST - cancel subscription
├── [id]/update-payment/route.js  # POST - update card
├── [id]/billing-history/route.js # GET - billing history (NEW, P1 gap)
└── webhook/route.js         # POST - Square subscription webhooks
```

Key adaptations:
- Use `getSquareClient()` from `lib/square.ts` (not direct `Client` instantiation)
- Use Next.js `NextResponse` pattern (not Express `res.json`)
- Replace Mongoose with existing `lib/db-client.js` patterns
- Use `lib/email.js` `sendEmail()` for lifecycle emails
- Replace `setTimeout` retry with durable scheduling (cron via `app/api/cron/`)

### Phase B: Subscription Email Templates

Add to `lib/email-templates.js`:
- `subscriptionWelcomeTemplate(subscription)`
- `preRenewalReminderTemplate(subscription)`
- `paymentFailedRetryTemplate(subscription, attemptNumber)`
- `paymentFailedFinalTemplate(subscription)`
- `subscriptionCanceledTemplate(subscription)`
- `subscriptionSkippedTemplate(subscription)`
- `subscriptionPausedTemplate(subscription)`
- `winbackSpecialOfferTemplate(subscription)`

### Phase C: Catalog Filter Enhancement

The live catalog (`app/catalog/page.js`) already has:
- ✅ Health benefit filtering via `HealthBenefitFilters.jsx`
- ✅ Category selection
- ✅ Search
- ✅ Quiz integration

P1 enhancements to merge:
- 🔴 Active filter badges with remove buttons
- 🔴 "Clear All" button
- 🔴 Mobile bottom sheet filter UX
- 🔴 Results counter with low-result warnings
- 🔴 Collapsible "more benefits" section

### Phase D: Product Reviews Enhancement

The live `ProductReviews.jsx` already has:
- ✅ Review submission form with rewards integration
- ✅ Star rating display
- ✅ Verified badge
- ✅ Loading/empty states

P1 enhancements to merge:
- 🔴 Rating breakdown bars (5★/4★/3★/2★/1★ distribution)
- 🔴 "Top Reviews" section with expandable "View All"
- 🔴 Helpful/Not Helpful voting
- 🔴 Compact mode for product cards
- 🔴 `RatingBadge` export for use in product cards

### Phase E: SEO Schema Extension

The live `seo/schemas.js` already has:
- ✅ Organization, LocalBusiness, Product, Breadcrumb, FAQ, Article, HowTo

P1 additions:
- 🔴 `SubscriptionSchema()` — subscription plan structured data
- 🔴 `AggregateRatingSchema()` — standalone aggregate rating
- 🔴 `validateSchema()` — validation helper
- 🔴 Dynamic review data in `ProductSchema()` (currently hardcoded 4.8/124)

### Phase F: Tests

Port `subscriptions.test.js` to Vitest format at `tests/unit/subscriptions.spec.ts`:
- Subscription tier validation
- Payment retry schedule
- Payload validation
- Email template rendering
- Schema validation

---

## 4. Production-Readiness Gaps (Unchanged from Prior Analysis)

| Gap | Impact | Fix |
|---|---|---|
| No subscription API routes exist | Subscription lifecycle is 100% absent | Phase A |
| `setTimeout` for retry/winback | Lost on restart | Cron-based (`app/api/cron/`) |
| No billing history endpoint | Customer portal incomplete | Phase A |
| Hardcoded review ratings in schema | SEO won't reflect real reviews | Phase E |
| No subscription KPI tracking | MRR/churn unmeasured | Add to `lib/analytics.js` |

---

## 5. Validation Strategy

1. **Local**: `npm run test:unit` after adding subscription tests
2. **Build**: `npm run build` to verify no compilation errors
3. **Staging**: Deploy feature branch to Vercel preview
4. **Integration**: Test Square sandbox subscription lifecycle end-to-end
5. **Production**: Gradual rollout behind feature flag
