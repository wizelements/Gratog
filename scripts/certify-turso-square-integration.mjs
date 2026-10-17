#!/usr/bin/env node
/**
 * Real Square Sandbox payment -> Turso staging SQL -> real Square Sandbox
 * refund -> Turso staged financial reconciliation.
 *
 * Guarded, workflow_dispatch-only, protected GitHub environment. No production
 * Square access, no production Turso database, no live customers or emails.
 */
import {connect} from '@tursodatabase/serverless';
import {randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createOrReuseTursoPricedOrder} from '../lib/checkout/turso-order-admission.mjs';
import {reserveTursoCheckoutInventory} from '../lib/checkout/turso-commerce.mjs';
import {
  finalizeVerifiedTursoSquarePayment,finalizeVerifiedTursoSquareRefund
} from '../lib/checkout/turso-payment-finalization.mjs';

const squareHost='https://connect.squareupsandbox.com';
const envName=process.env.TURSO_APPROVED_STAGING_NAME||'';
const dbUrl=process.env.TURSO_STAGING_DATABASE_URL||'';
const token=process.env.TURSO_STAGING_AUTH_TOKEN||'';
const squareToken=process.env.SQUARE_SANDBOX_ACCESS_TOKEN||'';
let host='';try{host=new URL(dbUrl.replace(/^libsql:/,'https:')).hostname}catch{}
if(process.env.GITHUB_EVENT_NAME!=='workflow_dispatch' ||
  process.env.GITHUB_REF!=='refs/heads/feat/turso-checkout-recovery-20261017' ||
  !/^gratog-migration-cert-[a-z0-9-]+$/.test(envName) || !host.startsWith(envName+'-') ||
  !token||!squareToken || dbUrl.includes('tasteofgratitude-') ||
  process.env.SQUARE_ENVIRONMENT==='production')
  throw Error('ISOLATED_PROTECTED_SANDBOX_ONLY');

const db=connect({url:dbUrl,authToken:token,defaultQueryTimeout:30000});
const ref='cert_'+randomUUID().replaceAll('-','').slice(0,12);
const sku=ref+'_sku';
const paymentKey='capture-'+randomUUID(); // 44 chars <= Square's 45-char limit
const orderKey='checkout-'+randomUUID(); // <=45 characters
const refundKey='refund-'+randomUUID(); // <=45 characters
const orderPrice=1199;
const proof={kind:'Square Sandbox/Turso staging backend integration',commit:process.env.GITHUB_SHA,
  environment:'sandbox/staging',paidCents:orderPrice,stages:[],passed:false,realSquarePayment:false,
  realSquareRefund:false,websiteCheckoutTest:false,liveWebhookTest:false,emailDeliveryTest:false};
const report=(name,pass,details={})=>{
 proof.stages.push({name,pass,...details});
 console.log(`${pass?'PASS':'FAIL'} ${name} ${JSON.stringify(details)}`);
 if(!pass)throw Error('CERTIFICATION_GATE_FAILED: '+name);
};
let localOrderId=null,squareOrderId=null,squarePaymentId=null,squareRefundId=null,refundCompleted=false;
const sql=(q,args=[])=>({sql:q,args});

