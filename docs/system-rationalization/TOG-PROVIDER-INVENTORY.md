# TOG-PROVIDER-INVENTORY.md

Taste of Gratitude — Provider Inventory

Generated: 2026-07-29 19:08 EDT
Authority: Native Termux workspace
Status: Partial — live provider verification blocked by degraded runtime.

---

## 1. Active / Verified Providers

### 1.1 Square
- **Purpose:** Payment processing, order creation, catalog lookup, webhook events.
- **Env vars:** SQUARE_ACCESS_TOKEN, SQUARE_APPLICATION_ID / NEXT_PUBLIC_SQUARE_APPLICATION_ID, SQUARE_LOCATION_ID / NEXT_PUBLIC_SQUARE_LOCATION_ID, SQUARE_ENVIRONMENT, SQUARE_WEBHOOK_SIGNATURE_KEY.
- **Code locations:** `lib/square.ts`, `lib/square-api.ts`, `app/api/payments/route.ts`, `app/api/orders/create/route.js`, `app/api/webhooks/square/*`, `app/api/square/*`, `components/checkout/SquarePaymentForm*.tsx`.
- **Status:** Active production environment.
- **Evidence:** 2026-07-28 payment verification — `/api/health/payments` reports healthy; production location `L66TVG6867BG9` is ACTIVE; order creation via `/api/orders/create` succeeded.
- **Mission value:** Critical (P0) — revenue depends on Square.
- **Cost:** Transaction fees only (no fixed monthly cost from Square for standard processing).

### 1.2 Resend
- **Purpose:** Transactional and marketing email; owner-alert fallback.
- **Env vars:** RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_WEBHOOK_SECRET.
- **Code locations:** `lib/resend-email.js`, `lib/email/service.js`, `lib/email/resend-client.js`, `lib/owner-alerts.ts`, `app/api/webhooks/resend/route.js`.
- **Status:** Active.
- **Evidence:** 2026-07-28 alerts verification — test email accepted with message ID `5d1c5937-aa83-4d50-9d6c-0e1c40d6be99`; `RESEND_FROM_EMAIL` is verified `hello@tasteofgratitude.shop`.
- **Mission value:** High (P1) — customer confirmations and owner alerts.
- **Cost:** Usage-based email volume.

### 1.3 Telegram (cloud bot)
- **Purpose:** Owner alerts (primary channel).
- **Env vars:** TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, NEXT_PUBLIC_TELEGRAM_BOT_USERNAME, NEXT_PUBLIC_TELEGRAM_CHANNEL_URL.
- **Code locations:** `lib/owner-alerts.ts`, `app/telegram-alerts/page.tsx`, `scripts/tog-telegram-notify.js`.
- **Status:** Active.
- **Evidence:** 2026-07-28 alerts verification — test message delivered (message ID `111`).
- **Mission value:** High (P1) — instant owner notifications.
- **Cost:** Free for cloud bot messages.

### 1.4 MongoDB
- **Purpose:** Application database (orders, customers, menus, inventory, alerts, etc.).
- **Env vars:** MONGODB_URI, MONGO_URL, DATABASE_NAME, DB_NAME.
- **Code locations:** `lib/database.ts`, `lib/db-optimized.ts`, `lib/db-client.js`, `lib/db-admin.js`, `lib/db-customers.js`, `lib/db/users.js`, `lib/models/QueuePosition.js`.
- **Status:** Active.
- **Evidence:** 2026-07-28 alerts verification — DB reachable; collections queried.
- **Mission value:** Critical (P0) — order and customer persistence.
- **Cost:** MongoDB Atlas or similar (cloud-hosted; exact tier unknown).

### 1.5 Vercel
- **Purpose:** Hosting, serverless functions, edge caching, cron, preview deployments.
- **Env vars:** VERCEL_URL, VERCEL_ENV, VERCEL_PROJECT_ID, VERCEL_TOKEN.
- **Code locations:** `vercel.json`, `next.config.*`.
- **Status:** Active.
- **Evidence:** Production deployment READY; domain resolves; CLI authenticated.
- **Mission value:** Critical (P0) — public site and API runtime.
- **Cost:** Pro plan likely (multiple domains, cron, team).

---

## 2. Referenced but Unverified Providers

### 2.1 Sentry
- **Purpose:** Error tracking and performance monitoring.
- **Env vars:** NEXT_PUBLIC_SENTRY_DSN, SENTRY_AUTH_TOKEN.
- **Code locations:** `lib/error-tracker.ts`, dependency `@sentry/nextjs`.
- **Status:** Referenced; actual ingestion unverified.
- **Mission value:** Medium (P2) — observability.
- **Cost:** Free tier possible; paid if volume high.

### 2.2 PostHog
- **Purpose:** Product analytics.
- **Env vars:** NEXT_PUBLIC_POSTHOG_KEY, NEXT_PUBLIC_POSTHOG_HOST.
- **Code locations:** `lib/analytics.ts`, `lib/analytics-events.js`, `lib/unified-analytics.js`.
- **Status:** Referenced; actual event firing unverified.
- **Mission value:** Low-Medium (P3) — growth analytics.
- **Cost:** Free tier possible; paid at volume.

### 2.3 Google Analytics
- **Purpose:** Web analytics.
- **Env vars:** NEXT_PUBLIC_GTAG_ID / NEXT_PUBLIC_GA_ID.
- **Code locations:** `lib/ga4-analytics.js`.
- **Status:** Referenced; unverified.
- **Mission value:** Low-Medium (P3).
- **Cost:** Free.

