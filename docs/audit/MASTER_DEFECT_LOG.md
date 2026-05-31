# MASTER_DEFECT_LOG — Gratog Platform

> Consolidated from all phase reports. Each defect cites an audit doc, code evidence, and a recommended (but NOT yet applied) fix.

## Legend
- 🔴 Critical — revenue-blocking, security, or data loss
- 🟠 High — significant user-visible breakage
- 🟡 Medium — degraded experience or moderate risk
- 🟢 Low — polish / tech debt

---

## 🔴 Critical

### C1 — 64 referenced API routes missing
- **Description:** Cleanup commit `04768656` deleted dozens of route files. Subsequent restoration covered ~9 (orders/create, by-ref, rewards/{add-points,passport}, queue/{join,position}, user/rewards, webhooks/resend, ics/market-route); 64 remain missing.
- **Impact:** Customer auth, contact, quiz, reviews, wishlist, newsletter, unsubscribe, profile, notifications admin, queue admin, waitlist admin, and more — all dead.
- **Affected:** see [_missing-routes.txt](file:///data/data/com.termux/files/home/Gratog-live/docs/audit/_missing-routes.txt).
- **Root cause:** historical cleanup commit + incomplete restoration.
- **Recommended fix:** restore routes in P1 sweep (separate project per user instruction).

### C2 — Admin cookie equals literal API key
- **Description:** `middleware.ts` accepts `admin_token` cookie equal to `ADMIN_API_KEY` / `MASTER_API_KEY` as authentication.
- **Impact:** Cookie disclosure = total admin compromise. No rotation, no per-session expiry, no constant-time compare.
- **Recommended fix:** issue per-session admin JWT, store rotating signing secret, constant-time compare; track admin sessions in `admin_sessions` collection.

### C3 — Price tampering at order creation
- **Description:** `app/api/orders/create/route.js#L79-96` accepts client-supplied `subtotal`, `total`, item `price` and falls back to computing from those same client values. Server never rebuilds against Square catalog.
- **Impact:** Attacker can submit cart with $0.01 items and pay $0.01 to Square; order persists at altered prices.
- **Recommended fix:** server-side rebuild from authoritative `unified_products` / Square catalog before passing to Square `Payments.createPayment`.

### C4 — Email confirmation delivery not tracked
- **Description:** [lib/resend-email.js](file:///data/data/com.termux/files/home/Gratog-live/lib/resend-email.js) does not persist Resend message id to `email_sends`. Restored webhook updates `email_sends`, so transactional events are orphaned.
- **Impact:** Bounce rate, complaint rate, deliverability all invisible for half of all email traffic; sender reputation risk.
- **Recommended fix:** wrap `resend.emails.send` with INSERT into `email_sends` keyed by returned `id` before send; update on result.

---

## 🟠 High

### H1 — Customer auth flow entirely broken
- **Routes missing:** `/api/auth/register`, `/api/auth/login` (verify), `/api/auth/reset-password`.
- **Impact:** New signups impossible; existing customers cannot recover access.
- **Recommended fix:** restore routes + `bcrypt` flow.

### H2 — Admin password reset broken
- **Route missing:** `/api/admin/auth/reset-password`.
- **Impact:** Admin lockout requires Vercel env rotation.
- **Recommended fix:** restore route; require old token / email-based reset.

### H3 — Coupon `$inc usedCount` happens pre-payment
- **Description:** `lib/transactions.ts#L86-104` increments coupon usage atomically with order create, before payment success.
- **Impact:** Repeated cart abandonment (or hostile abandonment) burns limited coupon allotments.
- **Recommended fix:** move `$inc` to payment-success path in `/api/payments`; rollback on failure.

### H4 — Internal rewards call via self-fetch over HTTP
- **Description:** `app/api/orders/create/route.js#L207-241` uses `fetch(${NEXT_PUBLIC_BASE_URL}/api/rewards/add-points)`.
- **Impact:** If `NEXT_PUBLIC_BASE_URL` unset/incorrect on Vercel, rewards silently skip. Also: extra Vercel function invocation.
- **Recommended fix:** import and call the rewards function directly in-process.

### H5 — Square diagnostic endpoints unauthenticated
- **Routes:** `/api/debug/square`, `/api/square/{diagnose,test-rest,validate-token}`.
- **Impact:** Information disclosure; might leak Square env / token validity.
- **Recommended fix:** gate behind admin middleware or remove in prod.

### H6 — `/api/unsubscribe` missing
- **Impact:** CAN-SPAM / GDPR exposure — users click and nothing happens; token logic exists but no HTTP handler.
- **Recommended fix:** restore route; honor `unsubscribes` collection.

### H7 — `/admin/orders` cannot sync / bulk-update
- **Routes:** `/api/admin/orders/sync`, `/api/admin/orders/update-status` missing.
- **Impact:** Admin must reconcile orders manually via Mongo.
- **Recommended fix:** restore routes; call Square Orders API for sync.

### H8 — Notifications admin entirely broken
- **Routes:** `/api/admin/notifications/{broadcast,market-day,new-product,send,stats}` missing.
- **Impact:** Cannot drive push notifications.
- **Recommended fix:** restore subsystem.

### H9 — Reviews public APIs missing
- **Routes:** `/api/reviews`, `/api/reviews/helpful` missing.
- **Impact:** Reviews UI is non-functional; trust signals lost.
- **Recommended fix:** restore.

### H10 — Recommendations API missing
- **Route:** `/api/recommendations`.
- **Impact:** No cross-sell, no quiz-driven recommendations.
- **Recommended fix:** implement with quiz integration.

---

## 🟡 Medium

### M1 — Parallel checkout systems
- `/checkout` + `/api/payments` (canonical) vs `/order/*` + `/api/pay/process` + `/api/checkout` + `/api/create-checkout`. Two UX trees.
- **Fix:** deprecate alternate or hard-redirect to canonical.

### M2 — Two parallel Resend modules
- `lib/resend-email.js` + `lib/email/service.js`.
- **Fix:** consolidate into single module with consistent `email_sends` write.

### M3 — Single `JWT_SECRET` for JWT + order tokens + unsubscribe + idempotency
- **Fix:** distinct secrets per purpose; rotate independently.

### M4 — Order access token reusable within TTL
- **Fix:** single-use via idempotency-key binding.

### M5 — No global error toast for failed APIs
- **Fix:** wrap `fetch` with global toast on non-2xx.

### M6 — Inventory list view broken in admin
- `/api/admin/inventory` missing (list); per-product exists.
- **Fix:** restore list endpoint.

### M7 — Subscriptions plans listing API missing
- **Fix:** restore.

### M8 — Quiz subsystem broken
- `/api/quiz/{submit,results,recommendations}` missing.
- **Fix:** restore.

### M9 — Newsletter signup broken
- `/api/newsletter/subscribe`, `/api/nurture/subscribe` missing.
- **Fix:** restore + connect to `email_subscribers`.

### M10 — Contact form broken
- `/api/contact` missing.
- **Fix:** restore.

### M11 — Wishlist API missing
- `/api/user/favorites`.
- **Fix:** restore.

### M12 — Abandoned-cart cleanup cron missing
- `/api/cron/cleanup-abandoned-orders`.
- **Fix:** restore + schedule in `vercel.json`.

### M13 — Service worker version / cache management
- `lib/pwa.ts` `SERVICE_WORKER_VERSION` vs `public/sw.js` `CACHE_VERSION` aligned manually; no CI guard.
- **Fix:** automated version-sync test.

### M14 — Duplicate `audit_log` + `audit_logs` collections
- **Fix:** pick one; migrate.

### M15 — `customers` keyed by email (lost identity on email change)
- **Fix:** introduce stable surrogate id.

### M16 — Resend message id never persisted (see C4)

### M17 — No rate limiting verified on /api/admin/auth/login, /api/contact, /api/auth/* (when restored)
- **Fix:** apply `lib/security/redis.ts` limiter.

### M18 — Background music auto-play on first visit
- **Fix:** opt-in via UX prompt.

### M19 — QA repo `Gratog-live-qa-deploy` ~244 commits behind prod
- **Fix:** rebase or destroy and re-fork from prod main.

---

## 🟢 Low

### L1 — `@sendgrid/mail` dependency remains in `package.json` after removal
### L2 — Mixed `.js` / `.tsx` pages (especially admin)
### L3 — Tailwind brand colors hard-coded in email templates
### L4 — `/test-auth`, `/diagnostic` reachable
### L5 — No `react-hook-form` consistency
### L6 — Background music provider always mounted
### L7 — Webhook deduplication needs verified TTL index
### L8 — `/api/admin/emergency-init` should explicitly require master key

---

## Defect counts

| Severity | Count |
|---|---|
| 🔴 Critical | 4 |
| 🟠 High | 10 |
| 🟡 Medium | 19 |
| 🟢 Low | 8 |
| **TOTAL** | **41** |
