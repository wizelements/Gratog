#!/usr/bin/env node
/* Certified Preview HTTP buyer -> Square Sandbox -> webhook -> Turso + QA outbox.
   Strictly staging/Sandbox. Proof artifact excludes tokens and customer data. */
import {randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {connect} from '@tursodatabase/serverless';
const URL='libsql://gratog-migration-cert-20261018-swatkins.aws-us-east-1.turso.io';
const protectedBranches=new Set(['refs/heads/feat/turso-checkout-recovery-20261017','refs/heads/integration/turso-closure-candidate-20261018','refs/heads/feat/turso-completion-20261019','refs/heads/feat/turso-lemonade-certification-20261027']);
const preview=process.env.PREVIEW_BASE_URL||'';
if(process.env.GITHUB_EVENT_NAME!=='workflow_dispatch'||
   !protectedBranches.has(process.env.GITHUB_REF)||process.env.SQUARE_ENVIRONMENT!=='sandbox'||
   process.env.TURSO_STAGING_DATABASE_URL!==URL||
   !process.env.TURSO_STAGING_AUTH_TOKEN||!process.env.SQUARE_SANDBOX_ACCESS_TOKEN||
   !/^https:\/\/gratog-[a-z0-9]+-theangelsilvers-projects\.vercel\.app$/.test(preview))
   throw Error('PROTECTED_STAGING_SANDBOX_REQUIRED');
const db=connect({url:URL,authToken:process.env.TURSO_STAGING_AUTH_TOKEN});
const report={kind:'EXACT_PREVIEW_HTTP_SQUARE_AND_SIGNED_EVENT',
   githubSha:process.env.GITHUB_SHA,preview,orderId:null,
   paymentId:null,refundId:null,notifications:[],
   checks:[],sandbox:true,cleanupPending:false,pass:false};
const productId='DDM6ISOPLK3ZKP6JAVV36BQU';
const variationId='3YUSTFWEJBWIXDCVBIT2DNGN';
const save=()=>{mkdirSync('test-results',{recursive:true});writeFileSync(
   'test-results/turso-preview-live-checkout.json',JSON.stringify(report,null,2)+'\n')};
const check=(name,ok)=>{
 report.checks.push({name,pass:Boolean(ok)});
 console.log((ok?'PASS ':'FAIL ')+name);
 if(!ok)throw Error('CHECK_FAILED: '+name);
};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const http=async(url,method='GET',data,extra={})=>{
 const resp=await fetch(url,{method,redirect:'error',signal:AbortSignal.timeout(25000),
   headers:{'Content-Type':'application/json',...extra},
   ...(data?{body:JSON.stringify(data)}:{})});
 const body=await resp.json().catch(()=>({}));
 return {status:resp.status,ok:resp.ok,body};
};
const square=async(path,method='GET',data)=>{
 const resp=await fetch('https://connect.squareupsandbox.com'+path,{
   method,redirect:'error',signal:AbortSignal.timeout(22000),
   headers:{Authorization:'Bearer '+process.env.SQUARE_SANDBOX_ACCESS_TOKEN,
     'Square-Version':'2026-09-16','Content-Type':'application/json'},
   ...(data?{body:JSON.stringify(data)}:{})});
 const body=await resp.json().catch(()=>({}));
 return {status:resp.status,ok:resp.ok,body};
};
async function eventually(fn,tries=30,delay=2000){
 for(let i=0;i<tries;i++){
   const result=await fn();
   if(result)return result;
   await pause(delay);
 }
 return null;
}
async function run(){
 const ready=await http(preview+'/api/certification/turso-ready');
 check('unprotected exact Preview has isolated Turso + Sandbox read',ready.ok&&
   ready.body.ready===true&&ready.body.code==='READ_ONLY_STAGING_READY'&&
   ready.body.commit===process.env.GITHUB_SHA);
 const products=await http(preview+'/api/products');
 const sku=(products.body.products||[]).find(x=>x.id===productId&&x.variationId===variationId);
 check('buyer storefront catalog authoritative price and stock',
   products.ok&&sku?.checkoutReady===true&&sku.priceCents===1199&&sku.stock>0);
 const receiptKey='cert_'+randomUUID().replaceAll('-','');
 // Select the next Saturday after today in Atlanta. 16:00 UTC falls within
// Serenbe's 9am-1pm local market window across EDT and EST.
const ny=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',
  year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
const part=type=>Number(ny.find(x=>x.type===type)?.value);
const marketDate=new Date(Date.UTC(part('year'),part('month')-1,part('day'),16));
const ahead=(6-marketDate.getUTCDay()+7)%7||7;
marketDate.setUTCDate(marketDate.getUTCDate()+ahead);
const pickupDate=marketDate.toISOString();
 const body={cart:[{productId,variationId,quantity:1,price:0,total:0}],
   customer:{name:'Preview Certification Buyer',email:'delivered@resend.dev'},
   fulfillmentType:'pickup_market',pickup:{locationId:'serenbe',date:pickupDate},
   subtotal:0,total:0,source:'isolated_sandbox_certification'};
 const create=()=>http(preview+'/api/orders/create','POST',body,{'Idempotency-Key':receiptKey});
 const first=await create();
 check('actual buyer HTTP order created at 1199 cents',first.ok&&first.body.order?.pricing?.total===11.99&&
   Boolean(first.body.order?.orderAccessToken));
 const orderId=first.body.order.id;
 const token=first.body.order.orderAccessToken;
 report.orderId=orderId;
 const replay=await create();
 check('exact checkout replay returns same order',replay.ok&&replay.body.order?.id===orderId);
 const forged=await http(preview+'/api/orders/create','POST',{
   ...body,cart:[{...body.cart[0],quantity:2}]
 },{'Idempotency-Key':receiptKey});
 check('changed cart with same key rejected before Square',forged.status===409);
 const held=await db.get('SELECT status FROM checkout_stock_claims WHERE order_id=?',orderId);
 check('isolated Turso inventory reserved before Square',held?.status==='reserved');
 const paid=await http(preview+'/api/payments','POST',{
   sourceId:'cnon:card-nonce-ok',amountCents:1199,orderId,orderAccessToken:token});
 // Unknown payment response is ambiguous. Never retry using a new key.
 check('buyer HTTP sandbox payment confirmed',paid.ok&&
   paid.body.payment?.status==='COMPLETED'&&Boolean(paid.body.payment?.id));
 const paymentId=paid.body.payment.id;
 report.paymentId=paymentId;
 const provider=await square('/v2/payments/'+encodeURIComponent(paymentId));
 check('independent Square Sandbox captured exact amount',provider.ok&&
   provider.body.payment?.status==='COMPLETED'&&
   Number(provider.body.payment?.amount_money?.amount)===1199&&
   provider.body.payment?.amount_money?.currency==='USD');
 const recorded=await db.get('SELECT payment_status,amount_paid_cents FROM orders WHERE id=?',orderId);
 check('Turso marks order paid exactly once',recorded?.payment_status==='paid'&&Number(recorded.amount_paid_cents)===1199);
 const outbox=await eventually(async()=>{
   const rows=await db.all('SELECT kind,status,provider_message_id FROM checkout_notification_outbox WHERE order_id=?',orderId);
   return rows.length===2&&rows.every(x=>x.status==='sent'&&x.provider_message_id)?rows:null;
 },20,1500);
 report.notifications=(outbox||[]).map(x=>({kind:x.kind,status:x.status,providerMessageId:x.provider_message_id}));
 check('customer and staff Resend messages accepted with IDs',outbox?.length===2);
 const deliveries=await eventually(async()=>{
   const rows=await db.all('SELECT kind,provider_message_id,delivery_status,delivered_at FROM checkout_notification_deliveries WHERE order_id=?',orderId);
   return rows.length===2&&rows.every(row=>row.delivery_status==='delivered'&&row.delivered_at&&
     outbox.some(message=>message.kind===row.kind&&message.provider_message_id===row.provider_message_id))?rows:null;
 },30,2000);
 report.notificationDeliveries=(deliveries||[]).map(row=>({kind:row.kind,providerMessageId:row.provider_message_id,status:row.delivery_status,deliveredAt:row.delivered_at}));
 check('signed Resend delivery reconciled both exact order message IDs',deliveries?.length===2);

 const signed=await eventually(async()=>{
   const events=await db.all("SELECT event_id,event_type,status,result_json FROM webhook_events WHERE provider='square' AND status='processed' AND event_type LIKE 'payment.%' ORDER BY processed_at DESC LIMIT 50");
   return events.find(x=>{
     try{return JSON.parse(x.result_json||'{}').orderId===orderId}
     catch{return false}
   })||null;
 },30,2000);
 check('real signed Square payment webhook processed in staging',Boolean(signed?.event_id));
 const refund=await square('/v2/refunds','POST',{
   idempotency_key:'cert-ref-'+orderId,
   payment_id:paymentId,amount_money:{amount:1199,currency:'USD'},
   reason:'Isolated Preview checkout certification refund'});
 report.refundId=refund.body.refund?.id||null;
 check('real Sandbox refund submitted',refund.ok&&Boolean(report.refundId));
 const verified=await eventually(async()=>{
   const current=await square('/v2/refunds/'+encodeURIComponent(report.refundId));
   return current.ok&&current.body.refund?.status==='COMPLETED'?current.body.refund:null;
 },30,1800);
 check('independently verified full Square Sandbox refund',verified?.status==='COMPLETED'&&
   Number(verified.amount_money?.amount)===1199);
 const refundReconciled=await eventually(async()=>{
   const row=await db.get('SELECT payment_status FROM orders WHERE id=?',orderId);
   return row?.payment_status==='refunded'?row:null;
 },30,2000);
 check('actual signed refund webhook reconciled Turso order',Boolean(refundReconciled));
 const refundEvent=await db.all("SELECT event_id,event_type,status,result_json FROM webhook_events WHERE provider='square' AND status='processed' AND event_type LIKE 'refund.%' ORDER BY processed_at DESC LIMIT 50");
 check('refund provider event recorded once',refundEvent.some(x=>{
   try{return JSON.parse(x.result_json||'{}').orderId===orderId}catch{return false}
 }));
 report.pass=report.checks.every(x=>x.pass);
}
try{await run()}catch(e){report.errorCode=e instanceof Error?e.message.slice(0,180):'UNKNOWN';process.exitCode=1}
finally{
 report.cleanupPending=Boolean(report.orderId);
 save();
 console.log('certification summary '+JSON.stringify({pass:report.pass,
   checks:report.checks.length,orderId:report.orderId,paymentId:report.paymentId,
   refundId:report.refundId,notifications:report.notifications.length}));
}
if(!report.pass)process.exitCode=1;