### 2.4 Redis / Upstash
- **Purpose:** Caching, idempotency, queue.
- **Env vars:** REDIS_URL, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN.
- **Code locations:** `lib/redis.ts`, `lib/redis-idempotency.ts`, `lib/cache.ts`.
- **Status:** Referenced; production usage unverified.
- **Mission value:** Medium (P2) — performance and idempotency.
- **Cost:** Upstash has free/paid tiers.

### 2.5 Instagram
- **Purpose:** Social feed / post display.
- **Env vars:** INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ACCOUNT_ID, INSTAGRAM_WEBHOOK_VERIFY_TOKEN.
- **Code locations:** `app/api/instagram/*`, `app/(site)/instagram/*`, `components/InstagramFeed.jsx`.
- **Status:** Referenced; live feed unverified.
- **Mission value:** Medium (P1) — customer communication and social proof.
- **Cost:** Free if using basic API.

### 2.6 OpenAI
- **Purpose:** AI newsletter / campaign content generation.
- **Env vars:** OPENAI_API_KEY.
- **Code locations:** `lib/ai-newsletter.js`, `lib/campaign-manager.js`.
- **Status:** Referenced; usage unverified.
- **Mission value:** Low (P3) — marketing automation.
- **Cost:** Usage-based; potentially unnecessary expense.

---

## 3. Inactive / Deprecated Providers

### 3.1 Twilio (SMS)
- **Purpose:** SMS (historical).
- **Env vars:** TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, STAFF_PHONE.
- **Code locations:** Multiple references in lib/ and app/; no-SMS remediation removed operational use.
- **Status:** **Inactive**. `.env.example` explicitly notes Twilio removed and `STAFF_PHONE` ignored.
- **Mission value:** None currently.
- **Recommendation:** Archive SMS code and remove Twilio env vars after confirming no dependency.

### 3.2 ShipEngine / EasyPost
- **Purpose:** Shipping rate calculation.
- **Env vars:** SHIPENGINE_API_KEY, SHIPENGINE_CARRIER_IDS, EASYPOST_API_KEY, SHIPPING_FROM_* / SHIPPING_ORIGIN_*.
- **Code locations:** `lib/shipping-service.ts`, `app/api/shipping/rates/route.ts`.
- **Status:** Referenced; shipping is a low-usage feature for a local-focused business.
- **Mission value:** Low (P3) — only if national shipping is operationally approved.
- **Recommendation:** Evaluate whether shipping should remain public; consider archiving if not actively used.

### 3.3 Stripe
- **Purpose:** Subscription box placeholders.
- **Env vars:** STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY, STRIPE_GRATITUDE_BOX_PRICE_ID.
- **Code locations:** `app/api/subscriptions/gratitude-box/route.ts`, `lib/subscription-practical.ts`.
- **Status:** Referenced but Square is primary payment provider.
- **Mission value:** Low (P3) — future subscription box only.
- **Recommendation:** Archive Stripe integration until subscription box is operationally ready.

### 3.4 PagerDuty / Slack / generic monitoring webhooks
- **Purpose:** Incident alerting / monitoring.
- **Env vars:** PAGERDUTY_TOKEN, PAGERDUTY_ROUTING_KEY, SLACK_WEBHOOK_URL, SLACK_WEBHOOK, SLACK_ALERT_WEBHOOK, CRITICAL_ALERT_WEBHOOK, MONITORING_WEBHOOK_URL, ERROR_MONITORING_URL.
- **Code locations:** `lib/smart-alerting.ts`, `lib/health-monitor.ts`, `lib/monitoring*.ts`.
- **Status:** Referenced; unverified and likely dormant.
- **Mission value:** Low-Medium (P2) — operational alerting.
- **Recommendation:** Consolidate or remove unused webhook env vars.

---

## 4. Provider Cost Matrix

| Provider | Fixed Cost | Usage Cost | Mission Value | Recommendation |
|----------|------------|------------|---------------|----------------|
| Square | None | Transaction % | P0 Critical | Keep |
| Resend | None | Per email | P1 High | Keep |
| Telegram | None | None | P1 High | Keep |
| MongoDB | Atlas tier | Storage/ops | P0 Critical | Keep |
| Vercel | Pro plan | Bandwidth/functions | P0 Critical | Keep |
| Sentry | Free/paid | Events | P2 Medium | Verify or disable |
| PostHog | Free/paid | Events | P3 Low | Verify or disable |
| Google Analytics | Free | None | P3 Low | Keep if used |
| Redis/Upstash | Free/paid | Ops | P2 Medium | Verify usage |
| Instagram API | Free | None | P1 Medium | Verify feed |
| OpenAI | None | Tokens | P3 Low | Disable if unused |
| Twilio | N/A | N/A | None | Remove/archive |
| ShipEngine/EasyPost | Possible | Per rate | P3 Low | Archive if unused |
| Stripe | None | Transaction % | P3 Low | Archive until needed |
| PagerDuty/Slack | Possible | None | P2 Low | Verify or remove |

---

## 5. Provider Duplication

| Concern | Providers | Authority | Action |
|---------|-----------|-----------|--------|
| Payments | Square, Stripe | Square | Archive Stripe payment code |
| Shipping rates | ShipEngine, EasyPost | Unknown | Pick one or archive both if shipping not active |
| Analytics | PostHog, GA, Sentry | Unknown | Consolidate to one primary analytics provider |
| Cache | Redis, Upstash | Unknown | Consolidate to one cache backend |
| Monitoring webhooks | Slack, PagerDuty, generic URLs | Unknown | Consolidate or remove |

---

*Next: TOG-ENV-VARIABLE-INVENTORY.md*
