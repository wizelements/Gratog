# Taste of Gratitude — Admin Control Plane Audit

**Audit date:** 2026-07-24  
**Branch:** `feat/fresh-batch-request-system`  
**Auditor:** OpenClaw  
**Status:** Partial implementation. Customer-facing form is functional; admin control plane is incomplete and not yet ready for owner operation.

---

## 1. Executive Summary

The Fresh Batch Request System added a public request form, validation, decision engine, email templates, and an owner-confirmed Square reservation link API. However, the **admin control plane required to operate the system safely is still largely missing or is a placeholder**. The owner currently cannot reliably:

- See new requests as they arrive.
- Group compatible demand without reading code.
- Know why a request was routed a certain way.
- View or edit batch proposals with real-time inventory math.
- Track payment-link creation, payment status, and pickup status.
- See communication history or email failures.
- Detect invalid state transitions or duplicate reservations.

This audit classifies every known admin route and recommends the minimum P0 work required before merge.

---

## 2. Admin Route Inventory

| Admin route | Purpose | Data source | Write actions | Authorization | Customer impact | Current status | Required action |
|---|---|---|---|---|---|---|---|
| `/admin` | Dashboard landing | Mixed: products, markets, orders, requests, reservations | None today | `requireAdminSession` | None directly | **Placeholder / vanity metrics** | Rebuild as action-oriented dashboard (P0). |
| `/admin/login` | Admin login | `admin_sessions` collection, `ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH` env | Creates session cookie | None before login | Blocks or grants admin access | **Active but unverified visual state** | Add password-strength guidance, rate limit, TOTP later. |
| `/admin/setup` | First-time admin creation | `admin_accounts` collection | Creates initial owner account | One-time setup guard | Grants owner access | **Active; safe if guarded** | Verify setup guard cannot be replayed after first account. |
| `/admin/analytics` | Analytics dashboard | `unified_analytics`, `analytics_events` | None | `requireAdminSession` | Read-only insight | **Legacy / needs reconciliation** | Decide whether to merge with dashboard or remove. |
| `/admin/menus` | Weekly menu management | `weeklyMenu.ts`, `fresh_batch_requests` | Updates `data/weeklyMenu.ts`? | `requireAdminSession` | Public menu changes | **Active but scope unclear** | Clarify relationship to Fresh Batch availability. |
| `/admin/products` | Product catalog | `data/products.ts` | Update product data | `requireAdminSession` | Storefront catalog changes | **Active** | Add Square variation ID mapping for accurate payment links. |
| `/admin/markets` | Market management | `data/markets.ts`, `lib/markets/repository.ts` | Create/update markets | `requireAdminSession` | Public market pages | **Active** | Add market status filter to request form; preserve historical records. |
| `/admin/orders` | Order management | Square orders, local `orders` collection | Update fulfillment state | `requireAdminSession` | Customer fulfillment | **Active** | Integrate fresh-batch reservations so owner sees all paid obligations. |
| `/admin/preorders` | Preorder inbox | `preorder` collection | Status, notes | `requireAdminSession` | Reservation/pickup | **Active** | Keep separate from fresh-batch reservations; unify pickup UI if possible. |
| `/admin/customers` | Customer directory | `customers` collection, `leads` | Add notes, view history | `requireAdminSession` | CRM | **Active but possibly sparse** | Link fresh-batch requests to customer timeline. |
| `/admin/contacts` | Contact form submissions | `contacts` collection | Mark as read, add notes | `requireAdminSession` | Follow-up | **Active** | Link flavor requests separately. |
| `/admin/subscribers` | Email subscribers | `subscribers` collection | Export, tag | `requireAdminSession` | Marketing consent | **Active** | Ensure fresh-batch marketing consent is visible here. |
| `/admin/fresh-batches` | Fresh Batch request inbox | `fresh_batch_requests` collection | Status, internal notes, assignment | `requireAdminSession` | Customer communication, batch routing | **Active but minimal** | Add grouping, filters, status actions, communication history (P0). |
| `/admin/fresh-batches/planner` | Batch planner | `batch_campaigns`, `batch_reservations` | Create/update batch, assign requests | `requireAdminSession` | Public batch status, payments | **Placeholder** | Implement full planner with volume math and guardrails (P0). |
| `/api/admin/fresh-batch/requests` | Admin request API | MongoDB | GET list, PATCH status | `requireAdminSession` | Request state, customer email | **Active but limited** | Add transitions, grouping, audit-log writes (P0). |
| `/api/admin/fresh-batch/reservations` | Create reservation + Square link | MongoDB + Square | POST reservation + payment link | `requireAdminSession` | Payment URL, confirmation email | **Active API; no UI** | Add UI, idempotency guard, duplicate prevention (P0). |
| `/api/admin/markets` | Markets API | MongoDB + `data/markets.ts` | CRUD markets | `requireAdminSession` | Public markets | **Active** | Ensure market archive preserves historical requests. |
| `/api/admin/products` | Products API | `data/products.ts` | CRUD products | `requireAdminSession` | Storefront | **Active** | Add Square catalog mapping and price-audit fields. |
| `/api/admin/orders/*` | Order APIs | Square + MongoDB | Fulfillment updates | `requireAdminSession` | Fulfillment | **Active** | Include fresh-batch reservations in order/fulfillment views. |
| `/api/admin/preorders/*` | Preorder APIs | MongoDB + Square | Status, payment links | `requireAdminSession` | Reservation/pickup | **Active** | Keep distinct from fresh-batch APIs. |
| `/api/admin/analytics/*` | Analytics APIs | MongoDB | Read-only | `requireAdminSession` | Read-only | **Active** | Deprecate or merge with dashboard. |

### Classification summary

