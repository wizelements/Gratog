# Taste of Gratitude — Admin Control Plane Audit

**Branch:** `feat/fresh-batch-request-system`  
**Stacked on:** `feat/content-seo-cleanup` (`8c378621`)  
**Audit date:** 2026-07-24  
**Status:** Read-only audit. No application code changed.

---

## 1. Executive Summary

The admin control plane is a mixture of active operational pages, partially built features, and legacy/placeholder routes inherited from earlier development. Authentication is correct at the edge (JWT cookie + CSRF), but authorization is inconsistent: some routes use `requireAdminSession`, some use `withAdminMiddleware` + RBAC permissions, and some still use the older `requireAdmin`/`requireAdminAuth` wrappers. The new Fresh Batch Request System added an owner inbox and reservation API but does not yet appear in the main admin navigation, creating an **unlinked admin page** risk.

Key findings:

- **Auth single source of truth declared:** `lib/auth/unified-admin.ts`.
- **Auth in practice fragmented:** `lib/admin-session.ts`, `lib/admin-auth-middleware.js`, `lib/middleware/admin.ts`, and `lib/security/index.ts` all verify the same cookie but with slightly different secret handling and role names.
- **RBAC exists but is not applied uniformly:** Only `/api/admin/products` uses `PERMISSIONS` granular checks; most routes treat `admin`/`super_admin` as all-powerful.
- **Fresh Batch pages are unlinked:** `/admin/fresh-batches` and `/admin/fresh-batches/planner` are reachable by URL but not in `app/admin/layout.js` navigation.
- **Batch planner is a placeholder:** The UI is a construction notice; the underlying reservation API is functional.
- **No dedicated admin audit-log viewer** exists; `audit_logs` / `audit_log` collections are written but not exposed in the UI.
- **Email and owner-alert paths are healthy** and reused correctly by the fresh-batch flow.

---

## 2. Admin Route Inventory

