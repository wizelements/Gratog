# MongoDB State Verification — v1.0-boringly-reliable

**Date:** 2026-06-01
**Production commit:** `0605c879` (deployed 2026-05-30)
**Database:** `taste_of_gratitude`

## Blocker 4 — Real order verification

### Method

Read-only inspection of the `orders`, `payment_records`,
`reward_transactions`, and `email_sends` collections in production to
locate at least one paid order that has flowed through the new
post-payment idempotency code path (i.e. carries `paidEffectsAppliedAt`).

### Result

**Zero paid orders have been created since the 2026-05-30 deployment.**

```
orders since 2026-05-30 ........... 0
payment_records since 2026-05-30 .. 0
orders.paymentStatus="paid" since . 0
```

Most recent activity:

| Order id (truncated) | createdAt | paymentStatus | paidEffectsAppliedAt |
| --- | --- | --- | --- |
| 1483da9b… | 2026-05-04 | pending | — |
| 210473c7… | 2026-04-30 | PENDING | — |
| 76f3784b… | 2026-04-29 | pending | — |
| f67272fe… | **2026-04-04** | paid | — (predates new code) |

Across all 753 historically `paid` orders, **`paidEffectsAppliedAt` is
absent on every document** — expected, because every one of them was
written by the prior code path.

### Reward / email tracking corollary

```
reward_transactions docs ........ 0
email_sends docs ................ 3   (all 'contact_notification', all 'failed')
```

Neither the reward idempotency path nor the order-confirmation email
path has been exercised in production since the deploy.

### Verdict

**BLOCKER 4 cannot be cleared from this verification thread.** A
controlled live test order — placed with a real card against the live
Square integration — is required to prove:

- `paidEffectsAppliedAt` is written exactly once.
- `reward_transactions` insert succeeds with the unique
  `(email, orderId, type)` index.
- `email_sends` records the order-confirmation send with a non-null
  `messageId` and `status: "sent"`.
- The customer LTV write (whichever collection is canonical — see
  CUSTOMER_LTV_BACKFILL_REPORT.md) increments exactly once.
- Duplicate webhooks / retries do not double-apply effects.

Until a real order is run, the new business logic is **untested under
production conditions** and we cannot honestly assert
"boringly-reliable".

## Stop-release checklist (live order)

Run one controlled test order and confirm:

- [ ] Order document written with server-authoritative price equal to
      the database-rebuilt total.
- [ ] `squarePaymentId` populated.
- [ ] `paidEffectsAppliedAt` populated exactly once (atomic
      `$exists:false → $set` claim in `app/api/payments/route.ts`).
- [ ] One `reward_transactions` document with matching
      `(email, orderId, type)`.
- [ ] One `email_sends` record with `status:"sent"` and non-null
      `messageId`.
- [ ] Customer LTV bucket (see LTV report) increments exactly once.
- [ ] Re-send the same Square webhook → no second reward, no second
      LTV bump, no second confirmation email.

If any row fails, do not tag.
