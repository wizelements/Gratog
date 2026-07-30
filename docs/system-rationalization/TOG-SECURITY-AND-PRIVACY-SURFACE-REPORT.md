# TOG-SECURITY-AND-PRIVACY-SURFACE-REPORT.md

Taste of Gratitude — Security and Privacy Surface Report

Generated: 2026-07-29 19:29 EDT
Authority: Native Termux workspace
Status: Based on code inventory and prior audit reports; live penetration testing blocked.

---

## 1. Authentication Surface

| System | Mechanism | Risk | Status |
|--------|-----------|------|--------|
| Admin auth | Edge JWT (`jose`) + CSRF + rate limit | Low | Active |
| Customer auth | JWT cookie (`lib/auth/jwt.js`) | Medium | Partial/broken per Phase 0 |
| Order access token | Signed token for guest order lookup | Low | Active |
| Preorder token | Signed token for confirm/cancel | Low | Active |
| API tokens | ADMIN_API_TOKEN, MASTER_API_KEY, CRON_SECRET, etc. | Medium | Multiple tokens, some public |

### Risks
- Multiple admin auth implementations may have inconsistent behavior.
- `unified-admin.ts` uses SHA-256 while login uses bcrypt — password hash mismatch.
- `NEXT_PUBLIC_ADMIN_API_KEY` exposes admin API key name to browser (value not exposed).

## 2. Authorization Surface

| Route Group | Auth Required | Notes |
|-------------|---------------|-------|
| `/api/admin/*` | Admin session/token | Generally protected |
| `/api/cron/*` | CRON_SECRET | Protected |
| `/api/webhooks/*` | Signature/HMAC | Protected |
| `/api/debug/*`, `/api/square/diagnose` | Blocked in production | Good |
| Untracked `/api/admin/sanitize*`, `/api/token-status` | Unknown | Must verify auth |

### Risks
- Untracked sanitization and token-status routes may lack proper auth or may be diagnostic routes that should be blocked in production.

## 3. Data Exposure Surface

| Data | Exposure | Control |
|------|----------|---------|
| Customer PII (email, phone, address) | Database, order records | Encrypted in transit; access controlled |
| Order details | API with access token | Token-based lookup |
| Square secrets | Server env only | Not exposed to browser |
| Resend API key | Server env only | Not exposed to browser |
| Telegram token | Server env only | Not exposed to browser |
| Admin API key | Server + public name | Verify value is not public |

### Risks
- Debug/diagnostic JSON files in working tree (`catalog.json`, `create-order.json`, `payment-response.json`, etc.) may contain sensitive data and should not be committed.

## 4. Webhook Security

| Webhook | Signature | Replay Protection | Status |
|---------|-----------|-------------------|--------|
| Square | HMAC-SHA256 | Event deduplication | Active |
| Resend | RESEND_WEBHOOK_SECRET | Unknown | Active |

### Risks
- `SQUARE_SKIP_WEBHOOK_VERIFICATION` must remain unset in production.

## 5. Input Validation

| Area | Validation | Risk |
|------|------------|------|
| Product updates | Partial whitelist | CRIT-002 from ADMIN_AUDIT_REPORT: PUT `/api/admin/products` spreads updates without strict whitelist |
| Inventory adjustment | Client-driven adjustment | Race condition risk |
| Cart/checkout | Zod validation exists | Generally good |
| Contact form | Basic validation | Low risk |

## 6. Privacy Compliance

| Concern | Status |
|---------|--------|
| Privacy policy | `/privacy` exists |
| Terms | `/terms` exists |
| Cookie consent | `CookieConsent.tsx` exists |
| Unsubscribe | `/unsubscribe` + `/api/unsubscribe` exists |
| SMS consent | Removed with no-SMS remediation |
| Data retention | Not explicitly documented |

## 7. Recommended Security Actions

1. Verify auth on all untracked admin routes (`sanitize`, `token-status`).
2. Fix admin password hash mismatch (SHA-256 vs bcrypt).
3. Add strict input whitelist to product update API.
4. Move inventory adjustment calculation server-side with atomic operations.
5. Remove or secure debug/diagnostic JSON files in working tree.
6. Audit Vercel env for `SQUARE_SKIP_WEBHOOK_VERIFICATION`, `ALLOW_SANDBOX_PRODUCTS`, `NEXT_PUBLIC_ENABLE_DEMO_PRODUCTS`.
7. Add unique index on `users.email`.

---

*Next: TOG-ARCHIVE-CANDIDATE-REPORT.md*
