# TOG-ENV-VARIABLE-INVENTORY.md

Taste of Gratitude — Environment Variable Inventory

Generated: 2026-07-29 19:10 EDT
Authority: Native Termux workspace
Status: Names only; values not exposed.

---

## 1. Summary

- **Unique env vars referenced in code:** ~190
- **Env vars configured in Vercel project:** 49 (with duplicates and legacy names)
- **Primary concern:** sprawl, duplication, and references to inactive providers.

## 2. Categories

### 2.1 Application / URL
| Var | Purpose | Notes |
|-----|---------|-------|
| NEXT_PUBLIC_APP_URL | Public app URL | Duplicate names in Vercel env list |
| NEXT_PUBLIC_BASE_URL | Public base URL | Most frequently referenced (46x) |
| NEXT_PUBLIC_SITE_URL | Public site URL | |
| BASE_URL | Internal base URL | |
| TOG_SITE_URL | Internal site URL | |
| PRODUCTION_URL | Production URL | |
| ROOT_DOMAIN | Root domain | |
| VERCEL_URL | Vercel deployment URL | |
| VERCEL_ENV | Vercel environment | |
| NEXT_PUBLIC_VERCEL_ENV | Public Vercel env | |
| NODE_ENV | Environment | |
| VERCEL | Vercel flag | |
| NEXT_PHASE | Next.js build phase | |

### 2.2 Square / Payments
| Var | Purpose | Notes |
|-----|---------|-------|
| SQUARE_ACCESS_TOKEN | Square API token | 23 references |
| SQUARE_APPLICATION_ID | Square app ID | |
| NEXT_PUBLIC_SQUARE_APPLICATION_ID | Public Square app ID | 11 references |
| NEXT_PUBLIC_SQUARE_APP_ID | Alias | |
| NEXT_PUBLIC_SQUARE_SANDBOX_APPLICATION_ID | Sandbox app ID | |
| SQUARE_LOCATION_ID | Square location ID | 16 references |
| NEXT_PUBLIC_SQUARE_LOCATION_ID | Public location ID | |
| SQUARE_ENVIRONMENT | production/sandbox | 23 references |
| SQUARE_MOCK_MODE | Mock mode flag | |
| SQUARE_WEBHOOK_SIGNATURE_KEY | Webhook signature | |
| SQUARE_WEBHOOK_SECRET | Alias | |
| SQUARE_SKIP_WEBHOOK_VERIFICATION | Dangerous dev flag | Must never be true in production |
| SQUARE_CLIENT_SECRET | OAuth secret | |
| SQUARE_ALLOWED_ORIGINS | CORS origins | |
| SQUARE_CHAT_WEBHOOK_URL | Chat webhook | |
| SQUARE_TEAM_EMAIL | Team email | |
| SQUARE_PLAN_* | Subscription plan IDs | 4 vars (starter sips, glow getters, recovery duo, daily gel) |

### 2.3 MongoDB / Database
| Var | Purpose | Notes |
|-----|---------|-------|
| MONGODB_URI | MongoDB connection | 22 references |
| MONGO_URL | Alias | 10 references |
| DATABASE_NAME | DB name | |
| DB_NAME | Alias | |

### 2.4 Resend / Email
| Var | Purpose | Notes |
|-----|---------|-------|
| RESEND_API_KEY | Resend API key | 14 references |
| RESEND_FROM_EMAIL | From address | 9 references |
| RESEND_WEBHOOK_SECRET | Resend webhook secret | |
| ALERT_EMAIL | Owner alert email | |
| STAFF_EMAIL | Staff email | |
| SUPPORT_EMAIL | Support email | |
| CONTACT_EMAIL | Contact email | |
| PRIVACY_EMAIL | Privacy contact | |
| WHOLESALE_EMAIL | Wholesale inquiries | |

### 2.5 Telegram / Owner Alerts
| Var | Purpose | Notes |
|-----|---------|-------|
| TELEGRAM_BOT_TOKEN | Bot token | |
| TELEGRAM_CHAT_ID | Owner chat ID | |
| NEXT_PUBLIC_TELEGRAM_BOT_USERNAME | Public bot name | |
| NEXT_PUBLIC_TELEGRAM_CHANNEL_URL | Public channel URL | |

