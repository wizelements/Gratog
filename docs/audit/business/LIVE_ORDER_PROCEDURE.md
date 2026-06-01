# Live Production Order Procedure — Blocker 4 clear

**Date:** 2026-06-01
**Prerequisite:** Resend domain verified (see RESEND_DOMAIN_FIX.md).

## Constraints

- `SQUARE_ENVIRONMENT=production` and `SQUARE_MOCK_MODE=false`.
- Square production does not accept test card numbers. Any successful
  payment charges a real card. Use the operator's own card.
- The order must be small (≤ $5) to minimise blast radius.
- Refund the test order via Square dashboard after verification (within
  24 h to ensure inventory does not deplete real stock).

## Step-by-step

1. **Pick the cheapest available product.** Inspect the catalog from
   the storefront or query Mongo directly:

   ```bash
   node -e '
   const fs=require("fs"); const t=fs.readFileSync(".tmp/.env.prod","utf8");
   for(const l of t.split(/\r?\n/)){const m=l.match(/^([A-Z0-9_]+)=(?:"([^"]*)"|(.*))$/);if(m)process.env[m[1]]=(m[2]??m[3]).replace(/\\n$/,"");}
   const {MongoClient}=require("mongodb");
   (async()=>{
     const c=new MongoClient(process.env.MONGODB_URI);
     await c.connect();
     const ps=await c.db().collection("products")
       .find({available:true})
       .project({name:1,price:1,slug:1})
       .sort({price:1}).limit(5).toArray();
     console.log(ps);
     await c.close();
   })();
   '
   ```

2. **Place the order** through the live storefront with the operator's
   own card:

   ```
   https://tasteofgratitude.shop/catalog
   → add cheapest item to cart
   → checkout
   → use operator email (e.g. silverwatkins@gmail.com)
   → use operator card
   → submit
   ```

3. **Capture the orderId** from the success page (URL contains
   `?id=…` or visible in `Network → /api/payments`). Save as
   `ORDER_ID`.

4. **Verify under the boringly-reliable contract:**

   ```bash
   ORDER_ID="<the id from step 3>"
   node -e '
   const fs=require("fs"); const t=fs.readFileSync(".tmp/.env.prod","utf8");
   for(const l of t.split(/\r?\n/)){const m=l.match(/^([A-Z0-9_]+)=(?:"([^"]*)"|(.*))$/);if(m)process.env[m[1]]=(m[2]??m[3]).replace(/\\n$/,"");}
   const {MongoClient}=require("mongodb");
   (async()=>{
     const c=new MongoClient(process.env.MONGODB_URI);
     await c.connect(); const db=c.db();
     const id=process.argv[2]||process.env.ORDER_ID;
     const o=await db.collection("orders").findOne({id});
     console.log("order:", { id:o.id, paymentStatus:o.paymentStatus, squarePaymentId:o.squarePaymentId, paidEffectsAppliedAt:o.paidEffectsAppliedAt, pricing:o.pricing });
     console.log("reward_transactions:", await db.collection("reward_transactions").find({orderId:id}).toArray());
     console.log("email_sends:", await db.collection("email_sends").find({orderId:id}).toArray());
     console.log("payment_records:", await db.collection("payment_records").find({"metadata.orderId":id}).project({squarePaymentId:1,status:1,createdAt:1}).toArray());
     await c.close();
   })();
   ' "$ORDER_ID"
   ```

   **PASS criteria** (all must be true):
   - `paymentStatus: "paid"`
   - `squarePaymentId` populated
   - `paidEffectsAppliedAt` populated (exactly one ISO timestamp)
   - `pricing.total` matches what the operator was charged
   - `reward_transactions` has exactly **1** row for this `orderId`
   - `email_sends` has at least **1** row for this `orderId` with
     `status: "sent"` and a non-null `messageId`
   - `payment_records` has at least one row with the same
     `squarePaymentId` and `status: "completed"`

5. **Test duplicate protection** by replaying the Square webhook:

   - Square dashboard → Developer → Webhooks → recent event → resend.
   - Re-run the verification block. Expect **no** new
     `reward_transactions` row, **no** change to
     `paidEffectsAppliedAt`, **no** additional `email_sends.sent`
     row. Webhook should be silently absorbed.

6. **Refund** via Square dashboard → Transactions → the order →
   Refund. Confirm Mongo `orders.status` flips to `REFUNDED` (or the
   relevant terminal status — check `app/api/payments/route.ts`
   webhook handler).

7. **Re-run the curl matrix** and `FINAL_SCORECARD.md`. If steps 4–5
   all PASS, flip rows 4, 5, 8, 13 to YES. Cut the tag.

## Stop conditions

Halt immediately if any of:
- Server-charged total differs from `pricing.total` in Mongo.
- `squarePaymentId` missing.
- `paidEffectsAppliedAt` missing OR repopulates on webhook replay.
- Duplicate `reward_transactions` row appears.
- Email send writes `status:"failed"` (means Resend domain still
  unverified — back to RESEND_DOMAIN_FIX.md).

A failing test order proves the release is not boringly-reliable yet.
A passing test order plus a successful webhook replay proves it is.
