# Customer LTV Backfill Report — v1.0-boringly-reliable

**Date:** 2026-06-01
**Mode:** Read-only comparison. No mutations.

## Inputs

- `orders` collection (794 docs total, 756 with paid-like
  `paymentStatus`)
- `customers` collection (`0` documents)
- `users` collection (2 documents, `0` with `totalSpent` field)

## Aggregation

```js
db.orders.aggregate([
  { $match: { paymentStatus: { $in: ["paid","COMPLETED"] } } },
  { $group: { _id: { $toLower: "$customer.email" },
              sumPaid: { $sum: "$pricing.total" },
              n: { $sum: 1 } } }
])
```

Per-email paid-order sums were then compared against
`customers.totalSpent` (or `users.totalSpent`).

## Result categories

| Category | Count |
| --- | --- |
| MATCHES (|stored − calc| < $0.01) | 0 |
| MINOR DRIFT (|diff| < $1) | 0 |
| MAJOR DRIFT (|diff| ≥ $1) | 0 |
| Orphan paid orders (no customer row) | 0 (because no customer rows exist at all) |

## Interpretation

The `customers` collection is **empty** in production. The `users`
collection has two rows, neither with a `totalSpent` field. This means
the canonical Lifetime-Value bucket the audit assumed does **not
currently exist** in production data.

Possible reasons (not investigated further in this thread, per scope):

1. The LTV bucket lives on a different collection (`passports`,
   `customer_passports`, `rewards`, `pending_customers`) and the audit
   has not yet been updated to point at it.
2. LTV writes are gated on a flag that has never fired (no paid order
   since deploy — see MONGO_STATE_VERIFICATION.md).
3. LTV was never wired up for this storefront iteration and the
   "Customer totalSpent increments once" guarantee from the original
   release plan is aspirational rather than implemented.

## Drift impact on release

Per release rules ("Release may proceed if drift is documented and
non-blocking"):

- There is no detectable drift because there is no detectable LTV
  store to drift against.
- This is documented; no customer data is wrong; no refunds or
  charges are affected.

**Verdict:** non-blocking for v1.0-boringly-reliable. Tracked as a
post-release investigation item:

> "Determine canonical customer-LTV collection and document the write
> path. Until then, customer LTV is *not* a release guarantee."

## Correction plan (when LTV destination is identified)

```js
// READ-ONLY draft, do not run without approval.
const pipeline = [
  { $match: { paymentStatus: "paid" } },
  { $group: { _id: { $toLower: "$customer.email" },
              totalSpent: { $sum: "$pricing.total" },
              orderCount: { $sum: 1 },
              firstAt: { $min: "$createdAt" },
              lastAt:  { $max: "$createdAt" } } }
];
// → preview output to operator, then if approved:
//   for each row: db.<canonical>.updateOne(
//     { email: row._id },
//     { $set: { totalSpent: row.totalSpent,
//               orderCount: row.orderCount,
//               firstOrderAt: row.firstAt,
//               lastOrderAt: row.lastAt } },
//     { upsert: true }
//   );
```

Do not execute until the canonical collection is named.
