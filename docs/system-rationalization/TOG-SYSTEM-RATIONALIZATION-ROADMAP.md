# TOG-SYSTEM-RATIONALIZATION-ROADMAP.md

Taste of Gratitude — System Rationalization Roadmap

Generated: 2026-07-29 19:35 EDT
Authority: Native Termux workspace

---

## 1. Guiding Principle

Reduce unnecessary complexity while preserving everything that materially supports Taste of Gratitude’s mission, customers, revenue, operations, history, and future growth.

No system may be deleted during this phase. Archive only after dependency analysis and rollback plan.

## 2. Phase 0 — Pre-Alignment Stabilization (Immediate)

| Action | Owner | Evidence of Done |
|--------|-------|------------------|
| Fix Vercel build failure | OpenClaw | Successful preview deployment from clean working tree |
| Reconcile package-lock.json | OpenClaw | `npm ci` or `npm install` produces deterministic diff |
| Commit or remove verification artifacts | OpenClaw | Working tree clean except intentional changes |
| Verify production deploy from HEAD | OpenClaw | `vercel inspect` shows READY |

## 3. Phase 1 — Core System Repair

| Action | Priority | Verification |
|--------|----------|--------------|
| Deploy weekly-menu date fix | P1 | Homepage and `/weekly-menu` show correct week range |
| Repair customer auth (login/register/session/logout) | P1 | End-to-end browser test of account flow |
| Repair customer profile/account pages | P1 | Profile shows orders, settings editable |
| Fix admin product update whitelist | P1 | Admin cannot inject arbitrary fields |
| Fix inventory adjustment atomicity | P1 | Concurrent adjustments do not oversell |
| Fix admin password hash mismatch | P1 | All admin accounts can log in |

## 4. Phase 2 — Consolidation

| Action | Verification |
|--------|--------------|
| Consolidate cart systems on `lib/cart-engine.ts` | Cart, checkout, and abandoned-order recovery all work |
| Consolidate email on `lib/email/service.js` | All customer and owner emails send correctly |
| Consolidate product authority on Square runtime | Catalog matches Square Dashboard |
| Consolidate weekly menu on `data/weeklyMenu.ts` + `lib/menus/*` | Menu date correct, no stale DB menu |
| Consolidate admin auth on `lib/admin-session.ts` | Single auth path, no hash mismatch |
| Consolidate payment forms | Single Square form, stable idempotency |

## 5. Phase 3 — Safe Archival

| Action | Verification |
|--------|--------------|
| Archive SMS/Twilio code and remove env vars | No Twilio references remain; no SMS promises public |
| Archive public reviews system | `/reviews` redirect remains or page removed; no broken links |
| Archive public subscriptions/Gratitude Box | Redirects remain; no broken links |
| Archive Stripe placeholders | No Stripe env vars in production |
| Archive legacy flat modules | Build passes, no missing imports |
| Archive deprecated 410 routes if no callers | Build passes, no references |

## 6. Phase 4 — Owner-Decision Features

| Action | Decision Needed |
|--------|-----------------|
| Shipping (ShipEngine/EasyPost) | Does Taste of Gratitude ship products? If not, archive. |
| Wholesale portal | Is there active wholesale demand? If not, convert to simple inquiry or archive. |
| OpenAI newsletter | Is AI-generated content used and valuable? If not, disable. |
| Rewards/loyalty program | Is a loyalty program operationally sustainable? If not, archive. |
| Analytics providers | Which provider does the owner actually use? Consolidate to one. |
| Cache backend | Redis or Upstash? Consolidate to one. |

## 7. Phase 5 — Verification and Alignment Readiness

| Action | Evidence |
|--------|----------|
| End-to-end purchase test | Real or sandbox order completes |
| Market pickup test | Market selection, payment, pickup instructions flow |
| Delivery test | Eligibility, fee, payment, delivery notification |
| Owner alert test | Telegram + Resend alert on order |
| Admin workflow test | Update product, see public result, update inventory, see stock change |
| Load/single-request test | Homepage and checkout respond quickly |
| Security review | No public diagnostic routes, no dangerous flags, no leaked secrets |

## 8. Rollback Plan

- Every change must have a git commit and tag.
- Vercel production deployments must be preceded by preview deployments.
- Keep the last known good production deployment (`dpl_5YfkFjmke2qxYa5tG2jgweaimDX2`) as a rollback target.
- Document restoration steps for each archived system.

---

*Next: TOG-PRE-ALIGNMENT-READINESS-REPORT.md*
