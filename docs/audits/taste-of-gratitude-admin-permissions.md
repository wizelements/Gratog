# Taste of Gratitude — Admin Permissions and RBAC Gap Assessment

**Branch:** `feat/fresh-batch-request-system`  
**Audit date:** 2026-07-24  
**Status:** Read-only audit. No application code changed.

---

## 1. Current Role Model

The code defines four roles in `lib/security/index.ts`:

- `super_admin`
- `admin`
- `editor`
- `viewer`

However, the JWT verification in `lib/admin-session.ts` and `lib/auth/unified-admin.ts` only accepts `admin` or `super_admin`. `editor` and `viewer` cannot currently authenticate to the admin dashboard because the token role check rejects them.

---

## 2. Proposed Operational Roles for Taste of Gratitude

| Role | Typical user | Scope |
|---|---|---|
| **Owner** | Business owner / founder | Full control, financial decisions, integrations, admin management |
| **Manager** | Operations manager | Batch planning, order fulfillment, refunds, pricing, publishing |
| **Production staff** | Kitchen/prep lead | View requests/batches, update production status, mark pickups |
| **Market staff** | Market booth worker | View reservations, mark pickups, view limited customer info |
| **Read-only reviewer** | Bookkeeper / consultant | View orders, products, requests; no writes |

---

## 3. Permission Matrix

| Capability | Owner | Manager | Production staff | Market staff | Read-only reviewer |
|---|---|---|---|---|---|
| **View dashboard / orders / customers** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **View products / inventory / markets** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Edit products (names, descriptions, categories)** | ✅ | ✅ | ✅* | ❌ | ❌ |
| **Edit inventory counts** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Approve / defer / reject fresh batch requests** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Create batch campaigns** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Create payment links / reservations** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Refund payments** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Change prices / microbatch fees** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Publish menus / batch board** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Manage markets / pickup locations** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Manage integrations (Square, Resend, Telegram)** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Manage admin users / roles** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **View audit logs** | ✅ | ✅ | ❌ | ❌ | ✅* |
| **Export customer data** | ✅ | ✅ | ❌ | ❌ | ✅* |
| **Mark reservations picked up / no-show** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Update production status** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Send marketing campaigns** | ✅ | ✅ | ❌ | ❌ | ❌ |

*Editor can edit product metadata but not pricing.
*Read-only reviewer can view audit logs if granted by owner; export may be limited and logged.

---

## 4. Required New Permissions

Add these to `lib/security/index.ts` for the fresh-batch system:

| Permission | Role mapping | Description |
|---|---|---|
| `FRESH_BATCH_REQUESTS_VIEW` | Owner, Manager, Production, Market, Read-only | View request inbox |
| `FRESH_BATCH_REQUESTS_UPDATE` | Owner, Manager | Approve/defer/reject/cancel requests |
| `FRESH_BATCH_CREATE` | Owner, Manager | Create and confirm batch campaigns |
| `FRESH_BATCH_UPDATE` | Owner, Manager, Production | Update production/pickup status |
| `FRESH_BATCH_RESERVE` | Owner, Manager | Create reservations + Square payment links |
| `FRESH_BATCH_PAYMENT_LINK_CREATE` | Owner, Manager | Create Square payment links |
| `FRESH_BATCH_REFUND` | Owner, Manager | Refund/credit reservations |
| `FRESH_BATCH_PICKUP_MANAGE` | Owner, Manager, Production, Market | Mark pickups / no-shows |
| `PRICES_UPDATE` | Owner, Manager | Change standard/microbatch prices |
| `INTEGRATIONS_MANAGE` | Owner only | Square, Resend, Telegram config |
| `ADMINS_MANAGE` | Owner only | Create/edit admin users |
| `AUDIT_LOGS_VIEW` | Owner, Manager, Read-only (if granted) | View audit log |

---

## 5. Current `requireAdminSession` Gap Assessment

