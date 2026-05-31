# REWARD_IDEMPOTENCY_REPORT — Assumption 4 verification

> **Assumption:** No duplicate rewards can occur.
> **Verdict:** ❌ **FALSE. Verified double-award path + non-idempotent helper.**

## Evidence

### Call site 1: `/api/orders/create` (pre-payment, fire-and-forget)
[app/api/orders/create/route.js#L207-241](file:///data/data/com.termux/files/home/Gratog-live/app/api/orders/create/route.js#L207-L241):
```js
async function awardRewardPointsWithRetry(order) {
  if (!INTERNAL_REWARDS_TOKEN) return { skipped: true };
  return retrySquareApi(async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/rewards/add-points`, {
      method: 'POST', headers: { Authorization: `Bearer ${INTERNAL_REWARDS_TOKEN}` },
      body: JSON.stringify({ email, points, activityType: 'purchase', activityData: { orderId, items, total } })
    });
    if (!response.ok) throw new Error(`Reward points API returned ${response.status}`);
    return response.json();
  });
}
```
Triggered at line 133 inside `createOrder`. Runs **before payment**.

### Call site 2: `/api/payments` (post-payment, direct)
[app/api/payments/route.ts#L996-1006](file:///data/data/com.termux/files/home/Gratog-live/app/api/payments/route.ts#L996-L1006):
```ts
if (customerInfo?.email && isCompleted && rewardsSystem) {
  const pointsToAward = Math.ceil(validatedAmountCents / 100);
  await rewardsSystem.addPoints(
    customerInfo.email, pointsToAward, 'purchase',
    { orderId, amountCents: validatedAmountCents }
  );
}
```

### Helper `rewardsSystem.addPoints` is NOT idempotent
[lib/enhanced-rewards.js#L143-L196](file:///data/data/com.termux/files/home/Gratog-live/lib/enhanced-rewards.js#L143-L196):
```js
async addPoints(email, points, activityType, activityData = {}, fallbackMode = true) {
  // ...
  const activity = { id: uuidv4(), type: activityType, points, data: activityData, timestamp: new Date() };
  const result = await this.db.collection('customer_passports').findOneAndUpdate(
    { email },
    {
      $inc: { points, totalPointsEarned: points },
      $push: { activities: activity },
      $set: { updatedAt: new Date() }
    },
    { returnDocument: 'after', upsert: true, includeResultMetadata: true }
  );
  // ...
}
```
- No condition on `activities.orderId` or any prior-award check.
- Each invocation `$inc` points unconditionally.
- New `activity.id = uuidv4()` every time — every call appears unique.

### What about `/api/rewards/add-points` route?
[app/api/rewards/add-points/route.js](file:///data/data/com.termux/files/home/Gratog-live/app/api/rewards/add-points/route.js):
- Authenticates internal principal ✅.
- Calls `rewardsSystem.addPoints(...)` directly.
- **No idempotency check** before calling.

## Confirmed double-award scenarios

| Scenario | Result |
|---|---|
| **Normal order + pay (single attempt)** | 🔴 **2× points** — once at order-create (call 1), once at payment-success (call 2). |
| **Order created, payment retried (network blip)** | 🔴 **3+ points** — call 1 fires once at create, call 2 fires for each successful payment retry that hits the `isCompleted` branch. Mitigated only by Square idempotency dedupe and the precedence guard at top of `/api/payments` ("PAYMENT_IN_PROGRESS" gate). |
| **Order created, customer abandons** | 🔴 **1× ghost award** — call 1 fired without payment; customer keeps points. |
| **Webhook replays `payment.updated`** | 🟢 webhook handler doesn't call `addPoints` (verify in `/api/webhooks/square`). |
| **Customer reloads `/order/success`** | 🟢 no client-side reward triggers found. |
| **Multiple browser tabs double-submit** | 🔴 if Idempotency-Key header missing, two `/api/orders/create` calls each fire call 1 → 2× ghost awards. |

## Worst-case math

Default `pointsToAward = ceil(totalCents/100)` ≈ 1 point per dollar.

Per real $20 order:
- Ghost award at order create: +20 points (fired regardless of payment).
- Real award at payment success: +20 points (verified).
- Net redeemed at $0.01 per point typical: +$0.40 of margin loss per order.

Over 100 orders/month: ~$40/month margin leak from double-award alone, plus the ghost awards from abandons.

## Other duplicate vectors

### Refund flow
Verify `/api/admin/orders/[id]/refund` reverses points. Code search needed:
```bash
rg -n "addPoints\|deductPoints\|reverse" app/api/admin/orders/\[id\]/refund/
```
If no reversal, refunded customers keep their points → free credit.

### Coupon awards
Coupons may also award points via `/api/rewards/add-points` from admin campaign — verify campaign-manager.js path.

## Required fix (Phase 3.3 of playbook)

1. **Remove call site 1** entirely. Rewards belong post-payment only.
2. **Make `addPoints` idempotent** on `(email, activityData.orderId, activityType)`:
   ```js
   const updateRes = await db.collection('customer_passports').updateOne(
     { email, 'activities.data.orderId': { $ne: activityData.orderId } },
     {
       $inc: { points, totalPointsEarned: points },
       $push: { activities: activity },
       $setOnInsert: { email, createdAt: new Date() },
       $set: { updatedAt: new Date() }
     },
     { upsert: true }
   );
   if (updateRes.modifiedCount === 0 && updateRes.upsertedCount === 0) {
     logger.warn('Rewards', 'Skipped duplicate addPoints', { email, orderId });
     return { success: true, deduplicated: true };
   }
   ```
3. **Add refund reversal** in `/api/admin/orders/[id]/refund` — call `rewardsSystem.deductPoints(email, points, 'refund', { orderId })` after Square refund confirms.
4. **Test:** call `addPoints` twice with same `orderId` → assert single increment.

## Verdict

Plan correctly identifies (Phase 3.3) but should be expanded to include **refund reversal** path. Without it, refunds become a permanent points-grant.
