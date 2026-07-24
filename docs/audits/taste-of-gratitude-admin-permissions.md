# Taste of Gratitude — Admin Permissions and Authorization Model

**Audit date:** 2026-07-24  
**Branch:** `feat/fresh-batch-request-system`  
**Status:** Current system uses a single `requireAdminSession` gate. Role-based authorization is not implemented but is required for safe operation as the team grows.

---

## 1. Current authorization model

### Implementation

- `requireAdminSession` in `lib/auth/unified-admin.ts` reads the `admin_session` cookie, looks up the session in MongoDB, and returns the admin record or `null`.
- All admin pages and APIs call `requireAdminSession` and return 401 if unauthenticated.
- No role or permission checks exist beyond "is logged in as any admin."

### Authentication surface

| Route | Behavior | Risk |
|---|---|---|
| `/admin/login` | bcrypt password verification against `ADMIN_PASSWORD_HASH` env | No rate limit; weak password may be brute-forced. |
| `/admin/setup` | Creates first admin account if none exists | Must be one-time only. |
| Admin pages | Redirect to login if unauthenticated | UI only; real protection is server API. |
| Admin APIs | `requireAdminSession` on every route | Correct. |

---

## 2. Recommended roles

| Role | Description |
|---|---|
| **Owner** | Full access. Can manage admins, settings, integrations, refunds, pricing overrides. |
| **Manager** | Can approve batches, create payment links, manage products/markets, handle customer service. Cannot change settings or manage admins. |
| **Production staff** | Can view assigned batches, record actual yield, update pickup status. Cannot create batches, approve prices, or send payment links. |
| **Market staff** | Can mark pickup complete, view reservations for a specific market, mark sold out. Cannot access all customer data or pricing. |
| **Read-only reviewer** | Can view requests, batches, and reservations. Cannot change state or send communications. |

---

## 3. Permission matrix

| Action | Owner | Manager | Production staff | Market staff | Read-only reviewer |
|---|---|---|---|---|---|
| View dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| View requests | ✅ | ✅ | ✅ | ✅ (own market) | ✅ |
| Edit request status | ✅ | ✅ | ❌ | ❌ | ❌ |
| Assign request to batch | ✅ | ✅ | ❌ | ❌ | ❌ |
| View batches | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create draft batch | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve batch / price | ✅ | ✅ | ❌ | ❌ | ❌ |
| Open reservations | ✅ | ✅ | ❌ | ❌ | ❌ |
| Lock production | ✅ | ✅ | ✅ (record yield only) | ❌ | ❌ |
| Create Square payment link | ✅ | ✅ | ❌ | ❌ | ❌ |
| View reservations | ✅ | ✅ | ✅ | ✅ (own market) | ✅ |
| Update pickup status | ✅ | ✅ | ✅ | ✅ | ❌ |
| Mark sold out | ✅ | ✅ | ✅ | ✅ | ❌ |
| Send customer email | ✅ | ✅ | ❌ | ❌ | ❌ |
| Retry failed email | ✅ | ✅ | ❌ | ❌ | ❌ |
| View communication history | ✅ | ✅ | ✅ | ✅ | ✅ |
| View audit log | ✅ | ✅ | ❌ | ❌ | ✅ |
| Change prices | ✅ | ✅ (with override reason) | ❌ | ❌ | ❌ |
| Change settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage integrations | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage admin accounts | ✅ | ❌ | ❌ | ❌ | ❌ |
| Issue refund or credit | ✅ | ✅ | ❌ | ❌ | ❌ |
| Export subscribers | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete records | ✅ | ✅ (soft delete with audit) | ❌ | ❌ | ❌ |

---

## 4. Sensitive action confirmation

The following actions require explicit confirmation in the UI, plus an audit-log entry:

- Approve production batch
- Change confirmed price
- Create Square payment link
- Cancel paid reservation
- Cancel batch with assigned customers
- Mark batch sold out
- Issue refund or credit
- Delete record
- Remove customer from batch
- Change pickup market
- Change production date after confirmation
- Resend customer communication
- Publish public availability
- Change batch threshold / deposit / fees settings

Confirmation dialog must show:

- Action name
- Affected customers and reservations
- Whether a customer email will be sent
- Payment impact
- Inventory impact
- Whether reversible

---

## 5. Gaps in current system

1. **No roles**: any admin can do anything.
2. **No action-level authorization**: API only checks authentication.
3. **No session revocation**: admins cannot log out other sessions.
4. **No audit of admin actions**: no immutable log.
5. **No login rate limiting**: brute-force risk.
6. **No MFA**: single password is the only factor.

---

## 6. Implementation path

### Phase 1 — Critical

- Keep `requireAdminSession`.
- Add `role` field to `admin_accounts` collection.
- Add `requireOwner()` helper for settings and admin management.
- Enforce owner-only for payment link creation and batch approval until roles are added.

### Phase 2 — Roles

- Add role to JWT/session.
- Add `requireRole(['owner','manager'])` helpers.
- Wrap sensitive admin APIs with role checks.
- Update UI to hide or disable actions based on role.

### Phase 3 — Hardening

- Add login rate limiting by IP.
- Add session list and revoke UI for owner.
- Add MFA option.
- Add admin action audit log.

---

## 7. Security checklist

- [ ] Admin APIs cannot be called anonymously.
- [ ] Session expiry is enforced server-side.
- [ ] Failed authentication does not leak whether a record exists.
- [ ] Setup route cannot be replayed after first admin created.
- [ ] Preview deployments use same auth as production.
- [ ] Client-side redirects are not treated as authorization.
- [ ] Sensitive actions require server-side permission check, not just hidden UI.
- [ ] Secrets are never sent to client components.