| Admin route | Purpose | Data source | Write actions | Authorization | Customer impact | Current status | Required action |
|---|---|---|---|---|---|---|---|
| `/admin` | Operational dashboard: active menu, products, markets, preorders, open orders. | `menus`, `unified_products`/`square_catalog_items`, `markets`, `marketorders` | None (read-only dashboard) | `requireAdminSession` via `adminFetch` | None direct; informs product/market availability | Active and verified | Add Fresh Batch card linking to `/admin/fresh-batches` |
| `/admin/login` | Admin login page; sets `admin_token` cookie. | `admin_users` | Updates `lastLogin` | Public | None | Active and verified | None |
| `/admin/forgot-password` | Password reset request page. | `admin_users` | Triggers reset token (if wired) | Public | None | Placeholder | Verify reset flow is implemented or remove link |
| `/admin/reset-password` | Password reset confirmation page. | `admin_users` | Updates password hash | Token-based | None | Placeholder | Verify or remove |
| `/admin/orders` | Lists and manages market/preorders. | `marketorders` | Status updates, refunds via `/api/admin/orders/[id]/refund` | `requireAdminSession` + `withAdminMiddleware` (orders) | Fulfills customer pickups, refunds | Active but incomplete | Add fulfillment status actions and refund confirmation UX |
| `/admin/orders/[id]/refund` (API) | Refunds a Square payment. | Square API + `marketorders` | Creates refund | `requireAdminSession` | Direct financial impact | Active but incomplete | Add idempotency key and audit logging |
| `/admin/products` | Product list with inventory status. | `unified_products`, `square_catalog_items`, `inventory` | Bulk update via `/api/admin/products` | `withAdminMiddleware` + `PERMISSIONS.PRODUCTS_VIEW`/`UPDATE` | Changes storefront availability/pricing | Active and verified | Add Fresh Batch pricing/category metadata editing |
| `/admin/products/[id]` | Product detail/edit page. | `unified_products` | Updates product fields | `requireAdminSession` | Changes product page content | Active but incomplete | Add validation and audit logging |
| `/admin/menus` | Weekly menu management. | `weekly_menus` | Publish/activate menus | `requireAdminSession` | Controls homepage/menu display | Active and verified | None |
| `/admin/markets` | Market/pickup location CRUD. | `markets` collection + `data/markets.ts` | Create/update/delete markets | `requireAdminSession` + `requireAdmin` (legacy double-check) | Changes public market list | Active but incomplete | Remove duplicate `requireAdmin` call; standardize on `requireAdminSession` |
| `/admin/market-setup` | Market-day configuration helper. | `markets`, `market_days` | Configure market slots | `requireAdminSession` | Changes pickup options | Placeholder | Complete or merge into `/admin/markets` |
| `/admin/market-day` | Market-day operational view. | `markets`, `marketorders` | Check-in/fulfillment | `requireAdminSession` | Affects pickup experience | Placeholder | Complete or remove |
| `/admin/inventory` | Inventory levels and low-stock alerts. | `inventory`, `unified_products` | Stock adjustments | `requireAdminSession` | Hides/shows sold-out states | Active but incomplete | Add source-of-truth boundary with Square catalog |
| `/admin/customers` | Customer list and detail. | `customers`, `lead_intents`, `newsletter_subscribers` | Read-only / export | `requireAdminSession` | None if read-only | Active but incomplete | Add consent and PII handling rules |
| `/admin/emails` | Email health / send log viewer. | `email_sends` | Read-only | `requireAdminSession` | None | Active but incomplete | Add resend webhook status and bounce tracking |
| `/admin/campaigns` | Marketing campaign list and send UI. | `campaigns`, `email_sends` | Create/send campaigns | `requireAdminSession` | Sends marketing email | Active but incomplete | Add audience segmentation and send-rate limits |
| `/admin/coupons` | Coupon/discount management. | `coupons` | Create/delete coupons | `requireAdminSession` | Applies discounts at checkout | Active but incomplete | Add expiration and usage-limit validation |
| `/admin/analytics` | Business metrics dashboard. | `marketorders`, `email_sends`, `inventory` | Read-only | `requireAdminSession` | None | Placeholder | Define KPIs or remove from nav |
| `/admin/reviews` | Customer review moderation. | `reviews` | Approve/hide/delete | `requireAdminSession` | Publishes/hides testimonials | Placeholder | Complete or remove |
| `/admin/queue` | Background job queue viewer. | `owner_alert_queue`, cron job state | Retry/cancel jobs | `requireAdminSession` | Delays notifications | Placeholder | Complete or remove |
| `/admin/interactions` | Customer interaction log. | `lead_intents`, `email_sends` | Read-only | `requireAdminSession` | None | Placeholder | Complete or remove |
| `/admin/errors` | Error / log viewer. | Application logs | Read-only | `requireAdminSession` | None | Placeholder | Complete or remove |
| `/admin/qr-generator` | QR code generator for markets. | Static / product data | Generate QR images | `requireAdminSession` | Links to product pages | Active but incomplete | Add analytics tracking |
| `/admin/settings` | Site/admin settings. | `settings` | Update global config | `requireAdminSession` | Broad depending on setting | Active but incomplete | Add RBAC so only super_admin can change integrations |
| `/admin/setup` | First-time admin onboarding. | `admin_users` | Create initial admin | Public (with setup secret) | None | Legacy | Disable in production or gate strongly |
| `/admin/square-oauth` | Square OAuth callback landing. | Square OAuth | Connect Square account | Public callback, then admin | Enables payment sync | Active but incomplete | Add state/nonce validation and audit log |
| `/admin/waitlist` | Waitlist management page. | `waitlist` | Update waitlist entries | `requireAdminSession` | Communicates product restocks | Legacy | Verify still needed or archive |
| `/admin/fresh-batches` | Fresh Batch request inbox + demand grouping. | `fresh_batch_requests` | Read-only (status edits via API) | `requireAdminSession` via `adminFetch` | Controls batch approval flow | Active but incomplete | **Add to sidebar navigation** |
| `/admin/fresh-batches/planner` | Visual batch planner. | `fresh_batch_requests`, `batch_campaigns` | Create batch, assign requests, create reservations | `requireAdminSession` via `adminFetch` | Creates paid reservations | Placeholder | Build UI on top of existing `/api/admin/fresh-batch/reservations` |
| `/api/admin/auth/*` | Login, logout, CSRF, me, reset-password. | `admin_users` | Issues JWT, rotates CSRF | Public (login) / `admin_token` (logout/me) | None | Active and verified | Standardize reset-password route |
| `/api/admin/products` | Product CRUD + inventory merge. | `unified_products`, `square_catalog_items` | Update products | `withAdminMiddleware` + RBAC | Changes storefront | Active and verified | Add Fresh Batch pricing fields |
| `/api/admin/markets` | Market CRUD. | `markets` | Create/update/delete markets | `requireAdminSession` + legacy `requireAdmin` | Changes pickup options | Active but incomplete | Remove duplicate auth; add audit log |
| `/api/admin/orders` | Order list and status updates. | `marketorders` | Update status, sync Square | `requireAdminSession` / `withAdminMiddleware` | Fulfills orders | Active but incomplete | Standardize middleware |
| `/api/admin/orders/[id]/refund` | Square refund. | Square API | Refund payment | `requireAdminSession` | Direct refund | Active but incomplete | Add idempotency + audit log |
| `/api/admin/menus` | Menu CRUD. | `weekly_menus` | Create/update menus | `requireAdminSession` | Changes weekly menu | Active and verified | Add audit log |
| `/api/admin/campaigns` | Campaign CRUD and send. | `campaigns`, `email_sends` | Send bulk email | `requireAdminSession` | Sends marketing mail | Active but incomplete | Add consent checks |
| `/api/admin/coupons` | Coupon CRUD. | `coupons` | Create/delete coupons | `requireAdminSession` | Applies discounts | Active but incomplete | Add usage limits |
| `/api/admin/customers` | Customer list/detail. | `customers` | Read / export | `requireAdminSession` | None | Active but incomplete | Add PII access log |
| `/api/admin/inventory/[productId]` | Per-product inventory updates. | `inventory` | Adjust stock | `requireAdminSession` | Availability changes | Active but incomplete | Add concurrency guard |
| `/api/admin/emails` | Email send log / health. | `email_sends` | Read-only | `requireAdminSession` | None | Active but incomplete | Add delivery metrics |
| `/api/admin/notifications` | Legacy notification settings. | `settings` | Update notification prefs | `requireAdminSession` | Changes alert routing | Legacy | Merge into settings or remove |
| `/api/admin/reviews` | Review moderation API. | `reviews` | Approve/hide/delete | `requireAdminSession` | Testimonials visibility | Placeholder | Complete or remove |
| `/api/admin/analytics` | Analytics data API. | Aggregations over orders/email | Read-only | `requireAdminSession` | None | Placeholder | Complete or remove |
| `/api/admin/setup` | First-run admin creation. | `admin_users` | Insert admin | Public with setup token | None | Legacy | Disable after first use |
| `/api/admin/emergency-init` | Emergency re-initialization. | `admin_users` / DB | Reset/recreate admin | Public-ish (secret) | None | Legacy | **Remove or heavily restrict** — unauthorized risk |
| `/api/admin/fresh-batch/requests` | List + bulk-update fresh batch requests. | `fresh_batch_requests` | Update status, owner notes | `requireAdminSession` | Moves requests through workflow | Active but incomplete | Add audit log + individual PATCH |
| `/api/admin/fresh-batch/reservations` | Create reservation + Square payment link. | `fresh_batch_requests`, `batch_campaigns`, `batch_reservations` | Insert reservation, call Square | `requireAdminSession` | Creates paid customer obligation | Active but incomplete | Add audit log + idempotency guard |

