# Taste of Gratitude — Fresh Batch Data Model

**Branch:** `feat/fresh-batch-request-system`  
**Status:** Design proposal. No collections created yet.

---

## 1. Collections

### 1.1 `fresh_batch_requests`

Customer demand records.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | MongoDB default. |
| `id` | string | UUIDv4 public identifier. |
| `email` | string | Required, lowercased. |
| `phone` | string \| null | Optional. |
| `smsConsent` | boolean | Default `false`. Explicit opt-in only. |
| `marketingEmailConsent` | boolean | Default `false`. Separate from transactional mail. |
| `requestedProductSlug` | string \| null | Known curated product, if selected. |
| `requestedProductName` | string \| null | Denormalized display name. |
| `requestedFlavorText` | string \| null | Free-text flavor when product not selected. |
| `flavorProfile` | string \| null | `tropical`, `berry-forward`, `citrus`, `ginger-forward`, `mint-forward`, `herbal`, `creamy-coconut`, `blue-spirulina`, `surprise-me`. |
| `quantity` | number | Numeric amount. |
| `quantityUnit` | string | `bottle_16oz`, `half_gallon`, `gallon`, `multi_bottle`, `sample_interest`. |
| `gallonEquivalent` | number | Computed (e.g., 1 gallon = 1.0, 1 bottle = 0.125). |
| `preferredMarketId` | string \| null | Market from `data/markets.ts`. |
| `needByDate` | Date \| null | Optional. |
| `notes` | string \| null | Customer notes, max 1000 chars. |
| `requestSource` | string | `homepage_hero`, `product_page`, `markets_page`, `weekly_menu`, `direct`. |
| `status` | string | `requested`, `collecting_demand`, `owner_review`, `awaiting_threshold`, `approved`, `reservation_offered`, `deposit_pending`, `confirmed`, `in_production`, `market_available`, `fully_reserved`, `sold_out`, `completed`, `deferred`, `canceled`. |
| `linkedBatchId` | string \| null | Assigned batch campaign UUID. |
| `ownerNotes` | string \| null | Internal only. |
| `createdAt` | Date | |
| `updatedAt` | Date | |

**Indexes**

```js
db.fresh_batch_requests.createIndex({ email: 1, createdAt: -1 });
db.fresh_batch_requests.createIndex({ status: 1, createdAt: -1 });
db.fresh_batch_requests.createIndex({ requestedProductSlug: 1, status: 1 });
db.fresh_batch_requests.createIndex({ flavorProfile: 1, status: 1 });
db.fresh_batch_requests.createIndex({ preferredMarketId: 1, status: 1 });
```

### 1.2 `batch_campaigns`

Owner-approved or proposed production batches.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `id` | string | UUIDv4 public identifier. |
| `publicName` | string | Customer-facing name, e.g., "Kissed by Gods — July 26 batch". |
| `internalFlavorKey` | string | Curated product slug or custom profile key. |
| `productSlug` | string \| null | Curated product slug, if mapped. |
| `productCategory` | string | `lemonades`, `juices`, `refreshers`, `gels`, `shots`. |
| `batchType` | string | `shared_standard`, `market_supported`, `dedicated_microbatch`, `market_only`. |
| `targetGallons` | number | Production target. |
| `reservedGallons` | number | Sum of confirmed reservations. |
| `expectedMarketGallons` | number | Planned market/sampling volume. |
| `samplingOunces` | number | Owner-configured sampling allocation. |
| `actualYieldOunces` | number \| null | Recorded after production. |
| `processLossPercentage` | number | Default 0.08. |
| `productionDate` | Date | |
| `marketId` | string | Pickup market. |
| `requestCutoff` | Date | When requests stop being added. |
| `reservationCutoff` | Date | When reservations must be paid. |
| `shelfLifeEnd` | Date \| null | |
| `marketSafe` | boolean | Owner flag for reliable market sellers. |
| `ingredientAvailability` | boolean | Owner confirmation. |
| `ownerApproved` | boolean | Explicit owner approval. |
| `standardGallonPriceCents` | number | Server-side price authority. |
| `setupFeeCents` | number | Microbatch or minimum-order premium. |
| `depositPercent` | number | e.g., 0.50. |
| `status` | string | `collecting_interest`, `owner_review`, `awaiting_minimum`, `confirmed`, `reservations_open`, `fully_reserved`, `in_production`, `available_at_market`, `sold_out`, `completed`, `deferred`, `canceled`. |
| `createdAt` | Date | |
| `updatedAt` | Date | |