### 2.6 Admin / Auth
| Var | Purpose | Notes |
|-----|---------|-------|
| JWT_SECRET | JWT signing | 12 references |
| ADMIN_API_TOKEN / ADMIN_API_KEY | Admin API auth | Duplicated/aliased |
| NEXT_PUBLIC_ADMIN_API_KEY | Public admin key | |
| ADMIN_SETUP_SECRET | Setup route auth | |
| ADMIN_SETUP_DISABLED | Disable setup | |
| EMERGENCY_ADMIN_SECRET | Emergency access | |
| EMERGENCY_INIT_DISABLED | Disable emergency init | |
| INIT_SECRET | System init secret | |
| ADMIN_DEFAULT_EMAIL | Default admin email | |
| ADMIN_DEFAULT_PASSWORD | Default admin password | |
| ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME | Legacy setup | |
| ADMIN_E2E_EMAIL / ADMIN_E2E_PASSWORD | Test credentials | |
| ORDER_ACCESS_TOKEN_SECRET | Order lookup token | |
| ORDER_ACCESS_TOKEN_ENFORCED | Enforce token | |
| PREORDER_TOKEN_SECRET | Preorder token | |
| PREORDER_STAFF_KEY | Preorder staff key | |
| UNSUBSCRIBE_SECRET | Unsubscribe token | |
| CRON_SECRET | Cron auth | |
| WEEKLY_WARM_CRON_SECRET | Warm route auth | |
| SYNC_SECRET | Sync auth | Multiple entries in Vercel |
| MASTER_API_KEY | Master API key | |

### 2.7 Analytics / Monitoring
| Var | Purpose | Notes |
|-----|---------|-------|
| NEXT_PUBLIC_SENTRY_DSN | Sentry DSN | |
| SENTRY_AUTH_TOKEN | Sentry auth | |
| NEXT_PUBLIC_POSTHOG_KEY | PostHog key | |
| NEXT_PUBLIC_POSTHOG_HOST | PostHog host | |
| NEXT_PUBLIC_GA_ID / NEXT_PUBLIC_GTAG_ID | Google Analytics | |
| SENTRY_DSN | Alias | |

### 2.8 Cache / Redis
| Var | Purpose | Notes |
|-----|---------|-------|
| REDIS_URL | Redis URL | |
| UPSTASH_REDIS_REST_URL | Upstash URL | |
| UPSTASH_REDIS_REST_TOKEN | Upstash token | |
| KV_URL | Vercel KV alias | |

### 2.9 Delivery / Shipping
| Var | Purpose | Notes |
|-----|---------|-------|
| DELIVERY_BASE_FEE | Base fee | Public + server |
| NEXT_PUBLIC_DELIVERY_BASE_FEE | Public base fee | |
| DELIVERY_FREE_THRESHOLD | Free threshold | |
| DELIVERY_MIN_SUBTOTAL | Minimum subtotal | |
| DELIVERY_RADIUS_MILES | Radius | |
| DELIVERY_ZIP_WHITELIST | ZIP whitelist | |
| DELIVERY_WINDOWS | Windows | |
| DELIVERY_CUTOFF_MINUTES | Cutoff | |
| DELIVERY_TIP_PRESETS | Tip presets | |
| NEXT_PUBLIC_* | Public mirrors of above | Many |
| SHIPENGINE_API_KEY | ShipEngine | |
| SHIPENGINE_CARRIER_IDS | Carriers | |
| EASYPOST_API_KEY | EasyPost | |
| SHIPPING_FROM_* / SHIPPING_ORIGIN_* | Origin address | Duplicated naming |

### 2.10 Marketing / Campaigns
| Var | Purpose | Notes |
|-----|---------|-------|
| OPENAI_API_KEY | AI newsletter | |
| WINBACK_COUPON_CODE | Winback coupon | |
| WINBACK_DAYS_INACTIVE | Winback delay | |
| PREORDER_DELIVERY_MIN_CENTS | Preorder delivery min | |
| GRATITUDE_BOX_PILOT_PRICE_CENTS | Gratitude box price | |

### 2.11 Instagram
| Var | Purpose | Notes |
|-----|---------|-------|
| INSTAGRAM_ACCESS_TOKEN | Instagram token | |
| INSTAGRAM_BUSINESS_ACCOUNT_ID | Account ID | |
| INSTAGRAM_WEBHOOK_VERIFY_TOKEN | Webhook verify | |

### 2.12 SMS / Twilio (inactive)
| Var | Purpose | Notes |
|-----|---------|-------|
| TWILIO_ACCOUNT_SID | Twilio account | |
| TWILIO_AUTH_TOKEN | Twilio auth | |
| TWILIO_PHONE_NUMBER | Twilio number | |
| STAFF_PHONE | Legacy staff phone | `.env.example` says ignored |

### 2.13 Stripe (placeholder)
| Var | Purpose | Notes |
|-----|---------|-------|
| STRIPE_PUBLISHABLE_KEY | Stripe publishable | |
| STRIPE_SECRET_KEY | Stripe secret | |
| STRIPE_GRATITUDE_BOX_PRICE_ID | Stripe price ID | |

### 2.14 Push Notifications / PWA
| Var | Purpose | Notes |
|-----|---------|-------|
| NEXT_PUBLIC_VAPID_PUBLIC_KEY | VAPID public | |
| VAPID_PRIVATE_KEY | VAPID private | |
| VAPID_SUBJECT | VAPID subject | |

