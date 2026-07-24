# Taste of Gratitude — Fresh Batch Owner Decisions

**Branch:** `feat/fresh-batch-request-system`  
**Status:** Decision register. Unresolved items below must be answered before publishing microbatch fees or final thresholds.

---

## How to Use This Register

Each decision has:

- **Question**
- **Default / safe assumption**
- **Impact if unanswered**
- **Status**

Defaults are chosen to protect margin and operational sanity. Implementation can proceed with defaults; fees and thresholds can be tuned later.

---

## 1. Production Economics

| # | Question | Default | Impact if unanswered | Status |
|---|---|---|---|---|
| 1.1 | Standard batch size per category | 5 gallons | Affects threshold math and leftover-bottle calculation. | Default acceptable |
| 1.2 | Minimum pooled demand for shared batch | 3 gallons | Below this, system routes to microbatch or demand collection. | Default acceptable |
| 1.3 | Process-loss percentage | 8% | Affects yield and market-bottle estimates. | Default acceptable |
| 1.4 | Actual ingredient cost per gallon (lemonade) | Assumed $12.50 | Cannot publish a real microbatch fee. | **Owner input needed** |
| 1.5 | Actual ingredient cost per gallon (juice) | Assumed $13.00 | Cannot publish a real microbatch fee. | **Owner input needed** |
| 1.6 | Actual ingredient cost per gallon (refresher) | Assumed $12.00 | Cannot publish a real microbatch fee. | **Owner input needed** |
| 1.7 | Packaging cost per bottle / gallon | Assumed $0.80 bottle + $1.00 ice | Affects microbatch cost. | **Owner input needed** |
| 1.8 | Labor rate and batch time | Assumed $25/hr, 130 min for 1 gal | Affects microbatch setup fee. | **Owner input needed** |
| 1.9 | Desired minimum gross margin | 40% | Determines setup fee. | Default acceptable |

## 2. Pricing

| # | Question | Default | Impact if unanswered | Status |
|---|---|---|---|---|
| 2.1 | Standard gallon price basis | 8 × 16 oz bottle price | Customer-facing gallon price. | Default acceptable |
| 2.2 | Microbatch setup fee (lemonade) | $35.00 | Protects margin on 1-gal custom orders. | **Owner input needed** |
| 2.3 | Microbatch setup fee (juice) | $35.00 | Same as above. | **Owner input needed** |
| 2.4 | Microbatch setup fee (refresher) | $40.00 | Higher if production is less efficient. | **Owner input needed** |
| 2.5 | Deposit percentage or fixed amount | 50% | Reduces ingredient risk. | Default acceptable |

## 3. Operational Rules

| # | Question | Default | Impact if unanswered | Status |
|---|---|---|---|---|
| 3.1 | Maximum weekly custom microbatches | 3 | Limits operational overload. | Default acceptable |
| 3.2 | Sampling allocation per batch | 16 oz | Controls sample count. | Default acceptable |
| 3.3 | Sample cup size | 2 oz | Estimated sample count. | Default acceptable |
| 3.4 | Market-safe core flavors | Kissed by Gods, Calm Waters, Strawberry Bliss, Supplemint | Allows sub-threshold shared batches only for reliable sellers. | **Owner input needed** |
| 3.5 | Request cutoff before production | 48 hours before production date | Affects need-by date validation. | Default acceptable |
| 3.6 | Reservation payment cutoff | 24 hours before production date | Affects when unpaid reservations are canceled. | Default acceptable |
| 3.7 | Shelf-life window | 7 days | Affects market-only batch decisions. | **Owner input needed** |

## 4. Markets and Pickup

| # | Question | Default | Impact if unanswered | Status |
|---|---|---|---|---|
| 4.1 | Approved pickup markets | Serenbe, Dunwoody (from `data/markets.ts`) | Form market selector. | Already configured |
| 4.2 | Production days | Saturday market days | Affects production-date options. | Default acceptable |
| 4.3 | Whether market samples are allowed | Yes | Enables sampling checkbox. | Default acceptable |

## 5. Policies

| # | Question | Default | Impact if unanswered | Status |
|---|---|---|---|---|
| 5.1 | Cancellation policy (customer) | Deposit becomes store credit | Must be clear before taking deposits. | **Owner input needed** |
| 5.2 | Cancellation policy (owner-initiated) | Full refund of deposit and balance | Must be clear. | **Owner input needed** |
| 5.3 | Refund or store-credit preference | Store credit | Affects Square refund workflow. | **Owner input needed** |
| 5.4 | Whether phone remains optional | Yes | Form field requirement. | Default acceptable |
| 5.5 | Whether fully custom flavors are allowed | No — profile-based only | Food-safety and inventory risk. | Default acceptable |

## 6. Communications

| # | Question | Default | Impact if unanswered | Status |
|---|---|---|---|---|
| 6.1 | Owner notification channel for new requests | Resend + Telegram (existing owner alerts) | Ensures owner sees requests quickly. | Already configured |
| 6.2 | Automated weekly batch summary | No | Can be added later; keep Phase 1 manual. | Default acceptable |

---

## Decisions Blocking Publication of Microbatch Fees

The following must be answered before the microbatch setup fee is shown to customers:

1. Actual ingredient cost per gallon by category.
2. Packaging cost per bottle/gallon.
3. Labor rate and batch time.
4. Desired minimum gross margin.

Until then, the system can collect requests and route one-gallon orders to `owner_review` with a clear message:

> "This request is being reviewed. We will confirm the final price and production options by email before payment."

---

## Approved Defaults for Implementation

The implementation will proceed with:

- 5-gallon standard batch size.
- 3-gallon shared-batch threshold.
- 8% process loss.
- 50% deposit.
- 16 oz default sampling allocation.
- 3 weekly microbatch maximum.
- Profile-based custom flavors only (no fully custom formulations in Phase 1).
- Phone optional; SMS consent explicit and default false.
- Marketing email consent explicit and default false.
