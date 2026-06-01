# Final Validation Report — v1.0-boringly-reliable

**Date:** 2026-06-01
**Production deployment:** `gratog-6himwzv35`
**Production commit:** `0605c879`
**Docs commit (prior):** `46e49df6`

## Post-index production curl matrix

All requests issued without auth headers from a clean client.

| URL | Got | Expected | Result |
| --- | :---: | :---: | :---: |
| `https://tasteofgratitude.shop/` | 200 | 200 | ✅ |
| `/api/debug/square` | 404 | 404 | ✅ |
| `/api/square/diagnose` | 404 | 404 | ✅ |
| `/api/square/test-rest` | 404 | 404 | ✅ |
| `/api/square/validate-token` | 404 | 404 | ✅ |
| `/api/startup` | 404 | 404 | ✅ |
| `/api/pay/process` | 410 | 410 | ✅ |
| `/api/checkout` | 410 | 410 | ✅ |
| `/api/create-checkout` | 410 | 410 | ✅ |
| `/api/admin/auth/me` | 401 (`ADMIN_AUTH_REQUIRED`) | 401 | ✅ |
| `/api/admin/inventory` | 401 (`ADMIN_AUTH_REQUIRED`) | 401 | ✅ |
| `/api/contact` (GET, method check) | 405 | 4xx (method not allowed) | ✅ |
| `/api/unsubscribe` (no token) | 400 | 4xx | ✅ |

Security headers on the 401 responses include `strict-transport-security`,
`x-frame-options: DENY`, `x-content-type-options: nosniff`,
`permissions-policy: camera=(), microphone=(), geolocation=(self), payment=(self)`.

## Blocker status summary

| Blocker | State |
| --- | --- |
| 1. Admin key audit | ✅ Keys absent from runtime, all references fail-closed or dead code |
| 2. Database index verification | ✅ All four release-critical collections have required indexes |
| 3. Post-index curl matrix | ✅ Matches expected matrix |
| 4. Real production order verification | ❌ **No paid order has flowed through since deploy.** Cannot verify `paidEffectsAppliedAt`, reward idempotency, or email send under live conditions |
| 5. Customer LTV audit | ✅ Zero drift detectable; canonical LTV collection absent — documented as non-blocking investigation |
| 6. Final scorecard | See FINAL_SCORECARD.md |

## Outstanding release-shipping risks

1. **Resend domain not verified.** All three production
   `email_sends` records from 2026-06-01 returned the same Resend
   error: *"The tasteofgratitude.shop domain is not verified."* Means
   transactional order-confirmation emails would also fail. This is
   not the email observability code's fault — it is correctly logging
   the failure — but it is a customer-visible defect.
2. **Untested live payment path.** The new
   `paidEffectsAppliedAt` claim, the reward unique index, and the
   confirmation email write have zero real-production exposures since
   the 2026-05-30 deploy.

Both risks are blocking. See FINAL_SCORECARD.md.
