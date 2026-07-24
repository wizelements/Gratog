# Taste of Gratitude — Microbatch Economics

**Branch:** `feat/fresh-batch-request-system`  
**Status:** Owner-input worksheet. All estimates are assumptions until the owner provides real figures.  
**Do not publish a microbatch fee from this document alone.**

---

## 1. Purpose

This document calculates the cost structure for fresh-batch production so the Fresh Batch Request System can:

- Protect margins on one-gallon custom orders.
- Set a data-backed microbatch setup fee.
- Set a safe shared-batch threshold.
- Decide whether leftover inventory can be carried to market.

It separates **verified inputs** (from the repository) from **assumptions** (marked explicitly) and **owner inputs** (still needed).

---

## 2. Verified Pricing from Repository

The curated product data (`data/products.ts`) currently lists 16 oz bottle prices. There is no gallon price in the repository. All gallon economics are derived from bottle prices and assumptions.

| Product | Category | 16 oz bottle price | Bottles per gallon (128 oz) |
|---|---|---|---|
| Kissed by Gods | Lemonade | $11.00 | 8 |
| Supplemint | Lemonade | $11.00 | 8 |
| Strawberry Bliss | Lemonade | $10.00 | 8 |
| Black Minerals | Lemonade | $12.00 | 8 |
| Calm Waters | Juice | $12.00 | 8 |
| Spicy Bloom | Refresher | $11.00 | 8 |

**Verified fact:** There is no canonical gallon SKU in the current product data. The weekly menu is 16 oz bottle-oriented.

---

## 3. Volume Conversions

Standard conversion rules used by the decision engine:

| Unit | Ounces | Bottles (16 oz) | Gallons |
|---|---|---|---|
| 1 bottle | 16 oz | 1 | 0.125 |
| 1 half gallon | 64 oz | 4 | 0.5 |
| 1 gallon | 128 oz | 8 | 1 |
| 5 gallons | 640 oz | 40 | 5 |

**Configurable process-loss default:** 8% (assumption).  
**Resulting effective yield from 5 gallons:**

- Gross: 640 oz → 40 bottles
- After 8% loss: 589 oz → ~37 bottles

---

## 4. Cost Assumptions (Owner Input Needed)

The following are placeholder assumptions. The owner must replace them with actual vendor receipts and labor estimates.

### 4.1 Ingredient costs per gallon — Lemonade example (Kissed by Gods)

| Ingredient | Assumed cost per gallon | Source |
|---|---|---|
| Sea moss gel base | $4.00 | Assumption |
| Lemon juice | $2.00 | Assumption |
| Ginger | $1.50 | Assumption |
| Basil | $2.00 | Assumption |
| Chlorophyll | $1.00 | Assumption |
| Agave | $1.50 | Assumption |
| Alkaline water | $0.50 | Assumption |
| **Subtotal ingredients** | **$12.50** | |

### 4.2 Packaging costs per gallon

| Item | Cost | Notes |
|---|---|---|
| 16 oz bottle (×8) | $4.00 | $0.50 each |
| Caps (×8) | $0.80 | $0.10 each |
| Labels (×8) | $1.60 | $0.20 each |
| Ice / refrigeration | $1.00 | Assumption |
| **Subtotal packaging** | **$7.40** | |

### 4.3 Labor and operations per batch

| Task | 5-gallon batch | 1-gallon microbatch |
|---|---|---|
| Prep + setup | 30 min | 25 min |
| Production | 45 min | 20 min |
| Sanitation + cleanup | 45 min | 40 min |
| Filtering / transfer loss handling | 15 min | 10 min |
| Labeling + packaging | 30 min | 15 min |
| Admin / customer communication | 15 min | 20 min |
| **Total labor minutes** | **180 min** | **130 min** |

Assumed labor rate: $25/hour.

- 5-gallon labor cost: 3 hrs × $25 = **$75.00**
- 1-gallon labor cost: ~2.17 hrs × $25 = **$54.17**

### 4.4 Other costs

| Cost | 5-gallon batch | 1-gallon microbatch |
|---|---|---|
| Payment processing (3% of revenue) | variable | variable |
| Spoilage risk allocation | $2.00 | $1.00 |
| Market transport | $3.00 | $1.50 |
| Quality-control samples | $1.00 | $0.50 |
| Equipment / utilities | $2.00 | $2.00 |

---

## 5. Cost Calculations (Assumption-Based)

### 5.1 Lemonade — Kissed by Gods example

#### 5-gallon standard batch

| Line | Amount |
|---|---|
| Ingredients (5 gal × $12.50) | $62.50 |
| Packaging (5 gal × $7.40) | $37.00 |
| Labor | $75.00 |
| Other | $8.00 |
| **Total batch cost** | **$182.50** |
| Cost per gallon | $36.50 |
| Cost per 16 oz bottle (after 8% loss, ~37 bottles) | ~$4.93 |

If sold as 40 bottles at $11: revenue = $440.  
If sold as 37 effective bottles: revenue = $407.  
Margin at 37-bottle sell-through: ~$224.50 (55% gross).

#### 1-gallon dedicated microbatch

| Line | Amount |
|---|---|
| Ingredients | $12.50 |
| Packaging | $7.40 |
| Labor | $54.17 |
| Other | $5.00 |
| **Total batch cost** | **$79.07** |
| Cost per gallon | $79.07 |
| Cost per 16 oz bottle (after 8% loss, ~7.4 bottles) | ~$10.69 |

If sold as 8 bottles at $11: revenue = $88.  
Margin: ~$8.93 (10% gross). This is thin.

### 5.2 Break-even microbatch premium

