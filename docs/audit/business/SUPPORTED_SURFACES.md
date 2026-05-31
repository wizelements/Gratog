# SUPPORTED SURFACES — Boringly Reliable Cut

Every customer- or admin-facing surface is classified.

## SUPPORTED — relied on for revenue, trust, or daily ops

| Surface | Notes |
| --- | --- |
| `GET /` (home), `GET /catalog`, `GET /product/[slug]` | Customer storefront |
| `GET /checkout` | Canonical guest checkout |
| `POST /api/orders/create` | Server-authoritative pricing (lib/cart-pricing) |
| `POST /api/payments` | Sole payment authority; paid-once side effects |
| `GET  /api/payments/status/[id]` | Order/payment status (signed-token auth) |
| `POST /api/webhooks/square` | Square webhook handler |
| `POST /api/webhooks/resend` | Resend delivery event handler |
| `POST /api/contact` | Contact form (restored this iteration) |
| `GET/POST /api/unsubscribe` | One-click unsubscribe (restored this iteration) |
| `GET /admin/*` (excluding `/admin/login`) | Admin app, JWT-gated by middleware |
| `POST /api/admin/auth/login`, `/logout`, `/me`, `/reset-password` | Admin auth |
| `GET /api/admin/orders`, `/api/admin/inventory/*`, `/api/admin/products/*` | Daily admin ops |
| `GET /api/cron/cleanup-locks`, `/api/cron/daily-report` | CRON_SECRET protected |

## HIDDEN in production

| Surface | Mechanism |
| --- | --- |
| `GET /api/debug/square` | `NODE_ENV === 'production'` returns 404 |
| `GET /api/square/diagnose` | `blockInProduction()` + admin session |
| `GET /api/square/validate-token` | `blockInProduction()` + admin session |
| `GET /api/square/test-rest` | `NODE_ENV === 'production'` returns 404 |
| `GET /api/startup` | `blockInProduction()` returns 404 |
| `GET /diagnostic` (page) | Should be moved behind admin auth; currently dev only |
| `GET /test-auth` (page) | Should be moved behind admin auth; currently dev only |

## DEPRECATED — return HTTP 410 Gone

| Surface | Replaced by |
| --- | --- |
| `GET/POST /api/checkout` | `/api/orders/create` + `/api/payments` |
| `GET/POST /api/create-checkout` | `/api/orders/create` + `/api/payments` |
| `GET/POST /api/pay/process` | `/api/payments` |

All three respond with `410 Gone`, `Deprecation: true`, `Sunset`, and a
`Link: <successor>; rel="successor-version"` header.

## DEFERRED — intentionally absent until a later iteration

See `scripts/_route-coverage-allowlist.json` for the authoritative list with
reasons. Highlights:

- Customer accounts (`/account/*`, `/api/auth/*`, `/api/user/*`)
- Quiz (`/quiz`, `/api/quiz`)
- Learning modules (`/learning`, `/api/learning`)
- Subscriptions (`/api/subscriptions`)
- Passport scan/stamp (`/api/passport*`, `/api/rewards/stamp`)
- Queue admin (`/api/queue/*`)
- UGC (`/api/ugc/*`)
- Notifications subsystem (`/api/notifications`)
- AI campaigns (`/api/ai/campaigns`)
- Waitlist (`/api/waitlist`)
- Tier-2 trust loops: newsletter (`/api/newsletter/*`, `/api/nurture/*`),
  reviews (`/api/reviews*`), recommendations (`/api/recommendations`),
  coupon admin (`/api/coupons/*`), abandoned-cart cron
  (`/api/cron/cleanup-abandoned-orders`)
- Tier-2 conversion: Apple Pay / Google Pay button, music opt-in

## REMOVED

- `@sendgrid/mail` dependency (removed in `e834a81b` on `main` before this
  branch — Resend is the sole transactional provider).

## Enforcement

`npm run check:routes` parses every `<Link>`, `<a href>`, `router.push`,
`redirect`, and `fetch` call in the source tree and fails if a referenced
internal route is neither implemented nor allowlisted. It currently exits
0 (clean) on this branch. CI should run it before every preview deploy.
