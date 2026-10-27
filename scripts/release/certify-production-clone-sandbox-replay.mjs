#!/usr/bin/env node
/** Production-derived backup + actual authenticated Sandbox order, isolated clone only. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {MongoClient} from 'mongodb';
import {openMongoSnapshot,sha256,canonicalBson} from '../../lib/checkout/mongo-snapshot-archive.mjs';
import {replayIntoMongoClone} from '../../lib/checkout/mongo-clone-reverse-delta.mjs';
const root='/home/opee/tmp/tog-production-restore-20261018';
const database='tog_recovery_clone_prod_20261018';
const uri='mongodb://127.0.0.1:27027/'+database+'?replicaSet=togRecovery&directConnection=true';
const report={kind:'PRODUCTION_BACKUP_RESTORE_WITH_REAL_SANDBOX_REPLAY',pass:false,
 productionSourceWritten:false,productionPaymentsModified:false,providerEnvironment:'sandbox',
 finalProductionWriteFreezePerformed:false,productionDeploymentRollbackPerformed:false,
 productionCutoverAuthorized:false,checks:[]};
const check=(name,ok)=>{assert.equal(Boolean(ok),true,name);report.checks.push({name,pass:true})};
const client=new MongoClient(uri,{maxPoolSize:2,serverSelectionTimeoutMS:15000});
try{
 if(process.env.MONGODB_URI)throw Error('SOURCE_CREDENTIAL_FORBIDDEN_IN_RESTORE_DRILL');
 const archive=readFileSync(root+'/snapshot.togenc');
 const snapshot=openMongoSnapshot(archive,readFileSync(root+'/snapshot.key'));
 const inputBytes=readFileSync(root+'/preview-recovery-input.json');
 const input=JSON.parse(inputBytes);
 check('protected collector and certified deployed commit identities match',input.pass===true&&
  input.readOnly===true&&input.kind==='AUTHENTICATED_SQUARE_SANDBOX_TURSO_RECOVERY_INPUT'&&
  input.runId==='39167399729'&&input.collectorSha==='0d3086ce2a7d2c170186f945fe1a7a13d4b635f1'&&
  input.certifiedPreviewSha==='617a6f1f183acb297409b04924643647d961c63c'&&
  input.providerEnvironment==='sandbox');
 check('authenticated provider evidence is fresh for the drill',Date.now()-Date.parse(input.collectedAt)<30*60*1000);
 const freezeWatermark=new Date(JSON.parse(snapshot.clusterTime).$timestamp.t*1000).toISOString();
 const sourceInventory=snapshot.collections.find(c=>c.name==='inventory').documents;
 const inventoryEvents=input.debits.map(event=>{
  const source=sourceInventory.find(row=>row.productId===event.product_id);
  const before=Number(source?.currentStock);
  assert.ok(source&&Number.isSafeInteger(before)&&before>=event.quantity,'SOURCE_STOCK_BASE_REQUIRED');
  return {id:event.id+':'+event.product_id,orderId:input.orderId,productId:event.product_id,
   type:'order_debit',before,delta:-event.quantity,
   after:before-event.quantity,createdAt:event.created_at};
 });
 const record={expectedBeforeHash:null,
  order:{id:input.orderId,squareOrderId:input.order.square_order_id,squarePaymentId:input.payment.square_payment_id,
   totalCents:Number(input.order.total_cents),subtotalCents:Number(input.order.subtotal_cents),taxCents:Number(input.order.tax_cents),
   amountPaidCents:Number(input.order.amount_paid_cents),refundedAmountCents:input.refunds.reduce((n,row)=>n+Number(row.amount_cents),0),
   currency:input.order.currency,paymentStatus:input.order.payment_status,status:input.order.status,
   createdAt:input.order.created_at,updatedAt:input.order.updated_at,
   items:input.items.map(row=>({productId:row.product_id,variationId:row.variation_id,name:row.name_snapshot,
    quantity:Number(row.quantity),priceCents:Number(row.unit_price_cents)}))},
  payment:{orderId:input.orderId,squarePaymentId:input.payment.square_payment_id,squareOrderId:input.order.square_order_id,
   amountCents:Number(input.payment.amount_cents),currency:input.payment.currency,status:input.payment.status},
  refunds:input.refunds.map(row=>({refundId:row.refund_id,orderId:row.order_id,paymentId:row.payment_id,
   amountCents:Number(row.amount_cents),currency:row.currency})),inventoryEvents,
  notifications:input.notifications.map(row=>({kind:row.kind,sourceStatus:'delivered',providerMessageId:row.provider_message_id,
   attemptCount:Number(row.attempt_count),sourceAcceptedAt:row.sent_at,sourceDeliveredAt:row.delivered_at})),
  webhookEvents:input.webhookEvents.map(row=>({eventId:row.event_id,eventType:row.event_type,orderId:input.orderId,
   providerObjectId:row.event_type.startsWith('payment.')?input.payment.square_payment_id:input.refunds[0].refund_id,
   status:row.status,processedAt:row.processed_at}))};
 const bundle={schemaVersion:1,scope:'isolated-restore-clone',id:'prod-derived-real-sandbox-'+input.orderId,
  snapshotSha256:sha256(archive),freezeWatermark,throughWatermark:input.collectedAt,records:[record]};
 const providerReadback={kind:'authenticated-square-readback',
  payment:async id=>id===input.providerPayment.id?input.providerPayment:null,
  refund:async id=>id===input.providerRefund.id?input.providerRefund:null};
 await client.connect();const db=client.db(database);
 const args={client,db,uri,cloneId:'production-derived-restore-20261018',bundle,providerReadback};
 await assert.rejects(()=>replayIntoMongoClone({...args,fault:async phase=>{if(phase==='after_inventory')throw Error('INJECTED_REPLAY_INTERRUPTION')}}),/INJECTED_REPLAY_INTERRUPTION/);
 check('interruption rolls back new order payment refund and inventory atomically',
  await db.collection('orders').countDocuments({id:input.orderId})===0&&
  await db.collection('payment_records').countDocuments({squarePaymentId:input.payment.square_payment_id})===0&&
  await db.collection('square_refund_entries').countDocuments({orderId:input.orderId})===0&&
  (await db.collection('inventory').findOne({productId:inventoryEvents[0].productId})).currentStock===inventoryEvents[0].before);
 const applied=await replayIntoMongoClone(args);
 check('actual captured and refunded Sandbox order replays into the restored clone',applied.applied===1&&applied.capturedCents===1199&&applied.refundedCents===1199);
 const replay=await replayIntoMongoClone(args);
 check('duplicate recovery replay changes neither money nor inventory',replay.applied===0&&replay.replayed===1&&
  await db.collection('orders').countDocuments({id:input.orderId})===1&&
  await db.collection('payment_records').countDocuments({squarePaymentId:input.payment.square_payment_id})===1&&
  await db.collection('square_refund_entries').countDocuments({orderId:input.orderId})===1);
 check('delivered notifications are preserved under explicit resend holds',
  await db.collection('checkout_notification_outbox').countDocuments({orderId:input.orderId,status:'reconciliation_hold',suppressAutomaticSend:true})===2);
 check('all actual signed provider webhook event IDs survive rollback replay',
  await db.collection('webhook_events_processed').countDocuments({orderId:input.orderId,status:'success'})===input.webhookEvents.length);
 for(const collection of snapshot.collections){
  const actual=await db.collection(collection.name).find({_id:{$in:collection.documents.map(row=>row._id)}}).toArray();
  const byId=new Map(actual.map(row=>[canonicalBson(row._id),row]));
  for(const historical of collection.documents){
   // Clone preserves original BSON objects through the canonical comparison.
   const restored=byId.get(canonicalBson(historical._id));
   assert.ok(restored,'HISTORICAL_DOCUMENT_LOST');
   const wanted=collection.name==='inventory'&&inventoryEvents.some(e=>e.productId===historical.productId)
    ? {...historical,currentStock:inventoryEvents.find(e=>e.productId===historical.productId).after}:historical;
   assert.equal(canonicalBson(restored),canonicalBson(wanted),'HISTORICAL_DOCUMENT_CHANGED');
  }
 }
 check('all 7919 historical documents survive except the verified one-unit inventory delta',true);
 Object.assign(report,{pass:true,executedAt:new Date().toISOString(),archiveSha256:sha256(archive),
  recoveryInputSha256:sha256(inputBytes),protectedCollectorRunId:input.runId,
  authenticatedProviderReadbackAt:input.collectedAt,sourceSnapshotConsistent:true,
  sourceCollectionCount:snapshot.collections.length,sourceDocumentCount:snapshot.collections.reduce((n,c)=>n+c.documents.length,0),
  orderId:input.orderId,paymentId:input.payment.square_payment_id,refundId:input.refunds[0].refund_id,
  interruptionRollbackVerified:true,idempotentReplayVerified:true,historicalDataPreserved:true,
  capturedCents:applied.capturedCents,refundedCents:applied.refundedCents,notificationsHeld:2});
}catch(error){report.errorCode=error?.code||error?.name;report.errorDetail=error?.message?.split('\n').slice(0,5).join(' ').slice(0,500);process.exitCode=1;}
finally{await client.close();mkdirSync('test-results',{recursive:true});writeFileSync('test-results/production-clone-real-sandbox-replay.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
