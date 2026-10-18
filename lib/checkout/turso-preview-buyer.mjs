import {createHash} from 'node:crypto';
import {openTursoPreview,priceTursoPreviewCart,TursoPreviewRefusal} from './turso-preview-runtime.mjs';
import {createOrReuseTursoPricedOrder} from './turso-order-admission.mjs';
import {reserveTursoCheckoutInventory} from './turso-commerce.mjs';
import {finalizeVerifiedTursoSquarePayment} from './turso-payment-finalization.mjs';
import {generateOrderAccessToken,verifyOrderAccessToken} from '../order-access-token.js';

const deadline=()=>AbortSignal.timeout(18000);
const base='https://connect.squareupsandbox.com';
async function square(path,method='GET',body) {
  if(!path.startsWith('/v2/')||path.includes('://'))throw new Error('INVALID_SQUARE_PATH');
  const response=await fetch(new URL(path,base),{
    method,redirect:'error',signal:deadline(),
    headers:{Authorization:'Bearer '+process.env.SQUARE_ACCESS_TOKEN,
      'Square-Version':'2026-09-16','Content-Type':'application/json'},
    ...(body?{body:JSON.stringify(body)}:{})
  });
  const json=await response.json().catch(()=>({}));
  return {ok:response.ok,status:response.status,json};
}
function buyerToken(orderId,email) {
  return generateOrderAccessToken({orderId,customerEmail:email,ttlMs:30*60*1000});
}
function clientError(code,status=409) {return new TursoPreviewRefusal(code,status);}
export async function createTursoPreviewBuyerOrder(body,attemptKey) {
  const db=await openTursoPreview();
  const priced=await priceTursoPreviewCart(db,body);
  if(typeof attemptKey!=='string'||attemptKey.length<8||attemptKey.length>200)
    throw clientError('CHECKOUT_KEY_REQUIRED',428);
  const customer={name:body.customer.name.trim(),email:body.customer.email.trim().toLowerCase(),
    phone:String(body.customer.phone||'').slice(0,35)};
  const fulfillment={type:'pickup',pickup:body.pickup||null};
  const itemIdentity=priced.items.map(({productId,variationId,quantity})=>({productId,variationId,quantity}));
  const fingerprint=createHash('sha256').update(JSON.stringify(
    {customer,fulfillment,items:itemIdentity,totalCents:priced.totalCents})).digest('hex');
  const created=await createOrReuseTursoPricedOrder(db,{
    attemptKey,fingerprint,customer,fulfillment,subtotalCents:priced.subtotalCents,
    taxCents:priced.taxCents,totalCents:priced.totalCents,items:priced.items,
  });
  const held=await reserveTursoCheckoutInventory(db,{
    orderId:created.orderId,
    items:priced.items.map(({productId,quantity})=>({productId,quantity})),
  });
  if(!held.valid)throw clientError(held.code||'INVENTORY_UNAVAILABLE',409);
  const token=buyerToken(created.orderId,customer.email);
  if(!token) throw new Error('GUEST_ORDER_ACCESS_UNAVAILABLE');
  const record=await db.get('SELECT status,payment_status FROM orders WHERE id=?',created.orderId);
  return {success:true,order:{
    id:created.orderId,orderNumber:'TOG-'+created.orderId.slice(-8),
    status:record.status,paymentStatus:record.payment_status,orderAccessToken:token,
    orderAccessTokenExpiresAt:new Date(Date.now()+30*60*1000).toISOString(),
    items:priced.items.map(line=>({...line,price:line.unitPriceCents/100,
      lineTotal:line.lineTotalCents/100})),
    pricing:{subtotal:priced.subtotal,deliveryFee:0,tip:0,discount:0,tax:0,total:priced.total},
    fulfillment,
  },certificationStorage:'isolated_turso_preview'};
}
export async function payTursoPreviewBuyerOrder(body) {
  const db=await openTursoPreview();
  const orderId=body?.orderId;
  const sourceId=body?.sourceId;
  const token=body?.orderAccessToken||body?.token;
  if(typeof orderId!=='string'||orderId.length>200||
    typeof sourceId!=='string'||sourceId.length<3||sourceId.length>400||
    typeof token!=='string'||!token) throw clientError('PAYMENT_INPUT_INVALID',400);
  const order=await db.get(
    'SELECT id,total_cents,currency,payment_status,customer_snapshot_json,square_order_id FROM orders WHERE id=?',orderId);
  if(!order)throw clientError('ORDER_NOT_FOUND',404);
  let customer;try{customer=JSON.parse(order.customer_snapshot_json)}catch{throw clientError('ORDER_CONTACT_CORRUPT',503)}
  if(!verifyOrderAccessToken(token,{expectedOrderId:orderId,expectedEmail:customer.email}))
    throw clientError('ORDER_ACCESS_TOKEN_INVALID',401);
  const cents=Number(order.total_cents);
  if(!Number.isSafeInteger(cents)||cents<=0||order.currency!=='USD'||
     Number(body.amountCents)!==cents)throw clientError('PAYMENT_AMOUNT_MISMATCH',409);
  const prior=await db.get(
    "SELECT square_payment_id,amount_cents FROM payments WHERE order_id=? AND status='COMPLETED'",orderId);
  if(['refunded','partially_refunded','canceled','cancelled'].includes(order.payment_status))
    throw clientError('ORDER_ALREADY_CLOSED',409);
  if(prior) {
    if(Number(prior.amount_cents)!==cents)throw clientError('PAYMENT_RECONCILIATION_REQUIRED',503);
    const provider=await square('/v2/payments/'+encodeURIComponent(prior.square_payment_id));
    if(!provider.ok||provider.json.payment?.status!=='COMPLETED'||
       Number(provider.json.payment.amount_money?.amount)!==cents)
      throw clientError('PAYMENT_RECONCILIATION_REQUIRED',503);
    return {success:true,payment:{
      id:prior.square_payment_id,status:'COMPLETED',amountCents:cents,
      currency:'USD',receiptUrl:provider.json.payment.receipt_url||null,
    },orderId,orderAccessToken:token,reused:true};
  }
  if(order.payment_status!=='pending')throw clientError('PAYMENT_RECONCILIATION_REQUIRED',503);
  const claim=await db.get('SELECT status FROM checkout_stock_claims WHERE order_id=?',orderId);
  if(claim?.status!=='reserved')throw clientError('INVENTORY_RESERVATION_REQUIRED',409);
  const rawLines=await db.all('SELECT name_snapshot,quantity,total_cents FROM order_items WHERE order_id=? ORDER BY position',orderId);
  const lines=rawLines.map(l=>({name:l.name_snapshot,quantity:String(l.quantity),
    base_price_money:{amount:Number(l.total_cents)/Number(l.quantity),currency:'USD'}}));
  if(!lines.length||lines.some(l=>!Number.isSafeInteger(l.base_price_money.amount)))
    throw clientError('ORDER_PRICING_CORRUPT',503);
  const loc=await square('/v2/locations');
  if(!loc.ok||!Array.isArray(loc.json.locations)||
     !loc.json.locations.some(x=>x.id===process.env.SQUARE_LOCATION_ID&&x.status==='ACTIVE'))
    throw clientError('SQUARE_SANDBOX_LOCATION_INVALID',503);
  let squareOrderId=order.square_order_id;
  if(!squareOrderId) {
    const created=await square('/v2/orders','POST',{
      idempotency_key:'ord-'+orderId,
      order:{location_id:process.env.SQUARE_LOCATION_ID,reference_id:orderId,line_items:lines},
    });
    squareOrderId=created.json.order?.id;
    if(!created.ok||!squareOrderId||
       Number(created.json.order.total_money?.amount)!==cents)
      throw clientError('SQUARE_ORDER_RECONCILIATION_REQUIRED',503);
    const linked=await db.run(
      'UPDATE orders SET square_order_id=? WHERE id=? AND square_order_id IS NULL',
      squareOrderId,orderId);
    if(Number(linked.changes)!==1){
      const known=await db.get('SELECT square_order_id FROM orders WHERE id=?',orderId);
      if(known?.square_order_id!==squareOrderId)
        throw clientError('SQUARE_ORDER_RECONCILIATION_REQUIRED',503);
    }
  }
  const paymentKey='pay-'+orderId;
  const paid=await square('/v2/payments','POST',{
    source_id:sourceId,idempotency_key:paymentKey,
    amount_money:{amount:cents,currency:'USD'},
    location_id:process.env.SQUARE_LOCATION_ID,order_id:squareOrderId,
    reference_id:orderId,buyer_email_address:customer.email,autocomplete:true,
  });
  // No new payment key after any unknown result, including a timeout.
  const payment=paid.json.payment;
  if(!paid.ok||!payment?.id||payment.status!=='COMPLETED') {
    throw clientError('PAYMENT_RECONCILIATION_REQUIRED',503);
  }
  const provider=await square('/v2/payments/'+encodeURIComponent(payment.id));
  const verified=provider.json.payment;
  if(!provider.ok||verified?.id!==payment.id||
     verified.status!=='COMPLETED'||verified.order_id!==squareOrderId||
     Number(verified.amount_money?.amount)!==cents||verified.amount_money?.currency!=='USD')
    throw clientError('PAYMENT_RECONCILIATION_REQUIRED',503);
  await finalizeVerifiedTursoSquarePayment(db,{orderId,providerVerified:true,
    squarePayment:{id:verified.id,idempotencyKey:paymentKey,status:'COMPLETED',
      amountCents:cents,currency:'USD'}});
  // Email side effects are never allowed to change an already captured payment.
  // Outbox claims and provider IDs make retry/reconciliation explicit.
  let notificationAccepted=0;
  try {
    const {sendTursoPreviewQaOutbox}=await import('./turso-preview-webhook.mjs');
    const delivery=await sendTursoPreviewQaOutbox(db,orderId);
    notificationAccepted=delivery.accepted||0;
  } catch { /* outstanding outbox is deliberately not marked delivered */ }

  return {success:true,payment:{
    id:verified.id,status:'COMPLETED',amountCents:cents,currency:'USD',
    receiptUrl:verified.receipt_url||null,
  },orderId,orderAccessToken:token,notificationAccepted};
}