| Class | Count | Routes |
|---|---|---|
| Active and verified | 6 | `/admin/login`, `/admin/setup`, `/admin/products`, `/admin/markets`, `/admin/orders`, `/admin/preorders`, `/admin/customers`, `/admin/contacts`, `/admin/subscribers`, `/api/admin/markets`, `/api/admin/products` |
| Active but incomplete | 3 | `/admin/fresh-batches`, `/api/admin/fresh-batch/requests`, `/admin/menus` |
| Placeholder | 2 | `/admin`, `/admin/fresh-batches/planner` |
| Legacy / scope unclear | 2 | `/admin/analytics`, `/api/admin/analytics/*` |
| Safe to remove | 0 | — |
| Owner decision required | 1 | Whether `/admin/analytics` remains separate. |

---

## 3. Authentication and Authorization

### Authentication

- `requireAdminSession` reads an HTTP-only `admin_session` cookie, validates it against `admin_sessions` in MongoDB, and checks expiry.
- Login at `/admin/login` verifies bcrypt hash of `ADMIN_PASSWORD_HASH` against submitted password and sets the cookie.
- Setup at `/admin/setup` creates the first admin account if none exists.
- **Gap**: No rate limiting on login. No multi-factor authentication. No session revocation UI.

### Authorization

- All admin routes use `requireAdminSession` as a binary owner/admin gate.
- **Gap**: No role-based permissions. Any logged-in admin can create payment links, change prices, and approve production.
- **Gap**: API routes check only authentication, not action-level authorization.

### Client-side security

- Layouts redirect to `/admin/login` when unauthenticated, but the redirect is a UI convenience.
- Server APIs perform the actual authorization check. **This is correct.**
- **Risk**: A missing server check on a future admin route would expose data.

---

## 4. Data Flow and Customer Impact

### New flavor request flow

1. Customer submits `/request-a-flavor`.
2. `POST /api/fresh-batch/requests` validates input, deduplicates, filters health claims, persists `fresh_batch_requests`.
3. Resend confirmation email sent to customer.
4. Owner alert sent via Telegram/Resend.
5. Owner sees request in `/admin/fresh-batches` (currently minimal list).
6. Owner uses batch planner to group/approve.
7. Owner creates reservation via `/api/admin/fresh-batch/reservations`.
8. Customer receives Square payment link and confirmation email.
9. Customer pays Square; webhook updates payment status.
10. Owner marks pickup complete in admin.

### Gaps in the current flow

- **Step 5**: inbox lacks grouping, filters, and status actions.
- **Step 6**: planner is a placeholder; owner cannot create or edit batches via UI.
- **Step 7**: only an API; no UI, no duplicate prevention, no idempotency visible to owner.
- **Step 9**: webhook handler not yet implemented for fresh-batch reservations.
- **Step 10**: pickup status UI not present for fresh-batch reservations.

---

## 5. P0 Release Blockers

These must be resolved before the Fresh Batch Request System can be considered admin-operable:

1. **Request inbox is not actionable.** Owner cannot search, filter, group, change status, or see communication history.
2. **Batch planner is a placeholder.** Owner cannot plan production volume or confirm batches without editing code or calling APIs manually.
3. **No reservation UI.** Owner cannot create a Square payment link from the browser; relies on direct API use.
4. **No webhook reconciliation.** Paid status depends on manual admin update or Square dashboard polling.
5. **No state-machine enforcement.** Invalid transitions are not rejected server-side.
6. **No audit log.** High-impact changes are not recorded immutably.
7. **No duplicate/idempotency guard.** Repeated clicks could create duplicate reservations/payment links.
8. **No communication history.** Email failures are not surfaced in the admin.
9. **No mobile optimization for urgent market actions.** Pickup marking must work on a phone.
10. **No settings area.** Batch thresholds, deposit percent, and fees require code changes.

---

## 6. P1 High Operational Risk

- Analytics page duplicates or conflicts with dashboard purpose.
- Admin dashboard lacks request/batch/payment attention widgets.
- `/admin/menus` relationship to fresh batches is unclear.
- Product catalog lacks Square variation ID mapping.
- No role-based permissions.
- No communication retry UI.
- No stale-record concurrency warnings.

---

## 7. Recommendations

1. **Rebuild `/admin` dashboard** into an action-oriented landing page: Needs attention → New requests → Upcoming batches → Payments → Communication failures.
2. **Complete `/admin/fresh-batches`** with server-side filtering, grouping by compatibility, status transitions, internal notes, and a communication timeline.
3. **Implement `/admin/fresh-batches/planner`** with real-time volume math, guardrails, and explicit owner approval.
4. **Add reservation creation UI** linked from the request detail and batch planner.
5. **Add Square webhook handling** for fresh-batch reservations and reconcile payment status.
6. **Add server-side state machine** with transition map and audit-log writes.
7. **Add idempotency and version fields** to reservation creation and batch updates.
8. **Add audit-log collection and read-only admin view**.
9. **Add a `/admin/fresh-batches/settings`** page for batch rules and thresholds.
10. **Add authorization tests** for every admin API route.

---

## 8. Artifact Map

- `docs/audits/taste-of-gratitude-admin-control-plane-audit.md` — this file.
- `docs/audits/taste-of-gratitude-public-admin-traceability.md` — bidirectional traceability matrix.
- `docs/audits/taste-of-gratitude-admin-state-machine.md` — state transitions.
- `docs/audits/taste-of-gratitude-admin-permissions.md` — roles and permissions.
- `docs/audits/taste-of-gratitude-admin-data-integrity.md` — inventory, concurrency, audit log.
- `docs/audits/taste-of-gratitude-admin-verification.md` — test results and screenshots (to be filled after implementation).
