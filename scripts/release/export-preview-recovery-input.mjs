#!/usr/bin/env node
/** READ ONLY: export one certified QA order and fresh authenticated Sandbox readbacks. */
import {connect} from '@tursodatabase/serverless';
import {mkdirSync,writeFileSync} from 'node:fs';
import {requireQaRecoveryIdentity} from './qa-recovery-identity.mjs';
const target='libsql://gratog-migration-cert-20261018-swatkins.aws-us-east-1.turso.io';
const {RECOVERY_ORDER_ID:orderId,PREVIEW_BASE_URL:preview,CERTIFIED_PREVIEW_SHA:sha}=process.env;
if(process.env.GITHUB_EVENT_NAME!=='workflow_dispatch'||process.env.GITHUB_REF!=='refs/heads/feat/turso-checkout-recovery-20261017'||
 process.env.TURSO_STAGING_DATABASE_URL!==target||!process.env.TURSO_STAGING_AUTH_TOKEN||
 process.env.SQUARE_ENVIRONMENT!=='sandbox'||!process.env.SQUARE_SANDBOX_ACCESS_TOKEN||
 !/^[a-f0-9-]{36}$/.test(orderId||'')||!/^[a-f0-9]{40}$/.test(sha||'')||
 !/^https:\/\/gratog-[a-z0-9]+-theangelsilvers-projects\.vercel\.app$/.test(preview||''))throw Error('READ_ONLY_RECOVERY_SCOPE_INVALID');
const db=connect({url:target,authToken:process.env.TURSO_STAGING_AUTH_TOKEN});
const square=async path=>{
 const response=await fetch('https://connect.squareupsandbox.com'+path,{redirect:'error',signal:AbortSignal.timeout(18000),
  headers:{Authorization:'Bearer '+process.env.SQUARE_SANDBOX_ACCESS_TOKEN,'Square-Version':'2026-09-16'}});
 if(response.status!==200)throw Error('READ_ONLY_SQUARE_READBACK_HTTP_'+response.status);
 return response.json();
};
const report={kind:'AUTHENTICATED_SQUARE_SANDBOX_TURSO_RECOVERY_INPUT',readOnly:true,
 providerEnvironment:'sandbox',collectorSha:process.env.GITHUB_SHA,certifiedPreviewSha:sha,
 runId:process.env.GITHUB_RUN_ID,preview,orderId,pass:false,productionCutoverAuthorized:false};
