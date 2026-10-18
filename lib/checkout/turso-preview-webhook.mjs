/** Provider-verified webhook reconciliation, isolated to the dedicated Preview. */
import {openTursoPreview,TursoPreviewRefusal} from './turso-preview-runtime.mjs';
import {claimTursoSquareWebhook,completeTursoSquareWebhook,
        claimTursoNotification,markTursoNotificationSent} from './turso-events.mjs';
import {finalizeVerifiedTursoSquarePayment,
        finalizeVerifiedTursoSquareRefund} from './turso-payment-finalization.mjs';
const squareHost='https://connect.squareupsandbox.com';
async function provider(path) {
  if(!path.startsWith('/v2/')||path.includes('://'))throw Error('BAD_SQUARE_PATH');
  const response=await fetch(new URL(path,squareHost),{
    redirect:'error',signal:AbortSignal.timeout(15_000),
    headers:{Authorization:'Bearer '+process.env.SQUARE_ACCESS_TOKEN,
      'Square-Version':'2026-09-16'}
  });
  if(!response.ok)throw new Error('SQUARE_READBACK_FAILED');
  return response.json();
}
const allowed=new Set(['payment.created','payment.updated','payment.completed',
  'refund.created','refund.updated']);
/** This must ONLY be invoked after Square raw-body HMAC verification. */
export async function reconcileTursoPreviewSignedWebhook(event) {
  const db=await openTursoPreview();
  const eventId=event?.id||event?.event_id;
  const eventType=event?.type;
  if(typeof eventId!=='string'||eventId.length>250||
     !allowed.has(eventType))throw new TursoPreviewRefusal('WEBHOOK_EVENT_INVALID',400);
  const claim=await claimTursoSquareWebhook(db,{eventId,eventType});
  if(!claim.process) {
    if(claim.alreadyProcessed)return {received:true,processed:true,replay:true};
    throw new TursoPreviewRefusal('WEBHOOK_RECONCILIATION_REQUIRED',503);
  }
  let orderId=null;
  let result='provider_event_pending';
  if(eventType.startsWith('payment.')) {
    const payment=event?.data?.object?.payment||event?.data?.object;
    const paymentId=payment?.id;
    if(typeof paymentId!=='string'||paymentId.length>200)
      throw new Error('SQUARE_PAYMENT_ID_MISSING');
    const detail=(await provider('/v2/payments/'+encodeURIComponent(paymentId))).payment;
    if(!detail||detail.id!==paymentId)throw Error('PAYMENT_PROVIDER_IDENTITY_MISMATCH');
    if(detail.status==='COMPLETED') {
      const sourceOrderId=detail.order_id;
      const order=await db.get('SELECT id FROM orders WHERE square_order_id=?',sourceOrderId);
      if(!order)throw Error('SQUARE_CAPTURE_WITHOUT_LOCAL_ORDER');
      orderId=order.id;
      await finalizeVerifiedTursoSquarePayment(db,{orderId,providerVerified:true,
        squarePayment:{id:detail.id,idempotencyKey:'pay-'+order.id,
          status:detail.status,amountCents:Number(detail.amount_money?.amount),
          currency:detail.amount_money?.currency}});
      result='captured_or_replayed';
    }
  }else{
    const refund=event?.data?.object?.refund||event?.data?.object;
    const refundId=refund?.id;
    if(typeof refundId!=='string'||refundId.length>200)throw Error('SQUARE_REFUND_ID_MISSING');
    const detail=(await provider('/v2/refunds/'+encodeURIComponent(refundId))).refund;
    if(!detail||detail.id!==refundId)throw Error('REFUND_PROVIDER_IDENTITY_MISMATCH');
    if(detail.status==='COMPLETED') {
      const payment=await db.get('SELECT order_id FROM payments WHERE square_payment_id=?',detail.payment_id);
      if(!payment)throw Error('SQUARE_REFUND_WITHOUT_LOCAL_CAPTURE');
      orderId=payment.order_id;
      await finalizeVerifiedTursoSquareRefund(db,{orderId,providerVerified:true,
        squareRefund:{id:detail.id,paymentId:detail.payment_id,status:detail.status,
          amountCents:Number(detail.amount_money?.amount),currency:detail.amount_money?.currency}});
      result='refunded_or_replayed';
    }
  }
  await completeTursoSquareWebhook(db,{eventId,eventType,result:{kind:result,orderId}});
  // Sending is deliberately separate from the payment success response:
  // delivery failure must not roll back captured money.
  const notification=orderId ? await sendTursoPreviewQaOutbox(db,orderId) : null;
  return {received:true,processed:true,kind:result,notification};
}
export async function sendTursoPreviewQaOutbox(db,orderId) {
  // Never send real customer mail from development. Resend test recipient
  // confirms accepted/delivered provider delivery without contacting buyers.
  const qaRecipient='delivered@resend.dev';
  if(!process.env.RESEND_API_KEY) return {sent:0,code:'RESEND_PREVIEW_UNCONFIGURED'};
  const order=await db.get(
    'SELECT id,total_cents,status,payment_status,customer_snapshot_json FROM orders WHERE id=?',orderId);
  if(!order||!['paid','partially_refunded','refunded'].includes(order.payment_status))
    throw Error('NOTIFICATION_ORDER_UNVERIFIED');
  const out=[];
  for(const kind of ['customer_confirmation','staff_notification']) {
    const claim=await claimTursoNotification(db,{orderId,kind});
    if(!claim.send) {
      out.push({kind,alreadySent:claim.alreadySent,needsReconciliation:claim.needsReconciliation});
      continue;
    }
    const subject=kind==='customer_confirmation'
      ? 'QA ONLY — Taste of Gratitude payment confirmation'
      : 'QA ONLY — Taste of Gratitude staff order notice';
    const body=[
      'SANDBOX TEST — DO NOT FULFILL',
      'Order: '+orderId,
      'Buyer details: intentionally excluded from QA email',
      'Status: '+order.payment_status,
      'Total: $'+(Number(order.total_cents)/100).toFixed(2),
      'This message is intentionally delivered to Resend test recipient only.',
    ].join('\n');
    const response=await fetch('https://api.resend.com/emails',{
      method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),
      headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,
        'Content-Type':'application/json','Idempotency-Key':'tog-turso-'+kind+'-'+orderId},
      body:JSON.stringify({from:'Taste of Gratitude QA <orders@tasteofgratitude.shop>',
        to:[qaRecipient],subject,text:body})
    });
    if(!response.ok)throw Error('RESEND_SEND_AMBIGUOUS_RECONCILE_REQUIRED');
    const accepted=await response.json();
    if(typeof accepted?.id!=='string'||!accepted.id)
      throw Error('RESEND_MESSAGE_ID_MISSING');
    await markTursoNotificationSent(db,{orderId,kind,providerMessageId:accepted.id});
    out.push({kind,accepted:true});
  }
  return {accepted:out.filter(x=>x.accepted).length,
    pendingReconciliation:out.filter(x=>x.needsReconciliation).length,outcomes:out};
}
