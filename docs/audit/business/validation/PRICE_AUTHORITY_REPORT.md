# PRICE_AUTHORITY_REPORT — Assumption 3 verification

> **Assumption:** Catalog price is authoritative.
> **Verdict:** ❌ **FALSE TODAY. Server-rebuild is implemented at PAY-time, not at ORDER-CREATE time. Tampering vector survives.**

## Trace

### Product page (`app/product/[slug]/page.jsx`)
- Reads price from `/api/products` or `/api/storefront/catalog` (Square-derived).
- Displays formatted dollar amount.
- "Add to cart" stores `{ price, productId, variationId, ... }` in Zustand store (`stores/cart.ts`).

### Cart (`stores/cart.ts` Zustand → localStorage)
- Client-side state only.
- `price` field is whatever was set at add-to-cart time.
- ⚠️ Client controls all fields after PDP. Attacker can edit localStorage to set `price: 0.01`.

### Checkout (`app/checkout/page.tsx` + `components/checkout/*`)
- Reads cart from Zustand.
- May call `/api/cart/price` for display totals (server-rebuilt).
- ⚠️ But submits the cart with **client prices** to `/api/orders/create`.

### Order creation (`app/api/orders/create/route.js#L79-96`)
```js
subtotal: (() => {
  if (typeof orderData.subtotal === 'number' && orderData.subtotal > 0) return orderData.subtotal;
  return orderData.cart.reduce(
    (sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0),
    0
  );
})(),
total: (() => {
  if (typeof orderData.total === 'number' && orderData.total > 0) return orderData.total;
  const sub = orderData.cart.reduce(...);
  const delivery = Number(orderData.deliveryFee) || 0;
  const discount = Number(orderData.couponDiscount) || 0;
  const tip = Number(orderData.deliveryTip) || 0;
  return Math.max(0, sub + delivery + tip - discount);
})(),
```
**Findings:**
- 🔴 Subtotal uses client-supplied if "valid".
- 🔴 Total uses client-supplied if "valid".
- 🔴 Per-item `price` is trusted from `orderData.cart[i].price`.
- 🔴 `deliveryFee`, `couponDiscount`, `deliveryTip` are trusted from client.
- 🟢 `couponDiscount` is *not* validated against the actual coupon record at this step.

`services/order.ts#L185-200` (the client-side caller) also computes `subtotal` and `total` from client-side `cart[].price` and passes both. Adds `couponDiscount: sanitizedDiscount` from client.

### Payment (`app/api/payments/route.ts#L500-560`)
- Loads order from DB by `orderId`.
- Reads `order.totalCents || order.pricing.total*100 || order.total*100`.
- Validates that `amountCents` from client === stored total. Blocks any mismatch.
- ⚠️ But the stored value came from possibly-tampered `/api/orders/create` input.

## Modification surface (every place price/discount/coupon/tax/shipping can be set)

| Surface | Field | Trust | Risk |
|---|---|---|---|
| PDP add-to-cart | `cart[].price` | client | 🔴 attacker edits localStorage |
| Cart drawer | quantity, possibly variant | client | 🟡 quantity validation needed |
| Checkout form | `deliveryFee` | derived from form selection client-side | 🟠 should compute server-side |
| Checkout form | `deliveryTip` | customer-selected | 🟢 customer-chosen tip is fine if non-negative |
| Coupon entry | `couponCode` + computed `couponDiscount` | client computes and submits both | 🔴 attacker submits arbitrary discount |
| `/api/cart/price` | server-rebuilt | server | 🟢 authoritative — but not actually used by `/api/orders/create` |
| `/api/orders/create` | accepts above as-is | client-trusted | 🔴 critical |
| `/api/payments` | re-reads stored total | server | 🟢 but stored value already polluted |
| `lib/transactions.ts` | passes `orderData.total` through | n/a | 🟡 trusts caller |
| Square `Payments.createPayment` | server-computed `amountCents` | server | 🟢 final guard |

## Tax / shipping

- Tax: not explicitly computed in `/api/orders/create`. Likely zero or Square-side. Verify in store config.
- Shipping: `app/api/shipping/rates/route.ts` returns rates server-side ✅. UI uses these for display. But `/api/orders/create` accepts `deliveryFee` from client → tamperable.

## Exploit recap

```
attacker pastes JS into devtools:
  useCartStore.getState().items.forEach(i => i.price = 0.01)
  // also sets couponDiscount = 0 (or skips coupon entirely)
proceed to checkout → /api/orders/create stores subtotal=$0.04, total=$0.04
proceed to pay → /api/payments validates 4 vs 4 ✅
Square charges $0.04
order ships at full retail
```

**Loss per event:** unbounded (cart total).

## Mitigation already partially in place

- ✅ `/api/cart/price` exists and rebuilds from catalog.
- ✅ `/api/payments` has strict amount validation against stored order.
- ❌ Bridge between them is missing — `/api/orders/create` does not call `/api/cart/price` (or equivalent helper) before persisting.

## Required action (Phase 3.1 of playbook is correct)

Implement `lib/cart-pricing.ts#priceCart(input, opts)` that:
1. Takes only `{ variationId, catalogObjectId, quantity }` per item — discards client `price`.
2. Resolves each to Square catalog row (`unified_products` or live Square Catalog API).
3. Computes line totals server-side.
4. Validates coupon against `coupons` collection (active, not expired, usable).
5. Applies discount server-side.
6. Adds delivery fee from `/api/shipping/rates` if applicable.
7. Computes final total in cents.
8. Returns full `PricedCart` object.

Use this output to build `enhancedOrder` in `/api/orders/create` — **never** read `orderData.subtotal`, `orderData.total`, or `orderData.couponDiscount` from the request.

Also refactor `/api/cart/price` to call the same helper so the preview and the order match exactly.

## Verdict

**Assumption 3 is FALSE today.** Plan correctly identifies the fix as Phase 3.1. No additional work needed in the plan, but confirm the helper covers all 5 modifiable surfaces above (price, discount, coupon, tax, shipping).
