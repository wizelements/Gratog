# VISUAL_SYSTEM_MAP — Gratog Platform

> One-page mental model. If a new engineer reads this and `SYSTEM_MAP.md`, they should be productive within 30 minutes.

## 1. Customer end-to-end

```diagram
╭─────────────────────────────────────────────────────────────────────────────╮
│                              CUSTOMER (mobile/desktop)                       │
╰─────────────────────────────────────────────────────────────────────────────╯
                                       │
                                       ▼
╭────────────────╮   ╭──────────╮   ╭──────────╮   ╭──────────╮   ╭───────────╮
│ /  homepage    │──▶│ /catalog │──▶│ /product │──▶│ cart     │──▶│ /checkout │
╰────────────────╯   ╰──────────╯   ╰──────────╯   ╰──────────╯   ╰─────┬─────╯
                                                                         │
                                                                         ▼
              ╭────────────────────╮      ╭───────────────────╮     ╭────────────╮
              │ /api/inventory/lock│  ◀── │ /api/orders/create│ ──▶ │ mint HMAC  │
              ╰────────────────────╯      ╰────────┬──────────╯     │ orderToken │
                                                   │                ╰─────┬──────╯
                                                   ▼                      │
                                          ╭────────────────────╮          │
                                          │ Square Web SDK     │          │
                                          │ tokenize card      │          │
                                          ╰────────┬───────────╯          │
                                                   ▼                      │
                                          ╭────────────────────╮          │
                                          │ /api/payments      │ ◀────────╯
                                          │ verify orderToken  │
                                          │ Square createPay   │
                                          │ consume inventory  │
                                          │ send conf email    │
                                          ╰────────┬───────────╯
                                                   ▼
                                          ╭────────────────────╮
                                          │ /order/success     │
                                          ╰────────────────────╯
```

## 2. Admin flow

```diagram
╭────────────╮     ╭───────────────╮     ╭─────────────────────────╮
│ Admin user │────▶│ /admin/login  │────▶│ middleware.ts (cookie)  │
╰────────────╯     ╰───────┬───────╯     ╰────────────┬────────────╯
                           │ POST /api/admin/auth/login           │
                           ▼                                       ▼
                  ╭───────────────────╮            ╭─────────────────────╮
                  │ ADMIN_API_KEY     │   …or…     │ MASTER_API_KEY      │
                  │ in admin_token    │            │ in admin_token      │
                  │ cookie            │            │ cookie              │
                  ╰─────────┬─────────╯            ╰──────────┬──────────╯
                            └────────────┬─────────────────────┘
                                         ▼
                              ╭──────────────────╮
                              │ /admin/* pages   │
                              │ /api/admin/* APIs│
                              ╰──────────────────╯
```

## 3. Order lifecycle

```diagram
 created ──▶ paid ──▶ confirmed ──▶ in_fulfillment ──▶ ready ──▶ completed
   │            │                                                     │
   │            ▼                                                     ▼
   │       refund? ──▶ refunded                              archived  
   ▼
 expired (no payment within 30m)
```

## 4. Payment & inventory state

```diagram
 cart ─▶ inventory_locks (TTL)
                │
                ▼ at payment success
        inventory.qty $inc -N
                │
                ▼ delete inventory_locks
                │
                ▼ orders.paymentStatus = paid
```

## 5. Email flow

```diagram
 Transactional events
     │
     ├─ order confirmation (lib/resend-email.js)  ─┐
     ├─ password reset (lib/resend-email.js)       │  ⚠ skips email_sends → webhook events orphaned
     └─ daily report (lib/resend-email.js)         ─┘

 Marketing events
     │
     ├─ campaign send (lib/campaign-manager.js)  ──▶ email_sends ──▶ Resend
     └─ newsletter/coupon (lib/email/service.js) ──▶ email_queue/logs

 Resend events (POST /api/webhooks/resend)
     │  email.sent / delivered / bounced / complained / opened / clicked
     ▼
 UPDATE email_sends row by Resend message id
```

## 6. Rewards flow

```diagram
 order created
   │
   ▼ (async)
 POST /api/rewards/add-points  (Bearer MASTER_API_KEY)
   │
   ▼
 UPSERT rewards (idempotent on email+orderId)
   │
   ▼
 Customer reads via /api/user/rewards (✅)
                   /api/rewards/passport (✅)
                   /api/rewards/passport/scan (❌ missing)
                   /api/rewards/stamp (❌ missing)
                   /api/rewards/leaderboard (❌ missing)
```

## 7. Quiz flow

```diagram
 /quiz ──▶ POST /api/quiz/submit ❌ ──▶ /api/quiz/recommendations ❌ ──▶ /quiz/results/[id]
```

(Entire path is broken — UI lights up, backend is gone.)

## 8. Square integration touchpoints

```diagram
 Square Catalog ─▶ catalogSync.js ─▶ Mongo (square_catalog_*, unified_products)
 Square Payments ─▶ /api/payments
 Square Webhooks ─▶ /api/webhooks/square
 Square OAuth ───▶ /api/oauth/square/*
 Square diag ────▶ /api/square/* + /api/debug/square  (⚠ public)
```

## 9. Data store quick-glance

```diagram
 orders ──(coupon)──▶ coupons
   │
   ├──(customer)──▶ customers
   ├──(items)─────▶ inventory  ▶ inventory_locks
   └──(after pay)─▶ rewards    ▶ gratitude_accounts

 users  ────────▶ notification_preferences ◀── unsubscribes
                                              ◀── email_sends ◀── (webhook)
```