---

## 3. Route Classification Summary

| Classification | Count | Routes |
|---|---|---|
| Active and verified | 6 | `/admin`, `/admin/login`, `/admin/products`, `/admin/menus`, `/api/admin/auth/*`, `/api/admin/products` |
| Active but incomplete | 16 | Most operational pages (orders, markets, inventory, customers, emails, campaigns, coupons, settings) plus new fresh-batch API routes |
| Duplicate | 3 | Auth helpers (`lib/auth/unified-admin.ts`, `lib/admin-session.ts`, `lib/admin-auth-middleware.js`); `/api/admin/markets` double-checks `requireAdmin` after `requireAdminSession` |
| Legacy | 4 | `/admin/waitlist`, `/api/admin/notifications`, `/api/admin/setup`, `/admin/setup` |
| Placeholder | 8 | `/admin/analytics`, `/admin/reviews`, `/admin/queue`, `/admin/interactions`, `/admin/errors`, `/admin/market-setup`, `/admin/market-day`, `/admin/fresh-batches/planner` |
| Broken | 0 | None identified |
| Unlinked | 2 | `/admin/fresh-batches`, `/admin/fresh-batches/planner` |
| Unauthorized risk | 1 | `/api/admin/emergency-init` (public-ish admin creation) |
| Safe to remove | 1 | `/api/admin/emergency-init` if not required; otherwise gate behind strong secret + one-time use |
| Owner decision required | 2 | Whether to keep `/admin/setup` and `/api/admin/emergency-init`; whether to build or remove placeholder pages |

