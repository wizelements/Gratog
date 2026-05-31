# ADMIN_JOURNEY_MAP — Gratog Platform

> Code-verified at commit `f9d20e98`. Admin entry point: `/admin/login`. All other `/admin/**` paths gated by [middleware.ts](file:///data/data/com.termux/files/home/Gratog-live/middleware.ts).

## 1. Admin pages (27) + backing APIs

| Page | API existing? | Status |
|---|---|---|
| `/admin/login` | `/api/admin/auth/csrf`, `/api/admin/auth/login` ✅ | ✅ Working |
| `/admin/forgot-password` | `/api/admin/auth/reset-password` ❌ | ❌ Broken |
| `/admin/reset-password` | same ❌ | ❌ Broken |
| `/admin` (dashboard) | `/api/admin/analytics` ✅ | ✅ |
| `/admin/analytics` | `/api/admin/analytics` ✅ | ✅ |
| `/admin/products` | `/api/admin/products` ✅ | ✅ |
| `/admin/products/[id]` | `/api/admin/products/[id]` ✅ | ✅ |
| `/admin/inventory` | `/api/admin/inventory/[productId]` ✅ but **`/api/admin/inventory` list ❌ missing** | ⚠️ List view broken |
| `/admin/orders` | `/api/admin/orders` ✅; `/sync` ❌; `/update-status` ❌; `[id]/refund` ✅ | ⚠️ Sync + bulk-update broken |
| `/admin/customers` | `/api/admin/customers` (+ `[id]`) ✅ | ✅ |
| `/admin/coupons` | `/api/admin/coupons` (+ `[id]`) ✅ | ✅ (admin); ❌ public `/api/coupons/create`, `/validate` missing |
| `/admin/campaigns`, `/admin/campaigns/new` | `/api/admin/campaigns`, `/send` ✅; `/generate`, `/test` ❌ | ⚠️ Compose works, generate/test broken |
| `/admin/reviews` | `/api/admin/reviews` ✅ | ✅ |
| `/admin/interactions` | `/api/admin/interactions` ❌ | ❌ Broken |
| `/admin/markets`, `/admin/market-day`, `/admin/market-setup` | `/api/admin/markets`, `/seed` ✅ | ✅ |
| `/admin/queue` | `/api/queue/active` ❌, `/update` ❌ | ❌ Broken |
| `/admin/waitlist` | `/api/waitlist` ❌ | ❌ Broken |
| `/admin/errors` | `/api/errors/list`, `/summary` ✅ | ✅ |
| `/admin/qr-generator` | n/a (client only) | ✅ |
| `/admin/square-oauth` | `/api/oauth/square/*` ✅ | ✅ |
| `/admin/setup` | `/api/admin/setup`, `/emergency-init` ✅ | ✅ |
| `/admin/settings` | (no dedicated API found) | ⚠️ Partial |

## 2. Capability matrix

| Capability | Working | Missing |
|---|---|---|
| Products: list/create/edit/delete | ✅ | — |
| Inventory: per-product edit | ✅ | List view (sync across catalog) |
| Orders: list, view, refund | ✅ | bulk sync from Square, bulk status update |
| Users / customers | ✅ | — |
| Coupons (admin) | ✅ | public validation, customer-side application |
| Campaigns | ⚠️ | AI-generate, test-send |
| Newsletter | ❌ | public subscribe + admin list mgmt |
| Rewards (admin view) | ⚠️ | no dedicated admin rewards page (rewards data viewable via customers) |
| Analytics | ✅ | unified dashboard limited |
| Reports | ✅ (daily cron) | on-demand reports limited |
| Reviews | ✅ | public submission/helpful APIs missing |
| Settings | ⚠️ | site-config edit unclear |
| Email (compose/send) | ✅ (campaigns) | per-customer email send |
| Notifications | ⚠️ | broadcast/send/stats APIs missing |
| Waitlist | ❌ | API missing |
| Queue mgmt | ❌ | API missing |
| Returns | ⚠️ | `/api/returns/create` exists; `/api/returns` list missing |

## 3. Expected vs actual flows

### Orders flow

```diagram
 Customer pays
   │
   ▼
 orders.paymentStatus = 'paid'
   │
   ▼
 Square webhook → /api/webhooks/square ✅
   │
   ▼ (intended)
 Admin: /admin/orders → click "Sync with Square"
   │
   ▼
 POST /api/admin/orders/sync  ❌  MISSING
```

**Result:** Manual sync impossible; admin sees only what passive webhook delivered.

### Campaigns flow

```diagram
 Admin: /admin/campaigns/new
   ├─ "Generate with AI"  → POST /api/admin/campaigns/generate ❌
   ├─ "Send test"         → POST /api/admin/campaigns/test     ❌
   └─ "Send to list"      → POST /api/admin/campaigns/send     ✅
```

**Result:** Test-send broken; AI-assist broken; send-to-list works.

### Notifications flow

```diagram
 Admin: /admin (or /admin/customers/[id])
   ├─ Broadcast          → /api/admin/notifications/broadcast    ❌
   ├─ Send single        → /api/admin/notifications/send         ❌
   ├─ Market day push    → /api/admin/notifications/market-day   ❌
   ├─ New product push   → /api/admin/notifications/new-product  ❌
   └─ Stats              → /api/admin/notifications/stats        ❌
```

**Result:** Notifications subsystem (admin facet) is entirely non-functional. Only `/api/notifications` (read) exists.

### Reset-password flow

```diagram
 /admin/forgot-password → POST /api/admin/auth/reset-password ❌
```

**Result:** Admin password reset is impossible. The only recovery is rotating `ADMIN_API_KEY` env var on Vercel.

## 4. Missing admin capabilities (gaps versus typical commerce admin)

- No site-wide "feature flag" admin.
- No A/B test admin.
- No vendor portal admin (vendor queue page exists but no admin view).
- No SEO content admin (`/api/seo/analyze` exists but no UI).
- No bulk image processor admin.

## 5. Unreachable features

- `/api/storefront/square-catalog` (manual sync) exists but no admin button found.
- `/api/instagram/sync` exists; no UI exposure.
- `/api/oauth/square/status` exists, used by `/admin/square-oauth`.

## 6. Defects

| Sev | Defect |
|---|---|
| 🔴 Critical | `/admin/orders` cannot sync or bulk-update statuses. |
| 🔴 Critical | `/admin/forgot-password` is dead. Admin lockout = env rotation. |
| 🟠 High | `/admin/queue`, `/admin/waitlist`, `/admin/interactions` dead. |
| 🟠 High | Notifications admin entirely broken. |
| 🟡 Medium | Campaign generate/test buttons broken. |
| 🟡 Medium | Inventory list view broken. |
