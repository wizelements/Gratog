# DATABASE_MAP — Gratog Platform

> Code-verified at commit `f9d20e98`. 58 collection names extracted from `db.collection('…')` callsites across `app/`, `lib/`, `services/`, `scripts/`.

Connection: Mongoose ^8 wrapping MongoDB Node driver ^6.21 — see [lib/db-optimized.ts](file:///data/data/com.termux/files/home/Gratog-live/lib/db-optimized.ts). Pooled connection reused across all collections.

Raw list: [_collections.txt](file:///data/data/com.termux/files/home/Gratog-live/docs/audit/_collections.txt)

## 1. Collections by domain (58)

### Orders & payments
- `orders` — primary order doc, written by `lib/transactions.ts#createOrderAtomic`.
- `payments`, `payment_records` — payment metadata.
- `returns` — refund/return records.
- `idempotency_keys` — TTL-backed idempotency store (`lib/idempotency.ts`).
- `inventory`, `inventory_locks` — stock + holds.
- `pre_orders` — preorder records.
- `webhook_events_processed` — square/resend dedupe.

### Customers & auth
- `customers` — populated by `createOrderAtomic` upsert.
- `users` — authenticated customer accounts.
- `admin_users` — admin accounts.
- `customer_locations` — geolocation profile.

### Loyalty & rewards
- `gratitude_accounts`, `gratitude_referrals` — gratitude program.
- `rewards` — reward ledger.
- `passports`, `customer_passports`, `passport_idempotency`, `stamp_idempotency` — passport program.
- `challenges` — challenge tracking.

### Products & catalog
- `products`, `deleted_products` — internal catalog + soft-deletes.
- `unified_products` — merged Square + local.
- `product_reviews`, `deleted_reviews`.
- `square_catalog_items`, `square_catalog_categories`, `square_catalog_images`, `square_inventory`, `square_sync_metadata` — Square mirror.

### Marketing / email / engagement
- `email_subscribers` — newsletter list.
- `email_queue` — outbound queue (used by `lib/email/service.js`).
- `email_logs` — send log (used by `lib/email/service.js`).
- `email_sends` — Resend delivery events (used by webhook + `lib/campaign-manager.js` only).
- `scheduled_emails` — scheduler.
- `campaigns`, `deleted_campaigns` — admin email campaigns.
- `unsubscribes` — opt-outs (checked by `lib/email/service.js`).
- `coupons`, `deleted_coupons` — promo codes (incremented atomically in `createOrderAtomic`).
- `notification_preferences`, `notification_logs`, `push_subscriptions` — push notifs.
- `communications` — outbound log.

### Subscriptions
- `subscriptions`, `subscription_plans`, `subscription_billing`.

### Markets & ops
- `markets` — vendor markets.
- `instagram_posts` — social mirror.

### Analytics & ops
- `analytics`, `unified_analytics`, `search_analytics`.
- `audit_log`, `audit_logs` — **duplicate naming**; consolidate.
- `fraud_logs`, `fraud_fingerprints` — fraud signals.

### Misc
- `waitlist` — waitlist requests (no `/api/waitlist` route).

## 2. Hot-path access patterns

```diagram
POST /api/orders/create
   │
   ▼
createOrderAtomic (lib/transactions.ts)  ───┐
   ├─ INSERT orders                          │
   ├─ UPSERT customers ($inc totals)         │ inside withTransaction
   ├─ ($inc) coupons.usedCount               │ (sessioned)
   └─ validate item identifiers              ┘
   │
   ▼ (after response)
POST /api/rewards/add-points
   └─ UPSERT rewards (idempotent on email + orderId)

POST /api/payments
   │
   ▼
consumeInventoryForPaidOrder (lib/custom-inventory.js)
   ├─ UPDATE inventory  ($inc qty -N)
   ├─ DELETE inventory_locks
   └─ UPDATE orders set paymentStatus=paid
```

## 3. Indexes

Defined in `scripts/`:
- `scripts/create-email-indexes.js` — indexes for `email_sends`, `email_queue`, `scheduled_emails`.
- `scripts/migrate-rewards.js` and similar — index hints for rewards collections.

**Recommendation:** centralize index manifest. Currently scattered scripts run on demand; production drift likely.

## 4. Schema risks (verified)

| # | Risk | Evidence |
|---|---|---|
| 1 | Duplicate `audit_log` + `audit_logs` collections | both names referenced in code |
| 2 | `email_sends` only populated for **marketing** path (`lib/campaign-manager.js`); not for transactional emails sent via [lib/resend-email.js](file:///data/data/com.termux/files/home/Gratog-live/lib/resend-email.js) | webhook updates `email_sends` only, so transactional bounces/deliveries are not visible |
| 3 | `deleted_*` soft-delete pattern not consistent (only products/reviews/coupons/campaigns) | manual review per collection |
| 4 | No persistent cart collection — cart lives entirely in `stores/cart.ts` (Zustand persist in `localStorage`) | code search returns no `db.collection('cart')` |
| 5 | `customers` is keyed by email (`id: customerEmail` via `$setOnInsert`) — email change = identity loss | `lib/transactions.ts#L62` |
| 6 | `users` vs `customers` — two parallel customer identities. `users` for authenticated; `customers` for any order. No FK. | code inspection |
| 7 | `idempotency_keys` requires TTL index | should be enforced (verify via `db.idempotency_keys.getIndexes()`) |
| 8 | Inventory decrement is **not** in `createOrderAtomic` — only validates item IDs (intentional, see code comment lines 73-83) | done after payment in `consumeInventoryForPaidOrder` |
| 9 | MongoDB v6 `.value` migration bug (fixed by `970daff0`) had leaked across `lib/custom-inventory.js`, `lib/enhanced-order-tracking.js`, `lib/enhanced-rewards.js`, `lib/rewards-secure.js`, `lib/campaign-manager.js` | verify all fully patched |

## 5. Collections referenced but with low/no usage

Audit candidates for retirement: `unified_analytics`, `unified_products`, `fraud_fingerprints`, `communications`, `audit_log` (the `_log` singular form). Confirm with usage scan before deletion.