try{
 const readiness=await fetch(preview+'/api/certification/turso-ready',{redirect:'manual',signal:AbortSignal.timeout(20000)});
 if(readiness.status!==200||(await readiness.json()).commit!==sha)throw Error('CERTIFIED_PREVIEW_IDENTITY_MISMATCH');
 const identity=await db.get('SELECT customer_snapshot_json FROM orders WHERE id=?',orderId);
 requireQaRecoveryIdentity(identity);
 const order=await db.get('SELECT id,order_number,square_order_id,status,payment_status,subtotal_cents,tax_cents,total_cents,amount_paid_cents,currency,created_at,updated_at FROM orders WHERE id=?',orderId);
 const payment=await db.get('SELECT id,order_id,square_payment_id,status,amount_cents,currency,created_at,updated_at FROM payments WHERE order_id=?',orderId);
 const refunds=await db.all('SELECT refund_id,order_id,payment_id,amount_cents,currency,confirmed_at FROM square_refund_entries WHERE order_id=?',orderId);
 if(order.payment_status!=='refunded'||Number(order.total_cents)!==1199||payment.status!=='COMPLETED'||
  refunds.length!==1||Number(refunds[0].amount_cents)!==1199)throw Error('QA_LEDGER_NOT_FULLY_RECONCILED');
 const p=(await square('/v2/payments/'+encodeURIComponent(payment.square_payment_id))).payment;
 const f=(await square('/v2/refunds/'+encodeURIComponent(refunds[0].refund_id))).refund;
 if(p.id!==payment.square_payment_id||p.status!=='COMPLETED'||p.order_id!==order.square_order_id||p.reference_id!==orderId||
  Number(p.amount_money?.amount)!==1199||p.amount_money?.currency!=='USD'||f.id!==refunds[0].refund_id||
  f.status!=='COMPLETED'||f.payment_id!==p.id||Number(f.amount_money?.amount)!==1199||f.amount_money?.currency!=='USD')throw Error('AUTHENTICATED_PROVIDER_LEDGER_MISMATCH');
 const items=await db.all('SELECT product_id,variation_id,name_snapshot,quantity,unit_price_cents,total_cents FROM order_items WHERE order_id=? ORDER BY position',orderId);
 const claim=await db.get('SELECT status,reserved_at,committed_at FROM checkout_stock_claims WHERE order_id=?',orderId);
 const inventoryEvents=await db.all('SELECT id,product_id,order_id,event_type,adjustment,created_at,metadata_json FROM inventory_events WHERE order_id=?',orderId);
 const debits=inventoryEvents.filter(event=>event.event_type==='order_debit').flatMap(event=>{
   let metadata;try{metadata=JSON.parse(event.metadata_json||'{}')}catch{throw Error('QA_INVENTORY_METADATA_INVALID')}
   if(metadata.origin!=='verified_square_capture'||metadata.squarePaymentId!==p.id||!Array.isArray(metadata.items))throw Error('QA_INVENTORY_PROVIDER_BINDING_INVALID');
   return metadata.items.map(item=>({id:event.id,product_id:item.product_id,quantity:Number(item.quantity),
     adjustment:-Number(item.quantity),created_at:event.created_at,squarePaymentId:metadata.squarePaymentId}));
 });
 const notifications=await db.all('SELECT o.kind,o.status,o.provider_message_id,o.attempt_count,o.sent_at,d.delivery_status,d.delivered_at FROM checkout_notification_outbox o JOIN checkout_notification_deliveries d ON d.order_id=o.order_id AND d.kind=o.kind AND d.provider_message_id=o.provider_message_id WHERE o.order_id=?',orderId);
 const webhookEvents=await db.all("SELECT event_id,event_type,status,processed_at,result_json FROM webhook_events WHERE provider='square' AND status='processed' AND json_extract(result_json,'$.orderId')=?",orderId);
 if(claim?.status!=='committed'||items.length!==1||items[0].product_id!=='KZXEV24XZ2UCQUJ64BH7ZUJP'||Number(items[0].quantity)!==1||
  debits.length!==1||debits[0].product_id!==items[0].product_id||debits[0].quantity!==Number(items[0].quantity)||
  notifications.length!==2||notifications.some(n=>n.delivery_status!=='delivered'||!n.delivered_at)||
  !webhookEvents.some(e=>e.event_type.startsWith('payment.'))||!webhookEvents.some(e=>e.event_type.startsWith('refund.')))throw Error('QA_RECOVERY_EVIDENCE_INCOMPLETE');
 Object.assign(report,{pass:true,collectedAt:new Date().toISOString(),order,payment,refunds,items,claim,inventoryEvents,debits,notifications,webhookEvents,
  providerPayment:{id:p.id,status:p.status,amountCents:Number(p.amount_money.amount),currency:p.amount_money.currency,squareOrderId:p.order_id,referenceId:p.reference_id,createdAt:p.created_at,updatedAt:p.updated_at},
  providerRefund:{id:f.id,status:f.status,paymentId:f.payment_id,amountCents:Number(f.amount_money.amount),currency:f.amount_money.currency,createdAt:f.created_at,updatedAt:f.updated_at}});
}catch(error){report.errorCode=/^[A-Z_0-9]+$/.test(error?.message||'')?error.message:error?.name;process.exitCode=1;}
finally{mkdirSync('test-results',{recursive:true});writeFileSync('test-results/preview-recovery-input.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({pass:report.pass,errorCode:report.errorCode,orderId,providerEnvironment:'sandbox',readOnly:true}));}
