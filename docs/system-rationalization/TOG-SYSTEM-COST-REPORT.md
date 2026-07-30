# TOG-SYSTEM-COST-REPORT.md

Taste of Gratitude — System Cost Report

Generated: 2026-07-29 19:25 EDT
Authority: Native Termux workspace
Status: Estimated; exact billing not accessible due to runtime degradation.

---

## 1. Direct Provider Costs

| Provider | Fixed Cost | Usage Cost | Est. Monthly | Notes |
|----------|------------|------------|--------------|-------|
| Vercel | Pro plan | Bandwidth, function execution, cron | $20–$50+ | Required for hosting |
| MongoDB Atlas | M0/M2/M10 | Storage, ops | $0–$50+ | Depends on tier |
| Square | None | ~2.9% + $0.30 per transaction | Variable | Revenue-scaled |
| Resend | Free tier | Per email above free tier | $0–$20 | Depends on volume |
| Telegram | Free | None | $0 | Owner alerts |
| Domain (tasteofgratitude.shop) | ~$10–$15/yr | None | ~$1/mo | Via registrar |

## 2. Referenced but Likely Unnecessary Costs

| Provider | Cost Risk | Recommendation |
|----------|-----------|----------------|
| OpenAI API | Usage-based tokens for AI newsletter | Disable if unused |
| PostHog | Paid at volume | Verify usage; disable if unused |
| Sentry | Paid at volume | Verify usage; keep if valuable |
| Upstash Redis | Paid tier | Verify usage; may be unnecessary |
| ShipEngine / EasyPost | Possible subscription + per-rate | Archive if shipping inactive |
| Stripe | None unless used | Archive placeholders |
| Twilio | None (removed) | Remove env vars |
| PagerDuty | Paid if used | Remove if unused |

## 3. Complexity / Maintenance Cost

| System | Files | Lines | Maintenance Burden |
|--------|-------|-------|---------------------|
| Total source | ~746 | ~126k | Very high |
| Admin panel | ~40 routes/pages | ~5k+ | High |
| Checkout/payments | ~30 files | ~4k+ | Critical |
| Rewards/gratitude | ~15 lib files | ~3k+ | High duplication |
| Marketing automation | ~10 files | ~2.5k+ | Medium |
| SEO/content | ~10 files | ~2k+ | Medium |
| Tests/scripts | ~40 files | ~5k+ | Medium |

## 4. Cost-Reduction Opportunities

1. Remove/archive inactive providers (Twilio, ShipEngine/EasyPost, Stripe, PagerDuty, Slack webhooks, OpenAI if unused).
2. Consolidate analytics to one provider (PostHog vs GA vs Sentry).
3. Consolidate cache to one backend (Redis vs Upstash).
4. Archive unused features (rewards, reviews, subscriptions, wholesale if no demand).
5. Reduce env-var sprawl to lower config confusion and deployment errors.

---

*Next: TOG-DUPLICATION-AND-CONSOLIDATION-REPORT.md*
