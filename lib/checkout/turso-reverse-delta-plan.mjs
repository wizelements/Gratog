/**
 * Constructs a READ-ONLY, independently reconciled recovery manifest.
 * Never writes Mongo, Turso, or Square. The Mongo restored-clone replay,
 * PITR test and live reverse-delta replay remain release blockers.
 *
 * Input rows must be strictly post-cutover/after freeze-watermark records.
 * Square readbacks must come from authenticated provider lookups, not client
 * webhooks or browser JSON.
 */
export class ReverseDeltaBlocked extends Error {
  constructor(code){super(code);this.code=code;}
}
const blocked=code=>{throw new ReverseDeltaBlocked(code)};
const cents=n=>(typeof n==='number'||(typeof n==='string'&&/^\d+$/.test(n)))&&
  Number.isSafeInteger(Number(n))&&Number(n)>=0;
const id=x=>typeof x==='string'&&x.length>0&&x.length<=250;
export function planVerifiedReverseDelta({
  orders=[],payments=[],refunds=[],providerPayments=[],providerRefunds=[],
  existingMongoOrders=[],existingMongoPayments=[],freezeWatermark=null
}={}) {
  if(!/\d{4}-\d{2}-\d{2}T/.test(freezeWatermark||'') ||
     !Number.isFinite(Date.parse(freezeWatermark)))blocked('WRITE_FREEZE_WATERMARK_REQUIRED');
  for(const x of [orders,payments,refunds,providerPayments,providerRefunds,
    existingMongoOrders,existingMongoPayments])if(!Array.isArray(x))blocked('INVALID_ROW_SET');
  const orderMap=new Map(), paymentMap=new Map(), refundMap=new Map();
  const paymentIds=new Set();
  const providerPaymentMap=new Map(), providerRefundMap=new Map();
  for(const provider of providerPayments) {
    if(!id(provider?.id)||providerPaymentMap.has(provider.id))
      blocked('SQUARE_CAPTURE_READBACK_AMBIGUOUS');
    providerPaymentMap.set(provider.id,provider);
  }
  for(const provider of providerRefunds) {
    if(!id(provider?.id)||providerRefundMap.has(provider.id))
      blocked('SQUARE_REFUND_READBACK_AMBIGUOUS');
    providerRefundMap.set(provider.id,provider);
  }
  const sourceMongo=new Map(), sourcePay=new Map();
  for(const order of existingMongoOrders) {
    if(!id(order.id)||sourceMongo.has(order.id))blocked('MONGO_RESTORE_ORDER_DUPLICATE');
    sourceMongo.set(order.id,order);
  }
  for(const payment of existingMongoPayments) {
    if(!id(payment.squarePaymentId)||sourcePay.has(payment.squarePaymentId))
      blocked('MONGO_RESTORE_PAYMENT_ID_CONFLICT');
    sourcePay.set(payment.squarePaymentId,payment.orderId);
  }
  for(const order of orders){
    if(!id(order.id)||orderMap.has(order.id)||!cents(order.total_cents)||
       Number(order.total_cents)===0 ||order.currency!=='USD')blocked('DELTA_ORDER_INVALID');
    if(!order.updated_at||!Number.isFinite(Date.parse(order.updated_at))||
       Date.parse(order.updated_at)<Date.parse(freezeWatermark))
      blocked('DELTA_OUTSIDE_FREEZE_WINDOW');
    orderMap.set(order.id,order);
  }
  for(const p of payments){
    if(!id(p.order_id)||!id(p.square_payment_id)||paymentMap.has(p.order_id)||
       paymentIds.has(p.square_payment_id)||
       !orderMap.has(p.order_id)||p.status!=='COMPLETED'||p.currency!=='USD'||
       !cents(p.amount_cents)||Number(p.amount_cents)===0)
      blocked('DELTA_CAPTURE_INVALID');
    const provider=providerPaymentMap.get(p.square_payment_id);
    if(!provider||provider.status!=='COMPLETED'||provider.currency!=='USD'||
       !cents(provider.amountCents)||
       Number(provider.amountCents)!==Number(p.amount_cents))
      blocked('SQUARE_CAPTURE_READBACK_MISSING');
    const order=orderMap.get(p.order_id);
    if(!id(order.square_order_id)||provider.squareOrderId!==order.square_order_id||
       provider.referenceId!==order.id)
      blocked('SQUARE_CAPTURE_ORDER_BINDING_MISMATCH');
    paymentIds.add(p.square_payment_id);
    paymentMap.set(p.order_id,p);
  }
  for(const r of refunds){
    if(!id(r.order_id)||!id(r.refund_id)||!id(r.payment_id)||
       !paymentMap.has(r.order_id)||
       paymentMap.get(r.order_id).square_payment_id!==r.payment_id ||
       r.currency!=='USD'||!cents(r.amount_cents)||Number(r.amount_cents)===0)
      blocked('DELTA_REFUND_INVALID');
    if(refundMap.has(r.refund_id))blocked('DELTA_REFUND_ID_DUPLICATED');
    const provider=providerRefundMap.get(r.refund_id);
    if(!provider||provider.status!=='COMPLETED'||
       provider.paymentId!==r.payment_id||provider.currency!=='USD'||!cents(provider.amountCents)||
       Number(provider.amountCents)!==Number(r.amount_cents))
      blocked('SQUARE_REFUND_READBACK_MISSING');
    refundMap.set(r.refund_id,r);
  }
  const changes=[];
  for(const order of orderMap.values()){
    const payment=paymentMap.get(order.id);
    if(!payment)blocked('DELTA_ORDER_PAYMENT_UNRECONCILED');
    const paid=Number(payment.amount_cents);
    if(Number(order.total_cents)!==paid)blocked('DELTA_CAPTURE_CENTS_MISMATCH');
    const refunded=[...refundMap.values()].filter(x=>x.order_id===order.id)
      .reduce((sum,r)=>sum+Number(r.amount_cents),0);
    if(!cents(refunded)||refunded>paid)blocked('DELTA_REFUND_EXCEEDS_CAPTURE');
    const status=refunded===paid?'refunded':refunded>0?'partially_refunded':'paid';
    if(order.payment_status!==status)blocked('DELTA_STATUS_LEDGER_CONFLICT');
    const existing=sourceMongo.get(order.id);
    if(existing && (Number(existing.totalCents)!==paid ||
       (existing.squarePaymentId&&existing.squarePaymentId!==payment.square_payment_id)))
      blocked('MONGO_RESTORE_ORDER_CONFLICT');
    if(sourcePay.has(payment.square_payment_id)&&sourcePay.get(payment.square_payment_id)!==order.id)
      blocked('MONGO_RESTORE_PAYMENT_COLLISION');
    changes.push({orderId:order.id,squarePaymentId:payment.square_payment_id,
      paidCents:paid,refundedCents:refunded,paymentStatus:status,
      action:existing?'verify_or_reconcile':'insert_into_isolated_restore_clone'});
  }
  return {status:'PLAN_ONLY_NO_WRITES',freezeWatermark,orderCount:changes.length,
    capturedCents:changes.reduce((n,x)=>n+x.paidCents,0),
    refundedCents:changes.reduce((n,x)=>n+x.refundedCents,0),
    changes,certifiesMongoRestore:false,certifiesProductionRollback:false};
}