Using the assumption table above, a 1-gallon lemonade microbatch needs additional margin to be worthwhile.

| Target margin | Required setup fee |
|---|---|
| 30% gross margin on microbatch | ~$25.00 setup fee |
| 40% gross margin | ~$35.00 setup fee |
| 50% gross margin | ~$45.00 setup fee |

Recommended starting hypothesis (until owner verifies costs):

- **Standard gallon price:** derived from 8 × 16 oz bottle price (e.g., $88 for Kissed by Gods).
- **Microbatch setup fee:** $25–$45 depending on category and labor.
- **Deposit:** 50% of total (or full setup fee upfront).

---

## 6. Shared-Batch Threshold Recommendation

Assumptions:

- Standard batch = 5 gallons.
- Effective yield after loss = ~37 bottles.
- Each confirmed gallon reservation = 8 bottles.

| Confirmed gallons | Bottles reserved | Leftover market bottles | Viability |
|---|---|---|---|
| 1 | 8 | ~29 | Microbatch only unless market-safe |
| 2 | 16 | ~21 | Below threshold; microbatch or market-safe batch |
| 3 | 24 | ~13 | **Recommended shared-batch threshold** |
| 4 | 32 | ~5 | Strong shared batch |
| 5 | 40 | ~0 | Fully reserved; no market bottles |

**Recommended default threshold:** 3 confirmed gallons triggers a standard shared batch.  
**Market-safe override:** For owner-approved core flavors with an upcoming market and confirmed expected sell-through, a 2-gallon or even 1-gallon batch may be approved manually.

---

## 7. Required Market Sell-Through for Leftover Inventory

If a shared batch produces 5 gallons but only 3 gallons are reserved, ~13 bottles remain for market sale.

| Scenario | Leftover bottles | Required sell-through at $11/bottle | Breakeven on leftover |
|---|---|---|---|
| 3 reserved, 2 leftover | ~13 | 100% | $143 revenue covers leftover variable cost |
| 2 reserved, 3 leftover | ~21 | 100% | $231 revenue; higher spoilage risk |
| 1 reserved, 4 leftover | ~29 | 100% | High risk; only market-safe or microbatch |

If leftover bottles do not sell before shelf-life ends, the margin of the reserved portion must absorb the loss. This is why the decision engine requires `marketSafe` + `ownerApproved` for sub-threshold standard batches.

---

## 8. Sampling Allocation

Recommended default:

- **Sampling allocation:** 16–32 oz per batch (owner configurable).
- **Sample cup size:** 2 oz.
- **Estimated samples:** 8–16 per batch.
- **Rule:** Samples are drawn only from unreserved market volume. Reserved customer volume is never sampled.

---

## 9. Owner Input Worksheet

Please replace assumption values with actuals.

| # | Question | Default / Assumption | Owner answer |
|---|---|---|---|
| 1 | Standard batch size (gallons) | 5 | |
| 2 | Minimum pooled demand (gallons) | 3 | |
| 3 | Process-loss percentage | 8% | |
| 4 | Sea moss gel base cost per gallon | $4.00 | |
| 5 | Lemonade ingredient cost per gallon | $12.50 | |
| 6 | Juice ingredient cost per gallon | $13.00 | |
| 7 | Refresher ingredient cost per gallon | $12.00 | |
| 8 | Bottle cost each | $0.50 | |
| 9 | Cap cost each | $0.10 | |
| 10 | Label cost each | $0.20 | |
| 11 | Labor rate per hour | $25.00 | |
| 12 | 5-gallon labor minutes | 180 | |
| 13 | 1-gallon labor minutes | 130 | |
| 14 | Spoilage risk allocation per gallon | $1.00 | |
| 15 | Market transport per batch | $3.00 | |
| 16 | Payment-processing percentage | 3% | |
| 17 | Desired minimum gross margin | 40% | |
| 18 | Microbatch setup fee (lemonade) | $35.00 | |
| 19 | Microbatch setup fee (juice) | $35.00 | |
| 20 | Microbatch setup fee (refresher) | $40.00 | |
| 21 | Deposit percentage | 50% | |
| 22 | Maximum weekly custom microbatches | 3 | |
| 23 | Sampling allocation per batch | 16 oz | |
| 24 | Market-safe core flavors | Kissed by Gods, Calm Waters, Strawberry Bliss, Supplemint | |
| 25 | Shelf-life window (days) | 7 | |
| 26 | Cancellation policy | Deposit refunded if batch canceled by owner; customer-cancelled deposit becomes store credit | |
| 27 | Refund or store-credit policy | Store credit preferred | |

---

## 10. Decision-Engine Defaults

Until owner inputs are received, the engine will use these safe defaults:

| Parameter | Default |
|---|---|
| `standardBatchSizeGallons` | 5 |
| `sharedBatchThresholdGallons` | 3 |
| `processLossPercent` | 0.08 |
| `samplingOunces` | 16 |
| `maxWeeklyMicrobatches` | 3 |
| `depositPercent` | 0.50 |
| `setupFeeCentsLemonade` | 3500 ($35.00) |
| `setupFeeCentsJuice` | 3500 ($35.00) |
| `setupFeeCentsRefresher` | 4000 ($40.00) |

All defaults are overridable per batch in the admin planner and stored on `batch_campaigns`.

---

## 11. Conclusion

The Fresh Batch Request System can be implemented with configurable pricing and a clear owner-input worksheet. The microbatch fee must not be published until the owner verifies ingredient, labor, and packaging costs. The decision engine will use conservative defaults that protect margin and prevent one-gallon demand from automatically triggering five-gallon production.