`requireAdminSession` only verifies authentication. It does **not**:

| Missing check | Where it matters |
|---|---|
| Role/permission validation | Every admin route that calls `requireAdminSession` without `withAdminMiddleware` |
| Fresh-batch-specific permissions | `/api/admin/fresh-batch/requests` and `/api/admin/fresh-batch/reservations` accept any `admin`/`super_admin` |
| Owner-only integration settings | `/admin/settings` does not restrict integration changes |
| Audit logging on mutations | Most routes do not persist `batch_audit_log` entries |
| Token rotation enforcement | `shouldRotateToken` exists but is not called for every request |
| CSRF on `GET` | Not required by design; acceptable |

### 5.1 Routes that correctly use RBAC

- `/api/admin/products` GET/PUT use `withAdminMiddleware` with `PERMISSIONS.PRODUCTS_VIEW` / `PRODUCTS_UPDATE`.

### 5.2 Routes that use authentication only

- `/api/admin/fresh-batch/requests`
- `/api/admin/fresh-batch/reservations`
- `/api/admin/markets`
- `/api/admin/orders`
- `/api/admin/menus`
- `/api/admin/campaigns`
- `/api/admin/coupons`
- `/api/admin/customers`
- `/api/admin/inventory/[productId]`
- `/api/admin/emails`

---

## 6. Recommended RBAC Implementation Plan

### 6.1 Short term (before fresh-batch production)

1. Add fresh-batch permissions to `lib/security/index.ts`.
2. Wrap `/api/admin/fresh-batch/requests` and `/api/admin/fresh-batch/reservations` with `withAdminMiddleware`:
   - `GET /api/admin/fresh-batch/requests` → `FRESH_BATCH_REQUESTS_VIEW`
   - `PATCH /api/admin/fresh-batch/requests` → `FRESH_BATCH_REQUESTS_UPDATE`
   - `POST /api/admin/fresh-batch/reservations` → `FRESH_BATCH_RESERVE` + `FRESH_BATCH_PAYMENT_LINK_CREATE`
3. Add `minRole: ROLES.ADMIN` to settings/integration routes.
4. Keep current `admin`/`super_admin` mapping to Owner + Manager for now.

### 6.2 Medium term

1. Allow `editor` and `viewer` roles to authenticate by updating `verifyAdminToken` in `lib/auth/unified-admin.ts`.
2. Map roles to proposed operational roles:
   - `super_admin` → Owner
   - `admin` → Manager
   - `editor` → Production staff
   - `viewer` → Read-only reviewer
3. Create a new `market_staff` role or extend `editor` with limited market-only permissions.
4. Add UI controls that hide/disable actions based on `user.role`.

### 6.3 Long term

1. Store permissions per admin in `admin_users.permissions` for fine-grained overrides.
2. Add time-bound access (e.g., temporary market staff for a single market day).
3. Add row-level filters so Market Staff A only sees their assigned market.

---

## 7. Security Boundaries

| Boundary | Rule |
|---|---|
| Payment link creation | Only Owner + Manager |
| Refund / store credit | Only Owner + Manager; requires audit log |
| Price changes | Only Owner + Manager; requires audit log |
| Integration credentials | Owner only; never returned to client |
| Customer PII export | Owner + Manager only; logged |
| Audit logs | Owner + Manager; read-only reviewer if explicitly granted |
| Terminal state changes | Only Owner + Manager can cancel/refund completed or picked-up reservations |

---

## 8. Conclusion

The current `requireAdminSession` is a good authentication primitive but an incomplete authorization system. The fresh-batch admin surfaces treat every authenticated admin as an owner, which is acceptable for Phase 1 internal use but must be tightened before additional staff log in. The highest-priority fixes are:

1. Apply fresh-batch permissions to the two new admin APIs.
2. Restrict integration and admin-management settings to `super_admin`.
3. Decide whether to enable `editor`/`viewer` login or keep the dashboard owner-only until RBAC is complete.