/** Guest payment-status poll only; never accepts an arbitrary payment ID. */
export async function getTursoPreviewBuyerPaymentStatus({orderId,orderAccessToken}) {
  const db=await openTursoPreview();
  if(typeof orderId!=='string'||orderId.length>200)
    throw clientError('ORDER_ID_INVALID',400);
  const order=await db.get('SELECT id,status,payment_status,customer_snapshot_json FROM orders WHERE id=?',orderId);
  if(!order)throw clientError('ORDER_NOT_FOUND',404);
  let customer;try{customer=JSON.parse(order.customer_snapshot_json)}catch{throw clientError('ORDER_CONTACT_CORRUPT',503)}
  if(!verifyOrderAccessToken(orderAccessToken,{expectedOrderId:orderId,expectedEmail:customer.email}))
    throw clientError('UNAUTHORIZED',401);
  const payment=await db.get(
    "SELECT square_payment_id,status,amount_cents,currency FROM payments WHERE order_id=? AND status='COMPLETED'",orderId);
  return {success:true,order:{
    id:orderId,orderNumber:'TOG-'+orderId.slice(-8),status:order.status,
    paymentStatus:order.payment_status,
  },payment:payment?{
    id:payment.square_payment_id,status:'COMPLETED',
    amountCents:Number(payment.amount_cents),currency:payment.currency,
  }:undefined};
}
