# FEATURE_VALUE_CLASSIFICATION

> Phase 8 deliverable. Every visible surface classified. No emotional attachment.

Categories:
- **REVENUE_CRITICAL** — direct money path
- **OPS_CRITICAL** — operator productivity / fulfillment
- **TRUST** — conversion / brand / legal
- **NICE_TO_HAVE** — measurable but optional uplift
- **UNUSED** — currently no traffic / no use
- **REMOVE** — actively harmful (drift, exposure)

## Pages (68 customer-facing + 27 admin)

### REVENUE_CRITICAL (must work)
- `/` (homepage)
- `/catalog`
- `/product/[slug]`
- `/checkout`
- `/order/success`
- `/order/[id]`
- `/markets`
- `/preorder`, `/preorder/status`
- cart drawer (component)

### OPS_CRITICAL
- `/admin`
- `/admin/login`
- `/admin/orders`
- `/admin/products`, `/admin/products/[id]`
- `/admin/inventory`
- `/admin/customers`, `/admin/customers/[id]`
- `/admin/coupons`
- `/admin/markets`, `/admin/market-day`, `/admin/market-setup`
- `/admin/analytics`
- `/admin/errors`
- `/admin/reviews`
- `/admin/settings`
- `/admin/setup`
- `/admin/square-oauth`

### TRUST
- `/about`, `/faq`, `/policies`, `/privacy`, `/terms`
- `/contact` (currently broken — `/api/contact` missing)
- `/unsubscribe` (currently broken — `/api/unsubscribe` missing; **also legal**)
- `/reviews` (currently broken — `/api/reviews` missing)
- `/rewards`, `/gratitude`, `/gratitude/rewards`, `/passport`
- `/info-board`
- `/(site)/community`
- `/(site)/instagram/[slug]`

### NICE_TO_HAVE (defer)
- `/profile`, `/profile/orders`, `/profile/rewards`, `/profile/settings`, `/profile/challenge`
- `/login`, `/register`, `/forgot-password`, `/reset-password`, `/account`, `/account/subscriptions[/id]`
- `/wishlist`
- `/quiz`, `/quiz/results/[id]`
- `/subscriptions`
- `/explore`, `/explore/games/*`, `/explore/ingredients`, `/explore/learn`, `/explore/showcase`
- `/ugc`, `/ugc/spicy-bloom`
- `/admin/qr-generator`
- `/admin/campaigns`, `/admin/campaigns/new`
- `/admin/forgot-password`, `/admin/reset-password`
- `/admin/queue` (unless markets actively use)
- `/admin/waitlist` (unless waitlist actively promoted)
- `/admin/interactions`

### UNUSED / REMOVE
- `/order-v2`
- `/order/start`, `/order/menu`, `/order/checkout`, `/order/complete`, `/order/status/[id]`
- `/order` (legacy "Pay Flow")
- `/pay`
- `/checkout/square` (legacy hosted-link)
- `/checkout/success` (legacy hosted-link return)
- `/test-auth`
- `/diagnostic`
- `/vendor/queue` (unless vendor side actively in use)

## API routes (93 existing + 64 missing)

### REVENUE_CRITICAL
| Status | Route |
|---|---|
| ✅ | `/api/orders/create` |
| ✅ | `/api/orders/by-ref` |
| ✅ | `/api/payments` |
| ✅ | `/api/payments/refund` |
| ✅ | `/api/payments/square` |
| ✅ | `/api/inventory`, `/api/inventory/{lock,confirm,release}` |
| ✅ | `/api/cart`, `/api/cart/price` |
| ✅ | `/api/products`, `/api/catalog`, `/api/storefront/catalog`, `/api/storefront/square-catalog` |
| ✅ | `/api/search/enhanced` |
| ✅ | `/api/webhooks/square` |
| ✅ | `/api/webhooks/resend` |
| ✅ | `/api/shipping/rates` |
| ✅ | `/api/preorder`, `/api/preorder/status` |
| ✅ | `/api/markets`, `/api/market/today` |
| ✅ | `/api/ics/market-route` |

### OPS_CRITICAL
| Status | Route |
|---|---|
| ✅ | `/api/admin/auth/{csrf,login,logout,me}` |
| ✅ | `/api/admin/orders`, `/api/admin/orders/[id]/refund` |
| ✅ | `/api/admin/products`, `/api/admin/products/[id]` |
| ✅ | `/api/admin/inventory/[productId]` |
| ✅ | `/api/admin/customers`, `/api/admin/customers/[id]` |
| ✅ | `/api/admin/coupons`, `/api/admin/coupons/[id]` |
| ✅ | `/api/admin/markets`, `/api/admin/markets/seed` |
| ✅ | `/api/admin/analytics` |
| ✅ | `/api/admin/reviews` |
| ✅ | `/api/admin/setup`, `/api/admin/emergency-init` |
| ✅ | `/api/oauth/square/{authorize,callback,status}` |
| ✅ | `/api/cron/{cleanup-locks,daily-report}` |
| ✅ | `/api/health`, `/api/health/payments` |
| ✅ | `/api/errors/{list,summary}` |
| ❌ | `/api/admin/orders/sync` |
| ❌ | `/api/admin/orders/update-status` |
| ❌ | `/api/admin/inventory` (list view) |