**Indexes**

```js
db.batch_campaigns.createIndex({ internalFlavorKey: 1, status: 1 });
db.batch_campaigns.createIndex({ productionDate: 1, status: 1 });
db.batch_campaigns.createIndex({ marketId: 1, status: 1 });
```

### 1.3 `batch_reservations`

Payment-backed reservations created after batch approval.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `id` | string | UUIDv4. |
| `requestId` | string | Links to `fresh_batch_requests.id`. |
| `batchId` | string | Links to `batch_campaigns.id`. |
| `customerEmail` | string | Denormalized. |
| `quantity` | number | |
| `quantityUnit` | string | |
| `gallonEquivalent` | number | |
| `standardPriceCents` | number | Per-gallon/list price at reservation time. |
| `setupFeeCents` | number | Applied setup fee, if any. |
| `depositCents` | number | Amount required as deposit. |
| `balanceDueCents` | number | Remaining balance after deposit. |
| `finalPriceCents` | number | Total amount due. |
| `squarePaymentLinkId` | string \| null | Square payment link ID. |
| `squareOrderId` | string \| null | Square order ID, if available. |
| `paymentUrl` | string \| null | Customer-facing Square URL. |
| `paymentStatus` | string | `pending`, `deposit_paid`, `fully_paid`, `failed`, `refunded`, `canceled`. |
| `pickupStatus` | string | `pending`, `ready`, `picked_up`, `no_show`. |
| `marketId` | string | |
| `confirmationSentAt` | Date \| null | |
| `completedAt` | Date \| null | |
| `createdAt` | Date | |
| `updatedAt` | Date | |

**Indexes**

```js
db.batch_reservations.createIndex({ requestId: 1 });
db.batch_reservations.createIndex({ batchId: 1 });
db.batch_reservations.createIndex({ customerEmail: 1, createdAt: -1 });
db.batch_reservations.createIndex({ squarePaymentLinkId: 1 }, { sparse: true });
```

### 1.4 `batch_counters`

Atomic sequence numbers for batch campaign IDs.

| Field | Type | Notes |
|---|---|---|
| `_id` | string | e.g., `batch_campaigns`. |
| `seq` | number | Incremented atomically. |

### 1.5 `batch_audit_log`

Immutable owner decision log.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `entityType` | string | `request`, `batch`, `reservation`. |
| `entityId` | string | |
| `action` | string | `created`, `approved`, `deferred`, `rejected`, `assigned_to_batch`, `batch_confirmed`, `payment_link_created`, `payment_received`, `canceled`. |
| `actorEmail` | string | Admin email. |
| `reason` | string \| null | |
| `payload` | object | Snapshotted relevant fields. |
| `createdAt` | Date | |

---

## 2. Customer-Facing Status Mapping

| Internal request status | Customer-facing message |
|---|---|
| `requested` | "We received your request." |
| `collecting_demand` | "We are collecting more requests for this flavor." |
| `owner_review` | "We are reviewing the details." |
| `awaiting_threshold` | "More demand is needed before we can schedule this batch." |
| `approved` / `reservation_offered` | "This batch is approved. Check your email to reserve and pay." |
| `deposit_pending` | "Your reservation is waiting on payment." |
| `confirmed` / `in_production` | "Your batch is confirmed and being prepared." |
| `market_available` | "Available for pickup at the market." |
| `sold_out` | "This batch is fully reserved." |
| `deferred` | "Moved to a future batch." |
| `canceled` | "This request was canceled." |

---

## 3. Key Constraints

1. `fresh_batch_requests` never stores payment state.
2. `batch_reservations` is created only after `batch_campaigns.status` is `confirmed` or later.
3. Prices are stored in **cents** to avoid floating-point errors.
4. `squarePaymentLinkId` is written only after a successful Square API response.
5. `samplingOunces` is bounded by `actualYieldOunces - reservedVolumeOunces`.
6. `gallonEquivalent` is computed server-side; client-submitted values are ignored for pricing.

---

## 4. Migration

No destructive migration. New collections are created on first write. Optional script: `scripts/migrate-fresh-batch-collections.js` to create indexes in production before first write.
