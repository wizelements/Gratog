# Taste of Gratitude — Fresh Batch Customer Flow

**Branch:** `feat/fresh-batch-request-system`  
**Status:** UX architecture proposal. No customer-facing code changed.

---

## 1. Route

Primary entry point: `/request-a-flavor`

Additional CTAs point here from:

- Homepage hero primary button
- Product detail pages when limited/sold out
- Markets page secondary path
- Weekly menu banner

---

## 2. Hero + Landing Message

### Eyebrow
`Fresh batches guided by customer requests`

### Headline
`Tell us what you want to sip next.`

### Body
`Request a flavor, reserve a gallon, or meet us at the market to sample what is fresh. We confirm availability before you pay.`

### Primary CTA
`Request a flavor`

### Secondary CTA
`Find a market`

### Expectation copy
`Requests help us plan upcoming batches. Your request becomes an order only after Taste of Gratitude confirms the flavor, quantity, price, and pickup details.`

---

## 3. Form Fields

### Required

| Field | Input | Validation |
|---|---|---|
| Email | email input | Valid email format, max 254 chars. |
| Flavor or profile | Select known product OR select flavor profile OR enter free-text flavor | At least one must be provided. |
| Quantity | Select: `one_16oz_bottle`, `multi_16oz_bottles`, `half_gallon`, `one_gallon`, `two_gallons`, `three_plus_gallons`, `sample_interest` | Required. |
| Preferred pickup market | Select from active markets | Required. |

### Optional

| Field | Input | Notes |
|---|---|---|
| Specific product name | Autocomplete from curated products | Helps owner understand exact intent. |
| Need-by date | Date picker | Must be at least 48 hours in the future. |
| Notes | Textarea, max 1000 chars | No medical/health-goal language; filtered. |
| Phone | tel input | Optional. Does not imply SMS consent. |

### Consent

- `Send me updates about this request by email.` (checked by default; transactional)
- `Send me future fresh-batch and market updates by email.` (unchecked by default; marketing)

Phone and SMS consent are separate. SMS checkbox is unchecked and must be explicitly opted into.

---

## 4. Flavor Selection Rules

### Known flavor

Customer selects from curated `data/products.ts` products that are:

- `category: 'lemonades' | 'refreshers' | 'juices'`
- `activeWeeklyMenu: true` OR `inventoryStatus: 'sold_out' | 'limited'`

Example: `Kissed by Gods`, `Strawberry Bliss`, `Supplemint`, `Calm Waters`.

### Flavor profile

Sensory-only options:

- Tropical
- Berry-forward
- Citrus
- Ginger-forward
- Mint-forward
- Herbal
- Creamy or coconut-based
- Blue spirulina
- Surprise me from an upcoming batch

Prohibited profile language:

- Immunity
- Detox
- Weight support
- Thyroid
- Blood pressure / blood sugar
- Healing / recovery / stress relief
- Any medical or physiological outcome

### Free-text flavor

Allowed for brief descriptions like "mango-pineapple lemonade" or "spicy ginger refresher."  
Server sanitizes and flags health-claim words for owner review.

---

## 5. Quantity Guidance

| Selection | Default meaning |
|---|---|
| One 16 oz bottle | Join batch-interest pool; does not trigger custom production. |
| Multiple 16 oz bottles | Join batch-interest pool; may be grouped into a shared batch. |
| Half gallon | May join shared batch or microbatch if no shared batch forms. |
| One gallon | Decision engine evaluates shared-threshold, market-safe, or microbatch path. |
| Two gallons | Stronger shared-batch candidate. |
| Three or more gallons | Treated as serious pooled demand. |
| Sample at the market | Expresses sampling interest only; no reservation created. |

---

## 6. Submission Flow

```
Customer fills /request-a-flavor
  → Client validation (email, flavor/quantity/market)
  → POST /api/fresh-batch/requests
    → Server validates against curated data
    → Computes gallonEquivalent
    → Deduplicates recent duplicate (same email + same product/profile within 24h)
    → Inserts into fresh_batch_requests (status: requested)
    → Queues transactional email: request received
    → Sends owner alert (Telegram/Resend) if configured
    → Returns { success, requestId, status, message }
  → Client shows confirmation:
      "Request received. We will email you once the batch is approved."
```

No payment is collected.

---

## 7. Post-Submission Customer States

| Owner action | Email sent | Customer-visible status |
|---|---|---|
| Request received | `fresh_batch_request_received` | "Request received" |
| Owner moves to batch collecting demand | `fresh_batch_collecting_demand` | "Collecting more requests" |
| Owner defers | `fresh_batch_deferred` | "Moved to a future batch" |
| Threshold reached | `fresh_batch_threshold_reached` | "Batch is forming — check your email" |
| Owner approves batch | `fresh_batch_confirmed` + reservation link | "Batch confirmed — reserve and pay" |
| Reservation link opened | `fresh_batch_reservation_reminder` (optional) | "Complete payment to reserve" |
| Deposit paid | `fresh_batch_deposit_received` | "Deposit received" |
| Fully paid | `fresh_batch_pickup_details` | "Confirmed for pickup" |
| Batch delayed | `fresh_batch_delayed` | "Batch delayed" |
| Sold out | `fresh_batch_sold_out` | "Fully reserved" |
| Alternative offered | `fresh_batch_alternative_offered` | "Alternative flavor available" |

---

## 8. Accessibility Requirements

- Semantic headings (`h1` hero, `h2` sections, `h3` cards).
- All form inputs have associated `<label>`.
- Error messages linked via `aria-describedby`.
- Success state announced with `role="status"`.
- Focus visible and logical.
- Color not sole communicator of status.
- Large tap targets (min 44×44 CSS px on mobile).
- Reduced-motion support (`prefers-reduced-motion`).

---

## 9. Analytics Events

Privacy-safe events to track (no PII):

- `view_fresh_batch_hero`
- `click_request_flavor`
- `open_flavor_request`
- `select_flavor_profile`
- `select_request_quantity`
- `select_request_market`
- `submit_flavor_request`
- `flavor_request_error`
- `flavor_request_complete`
- `join_batch_interest`
- `click_market_sampling`
- `reservation_offered`
- `reservation_link_opened`
- `deposit_complete`
- `pickup_complete`

---

## 10. Mobile-First Structure

1. Request-led hero
2. How requests work (3 steps)
3. Flavor-profile choices
4. Three customer paths (shared batch, microbatch, market sample)
5. Active markets
6. Product-format explanation
7. Founder trust section
8. Request form
9. FAQ
10. Final email/CTA

---

## 11. Honesty Guardrails

- No fake request counters.
- No countdown timers.
- No fabricated social proof.
- No guarantee that every request becomes a batch.
- No promise of a specific flavor at the market unless owner confirms.
- No medical or wellness-goal framing.
- No automatic SMS subscription.
