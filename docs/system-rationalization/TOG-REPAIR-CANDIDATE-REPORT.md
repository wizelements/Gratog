# TOG-REPAIR-CANDIDATE-REPORT.md

Taste of Gratitude — Repair Candidate Report

Generated: 2026-07-29 19:33 EDT
Authority: Native Termux workspace

---

## 1. Repair Candidate Matrix

| System | Purpose | Defect | Root Cause | Business Impact | Repair Value | Priority |
|--------|---------|--------|------------|-----------------|--------------|----------|
| Vercel build / deploy | Host the site | Recent production deployments fail with ERROR | Likely uncommitted changes, package-lock drift, or build errors | Cannot deploy fixes | Critical | P0 |
| Customer auth | Returning-customer accounts | Login/register/session reported broken/partial in Phase 0 | Routes may still be incomplete or inconsistent | Blocks account-based reordering, order history, profile | High | P0/P1 |
| Customer account/profile pages | Returning-customer fast path | `/account` shows unavailable; profile pages partial | Auth dependency + incomplete UI | Returning customers cannot self-serve | High | P1 |
| Weekly menu date | Show correct current week | `menus` DB document dated June 8, 2026; code expects July 27 – Aug 3 | Stale DB record + uncommitted week-utils fix | Customers see wrong week | High | P1 |
| Package-lock.json | Reliable installs | Large uncommitted diff (7,500 lines) | Prior npm install/audit changes | Nondeterministic builds, deploy failures | High | P0 |
| Working-tree audit/debug files | Clean deployable repo | Many untracked JSON/scripts from verification pass | Verification artifacts not committed or removed | Clutter, potential secret leak, deploy noise | Medium | P0/P1 |
| Admin product update whitelist | Owner controls products | PUT spreads arbitrary updates (CRIT-002) | Missing input validation | Data corruption, security | High | P1 |
| Inventory adjustment atomicity | Accurate stock | Client-driven adjustment without atomic server calc | Design gap | Overselling, stock inconsistency | High | P1 |
| Admin password hash mismatch | Admin login | `unified-admin.ts` SHA-256 vs login bcrypt | Multiple auth implementations | Some admins cannot log in | High | P1 |
| Telegram Markdown escaping | Owner alerts | `$` in message body breaks Markdown parse mode | Unescaped dynamic values | Owner alert fails | Medium | P2 |
| Winback email failures | Recover abandoned carts | Recent `email_sends` failures | Resend bounce/complaint or invalid addresses | Lost revenue recovery | Medium | P2 |
| Customer auth CSRF | Security | Admin has CSRF; customer auth lacks it | Incomplete customer auth | CSRF risk | Medium | P2 |
| Database indexes | Performance | No unique index on `users.email` | Missing schema hardening | Race conditions, slow queries | Medium | P2 |
| Lint/type errors | Build quality | 122 lint errors, TypeScript errors | `@ts-ignore` usage, real TS errors | Build warnings, deploy issues | Medium | P2 |

## 2. Repair Priority Order

### P0 — Before any alignment work
1. Fix Vercel build/deploy failure.
2. Reconcile package-lock.json.
3. Commit or remove uncommitted verification artifacts.

### P1 — Core customer/owner experience
4. Fix weekly menu date (deploy uncommitted week-utils fix).
5. Repair customer auth (login/register/session).
6. Repair customer account/profile pages.
7. Fix admin product update whitelist.
8. Fix inventory adjustment atomicity.
9. Fix admin password hash mismatch.

### P2 — Operational reliability
10. Add database indexes.
11. Fix Telegram Markdown escaping.
12. Investigate winback email failures.
13. Add CSRF to customer auth.
14. Resolve lint/type errors.

---

*Next: TOG-SYSTEM-RATIONALIZATION-ROADMAP.md*
