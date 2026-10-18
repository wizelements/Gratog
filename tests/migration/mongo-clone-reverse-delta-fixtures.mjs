/** Synthetic fixture identities. None are Square provider transaction proof. */
export const fixtureFreeze='2026-10-18T04:00:00.000Z';
export const fixtureThrough='2026-10-18T04:10:00.000Z';

export function recoveryFixture(snapshotSha256='a'.repeat(64)) {
  const record=(id,{quantity=1,productId='fixture-product-a',before=10,refunded=0,restock=false}={})=>{
    const cents=1199*quantity, stamp='2026-10-18T04:01:00.000Z';
    const payment={orderId:id,squarePaymentId:`fixture-payment-${id}`,squareOrderId:`fixture-square-order-${id}`,
      amountCents:cents,currency:'USD',status:'COMPLETED'};
    return {expectedBeforeHash:null,
      order:{id,squareOrderId:payment.squareOrderId,squarePaymentId:payment.squarePaymentId,
        totalCents:cents,amountPaidCents:cents,refundedAmountCents:refunded,currency:'USD',
        paymentStatus:refunded===cents?'refunded':refunded?'partially_refunded':'paid',
        status:'CONFIRMED',createdAt:stamp,updatedAt:stamp,
        items:[{productId,quantity,name:'Synthetic restore fixture',priceCents:1199}]},payment,
      refunds:refunded?[{refundId:`fixture-refund-${id}`,orderId:id,paymentId:payment.squarePaymentId,
        amountCents:refunded,currency:'USD'}]:[],
      inventoryEvents:[{id:`fixture-debit-${id}`,orderId:id,productId,
        type:'order_debit',before,delta:-quantity,after:before-quantity,createdAt:stamp},
        ...(restock?[{id:`fixture-return-${id}`,orderId:id,productId,type:'return_restock',
          before:before-quantity,delta:quantity,after:before,createdAt:stamp,
          returnDecisionId:`fixture-approved-return-${id}`}]:[])],
      notifications:[{kind:'customer_confirmation',sourceStatus:'delivered',
        providerMessageId:`fixture-email-customer-${id}`,attemptCount:1,
        sourceAcceptedAt:stamp,sourceDeliveredAt:stamp},
        {kind:'staff_notification',sourceStatus:'accepted',
          providerMessageId:`fixture-email-staff-${id}`,attemptCount:1,sourceAcceptedAt:stamp}],
      webhookEvents:[{eventId:`fixture-webhook-payment-${id}`,orderId:id,eventType:'payment.updated',
        providerObjectId:payment.squarePaymentId,status:'processed',processedAt:stamp},
        ...(refunded?[{eventId:`fixture-webhook-refund-${id}`,orderId:id,eventType:'refund.updated',
          providerObjectId:`fixture-refund-${id}`,status:'processed',processedAt:stamp}]:[])],
    };
  };
  return {schemaVersion:1,scope:'isolated-restore-clone',id:'fixture-recovery-oct18',
    snapshotSha256,freezeWatermark:fixtureFreeze,throughWatermark:fixtureThrough,
    records:[record('fixture-new-1',{refunded:1199}),
      record('fixture-new-2',{before:9,refunded:500,restock:true}),
      record('fixture-new-3',{productId:'fixture-product-b',quantity:2,before:5})]};
}

export function syntheticProvider(bundle) {
  return {kind:'synthetic-fixture',
    payment:async id=>{
      const r=bundle.records.find(x=>x.payment.squarePaymentId===id);
      return r?{id,status:'COMPLETED',amountCents:r.payment.amountCents,currency:'USD',
        squareOrderId:r.order.squareOrderId,referenceId:r.order.id}:null;
    },
    refund:async id=>{
      const r=bundle.records.flatMap(x=>x.refunds).find(x=>x.refundId===id);
      return r?{id,paymentId:r.paymentId,status:'COMPLETED',amountCents:r.amountCents,currency:'USD'}:null;
    }};
}