### TRUST + LEGAL
| Status | Route |
|---|---|
| ❌ | `/api/contact` |
| ❌ | `/api/unsubscribe` (legal) |
| ❌ | `/api/newsletter/subscribe` |
| ❌ | `/api/reviews`, `/api/reviews/helpful` |
| ✅ | `/api/gratitude/*` (loyalty) |
| ✅ | `/api/user/rewards`, `/api/rewards/{add-points,passport}` |

### NICE_TO_HAVE
| Status | Route |
|---|---|
| ❌ | `/api/auth/register`, `/api/auth/reset-password` |
| ❌ | `/api/user/{profile,orders,favorites,stats,challenge,challenge/checkin,email-preferences}` |
| ❌ | `/api/quiz/{submit,results,recommendations}` |
| ❌ | `/api/recommendations` |
| ❌ | `/api/subscriptions/plans` |
| ❌ | `/api/coupons/{create,validate}` |
| ❌ | `/api/learning/{modules,me/modules}` |
| ❌ | `/api/nurture/subscribe` |
| ❌ | `/api/ugc/submit` |
| ❌ | `/api/waitlist` |
| ❌ | `/api/rewards/{leaderboard,passport/scan,stamp}` |
| ❌ | `/api/admin/campaigns/{generate,test}` |
| ❌ | `/api/admin/auth/reset-password` |
| ❌ | `/api/admin/interactions` |
| ❌ | `/api/admin/notifications/{broadcast,market-day,new-product,send,stats}` |
| ❌ | `/api/notifications/{location,preferences,subscribe,test,unsubscribe}` |
| ❌ | `/api/queue/{active,update,position}` (unless markets use) |
| ❌ | `/api/email/alert`, `/api/sms/alert`, `/api/error-report` |
| ❌ | `/api/tracking/user`, `/api/transactions/{log,stats}`, `/api/interactions` |
| ❌ | `/api/customers`, `/api/returns`, `/api/instagram/post` |
| ❌ | `/api/cron/cleanup-abandoned-orders` |
| ❌ | `/api/square/image` |
| ❌ | `/api/v1`, `/api/pay-flow`, `/api/payments/route` (glob noise) |

### UNUSED / REMOVE
- `/api/checkout` (deprecate)
- `/api/create-checkout` (deprecate)
- `/api/pay/process` (deprecate)
- `/api/debug/square` (admin-gate or remove)
- `/api/square/{diagnose,test-rest,validate-token}` (admin-gate or remove)
- `/api/startup` (admin-gate or remove)

## Database collections (58)

| Class | Collections |
|---|---|
| REVENUE_CRITICAL | `orders`, `payments`, `payment_records`, `idempotency_keys`, `webhook_events_processed`, `inventory`, `inventory_locks`, `coupons`, `customers`, `products`, `unified_products`, `square_catalog_items`, `square_catalog_categories`, `square_catalog_images`, `square_inventory`, `square_sync_metadata`, `pre_orders`, `markets` |
| OPS_CRITICAL | `admin_users`, `email_logs`, `email_queue`, `email_sends`, `email_subscribers`, `unsubscribes`, `notification_preferences` |
| TRUST | `product_reviews`, `gratitude_accounts`, `gratitude_referrals`, `rewards`, `passports`, `customer_passports`, `passport_idempotency`, `stamp_idempotency`, `challenges`, `campaigns`, `scheduled_emails` |
| NICE_TO_HAVE | `users`, `subscriptions`, `subscription_plans`, `subscription_billing`, `customer_locations`, `push_subscriptions`, `notification_logs`, `returns`, `waitlist`, `instagram_posts` |
| UNUSED / REMOVE | `unified_analytics` (dup of `analytics`?), `audit_log` (vs `audit_logs`), `communications`, `fraud_fingerprints` (verify), `deleted_*` (soft-delete pattern inconsistent) |

## Feature value verdict

```diagram
  REVENUE_CRITICAL  ████████████████░░  must work, must be tested, must be monitored
  OPS_CRITICAL      █████████░░░░░░░░░  daily operator workflow must complete in <5 minutes
  TRUST + LEGAL     ██████░░░░░░░░░░░░  contact, unsubscribe, reviews — restore now
  NICE_TO_HAVE      ███░░░░░░░░░░░░░░░  defer — hide until business growth justifies
  UNUSED / REMOVE   █░░░░░░░░░░░░░░░░░  remove or hide — every one is a maintenance liability
```

## The 80/20

**~30% of the surface area** delivers **100% of the revenue + operations + legal value**. The other 70% is either deferrable or actively harmful (legacy + diagnostic + dead-link).

Restoration scope should match. If you build only what's in REVENUE_CRITICAL + OPS_CRITICAL + TRUST/LEGAL above, you have a complete, defensible, maintainable food-vendor commerce platform.
