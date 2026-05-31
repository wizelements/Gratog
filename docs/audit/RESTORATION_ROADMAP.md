# RESTORATION_ROADMAP — Gratog Platform

> Sequencing for fixing defects from [MASTER_DEFECT_LOG.md](file:///data/data/com.termux/files/home/Gratog-live/docs/audit/MASTER_DEFECT_LOG.md). User instruction: this is a **plan**, not authorization to start implementing. Awaiting explicit go.

## Priority bands

| Band | Definition |
|---|---|
| P0 | Revenue-blocking or security-critical. Ship in days. |
| P1 | Customer-blocking on secondary paths. Ship in weeks. |
| P2 | Admin-blocking. Ship as time allows. |
| P3 | Technical debt. Sprint-by-sprint. |
| P4 | Optimization / polish. Continuous. |

---

## P0 — Revenue & security (1-3 days)

### P0.1 — Stop price tampering (C3)
- **Effort:** S (3-4 h)
- **Risk:** Low — adds server-side rebuild; should not break legit flows.
- **Dependencies:** Square catalog read access.
- **Rollback:** revert single PR.
- **Validation:** unit test injecting altered prices; assert 400 or rebuild.

### P0.2 — Track transactional email delivery (C4)
- **Effort:** S (2-3 h)
- **Risk:** Low.
- **Action:** in `lib/resend-email.js`, INSERT into `email_sends` before/after `resend.emails.send`, capture `message_id`.
- **Rollback:** trivial.
- **Validation:** trigger order email, assert `email_sends` row; replay webhook against id.

### P0.3 — Move coupon `$inc` to payment-success path (H3)
- **Effort:** S (2 h).
- **Risk:** Medium — touches `lib/transactions.ts` + `/api/payments`.
- **Rollback:** revert.
- **Validation:** abandon checkout repeatedly, assert coupon usage unchanged.

### P0.4 — Replace self-fetch with direct call (H4)
- **Effort:** S (1 h).
- **Risk:** Low.
- **Validation:** confirm rewards awarded for an order on staging.

### P0.5 — Gate Square diagnostic endpoints (H5)
- **Effort:** S (1 h). Add admin middleware bypass list edit.
- **Rollback:** trivial.

### P0.6 — Restore `/api/unsubscribe` (H6 — legal)
- **Effort:** S (1-2 h).
- **Risk:** Low.

---

## P1 — Customer-blocking restoration (1-2 weeks)

### P1.1 — Auth: register / login / reset-password (H1)
- Routes: `/api/auth/register`, `/api/auth/login` (verify status), `/api/auth/reset-password`.
- **Effort:** M (1-2 d).
- **Risk:** Medium — security-sensitive.
- **Dependencies:** `lib/auth/jwt.*`, `bcryptjs`, email send.
- **Validation:** Playwright signup → login → reset → login.

### P1.2 — Reviews public (H9)
- Routes: `/api/reviews`, `/api/reviews/helpful`.
- **Effort:** S (4-6 h).
- **Validation:** submit + helpful flow E2E.

### P1.3 — Recommendations (H10)
- Route: `/api/recommendations`.
- **Effort:** M (1 d) — basic "frequently bought together" using `orders` aggregate.
- **Validation:** PDP recommends ≥ 3 items.

### P1.4 — Newsletter & nurture subscribe (M9)
- Routes: `/api/newsletter/subscribe`, `/api/nurture/subscribe`.
- **Effort:** S (3 h).
- **Validation:** signup → row in `email_subscribers` → confirmation email.

### P1.5 — Contact form (M10)
- Route: `/api/contact`.
- **Effort:** S (2 h).
- **Validation:** form → email to support inbox.

### P1.6 — Quiz APIs (M8)
- Routes: `/api/quiz/{submit,results,recommendations}`.
- **Effort:** M (1 d).
- **Validation:** complete quiz E2E, see results.

### P1.7 — Wishlist (M11)
- Route: `/api/user/favorites`.
- **Effort:** S (4 h).
- **Validation:** add/remove favorites; persist across sessions.

### P1.8 — Profile data (`/api/user/profile`, `/api/user/orders`, `/api/user/stats`, `/api/user/email-preferences`, `/api/user/challenge`)
- **Effort:** M (1 d).
- **Validation:** logged-in profile shows orders, rewards, prefs.

### P1.9 — Subscriptions plans list (M7)
- Route: `/api/subscriptions/plans`.
- **Effort:** S (3 h).

### P1.10 — Public coupons (`/api/coupons/{create,validate}`)
- **Effort:** S (4 h).
- **Validation:** apply coupon at checkout end-to-end.

---

## P2 — Admin-blocking (1-2 weeks)

### P2.1 — Admin orders sync + bulk status (H7)
### P2.2 — Notifications admin subsystem (H8) — 5 routes
### P2.3 — Admin password reset (H2)
### P2.4 — Admin inventory list (M6)
### P2.5 — Campaigns generate + test send (`/api/admin/campaigns/{generate,test}`)
### P2.6 — Waitlist (`/api/waitlist`) + admin
### P2.7 — Queue admin (`/api/queue/{active,update,position}`)
### P2.8 — Returns list (`/api/returns`)
### P2.9 — Customers (`/api/customers`) public lookup if intended

**Combined effort:** ~5-7 d.

---

## P3 — Technical debt (continuous)

| Item | Effort |
|---|---|
| Distinct secrets per token purpose (M3) | M |
| Single-use order access token (M4) | S |
| Global error toast (M5) | S |
| Deduplicate `audit_log` / `audit_logs` (M14) | S |
| Stable customer surrogate id (M15) | M |
| SW version CI guard (M13) | S |
| Consolidate Resend modules (M2) | M |
| Decommission parallel checkout (M1) | M |
| Rate-limit coverage audit (M17) | S |
| Abandoned-cart cron (M12) | S |
| QA repo parity (M19) | M |
| Drop `@sendgrid/mail` (L1) | XS |
| Hide `/test-auth`, `/diagnostic`, `/order-v2`, `/pay` (L4) | XS |
| Mixed JS/TS migration (L2) | L (sprint by sprint) |
| Template theme module (L3) | S |
| BG music opt-in (M18) | S |

---

## P4 — Optimization

- Apple Pay / Google Pay via Square SDK.
- Cross-device cart (server-side `carts` collection keyed by session).
- A/B test admin.
- Faceted search.
- Loyalty leaderboard (`/api/rewards/leaderboard`).
- Passport scan/stamp (`/api/rewards/passport/scan`, `/api/rewards/stamp`).
- Real Playwright E2E in CI with Square sandbox.
- Route-presence CI guard (`_api-refs.txt` ↔ `_routes-existing.txt`).

---

## Cross-cutting validation plan

1. **Pre-merge:**
   - `npm run typecheck`
   - `npm test`
   - `node scripts/check-route-coverage.js` (to be added)
2. **Per-PR for restored routes:**
   - Unit test the route handler.
   - Add to Playwright E2E suite for the related journey.
3. **Pre-deploy:**
   - Diff `_routes-existing.txt` and `_api-refs.txt` to confirm no new gaps.
4. **Post-deploy smoke:**
   - Hit `/api/health`, `/api/health/payments`, walk one full guest checkout with Square sandbox card.
5. **Rollback:**
   - Revert single PR via Vercel previous deploy; database changes (if any) use additive migrations only.

---

## Estimated total effort to "no broken paths" (P0+P1+P2)

| Band | Effort |
|---|---|
| P0 | 1-3 d |
| P1 | 5-10 d |
| P2 | 5-7 d |
| **Total** | **~3-4 weeks** of focused work for one senior engineer |

P3 / P4 are ongoing.