async function square(path,{method='GET',body}={}){
 if(!path.startsWith('/v2/')||path.includes('://')) throw Error('INVALID_SQUARE_ENDPOINT');
 const u=new URL(path,squareHost);
 if(u.origin!==squareHost)throw Error('PRODUCTION_SQUARE_HOST_BLOCKED');
 const r=await fetch(u,{method,redirect:'error',signal:AbortSignal.timeout(20_000),
  headers:{Authorization:'Bearer '+squareToken,'Square-Version':'2026-09-16','Content-Type':'application/json'},
  ...(body?{body:JSON.stringify(body)}:{})});
 return {ok:r.ok,status:r.status,data:await r.json().catch(()=>({}))};
}
async function readBackPayment(){
 const r=await square('/v2/payments/'+encodeURIComponent(squarePaymentId));
 const p=r.data.payment||{};
 report('Square provider authenticated captured payment readback',
   r.ok&&p.id===squarePaymentId&&p.status==='COMPLETED'&&
   Number(p.amount_money?.amount)===orderPrice&&p.amount_money?.currency==='USD'&&
   p.order_id===squareOrderId,
   {httpStatus:r.status,providerStatus:p.status||null});
 return {id:p.id,idempotencyKey:paymentKey,status:p.status,
   currency:p.amount_money.currency,amountCents:Number(p.amount_money.amount)};
}
async function requestRefundBestEffort(){
 if(!squarePaymentId || squareRefundId)return;
 try{
  const r=await square('/v2/refunds',{method:'POST',body:{
   idempotency_key:refundKey,payment_id:squarePaymentId,
   amount_money:{amount:orderPrice,currency:'USD'},reason:'Turso staging test cleanup'
  }});
  squareRefundId=r.data.refund?.id||null;
  if(squareRefundId)console.log('SANDBOX_REFUND_CLEANUP_REQUESTED');
  else console.log('SANDBOX_REFUND_CLEANUP_NEEDS_MANUAL_RECONCILIATION');
 }catch{console.log('SANDBOX_REFUND_CLEANUP_NEEDS_MANUAL_RECONCILIATION')}
}
async function run(){
 const locations=await square('/v2/locations');
 report('Sandbox credential authenticated',locations.ok&&Array.isArray(locations.data.locations),{httpStatus:locations.status});
 const location=locations.data.locations.find(x=>x.status==='ACTIVE');
 report('Active sandbox location exists',Boolean(location?.id));
 const now=new Date().toISOString();
 await db.batch([
  sql('INSERT INTO products(id,name) VALUES (?,?)',[sku,'CERT ONLY - Strawberry Bliss test fixture']),
  sql('INSERT INTO inventory(product_id,current_stock,source,updated_at) VALUES (?,?,?,?)',[sku,1,'sandbox_certificate',now])
 ],'immediate');
 const priced={attemptKey:orderKey,fingerprint:'a'.repeat(64),customer:{email:'checkout-cert@example.invalid'},
  fulfillment:{type:'pickup'},currency:'USD',subtotalCents:orderPrice,taxCents:0,totalCents:orderPrice,
  items:[{productId:sku,name:'CERT ONLY Strawberry Bliss',quantity:1,unitPriceCents:orderPrice,lineTotalCents:orderPrice}]};
 const created=await createOrReuseTursoPricedOrder(db,priced);
 localOrderId=created.orderId;
 report('Turso canonical server-priced order admitted',!created.reused&&Boolean(localOrderId));
 const held=await reserveTursoCheckoutInventory(db,{orderId:localOrderId,items:[{productId:sku,quantity:1}]});
 report('Turso stock reserved before any Square charge',held.valid&&!held.alreadyReserved);

 const ordered=await square('/v2/orders',{method:'POST',body:{
  idempotency_key:'order-'+randomUUID(),order:{location_id:location.id,
   reference_id:localOrderId,
   line_items:[{name:'CERT ONLY Strawberry Bliss',quantity:'1',base_price_money:{amount:orderPrice,currency:'USD'}}]}
 }});
 squareOrderId=ordered.data.order?.id||null;
 report('Real Square Sandbox order has exact $11.99 total',
  ordered.ok&&Boolean(squareOrderId)&&Number(ordered.data.order.total_money?.amount)===orderPrice,
  {httpStatus:ordered.status});
 const linked=await db.run('UPDATE orders SET square_order_id=? WHERE id=? AND square_order_id IS NULL',squareOrderId,localOrderId);
 report('Square order linked to staging SQL only',Number(linked.changes)===1);
 const payment=await square('/v2/payments',{method:'POST',body:{
  idempotency_key:paymentKey,source_id:'cnon:card-nonce-ok',
  amount_money:{amount:orderPrice,currency:'USD'},location_id:location.id,
  order_id:squareOrderId,autocomplete:true,note:'Taste of Gratitude Turso staging certification only'
 }});
 squarePaymentId=payment.data.payment?.id||null;
 report('Square Sandbox captured actual $11.99 fake-card payment',
  payment.ok&&Boolean(squarePaymentId)&&payment.data.payment.status==='COMPLETED'&&
  Number(payment.data.payment.amount_money?.amount)===orderPrice,
  {httpStatus:payment.status});
 proof.realSquarePayment=true;
 const verified=await readBackPayment();
 const captured=await finalizeVerifiedTursoSquarePayment(db,{
  orderId:localOrderId,providerVerified:true,squarePayment:verified
 });
 report('Square provider readback atomically finalized Turso payment and stock',
  captured.recorded && captured.amountCents===orderPrice);
 const replay=await finalizeVerifiedTursoSquarePayment(db,{
  orderId:localOrderId,providerVerified:true,squarePayment:verified
 });
 report('Square payment reconciliation replay did not debit twice',replay.alreadyFinalized);
 const beforeRefund=await db.get('SELECT count(*) AS count FROM checkout_notification_outbox WHERE order_id=?',localOrderId);
 report('Customer and staff notifications queued exactly once',Number(beforeRefund.count)===2);

 const refund=await square('/v2/refunds',{method:'POST',body:{
  idempotency_key:refundKey,payment_id:squarePaymentId,
  amount_money:{amount:orderPrice,currency:'USD'},reason:'Square/Turso staging certification refund'
 }});
 squareRefundId=refund.data.refund?.id||null;
 report('Real Square Sandbox refund requested',refund.ok&&Boolean(squareRefundId),{httpStatus:refund.status});
 let refunded=refund;
 for(let i=0;i<12&&refunded.data.refund?.status!=='COMPLETED';i++){
  await new Promise(resolve=>setTimeout(resolve,1000));
  refunded=await square('/v2/refunds/'+encodeURIComponent(squareRefundId));
 }
 report('Square Sandbox full refund provider readback COMPLETED',
  refunded.ok&&refunded.data.refund?.id===squareRefundId&&
  refunded.data.refund.status==='COMPLETED'&&
  refunded.data.refund.payment_id===squarePaymentId&&
  Number(refunded.data.refund.amount_money?.amount)===orderPrice&&
  refunded.data.refund.amount_money.currency==='USD',
  {providerStatus:refunded.data.refund?.status||null});
 refundCompleted=true;proof.realSquareRefund=true;
 const result=await finalizeVerifiedTursoSquareRefund(db,{orderId:localOrderId,providerVerified:true,
  squareRefund:{id:squareRefundId,paymentId:squarePaymentId,status:'COMPLETED',currency:'USD',amountCents:orderPrice}});
 const row=await db.get('SELECT status,payment_status,amount_paid_cents FROM orders WHERE id=?',localOrderId);
 const refundLedger=await db.get('SELECT COUNT(*) AS n,SUM(amount_cents) AS cents FROM square_refund_entries WHERE order_id=?',localOrderId);
 report('Verified Square refund atomically sets correct Turso order and ledger state',
  result.refundedCents===orderPrice&&result.paymentStatus==='refunded'&&
  row.payment_status==='refunded'&&Number(refundLedger.n)===1&&Number(refundLedger.cents)===orderPrice);
 proof.passed=true;
}
async function cleanup(){
 try{
  if(squarePaymentId&&!refundCompleted)await requestRefundBestEffort();
  if(localOrderId){
   await db.batch([
    sql('DELETE FROM checkout_notification_outbox WHERE order_id=?',[localOrderId]),
    sql('DELETE FROM square_refund_entries WHERE order_id=?',[localOrderId]),
    sql('DELETE FROM payments WHERE order_id=?',[localOrderId]),
    sql('DELETE FROM inventory_events WHERE order_id=?',[localOrderId]),
    sql('DELETE FROM checkout_stock_claim_items WHERE order_id=?',[localOrderId]),
    sql('DELETE FROM checkout_stock_claims WHERE order_id=?',[localOrderId]),
    sql('DELETE FROM order_items WHERE order_id=?',[localOrderId]),
    sql('DELETE FROM orders WHERE id=?',[localOrderId]),
    sql("DELETE FROM idempotency_keys WHERE namespace='checkout_attempt' AND key=?",[orderKey]),
   ],'immediate');
  }
  await db.run('DELETE FROM inventory WHERE product_id=?',sku);
  await db.run('DELETE FROM products WHERE id=?',sku);
  proof.fixtureCleanup=true;
 }catch(e){proof.fixtureCleanup=false;proof.cleanupError=String(e.message||e).slice(0,200)}
 await db.close();
}
try{await run()}
catch(e){proof.error=String(e.message||e).slice(0,300);process.exitCode=1}
finally{
 await cleanup();
 proof.finishedAt=new Date().toISOString();
 mkdirSync('test-results',{recursive:true});
 writeFileSync('test-results/turso-square-integration.json',JSON.stringify(proof,null,2)+'\n');
 if(!proof.fixtureCleanup||!proof.passed)process.exitCode=1;
 console.log(JSON.stringify({result:proof.passed&&proof.fixtureCleanup?'PASS':'FAIL',
  tests:proof.stages.length,realSquarePayment:proof.realSquarePayment,realSquareRefund:proof.realSquareRefund,
  stagingCleanup:proof.fixtureCleanup,webCheckout:false,signedWebhook:false,email:false}));
}
