import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {planVerifiedReverseDelta,ReverseDeltaBlocked} from '../../lib/checkout/turso-reverse-delta-plan.mjs';
const freezeWatermark='2026-10-17T20:00:00Z';
const source={
  freezeWatermark,
  orders:[{id:'o1',total_cents:1199,currency:'USD',payment_status:'refunded',
    updated_at:'2026-10-17T20:01:00Z'}],
  payments:[{order_id:'o1',square_payment_id:'p1',amount_cents:1199,currency:'USD',status:'COMPLETED'}],
  refunds:[{order_id:'o1',refund_id:'r1',payment_id:'p1',amount_cents:1199,currency:'USD'}],
  providerPayments:[{id:'p1',status:'COMPLETED',amountCents:1199,currency:'USD'}],
  providerRefunds:[{id:'r1',paymentId:'p1',status:'COMPLETED',amountCents:1199,currency:'USD'}],
};
test('provider-verified full refund produces deterministic plan-only recovery operations',()=>{
  const first=planVerifiedReverseDelta(source);
  const replay=planVerifiedReverseDelta(source);
  assert.deepEqual(first,replay);
  assert.equal(first.capturedCents,1199);assert.equal(first.refundedCents,1199);
  assert.equal(first.changes[0].paymentStatus,'refunded');
  assert.equal(first.certifiesMongoRestore,false);
});
test('unverified provider capture and refund block recovery',()=>{
  assert.throws(()=>planVerifiedReverseDelta({...source,providerPayments:[]}),ReverseDeltaBlocked);
  assert.throws(()=>planVerifiedReverseDelta({...source,providerRefunds:[]}),ReverseDeltaBlocked);
});
test('refund overpayment, status divergence, or Mongo collision cannot be replayed',()=>{
  assert.throws(()=>planVerifiedReverseDelta({...source,
    refunds:[{...source.refunds[0],amount_cents:1200}]}),ReverseDeltaBlocked);
  assert.throws(()=>planVerifiedReverseDelta({...source,
    orders:[{...source.orders[0],payment_status:'paid'}]}),ReverseDeltaBlocked);
  assert.throws(()=>planVerifiedReverseDelta({...source,
    existingMongoPayments:[{squarePaymentId:'p1',orderId:'someone-else'}]}),ReverseDeltaBlocked);
});
test('any missing freeze watermark or out-of-window event blocks rollback',()=>{
  assert.throws(()=>planVerifiedReverseDelta({...source,freezeWatermark:null}),ReverseDeltaBlocked);
  assert.throws(()=>planVerifiedReverseDelta({...source,
    orders:[{...source.orders[0],updated_at:'2026-10-17T19:59:59Z'}]}),ReverseDeltaBlocked);
});
