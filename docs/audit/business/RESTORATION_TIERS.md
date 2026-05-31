# RESTORATION_TIERS

> Phase 9 deliverable. Only three groups. No emotional attachment.

## TIER 1 — MUST FIX BEFORE NEXT MEANINGFUL TRAFFIC

These items block sales, leak revenue, or create immediate legal/operational risk.

### Revenue safety inside the canonical funnel (4 files)
| # | Fix | File | Why |
|---|---|---|---|
| 1 | Server-side price rebuild | `app/api/orders/create/route.js` | Price tampering → could pay $0.01 |
| 2 | Remove pre-payment reward fire | `app/api/orders/create/route.js` | Reward double-award |
| 3 | Move coupon `$inc` + customer LTV `$inc` to payment-success | `lib/transactions.ts` + `app/api/payments/route.ts` | Coupon drain, LTV inflation |
| 4 | Align coupon field name (`order.appliedCoupon.code`) and pick single coupon schema | `app/api/payments/route.ts` | Coupon `isUsed` silently no-ops |

### Admin/security
| # | Fix | File | Why |
|---|---|---|---|
| 5 | Replace admin cookie literal-key with signed session | `middleware.ts` + `app/api/admin/auth/login/route.*` + new `lib/auth/admin-session.ts` | Cookie disclosure = total admin compromise |
| 6 | 404 / admin-gate Square diagnostic routes in prod | `app/api/{debug/square,square/diagnose,square/test-rest,square/validate-token,startup}/route.*` | Info disclosure |
| 7 | Confirm `CRON_SECRET` enforced on every `/api/cron/*` | cron routes | Unauthorized triggering |
| 8 | Hide `/test-auth`, `/diagnostic`, `/order-v2`, `/pay`, `/order/start`, `/order/menu`, `/order/checkout`, `/order/complete`, `/checkout/square`, `/checkout/success` | next.config / next-route handling | Confusion + drift |

### Email reliability + legal
| # | Fix | File | Why |
|---|---|---|---|
| 9 | Write `email_sends` row on every Resend send (transactional path) | `lib/resend-email.js` | Silent delivery failures |
| 10 | Restore `/api/unsubscribe` | new `app/api/unsubscribe/route.ts` | CAN-SPAM legal exposure |
| 11 | Restore `/api/contact` | new `app/api/contact/route.ts` | Every inquiry currently lost |

### Operational + observability
| # | Fix | File | Why |
|---|---|---|---|
| 12 | Add route-coverage CI guard with allowlist | new `scripts/check-route-coverage.js` + `package.json` | Prevent next `04768656` |
| 13 | Production smoke checklist (post-deploy) | new `docs/SMOKE.md` + Vercel deploy hook | Catch regressions before customers do |
| 14 | Drop unused `@sendgrid/mail` | `package.json` | Dead dep |

### Admin daily-ops
| # | Fix | File | Why |
|---|---|---|---|
| 15 | Restore `/api/admin/inventory` (list) | new route | Daily ops blocked |
| 16 | Restore `/api/admin/orders/update-status` | new route | Bulk fulfillment |
| 17 | Restore `/api/admin/orders/sync` | new route | Square reconciliation |
| 18 | Restore `/api/admin/auth/reset-password` | new route | Solo-operator lockout recovery |

**Tier 1 effort:** ~2-3 focused weeks, careful single-PR-at-a-time.  
**Tier 1 done = boringly reliable revenue platform.**

---

## TIER 2 — IMPORTANT BUT NOT BLOCKING

Improves conversion, trust, or retention. Restoration each ~half-day to 1 day.

| # | Fix | Restore |
|---|---|---|
| 1 | Newsletter signup | `/api/newsletter/subscribe` + `/api/nurture/subscribe` |
| 2 | Reviews (public submit + helpful) | `/api/reviews`, `/api/reviews/helpful` |
| 3 | Basic recommendations | `/api/recommendations` (start with category + bestseller heuristic) |
| 4 | Public coupon validation | `/api/coupons/validate` (and `/create` for admin-driven generation) |
| 5 | Abandoned-cart cron + email | `/api/cron/cleanup-abandoned-orders` + email template |
| 6 | Apple Pay / Google Pay via Square SDK | `components/checkout/Payment` |
| 7 | Hide unsupported UI surfaces | hide CTAs for: /profile, /login, /register, /wishlist, /quiz, /subscriptions, /reviews (until restored), `/api/admin/notifications/*` admin UI |

**Tier 2 effort:** ~1-2 weeks.  
**Tier 2 done = small-vendor commerce site with active conversion + retention loops.**

---

## TIER 3 — DEFER UNTIL BUSINESS GROWTH JUSTIFIES

These items have no immediate revenue, operational, or legal justification at current scale.

### Defer indefinitely (hide / remove CTAs)
- Customer accounts (`/api/auth/register`, `/api/auth/login`, `/api/auth/reset-password`, all `/api/user/*` routes, `/profile/*` pages, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/account/*`)
- Wishlist (`/api/user/favorites`, `/wishlist`)
- Quiz / recommendations subsystem (`/api/quiz/*`, `/quiz`)
- Subscriptions (`/api/subscriptions/plans`, `/subscriptions`, `/account/subscriptions`)
- Learning modules (`/api/learning/*`, `/explore/learn`)
- UGC submission (`/api/ugc/submit`, `/ugc/*`)
- Waitlist (`/api/waitlist`, `/admin/waitlist`)
- Notifications subsystem (all `/api/notifications/*` + `/api/admin/notifications/*`)
- Queue (unless markets actively use it — verify)
- AI campaign generate / test (`/api/admin/campaigns/{generate,test}`)
- Admin interactions tracking (`/api/admin/interactions`)
- Customer challenge (`/api/user/challenge*`)
- Returns list (`/api/returns`) — `/api/returns/create` exists if needed
- Passport scan/stamp (`/api/rewards/passport/scan`, `/api/rewards/stamp`) — restore if physical-market QR needed
- Tracking / transactions analytics (`/api/tracking/user`, `/api/transactions/{log,stats}`)

### Reason

Each of these requires:
- new code
- new tests
- new monitoring
- new failure-handling
- new docs

…for a feature the business doesn't currently use. Maintenance debt > value. Restore on demand when actual usage proves the need.

### Architectural / tech debt (P3-class)
- Distinct secrets per token purpose (`JWT_SECRET` reuse)
- Consolidate `lib/resend-email.js` + `lib/email/service.js` into one module
- Decommission parallel checkout (`/api/checkout`, `/api/create-checkout`, `/api/pay/process`)
- Stable customer surrogate id (move away from `email` as `_id`)
- SW version CI guard
- Mixed `.js`/`.tsx` page migration
- Centralize index manifest

### When to revisit
Trigger re-evaluation of TIER 3 items when:
- monthly active users >500 (consider customer accounts)
- email list >1,000 (consider nurture sequences)
- markets actively use queue (consider queue admin)
- newsletter open rates establish baseline (consider campaign AI generate)
- abandoned-cart recovery shows >$X/month potential (verify before building)

## Summary

```diagram
TIER 1 (must)     ▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌  ~2-3 weeks  →  boringly reliable
TIER 2 (should)   ▌▌▌▌▌▌▌▌▌▌▌         ~1-2 weeks  →  conversion + retention
TIER 3 (defer)    ▌                   skip        →  hide until proven
```

Anything not in TIER 1 or TIER 2 is hidden, removed, or deferred. The fastest path to a winning platform is **doing less**.
