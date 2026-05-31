# SYSTEM_MAP — Business-Value Lens

> Phase 1 deliverable. Every component scored on what it does for revenue, operations, and risk. Code-verified at commit `f9d20e98`. Cross-references [docs/audit/](file:///data/data/com.termux/files/home/Gratog-live/docs/audit/).

Legend:
- **Business Value:** REVENUE_CRITICAL · OPS_CRITICAL · TRUST · NICE_TO_HAVE · UNUSED
- **Risk Level:** 🔴 high · 🟠 medium · 🟡 low · 🟢 none

## 1. Customer-facing pages (68 total)

| Page | Purpose | Owner | Value | Deps | Revenue impact | Risk |
|---|---|---|---|---|---|---|
| `/` | Brand + entry | Solo dev | REVENUE_CRITICAL | catalog | All traffic enters here | 🟠 if broken = 0 sales |
| `/catalog` | Shop grid | " | REVENUE_CRITICAL | `/api/products`, `/api/storefront/catalog` | direct conversion path | 🟠 |
| `/product/[slug]` | PDP | " | REVENUE_CRITICAL | catalog | direct conversion path | 🟠 |
| `/checkout` | Pay | " | REVENUE_CRITICAL | `/api/orders/create`, `/api/payments`, Square SDK | **the** revenue chokepoint | 🔴 |
| `/order/success` | Receipt | " | REVENUE_CRITICAL | `/api/orders/by-ref` | trust signal post-purchase | 🟠 |
| `/order/[id]` | Order detail | " | OPS_CRITICAL | `/api/orders/by-ref` + token | customer self-service | 🟡 |
| `/markets` | Where to find vendor | " | TRUST | `/api/markets` | drives in-person sales | 🟡 |
| `/preorder`, `/preorder/status` | Preorders | " | REVENUE_CRITICAL | `/api/preorder*` | confirmed working | 🟡 |
| `/policies`, `/privacy`, `/terms`, `/faq`, `/about`, `/contact` | Legal + info | " | TRUST + legal | static + `/api/contact` (❌) | required for compliance | 🟠 (contact API missing) |
| `/rewards`, `/gratitude`, `/gratitude/rewards`, `/passport` | Loyalty | " | TRUST + retention | gratitude APIs ✅ | repeat purchase | 🟡 |
| `/profile`, `/profile/orders`, `/profile/rewards`, `/profile/settings`, `/profile/challenge` | Account | " | TRUST (only if accounts used) | all `/api/user/*` ❌ MISSING | currently 0 — broken | 🟢 hide if unused |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Auth | " | NICE_TO_HAVE for guest shop | all `/api/auth/*` ❌ | currently 0 | 🟢 hide if unused |
| `/quiz`, `/quiz/results/[id]` | Personalization | " | NICE_TO_HAVE | quiz APIs ❌ | unproven | 🟢 hide |
| `/reviews` | Social proof | " | TRUST | `/api/reviews` ❌ | conversion lift | 🟠 hide or restore |
| `/wishlist` | Save for later | " | NICE_TO_HAVE | `/api/user/favorites` ❌ | low | 🟢 hide |
| `/subscriptions` | Recurring | " | NICE_TO_HAVE for now | `/api/subscriptions/plans` ❌ | 0 if not promoted | 🟢 hide |
| `/unsubscribe` | Email opt-out | " | LEGAL_CRITICAL | `/api/unsubscribe` ❌ | 0 revenue / compliance risk | 🔴 |
| `/explore/*` | Discovery hub (games, ingredients, learning) | " | NICE_TO_HAVE | mostly missing learning APIs | unproven | 🟢 hide |
| `/ugc`, `/ugc/spicy-bloom` | UGC | " | NICE_TO_HAVE | `/api/ugc/submit` ❌ | unproven | 🟢 hide |
| `/order-v2`, `/order/*`, `/pay`, `/checkout/square`, `/checkout/success` | Parallel/legacy checkout | " | UNUSED-but-dangerous | parallel pay APIs | confusion / drift | 🟠 remove |
| `/test-auth`, `/diagnostic` | Dev only | " | UNUSED | n/a | 0 | 🔴 hide in prod |
| `/info-board`, `/(site)/community`, `/(site)/instagram/[slug]` | Brand | " | TRUST | static | low | 🟡 |
| `/offline` | PWA fallback | " | OPS | service worker | improves mobile UX | 🟢 |
| `/vendor/queue` | Vendor-side queue | " | OPS for market days | `/api/queue/active` ❌ | physical-market ops | 🟠 if markets need it |

## 2. API routes (93 existing, 64 missing)

Full inventory: [ROUTE_INVENTORY.md](file:///data/data/com.termux/files/home/Gratog-live/docs/audit/ROUTE_INVENTORY.md). Business lens:

| Route family | Status | Value | Risk |
|---|---|---|---|
| `/api/orders/create`, `/api/orders/by-ref`, `/api/payments`, `/api/inventory/*`, `/api/webhooks/square`, `/api/webhooks/resend` | ✅ | REVENUE_CRITICAL | 🔴 sacred |
| `/api/products`, `/api/catalog`, `/api/storefront/catalog`, `/api/search/enhanced` | ✅ | REVENUE_CRITICAL | 🟠 |
| `/api/cart`, `/api/cart/price`, `/api/shipping/rates` | ✅ | REVENUE_CRITICAL | 🟠 |
| `/api/preorder*`, `/api/markets`, `/api/market/today`, `/api/ics/market-route` | ✅ | REVENUE_CRITICAL | 🟡 |
| `/api/rewards/add-points`, `/api/user/rewards`, `/api/rewards/passport`, `/api/queue/{join,position/[id]}` | ✅ (restored) | TRUST + ops | 🟡 |
| `/api/gratitude/*` (8 routes) | ✅ | TRUST | 🟡 |
| `/api/admin/auth/*`, `/api/admin/orders`, `/api/admin/products`, `/api/admin/customers`, `/api/admin/inventory/[productId]`, `/api/admin/markets*`, `/api/admin/coupons*`, `/api/admin/campaigns*`, `/api/admin/reviews`, `/api/admin/analytics`, `/api/admin/setup`, `/api/admin/emergency-init` | ✅ | OPS_CRITICAL | 🔴 (auth model) |
| `/api/oauth/square/*` | ✅ | OPS | 🟡 |
| `/api/cron/{cleanup-locks,daily-report}` | ✅ | OPS | 🟡 |
| `/api/contact`, `/api/newsletter/subscribe`, `/api/unsubscribe`, `/api/auth/register`, `/api/auth/reset-password` | ❌ | TRUST + legal | 🔴 (compliance) |
| `/api/reviews`, `/api/reviews/helpful`, `/api/recommendations` | ❌ | TRUST | 🟠 |
| `/api/user/profile`, `/api/user/orders`, `/api/user/favorites`, `/api/user/stats`, `/api/user/challenge*`, `/api/user/email-preferences` | ❌ | NICE_TO_HAVE (only if accounts go live) | 🟢 hide |
| `/api/quiz/*`, `/api/learning/*`, `/api/ugc/submit`, `/api/coupons/{create,validate}`, `/api/waitlist`, `/api/subscriptions/plans` | ❌ | NICE_TO_HAVE | 🟢 hide |
| `/api/admin/orders/sync`, `/api/admin/orders/update-status`, `/api/admin/inventory`, `/api/admin/auth/reset-password` | ❌ | OPS_CRITICAL | 🟠 |
| `/api/admin/notifications/*`, `/api/admin/campaigns/{generate,test}`, `/api/admin/interactions`, `/api/queue/{active,update,position}`, `/api/notifications/*` | ❌ | NICE_TO_HAVE | 🟢 hide |
| `/api/debug/square`, `/api/square/{diagnose,test-rest,validate-token}`, `/api/startup` | ✅ but PUBLIC | UNUSED in prod | 🔴 information disclosure |

## 3. Database collections (58)

| Collection | Purpose | Value | Risk |
|---|---|---|---|
| `orders`, `payments`, `payment_records`, `idempotency_keys`, `webhook_events_processed` | Money path | REVENUE_CRITICAL | 🔴 backups required |
| `inventory`, `inventory_locks` | Stock | REVENUE_CRITICAL | 🟠 |
| `coupons` (+ `deleted_coupons`) | Promos | REVENUE_CRITICAL | 🟠 timing bug |
| `customers`, `users` | Identity (split — see [DATABASE_MAP.md](file:///data/data/com.termux/files/home/Gratog-live/docs/audit/DATABASE_MAP.md)) | OPS_CRITICAL | 🟠 |
| `admin_users` | Admin identity | OPS_CRITICAL | 🔴 (auth model) |
| `products`, `unified_products`, `square_catalog_*`, `square_inventory`, `square_sync_metadata` | Catalog | REVENUE_CRITICAL | 🟠 |
| `email_subscribers`, `email_queue`, `email_logs`, `email_sends`, `scheduled_emails`, `campaigns`, `unsubscribes`, `notification_preferences` | Marketing/email | TRUST + legal | 🟠 (tracking gap) |
| `gratitude_accounts`, `gratitude_referrals`, `rewards`, `passports`, `customer_passports`, `passport_idempotency`, `stamp_idempotency`, `challenges` | Loyalty | TRUST | 🟡 (double-award bug) |
| `markets`, `pre_orders`, `subscriptions`, `subscription_plans`, `subscription_billing` | Commerce variants | REVENUE_CRITICAL (preorder + markets); NICE_TO_HAVE (subscriptions) | 🟡 |
| `product_reviews` (+ `deleted_reviews`) | Reviews | TRUST | 🟡 |
| `instagram_posts` | Social | NICE_TO_HAVE | 🟢 |
| `analytics`, `unified_analytics`, `search_analytics`, `audit_log`, `audit_logs` (dup) | Observability | OPS | 🟡 |
| `fraud_logs`, `fraud_fingerprints`, `customer_locations`, `communications`, `returns`, `push_subscriptions`, `notification_logs`, `waitlist` | Misc | NICE_TO_HAVE / UNUSED | 🟢 audit before retention |

## 4. External integrations

| Integration | Purpose | Value | Failure mode | Risk |
|---|---|---|---|---|
| **Square Payments** | Card processing | REVENUE_CRITICAL | no $ collected | 🔴 |
| **Square Catalog** | Product source of truth | REVENUE_CRITICAL | sync drift | 🟠 |
| **Square Webhooks** | Status reconciliation | REVENUE_CRITICAL | order limbo | 🟠 |
| **Resend (email)** | All outbound mail | REVENUE_CRITICAL + legal | silent fail = trust loss + CAN-SPAM | 🟠 |
| **MongoDB Atlas** | Primary datastore | REVENUE_CRITICAL | total outage | 🟠 (managed) |
| **Vercel** | Hosting | REVENUE_CRITICAL | site down | 🟡 (managed) |
| **Sentry** | Error tracking | OPS_CRITICAL | blind to failures | 🟡 |

## 5. Critical environment variables

See [SYSTEM_MAP.md](file:///data/data/com.termux/files/home/Gratog-live/docs/audit/SYSTEM_MAP.md#6-critical-environment-variables-subset). Highest-risk:

- `SQUARE_ACCESS_TOKEN` — leak = drained payouts
- `SQUARE_WEBHOOK_SIGNATURE_KEY` — leak = fake webhook events
- `RESEND_API_KEY` — leak = brand-domain phishing
- `MONGODB_URI` — leak = entire customer DB
- `ADMIN_API_KEY` / `MASTER_API_KEY` — currently doubles as admin cookie value; leak = total admin compromise (🔴 see SECURITY)
- `JWT_SECRET` — single secret used for JWT + order tokens + unsubscribe + idempotency

## 6. Automations

| Cron | Purpose | Value | Status |
|---|---|---|---|
| `/api/cron/cleanup-locks` | Release stale inventory locks | REVENUE_CRITICAL | ✅ |
| `/api/cron/daily-report` | Admin daily email | OPS | ✅ |
| `/api/cron/cleanup-abandoned-orders` | Abandoned-cart cleanup + recovery | NICE_TO_HAVE | ❌ MISSING |

## 7. Touchpoint summary

```diagram
                    REVENUE_CRITICAL surface
   ╭──────────────────────────────────────────────────────╮
   │  Catalog → PDP → Cart → Checkout → /api/orders/create │
   │   → /api/payments → Square → /order/success → email   │
   │   Plus: webhooks/square, inventory consume, rewards   │
   ╰──────────────────────────────────────────────────────╯
                        ▲           ▲
                        │           │
              OPS_CRITICAL    TRUST/LEGAL
              admin orders   contact, unsubscribe,
              inventory      reviews, confirmation emails
              fulfillment    
                        ▲
                        │
                 SECURITY perimeter
              admin auth, secrets, diagnostics
```

Everything else (auth/profile/wishlist/quiz/subscriptions/notifications/learning/ugc) is NICE_TO_HAVE or UNUSED **for current scale**.