---

## 4. Authentication and Authorization Narrative

### 4.1 How admin auth works

1. **Login** (`/api/admin/auth/login`) validates email/password against `admin_users` and issues a 7-day `admin_token` HTTP-only cookie.
2. **Session verification** reads the cookie, verifies the JWT with `jose`, and checks the admin still exists and is active in `admin_users`.
3. **CSRF** is issued as a non-HTTP-only `admin_csrf` cookie and must be sent in `x-csrf-token` for mutations via `adminFetch`.
4. **Role check** currently only validates `admin` or `super_admin` in most routes; `editor`/`viewer` roles are defined in `lib/security/index.ts` but rarely used.

### 4.2 Authorization risks

| Risk | Evidence | Mitigation |
|---|---|---|
| Role hierarchy unused | Only `admin`/`super_admin` tokens are accepted by `verifyAdminToken`; `editor`/`viewer` roles in `lib/security/index.ts` cannot log in. | Extend login to issue role-aware tokens; use `withAdminMiddleware` + `PERMISSIONS` on all routes. |
| Two session modules | `lib/auth/unified-admin.ts` and `lib/admin-session.ts` both verify `admin_token` but use different secret-strength checks. | Pick one module, delete or re-export the other as a thin alias. |
| `super_admin` vs `admin` no difference | Most routes treat both roles equally; only `/api/admin/products` uses granular permissions. | Apply RBAC consistently; reserve `admins:manage` and integration settings for `super_admin`. |
| Unlinked fresh-batch pages | `app/admin/layout.js` navigation array does not include Fresh Batches. | Add nav entry after planner is functional. Until then, link from dashboard. |
| Public setup routes | `/api/admin/setup` and `/api/admin/emergency-init` can create admins. | Gate by setup token / one-time flag; remove after onboarding. |
| No admin audit-log viewer | `audit_logs` collection is written but no `/admin/audit-logs` page exists. | Build audit-log viewer limited by role. |

### 4.3 Recommended auth cleanup (post-fresh-batch)

1. Delete or deprecate `lib/admin-session.ts` and `lib/admin-auth-middleware.js`; re-export everything from `lib/auth/unified-admin.ts`.
2. Make `lib/middleware/admin.ts` use `requireAdminSession` from `lib/auth/unified-admin.ts` instead of `lib/admin-session.ts`.
3. Add `BATCH_REQUESTS_VIEW`, `BATCH_REQUESTS_UPDATE`, `BATCH_CREATE`, `BATCH_RESERVE`, and `PAYMENT_LINK_CREATE` permissions to `lib/security/index.ts`.
4. Apply `withAdminMiddleware` to `/api/admin/fresh-batch/*` with the new permissions.
5. Remove `/api/admin/emergency-init` from production builds or protect with a strong one-time setup secret.
6. Add Fresh Batches to `app/admin/layout.js` navigation once the planner UI is complete.

---

## 5. Fresh Batch Admin Surface Assessment

| Surface | Status | Risk | Next action |
|---|---|---|---|
| `/admin/fresh-batches` | Active but incomplete | Unlinked; no status actions in UI | Add sidebar link; add approve/defer/reject buttons |
| `/admin/fresh-batches/planner` | Placeholder | Owner cannot visually create batches | Build planner UI using existing API |
| `/api/admin/fresh-batch/requests` | Active but incomplete | No audit logging on PATCH | Add `batch_audit_log` writes |
| `/api/admin/fresh-batch/reservations` | Active but incomplete | No idempotency key on Square call beyond reservation ID; email failure logged but not surfaced | Add audit log; add queue retry for failed confirmation emails |
| Data model | Active and verified | New collections created lazily | Run optional index migration before production |

---

## 6. Conclusion

The admin control plane is functional but fragmented. The fresh-batch work added the right backend primitives (data model, decision engine, request API, reservation API) but the admin UX is only half-built. Before production:

1. Link `/admin/fresh-batches` in the sidebar.
2. Add audit logging to every fresh-batch admin mutation.
3. Build the batch planner UI or remove the placeholder route.
4. Standardize auth on `lib/auth/unified-admin.ts` and RBAC permissions.
5. Remove or restrict `/api/admin/emergency-init`.