### 2.15 Monitoring / Alerting Webhooks
| Var | Purpose | Notes |
|-----|---------|-------|
| SLACK_WEBHOOK_URL | Slack webhook | |
| SLACK_WEBHOOK | Alias | |
| SLACK_ALERT_WEBHOOK | Alert webhook | |
| PAGERDUTY_TOKEN | PagerDuty | |
| PAGERDUTY_ROUTING_KEY | PagerDuty routing | |
| CRITICAL_ALERT_WEBHOOK | Generic webhook | |
| MONITORING_WEBHOOK_URL | Monitoring | |
| ERROR_MONITORING_URL | Error monitoring | |

### 2.16 Feature Flags
| Var | Purpose | Notes |
|-----|---------|-------|
| FEATURE_CHECKOUT_V2 | Checkout v2 | |
| FEATURE_INVENTORY_LOCKING | Inventory locking | |
| FEATURE_ENHANCED_SEARCH | Enhanced search | |
| FEATURE_RETURNS_ENABLED | Returns | |
| FEATURE_SUBSCRIPTIONS_ENABLED | Subscriptions | |
| FEATURE_MOBILE_ADMIN | Mobile admin | |
| NEXT_PUBLIC_FULFILLMENT_DELIVERY | Public delivery toggle | |
| NEXT_PUBLIC_ENABLE_DEMO_PRODUCTS | Demo products | |
| NEXT_PUBLIC_CATALOG_SOURCE | Catalog source | |
| ALLOW_DEMO_STOREFRONT_FALLBACK | Fallback | |
| ALLOW_SANDBOX_PRODUCTS | Sandbox products | |
| TOG_SKIP_LIVE | Skip live checks | |

### 2.17 Debug / Dev / Misc
| Var | Purpose | Notes |
|-----|---------|-------|
| DEBUG | Debug logging | 18 references |
| VERBOSE | Verbose logging | 16 references |
| NEXT_PUBLIC_DEBUG | Public debug | |
| NEXT_PUBLIC_CHECKOUT_DIAGNOSTICS | Checkout diagnostics | |
| CRAWL_RPS / CRAWL_BURST | Crawler rate limits | |
| POLITENESS_MIN_MS / POLITENESS_MAX_MS | Crawler politeness | |
| SEARCH_FUZZY_THRESHOLD | Search threshold | |
| SEARCH_MAX_SUGGESTIONS | Search suggestions | |
| LOW_STOCK_THRESHOLD / DEFAULT_* | Inventory defaults | |
| INVENTORY_LOCK_TTL_MINUTES | Lock TTL | |
| RETURNS_WINDOW_DAYS | Returns window | |
| CONTACT_PHONE | Contact phone | |
| SUPPORT_HOURS | Support hours | |
| MENU_CANVA_URL / MENU_MARKET_ID / MENU_PUBLIC_BASE_URL | Menu links | |
| MARKET_LOCATION | Market location | |
| SERENBE_LAT / SERENBE_LNG / SCOTCH_BONNET_LAT / SCOTCH_BONNET_LNG / ZIP_30331_LAT / ZIP_30331_LNG | Location constants | |
| GITHUB_TOKEN | GitHub API | |
| VERCEL_TOKEN | Vercel API | |

## 3. Issues

1. **Duplication:** `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`, `BASE_URL`, `TOG_SITE_URL`, `PRODUCTION_URL` all serve similar purposes.
2. **Aliases:** `MONGODB_URI`/`MONGO_URL`, `DATABASE_NAME`/`DB_NAME`, `SQUARE_APPLICATION_ID`/`NEXT_PUBLIC_SQUARE_APPLICATION_ID`/`NEXT_PUBLIC_SQUARE_APP_ID`, `SQUARE_WEBHOOK_SIGNATURE_KEY`/`SQUARE_WEBHOOK_SECRET`.
3. **Inactive provider remnants:** Twilio, ShipEngine/EasyPost, Stripe, PagerDuty, Slack webhooks.
4. **Dangerous flags:** `SQUARE_SKIP_WEBHOOK_VERIFICATION`, `ALLOW_SANDBOX_PRODUCTS`, `NEXT_PUBLIC_ENABLE_DEMO_PRODUCTS`, `TOG_SKIP_LIVE`.
5. **Public secrets:** `NEXT_PUBLIC_ADMIN_API_KEY`, `NEXT_PUBLIC_STAFF_PIN`, `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`, `NEXT_PUBLIC_TELEGRAM_CHANNEL_URL` — not secret but indicate privileged/config data exposed to browser.
6. **Vercel env count:** 49 entries with duplicates and legacy names; cleanup recommended.

---

*Next: TOG-WEBHOOK-AND-CRON-INVENTORY.md*
